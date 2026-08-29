import type { StatusPillAccent } from '@/components/ui/status-pill';
import type { CategoriaCosto, CostoInput, TipoNoleggio } from '@/types/costo';

/**
 * Il ciclo passivo: le fatture che RICEVIAMO dai fornitori.
 *
 * È il rovescio di `types/fattura.ts`, e sono due moduli e non uno con un flag
 * «attiva / passiva» per tre ragioni che si vedono subito:
 *
 *  - **la numerazione non è nostra.** Il numero di una fattura attiva lo
 *    generiamo noi ed è unico in tutto l'archivio; qui lo decide il fornitore,
 *    e due fornitori diversi possono mandare entrambi la loro «1/2026».
 *  - **i riferimenti puntano da parti opposte**: le attive a un cliente e a una
 *    commessa, le passive a un fornitore e ai costi che generano.
 *  - **il verbo è diverso**: una attiva si emette e si incassa, una passiva si
 *    registra e si paga. Con un flag, ogni query dovrebbe ricordarsene.
 *
 * La regola centrale è la stessa del ciclo attivo: **lo stato è derivato**. In
 * tabella si salva solo la decisione di una persona — bozza o registrata — e il
 * resto lo calcola `v_fatture_fornitore` dai pagamenti e dalla scadenza.
 */

// ── Stato ───────────────────────────────────────────────────────────────────

/** Quello che si salva: è una decisione, non una conseguenza. */
export type StatoFatturaFornitore = 'bozza' | 'registrata';

/**
 * Quello che si mostra. Aggiunge allo stato salvato ciò che dicono i pagamenti
 * e il calendario, e coincide con `stato_effettivo` di `v_fatture_fornitore`:
 * se le due definizioni divergono, l'elenco e i contatori si contraddicono.
 */
export type StatoFatturaFornitoreEffettivo =
  | 'bozza'
  | 'da_pagare'
  | 'pagata_parziale'
  | 'pagata'
  | 'scaduta';

/** Ordine delle pill di filtro: segue il ciclo di vita, non l'alfabeto. */
export const STATI_FATTURA_FORNITORE: StatoFatturaFornitoreEffettivo[] = [
  'bozza',
  'da_pagare',
  'pagata_parziale',
  'scaduta',
  'pagata',
];

const STATO_LABEL: Record<StatoFatturaFornitoreEffettivo, string> = {
  bozza: 'Bozza',
  da_pagare: 'Da pagare',
  pagata_parziale: 'Pagata in parte',
  pagata: 'Pagata',
  scaduta: 'Scaduta',
};

export function statoFatturaFornitoreLabel(s: StatoFatturaFornitoreEffettivo): string {
  return STATO_LABEL[s] ?? 'Sconosciuto';
}

/**
 * Da DESIGN_SYSTEM §2.6, gli stessi accent del ciclo attivo: chi ha imparato a
 * leggere lo scadenzario dei clienti non deve reimparare quello dei fornitori.
 */
const STATO_ACCENT: Record<StatoFatturaFornitoreEffettivo, StatusPillAccent> = {
  bozza: 'neutral',
  da_pagare: 'info',
  pagata_parziale: 'amber',
  pagata: 'emerald',
  scaduta: 'danger',
};

export function statoFatturaFornitoreAccent(
  s: StatoFatturaFornitoreEffettivo,
): StatusPillAccent {
  return STATO_ACCENT[s] ?? 'neutral';
}

// ── Pagamenti ───────────────────────────────────────────────────────────────

/**
 * Rispecchia `MetodoIncasso` del ciclo attivo ma è un tipo suo, e non un alias.
 *
 * Oggi i valori coincidono; il verbo però è diverso, e soprattutto il passivo è
 * destinato a divergere — un RID/SDD lo si subisce, non lo si incassa mai.
 * Aliasarli oggi vorrebbe dire, il giorno che diverge, dover separare due usi
 * già mescolati in mezzo modulo.
 */
export type MetodoPagamento = 'bonifico' | 'contanti' | 'assegno' | 'carta' | 'riba' | 'rid';

export const METODI_PAGAMENTO: MetodoPagamento[] = [
  'bonifico',
  'contanti',
  'assegno',
  'carta',
  'riba',
  'rid',
];

const METODO_LABEL: Record<MetodoPagamento, string> = {
  bonifico: 'Bonifico',
  contanti: 'Contanti',
  assegno: 'Assegno',
  carta: 'Carta',
  riba: 'RiBa',
  rid: 'RID / SDD',
};

export function metodoPagamentoLabel(m: MetodoPagamento): string {
  return METODO_LABEL[m] ?? '—';
}

export interface Pagamento {
  id: string;
  data: string;
  importo: number;
  metodo: MetodoPagamento;
  /** CRO del bonifico, numero dell'assegno: quello che si cerca in banca. */
  riferimento?: string;
}

export interface PagamentoInput {
  data: string;
  importo: number;
  metodo: MetodoPagamento;
  riferimento?: string;
}

// ── Righe ───────────────────────────────────────────────────────────────────

/**
 * Una riga della fattura del fornitore.
 *
 * La **categoria sta sulla riga e non in testata**: la fattura di un
 * noleggiatore contiene il noleggio e il trasporto, che sono due categorie di
 * costo diverse e devono diventare due righe di `costi` diverse. Una categoria
 * in testata costringerebbe a scegliere quale delle due mentire.
 *
 * Anche l'aliquota sta sulla riga, perché una fattura italiana può avere il 22%
 * sul noleggio e il 10% su una manutenzione agevolata nello stesso documento.
 */
export interface RigaFatturaFornitore {
  id: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  /** Percentuale, per riga. Vedi `calcolaTotaliFattura`. */
  aliquotaIva: number;
  categoria: CategoriaCosto;
  /** Obbligatorio quando la categoria è `carburante` — lo impone anche il DB. */
  mezzoId?: string;
  /** Obbligatorio quando la categoria è `noleggio` — idem. */
  tipoNoleggio?: TipoNoleggio;
  /** Presente = il costo che ne nasce è imputato a una commessa. */
  commessaId?: string;
  /** Solo per i rifornimenti: serve a leggere il consumo, non solo la spesa. */
  litri?: number;
}

export type RigaFatturaFornitoreInput = Omit<RigaFatturaFornitore, 'id'> & { id?: string };

// ── La fattura ──────────────────────────────────────────────────────────────

export interface FatturaFornitore {
  id: string;
  /** Il numero del FORNITORE. Nessun formato imposto: «318», «2026/318», «FT-A-42». */
  numero: string;
  fornitoreId: string;
  /** Risolta dalla vista, per elenco e ricerca. */
  fornitoreDenominazione?: string;
  fornitorePartitaIva?: string;

  dataDocumento: string;
  /**
   * Quando è arrivata a noi. Non coincide con la data del documento, e la
   * differenza è il ritardo con cui ce ne siamo accorti: è il dato che spiega
   * le registrazioni tardive, e per questo si conserva invece di dedurlo.
   */
  dataRicezione: string;
  dataScadenza?: string;

  stato: StatoFatturaFornitore;
  righe: RigaFatturaFornitore[];
  pagamenti: Pagamento[];

  /** Denormalizzati sul record, ricalcolati a ogni scrittura delle righe. */
  imponibile: number;
  iva: number;
  totale: number;

  /** Derivati dalla vista. */
  pagato: number;
  residuo: number;
  /** Quante righe di `costi` questa fattura ha già generato. Vedi `generaCosti`. */
  costiGenerati: number;
  giorniRitardoRicezione?: number;

  /** Predisposizione della fattura elettronica passiva: si conserva, non si trasmette. */
  datiFe?: DatiFatturaElettronica;
  note?: string;
  creatoIl: string;
  aggiornatoIl: string;
}

/** Quello che arriva dallo SdI e che vale la pena conservare. */
export interface DatiFatturaElettronica {
  /** Identificativo attribuito dal Sistema di Interscambio. */
  identificativoSdi?: string;
  formatoTrasmissione?: string;
  tipoDocumento?: string;
  /** Nome del file XML da cui è stata importata. */
  nomeFile?: string;
  importataIl?: string;
}

export interface FatturaFornitoreInput {
  numero: string;
  fornitoreId: string;
  dataDocumento: string;
  dataRicezione: string;
  dataScadenza?: string;
  righe: RigaFatturaFornitoreInput[];
  note?: string;
  datiFe?: DatiFatturaElettronica;
}

export interface FatturaFornitoreFiltri {
  /** Confrontato con lo stato EFFETTIVO, o «Scadute» darebbe sempre zero. */
  stato?: StatoFatturaFornitoreEffettivo;
  fornitoreId?: string;
  /** Cerca su numero, denominazione del fornitore e note. */
  q?: string;
  dal?: string;
  al?: string;
  pagina?: number;
  perPagina?: number;
}

/** Giorni di pagamento proposti alla registrazione: la prassi del settore. */
export const GIORNI_PAGAMENTO_DEFAULT = 30;

// ── Derivazioni ─────────────────────────────────────────────────────────────

/** Imponibile di una riga, arrotondato al centesimo. */
export function imponibileRiga(
  r: Pick<RigaFatturaFornitore, 'quantita' | 'prezzoUnitario'>,
): number {
  return Math.round(r.quantita * r.prezzoUnitario * 100) / 100;
}

/** Una fascia di aliquota, per il riepilogo IVA in coda al documento. */
export interface FasciaIva {
  aliquota: number;
  imponibile: number;
  iva: number;
}

/**
 * I totali della fattura, raggruppati PER ALIQUOTA.
 *
 * Non è pignoleria: su una fattura con righe al 22% e al 10%, calcolare l'IVA
 * su un'aliquota unica sbaglia di decine di euro, e lo sbaglio si scopre quando
 * il totale non combacia con quello stampato sul documento del fornitore —
 * cioè quando il commercialista chiede conto della differenza.
 *
 * L'arrotondamento è per fascia e non sul totale, perché è così che lo fa la
 * fattura elettronica: arrotondare alla fine può dare un centesimo di scarto.
 */
export function calcolaTotaliFattura(
  righe: Pick<RigaFatturaFornitore, 'quantita' | 'prezzoUnitario' | 'aliquotaIva'>[],
): { imponibile: number; iva: number; totale: number; fasce: FasciaIva[] } {
  const perAliquota = new Map<number, number>();

  for (const r of righe) {
    const a = r.aliquotaIva ?? 0;
    perAliquota.set(a, (perAliquota.get(a) ?? 0) + imponibileRiga(r));
  }

  const fasce: FasciaIva[] = [...perAliquota.entries()]
    .sort((x, y) => y[0] - x[0])
    .map(([aliquota, imp]) => {
      const imponibile = Math.round(imp * 100) / 100;
      return {
        aliquota,
        imponibile,
        iva: Math.round(imponibile * (aliquota / 100) * 100) / 100,
      };
    });

  const imponibile = Math.round(fasce.reduce((t, f) => t + f.imponibile, 0) * 100) / 100;
  const iva = Math.round(fasce.reduce((t, f) => t + f.iva, 0) * 100) / 100;
  return { imponibile, iva, totale: Math.round((imponibile + iva) * 100) / 100, fasce };
}

/** Quanto è già stato pagato, dalla lista dei pagamenti. */
export function totalePagato(pagamenti: Pick<Pagamento, 'importo'>[]): number {
  return Math.round(pagamenti.reduce((t, p) => t + p.importo, 0) * 100) / 100;
}

/**
 * Lo stato da mostrare. Stessa formula di `v_fatture_fornitore`: se le due
 * divergono, l'elenco e i suoi contatori dicono cose diverse sulla stessa riga.
 *
 * L'ordine dei rami conta. «Pagata» viene prima di «scaduta» perché una fattura
 * saldata in ritardo è pagata, non scaduta: continuare a segnalarla in rosso
 * dopo che i soldi sono usciti è il modo più rapido per far ignorare il colore.
 */
export function statoEffettivoFattura(
  f: Pick<FatturaFornitore, 'stato' | 'totale' | 'dataScadenza'>,
  pagato: number,
  oggi: string = new Date().toISOString().slice(0, 10),
): StatoFatturaFornitoreEffettivo {
  if (f.stato === 'bozza') return 'bozza';
  if (pagato >= f.totale && f.totale > 0) return 'pagata';
  if (f.dataScadenza && f.dataScadenza < oggi) return 'scaduta';
  if (pagato > 0) return 'pagata_parziale';
  return 'da_pagare';
}

export type UrgenzaScadenza = 'scaduto' | 'imminente' | 'futuro';

/** Sotto questa soglia la scadenza è «imminente»: è quando conviene disporre. */
export const GIORNI_IMMINENTE = 7;

export function urgenzaScadenza(giorni: number | null | undefined): UrgenzaScadenza {
  if (giorni == null) return 'futuro';
  if (giorni < 0) return 'scaduto';
  return giorni <= GIORNI_IMMINENTE ? 'imminente' : 'futuro';
}

/**
 * Stesso codice colore dello scadenzario attivo: due scadenzari nella stessa
 * app che si leggono in due modi diversi sono peggio di uno solo.
 */
const URGENZA_ACCENT: Record<UrgenzaScadenza, StatusPillAccent> = {
  scaduto: 'danger',
  imminente: 'amber',
  futuro: 'neutral',
};

export function urgenzaAccent(u: UrgenzaScadenza): StatusPillAccent {
  return URGENZA_ACCENT[u] ?? 'neutral';
}

/** Giorni che mancano alla scadenza: negativo se è già passata. */
export function giorniAllaScadenza(
  dataScadenza: string | undefined,
  oggi: Date = new Date(),
): number | null {
  if (!dataScadenza) return null;
  const fine = new Date(`${dataScadenza}T12:00:00`);
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 12);
  return Math.round((fine.getTime() - inizio.getTime()) / 86_400_000);
}

// ── Il ponte verso i costi ──────────────────────────────────────────────────

/**
 * Le righe di costo che questa fattura genera.
 *
 * Una fattura fornitore **genera** i costi, non li duplica: la riga di `costi`
 * è la spesa, la fattura è il documento che la giustifica. Per questo l'importo
 * è il solo imponibile — l'IVA sugli acquisti si detrae, non è un costo, e
 * sommarla gonfierebbe ogni riepilogo del 22% senza che nessuno abbia speso
 * quei soldi.
 *
 * È una funzione pura e sta qui, non nel service, perché la usano in due: il
 * service quando scrive, e il dialog per mostrare l'ANTEPRIMA di cosa sta per
 * essere scritto. Se fossero due implementazioni, l'anteprima prima o poi
 * mostrerebbe qualcosa di diverso da quello che finisce in archivio.
 */
export function costiDaFattura(f: FatturaFornitore): CostoInput[] {
  return f.righe.map((r) => ({
    // La data del COSTO è quella del documento, non della registrazione: la
    // spesa appartiene al periodo in cui è stata fatta, e registrarla a marzo
    // non la sposta a marzo.
    data: f.dataDocumento,
    categoria: r.categoria,
    descrizione: r.descrizione,
    importo: imponibileRiga(r),
    fornitoreId: f.fornitoreId,
    mezzoId: r.mezzoId,
    tipoNoleggio: r.tipoNoleggio,
    commessaId: r.commessaId,
    documento: f.numero,
    litri: r.litri,
    // Il legame che rende la generazione idempotente: l'indice unico su
    // (fattura_fornitore_id, riga_fattura_id) rifiuta il secondo tentativo, e
    // l'applicazione non deve più ricordarsi di controllare. Vedi
    // db/008_costi_riga_fattura.sql.
    fatturaFornitoreId: f.id,
    rigaFatturaId: r.id,
  }));
}

/**
 * Cosa impedisce di generare i costi.
 *
 * I due vincoli sono gli stessi che `public.costi` impone con un CHECK: un
 * carburante senza mezzo e un noleggio senza tipo vengono rifiutati dal
 * database. Controllarli qui serve a dirlo in italiano e riga per riga, invece
 * di far arrivare un messaggio di Postgres che nomina un vincolo e non spiega
 * quale riga sistemare.
 */
export function problemiGenerazione(f: FatturaFornitore): string[] {
  const problemi: string[] = [];

  if (f.righe.length === 0) {
    problemi.push('La fattura non ha righe: non c’è niente da generare.');
  }

  // `genera_costi_da_fattura` porta la fattura a `registrata` dentro la stessa
  // transazione, e `chk_registrata` pretende una scadenza. Senza, il CHECK
  // scatta all'ULTIMA istruzione e fa rollback di tutti i costi appena
  // inseriti: si vedrebbe fallire la generazione per un motivo che sembra non
  // c'entrare niente con le righe. Meglio dirlo prima di partire.
  if (!f.dataScadenza) {
    problemi.push(
      'Manca la data di scadenza. Serve perché registrando la fattura entra nello ' +
        'scadenzario, ed è da lì che si decide cosa pagare.',
    );
  }

  f.righe.forEach((r, i) => {
    const dove = `Riga ${i + 1}${r.descrizione ? ` (${r.descrizione})` : ''}`;
    if (r.categoria === 'carburante' && !r.mezzoId) {
      problemi.push(`${dove}: il carburante va sempre attribuito a un mezzo.`);
    }
    if (r.categoria === 'noleggio' && !r.tipoNoleggio) {
      problemi.push(`${dove}: indica che tipo di noleggio è.`);
    }
  });

  return problemi;
}

/**
 * I costi di questa fattura ci sono già.
 *
 * Non è un «problema» insieme agli altri, ed è una distinzione che conta:
 * `genera_costi_da_fattura` in questo caso torna 0 senza toccare niente invece
 * di fallire — chi ha ricliccato non ha sbagliato, e trattarlo come un guasto
 * insegna a ignorare i messaggi. Serve però a spegnere il bottone prima, così
 * il gesto inutile non si fa proprio.
 */
export function costiGiaGenerati(f: FatturaFornitore): boolean {
  return f.costiGenerati > 0;
}
