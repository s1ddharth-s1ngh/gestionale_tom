import { supabase } from '@/lib/supabase';
import { PER_PAGINA_DEFAULT, type Paginato } from '@/types/comune';
import type {
  FatturaFornitore,
  FatturaFornitoreFiltri,
  FatturaFornitoreInput,
  Pagamento,
  PagamentoInput,
  StatoFatturaFornitoreEffettivo,
} from '@/types/fatturaFornitore';
import {
  STATI_FATTURA_FORNITORE,
  costiDaFattura,
  problemiGenerazione,
} from '@/types/fatturaFornitore';
import { rigaDaCosto } from './costiMapper';
import {
  fatturaFornitoreDaRiga,
  pagamentiPerDb,
  rigaDaFatturaFornitore,
  type RigaFatturaFornitoreDb,
} from './fattureFornitoreMapper';

/**
 * Il ciclo passivo: le fatture che riceviamo dai fornitori.
 *
 * Stesse regole degli altri service migrati — si legge da `v_fatture_fornitore`
 * e si scrive su `fatture_fornitore`, ogni errore di PostgREST viene lanciato,
 * il soft-delete non cancella mai davvero, filtri e paginazione li fa il
 * database.
 *
 * Il metodo che conta è `generaCosti`: è il punto in cui un documento diventa
 * spesa registrata, ed è l'unico posto dell'applicazione dove si scrivono più
 * righe di `costi` in un colpo solo.
 */

const VISTA = 'v_fatture_fornitore';
const TABELLA = 'fatture_fornitore';

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

/** Le virgole e le parentesi spezzerebbero la sintassi di `or()`. */
const perOr = (t: string) => t.replace(/[,()]/g, ' ');

/** Un id per righe e pagamenti creati nel browser. */
function nuovoId(prefisso: string): string {
  return `${prefisso}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type QueryFiltrabile = {
  eq: (c: string, v: unknown) => QueryFiltrabile;
  gte: (c: string, v: unknown) => QueryFiltrabile;
  lte: (c: string, v: unknown) => QueryFiltrabile;
  or: (f: string) => QueryFiltrabile;
};

/**
 * I filtri che NON dipendono dallo stato, condivisi da `list` e `contaPerStato`:
 * i contatori delle pill devono contare dentro la ricerca corrente, o
 * mostrerebbero numeri che non c'entrano con quello che si sta guardando.
 */
function filtriBase<T>(q: T, filtri?: FatturaFornitoreFiltri): T {
  let out = q as unknown as QueryFiltrabile;

  if (filtri?.fornitoreId) out = out.eq('fornitore_id', filtri.fornitoreId);
  // La finestra è sulla data del DOCUMENTO e non sulla ricezione: un periodo
  // contabile si chiude sulle date dei documenti, non su quando sono arrivati.
  if (filtri?.dal) out = out.gte('data_documento', filtri.dal);
  if (filtri?.al) out = out.lte('data_documento', filtri.al);

  const termine = filtri?.q?.trim();
  if (termine) {
    const t = perOr(termine);
    out = out.or(
      [
        `numero.ilike.%${t}%`,
        `note.ilike.%${t}%`,
        `fornitore_denominazione.ilike.%${t}%`,
      ].join(','),
    );
  }

  return out as unknown as T;
}

/** Rilegge dalla vista dopo una scrittura, per tornare i derivati aggiornati. */
async function rileggi(id: string, contesto: string): Promise<FatturaFornitore> {
  const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).single();
  esplodi(contesto, error);
  return fatturaFornitoreDaRiga(data as RigaFatturaFornitoreDb);
}

async function scrivi(
  id: string,
  patch: Record<string, unknown>,
  contesto: string,
): Promise<FatturaFornitore> {
  const { error } = await supabase.from(TABELLA).update(patch).eq('id', id);
  esplodi(contesto, error);
  return rileggi(id, contesto);
}

export const fattureFornitoreService = {
  async list(filtri?: FatturaFornitoreFiltri): Promise<Paginato<FatturaFornitore>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    let q = filtriBase(supabase.from(VISTA).select('*', { count: 'exact' }), filtri);

    // Il confronto è su `stato_effettivo`: in tabella ci sono solo `bozza` e
    // `registrata`, quindi filtrare la colonna grezza darebbe zero risultati su
    // «Scadute» e «Pagate», che sono le due pill che si guardano di più.
    if (filtri?.stato) q = q.eq('stato_effettivo', filtri.stato);

    const { data, error, count } = await q
      .order('data_documento', { ascending: false })
      .range(da, da + perPagina - 1);
    esplodi('Lettura fatture fornitore', error);

    return {
      righe: ((data ?? []) as unknown as RigaFatturaFornitoreDb[]).map(fatturaFornitoreDaRiga),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<FatturaFornitore | null> {
    const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).maybeSingle();
    esplodi('Lettura fattura fornitore', error);
    return data ? fatturaFornitoreDaRiga(data as RigaFatturaFornitoreDb) : null;
  },

  /** Le fatture di un fornitore, per la sezione nella sua scheda. */
  async listPerFornitore(fornitoreId: string): Promise<FatturaFornitore[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .eq('fornitore_id', fornitoreId)
      .order('data_documento', { ascending: false });
    esplodi('Lettura fatture del fornitore', error);
    return ((data ?? []) as unknown as RigaFatturaFornitoreDb[]).map(fatturaFornitoreDaRiga);
  },

  /** Contatori delle pill, dentro la ricerca corrente ma non dentro lo stato. */
  async contaPerStato(
    filtri?: Omit<FatturaFornitoreFiltri, 'stato' | 'pagina' | 'perPagina'>,
  ): Promise<Record<StatoFatturaFornitoreEffettivo, number>> {
    const risultati = await Promise.all(
      STATI_FATTURA_FORNITORE.map(async (stato) => {
        const q = filtriBase(
          supabase.from(VISTA).select('id', { count: 'exact', head: true }),
          filtri,
        ).eq('stato_effettivo', stato);
        const { count, error } = await q;
        esplodi(`Conteggio fatture ${stato}`, error);
        return [stato, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(risultati) as Record<StatoFatturaFornitoreEffettivo, number>;
  },

  /**
   * Lo scadenzario passivo: cosa c'è da pagare, prima le scadenze più vicine.
   *
   * Legge da `v_scadenzario_fornitori`, che filtra già le pagate e le bozze e
   * ordina per scadenza. Farlo qui vorrebbe dire scaricare tutto l'archivio per
   * scartarne la maggior parte.
   */
  async scadenzario(): Promise<FatturaFornitore[]> {
    const { data, error } = await supabase.from(VISTA).select('*').in('stato_effettivo', [
      'da_pagare',
      'pagata_parziale',
      'scaduta',
    ]);
    esplodi('Lettura scadenzario fornitori', error);

    const righe = ((data ?? []) as unknown as RigaFatturaFornitoreDb[]).map(
      fatturaFornitoreDaRiga,
    );
    // Ordinamento qui e non nella query perché le fatture senza scadenza vanno
    // in fondo, e `nulls last` con PostgREST richiede un ordine per colonna che
    // si perderebbe alla prima aggiunta di un secondo criterio.
    return righe.sort((a, b) => {
      if (!a.dataScadenza) return 1;
      if (!b.dataScadenza) return -1;
      return a.dataScadenza.localeCompare(b.dataScadenza);
    });
  },

  async create(input: FatturaFornitoreInput): Promise<FatturaFornitore> {
    const riga = {
      ...rigaDaFatturaFornitore(input),
      // Nasce sempre in bozza: registrarla è un gesto esplicito, e registrare
      // significa dire «questa spesa è nostra» — non lo fa un salvataggio.
      stato: 'bozza' as const,
    };

    const { data, error } = await supabase.from(TABELLA).insert(riga).select('id').single();
    if (error?.message?.includes('uq_fatt_forn_numero')) {
      throw new Error(
        `Il fornitore ha già una fattura numero ${input.numero}: registrarla due volte ` +
          'raddoppierebbe la spesa. Cerca quella esistente invece di crearne un\'altra.',
      );
    }
    esplodi('Creazione fattura fornitore', error);
    return rileggi((data as { id: string }).id, 'Creazione fattura fornitore');
  },

  async update(id: string, patch: Partial<FatturaFornitoreInput>): Promise<FatturaFornitore> {
    return scrivi(id, rigaDaFatturaFornitore(patch), 'Aggiornamento fattura fornitore');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLA)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Eliminazione fattura fornitore', error);
  },

  // ── Il ciclo di vita ───────────────────────────────────────────────────────

  /**
   * Da bozza a registrata: la fattura entra in contabilità e nello scadenzario.
   *
   * La scadenza si controlla PRIMA, perché il database la impone con un CHECK
   * (`chk_registrata`) e il suo messaggio nomina il vincolo senza spiegare cosa
   * manca. Qui si dice in italiano.
   */
  async registra(id: string): Promise<FatturaFornitore> {
    const f = await this.getById(id);
    if (!f) throw new Error(`Fattura ${id} non trovata`);
    if (!f.dataScadenza) {
      throw new Error(
        'Manca la data di scadenza: senza, la fattura non entra nello scadenzario, ' +
          'che è il posto da cui si decide cosa pagare.',
      );
    }
    if (f.righe.length === 0) {
      throw new Error('La fattura non ha righe: non c’è niente da registrare.');
    }
    return scrivi(id, { stato: 'registrata' }, 'Registrazione fattura');
  },

  /**
   * Torna in bozza per correggerla.
   *
   * Si rifiuta se i costi sono già stati generati: quelli restano in archivio e
   * continuano a pesare sui riepiloghi, quindi una fattura «in bozza» con dei
   * costi vivi appesi racconterebbe che la spesa non è ancora stata registrata
   * mentre lo è. Prima si sganciano i costi, poi si torna indietro.
   */
  async annullaRegistrazione(id: string): Promise<FatturaFornitore> {
    const f = await this.getById(id);
    if (!f) throw new Error(`Fattura ${id} non trovata`);
    if (f.costiGenerati > 0) {
      throw new Error(
        `Questa fattura ha già generato ${f.costiGenerati} righe di costo, che restano ` +
          'in archivio. Sganciale prima di riportarla in bozza.',
      );
    }
    return scrivi(id, { stato: 'bozza' }, 'Ritorno in bozza');
  },

  // ── Pagamenti ──────────────────────────────────────────────────────────────

  /**
   * I pagamenti stanno in un JSONB, quindi si riscrive l'array intero: PostgREST
   * non fa append su un array JSON, e farlo con una RPC per due utenti sarebbe
   * una migrazione in più per un guadagno che non si misura.
   *
   * Si rilegge prima di scrivere, così due pagamenti registrati a distanza di
   * secondi non si sovrascrivono a vicenda.
   */
  async registraPagamento(id: string, input: PagamentoInput): Promise<FatturaFornitore> {
    const f = await this.getById(id);
    if (!f) throw new Error(`Fattura ${id} non trovata`);
    if (f.stato !== 'registrata') {
      throw new Error('Una fattura in bozza non si paga: registrala prima.');
    }
    if (input.importo <= 0) {
      throw new Error('L’importo di un pagamento deve essere maggiore di zero.');
    }

    const nuovo: Pagamento = { ...input, id: nuovoId('pag') };
    return scrivi(
      id,
      { pagamenti: pagamentiPerDb([...f.pagamenti, nuovo]) },
      'Registrazione pagamento',
    );
  },

  async eliminaPagamento(id: string, pagamentoId: string): Promise<FatturaFornitore> {
    const f = await this.getById(id);
    if (!f) throw new Error(`Fattura ${id} non trovata`);
    return scrivi(
      id,
      { pagamenti: pagamentiPerDb(f.pagamenti.filter((p) => p.id !== pagamentoId)) },
      'Eliminazione pagamento',
    );
  },

  // ── Il ponte verso i costi ─────────────────────────────────────────────────

  /**
   * Trasforma le righe della fattura in righe di `costi`.
   *
   * È il momento in cui un documento diventa spesa registrata, e ha due
   * protezioni sovrapposte perché sbagliarlo costa caro e non si vede:
   *
   *  - `problemiGenerazione` controlla prima, e dice in italiano cosa manca —
   *    riga per riga, invece di lasciare che il database rifiuti nominando un
   *    vincolo;
   *  - l'`upsert` con `ignoreDuplicates` si appoggia all'indice unico su
   *    `(fattura_fornitore_id, riga_fattura_id)`: se qualcuno clicca due volte,
   *    o due schede generano insieme, il secondo tentativo non scrive niente
   *    invece di raddoppiare la spesa del periodo.
   *
   * La seconda protezione è quella che conta davvero: la prima ha una finestra
   * fra il controllo e la scrittura, questa no.
   */
  async generaCosti(id: string): Promise<{ creati: number }> {
    const f = await this.getById(id);
    if (!f) throw new Error(`Fattura ${id} non trovata`);

    const problemi = problemiGenerazione(f);
    if (problemi.length > 0) throw new Error(problemi.join('\n'));

    const righe = costiDaFattura(f).map((c) => rigaDaCosto(c));

    const { data, error } = await supabase
      .from('costi')
      .upsert(righe, {
        onConflict: 'fattura_fornitore_id,riga_fattura_id',
        ignoreDuplicates: true,
      })
      .select('id');
    esplodi('Generazione dei costi', error);

    return { creati: (data ?? []).length };
  },

  /**
   * Sgancia i costi generati, senza cancellarli.
   *
   * I soldi sono usciti comunque: eliminarli falserebbe il periodo. Si toglie
   * solo il legame col documento, e da lì la fattura può tornare in bozza o
   * rigenerare. È il gesto esplicito che l'indice unico obbliga a fare invece
   * di lasciare che un duplicato passi inosservato.
   */
  async sganciaCosti(id: string): Promise<{ sganciati: number }> {
    const { data, error } = await supabase
      .from('costi')
      .update({ fattura_fornitore_id: null, riga_fattura_id: null })
      .eq('fattura_fornitore_id', id)
      .select('id');
    esplodi('Sgancio dei costi', error);
    return { sganciati: (data ?? []).length };
  },
};
