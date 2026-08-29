import type {
  Commessa,
  CommessaConCliente,
  CommessaInput,
  Lavorazione,
  Rapportino,
  StatoCommessa,
} from '@/types/commessa';
import type { Foto } from '@/types/comune';

/**
 * Traduzione fra le righe di `commesse` e i tipi dell'app.
 *
 * Stesso schema del mapper dei clienti: il database parla snake_case, l'app
 * camelCase, e la traduzione vive in un file solo — quando una colonna cambia
 * nome si tocca qui e si vede subito cosa resta scoperto.
 *
 * Lavorazioni, foto e rapportino sono JSONB e viaggiano già in camelCase: sono
 * documenti che vivono solo dentro la commessa, e riscriverli chiave per chiave
 * sarebbe lavoro per un formato che nessun'altra query interroga.
 */

/** La riga di `commesse` come arriva da PostgREST, con gli embed della lista. */
export interface RigaCommessa {
  id: string;
  numero: string;
  preventivo_id: string | null;
  cliente_id: string;
  luogo_intervento_id: string | null;
  stato: string;
  data_pianificata: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  ore_previste: number | string;
  ore_reali: number | string;
  avanzamento_pct: number | string;
  lavorazioni: Lavorazione[] | null;
  foto_prima: Foto[] | null;
  foto_dopo: Foto[] | null;
  rapportino: Rapportino | null;
  note: string | null;
  fattura_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  /** Embed: `clienti(denominazione)`. Singolo, perché la FK è a uno. */
  clienti?: { denominazione: string } | null;
  /** Embed: `luoghi_intervento(etichetta)`. */
  luoghi_intervento?: { etichetta: string } | null;
}

const opt = (v: string | null | undefined): string | undefined => v ?? undefined;

/**
 * `numeric` torna da PostgREST come stringa, non come number.
 *
 * È il tranello di questa migrazione: `'12.50' > 8` in JavaScript è `false`, e
 * un confronto di ore fatto sulla stringa darebbe scostamenti sbagliati senza
 * sollevare nessun errore. Ogni numeric passa di qui.
 */
const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? (n as number) : 0;
};

export function commessaDaRiga(r: RigaCommessa): Commessa {
  return {
    id: r.id,
    numero: r.numero,
    preventivoId: opt(r.preventivo_id),
    clienteId: r.cliente_id,
    // La colonna è nullable nello schema, il tipo dell'app no: una commessa
    // senza luogo esiste solo se qualcuno ha cancellato l'indirizzo, e la
    // stringa vuota lo rende visibile invece di far esplodere la scheda.
    luogoInterventoId: r.luogo_intervento_id ?? '',
    stato: r.stato as StatoCommessa,
    dataPianificata: opt(r.data_pianificata),
    dataInizio: opt(r.data_inizio),
    dataFine: opt(r.data_fine),
    orePreviste: num(r.ore_previste),
    oreReali: num(r.ore_reali),
    lavorazioni: (r.lavorazioni ?? []).map(lavorazioneDaJson),
    fotoPrima: r.foto_prima ?? [],
    fotoDopo: r.foto_dopo ?? [],
    rapportino: r.rapportino ?? undefined,
    avanzamentoPct: num(r.avanzamento_pct),
    note: opt(r.note),
    fatturaId: opt(r.fattura_id),
  };
}

/**
 * Le ore dentro il JSONB possono essere arrivate come stringa da un insert
 * fatto a mano in SQL: si normalizzano qui, o il totale delle lavorazioni
 * diventa una concatenazione di testo invece di una somma.
 */
function lavorazioneDaJson(l: Lavorazione): Lavorazione {
  return {
    id: l.id,
    descrizione: l.descrizione,
    orePreviste: num(l.orePreviste),
    oreReali: l.oreReali === undefined || l.oreReali === null ? undefined : num(l.oreReali),
    completata: !!l.completata,
  };
}

/** La commessa con cliente e luogo già risolti, per elenco e calendario. */
export function commessaConClienteDaRiga(r: RigaCommessa): CommessaConCliente {
  return {
    ...commessaDaRiga(r),
    // Il fallback sull'id non è pigrizia: una commessa il cui cliente è sparito
    // deve restare leggibile e dire quale riferimento ha perso, non svuotare
    // una cella senza spiegazioni.
    clienteDenominazione: r.clienti?.denominazione ?? r.cliente_id,
    luogoEtichetta: r.luoghi_intervento?.etichetta ?? '—',
  };
}

const vuotoANull = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
};

/**
 * Dall'app al database.
 *
 * Non scrive MAI `ore_reali` né `avanzamento_pct`: li calcola il trigger
 * `commesse_ricalcola_derivati` dalle lavorazioni. Mandarli dal client
 * significherebbe che il database si fida di un numero che il client ha
 * dedotto, e i due divergono al primo salvataggio andato storto a metà.
 */
export function rigaDaCommessa(c: Partial<CommessaInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (c.clienteId !== undefined) out.cliente_id = c.clienteId;
  if (c.luogoInterventoId !== undefined) out.luogo_intervento_id = c.luogoInterventoId || null;
  if (c.preventivoId !== undefined) out.preventivo_id = c.preventivoId || null;
  if (c.dataPianificata !== undefined) out.data_pianificata = vuotoANull(c.dataPianificata);
  if (c.orePreviste !== undefined) out.ore_previste = c.orePreviste;
  if (c.note !== undefined) out.note = vuotoANull(c.note);
  if (c.lavorazioni !== undefined) out.lavorazioni = c.lavorazioni;

  return out;
}
