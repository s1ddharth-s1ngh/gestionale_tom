import { supabase } from '@/lib/supabase';
import { PER_PAGINA_DEFAULT, type FiltriBase, type Paginato } from '@/types/comune';
import type { CategoriaCosto, Fornitore, FornitoreInput } from '@/types/costo';
import {
  fornitoreDaRiga,
  num,
  rigaDaFornitore,
  type RigaFornitore,
} from './costiMapper';

/**
 * Accesso ai dati dei fornitori — su Supabase.
 *
 * Anagrafica piccola e stabile: nessun ciclo di vita, nessuno stato derivato.
 * L'unica cosa che vale la pena calcolare è quanto si è speso da ciascuno, ed è
 * il motivo per cui l'elenco esiste come pagina invece che come tendina.
 */

const TABELLA = 'fornitori';
const MAX_SELECT = 1000;

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

export interface FornitoreConTotale extends Fornitore {
  /** Imponibile speso da questo fornitore, su tutto lo storico. */
  totaleSpeso: number;
  numeroCosti: number;
  /** Data dell'ultimo costo, `undefined` se non gli si è mai comprato niente. */
  ultimoCosto?: string;
}

export interface FornitoreFiltri extends FiltriBase {
  categoria?: CategoriaCosto;
}

/**
 * I totali di tutti i fornitori in **una** query, non una per fornitore.
 *
 * Venti fornitori mostrati significherebbero ventuno viaggi di rete e una
 * pagina che si popola a scatti. Qui si leggono i costi una volta e si somma
 * in memoria: sopra `MAX_SELECT` righe questa aggregazione va spostata in una
 * vista, ed è il posto dove accorgersene.
 */
async function totaliPerFornitore(): Promise<Map<string, { totale: number; conteggio: number; ultimo?: string }>> {
  const { data, error } = await supabase
    .from('costi')
    .select('fornitore_id, importo, data')
    .not('fornitore_id', 'is', null)
    .is('deleted_at', null)
    .range(0, MAX_SELECT - 1);
  esplodi('Lettura costi per fornitore', error);

  const mappa = new Map<string, { totale: number; conteggio: number; ultimo?: string }>();
  for (const r of (data ?? []) as { fornitore_id: string; importo: number | string; data: string }[]) {
    const voce = mappa.get(r.fornitore_id) ?? { totale: 0, conteggio: 0 };
    voce.totale = Math.round((voce.totale + num(r.importo)) * 100) / 100;
    voce.conteggio += 1;
    if (!voce.ultimo || r.data > voce.ultimo) voce.ultimo = r.data;
    mappa.set(r.fornitore_id, voce);
  }
  return mappa;
}

function conTotale(
  f: Fornitore,
  totali: Map<string, { totale: number; conteggio: number; ultimo?: string }>,
): FornitoreConTotale {
  const t = totali.get(f.id);
  return {
    ...f,
    totaleSpeso: t?.totale ?? 0,
    numeroCosti: t?.conteggio ?? 0,
    ultimoCosto: t?.ultimo,
  };
}

export const fornitoriService = {
  /**
   * L'ordinamento «dal più caro» si fa in memoria e non nel database: il
   * totale speso non è una colonna di `fornitori`, sta nei costi. Con i numeri
   * di un'impresa artigiana l'elenco sta in una pagina sola e la differenza
   * non si vede; il giorno che i fornitori diventano centinaia, questa somma
   * diventa una vista e l'ordinamento torna al database.
   */
  async list(filtri?: FornitoreFiltri): Promise<Paginato<FornitoreConTotale>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);

    let q = supabase.from(TABELLA).select('*').is('deleted_at', null);
    if (filtri?.categoria) q = q.eq('categoria_prevalente', filtri.categoria);

    const termine = filtri?.q?.trim();
    if (termine) {
      const t = termine.replace(/[,()]/g, ' ');
      q = q.or(
        [
          `denominazione.ilike.%${t}%`,
          `partita_iva.ilike.%${t}%`,
          `email.ilike.%${t}%`,
          `note.ilike.%${t}%`,
        ].join(','),
      );
    }

    const { data, error } = await q.range(0, MAX_SELECT - 1);
    esplodi('Lettura fornitori', error);

    const totali = await totaliPerFornitore();
    const tutti = ((data ?? []) as unknown as RigaFornitore[])
      .map(fornitoreDaRiga)
      .map((f) => conTotale(f, totali))
      .sort((a, b) => b.totaleSpeso - a.totaleSpeso);

    const da = (pagina - 1) * perPagina;
    return {
      righe: tutti.slice(da, da + perPagina),
      totale: tutti.length,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<FornitoreConTotale | null> {
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    esplodi('Lettura fornitore', error);
    if (!data) return null;

    const totali = await totaliPerFornitore();
    return conTotale(fornitoreDaRiga(data as unknown as RigaFornitore), totali);
  },

  /** Per le tendine del drawer dei costi: tutti, in ordine alfabetico. */
  async listTutti(): Promise<Fornitore[]> {
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .is('deleted_at', null)
      .order('denominazione')
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura elenco fornitori', error);
    return ((data ?? []) as unknown as RigaFornitore[]).map(fornitoreDaRiga);
  },

  async create(input: FornitoreInput): Promise<Fornitore> {
    const { data, error } = await supabase
      .from(TABELLA)
      .insert(rigaDaFornitore(input))
      .select('*')
      .single();
    esplodi('Creazione fornitore', error);
    return fornitoreDaRiga(data as unknown as RigaFornitore);
  },

  async update(id: string, patch: Partial<FornitoreInput>): Promise<Fornitore> {
    const riga = rigaDaFornitore(patch);
    if (Object.keys(riga).length === 0) {
      const attuale = await fornitoriService.getById(id);
      if (!attuale) throw new Error('Fornitore non trovato');
      return attuale;
    }

    const { data, error } = await supabase
      .from(TABELLA)
      .update(riga)
      .eq('id', id)
      .select('*')
      .single();
    esplodi('Aggiornamento fornitore', error);
    return fornitoreDaRiga(data as unknown as RigaFornitore);
  },

  /**
   * Soft-delete. I costi restano: la loro FK è `on delete set null`, ma qui
   * non si cancella nulla davvero, quindi continuano a puntare a una riga che
   * esiste — semplicemente non compare più negli elenchi.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLA)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Cancellazione fornitore', error);
  },
};
