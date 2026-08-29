import type {
  DatiFatturaElettronica,
  FatturaFornitore,
  FatturaFornitoreInput,
  Pagamento,
  RigaFatturaFornitore,
} from '@/types/fatturaFornitore';
import { calcolaTotaliFattura } from '@/types/fatturaFornitore';
import type { CategoriaCosto, TipoNoleggio } from '@/types/costo';
import { num } from './costiMapper';

/**
 * Traduzione fra `v_fatture_fornitore` / `fatture_fornitore` e i tipi dell'app.
 *
 * Stesso patto degli altri mapper: il DB parla snake_case, l'app camelCase, e
 * la traduzione sta qui perché quando una colonna cambia nome si tocchi un file
 * solo. Righe e pagamenti stanno in JSONB, quindi la loro forma non è garantita
 * dallo schema: la difende questo file, non un CHECK.
 */

/** La riga come arriva dalla vista. I campi derivati esistono solo lì. */
export interface RigaFatturaFornitoreDb {
  id: string;
  numero: string;
  fornitore_id: string;
  data_documento: string;
  data_ricezione: string;
  data_scadenza: string | null;
  stato: string;
  righe: unknown;
  pagamenti: unknown;
  imponibile: number | string | null;
  iva: number | string | null;
  totale: number | string | null;
  dati_fe: unknown;
  note: string | null;
  created_at: string;
  updated_at: string;

  // ── Solo dalla vista ──────────────────────────────────────────────────────
  pagato?: number | string | null;
  residuo?: number | string | null;
  costi_generati?: number | string | null;
  stato_effettivo?: string | null;
  fornitore_denominazione?: string | null;
  fornitore_partita_iva?: string | null;
  giorni_di_ritardo_ricezione?: number | string | null;
}

const opt = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

/**
 * Le righe dal JSONB.
 *
 * Gli importi NON si leggono da lì: si ricalcolano da quantità per prezzo, come
 * ovunque nel progetto. Un importo salvato accanto ai suoi fattori è un secondo
 * posto in cui il numero può sbagliare, e quello sbagliato sarebbe proprio
 * quello stampato accanto al totale.
 */
export function righeDaJson(v: unknown): RigaFatturaFornitore[] {
  if (!Array.isArray(v)) return [];
  return v.map((x, i) => {
    const r = x as Partial<RigaFatturaFornitore>;
    return {
      id: r.id ?? `riga-${i + 1}`,
      descrizione: r.descrizione ?? '',
      quantita: num(r.quantita),
      prezzoUnitario: num(r.prezzoUnitario),
      aliquotaIva: num(r.aliquotaIva),
      categoria: (r.categoria ?? 'altro') as CategoriaCosto,
      mezzoId: opt(r.mezzoId),
      tipoNoleggio: opt(r.tipoNoleggio) as TipoNoleggio | undefined,
      commessaId: opt(r.commessaId),
      litri: r.litri != null ? num(r.litri) : undefined,
    };
  });
}

export function pagamentiDaJson(v: unknown): Pagamento[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x, i) => {
      const p = x as Partial<Pagamento>;
      return {
        id: p.id ?? `pag-${i + 1}`,
        data: p.data ?? '',
        importo: num(p.importo),
        metodo: (p.metodo ?? 'bonifico') as Pagamento['metodo'],
        riferimento: opt(p.riferimento),
      };
    })
    // Il più recente in cima: è quello di cui si sta parlando quando si apre la
    // scheda per capire se un pagamento è partito.
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function fatturaFornitoreDaRiga(r: RigaFatturaFornitoreDb): FatturaFornitore {
  const righe = righeDaJson(r.righe);
  const pagamenti = pagamentiDaJson(r.pagamenti);

  // I totali si ricalcolano dalle righe invece di leggere le colonne
  // denormalizzate: quelle servono al database per ordinare e filtrare senza
  // sommare un JSONB per riga, ma la verità sono le righe.
  const { imponibile, iva, totale } = calcolaTotaliFattura(righe);
  const pagato = num(r.pagato);

  return {
    id: r.id,
    numero: r.numero,
    fornitoreId: r.fornitore_id,
    fornitoreDenominazione: opt(r.fornitore_denominazione),
    fornitorePartitaIva: opt(r.fornitore_partita_iva),

    dataDocumento: r.data_documento,
    dataRicezione: r.data_ricezione,
    dataScadenza: opt(r.data_scadenza),

    stato: (r.stato as FatturaFornitore['stato']) ?? 'bozza',
    righe,
    pagamenti,

    imponibile,
    iva,
    totale,

    pagato,
    // Il residuo si ricalcola sul totale ricalcolato: prenderlo dalla vista
    // vorrebbe dire mescolare un totale letto dal DB con uno derivato dalle
    // righe, e su una fattura con le colonne non riallineate i due numeri
    // racconterebbero storie diverse nella stessa schermata.
    residuo: Math.round((totale - pagato) * 100) / 100,
    costiGenerati: Math.trunc(num(r.costi_generati)),
    giorniRitardoRicezione:
      r.giorni_di_ritardo_ricezione != null ? Math.trunc(num(r.giorni_di_ritardo_ricezione)) : undefined,

    datiFe: (r.dati_fe as DatiFatturaElettronica | null) ?? undefined,
    note: opt(r.note),
    creatoIl: r.created_at,
    aggiornatoIl: r.updated_at,
  };
}

/** Stringa vuota → NULL: una data a `''` non è una date valida per Postgres. */
const vuotoANull = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
};

/**
 * Dall'app al database.
 *
 * Solo i campi presenti finiscono nell'oggetto: `undefined` significa «non
 * toccare questa colonna», e mandarla comunque a `null` cancellerebbe dati che
 * nessuno ha chiesto di cancellare.
 */
export function rigaDaFatturaFornitore(
  f: Partial<FatturaFornitoreInput>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (f.numero !== undefined) out.numero = f.numero.trim();
  if (f.fornitoreId !== undefined) out.fornitore_id = f.fornitoreId;
  if (f.dataDocumento !== undefined) out.data_documento = f.dataDocumento;
  if (f.dataRicezione !== undefined) out.data_ricezione = f.dataRicezione;
  if (f.dataScadenza !== undefined) out.data_scadenza = vuotoANull(f.dataScadenza);
  if (f.note !== undefined) out.note = vuotoANull(f.note);
  if (f.datiFe !== undefined) out.dati_fe = f.datiFe ?? null;

  if (f.righe !== undefined) {
    const righe = f.righe.map((r, i) => ({
      id: r.id ?? `riga-${i + 1}`,
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      aliquotaIva: r.aliquotaIva,
      categoria: r.categoria,
      mezzoId: r.mezzoId ?? null,
      tipoNoleggio: r.tipoNoleggio ?? null,
      commessaId: r.commessaId ?? null,
      litri: r.litri ?? null,
    }));
    out.righe = righe;

    // Le colonne denormalizzate si riscrivono insieme alle righe, o l'elenco
    // ordinerebbe per un totale vecchio mentre la scheda ne mostra uno nuovo.
    const { imponibile, iva, totale } = calcolaTotaliFattura(
      righe.map((r) => ({
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        aliquotaIva: r.aliquotaIva,
      })),
    );
    out.imponibile = imponibile;
    out.iva = iva;
    out.totale = totale;
  }

  return out;
}

/** I pagamenti tornano in JSONB così come sono: sono già la forma dell'app. */
export function pagamentiPerDb(pagamenti: Pagamento[]): Record<string, unknown>[] {
  return pagamenti.map((p) => ({
    id: p.id,
    data: p.data,
    importo: p.importo,
    metodo: p.metodo,
    riferimento: p.riferimento ?? null,
  }));
}
