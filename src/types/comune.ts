/**
 * I tipi che attraversano i moduli. docs/lavori/A-fondazione-clienti-dashboard.md §3.
 *
 * È il contratto su cui costruiscono tutte e quattro le chat: sta qui e non
 * dentro un modulo perché nessuno dei quattro lo possiede, e perché quattro
 * definizioni diverse di "indirizzo" sarebbero quattro form diversi.
 *
 * Chiuso: non si modifica senza parlarne con Omar.
 */

/** Un indirizzo italiano. Il paese non c'è: Tom lavora in Italia. */
export interface Indirizzo {
  via: string;
  civico: string;
  cap: string;
  comune: string;
  /** Sigla di due lettere, maiuscola: "BO", "MO". */
  provincia: string;
}

export const INDIRIZZO_VUOTO: Indirizzo = {
  via: '',
  civico: '',
  cap: '',
  comune: '',
  provincia: '',
};

/** "Via Battisti 14, 40123 Bologna (BO)" — su una riga sola, per le tabelle. */
export function indirizzoInRiga(a: Indirizzo | null | undefined): string {
  if (!a) return '—';
  const strada = [a.via, a.civico].filter(Boolean).join(' ');
  const citta = [a.cap, a.comune].filter(Boolean).join(' ');
  const prov = a.provincia ? `(${a.provincia})` : '';
  const testo = [strada, [citta, prov].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return testo || '—';
}

/**
 * Una foto di sopralluogo o di cantiere.
 *
 * `dataUrl` e non un URL remoto: senza backend le immagini vivono nel mock, e
 * un URL esterno offline diventa un riquadro rotto — le schermate sembrano
 * sbagliate quando invece funzionano. Il giorno che c'è uno storage vero questo
 * campo diventa il suo URL e non cambia nient'altro.
 */
export interface Foto {
  id: string;
  dataUrl: string;
  didascalia?: string;
  /** ISO 8601. */
  caricataIl: string;
}

/**
 * La forma di ritorno di OGNI `list()` dei service.
 *
 * Fissata qui perché quattro service che tornano quattro forme diverse
 * significano quattro liste scritte in quattro modi. Il filtro e la
 * paginazione stanno nel service, non nel componente: è così che domani
 * diventano parametri di una query senza riscrivere le pagine.
 */
export interface Paginato<T> {
  righe: T[];
  /** Totale dopo i filtri, non il totale dell'archivio: serve alla paginazione. */
  totale: number;
  pagina: number;
  perPagina: number;
}

/** Parametri di paginazione e ordinamento comuni a tutti i filtri. */
export interface FiltriBase {
  /** 1-based, come la mostra la UI. */
  pagina?: number;
  perPagina?: number;
  ordinaPer?: string;
  ordine?: 'asc' | 'desc';
  /** Termine di ricerca libero. Ogni service decide su quali campi cercare. */
  q?: string;
}

export const PER_PAGINA_DEFAULT = 20;

/**
 * Impagina un array già filtrato e ordinato. Sta qui perché la fanno tutti i
 * service allo stesso modo, e perché il `Math.max(1, …)` sulle pagine totali
 * evita lo "0 di 0" quando il filtro non trova niente.
 */
export function impagina<T>(righe: T[], filtri?: FiltriBase): Paginato<T> {
  const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
  const pagina = Math.max(1, filtri?.pagina ?? 1);
  const da = (pagina - 1) * perPagina;
  return {
    righe: righe.slice(da, da + perPagina),
    totale: righe.length,
    pagina,
    perPagina,
  };
}

/**
 * Latenza finta dei service. Senza, gli stati di caricamento non si vedono mai
 * e restano non testati: si scoprono rotti il giorno del backend vero.
 */
export function ritardo(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
