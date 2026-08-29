import { supabase } from '@/lib/supabase';
import type { Cliente, ClienteFiltri, ClienteInput, LuogoIntervento } from '@/types/cliente';
import { PER_PAGINA_DEFAULT, type Paginato } from '@/types/comune';
import {
  clienteDaRiga,
  luogoDaRiga,
  rigaDaCliente,
  rigaDaLuogo,
  type RigaCliente,
  type RigaLuogo,
} from './clientiMapper';

/**
 * Accesso ai dati dei clienti — su Supabase.
 *
 * È il PRIMO service migrato dai mock e quindi il modello per gli altri cinque.
 * Cinque cose da copiare:
 *
 *  1. **Le firme non sono cambiate.** `list(filtri)`, `getById`, `create`,
 *     `update`, `remove` hanno esattamente la forma di prima: è cambiato solo
 *     il corpo. Nessuna pagina, nessun hook e nessun componente è stato
 *     toccato — che era lo scopo di tenere il layer separato (CONVENTIONS §4).
 *  2. **Il filtro e la paginazione restano nel service**, ma adesso li fa il
 *     database: `.eq()`, `.or()`, `.range()`. Se il filtro fosse in un `useMemo`
 *     dentro la pagina, adesso scaricherebbe tutta la tabella per mostrarne
 *     venti righe.
 *  3. **Ogni errore viene lanciato.** PostgREST non solleva eccezioni: torna
 *     `{ data, error }`, e un `error` ignorato diventa una lista vuota — cioè
 *     un bug che sembra "non ci sono dati". Si controlla sempre.
 *  4. **Soft-delete, mai DELETE.** Si scrive `deleted_at` e si filtra
 *     `is('deleted_at', null)`. Le FK sono `on delete restrict` apposta.
 *  5. **Il conteggio arriva dalla stessa query** (`count: 'exact'`), non da una
 *     seconda: due query separate possono vedere stati diversi del database e
 *     dare una paginazione che non torna.
 */

/** Le colonne del cliente più i suoi luoghi attivi, in una query sola. */
const SELECT_CLIENTE = '*, luoghi_intervento(*)';

/** PostgREST cappa le letture a 1000 righe: le select senza `.range()` vanno
 *  bene solo dove il volume è per forza piccolo. */
const MAX_SELECT = 1000;

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

export const clientiService = {
  async list(filtri?: ClienteFiltri): Promise<Paginato<Cliente>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    let q = supabase
      .from('clienti')
      .select(SELECT_CLIENTE, { count: 'exact' })
      .is('deleted_at', null)
      // I luoghi cancellati non devono comparire dentro il cliente: il filtro
      // sulla tabella annidata va scritto col prefisso, o si applica al padre.
      .is('luoghi_intervento.deleted_at', null);

    if (filtri?.tipo && filtri.tipo !== 'tutti') q = q.eq('tipo', filtri.tipo);

    const termine = filtri?.q?.trim();
    if (termine) {
      // `or()` vuole una stringa sola. Le virgole dentro il termine
      // spezzerebbero la sintassi, quindi si tolgono.
      const t = termine.replace(/[,()]/g, ' ');
      q = q.or(
        [
          `denominazione.ilike.%${t}%`,
          `fatt_comune.ilike.%${t}%`,
          `partita_iva.ilike.%${t}%`,
          `codice_fiscale.ilike.%${t}%`,
          `referente_nome.ilike.%${t}%`,
          `email.ilike.%${t}%`,
        ].join(','),
      );
    }

    const campo = filtri?.ordinaPer ?? 'denominazione';
    q = q.order(campo, { ascending: filtri?.ordine !== 'desc' }).range(da, da + perPagina - 1);

    const { data, error, count } = await q;
    esplodi('Lettura clienti', error);

    return {
      righe: ((data ?? []) as unknown as RigaCliente[]).map(clienteDaRiga),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  /** Tutti i clienti, per le select — che non paginano. */
  async listaCompleta(): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clienti')
      .select(SELECT_CLIENTE)
      .is('deleted_at', null)
      .is('luoghi_intervento.deleted_at', null)
      .order('denominazione')
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura elenco clienti', error);
    return ((data ?? []) as unknown as RigaCliente[]).map(clienteDaRiga);
  },

  async getById(id: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clienti')
      .select(SELECT_CLIENTE)
      .eq('id', id)
      .is('deleted_at', null)
      .is('luoghi_intervento.deleted_at', null)
      // `maybeSingle` e non `single`: su zero righe `single` è un errore, e un
      // id inesistente non è un guasto — è un 404 da mostrare.
      .maybeSingle();
    esplodi('Lettura cliente', error);
    return data ? clienteDaRiga(data as unknown as RigaCliente) : null;
  },

  async create(input: ClienteInput): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clienti')
      .insert(rigaDaCliente(input))
      .select(SELECT_CLIENTE)
      .single();
    esplodi('Creazione cliente', error);

    const creato = clienteDaRiga(data as unknown as RigaCliente);

    // Un cliente nasce quasi sempre senza cantieri, ma se il chiamante li passa
    // vanno scritti nella loro tabella: non sono una colonna del cliente.
    if (input.luoghiIntervento?.length) {
      const { error: e2 } = await supabase
        .from('luoghi_intervento')
        .insert(input.luoghiIntervento.map((l) => rigaDaLuogo(l, creato.id)));
      esplodi('Creazione luoghi di intervento', e2);
      return (await clientiService.getById(creato.id)) ?? creato;
    }

    return creato;
  },

  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    const riga = rigaDaCliente(patch);

    // Un UPDATE senza colonne è un errore di PostgREST, non un no-op: capita
    // quando il patch contiene solo `luoghiIntervento`, che sta in un'altra
    // tabella.
    if (Object.keys(riga).length > 0) {
      const { error } = await supabase.from('clienti').update(riga).eq('id', id);
      esplodi('Aggiornamento cliente', error);
    }

    const aggiornato = await clientiService.getById(id);
    if (!aggiornato) throw new Error('Cliente non trovato dopo l’aggiornamento');
    return aggiornato;
  },

  /** Soft-delete: la riga resta, esce dalle query. */
  async remove(id: string): Promise<void> {
    const ora = new Date().toISOString();
    // Prima i luoghi, poi il cliente: al contrario, i luoghi resterebbero
    // attivi appesi a un cliente che non si vede più.
    const { error: e1 } = await supabase
      .from('luoghi_intervento')
      .update({ deleted_at: ora })
      .eq('cliente_id', id)
      .is('deleted_at', null);
    esplodi('Cancellazione luoghi di intervento', e1);

    const { error } = await supabase.from('clienti').update({ deleted_at: ora }).eq('id', id);
    esplodi('Cancellazione cliente', error);
  },

  /** Quanti clienti per tipo — i contatori delle pill di filtro. */
  async conteggioPerTipo(): Promise<Record<string, number>> {
    // `head: true` chiede solo il conteggio: senza, PostgREST spedirebbe anche
    // tutte le righe per poi buttarle.
    const { data, error } = await supabase
      .from('clienti')
      .select('tipo')
      .is('deleted_at', null)
      .range(0, MAX_SELECT - 1);
    esplodi('Conteggio clienti', error);

    const righe = (data ?? []) as { tipo: string }[];
    const out: Record<string, number> = { tutti: righe.length };
    for (const r of righe) out[r.tipo] = (out[r.tipo] ?? 0) + 1;
    return out;
  },

  // ── Luoghi di intervento ───────────────────────────────────────────────────

  async aggiungiLuogo(
    clienteId: string,
    luogo: Omit<LuogoIntervento, 'id'>,
  ): Promise<LuogoIntervento> {
    const { data, error } = await supabase
      .from('luoghi_intervento')
      .insert(rigaDaLuogo(luogo, clienteId))
      .select()
      .single();
    esplodi('Aggiunta luogo di intervento', error);
    return luogoDaRiga(data as unknown as RigaLuogo);
  },

  async aggiornaLuogo(
    clienteId: string,
    luogoId: string,
    patch: Omit<LuogoIntervento, 'id'>,
  ): Promise<void> {
    const { error } = await supabase
      .from('luoghi_intervento')
      .update(rigaDaLuogo(patch, clienteId))
      .eq('id', luogoId);
    esplodi('Aggiornamento luogo di intervento', error);
  },

  async rimuoviLuogo(luogoId: string): Promise<void> {
    const { error } = await supabase
      .from('luoghi_intervento')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', luogoId);
    esplodi('Rimozione luogo di intervento', error);
  },
};
