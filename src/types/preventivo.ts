import type { Foto } from '@/types/comune';
import type { StatusPillAccent } from '@/components/ui/status-pill';

/**
 * Il preventivo per lavori su alberi: sopralluogo, rilievo, righe, esito.
 *
 * Due cose qui NON sono campi salvati, ed è la decisione che regge il modulo:
 * `scaduto` si deriva da `validoFino` (vedi `statoEffettivo`) e il totale si
 * deriva dalle righe (vedi `calcolaTotali`). Salvarli vorrebbe dire, nel primo
 * caso, un job notturno che nessuno fa girare; nel secondo, un numero
 * modificabile che smette di combaciare con le righe che dovrebbe riassumere.
 */

// ── Stato ───────────────────────────────────────────────────────────────────

export type StatoPreventivo = 'bozza' | 'inviato' | 'accettato' | 'rifiutato' | 'scaduto';

/** Ordine di scorrimento nelle pill di filtro: segue il ciclo di vita, non l'alfabeto. */
export const STATI_PREVENTIVO: StatoPreventivo[] = [
  'bozza',
  'inviato',
  'accettato',
  'rifiutato',
  'scaduto',
];

const STATO_PREVENTIVO_LABEL: Record<StatoPreventivo, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  scaduto: 'Scaduto',
};

/** L'etichetta è in italiano e si legge: la chiave del mock non si mostra mai. */
export function statoPreventivoLabel(stato: StatoPreventivo): string {
  return STATO_PREVENTIVO_LABEL[stato] ?? 'Sconosciuto';
}

/** Da DESIGN_SYSTEM §2.6. Il fallback a `neutral` non è opzionale: uno stato non
 *  mappato si rende grigio, non fa esplodere la cella. */
const STATO_PREVENTIVO_ACCENT: Record<StatoPreventivo, StatusPillAccent> = {
  bozza: 'neutral',
  inviato: 'info',
  accettato: 'emerald',
  rifiutato: 'danger',
  scaduto: 'amber',
};

export function statoPreventivoAccent(stato: StatoPreventivo): StatusPillAccent {
  return STATO_PREVENTIVO_ACCENT[stato] ?? 'neutral';
}

// ── Sopralluogo ─────────────────────────────────────────────────────────────

export type Accessibilita = 'facile' | 'media' | 'difficile';

export const ACCESSIBILITA: Accessibilita[] = ['facile', 'media', 'difficile'];

const ACCESSIBILITA_LABEL: Record<Accessibilita, string> = {
  facile: 'Facile',
  media: 'Media',
  difficile: 'Difficile',
};

export function accessibilitaLabel(a: Accessibilita): string {
  return ACCESSIBILITA_LABEL[a] ?? 'Sconosciuta';
}

/** Più difficile è l'accesso, più il colore pesa: è quello che alza il preventivo. */
const ACCESSIBILITA_ACCENT: Record<Accessibilita, StatusPillAccent> = {
  facile: 'neutral',
  media: 'amber',
  difficile: 'orange',
};

export function accessibilitaAccent(a: Accessibilita): StatusPillAccent {
  return ACCESSIBILITA_ACCENT[a] ?? 'neutral';
}

/**
 * Le criticità rilevate in sopralluogo. Sono quelle che cambiano la squadra, i
 * mezzi e il prezzo: per questo stanno nel modello e non dentro le note.
 */
export type Criticita =
  | 'cavi_elettrici'
  | 'vicinanza_edifici'
  | 'traffico'
  | 'pendenza'
  | 'accesso_difficile'
  | 'presenza_pubblico'
  | 'nidificazione';

export const CRITICITA: Criticita[] = [
  'cavi_elettrici',
  'vicinanza_edifici',
  'traffico',
  'pendenza',
  'accesso_difficile',
  'presenza_pubblico',
  'nidificazione',
];

const CRITICITA_LABEL: Record<Criticita, string> = {
  cavi_elettrici: 'Cavi elettrici',
  vicinanza_edifici: 'Vicinanza edifici',
  traffico: 'Traffico',
  pendenza: 'Pendenza',
  accesso_difficile: 'Accesso difficile',
  presenza_pubblico: 'Presenza di pubblico',
  nidificazione: 'Nidificazione',
};

export function criticitaLabel(c: Criticita): string {
  return CRITICITA_LABEL[c] ?? 'Sconosciuta';
}

/**
 * Da DESIGN_SYSTEM §2.6. Qui l'accent è GRAVITÀ e non categoria: i cavi
 * elettrici sono l'unica criticità che può uccidere qualcuno, e si vede.
 */
const CRITICITA_ACCENT: Record<Criticita, StatusPillAccent> = {
  cavi_elettrici: 'danger',
  vicinanza_edifici: 'orange',
  traffico: 'orange',
  pendenza: 'amber',
  accesso_difficile: 'amber',
  presenza_pubblico: 'amber',
  nidificazione: 'teal',
};

export function criticitaAccent(c: Criticita): StatusPillAccent {
  return CRITICITA_ACCENT[c] ?? 'neutral';
}

/** Cosa si fa all'albero. Guida il prezzo di riga più della specie. */
export type Lavorazione =
  | 'abbattimento'
  | 'potatura'
  | 'rimonda_secco'
  | 'consolidamento'
  | 'cippatura'
  | 'ceppaia'
  | 'messa_in_sicurezza'
  | 'vta';

export const LAVORAZIONI: Lavorazione[] = [
  'abbattimento',
  'potatura',
  'rimonda_secco',
  'consolidamento',
  'cippatura',
  'ceppaia',
  'messa_in_sicurezza',
  'vta',
];

const LAVORAZIONE_LABEL: Record<Lavorazione, string> = {
  abbattimento: 'Abbattimento',
  potatura: 'Potatura',
  rimonda_secco: 'Rimonda del secco',
  consolidamento: 'Consolidamento',
  cippatura: 'Cippatura',
  ceppaia: 'Fresatura ceppaia',
  messa_in_sicurezza: 'Messa in sicurezza',
  vta: 'Verifica VTA',
};

export function lavorazioneLabel(l: Lavorazione): string {
  return LAVORAZIONE_LABEL[l] ?? 'Sconosciuta';
}

/**
 * Un albero rilevato in sopralluogo.
 *
 * Altezza e diametro non sono decorazione: determinano se serve la piattaforma
 * aerea o il tree climbing, ed è la voce che pesa di più sul prezzo.
 */
export interface RilievoAlbero {
  id: string;
  /** Nome comune, libero: l'elenco di `mocks/specieAlberi` è un aiuto, non un vincolo. */
  specie: string;
  altezzaM: number;
  /** Diametro del fusto a petto d'uomo, in centimetri. */
  diametroCm: number;
  quantita: number;
  lavorazione: Lavorazione;
  note?: string;
}

export interface SchedaSopralluogo {
  dataSopralluogo?: string;
  foto: Foto[];
  alberi: RilievoAlbero[];
  accessibilita: Accessibilita;
  criticita: Criticita[];
  noteTecniche?: string;
}

/** Scheda vuota: la usa il form di creazione, così i campi non partono `undefined`. */
export const SOPRALLUOGO_VUOTO: SchedaSopralluogo = {
  foto: [],
  alberi: [],
  accessibilita: 'facile',
  criticita: [],
};

// ── Righe economiche ────────────────────────────────────────────────────────

export type UnitaMisura = 'nr' | 'ore' | 'mq' | 'mc' | 'km' | 'corpo' | 'kg';

export const UNITA_MISURA: UnitaMisura[] = ['nr', 'ore', 'mq', 'mc', 'km', 'corpo', 'kg'];

const UNITA_LABEL: Record<UnitaMisura, string> = {
  nr: 'nr',
  ore: 'ore',
  mq: 'm²',
  mc: 'm³',
  km: 'km',
  corpo: 'a corpo',
  kg: 'kg',
};

export function unitaLabel(u: UnitaMisura): string {
  return UNITA_LABEL[u] ?? u;
}

export interface RigaPreventivo {
  id: string;
  descrizione: string;
  quantita: number;
  unita: UnitaMisura;
  /** Può essere negativo: uno sconto a totale si scrive come riga negativa. */
  prezzoUnitario: number;
  /** Derivato da quantità × prezzo. Non si digita — vedi `calcolaImporto`. */
  importo: number;
}

// ── Il preventivo ───────────────────────────────────────────────────────────

export interface Preventivo {
  id: string;
  /** PR-AAAA-NNNN, progressivo annuale generato dal service. */
  numero: string;
  clienteId: string;
  luogoInterventoId: string;
  /**
   * Lo stato COME SALVATO. Non contiene mai `scaduto`, che è derivato: per
   * quello che si mostra a schermo si passa sempre da `statoEffettivo`.
   */
  stato: Exclude<StatoPreventivo, 'scaduto'>;
  dataEmissione: string;
  /** Oltre questa data un preventivo inviato si legge scaduto. */
  validoFino: string;
  dataInvio?: string;
  /** Quando il cliente ha risposto, in un senso o nell'altro. */
  dataEsito?: string;
  sopralluogo: SchedaSopralluogo;
  righe: RigaPreventivo[];
  /** Derivati dalle righe. Vedi `calcolaTotali`: non si scrivono a mano. */
  imponibile: number;
  aliquotaIva: number;
  totale: number;
  note?: string;
  /** Valorizzato dalla chat C alla conversione in commessa. */
  commessaId?: string;
  /** ISO 8601. */
  creatoIl: string;
  aggiornatoIl: string;
}

export interface PreventivoFiltri {
  /** Confrontato con lo stato EFFETTIVO, o gli scaduti non comparirebbero mai. */
  stato?: StatoPreventivo;
  clienteId?: string;
  /** Cerca su numero, note e descrizioni di riga. */
  q?: string;
  pagina?: number;
  perPagina?: number;
}

export interface PreventivoInput {
  clienteId: string;
  luogoInterventoId: string;
  dataEmissione: string;
  validoFino: string;
  sopralluogo: SchedaSopralluogo;
  righe: Omit<RigaPreventivo, 'id' | 'importo'>[];
  aliquotaIva: number;
  note?: string;
}

/** L'IVA ordinaria. Il verde pubblico su aree private sta al 22%; le manutenzioni
 *  agevolate al 10% esistono, quindi l'aliquota resta un campo e non una costante. */
export const ALIQUOTA_IVA_DEFAULT = 22;

/** Giorni di validità proposti alla creazione: è la prassi del settore. */
export const VALIDITA_GIORNI_DEFAULT = 30;

// ── Derivazioni ─────────────────────────────────────────────────────────────

/**
 * Lo stato da MOSTRARE, che non sempre è quello salvato.
 *
 * Un preventivo `inviato` la cui `validoFino` è passata si legge `scaduto`.
 * Non lo si salva perché servirebbe qualcosa che ogni notte rilegge l'archivio
 * e riscrive gli stati: un job che in un gestionale a due utenti non gira, e
 * il giorno che non gira lascia gli stati a mentire. Derivarlo costa un
 * confronto fra stringhe ISO, che si ordinano già lessicograficamente.
 *
 * Le bozze non scadono: una bozza è roba nostra, non è mai stata promessa a
 * nessuno. Accettati e rifiutati sono esiti definitivi e non tornano indietro.
 */
export function statoEffettivo(
  p: Pick<Preventivo, 'stato' | 'validoFino'>,
  oggi: string = new Date().toISOString().slice(0, 10),
): StatoPreventivo {
  if (p.stato === 'inviato' && p.validoFino < oggi) return 'scaduto';
  return p.stato;
}

/** Giorni che mancano alla scadenza: negativo se è già passata. */
export function giorniAllaScadenza(
  p: Pick<Preventivo, 'validoFino'>,
  oggi: Date = new Date(),
): number {
  const fine = new Date(`${p.validoFino}T12:00:00`);
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 12);
  return Math.round((fine.getTime() - inizio.getTime()) / 86_400_000);
}

/** Importo di riga. Arrotondato al centesimo: senza, 0.1 × 3 finisce a 0.30000000000000004. */
export function calcolaImporto(riga: Pick<RigaPreventivo, 'quantita' | 'prezzoUnitario'>): number {
  return Math.round(riga.quantita * riga.prezzoUnitario * 100) / 100;
}

/**
 * I totali si calcolano SEMPRE dalle righe, mai si leggono da un campo scritto
 * a mano. È la ragione per cui uno sconto a totale, il giorno che servirà, è
 * una riga con prezzo negativo e non un campo `sconto`: un secondo posto in cui
 * il totale si decide è un secondo posto in cui può sbagliare.
 */
export function calcolaTotali(
  righe: Pick<RigaPreventivo, 'quantita' | 'prezzoUnitario'>[],
  aliquotaIva: number,
): { imponibile: number; iva: number; totale: number } {
  const imponibile = Math.round(righe.reduce((tot, r) => tot + calcolaImporto(r), 0) * 100) / 100;
  const iva = Math.round(imponibile * (aliquotaIva / 100) * 100) / 100;
  return { imponibile, iva, totale: Math.round((imponibile + iva) * 100) / 100 };
}

/** Ore preventivate, dal rilievo. Le eredita la commessa alla conversione. */
export function oreStimate(righe: Pick<RigaPreventivo, 'quantita' | 'unita'>[]): number {
  return righe.filter((r) => r.unita === 'ore').reduce((tot, r) => tot + r.quantita, 0);
}
