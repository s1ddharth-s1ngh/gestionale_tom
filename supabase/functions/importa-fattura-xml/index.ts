import { XMLParser } from 'npm:fast-xml-parser@4.5.0';
import { CORS, clientAmministratore, errore, ok, preflight } from '../_shared/risposta.ts';

/**
 * Import di una fattura fornitore da XML FatturaPA.
 *
 * In Italia le fatture passive arrivano come XML, e ridigitarle riga per riga è
 * il lavoro più noioso e più sbagliabile del ciclo passivo: un documento di
 * dodici righe sono dodici occasioni di scrivere 1.240,50 invece di 1.204,50.
 *
 * **La funzione parsa e RESTITUISCE una bozza: non scrive niente.**
 *
 * È la decisione che conta di tutto il file. Inserire in automatico una fattura
 * mal interpretata è peggio che digitarla: l'errore non si vede al momento —
 * la riga sembra plausibile — e salta fuori a fine mese, quando il saldo del
 * fornitore non torna e bisogna ricostruire quale documento l'ha rotto. Con la
 * bozza a schermo, chi registra confronta col PDF che ha in mano e conferma.
 *
 * Il fornitore viene CERCATO per partita IVA, non creato: se non c'è, la
 * risposta porta l'anagrafica letta dall'XML e sarà l'interfaccia a proporre di
 * crearlo. Creare anagrafiche da un file è il modo più rapido di ritrovarsi tre
 * volte lo stesso fornitore scritto in tre modi.
 */

interface RigaBozza {
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  aliquotaIva: number;
  /** Proposta, mai certezza: la descrizione è testo libero. */
  categoriaSuggerita: string;
  unita?: string;
}

/** Sempre un array, anche quando l'XML ha un elemento solo. */
function comeArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * I numeri di FatturaPA usano il punto decimale, sempre — è lo standard, non la
 * convenzione italiana. `parseFloat("1.240,50")` darebbe 1.24: qui non capita
 * perché l'XML non scrive mai le migliaia, ma vale la pena saperlo prima di
 * riusare questa funzione su un CSV.
 */
function numero(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Categoria proposta dalla descrizione della riga.
 *
 * Deliberatamente grossolana: indovina i casi frequenti di Tom e per tutto il
 * resto dice `altro`. Una classificazione più furba sbaglierebbe di meno ma in
 * modo meno prevedibile, e chi rivede la bozza si fiderebbe senza controllare —
 * che è esattamente il rischio da evitare.
 */
function categoriaDa(descrizione: string): string {
  const d = descrizione.toLowerCase();
  if (/gasolio|diesel|benzina|carburant|rifornim|adblue/.test(d)) return 'carburante';
  if (/nolegg|piattaforma|cestello|gru\b|cippatric/.test(d)) return 'noleggio';
  if (/smaltim|discaric|conferim|rifiut|cer\s|verde\b/.test(d)) return 'smaltimento';
  if (/riparaz|manutenz|tagliand|revision|ricambi|officin/.test(d)) return 'manutenzione';
  if (/assicuraz|polizza|rc\b/.test(d)) return 'assicurazione';
  if (/catena|olio|lama|dpi|casco|imbrag|corda|motoseg|decespugl/.test(d)) return 'materiali';
  return 'altro';
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return errore('Metodo non ammesso: usare POST.', 405);
  }

  let xml: string;
  let nomeFile: string | undefined;

  try {
    const corpo = await req.json();
    xml = String(corpo?.xml ?? '');
    nomeFile = corpo?.nomeFile ? String(corpo.nomeFile) : undefined;
  } catch {
    return errore('Corpo della richiesta non valido: serve un JSON con il campo `xml`.');
  }

  if (!xml.trim()) {
    return errore('Nessun XML ricevuto.');
  }

  // Le fatture firmate arrivano in .p7m, che è una busta CAdES binaria: qui non
  // si apre. Dirlo subito è meglio di un errore di parsing incomprensibile.
  if (xml.trimStart().startsWith('0') || /^MII[A-Za-z0-9+/]/.test(xml.trimStart())) {
    return errore(
      'Il file sembra una fattura firmata (.p7m). Estrai prima l’XML dalla busta, ' +
        'oppure scarica dal cassetto fiscale la versione non firmata.',
    );
  }

  let doc: Record<string, unknown>;
  try {
    // `removeNSPrefix` è ciò che rende questa funzione utile su fatture di
    // fornitori diversi: lo stesso documento arriva con `p:`, `ns2:`, `ns3:` o
    // senza prefisso a seconda di chi l'ha emesso, e senza questa opzione ogni
    // gestionale produrrebbe un albero con chiavi diverse.
    const parser = new XMLParser({
      ignoreAttributes: true,
      removeNSPrefix: true,
      parseTagValue: false, // le cifre restano stringhe: le converte `numero()`
      trimValues: true,
    });
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    return errore(`XML non leggibile: ${e instanceof Error ? e.message : 'formato non valido'}`);
  }

  // deno-lint-ignore no-explicit-any
  const root = (doc?.FatturaElettronica ?? doc?.fatturaElettronica) as any;
  if (!root) {
    return errore(
      'Non sembra una fattura elettronica: manca l’elemento FatturaElettronica.',
    );
  }

  const header = root.FatturaElettronicaHeader ?? {};
  // Una trasmissione può contenere più fatture per lo stesso cedente. Si legge
  // la prima e lo si dice: importarle tutte in silenzio ne farebbe sparire una.
  const bodies = comeArray(root.FatturaElettronicaBody);
  if (bodies.length === 0) {
    return errore('Il file non contiene nessun corpo fattura.');
  }
  const body = bodies[0];

  const cedente = header.CedentePrestatore?.DatiAnagrafici ?? {};
  const partitaIva: string = String(cedente.IdFiscaleIVA?.IdCodice ?? '').trim();
  const denominazione: string = String(
    cedente.Anagrafica?.Denominazione ??
      [cedente.Anagrafica?.Nome, cedente.Anagrafica?.Cognome].filter(Boolean).join(' '),
  ).trim();

  const generali = body.DatiGenerali?.DatiGeneraliDocumento ?? {};
  const numeroDoc = String(generali.Numero ?? '').trim();
  const dataDoc = String(generali.Data ?? '').trim(); // già ISO nel formato FatturaPA

  if (!numeroDoc || !dataDoc) {
    return errore('Nella fattura mancano il numero o la data del documento.');
  }

  const righe: RigaBozza[] = comeArray(body.DatiBeniServizi?.DettaglioLinee).map(
    // deno-lint-ignore no-explicit-any
    (l: any) => {
      const descrizione = String(l.Descrizione ?? '').trim() || 'Riga senza descrizione';
      // I servizi spesso omettono la quantità: senza il default, il prezzo
      // verrebbe moltiplicato per zero e la riga varrebbe niente.
      const quantita = numero(l.Quantita, 1);
      const prezzoUnitario = numero(l.PrezzoUnitario);
      return {
        descrizione,
        quantita,
        prezzoUnitario,
        aliquotaIva: numero(l.AliquotaIVA, 22),
        unita: l.UnitaMisura ? String(l.UnitaMisura).trim() : undefined,
        categoriaSuggerita: categoriaDa(descrizione),
      };
    },
  );

  // La prima scadenza utile. Un piano rateale ne ha più d'una: si prende la
  // prima e le altre si segnalano, invece di scegliere in silenzio.
  const pagamenti = comeArray(body.DatiPagamento).flatMap((p: unknown) =>
    // deno-lint-ignore no-explicit-any
    comeArray((p as any)?.DettaglioPagamento),
  );
  const scadenze = pagamenti
    // deno-lint-ignore no-explicit-any
    .map((p: any) => String(p?.DataScadenzaPagamento ?? '').trim())
    .filter(Boolean)
    .sort();

  // Il fornitore si CERCA, non si crea.
  let fornitoreId: string | null = null;
  if (partitaIva) {
    try {
      const sb = clientAmministratore();
      const { data } = await sb
        .from('fornitori')
        .select('id')
        .eq('partita_iva', partitaIva)
        .is('deleted_at', null)
        .maybeSingle();
      fornitoreId = (data as { id: string } | null)?.id ?? null;
    } catch {
      // Il fornitore non trovato non fa fallire l'import: la bozza è comunque
      // utile, e l'interfaccia proporrà di crearlo o di sceglierlo a mano.
      fornitoreId = null;
    }
  }

  const totaleDichiarato = numero(generali.ImportoTotaleDocumento);
  const totaleCalcolato =
    Math.round(
      righe.reduce((s, r) => {
        const imp = r.quantita * r.prezzoUnitario;
        return s + imp + imp * (r.aliquotaIva / 100);
      }, 0) * 100,
    ) / 100;

  return ok({
    bozza: {
      numero: numeroDoc,
      dataDocumento: dataDoc,
      dataRicezione: new Date().toISOString().slice(0, 10),
      dataScadenza: scadenze[0] ?? undefined,
      fornitoreId,
      righe,
      datiFe: {
        identificativoSdi: String(
          header.DatiTrasmissione?.ProgressivoInvio ?? '',
        ).trim() || undefined,
        formatoTrasmissione: String(
          header.DatiTrasmissione?.FormatoTrasmissione ?? '',
        ).trim() || undefined,
        tipoDocumento: String(generali.TipoDocumento ?? '').trim() || undefined,
        nomeFile,
        importataIl: new Date().toISOString(),
      },
    },

    /** Quello che l'interfaccia deve mostrare a chi conferma. */
    fornitore: { partitaIva, denominazione, trovato: !!fornitoreId },

    avvisi: [
      ...(bodies.length > 1
        ? [`Il file contiene ${bodies.length} fatture: importata solo la prima.`]
        : []),
      ...(scadenze.length > 1
        ? [`Ci sono ${scadenze.length} scadenze (pagamento rateale): presa la prima, ${scadenze[0]}.`]
        : []),
      ...(!fornitoreId && partitaIva
        ? [`Il fornitore con P.IVA ${partitaIva} non è in anagrafica: va scelto o creato.`]
        : []),
      ...(righe.length === 0 ? ['La fattura non ha righe di dettaglio.'] : []),
      // Lo scarto sul totale è il controllo che vale di più: se non torna,
      // qualcosa nel documento non è stato letto — bolli, sconti, casse
      // previdenziali — e la bozza va corretta a mano prima di registrarla.
      ...(totaleDichiarato > 0 && Math.abs(totaleDichiarato - totaleCalcolato) > 0.02
        ? [
            `Il totale calcolato dalle righe (${totaleCalcolato.toFixed(2)}) non coincide con ` +
              `quello dichiarato in fattura (${totaleDichiarato.toFixed(2)}): controlla prima di registrare.`,
          ]
        : []),
    ],
  });
});

export { CORS };
