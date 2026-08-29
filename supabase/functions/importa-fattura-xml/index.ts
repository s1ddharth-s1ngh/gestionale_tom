import { clientAmministratore, errore, ok, preflight } from '../_shared/risposta.ts';

/**
 * Importa una fattura fornitore dall'XML della fatturazione elettronica.
 *
 * Ogni fornitore italiano manda già le sue fatture in FatturaPA: ribatterle a
 * mano è lavoro che il formato rende inutile. Questa funzione legge l'XML e ne
 * ricava fornitore, numero, date, righe e totali.
 *
 * **Perché è una edge function e non codice del browser.** Non per il parsing —
 * quello girerebbe benissimo nel client. Per tre cose che il client non può
 * fare bene:
 *  - crea il FORNITORE se non c'è, il che significa scrivere in anagrafica per
 *    conto di chi importa;
 *  - deve essere idempotente rispetto al numero di protocollo SdI, e il
 *    controllo va fatto dove sta il dato, non dove sta la finestra;
 *  - il giorno che le fatture arrivano da sole (PEC, o l'API di un
 *    intermediario) questa stessa funzione diventa il webhook che le riceve,
 *    senza che nessuno debba avere il browser aperto.
 *
 * Contratto:  POST { xml: string, nomeFile?: string }
 *             → 200 { fatturaId, creata: boolean, righe: number }
 *
 * NON registra i costi: crea la fattura e si ferma. La trasformazione in costi
 * resta un gesto esplicito di chi ha guardato le righe — un XML che entra e
 * diventa spesa senza che nessuno l'abbia letto è il modo di scoprire a fine
 * anno di aver contabilizzato la fattura sbagliata.
 */

/** Legge il primo valore di un tag, ignorando il prefisso di namespace.
 *
 *  FatturaPA arriva con prefissi diversi a seconda di chi la genera: `<p:Numero>`,
 *  `<ns2:Numero>`, `<Numero>` sono lo stesso campo. Un parser XML vero sarebbe
 *  più corretto, ma è una dipendenza per un formato di cui ci servono dodici
 *  campi in croce, tutti a un solo livello di nidificazione. */
function tag(xml: string, nome: string): string | undefined {
  const re = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`, 'i');
  const m = xml.match(re);
  return m ? decodifica(m[1].trim()) : undefined;
}

/** Tutti i blocchi di un tag ripetuto — le righe di dettaglio. */
function blocchi(xml: string, nome: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`, 'gi');
  return [...xml.matchAll(re)].map((m) => m[1]);
}

/** Le entità XML nei nomi propri sono la norma: «Rossi &amp; Figli». */
function decodifica(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const numero = (v: string | undefined): number => {
  const n = Number((v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * La categoria proposta, indovinata dalla descrizione.
 *
 * È un SUGGERIMENTO e non una classificazione: finisce in `categoriaSuggerita`,
 * la si vede nel form e la si corregge prima di registrare. Indovinare la
 * categoria e registrarla senza far vedere niente sarebbe peggio che lasciare
 * tutto su «altro» — un errore silenzioso nel riepilogo di fine mese.
 */
function categoriaProposta(descrizione: string): string {
  const d = descrizione.toLowerCase();
  if (/gasolio|diesel|benzina|carburante|rifornim/.test(d)) return 'carburante';
  if (/noleggio|piattaforma|cestello|gru/.test(d)) return 'noleggio';
  if (/smaltim|discarica|conferim|rifiut/.test(d)) return 'smaltimento';
  if (/riparaz|manutenz|tagliand|revision|ricambi/.test(d)) return 'manutenzione';
  if (/assicuraz|polizza|rc\b/.test(d)) return 'assicurazione';
  if (/catena|olio|dpi|guanti|casco|materiale|ferrament/.test(d)) return 'materiali';
  return 'altro';
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  let xml: string | undefined;
  let nomeFile: string | undefined;
  try {
    ({ xml, nomeFile } = await req.json());
  } catch {
    return errore('Corpo non leggibile: serve { "xml": "…" }.');
  }

  if (!xml || xml.length < 50) {
    return errore("L'XML è vuoto o troppo corto per essere una fattura.");
  }

  try {
    const supabase = clientAmministratore();

    // ── Il fornitore, dal blocco CedentePrestatore ──────────────────────────
    // Va isolato PRIMA di cercare i campi: `Denominazione` compare anche nel
    // CessionarioCommittente, che siamo noi. Cercarlo nel documento intero
    // importerebbe fatture intestate a Tom stesso.
    const cedente = blocchi(xml, 'CedentePrestatore')[0];
    if (!cedente) {
      return errore('Non è una fattura elettronica valida: manca il CedentePrestatore.');
    }

    const denominazione =
      tag(cedente, 'Denominazione') ??
      [tag(cedente, 'Nome'), tag(cedente, 'Cognome')].filter(Boolean).join(' ');
    const partitaIva = tag(cedente, 'IdCodice');

    if (!denominazione) {
      return errore('Non si legge la ragione sociale del fornitore.');
    }

    // ── Testata del documento ───────────────────────────────────────────────
    const datiGenerali = blocchi(xml, 'DatiGeneraliDocumento')[0] ?? xml;
    const numeroFattura = tag(datiGenerali, 'Numero');
    const dataDocumento = tag(datiGenerali, 'Data');

    if (!numeroFattura || !dataDocumento) {
      return errore('Non si leggono numero e data del documento.');
    }

    const protocolloSdi = tag(xml, 'ProgressivoInvio');

    // ── Idempotenza ─────────────────────────────────────────────────────────
    // Sul protocollo SdI quando c'è: è l'identificativo univoco del documento,
    // e reimportare lo stesso file due volte è quello che succede appena
    // qualcuno svuota la cartella dei download e riprova.
    if (protocolloSdi) {
      const { data: gia } = await supabase
        .from('fatture_fornitore')
        .select('id')
        .eq('numero_protocollo_sdi', protocolloSdi)
        .is('deleted_at', null)
        .maybeSingle();

      if (gia) {
        return ok({ fatturaId: (gia as { id: string }).id, creata: false, righe: 0 });
      }
    }

    // ── Fornitore: si cerca, e solo se non c'è si crea ──────────────────────
    // Per partita IVA e non per nome: «Rossi S.r.l.» e «ROSSI SRL» sono lo
    // stesso fornitore, e cercare per denominazione ne creerebbe due.
    let fornitoreId: string | undefined;

    if (partitaIva) {
      const { data: trovato } = await supabase
        .from('fornitori')
        .select('id')
        .eq('partita_iva', partitaIva)
        .is('deleted_at', null)
        .maybeSingle();
      fornitoreId = (trovato as { id: string } | null)?.id;
    }

    if (!fornitoreId) {
      const sede = blocchi(cedente, 'Sede')[0] ?? '';
      const { data: creato, error: erroreFornitore } = await supabase
        .from('fornitori')
        .insert({
          denominazione,
          partita_iva: partitaIva ?? null,
          via: tag(sede, 'Indirizzo') ?? '',
          civico: tag(sede, 'NumeroCivico') ?? '',
          cap: tag(sede, 'CAP') ?? '',
          comune: tag(sede, 'Comune') ?? '',
          provincia: (tag(sede, 'Provincia') ?? '').toUpperCase(),
          note: 'Creato automaticamente importando una fattura elettronica.',
        })
        .select('id')
        .single();

      if (erroreFornitore) {
        return errore(`Creazione del fornitore: ${erroreFornitore.message}`, 500);
      }
      fornitoreId = (creato as { id: string }).id;
    }

    // ── Righe ───────────────────────────────────────────────────────────────
    const righe = blocchi(xml, 'DettaglioLinee').map((linea, i) => {
      const descrizione = tag(linea, 'Descrizione') ?? `Riga ${i + 1}`;
      const quantita = numero(tag(linea, 'Quantita')) || 1;
      const prezzoTotale = numero(tag(linea, 'PrezzoTotale'));
      const prezzoUnitario = numero(tag(linea, 'PrezzoUnitario'));

      return {
        id: crypto.randomUUID(),
        descrizione,
        quantita,
        unita: tag(linea, 'UnitaMisura'),
        // Il prezzo unitario dell'XML può essere al netto di uno sconto di riga
        // che sta in un blocco a parte. Quando c'è il PrezzoTotale si ricava da
        // lì: è il numero su cui il fornitore ha fatto i conti, e deve tornare
        // col totale della fattura.
        prezzoUnitario:
          prezzoTotale && quantita ? Math.round((prezzoTotale / quantita) * 100) / 100 : prezzoUnitario,
        aliquotaIva: numero(tag(linea, 'AliquotaIVA')),
        categoriaSuggerita: categoriaProposta(descrizione),
      };
    });

    if (righe.length === 0) {
      return errore('La fattura non contiene righe di dettaglio.');
    }

    // ── Totali: quelli del documento, non ricalcolati ───────────────────────
    // Se la somma delle righe non torna col totale dichiarato, ha ragione il
    // documento: è quello che il fornitore ci chiede e che andrà pagato. La
    // differenza si vede nella scheda, e va indagata invece che appianata.
    const riepiloghi = blocchi(xml, 'DatiRiepilogo');
    const imponibile = riepiloghi.reduce((t, r) => t + numero(tag(r, 'ImponibileImporto')), 0);
    const iva = riepiloghi.reduce((t, r) => t + numero(tag(r, 'Imposta')), 0);

    const pagamento = blocchi(xml, 'DettaglioPagamento')[0] ?? '';
    const dataScadenza = tag(pagamento, 'DataScadenzaPagamento');

    const { data: fattura, error: erroreFattura } = await supabase
      .from('fatture_fornitore')
      .insert({
        fornitore_id: fornitoreId,
        numero: numeroFattura,
        data_documento: dataDocumento,
        data_scadenza: dataScadenza ?? null,
        data_ricezione: new Date().toISOString().slice(0, 10),
        righe,
        imponibile: Math.round(imponibile * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        totale: Math.round((imponibile + iva) * 100) / 100,
        numero_protocollo_sdi: protocolloSdi ?? null,
        file_xml_nome: nomeFile ?? null,
      })
      .select('id')
      .single();

    if (erroreFattura) {
      // Il vincolo di unicità qui non è un guasto: è lo stesso documento già
      // importato da un file con un nome diverso.
      if (erroreFattura.message.includes('uq_ff')) {
        return errore('Di questo fornitore esiste già una fattura con questo numero e questa data.', 409);
      }
      return errore(`Creazione della fattura: ${erroreFattura.message}`, 500);
    }

    return ok({ fatturaId: (fattura as { id: string }).id, creata: true, righe: righe.length });
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto.', 500);
  }
});
