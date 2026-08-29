import type { Indirizzo } from '@/types/comune';
import type {
  CategoriaCosto,
  Costo,
  CostoInput,
  Fornitore,
  FornitoreInput,
  Mezzo,
  TipoMezzo,
  TipoNoleggio,
} from '@/types/costo';

/**
 * Traduzione fra `costi` / `fornitori` / `mezzi` e i tipi dell'app.
 *
 * Tre disallineamenti che questo file riconcilia, e vale la pena saperli
 * perché non sono refusi:
 *
 *  1. **`litri` sta in `quantita` + `unita`.** La colonna è generica apposta:
 *     domani un costo si misurerà in ore di noleggio o in tonnellate conferite,
 *     e una colonna chiamata `litri` sarebbe già sbagliata. L'app espone
 *     `litri` perché oggi l'unico caso è il carburante.
 *  2. **`documento` è `numero_documento`** in tabella.
 *  3. **L'indirizzo del fornitore è spianato** in cinque colonne, come per i
 *     clienti; l'app lo tiene annidato.
 */

export interface RigaCosto {
  id: string;
  data: string;
  categoria: string;
  descrizione: string;
  importo: number | string;
  quantita: number | string | null;
  unita: string | null;
  fornitore_id: string | null;
  commessa_id: string | null;
  mezzo_id: string | null;
  tipo_noleggio: string | null;
  numero_documento: string | null;
  /** Valorizzate quando il costo nasce dalla registrazione di una fattura fornitore. */
  fattura_fornitore_id?: string | null;
  riga_fattura_id?: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Le colonne in più che arrivano da `v_costi`. */
export interface RigaCostoVista extends RigaCosto {
  fornitore_denominazione: string | null;
  mezzo_targa: string | null;
  commessa_numero: string | null;
}

export interface RigaFornitore {
  id: string;
  denominazione: string;
  partita_iva: string | null;
  categoria_prevalente: string | null;
  telefono: string | null;
  email: string | null;
  via: string | null;
  civico: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RigaMezzo {
  id: string;
  targa: string;
  descrizione: string;
  tipo: string;
  attivo: boolean;
}

const opt = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

/** `numeric` arriva come stringa da PostgREST: sommarla senza convertirla
 *  concatena invece di addizionare, e il riepilogo diventa un numero assurdo. */
export const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** L'unità con cui si registrano i rifornimenti. */
const UNITA_LITRI = 'l';

export function costoDaRiga(r: RigaCosto): Costo {
  return {
    id: r.id,
    data: r.data,
    categoria: r.categoria as CategoriaCosto,
    descrizione: r.descrizione,
    importo: num(r.importo),
    fornitoreId: opt(r.fornitore_id),
    mezzoId: opt(r.mezzo_id),
    tipoNoleggio: opt(r.tipo_noleggio) as TipoNoleggio | undefined,
    commessaId: opt(r.commessa_id),
    documento: opt(r.numero_documento),
    fatturaFornitoreId: opt(r.fattura_fornitore_id),
    rigaFatturaId: opt(r.riga_fattura_id),
    // I litri si leggono solo se l'unità è quella: una quantità in tonnellate
    // mostrata come litri sarebbe peggio di una quantità non mostrata.
    litri: r.unita === UNITA_LITRI && r.quantita != null ? num(r.quantita) : undefined,
    note: opt(r.note),
    creatoIl: r.created_at,
    aggiornatoIl: r.updated_at,
  };
}

export function rigaDaCosto(input: Partial<CostoInput>): Record<string, unknown> {
  const riga: Record<string, unknown> = {};

  if (input.data !== undefined) riga.data = input.data;
  if (input.categoria !== undefined) riga.categoria = input.categoria;
  if (input.descrizione !== undefined) riga.descrizione = input.descrizione;
  if (input.importo !== undefined) riga.importo = input.importo;
  if (input.fornitoreId !== undefined) riga.fornitore_id = input.fornitoreId ?? null;
  if (input.commessaId !== undefined) riga.commessa_id = input.commessaId ?? null;
  if (input.mezzoId !== undefined) riga.mezzo_id = input.mezzoId ?? null;
  if (input.tipoNoleggio !== undefined) riga.tipo_noleggio = input.tipoNoleggio ?? null;
  if (input.documento !== undefined) riga.numero_documento = input.documento ?? null;
  // Lo scrive solo la generazione automatica dalle fatture fornitore: il drawer
  // dei costi non lo tocca mai, o un costo inserito a mano risulterebbe nato da
  // un documento che non l'ha mai contenuto.
  if (input.fatturaFornitoreId !== undefined)
    riga.fattura_fornitore_id = input.fatturaFornitoreId ?? null;
  if (input.rigaFatturaId !== undefined) riga.riga_fattura_id = input.rigaFatturaId ?? null;
  if (input.note !== undefined) riga.note = input.note ?? null;

  if (input.litri !== undefined) {
    riga.quantita = input.litri ?? null;
    // L'unità si azzera insieme alla quantità: una `unita` senza `quantita`
    // è una riga che dice «litri» e non dice quanti.
    riga.unita = input.litri != null ? UNITA_LITRI : null;
  }

  return riga;
}

export function fornitoreDaRiga(r: RigaFornitore): Fornitore {
  const indirizzo: Indirizzo = {
    via: r.via ?? '',
    civico: r.civico ?? '',
    cap: r.cap ?? '',
    comune: r.comune ?? '',
    provincia: r.provincia ?? '',
  };

  return {
    id: r.id,
    denominazione: r.denominazione,
    partitaIva: opt(r.partita_iva),
    categoriaPrevalente: opt(r.categoria_prevalente) as CategoriaCosto | undefined,
    telefono: opt(r.telefono),
    email: opt(r.email),
    // Le colonne non sono mai NULL ma possono essere tutte vuote: in quel caso
    // l'indirizzo non c'è, e mostrarne uno fatto di cinque stringhe vuote
    // darebbe una card di trattini al posto di un'assenza onesta.
    indirizzo: indirizzo.via || indirizzo.comune ? indirizzo : undefined,
    note: opt(r.note),
    creatoIl: r.created_at,
    aggiornatoIl: r.updated_at,
  };
}

export function rigaDaFornitore(input: Partial<FornitoreInput>): Record<string, unknown> {
  const riga: Record<string, unknown> = {};

  if (input.denominazione !== undefined) riga.denominazione = input.denominazione;
  if (input.partitaIva !== undefined) riga.partita_iva = input.partitaIva ?? null;
  if (input.categoriaPrevalente !== undefined)
    riga.categoria_prevalente = input.categoriaPrevalente ?? null;
  if (input.telefono !== undefined) riga.telefono = input.telefono ?? null;
  if (input.email !== undefined) riga.email = input.email ?? null;
  if (input.note !== undefined) riga.note = input.note ?? null;

  if (input.indirizzo !== undefined) {
    // Le colonne sono `not null default ''`: si scrive la stringa vuota, non NULL.
    riga.via = input.indirizzo?.via ?? '';
    riga.civico = input.indirizzo?.civico ?? '';
    riga.cap = input.indirizzo?.cap ?? '';
    riga.comune = input.indirizzo?.comune ?? '';
    riga.provincia = input.indirizzo?.provincia ?? '';
  }

  return riga;
}

export function mezzoDaRiga(r: RigaMezzo): Mezzo {
  return {
    id: r.id,
    targa: r.targa,
    descrizione: r.descrizione,
    tipo: r.tipo as TipoMezzo,
    attivo: r.attivo,
  };
}
