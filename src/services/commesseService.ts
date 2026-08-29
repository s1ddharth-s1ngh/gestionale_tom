import { supabase } from '@/lib/supabase';
import { PER_PAGINA_DEFAULT, type Foto, type Paginato } from '@/types/comune';
import type {
  Commessa,
  CommessaConCliente,
  CommessaFiltri,
  CommessaInput,
  Lavorazione,
  Rapportino,
  StatoCommessa,
} from '@/types/commessa';
import type { Preventivo } from '@/types/preventivo';
import { oreStimate } from '@/types/preventivo';
import {
  commessaConClienteDaRiga,
  commessaDaRiga,
  rigaDaCommessa,
  type RigaCommessa,
} from './commesseMapper';

/**
 * Accesso ai dati delle commesse — su Supabase.
 *
 * Le firme sono quelle di prima: è cambiato solo il corpo, e nessuna pagina,
 * nessun hook e nessun componente è stato toccato. Era lo scopo di tenere il
 * layer separato (CONVENTIONS §4), e questa migrazione è la prova che ha retto.
 *
 * Tre cose che questo service NON fa più, perché ora le fa il database:
 *
 *  - **non calcola `ore_reali` e `avanzamento_pct`**: li ricalcola il trigger
 *    `commesse_ricalcola_derivati` a ogni scrittura delle lavorazioni. Prima
 *    era una funzione da cui passavano tutte le scritture; adesso è un vincolo,
 *    e la differenza è che nemmeno una query fatta a mano può aggirarlo;
 *  - **non filtra in memoria**: `.eq()`, `.gte()`, `.or()`, `.range()`;
 *  - **non conta a parte**: il totale arriva dalla stessa query (`count:
 *    'exact'`), perché due query separate possono vedere due stati del
 *    database e produrre una paginazione che non torna.
 */

/** Cliente e luogo in una query sola: la lista li mostra su ogni riga. */
const SELECT_COMMESSA = '*, clienti(denominazione), luoghi_intervento(etichetta)';

/** PostgREST cappa le letture a 1000 righe. */
const MAX_SELECT = 1000;

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

/** Il termine di ricerca, ripulito: virgole e parentesi spezzano `or()`. */
function pulisci(termine: string): string {
  return termine.replace(/[,()]/g, ' ').trim();
}

/**
 * Gli id dei clienti il cui nome contiene il termine.
 *
 * Serve perché la ricerca deve trovare «Casalecchio» digitato da chi cerca il
 * Comune, non il numero della commessa. PostgREST non sa mettere in `or()` una
 * colonna della tabella padre e una della tabella collegata insieme, quindi si
 * risolve prima l'anagrafica e poi si filtra su `cliente_id`. Restano due query
 * entrambe fatte dal database: il filtro non torna in memoria.
 */
async function clientiCheMatchano(termine: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('clienti')
    .select('id')
    .is('deleted_at', null)
    .ilike('denominazione', `%${termine}%`)
    .range(0, MAX_SELECT - 1);
  esplodi('Ricerca clienti', error);
  return (data ?? []).map((r) => (r as { id: string }).id);
}

/**
 * I soli quattro metodi del query builder che qui servono.
 *
 * Tipizzarlo così invece che con `any`: il tipo vero di supabase-js cambia a
 * ogni concatenazione e scriverlo per esteso costerebbe più di quanto renda, ma
 * `any` spegnerebbe i controlli anche su nomi di colonna e forma delle
 * condizioni — che sono esattamente le due cose che qui si sbagliano.
 * `T extends Filtrabile<T>` tiene il tipo del chiamante intatto dall'ingresso
 * all'uscita.
 */
interface Filtrabile<T> {
  eq(colonna: string, valore: string): T;
  gte(colonna: string, valore: string): T;
  lte(colonna: string, valore: string): T;
  or(condizioni: string): T;
}

/**
 * Applica i filtri che non sono lo stato. Condiviso da `list` e
 * `contaPerStato`, o i contatori delle pill direbbero numeri che non c'entrano
 * con la tabella che stanno sopra.
 *
 * **Sincrona, e non è un dettaglio di stile:** un query builder di PostgREST è
 * un thenable, quindi `await` su di lui non aspetta — LO ESEGUE, e restituisce
 * il risultato al posto del builder da continuare a comporre. Gli id dei
 * clienti che matchano vanno quindi risolti prima, fuori di qui.
 */
function conFiltriNonStato<T extends Filtrabile<T>>(
  q: T,
  filtri?: Omit<CommessaFiltri, 'stato' | 'pagina' | 'perPagina'>,
  idClienti: string[] = [],
): T {
  let out = q;

  if (filtri?.clienteId) out = out.eq('cliente_id', filtri.clienteId);

  // Finestra sulla data pianificata: la usa il calendario per chiedere il mese.
  // Le commesse senza data non appartengono a nessun mese e restano fuori.
  if (filtri?.dal) out = out.gte('data_pianificata', filtri.dal);
  if (filtri?.al) out = out.lte('data_pianificata', filtri.al);

  const termine = filtri?.q ? pulisci(filtri.q) : '';
  if (termine) {
    const condizioni = [`numero.ilike.%${termine}%`, `note.ilike.%${termine}%`];
    // `in.()` con la lista vuota è sintassi non valida: si aggiunge solo se
    // qualche cliente ha davvero matchato.
    if (idClienti.length > 0) condizioni.push(`cliente_id.in.(${idClienti.join(',')})`);
    out = out.or(condizioni.join(','));
  }

  return out;
}

/**
 * Progressivo annuale `CM-2026-0007`: il massimo dell'anno più uno.
 *
 * Non è il conteggio delle righe — cancellarne una riassegnerebbe un numero già
 * usato, e due documenti con lo stesso numero sono un problema contabile, non
 * un fastidio. Il vincolo `uq_commesse_numero` è la rete sotto: due creazioni
 * nello stesso istante fanno fallire la seconda invece di duplicare il numero.
 */
async function prossimoNumero(): Promise<string> {
  const anno = new Date().getFullYear();
  const prefisso = `CM-${anno}-`;
  const { data, error } = await supabase
    .from('commesse')
    .select('numero')
    .like('numero', `${prefisso}%`)
    .order('numero', { ascending: false })
    .limit(1);
  esplodi('Numerazione commesse', error);

  const ultimo = data?.[0] ? Number((data[0] as { numero: string }).numero.slice(prefisso.length)) : 0;
  const prossimo = Number.isFinite(ultimo) ? ultimo + 1 : 1;
  return `${prefisso}${String(prossimo).padStart(4, '0')}`;
}

/** Oggi in ISO `AAAA-MM-GG`, che è come il DB tiene le `date`. */
function oggi(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function leggi(id: string): Promise<Commessa> {
  const c = await commesseService.getById(id);
  if (!c) throw new Error(`Commessa ${id} non trovata`);
  return c;
}

/** Scrive e restituisce la riga aggiornata: `select()` dopo `update()` evita
 *  una seconda lettura, e quello che torna ha già i derivati del trigger. */
async function scrivi(id: string, patch: Record<string, unknown>): Promise<Commessa> {
  const { data, error } = await supabase
    .from('commesse')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select(SELECT_COMMESSA)
    .single();
  esplodi('Aggiornamento commessa', error);
  return commessaDaRiga(data as unknown as RigaCommessa);
}

/** Accoda una riga alle note senza perdere quelle che c'erano. */
function noteCon(attuali: string | undefined, aggiunta?: string): string | null {
  const testo = [attuali, aggiunta].filter(Boolean).join('\n').trim();
  return testo.length > 0 ? testo : null;
}

export const commesseService = {
  async list(filtri?: CommessaFiltri): Promise<Paginato<CommessaConCliente>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    const termine = filtri?.q ? pulisci(filtri.q) : '';
    const idClienti = termine ? await clientiCheMatchano(termine) : [];

    let q = supabase
      .from('commesse')
      .select(SELECT_COMMESSA, { count: 'exact' })
      .is('deleted_at', null);

    q = conFiltriNonStato(q, filtri, idClienti);
    if (filtri?.stato) q = q.eq('stato', filtri.stato);

    // Le pianificate più vicine in cima, le senza data in fondo: chi apre
    // l'elenco vuole sapere cosa succede adesso, non cosa è successo.
    // `nullsFirst: false` è il pezzo che tiene le non pianificate in coda.
    const { data, error, count } = await q
      .order('data_pianificata', { ascending: false, nullsFirst: false })
      .order('numero', { ascending: false })
      .range(da, da + perPagina - 1);
    esplodi('Lettura commesse', error);

    return {
      righe: ((data ?? []) as unknown as RigaCommessa[]).map(commessaConClienteDaRiga),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<CommessaConCliente | null> {
    const { data, error } = await supabase
      .from('commesse')
      .select(SELECT_COMMESSA)
      .eq('id', id)
      .is('deleted_at', null)
      // `maybeSingle` e non `single`: un id inesistente non è un guasto, è un
      // 404 da mostrare.
      .maybeSingle();
    esplodi('Lettura commessa', error);
    return data ? commessaConClienteDaRiga(data as unknown as RigaCommessa) : null;
  },

  /** Le commesse di un cliente, per lo storico interventi nella sua scheda. */
  async listPerCliente(clienteId: string): Promise<CommessaConCliente[]> {
    const { data, error } = await supabase
      .from('commesse')
      .select(SELECT_COMMESSA)
      .eq('cliente_id', clienteId)
      .is('deleted_at', null)
      .order('data_pianificata', { ascending: false, nullsFirst: false })
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura commesse del cliente', error);
    return ((data ?? []) as unknown as RigaCommessa[]).map(commessaConClienteDaRiga);
  },

  /**
   * Quante commesse per stato, dentro la ricerca corrente.
   *
   * Sei `count` con `head: true` invece di scaricare le righe per contarle: al
   * database costa un indice, al client zero byte di payload. Contarle in
   * pagina vorrebbe dire scaricare l'archivio intero per riempire sei pillole.
   */
  async contaPerStato(
    filtri?: Omit<CommessaFiltri, 'stato' | 'pagina' | 'perPagina'>,
  ): Promise<Record<StatoCommessa | 'tutte', number>> {
    const stati: StatoCommessa[] = [
      'da_pianificare',
      'pianificata',
      'in_corso',
      'completata',
      'sospesa',
      'annullata',
    ];

    // Gli id dei clienti che matchano si risolvono UNA volta e valgono per
    // tutti e sette i conteggi: risolverli dentro `conta` sarebbe la stessa
    // query all'anagrafica ripetuta sette volte a ogni battuta sulla ricerca.
    const termine = filtri?.q ? pulisci(filtri.q) : '';
    const idClienti = termine ? await clientiCheMatchano(termine) : [];

    const conta = async (stato?: StatoCommessa): Promise<number> => {
      let q = supabase
        .from('commesse')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      q = conFiltriNonStato(q, filtri, idClienti);
      if (stato) q = q.eq('stato', stato);
      const { count, error } = await q;
      esplodi('Conteggio commesse', error);
      return count ?? 0;
    };

    const [tutte, ...perStato] = await Promise.all([conta(), ...stati.map((s) => conta(s))]);

    return {
      tutte,
      da_pianificare: perStato[0],
      pianificata: perStato[1],
      in_corso: perStato[2],
      completata: perStato[3],
      sospesa: perStato[4],
      annullata: perStato[5],
    };
  },

  async create(input: CommessaInput): Promise<Commessa> {
    const { data, error } = await supabase
      .from('commesse')
      .insert({
        ...rigaDaCommessa(input),
        numero: await prossimoNumero(),
        // Lo stato non si sceglie: una commessa con una data è pianificata,
        // senza è da pianificare. Lasciarlo scegliere produce elenchi che si
        // contraddicono — e il CHECK `chk_pianificata` rifiuterebbe comunque
        // una pianificata senza data.
        stato: input.dataPianificata ? 'pianificata' : 'da_pianificare',
        // Le lavorazioni in ingresso non hanno id: glielo diamo qui, perché
        // dentro un JSONB non c'è nessun default che possa farlo.
        lavorazioni: (input.lavorazioni ?? []).map((l) => ({ ...l, id: crypto.randomUUID() })),
      })
      .select(SELECT_COMMESSA)
      .single();
    esplodi('Creazione commessa', error);
    return commessaDaRiga(data as unknown as RigaCommessa);
  },

  async update(id: string, patch: Partial<CommessaInput>): Promise<Commessa> {
    const riga = rigaDaCommessa(patch);
    if (patch.lavorazioni !== undefined) {
      riga.lavorazioni = patch.lavorazioni.map((l) => ({
        ...l,
        id: (l as Lavorazione).id ?? crypto.randomUUID(),
      }));
    }
    return scrivi(id, riga);
  },

  /**
   * Soft-delete: si scrive `deleted_at`, non si cancella la riga.
   *
   * Le FK verso le commesse sono `on delete restrict` apposta — una fattura che
   * punta a una commessa sparita è un documento contabile senza il lavoro che
   * lo giustifica.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('commesse')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Eliminazione commessa', error);
  },

  // ── Il ciclo di vita ───────────────────────────────────────────────────────
  // Transizioni esplicite invece di un `update({stato})` libero: l'insieme dei
  // passaggi possibili si legge qui, e non va ricostruito leggendo le pagine.

  /** Mette a calendario, o sposta di giorno una commessa già pianificata. */
  async pianifica(id: string, data: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, {
      data_pianificata: data,
      // Una commessa già avviata che si sposta di data resta in corso: la
      // ripianificazione non annulla il lavoro già fatto.
      stato: attuale.stato === 'da_pianificare' ? 'pianificata' : attuale.stato,
    });
  },

  async avvia(id: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, {
      stato: 'in_corso',
      data_inizio: attuale.dataInizio ?? oggi(),
      // Avviare una commessa mai pianificata la data ce l'ha comunque: è oggi.
      data_pianificata: attuale.dataPianificata ?? oggi(),
    });
  },

  async sospendi(id: string, motivo?: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, { stato: 'sospesa', note: noteCon(attuale.note, motivo) });
  },

  /** Riprende una sospesa: torna in corso se era già iniziata, pianificata se no. */
  async riprendi(id: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, { stato: attuale.dataInizio ? 'in_corso' : 'pianificata' });
  },

  async annulla(id: string, motivo?: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, { stato: 'annullata', note: noteCon(attuale.note, motivo) });
  },

  async completa(id: string): Promise<Commessa> {
    const attuale = await leggi(id);
    return scrivi(id, { stato: 'completata', data_fine: attuale.dataFine ?? oggi() });
  },

  // ── Il lavoro sul campo ────────────────────────────────────────────────────

  /**
   * Sostituisce l'elenco delle lavorazioni. Ore reali e avanzamento si
   * aggiornano da soli: li ricalcola il trigger, non questa funzione.
   */
  async aggiornaLavorazioni(id: string, lavorazioni: Lavorazione[]): Promise<Commessa> {
    return scrivi(id, {
      lavorazioni: lavorazioni.map((l) => ({ ...l, id: l.id ?? crypto.randomUUID() })),
    });
  },

  async salvaFoto(id: string, quando: 'prima' | 'dopo', foto: Foto[]): Promise<Commessa> {
    return scrivi(id, quando === 'prima' ? { foto_prima: foto } : { foto_dopo: foto });
  },

  /**
   * Salva il rapportino. Se il cliente ha firmato, la commessa si chiude: la
   * firma È la conclusione del lavoro, e chiedere anche un click su «completa»
   * significa ritrovarsi commesse firmate e ancora aperte.
   */
  async salvaRapportino(id: string, rapportino: Rapportino): Promise<Commessa> {
    const attuale = await leggi(id);
    const firmato = !!rapportino.firmaCliente;

    return scrivi(id, {
      rapportino,
      stato: firmato ? 'completata' : attuale.stato,
      data_fine: firmato ? (attuale.dataFine ?? rapportino.dataCompilazione) : attuale.dataFine ?? null,
      // Firmare chiude tutte le lavorazioni: il rapportino dice che il lavoro è
      // finito, e un avanzamento all'80% su una commessa firmata è una svista.
      // Passando dalle lavorazioni, il trigger porta l'avanzamento a 100 da sé.
      lavorazioni: firmato
        ? attuale.lavorazioni.map((l) => ({
            ...l,
            completata: true,
            oreReali: l.oreReali ?? l.orePreviste,
          }))
        : attuale.lavorazioni,
    });
  },

  /**
   * Crea la commessa che nasce da un preventivo accettato.
   *
   * Ogni riga del preventivo diventa una lavorazione, comprese quelle che non
   * sono ore: «smaltimento a corpo» è lavoro che qualcuno deve spuntare come
   * fatto, e tenerlo fuori perché non ha un monte ore lo farebbe sparire dal
   * rapportino. Quelle righe entrano con zero ore previste — è vero, non è un
   * segnaposto: il loro costo sta nel preventivo, non nel tempo.
   *
   * Non tocca il preventivo. È `preventiviService.convertiInCommessa` a
   * scrivere `commessaId` e portarlo ad accettato: due service che si scrivono
   * a vicenda sono due punti da cui può partire una conversione a metà.
   */
  async creaDaPreventivo(preventivo: Preventivo): Promise<Commessa> {
    return commesseService.create({
      clienteId: preventivo.clienteId,
      luogoInterventoId: preventivo.luogoInterventoId,
      preventivoId: preventivo.id,
      // Nasce da pianificare: la data la decide chi organizza le squadre.
      // Ereditare quella del preventivo riempirebbe il calendario di giorni che
      // nessuno ha scelto.
      orePreviste: oreStimate(preventivo.righe),
      lavorazioni: preventivo.righe.map((r) => ({
        descrizione: r.descrizione,
        orePreviste: r.unita === 'ore' ? r.quantita : 0,
        completata: false,
      })),
      // Le note del preventivo servono in cantiere quanto in trattativa:
      // «accesso mezzi difficile» è scritto lì e va letto qui.
      note: preventivo.note,
    });
  },

  /**
   * Collega alla commessa la fattura che la copre.
   *
   * Emettere il documento NON si fa da qui: lo costruisce `fattureService`, che
   * sa cosa distingue un acconto da un saldo. Questo service espone solo la
   * scrittura di `fattura_id`, ed e' la divisione giusta - un service che
   * chiama il service di un altro modulo per orchestrarlo diventa il punto in
   * cui si rompono tutti e due quando uno dei due cambia firma.
   */
  async collegaFattura(id: string, fatturaId: string): Promise<Commessa> {
    return scrivi(id, { fattura_id: fatturaId });
  },
};
