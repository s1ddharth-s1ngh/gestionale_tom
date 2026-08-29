import type { StatusPillAccent } from '@/components/ui/status-pill';

/**
 * Fatture attive: emissione da commessa, acconti e saldi, incassi, solleciti.
 *
 * La regola centrale del modulo: **lo stato non è un campo, è una derivazione**
 * dagli incassi e dalla scadenza (vedi `calcolaStatoFattura`). Un `stato`
 * scrivibile a mano diverge dai numeri che dovrebbe riassumere il primo giorno,
 * e poi nessuno sa più quale dei due sia vero.
 */

export type StatoFattura = 'bozza' | 'emessa' | 'pagata_parziale' | 'pagata' | 'scaduta';

/** Ordine delle pill di filtro: segue il ciclo di vita, non l'alfabeto. */
export const STATI_FATTURA: StatoFattura[] = [
  'bozza',
  'emessa',
  'pagata_parziale',
  'pagata',
  'scaduta',
];

const STATO_FATTURA_LABEL: Record<StatoFattura, string> = {
  bozza: 'Bozza',
  emessa: 'Emessa',
  pagata_parziale: 'Pagata parziale',
  pagata: 'Pagata',
  scaduta: 'Scaduta',
};

export function statoFatturaLabel(stato: StatoFattura): string {
  return STATO_FATTURA_LABEL[stato] ?? 'Sconosciuto';
}

/** DESIGN_SYSTEM §2.6. Il fallback a `neutral` non è opzionale. */
const STATO_FATTURA_ACCENT: Record<StatoFattura, StatusPillAccent> = {
  bozza: 'neutral',
  emessa: 'info',
  pagata_parziale: 'amber',
  pagata: 'emerald',
  scaduta: 'danger',
};

export function statoFatturaAccent(stato: StatoFattura): StatusPillAccent {
  return STATO_FATTURA_ACCENT[stato] ?? 'neutral';
}

/**
 * Acconto e saldo sono due fatture distinte sulla stessa commessa, non due
 * righe della stessa: hanno due scadenze, due incassi e due numeri di
 * protocollo. `unica` è il caso normale di chi fattura a lavoro finito.
 */
export type TipoFattura = 'acconto' | 'saldo' | 'unica';

const TIPO_FATTURA_LABEL: Record<TipoFattura, string> = {
  acconto: 'Acconto',
  saldo: 'Saldo',
  unica: 'Unica',
};

export function tipoFatturaLabel(tipo: TipoFattura): string {
  return TIPO_FATTURA_LABEL[tipo] ?? '—';
}

export type MetodoIncasso = 'bonifico' | 'contanti' | 'assegno' | 'carta' | 'riba';

const METODO_INCASSO_LABEL: Record<MetodoIncasso, string> = {
  bonifico: 'Bonifico',
  contanti: 'Contanti',
  assegno: 'Assegno',
  carta: 'Carta',
  riba: 'Ri.Ba.',
};

export function metodoIncassoLabel(metodo: MetodoIncasso): string {
  return METODO_INCASSO_LABEL[metodo] ?? '—';
}

export type CanaleSollecito = 'email' | 'telefono' | 'pec' | 'raccomandata';

const CANALE_SOLLECITO_LABEL: Record<CanaleSollecito, string> = {
  email: 'Email',
  telefono: 'Telefono',
  pec: 'PEC',
  raccomandata: 'Raccomandata',
};

export function canaleSollecitoLabel(canale: CanaleSollecito): string {
  return CANALE_SOLLECITO_LABEL[canale] ?? '—';
}

/**
 * L'aliquota ordinaria. Le potature sulle parti comuni di un condominio vanno
 * spesso al 10%, quindi l'aliquota sta sulla riga e non sulla testata.
 */
export const ALIQUOTA_IVA_DEFAULT = 22;

export interface RigaFattura {
  id: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  /** In punti percentuali: 22, non 0.22. */
  aliquotaIva: number;
}

export interface Incasso {
  id: string;
  data: string;
  importo: number;
  metodo: MetodoIncasso;
  /** CRO del bonifico, numero dell'assegno: quello che si cerca in banca. */
  riferimento?: string;
}

export interface Sollecito {
  id: string;
  data: string;
  canale: CanaleSollecito;
  note?: string;
}

/**
 * Campi della fattura elettronica: si **predispongono e basta**.
 *
 * Niente XML, niente SdI, niente trasmissione. Stanno qui perché il giorno che
 * si collega un intermediario i dati ci sono già; e la pagina lo dice a chiare
 * lettere, o qualcuno darà per scontato che le fatture siano partite.
 */
export interface DatiFatturazioneElettronica {
  /** Sette caratteri, oppure `0000000` per chi riceve via PEC. */
  codiceDestinatario?: string;
  pecDestinatario?: string;
  /** TD01 fattura, TD02 acconto… resta stringa: è una tabella dell'Agenzia. */
  tipoDocumento?: string;
  regimeFiscale?: string;
  /** Testo libero: numero di CIG/CUP per gli enti pubblici. */
  riferimentoAmministrazione?: string;
  /** Split payment: l'ente paga l'imponibile, l'IVA la versa allo Stato. */
  scissionePagamenti?: boolean;
}

export interface Fattura {
  id: string;
  /** FT-AAAA-NNNN, progressivo annuale generato dal service. */
  numero: string;
  tipo: TipoFattura;
  clienteId: string;
  /** Presente quando la fattura nasce da una commessa. */
  commessaId?: string;
  /**
   * Assente finché la fattura è in bozza: è l'unico campo che distingue una
   * bozza da una emessa, ed è il motivo per cui `stato` non serve come campo.
   */
  dataEmissione?: string;
  dataScadenza?: string;
  righe: RigaFattura[];
  incassi: Incasso[];
  solleciti: Sollecito[];
  datiFE?: DatiFatturazioneElettronica;
  note?: string;
  creataIl: string;
  aggiornataIl: string;
}

export interface FatturaFiltri {
  stato?: StatoFattura;
  clienteId?: string;
  commessaId?: string;
  /** Cerca su numero e note. Il nome del cliente lo risolve la pagina. */
  q?: string;
  /** Finestra sulla data di scadenza: la usa lo scadenzario. */
  dal?: string;
  al?: string;
  pagina?: number;
  perPagina?: number;
}

export interface FatturaInput {
  tipo: TipoFattura;
  clienteId: string;
  commessaId?: string;
  dataEmissione?: string;
  dataScadenza?: string;
  righe: Omit<RigaFattura, 'id'>[];
  datiFE?: DatiFatturazioneElettronica;
  note?: string;
}

export interface IncassoInput {
  data: string;
  importo: number;
  metodo: MetodoIncasso;
  riferimento?: string;
}

export interface SollecitoInput {
  data: string;
  canale: CanaleSollecito;
  note?: string;
}

/* ── Derivazioni ─────────────────────────────────────────────────────────── */

export function imponibileRiga(riga: RigaFattura): number {
  return arrotonda(riga.quantita * riga.prezzoUnitario);
}

export function ivaRiga(riga: RigaFattura): number {
  return arrotonda(imponibileRiga(riga) * (riga.aliquotaIva / 100));
}

export function imponibileFattura(righe: RigaFattura[]): number {
  return arrotonda(righe.reduce((tot, r) => tot + imponibileRiga(r), 0));
}

export function ivaFattura(righe: RigaFattura[]): number {
  return arrotonda(righe.reduce((tot, r) => tot + ivaRiga(r), 0));
}

export function totaleFattura(righe: RigaFattura[]): number {
  return arrotonda(imponibileFattura(righe) + ivaFattura(righe));
}

export function incassato(incassi: Incasso[]): number {
  return arrotonda(incassi.reduce((tot, i) => tot + i.importo, 0));
}

export function residuo(fattura: Pick<Fattura, 'righe' | 'incassi'>): number {
  return arrotonda(totaleFattura(fattura.righe) - incassato(fattura.incassi));
}

/**
 * Lo stato, derivato.
 *
 * `oggi` è un parametro e non un `new Date()` dentro la funzione: così una
 * lista di cento fatture si valuta tutta contro il medesimo istante, e una
 * funzione che non legge l'orologio si può provare.
 */
export function calcolaStatoFattura(fattura: Fattura, oggi = new Date()): StatoFattura {
  if (!fattura.dataEmissione) return 'bozza';

  const scoperto = residuo(fattura);
  if (scoperto <= 0) return 'pagata';

  const scaduta =
    !!fattura.dataScadenza && new Date(fattura.dataScadenza).getTime() < oggi.getTime();
  if (scaduta) return 'scaduta';

  // Un incasso parziale resta «parziale» finché non si passa la scadenza:
  // «scaduta» è l'informazione più urgente e vince, ma solo dopo la data.
  return incassato(fattura.incassi) > 0 ? 'pagata_parziale' : 'emessa';
}

/**
 * I centesimi si arrotondano a ogni passaggio: senza, la somma delle righe
 * mostrate non torna col totale mostrato, e la differenza finisce in fattura.
 */
function arrotonda(v: number): number {
  return Math.round(v * 100) / 100;
}
