import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.5.0';
import { errore, json, rispondiPreflight } from '../_shared/cors.ts';

/**
 * Importa una fattura fornitore dall'XML della fattura elettronica (FatturaPA).
 *
 * Perché è una edge function e non codice nel browser — tre ragioni, e bastano
 * la prima e la terza:
 *
 *  1. **Il parser XML non deve finire nel bundle.** `fast-xml-parser` pesa più
 *     di tutta la pagina dei costi, e servirebbe a una funzione che si usa
 *     qualche volta al mese.
 *  2. **La scrittura vuole la service key.** Quella chiave nel browser non ci
 *     va mai, e con RLS stretto un client anonimo non potrebbe inserire.
 *  3. **L'import deve poter arrivare da un webhook**, cioè quando l'app non è
 *     aperta: il canale SdI o un forward della PEC consegnano quando capita.
 *
 * Il corpo può essere l'XML grezzo (`Content-Type: application/xml`) oppure un
 * JSON `{ xml, nomeFile? }`. La seconda forma è quella che usa l'app, la prima
 * quella comoda per un webhook.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * I nomi FatturaPA arrivano con prefissi di namespace diversi a seconda di chi
 * genera il file: `p:`, `ns2:`, `ns3:`, o nessuno. È il primo motivo per cui un
 * import scritto contro un solo fornitore smette di funzionare col secondo,
 * quindi il prefisso si toglie e basta.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  transformTagName: (tag: string) => tag.replace(/^.*:/, ''),
  // I numeri restano stringhe: `PrezzoUnitario` con molti decimali perderebbe
  // precisione passando per un double, e su un imponibile è un centesimo che
  // poi non torna col documento.
  parseTagValue: false,
});

/** Un nodo che può essere un oggetto solo o un array: FatturaPA fa entrambe. */
function comeArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const numero = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const testo = (v: unknown): string => (v == null ? '' : String(v).trim());

/**
 * Propone una categoria di costo leggendo la descrizione della riga.
 *
 * È un SUGGERIMENTO e finisce in `categoriaSuggerita`, non in `categoria`:
 * `genera_costi_da_fattura` legge entrambe, ma tenerle distinte è quello che
 * permette di sapere se una categoria l'ha decisa una persona o l'ha indovinata
 * questa funzione. Sbagliare categoria sposta una spesa nel riepilogo
 * sbagliato, quindi chi registra deve poter vedere cosa è stato indovinato.
 */
function categoriaSuggerita(descrizione: string): string {
  const d = descrizione.toLowerCase();
  if (/gasolio|diesel|benzina|carburant|rifornim|adblue/.test(d)) return 'carburante';
  if (/nolegg|piattaform|cestell|gru\b|cippatric/.test(d)) return 'noleggio';
  if (/smaltim|discaric|conferim|rifiut/.test(d)) return 'smaltimento';
  if (/manutenz|ripar|tagliand|revisione|ricambi/.test(d)) return 'manutenzione';
  if (/assicuraz|polizza|rc\b/.test(d)) return 'assicurazione';
  if (/manodoper|operai|personale|somministraz/.test(d)) return 'personale';
  if (/materiale|ferrament|olio|catena|dispositiv|dpi/.test(d)) return 'materiali';
  return 'altro';
}

Deno.serve(async (req: Request) => {
  const preflight = rispondiPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return errore('Usa POST.', 405);

  // ── 1. Prendere l'XML, in una delle due forme ────────────────────────────
  let xml = '';
  let nomeFile: string | undefined;
  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('json')) {
      const body = await req.json();
      xml = testo(body.xml);
      nomeFile = body.nomeFile ? testo(body.nomeFile) : undefined;
    } else {
      xml = await req.text();
    }
  } catch {
    return errore('Corpo della richiesta illeggibile.');
  }

  if (!xml) return errore('Manca l’XML della fattura.');

  // ── 2. Parsare ───────────────────────────────────────────────────────────
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch (e) {
    return errore(`XML non valido: ${e instanceof Error ? e.message : 'errore di parsing'}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: any = doc.FatturaElettronica ?? doc.fatturaElettronica ?? doc;
  const header = root?.FatturaElettronicaHeader;
  // Un XML può contenere più corpi (fatture accorpate). Si importa il primo e
  // lo si dice, invece di importarne uno a caso in silenzio.
  const corpi = comeArray(root?.FatturaElettronicaBody);
  const body = corpi[0];

  if (!header || !body) {
    return errore('Non sembra una FatturaPA: mancano header o body.');
  }

  const cedente = header?.CedentePrestatore?.DatiAnagrafici;
  const partitaIva = testo(cedente?.IdFiscaleIVA?.IdCodice);
  const denominazione =
    testo(cedente?.Anagrafica?.Denominazione) ||
    `${testo(cedente?.Anagrafica?.Nome)} ${testo(cedente?.Anagrafica?.Cognome)}`.trim();

  const generali = body?.DatiGenerali?.DatiGeneraliDocumento;
  const numeroDoc = testo(generali?.Numero);
  const dataDoc = testo(generali?.Data);

  if (!partitaIva && !denominazione) return errore('L’XML non dice chi è il fornitore.');
  if (!numeroDoc || !dataDoc) return errore('L’XML non ha numero o data del documento.');

  // ── 3. Righe ─────────────────────────────────────────────────────────────
  const linee = comeArray(body?.DatiBeniServizi?.DettaglioLinee);
  const righe = linee.map((l: Record<string, unknown>, i: number) => {
    const descrizione = testo(l.Descrizione) || 'Riga senza descrizione';
    // `Quantita` è facoltativa in FatturaPA: sulle righe "a corpo" non c'è, e
    // il prezzo unitario è già il totale. Zero darebbe un imponibile a zero e
    // la riga sparirebbe silenziosamente dalla generazione dei costi.
    const quantita = l.Quantita != null ? numero(l.Quantita) : 1;
    return {
      id: `xml-${testo(l.NumeroLinea) || i + 1}`,
      descrizione,
      quantita,
      prezzoUnitario: numero(l.PrezzoUnitario),
      aliquotaIva: numero(l.AliquotaIVA),
      categoriaSuggerita: categoriaSuggerita(descrizione),
    };
  });

  // ── 4. Totali e scadenza ─────────────────────────────────────────────────
  const riepiloghi = comeArray(body?.DatiRiepilogo);
  const imponibile = riepiloghi.reduce(
    (t: number, r: Record<string, unknown>) => t + numero(r.ImponibileImporto),
    0,
  );
  const iva = riepiloghi.reduce(
    (t: number, r: Record<string, unknown>) => t + numero(r.Imposta),
    0,
  );
  const totale = numero(generali?.ImportoTotaleDocumento) || imponibile + iva;

  const pagamento = comeArray(body?.DatiPagamento?.DettaglioPagamento)[0];
  const dataScadenza = testo(pagamento?.DataScadenzaPagamento) || null;

  // ── 5. Trovare il fornitore ──────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: fornitori, error: erroreFornitore } = await supabase
    .from('fornitori')
    .select('id, denominazione, partita_iva')
    .is('deleted_at', null)
    .eq('partita_iva', partitaIva)
    .limit(1);

  if (erroreFornitore) return errore(`Lettura fornitori: ${erroreFornitore.message}`, 500);

  let fornitoreId = fornitori?.[0]?.id as string | undefined;

  // Il fornitore si crea al volo se non c'è: bloccare l'import per un'anagrafica
  // mancante costringerebbe a uscire, crearla e ricominciare — con l'XML già in
  // mano e tutti i dati dentro.
  if (!fornitoreId) {
    const sede = header?.CedentePrestatore?.Sede;
    const { data: creato, error: erroreCreazione } = await supabase
      .from('fornitori')
      .insert({
        denominazione: denominazione || `Fornitore ${partitaIva}`,
        partita_iva: partitaIva || null,
        via: testo(sede?.Indirizzo),
        civico: testo(sede?.NumeroCivico),
        cap: testo(sede?.CAP),
        comune: testo(sede?.Comune),
        provincia: testo(sede?.Provincia).toUpperCase(),
        note: 'Creato automaticamente dall’import di una fattura elettronica.',
      })
      .select('id')
      .single();

    if (erroreCreazione) return errore(`Creazione fornitore: ${erroreCreazione.message}`, 500);
    fornitoreId = creato.id;
  }

  // ── 6. Inserire la fattura ───────────────────────────────────────────────
  const { data: inserita, error: erroreInsert } = await supabase
    .from('fatture_fornitore')
    .insert({
      fornitore_id: fornitoreId,
      numero: numeroDoc,
      data_documento: dataDoc,
      // La ricezione è oggi: è il momento in cui il documento è arrivato a noi,
      // ed è quello che rende leggibile il ritardo rispetto alla data del
      // documento. `chk_date_coerenti` però rifiuta una ricezione precedente,
      // e su un XML datato domani succede: si prende la più tarda delle due.
      data_ricezione: new Date().toISOString().slice(0, 10) < dataDoc
        ? dataDoc
        : new Date().toISOString().slice(0, 10),
      data_scadenza: dataScadenza,
      // Resta BOZZA: l'import propone, una persona conferma. Le categorie sono
      // indovinate da una regex, e registrarle da sole significherebbe far
      // entrare in contabilità righe che nessuno ha guardato.
      stato: 'bozza',
      righe,
      pagamenti: [],
      imponibile: Math.round(imponibile * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      totale: Math.round(totale * 100) / 100,
      dati_fe: {
        identificativoSdi: testo(header?.DatiTrasmissione?.ProgressivoInvio) || undefined,
        formatoTrasmissione: testo(header?.DatiTrasmissione?.FormatoTrasmissione) || undefined,
        tipoDocumento: testo(generali?.TipoDocumento) || undefined,
        nomeFile,
        importataIl: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (erroreInsert) {
    // Il vincolo `uq_fatt_forn_numero` è la protezione contro il doppio
    // import — la stessa fattura inoltrata due volte, che capita spesso. Si
    // risponde 409 con l'id di quella già presente, così chi ha chiamato ci
    // porta sopra invece di vedere un errore e riprovare.
    if (erroreInsert.message.includes('uq_fatt_forn_numero')) {
      const { data: esistente } = await supabase
        .from('fatture_fornitore')
        .select('id')
        .eq('fornitore_id', fornitoreId)
        .eq('numero', numeroDoc)
        .maybeSingle();

      return errore(
        `La fattura ${numeroDoc} di questo fornitore è già stata importata.`,
        409,
        { fatturaId: esistente?.id ?? null, giaPresente: true },
      );
    }
    return errore(`Inserimento fattura: ${erroreInsert.message}`, 500);
  }

  return json({
    fatturaId: inserita.id,
    fornitoreId,
    numero: numeroDoc,
    righe: righe.length,
    totale: Math.round(totale * 100) / 100,
    // Chi ha chiamato deve sapere che le categorie sono indovinate, e che se
    // l'XML conteneva più fatture ne è stata importata una sola.
    categorieDaConfermare: true,
    corpiIgnorati: corpi.length - 1,
  });
});
