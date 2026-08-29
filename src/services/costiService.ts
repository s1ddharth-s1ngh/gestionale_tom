import { supabase } from '@/lib/supabase';
import { PER_PAGINA_DEFAULT, type Paginato } from '@/types/comune';
import type {
  CategoriaCosto,
  Costo,
  CostoFiltri,
  CostoInput,
  Mezzo,
  RiepilogoVoce,
} from '@/types/costo';
import { categoriaCostoLabel, riepiloga } from '@/types/costo';
import {
  costoDaRiga,
  mezzoDaRiga,
  num,
  rigaDaCosto,
  type RigaCosto,
  type RigaCostoVista,
  type RigaMezzo,
} from './costiMapper';

/**
 * Accesso ai dati dei costi — su Supabase.
 *
 * Si legge da `v_costi`, che porta già dentro la denominazione del fornitore,
 * la targa del mezzo e il numero della commessa: senza la vista servirebbero
 * tre join scritte a mano in ogni query, o tre giri in più per mostrare una
 * riga di tabella.
 *
 * Due vincoli li impone il database e non il form: `chk_carburante_ha_mezzo` e
 * `chk_noleggio_ha_tipo`. Lo schema zod del drawer li anticipa per dare un
 * messaggio decente, ma se una riga arrivasse da un import o da una
 * correzione SQL il database la rifiuterebbe lo stesso — che è il punto.
 */

const VISTA = 'v_costi';
const TABELLA = 'costi';

/** PostgREST cappa a 1000 righe. I riepiloghi aggregano in TypeScript su
 *  questo tetto: con più costi di così l'aggregazione va spostata in una vista
 *  o in una RPC, e il posto dove accorgersene è questo commento. */
const MAX_SELECT = 1000;

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

/** Il costo come lo vuole la tabella: fornitore, mezzo e commessa già risolti. */
export interface CostoArricchito extends Costo {
  fornitoreDenominazione?: string;
  mezzoTarga?: string;
  mezzoDescrizione?: string;
  commessaNumero?: string;
}

function daVista(r: RigaCostoVista): CostoArricchito {
  return {
    ...costoDaRiga(r),
    fornitoreDenominazione: r.fornitore_denominazione ?? undefined,
    mezzoTarga: r.mezzo_targa ?? undefined,
    commessaNumero: r.commessa_numero ?? undefined,
  };
}

/**
 * Il minimo che serve per applicare i filtri: i metodi di PostgREST tornano
 * `this`, quindi basta descriverli così invece di inseguire il tipo generico
 * del builder — che cambia forma a ogni `select()` diverso e farebbe esplodere
 * l'inferenza.
 */
interface Filtrabile {
  eq(colonna: string, valore: unknown): Filtrabile;
  is(colonna: string, valore: null): Filtrabile;
  not(colonna: string, operatore: string, valore: null): Filtrabile;
  gte(colonna: string, valore: string): Filtrabile;
  lte(colonna: string, valore: string): Filtrabile;
  or(filtro: string): Filtrabile;
}

/**
 * Il pezzo di builder che serve dopo i filtri.
 *
 * Descritto a mano come `Filtrabile`, e per lo stesso motivo: il tipo generato
 * da PostgREST per una vista è così profondo che TypeScript si arrende
 * (TS2589) appena lo si concatena. Le firme qui sono quelle vere, il
 * comportamento a runtime non cambia di una virgola.
 */
interface Ordinabile {
  order(colonna: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): Ordinabile;
  range(
    da: number,
    a: number,
  ): PromiseLike<{ data: unknown[] | null; error: { message: string } | null; count: number | null }>;
}

/** Applica i filtri comuni a lista e riepiloghi: scritti una volta sola, o la
 *  tabella e le barre sotto finiscono per guardare due insiemi diversi. */
function conFiltri(q: Filtrabile, filtri?: CostoFiltri): Filtrabile {
  let out: Filtrabile = q;
  // Il cast finale è l'unico punto sporco: PostgREST torna sempre lo stesso
  // builder, ma il suo tipo generico cambia a ogni `select()` diverso e
  // inseguirlo qui fa esplodere l'inferenza (TS2589).

  if (filtri?.categoria) out = out.eq('categoria', filtri.categoria);
  if (filtri?.fornitoreId) out = out.eq('fornitore_id', filtri.fornitoreId);
  if (filtri?.mezzoId) out = out.eq('mezzo_id', filtri.mezzoId);
  if (filtri?.commessaId) out = out.eq('commessa_id', filtri.commessaId);
  if (filtri?.imputazione === 'imputati') out = out.not('commessa_id', 'is', null);
  if (filtri?.imputazione === 'generali') out = out.is('commessa_id', null);
  if (filtri?.dal) out = out.gte('data', filtri.dal);
  if (filtri?.al) out = out.lte('data', filtri.al);

  const termine = filtri?.q?.trim();
  if (termine) {
    // Virgole e parentesi spezzerebbero la sintassi di `or()`.
    const t = termine.replace(/[,()]/g, ' ');
    out = out.or(
      [
        `descrizione.ilike.%${t}%`,
        `numero_documento.ilike.%${t}%`,
        `note.ilike.%${t}%`,
        `fornitore_denominazione.ilike.%${t}%`,
        `mezzo_targa.ilike.%${t}%`,
      ].join(','),
    );
  }

  return out;
}

export const costiService = {
  async list(filtri?: CostoFiltri): Promise<Paginato<CostoArricchito>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    const base = supabase.from(VISTA).select('*', { count: 'exact' });
    const q = (conFiltri(base, filtri) as unknown as Ordinabile)
      // Dal più recente: i costi si consultano per controllare quello che si è
      // appena registrato, non per leggere la storia dall'inizio.
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .range(da, da + perPagina - 1);

    const { data, error, count } = await q;
    esplodi('Lettura costi', error);

    return {
      righe: ((data ?? []) as unknown as RigaCostoVista[]).map(daVista),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<CostoArricchito | null> {
    const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).maybeSingle();
    esplodi('Lettura costo', error);
    return data ? daVista(data as unknown as RigaCostoVista) : null;
  },

  /** I costi di un fornitore, per la sua scheda. */
  async listPerFornitore(fornitoreId: string): Promise<CostoArricchito[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .eq('fornitore_id', fornitoreId)
      .order('data', { ascending: false })
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura costi del fornitore', error);
    return ((data ?? []) as unknown as RigaCostoVista[]).map(daVista);
  },

  /** I costi imputati a una commessa: serve al report di marginalità futuro,
   *  e intanto alla scheda della commessa. */
  async listPerCommessa(commessaId: string): Promise<CostoArricchito[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .eq('commessa_id', commessaId)
      .order('data', { ascending: false })
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura costi della commessa', error);
    return ((data ?? []) as unknown as RigaCostoVista[]).map(daVista);
  },

  async contaPerCategoria(): Promise<Record<CategoriaCosto | 'tutte', number>> {
    const { data, error } = await supabase.from(VISTA).select('categoria').range(0, MAX_SELECT - 1);
    esplodi('Conteggio costi', error);

    const righe = (data ?? []) as { categoria: CategoriaCosto }[];
    const conta: Record<CategoriaCosto | 'tutte', number> = {
      tutte: righe.length,
      carburante: 0,
      materiali: 0,
      noleggio: 0,
      smaltimento: 0,
      manutenzione: 0,
      assicurazione: 0,
      personale: 0,
      altro: 0,
    };
    for (const r of righe) if (r.categoria in conta) conta[r.categoria] += 1;
    return conta;
  },

  /**
   * Riepilogo per categoria, sugli stessi filtri della tabella.
   *
   * Somma l'imponibile — che è l'unico importo che il database conserva,
   * perché l'IVA sugli acquisti si detrae e non è un costo.
   */
  async riepilogoPerCategoria(filtri?: CostoFiltri): Promise<RiepilogoVoce[]> {
    // `select('*')` e non le due colonne che servono: il parser dei tipi di
    // PostgREST, su una select stretta di una vista, esplode in ricorsione
    // (TS2589). Le righe sono le stesse, arrivano solo con più colonne.
    const base = supabase.from(VISTA).select('*');
    const { data, error } = await (conFiltri(base, filtri) as unknown as Ordinabile).range(
      0,
      MAX_SELECT - 1,
    );
    esplodi('Riepilogo costi per categoria', error);

    const righe = (data ?? []) as { categoria: CategoriaCosto; importo: number | string }[];
    return riepiloga(
      righe,
      (c) => c.categoria,
      (chiave) => categoriaCostoLabel(chiave as CategoriaCosto),
      (c) => num(c.importo),
    );
  },

  /**
   * Riepilogo per mezzo. I costi senza mezzo restano fuori: un «non assegnato»
   * in cima alla classifica non risponde alla domanda che si fa aprendo questo
   * riquadro, che è quale mezzo stia costando troppo.
   */
  async riepilogoPerMezzo(filtri?: CostoFiltri): Promise<RiepilogoVoce[]> {
    const base = supabase.from(VISTA).select('*');
    const { data, error } = await (
      conFiltri(base, filtri).not('mezzo_id', 'is', null) as unknown as Ordinabile
    ).range(0, MAX_SELECT - 1);
    esplodi('Riepilogo costi per mezzo', error);

    const righe = (data ?? []) as {
      mezzo_id: string;
      mezzo_targa: string | null;
      importo: number | string;
    }[];

    const targhe = new Map(righe.map((r) => [r.mezzo_id, r.mezzo_targa ?? r.mezzo_id]));

    return riepiloga(
      righe,
      (c) => c.mezzo_id,
      (chiave) => targhe.get(chiave) ?? chiave,
      (c) => num(c.importo),
    );
  },

  /** L'anagrafica dei mezzi. Vive qui perché il modulo mezzi vero non c'è
   *  ancora, e un service da tre righe per sei record sarebbe solo più codice
   *  da spostare il giorno che arriva. */
  async listMezzi(soloAttivi = true): Promise<Mezzo[]> {
    let q = supabase.from('mezzi').select('*').is('deleted_at', null);
    if (soloAttivi) q = q.eq('attivo', true);

    const { data, error } = await q.order('targa').range(0, MAX_SELECT - 1);
    esplodi('Lettura mezzi', error);
    return ((data ?? []) as unknown as RigaMezzo[]).map(mezzoDaRiga);
  },

  async create(input: CostoInput): Promise<Costo> {
    const { data, error } = await supabase
      .from(TABELLA)
      .insert(rigaDaCosto(input))
      .select('*')
      .single();
    esplodi('Creazione costo', spiega(error));
    return costoDaRiga(data as unknown as RigaCosto);
  },

  async update(id: string, patch: Partial<CostoInput>): Promise<Costo> {
    const riga = rigaDaCosto(patch);
    if (Object.keys(riga).length === 0) {
      const attuale = await costiService.getById(id);
      if (!attuale) throw new Error('Costo non trovato');
      return attuale;
    }

    const { data, error } = await supabase
      .from(TABELLA)
      .update(riga)
      .eq('id', id)
      .select('*')
      .single();
    esplodi('Aggiornamento costo', spiega(error));
    return costoDaRiga(data as unknown as RigaCosto);
  },

  /** Soft-delete: la riga resta, esce dalle query e dalla vista. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLA)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Cancellazione costo', error);
  },
};

/**
 * Traduce i due CHECK del database in italiano.
 *
 * «new row violates check constraint "chk_carburante_ha_mezzo"» è corretto e
 * non dice niente a chi sta compilando un form: il messaggio che serve è quale
 * campo manca.
 */
function spiega(error: { message: string } | null): { message: string } | null {
  if (!error) return null;
  if (error.message.includes('chk_carburante_ha_mezzo')) {
    return { message: 'per il carburante il mezzo è obbligatorio' };
  }
  if (error.message.includes('chk_noleggio_ha_tipo')) {
    return { message: 'per un noleggio serve indicare che cosa si è noleggiato' };
  }
  return error;
}
