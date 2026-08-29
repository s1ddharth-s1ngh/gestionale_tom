import type {
  DatiFatturazioneElettronica,
  Fattura,
  FatturaInput,
  Incasso,
  RigaFattura,
  Sollecito,
  StatoFattura,
  TipoFattura,
} from '@/types/fattura';
import { imponibileFattura, ivaFattura, totaleFattura } from '@/types/fattura';

/**
 * Traduzione fra le righe di `fatture` / `v_fatture` e i tipi dell'app.
 *
 * Due differenze fra database e app che questo file riconcilia:
 *
 *  1. **`stato` significa due cose diverse.** In tabella è solo la decisione di
 *     una persona (`bozza` o `emessa`); lo stato vero — pagata, parziale,
 *     scaduta — lo calcola la vista `v_fatture` dagli incassi. Nell'app il tipo
 *     `Fattura` non ha affatto un campo `stato`: c'è o non c'è `dataEmissione`.
 *     Qui si converte fra le due forme.
 *  2. **Imponibile, IVA e totale sono colonne** e non derivati: PostgREST non
 *     calcola, e lo scadenzario ordina e somma su quelle colonne. Si
 *     ricalcolano a ogni scrittura con le stesse funzioni che usa la UI, o le
 *     due verità divergono al primo salvataggio.
 */

export interface RigaFatturaDb {
  id: string;
  numero: string;
  tipo: string;
  cliente_id: string;
  commessa_id: string | null;
  stato: string;
  data_emissione: string | null;
  data_scadenza: string | null;
  righe: RigaFattura[] | null;
  incassi: Incasso[] | null;
  solleciti: Sollecito[] | null;
  imponibile: number | string;
  iva: number | string;
  totale: number | string;
  dati_fe: DatiFatturazioneElettronica | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Le colonne in più che arrivano dalla vista, mai dalla tabella. */
export interface RigaFatturaVista extends RigaFatturaDb {
  incassato: number | string;
  residuo: number | string;
  stato_effettivo: string;
  cliente_denominazione: string;
}

const opt = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

/** `numeric` arriva come stringa da PostgREST: sommarla senza convertirla
 *  concatena invece di addizionare, ed è un bug che si vede solo coi totali. */
export const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function fatturaDaRiga(r: RigaFatturaDb): Fattura {
  return {
    id: r.id,
    numero: r.numero,
    tipo: r.tipo as TipoFattura,
    clienteId: r.cliente_id,
    commessaId: opt(r.commessa_id),
    dataEmissione: opt(r.data_emissione),
    dataScadenza: opt(r.data_scadenza),
    righe: r.righe ?? [],
    incassi: r.incassi ?? [],
    solleciti: r.solleciti ?? [],
    datiFE: opt(r.dati_fe),
    note: opt(r.note),
    creataIl: r.created_at,
    aggiornataIl: r.updated_at,
  };
}

/**
 * Lo stato che la vista ha già calcolato: non si ricalcola in TypeScript.
 *
 * Averlo dal database significa che l'ordinamento e i filtri lo vedono, e che
 * una fattura scaduta è scaduta per la stessa regola in ogni schermata.
 */
export function statoDaVista(r: RigaFatturaVista): StatoFattura {
  const valido: StatoFattura[] = ['bozza', 'emessa', 'pagata_parziale', 'pagata', 'scaduta'];
  const s = r.stato_effettivo as StatoFattura;
  return valido.includes(s) ? s : 'bozza';
}

/** I campi scrivibili. `stato` non si passa mai dall'esterno: lo decide la
 *  presenza della data di emissione, che è l'unico fatto che qualcuno compie. */
export function rigaDaFattura(input: Partial<FatturaInput> & { numero?: string }): Record<string, unknown> {
  const riga: Record<string, unknown> = {};

  if (input.numero !== undefined) riga.numero = input.numero;
  if (input.tipo !== undefined) riga.tipo = input.tipo;
  if (input.clienteId !== undefined) riga.cliente_id = input.clienteId;
  if (input.commessaId !== undefined) riga.commessa_id = input.commessaId ?? null;
  if (input.dataScadenza !== undefined) riga.data_scadenza = input.dataScadenza ?? null;
  if (input.datiFE !== undefined) riga.dati_fe = input.datiFE ?? null;
  if (input.note !== undefined) riga.note = input.note ?? null;

  if (input.dataEmissione !== undefined) {
    riga.data_emissione = input.dataEmissione ?? null;
    // Il vincolo `chk_emessa` rifiuta una emessa senza date: qui i due campi
    // si muovono insieme, così non si può scriverne uno solo.
    riga.stato = input.dataEmissione ? 'emessa' : 'bozza';
  }

  if (input.righe !== undefined) {
    const righe = conIdRighe(input.righe);
    riga.righe = righe;
    riga.imponibile = imponibileFattura(righe);
    riga.iva = ivaFattura(righe);
    riga.totale = totaleFattura(righe);
  }

  return riga;
}

/** Gli id delle righe li mette l'app: dentro un `jsonb` il database non ha
 *  chiavi da generare, e senza id React rimonterebbe ogni riga a ogni modifica. */
export function conIdRighe(righe: (Omit<RigaFattura, 'id'> & { id?: string })[]): RigaFattura[] {
  return righe.map((r, i) => ({
    ...r,
    id: r.id ?? `r${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}
