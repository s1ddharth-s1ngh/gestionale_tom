import { supabase } from '@/lib/supabase';
import { commesseService } from '@/services/commesseService';
import { PER_PAGINA_DEFAULT, type Paginato } from '@/types/comune';
import type {
  Preventivo,
  PreventivoFiltri,
  PreventivoInput,
  StatoPreventivo,
} from '@/types/preventivo';
import { STATI_PREVENTIVO, calcolaTotali } from '@/types/preventivo';
import {
  preventivoDaRiga,
  rigaDaPreventivo,
  type RigaPreventivoDb,
} from './preventiviMapper';

/**
 * Accesso ai dati dei preventivi — su Supabase.
 *
 * Le firme non sono cambiate rispetto alla versione sui mock: è cambiato solo
 * il corpo, e nessun hook, nessuna pagina e nessun componente è stato toccato.
 * Era lo scopo di tenere il layer separato (CONVENTIONS §4).
 *
 * **Si legge dalla vista, si scrive sulla tabella.** `v_preventivi` calcola
 * `stato_effettivo` da `valido_fino` e porta già la denominazione del cliente;
 * una vista con una join però non è aggiornabile, quindi ogni insert e ogni
 * update vanno su `preventivi`.
 *
 * Le regole del primo service migrato (`clientiService`) valgono tutte:
 * errori sempre lanciati, soft-delete mai DELETE, conteggio dalla stessa query,
 * filtri e paginazione fatti dal database.
 */

/** La vista: letture. Ha `stato_effettivo` e `cliente_denominazione`. */
const VISTA = 'v_preventivi';
/** La tabella: scritture. */
const TABELLA = 'preventivi';

function esplodi(contesto: string, error: { message: string } | null): void {
  // PostgREST non solleva eccezioni: torna `{ data, error }`. Un `error`
  // ignorato diventa una lista vuota — cioè un bug che sembra «non ci sono
  // dati», ed è il modo più efficace per perdere mezza giornata.
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

/** Le virgole e le parentesi spezzerebbero la sintassi di `or()`. */
const perOr = (t: string) => t.replace(/[,()]/g, ' ');

/**
 * Applica a una query i filtri che NON dipendono dallo stato.
 *
 * Li condividono `list` e `contaPerStato`: i contatori delle pill devono
 * contare dentro la ricerca corrente, o mostrerebbero numeri che non c'entrano
 * con quello che si sta guardando.
 *
 * La ricerca copre anche `cliente_denominazione`, che la vista porta già: è la
 * chiusura del TODO che la versione sui mock aveva lasciato, dove il nome del
 * cliente si risolveva in pagina e quindi non era cercabile.
 */
function filtriBase<T extends { eq: unknown; or: unknown }>(q: T, filtri?: PreventivoFiltri): T {
  type Q = {
    eq: (c: string, v: unknown) => Q;
    or: (f: string) => Q;
  };
  let out = q as unknown as Q;

  if (filtri?.clienteId) out = out.eq('cliente_id', filtri.clienteId);

  const termine = filtri?.q?.trim();
  if (termine) {
    const t = perOr(termine);
    out = out.or(
      [`numero.ilike.%${t}%`, `note.ilike.%${t}%`, `cliente_denominazione.ilike.%${t}%`].join(','),
    );
  }

  return out as unknown as T;
}

/**
 * Progressivo annuale: `PR-2026-0031`.
 *
 * Il massimo dell'anno più uno, chiesto al database e non contato sulle righe:
 * cancellarne uno non deve riassegnare un numero già usato, e con il soft-delete
 * i cancellati continuano a esistere. Per questo la query NON filtra
 * `deleted_at`: un numero bruciato resta bruciato.
 *
 * Restano due utenti su un gestionale interno, quindi la corsa fra due
 * creazioni simultanee è teorica; se un giorno smette di esserlo, la risposta è
 * una sequence in Postgres, non un lock qui.
 */
async function prossimoNumero(): Promise<string> {
  const anno = new Date().getFullYear();
  const prefisso = `PR-${anno}-`;

  const { data, error } = await supabase
    .from(TABELLA)
    .select('numero')
    .like('numero', `${prefisso}%`)
    .order('numero', { ascending: false })
    .limit(1);
  esplodi('Lettura ultimo numero', error);

  const ultimo = data?.[0]?.numero as string | undefined;
  const progressivo = ultimo ? Number(ultimo.slice(prefisso.length)) : 0;
  const prossimo = Number.isFinite(progressivo) ? progressivo + 1 : 1;
  return `${prefisso}${String(prossimo).padStart(4, '0')}`;
}

/** Rilegge il preventivo dalla vista dopo una scrittura, per tornare i derivati. */
async function rileggi(id: string, contesto: string): Promise<Preventivo> {
  const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).single();
  esplodi(contesto, error);
  return preventivoDaRiga(data as RigaPreventivoDb);
}

/** Aggiorna la tabella e restituisce il record riletto dalla vista. */
async function scrivi(
  id: string,
  patch: Record<string, unknown>,
  contesto: string,
): Promise<Preventivo> {
  const { error } = await supabase.from(TABELLA).update(patch).eq('id', id);
  esplodi(contesto, error);
  return rileggi(id, contesto);
}

export const preventiviService = {
  async list(filtri?: PreventivoFiltri): Promise<Paginato<Preventivo>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    let q = filtriBase(
      supabase.from(VISTA).select('*', { count: 'exact' }),
      filtri,
    );

    // Il filtro è su `stato_effettivo` e non su `stato`: «scaduto» non esiste
    // fra i valori salvati, quindi filtrare la colonna grezza darebbe sempre
    // zero risultati sulla pill «Scaduti» e lascerebbe gli scaduti mescolati
    // agli inviati.
    if (filtri?.stato) q = q.eq('stato_effettivo', filtri.stato);

    const { data, error, count } = await q
      .order('data_emissione', { ascending: false })
      .order('numero', { ascending: false })
      .range(da, da + perPagina - 1);
    esplodi('Lettura preventivi', error);

    return {
      righe: ((data ?? []) as unknown as RigaPreventivoDb[]).map(preventivoDaRiga),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<Preventivo | null> {
    const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).maybeSingle();
    esplodi('Lettura preventivo', error);
    return data ? preventivoDaRiga(data as RigaPreventivoDb) : null;
  },

  /** I preventivi di un cliente, per la sezione dedicata nella sua scheda. */
  async listPerCliente(clienteId: string): Promise<Preventivo[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data_emissione', { ascending: false });
    esplodi('Lettura preventivi del cliente', error);
    return ((data ?? []) as unknown as RigaPreventivoDb[]).map(preventivoDaRiga);
  },

  /**
   * Quanti preventivi per stato, dentro la ricerca corrente.
   *
   * Cinque `count` in parallelo e non una GROUP BY: PostgREST non espone i
   * raggruppamenti, e le alternative sarebbero una funzione RPC — cioè una
   * migrazione in più per cinque numeri — oppure scaricare l'archivio intero
   * per contarlo qui, che è esattamente ciò che il filtro nel database evita.
   * Le query sono `head: true`: tornano il conteggio, non le righe.
   */
  async contaPerStato(
    filtri?: Omit<PreventivoFiltri, 'stato' | 'pagina' | 'perPagina'>,
  ): Promise<Record<StatoPreventivo, number>> {
    const risultati = await Promise.all(
      STATI_PREVENTIVO.map(async (stato) => {
        const q = filtriBase(
          supabase.from(VISTA).select('id', { count: 'exact', head: true }),
          filtri,
        ).eq('stato_effettivo', stato);
        const { count, error } = await q;
        esplodi(`Conteggio preventivi ${stato}`, error);
        return [stato, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(risultati) as Record<StatoPreventivo, number>;
  },

  async create(input: PreventivoInput): Promise<Preventivo> {
    const { imponibile, totale } = calcolaTotali(input.righe, input.aliquotaIva);

    const riga = {
      ...rigaDaPreventivo(input),
      numero: await prossimoNumero(),
      // Un preventivo nasce SEMPRE in bozza: si invia con un gesto esplicito,
      // ed è quel gesto a scrivere la data di invio.
      stato: 'bozza' as const,
      imponibile,
      totale,
    };

    const { data, error } = await supabase.from(TABELLA).insert(riga).select('id').single();
    esplodi('Creazione preventivo', error);
    return rileggi((data as { id: string }).id, 'Creazione preventivo');
  },

  async update(id: string, patch: Partial<PreventivoInput>): Promise<Preventivo> {
    // L'aliquota corrente serve al mapper per ricalcolare i totali quando si
    // aggiornano le sole righe: senza, un preventivo al 10% verrebbe riscritto
    // al 22% e il documento smetterebbe di tornare.
    const attuale = await this.getById(id);
    if (!attuale) throw new Error(`Preventivo ${id} non trovato`);

    return scrivi(id, rigaDaPreventivo(patch, attuale.aliquotaIva), 'Aggiornamento preventivo');
  },

  /**
   * Cancellazione morbida: si scrive `deleted_at` e la vista smette di
   * mostrarlo. Le foreign key sono `on delete restrict` apposta — una commessa
   * non deve restare orfana del preventivo che l'ha generata.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLA)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Eliminazione preventivo', error);
  },

  // ── Il ciclo di vita ───────────────────────────────────────────────────────
  // Transizioni esplicite invece di un `update({stato})` libero, così l'insieme
  // dei passaggi possibili si legge qui e non va ricostruito leggendo le pagine.
  //
  // `scaduto` non compare, e non è una dimenticanza: non è uno stato che si
  // sceglie, è quello che diventa un inviato quando passa la sua validità. Lo
  // calcola la vista.

  /** Manda il preventivo al cliente. È il gesto che fissa la data di invio. */
  async invia(id: string): Promise<Preventivo> {
    const attuale = await this.getById(id);
    if (!attuale) throw new Error(`Preventivo ${id} non trovato`);
    return scrivi(
      id,
      {
        stato: 'inviato',
        // Un rinvio dopo una correzione non riscrive la data del primo invio.
        data_invio: attuale.dataInvio ?? new Date().toISOString(),
      },
      'Invio preventivo',
    );
  },

  async accetta(id: string): Promise<Preventivo> {
    // `data_esito` è obbligatoria: il CHECK `chk_esito` rifiuta un accettato
    // senza, perché uno storico che non sa dire quando è stato deciso non serve.
    return scrivi(
      id,
      { stato: 'accettato', data_esito: new Date().toISOString() },
      'Accettazione preventivo',
    );
  },

  async rifiuta(id: string, motivo?: string): Promise<Preventivo> {
    const attuale = await this.getById(id);
    if (!attuale) throw new Error(`Preventivo ${id} non trovato`);
    return scrivi(
      id,
      {
        stato: 'rifiutato',
        data_esito: new Date().toISOString(),
        note: motivo ? [attuale.note, motivo].filter(Boolean).join('\n') : (attuale.note ?? null),
      },
      'Rifiuto preventivo',
    );
  },

  /**
   * Riporta in bozza un preventivo inviato o scaduto, per correggerlo e
   * rimandarlo. Azzera le date di invio ed esito: quello che ripartirà è un
   * altro documento, e tenersi la data vecchia farebbe sembrare inviato
   * qualcosa che il cliente non ha ancora visto.
   */
  async riportaInBozza(id: string): Promise<Preventivo> {
    return scrivi(
      id,
      { stato: 'bozza', data_invio: null, data_esito: null },
      'Ritorno in bozza',
    );
  },

  // ── L'aggancio alle commesse ───────────────────────────────────────────────

  /**
   * Trasforma il preventivo accettato in una commessa.
   *
   * ATTENZIONE — cucitura di migrazione. `commessa_id` è una foreign key vera
   * verso `public.commesse`, ma `commesseService` scrive ancora nell'array dei
   * mock e restituisce id come `cm-016-a3f2`: scriverli qui farebbe fallire il
   * vincolo con un errore di Postgres che non spiega niente a chi lo legge.
   *
   * Quindi si controlla prima e si lancia un errore che dice la verità. Il
   * dialog di conversione lo mostra in-place — chi prova capisce che manca un
   * pezzo di migrazione, non che il modulo è rotto.
   *
   * Quando la chat C migra le commesse, questo blocco `if` si cancella e non
   * resta niente da cambiare: il resto della funzione è già quello definitivo.
   */
  async convertiInCommessa(preventivoId: string): Promise<{ commessaId: string }> {
    const p = await this.getById(preventivoId);
    if (!p) throw new Error(`Preventivo ${preventivoId} non trovato`);
    if (p.commessaId) return { commessaId: p.commessaId };

    const commessa = await commesseService.creaDaPreventivo(p);

    if (!UUID.test(commessa.id)) {
      throw new Error(
        'Le commesse non sono ancora su Supabase: la commessa è stata creata solo in memoria ' +
          'e il collegamento non può essere salvato. Migra il modulo Commesse, poi riprova.',
      );
    }

    await scrivi(
      preventivoId,
      {
        commessa_id: commessa.id,
        stato: 'accettato',
        data_esito: p.dataEsito ?? new Date().toISOString(),
      },
      'Conversione in commessa',
    );
    return { commessaId: commessa.id };
  },
};

/** Un id generato da Postgres è un UUID; quelli dei mock no. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
