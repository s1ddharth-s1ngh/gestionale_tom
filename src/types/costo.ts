import type { LucideIcon } from '@/components/ui/icons';
import {
  Barbell,
  GasPump,
  Package,
  Receipt,
  Trash2,
  Truck,
  Wrench,
} from '@/components/ui/icons';
import type { Indirizzo } from '@/types/comune';

/**
 * Costi di esercizio: carburante per mezzo, materiali, noleggi, smaltimenti.
 *
 * Un costo con `commessaId` è **imputato** a un lavoro, senza è **generale**.
 * La distinzione serve al report di marginalità, che non è nel primo rilascio:
 * o si fa bene adesso, o quel report si rifà da zero con i dati già inseriti.
 */

export type CategoriaCosto =
  | 'carburante'
  | 'materiali'
  | 'noleggio'
  | 'smaltimento'
  | 'manutenzione'
  | 'assicurazione'
  | 'personale'
  | 'altro';

export const CATEGORIE_COSTO: CategoriaCosto[] = [
  'carburante',
  'materiali',
  'noleggio',
  'smaltimento',
  'manutenzione',
  'assicurazione',
  'personale',
  'altro',
];

const CATEGORIA_COSTO_LABEL: Record<CategoriaCosto, string> = {
  carburante: 'Carburante',
  materiali: 'Materiali',
  noleggio: 'Noleggio',
  smaltimento: 'Smaltimento',
  manutenzione: 'Manutenzione',
  assicurazione: 'Assicurazione',
  personale: 'Personale',
  altro: 'Altro',
};

export function categoriaCostoLabel(categoria: CategoriaCosto): string {
  return CATEGORIA_COSTO_LABEL[categoria] ?? 'Sconosciuta';
}

/**
 * Le categorie si distinguono con l'ICONA, non con il colore.
 *
 * Gli accent del design system hanno un significato globale — gravità, non
 * appartenenza — e le uniche due tinte ammesse per le categorie sono `purple`
 * e `teal`: due, contro otto categorie. Colorarle tutte significherebbe
 * inventare una semantica nuova, e una tabella dei costi che sembra un
 * semaforo di allarmi che non ci sono.
 */
const CATEGORIA_COSTO_ICONA: Record<CategoriaCosto, LucideIcon> = {
  carburante: GasPump,
  materiali: Package,
  noleggio: Barbell,
  smaltimento: Trash2,
  manutenzione: Wrench,
  assicurazione: Receipt,
  personale: Truck,
  altro: Receipt,
};

export function categoriaCostoIcona(categoria: CategoriaCosto): LucideIcon {
  return CATEGORIA_COSTO_ICONA[categoria] ?? Receipt;
}

export type TipoNoleggio = 'piattaforma' | 'gru' | 'cippatrice' | 'autocarro' | 'altro';

export const TIPI_NOLEGGIO: TipoNoleggio[] = ['piattaforma', 'gru', 'cippatrice', 'autocarro', 'altro'];

const TIPO_NOLEGGIO_LABEL: Record<TipoNoleggio, string> = {
  piattaforma: 'Piattaforma aerea',
  gru: 'Gru',
  cippatrice: 'Cippatrice',
  autocarro: 'Autocarro',
  altro: 'Altro',
};

export function tipoNoleggioLabel(tipo: TipoNoleggio): string {
  return TIPO_NOLEGGIO_LABEL[tipo] ?? '—';
}

export type TipoMezzo = 'autocarro' | 'pickup' | 'piattaforma' | 'cippatrice' | 'trattore' | 'altro';

const TIPO_MEZZO_LABEL: Record<TipoMezzo, string> = {
  autocarro: 'Autocarro',
  pickup: 'Pick-up',
  piattaforma: 'Piattaforma',
  cippatrice: 'Cippatrice',
  trattore: 'Trattore',
  altro: 'Altro',
};

export function tipoMezzoLabel(tipo: TipoMezzo): string {
  return TIPO_MEZZO_LABEL[tipo] ?? '—';
}

/**
 * Anagrafica minima del mezzo: targa, descrizione, tipo.
 *
 * Il modulo mezzi vero — scadenze di revisione, assicurazione, tagliandi — è
 * fuori dal primo rilascio. Questa struttura non gli sta in mezzo: il giorno
 * che arriva, `Mezzo` cresce e i costi continuano a puntarci con `mezzoId`.
 */
export interface Mezzo {
  id: string;
  /** Maiuscola e senza spazi: "FL429GT". */
  targa: string;
  descrizione: string;
  tipo: TipoMezzo;
  /** Un mezzo venduto non si cancella, o i costi passati perdono il riferimento. */
  attivo: boolean;
}

export interface Fornitore {
  id: string;
  denominazione: string;
  partitaIva?: string;
  /** Cosa ci si compra di solito: serve a proporlo per primo nel drawer. */
  categoriaPrevalente?: CategoriaCosto;
  telefono?: string;
  email?: string;
  indirizzo?: Indirizzo;
  note?: string;
  creatoIl: string;
  aggiornatoIl: string;
}

export interface FornitoreInput {
  denominazione: string;
  partitaIva?: string;
  categoriaPrevalente?: CategoriaCosto;
  telefono?: string;
  email?: string;
  indirizzo?: Indirizzo;
  note?: string;
}

export interface Costo {
  id: string;
  data: string;
  categoria: CategoriaCosto;
  descrizione: string;
  /** Imponibile. L'IVA sui costi è detraibile e non è un costo: sta a parte. */
  importo: number;
  aliquotaIva?: number;
  fornitoreId?: string;
  /**
   * Obbligatorio quando la categoria è `carburante`: è tutto il senso del
   * requisito «carburante distinto per mezzo». Lo impone lo schema del drawer.
   */
  mezzoId?: string;
  /** Solo per i noleggi. */
  tipoNoleggio?: TipoNoleggio;
  /** Presente = costo imputato a una commessa; assente = costo generale. */
  commessaId?: string;
  /** Numero della fattura o dello scontrino del fornitore. */
  documento?: string;
  /** Solo per i rifornimenti: serve a leggere il consumo, non solo la spesa. */
  litri?: number;
  note?: string;
  creatoIl: string;
  aggiornatoIl: string;
}

export interface CostoInput {
  data: string;
  categoria: CategoriaCosto;
  descrizione: string;
  importo: number;
  aliquotaIva?: number;
  fornitoreId?: string;
  mezzoId?: string;
  tipoNoleggio?: TipoNoleggio;
  commessaId?: string;
  documento?: string;
  litri?: number;
  note?: string;
}

export interface CostoFiltri {
  categoria?: CategoriaCosto;
  fornitoreId?: string;
  mezzoId?: string;
  commessaId?: string;
  /** Solo i costi imputati a una commessa, o solo quelli generali. */
  imputazione?: 'imputati' | 'generali';
  q?: string;
  dal?: string;
  al?: string;
  pagina?: number;
  perPagina?: number;
}

/** Una voce di riepilogo: quanto e quante volte. Il «quante volte» distingue
 *  una spesa grossa da una che si ripete e nessuno ha mai guardato. */
export interface RiepilogoVoce {
  chiave: string;
  etichetta: string;
  totale: number;
  conteggio: number;
  /** Quota sul totale del periodo, 0–100: la barra si disegna con questa. */
  quotaPct: number;
}

/** Costruisce le voci di riepilogo già ordinate dalla più costosa. */
export function riepiloga<T>(
  elementi: T[],
  chiaveDi: (e: T) => string,
  etichettaDi: (chiave: string) => string,
  importoDi: (e: T) => number,
): RiepilogoVoce[] {
  const mappa = new Map<string, { totale: number; conteggio: number }>();

  for (const e of elementi) {
    const chiave = chiaveDi(e);
    const voce = mappa.get(chiave) ?? { totale: 0, conteggio: 0 };
    voce.totale += importoDi(e);
    voce.conteggio += 1;
    mappa.set(chiave, voce);
  }

  const totaleGenerale = [...mappa.values()].reduce((t, v) => t + v.totale, 0);

  return [...mappa.entries()]
    .map(([chiave, v]) => ({
      chiave,
      etichetta: etichettaDi(chiave),
      totale: Math.round(v.totale * 100) / 100,
      conteggio: v.conteggio,
      // Senza il guardrail sullo zero la barra prende NaN e sparisce, che a
      // schermo sembra un riepilogo vuoto invece che un periodo senza costi.
      quotaPct: totaleGenerale > 0 ? Math.round((v.totale / totaleGenerale) * 100) : 0,
    }))
    .sort((a, b) => b.totale - a.totale);
}
