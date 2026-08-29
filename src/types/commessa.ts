import type { Foto } from '@/types/comune';
import type { StatusPillAccent } from '@/components/ui/status-pill';

/**
 * Il lavoro sul campo: dalla pianificazione al rapportino firmato.
 *
 * Due campi qui NON si scrivono a mano — `oreReali` e `avanzamentoPct` derivano
 * dalle lavorazioni (vedi `oreRealiDa` e `avanzamentoDa`). Un numero scrivibile
 * a mano diverge dai dati che dovrebbe riassumere il primo giorno.
 */

export type StatoCommessa =
  | 'da_pianificare'
  | 'pianificata'
  | 'in_corso'
  | 'completata'
  | 'sospesa'
  | 'annullata';

/** Ordine di scorrimento nelle pill di filtro: segue il ciclo di vita, non l'alfabeto. */
export const STATI_COMMESSA: StatoCommessa[] = [
  'da_pianificare',
  'pianificata',
  'in_corso',
  'completata',
  'sospesa',
  'annullata',
];

const STATO_COMMESSA_LABEL: Record<StatoCommessa, string> = {
  da_pianificare: 'Da pianificare',
  pianificata: 'Pianificata',
  in_corso: 'In corso',
  completata: 'Completata',
  sospesa: 'Sospesa',
  annullata: 'Annullata',
};

/** L'etichetta è in italiano e si legge: la chiave del mock non si mostra mai. */
export function statoCommessaLabel(stato: StatoCommessa): string {
  return STATO_COMMESSA_LABEL[stato] ?? 'Sconosciuto';
}

/** Da DESIGN_SYSTEM §2.6. Il fallback a `neutral` non è opzionale: uno stato non
 *  mappato si rende grigio, non fa esplodere la cella. */
const STATO_COMMESSA_ACCENT: Record<StatoCommessa, StatusPillAccent> = {
  da_pianificare: 'neutral',
  pianificata: 'info',
  in_corso: 'amber',
  completata: 'emerald',
  sospesa: 'orange',
  annullata: 'danger',
};

export function statoCommessaAccent(stato: StatoCommessa): StatusPillAccent {
  return STATO_COMMESSA_ACCENT[stato] ?? 'neutral';
}

export interface Lavorazione {
  id: string;
  descrizione: string;
  orePreviste: number;
  /** Compilata quando la lavorazione si chiude. Una correzione è una lavorazione di rettifica. */
  oreReali?: number;
  completata: boolean;
}

export interface Rapportino {
  dataCompilazione: string;
  oreLavorate: number;
  operatori: string[];
  materialiUsati?: string;
  noteCliente?: string;
  /** dataUrl del canvas di firma. */
  firmaCliente?: string;
  firmatoIl?: string;
}

export interface Commessa {
  id: string;
  /** CM-AAAA-NNNN, progressivo annuale generato dal service. */
  numero: string;
  /** Presente solo se la commessa nasce da un preventivo accettato. */
  preventivoId?: string;
  clienteId: string;
  luogoInterventoId: string;
  stato: StatoCommessa;
  dataPianificata?: string;
  dataInizio?: string;
  dataFine?: string;
  /** Ereditate dal preventivo, o stimate a mano se la commessa nasce da sola. */
  orePreviste: number;
  /** Derivato: somma delle ore reali delle lavorazioni. */
  oreReali: number;
  lavorazioni: Lavorazione[];
  fotoPrima: Foto[];
  fotoDopo: Foto[];
  rapportino?: Rapportino;
  /** Derivato: quota di lavorazioni completate, 0–100. */
  avanzamentoPct: number;
  note?: string;
  /** Valorizzato dalla chat D quando la commessa viene fatturata. */
  fatturaId?: string;
}

export interface CommessaFiltri {
  stato?: StatoCommessa;
  clienteId?: string;
  /** Cerca su numero, denominazione del cliente e etichetta del luogo. */
  q?: string;
  /** Finestra sulla data pianificata — la usa il calendario per chiedere il mese. */
  dal?: string;
  al?: string;
  pagina?: number;
  perPagina?: number;
}

export interface CommessaInput {
  clienteId: string;
  luogoInterventoId: string;
  preventivoId?: string;
  dataPianificata?: string;
  orePreviste: number;
  lavorazioni: Omit<Lavorazione, 'id'>[];
  note?: string;
}

/** Somma delle ore consuntivate. Le lavorazioni non ancora chiuse valgono zero:
 *  finché non sono spuntate, quelle ore non sono state fatte. */
export function oreRealiDa(lavorazioni: Lavorazione[]): number {
  return lavorazioni.reduce((tot, l) => tot + (l.oreReali ?? 0), 0);
}

/** Percentuale sul numero di lavorazioni, non sulle ore: una commessa con una
 *  lavorazione lunga e nove corte non deve stare al 90% dopo mezz'ora di lavoro. */
export function avanzamentoDa(lavorazioni: Lavorazione[]): number {
  if (lavorazioni.length === 0) return 0;
  const fatte = lavorazioni.filter((l) => l.completata).length;
  return Math.round((fatte / lavorazioni.length) * 100);
}

/** Positivo = si è sforato il previsto. Zero quando non c'è ancora niente di consuntivato. */
export function scostamentoOre(commessa: Pick<Commessa, 'orePreviste' | 'oreReali'>): number {
  if (commessa.oreReali === 0) return 0;
  return commessa.oreReali - commessa.orePreviste;
}

/**
 * La commessa con il cliente già risolto.
 *
 * Elenco e calendario devono mostrare la denominazione del cliente e l'etichetta
 * del luogo, e la ricerca deve trovarli. Risolverli nel componente vorrebbe dire
 * una query per riga, e sposterebbe il filtro fuori dal service — dove
 * CONVENTIONS §4 lo vuole, perché domani diventi un parametro di query invece
 * che un `.filter()` in pagina.
 *
 * I due campi sono stringhe e non l'oggetto `Cliente` intero: alla lista serve
 * il nome, non l'anagrafica, e portarsi dietro tutto renderebbe la cache di
 * react-query un secondo posto in cui i clienti invecchiano.
 */
export interface CommessaConCliente extends Commessa {
  clienteDenominazione: string;
  luogoEtichetta: string;
}
