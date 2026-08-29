import { supabase } from '@/lib/supabase';
import { PER_PAGINA_DEFAULT, type Paginato } from '@/types/comune';
import type {
  Fattura,
  FatturaFiltri,
  FatturaInput,
  IncassoInput,
  SollecitoInput,
  StatoFattura,
  TipoFattura,
} from '@/types/fattura';
import { ALIQUOTA_IVA_DEFAULT } from '@/types/fattura';
import {
  fatturaDaRiga,
  num,
  rigaDaFattura,
  statoDaVista,
  type RigaFatturaDb,
  type RigaFatturaVista,
} from './fattureMapper';

/**
 * Accesso ai dati delle fatture — su Supabase.
 *
 * Segue `clientiService`: firme invariate, filtri e paginazione fatti dal
 * database, ogni errore lanciato, soft-delete, conteggio dalla stessa query.
 *
 * Una regola in più, ed è quella che conta qui: **si legge da `v_fatture`, si
 * scrive su `fatture`**. La vista calcola incassato, residuo e stato effettivo
 * dagli incassi; la tabella conserva solo la decisione umana — `bozza` o
 * `emessa`, gli unici due valori che il `CHECK` accetta. Leggere dalla tabella
 * significherebbe ricalcolare lo stato in TypeScript e ritrovarsi con due
 * regole che prima o poi non coincidono.
 */

const VISTA = 'v_fatture';
const TABELLA = 'fatture';

/** PostgREST cappa comunque a 1000 righe: le letture senza `.range()` stanno
 *  solo dove il volume è per forza piccolo (scadenzario, conteggi). */
const MAX_SELECT = 1000;

function esplodi(contesto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

/** La fattura come la vogliono elenco, scadenzario e dettaglio. */
export interface FatturaConCliente extends Fattura {
  clienteDenominazione: string;
  imponibile: number;
  iva: number;
  totale: number;
  incassato: number;
  residuo: number;
  stato: StatoFattura;
  /** Negativo se scaduta, positivo se nei termini, `null` senza scadenza. */
  giorniAllaScadenza: number | null;
}

function daVista(r: RigaFatturaVista): FatturaConCliente {
  return {
    ...fatturaDaRiga(r),
    clienteDenominazione: r.cliente_denominazione,
    imponibile: num(r.imponibile),
    iva: num(r.iva),
    totale: num(r.totale),
    // Incassato e residuo li ha già sommati la vista: rifarli qui vorrebbe
    // dire due somme che si possono contraddire.
    incassato: num(r.incassato),
    residuo: num(r.residuo),
    stato: statoDaVista(r),
    giorniAllaScadenza: giorniA(r.data_scadenza),
  };
}

/** Giorni interi, calcolati a mezzogiorno: sull'ora zero un fuso di differenza
 *  sposta il conteggio di un giorno, e una fattura «scade oggi» quando in
 *  realtà scadeva ieri. */
function giorniA(dataScadenza: string | null): number | null {
  if (!dataScadenza) return null;
  const scadenza = new Date(dataScadenza);
  scadenza.setHours(12, 0, 0, 0);
  const oggi = new Date();
  oggi.setHours(12, 0, 0, 0);
  return Math.round((scadenza.getTime() - oggi.getTime()) / 86_400_000);
}

/**
 * FT-AAAA-NNNN, progressivo annuale.
 *
 * Legge l'ultimo numero dell'anno e aggiunge uno. Con un utente basta; con due
 * che emettono nello stesso istante il `unique` sul numero rifiuta il secondo,
 * ed è il comportamento giusto — meglio un errore che due fatture con lo
 * stesso protocollo. La sequenza vera è lavoro da database, il giorno che serve.
 */
async function prossimoNumero(): Promise<string> {
  const anno = new Date().getFullYear();
  const prefisso = `FT-${anno}-`;

  const { data, error } = await supabase
    .from(TABELLA)
    .select('numero')
    .like('numero', `${prefisso}%`)
    .order('numero', { ascending: false })
    .limit(1);
  esplodi('Lettura ultimo numero fattura', error);

  const ultimo = (data ?? [])[0]?.numero as string | undefined;
  const progressivo = ultimo ? Number(ultimo.slice(prefisso.length)) : 0;
  const prossimo = (Number.isFinite(progressivo) ? progressivo : 0) + 1;
  return `${prefisso}${String(prossimo).padStart(4, '0')}`;
}

/** Rilegge dalla tabella dopo una scrittura. */
async function rileggi(id: string): Promise<Fattura> {
  const { data, error } = await supabase.from(TABELLA).select('*').eq('id', id).maybeSingle();
  esplodi('Rilettura fattura', error);
  if (!data) throw new Error('Fattura non trovata dopo la scrittura');
  return fatturaDaRiga(data as unknown as RigaFatturaDb);
}

/** Legge una colonna JSONB da riscrivere. */
async function arrayJson<T>(id: string, colonna: 'incassi' | 'solleciti'): Promise<T[]> {
  const { data, error } = await supabase.from(TABELLA).select(colonna).eq('id', id).maybeSingle();
  esplodi(`Lettura ${colonna}`, error);
  return ((data as Record<string, unknown> | null)?.[colonna] as T[]) ?? [];
}

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function sommaGiorni(data: string, giorni: number): string {
  const d = new Date(data);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

function arrotonda(v: number): number {
  return Math.round(v * 100) / 100;
}

export const fattureService = {
  async list(filtri?: FatturaFiltri): Promise<Paginato<FatturaConCliente>> {
    const perPagina = filtri?.perPagina ?? PER_PAGINA_DEFAULT;
    const pagina = Math.max(1, filtri?.pagina ?? 1);
    const da = (pagina - 1) * perPagina;

    let q = supabase.from(VISTA).select('*', { count: 'exact' });

    // Si filtra su `stato_effettivo` e non su `stato`: l'utente sceglie
    // «scaduta», che come valore in tabella non esiste.
    if (filtri?.stato) q = q.eq('stato_effettivo', filtri.stato);
    if (filtri?.clienteId) q = q.eq('cliente_id', filtri.clienteId);
    if (filtri?.commessaId) q = q.eq('commessa_id', filtri.commessaId);
    if (filtri?.dal) q = q.gte('data_scadenza', filtri.dal);
    if (filtri?.al) q = q.lte('data_scadenza', filtri.al);

    const termine = filtri?.q?.trim();
    if (termine) {
      // Virgole e parentesi spezzerebbero la sintassi di `or()`.
      const t = termine.replace(/[,()]/g, ' ');
      q = q.or(
        [`numero.ilike.%${t}%`, `note.ilike.%${t}%`, `cliente_denominazione.ilike.%${t}%`].join(','),
      );
    }

    // Le bozze non hanno data di emissione: con `nullsFirst: false` finiscono
    // in fondo, dove servono — chi apre l'elenco cerca l'ultima emessa.
    q = q
      .order('data_emissione', { ascending: false, nullsFirst: false })
      .order('numero', { ascending: false })
      .range(da, da + perPagina - 1);

    const { data, error, count } = await q;
    esplodi('Lettura fatture', error);

    return {
      righe: ((data ?? []) as unknown as RigaFatturaVista[]).map(daVista),
      totale: count ?? 0,
      pagina,
      perPagina,
    };
  },

  async getById(id: string): Promise<FatturaConCliente | null> {
    const { data, error } = await supabase.from(VISTA).select('*').eq('id', id).maybeSingle();
    esplodi('Lettura fattura', error);
    return data ? daVista(data as unknown as RigaFatturaVista) : null;
  },

  /** Le fatture di un cliente, per la sezione «Fatture» della sua scheda. */
  async listPerCliente(clienteId: string): Promise<FatturaConCliente[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data_emissione', { ascending: false, nullsFirst: false })
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura fatture del cliente', error);
    return ((data ?? []) as unknown as RigaFatturaVista[]).map(daVista);
  },

  /**
   * Lo scadenzario: quello che ha ancora un residuo, dalla scadenza più
   * vecchia. Il filtro è sullo stato effettivo, quindi le pagate escono da
   * sole — non c'è un filtro da ricordarsi di applicare, e quindi non c'è
   * modo di sbagliarlo.
   */
  async scadenzario(): Promise<FatturaConCliente[]> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('*')
      .in('stato_effettivo', ['emessa', 'pagata_parziale', 'scaduta'])
      .order('data_scadenza', { ascending: true, nullsFirst: false })
      .range(0, MAX_SELECT - 1);
    esplodi('Lettura scadenzario', error);
    return ((data ?? []) as unknown as RigaFatturaVista[]).map(daVista);
  },

  /** I contatori delle pill: dall'archivio intero, non dalla pagina mostrata. */
  async contaPerStato(): Promise<Record<StatoFattura | 'tutte', number>> {
    const { data, error } = await supabase
      .from(VISTA)
      .select('stato_effettivo')
      .range(0, MAX_SELECT - 1);
    esplodi('Conteggio fatture', error);

    const righe = (data ?? []) as { stato_effettivo: StatoFattura }[];
    const conta: Record<StatoFattura | 'tutte', number> = {
      tutte: righe.length,
      bozza: 0,
      emessa: 0,
      pagata_parziale: 0,
      pagata: 0,
      scaduta: 0,
    };
    for (const r of righe) if (r.stato_effettivo in conta) conta[r.stato_effettivo] += 1;
    return conta;
  },

  /**
   * Crea la fattura, poi le assegna il numero.
   *
   * In due tempi e non in uno: il numero lo dà la edge function
   * `numera-fattura`, che incrementa il progressivo sotto lock e non può
   * quindi darne due uguali a due schede aperte insieme. Finché la riga non ha
   * il suo numero porta un `TMP-…`, che il UNIQUE accetta perché è un uuid.
   *
   * Se la funzione non è deployata si ricade sul client: legge l'ultimo numero
   * e aggiunge uno. È la corsa che la funzione evita, ma con un solo utente non
   * si manifesta — e una schermata che non salva è peggio di un rischio raro.
   */
  async create(input: FatturaInput): Promise<Fattura> {
    // `chk_emessa` vuole tutte e due le date su una emessa: se il chiamante dà
    // solo l'emissione, la scadenza la mettiamo a 30 giorni invece di far
    // fallire l'insert con un messaggio da database.
    const dataScadenza =
      input.dataEmissione && !input.dataScadenza
        ? sommaGiorni(input.dataEmissione, 30)
        : input.dataScadenza;

    const numeroProvvisorio = `TMP-${crypto.randomUUID()}`;

    const { data, error } = await supabase
      .from(TABELLA)
      .insert(rigaDaFattura({ ...input, dataScadenza, numero: numeroProvvisorio }))
      .select('*')
      .single();
    esplodi('Creazione fattura', error);

    const creata = fatturaDaRiga(data as unknown as RigaFatturaDb);
    return fattureService.assegnaNumero(creata.id);
  },

  /**
   * Assegna il numero definitivo. Idempotente: su una fattura che ce l'ha già
   * non consuma un progressivo nuovo — vale sia per la funzione sia per il
   * fallback.
   */
  async assegnaNumero(id: string): Promise<Fattura> {
    const { error: erroreEdge } = await supabase.functions.invoke('numera-fattura', {
      body: { fatturaId: id },
    });

    if (!erroreEdge) return rileggi(id);

    const attuale = await rileggi(id);
    if (!attuale.numero.startsWith('TMP-')) return attuale;

    const numero = await prossimoNumero();
    const { error } = await supabase.from(TABELLA).update({ numero }).eq('id', id);
    esplodi('Assegnazione numero fattura', error);
    return rileggi(id);
  },

  async update(id: string, patch: Partial<FatturaInput>): Promise<Fattura> {
    const riga = rigaDaFattura(patch);
    // Un UPDATE senza colonne è un errore di PostgREST, non un no-op.
    if (Object.keys(riga).length > 0) {
      const { error } = await supabase.from(TABELLA).update(riga).eq('id', id);
      esplodi('Aggiornamento fattura', error);
    }
    return rileggi(id);
  },

  /** Emette una bozza: da qui in poi ha una data e una scadenza. */
  async emetti(
    id: string,
    opts: { dataEmissione?: string; giorniPagamento?: number } = {},
  ): Promise<Fattura> {
    const emissione = opts.dataEmissione ?? oggiIso();
    const { error } = await supabase
      .from(TABELLA)
      .update({
        stato: 'emessa',
        data_emissione: emissione,
        data_scadenza: sommaGiorni(emissione, opts.giorniPagamento ?? 30),
      })
      .eq('id', id);
    esplodi('Emissione fattura', error);
    return rileggi(id);
  },

  /**
   * Gli incassi stanno in una colonna JSONB: si rilegge l'array, si aggiunge,
   * si riscrive. Lo stato si aggiorna da sé, perché lo calcola la vista.
   *
   * Con un utente va bene. Con due che incassano nello stesso momento il
   * secondo sovrascrive il primo: è il punto in cui servirà una tabella
   * `incassi` vera — non prima, perché fin qui il JSONB fa risparmiare una
   * query su ogni fattura letta.
   */
  async registraIncasso(id: string, input: IncassoInput): Promise<Fattura> {
    const incassi = await arrayJson<IncassoInput & { id: string }>(id, 'incassi');
    const { error } = await supabase
      .from(TABELLA)
      .update({ incassi: [...incassi, { ...input, id: crypto.randomUUID() }] })
      .eq('id', id);
    esplodi('Registrazione incasso', error);
    return rileggi(id);
  },

  async rimuoviIncasso(id: string, incassoId: string): Promise<Fattura> {
    const incassi = await arrayJson<{ id: string }>(id, 'incassi');
    const { error } = await supabase
      .from(TABELLA)
      .update({ incassi: incassi.filter((i) => i.id !== incassoId) })
      .eq('id', id);
    esplodi('Eliminazione incasso', error);
    return rileggi(id);
  },

  async registraSollecito(id: string, input: SollecitoInput): Promise<Fattura> {
    const solleciti = await arrayJson<SollecitoInput & { id: string }>(id, 'solleciti');
    const { error } = await supabase
      .from(TABELLA)
      .update({ solleciti: [...solleciti, { ...input, id: crypto.randomUUID() }] })
      .eq('id', id);
    esplodi('Registrazione sollecito', error);
    return rileggi(id);
  },

  /** Soft-delete: la riga resta, esce dalle query e dalla vista. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLA)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    esplodi('Cancellazione fattura', error);
  },

  /**
   * Emette una fattura a partire da una commessa.
   *
   * `acconto` prende la percentuale dell'imponibile; `saldo` prende quello che
   * resta dopo gli acconti già emessi sulla stessa commessa — il calcolo che
   * nessuno vuole rifare a mano ogni volta, e che il database sa fare perché
   * gli imponibili sono una colonna.
   */
  async emettiDaCommessa(input: EmissioneDaCommessa): Promise<Fattura> {
    const giaFatturato = await fattureService.giaFatturatoSuCommessa(input.commessaId);

    const importo =
      input.tipo === 'saldo'
        ? Math.max(0, arrotonda(input.imponibile - giaFatturato))
        : arrotonda(input.imponibile * ((input.tipo === 'acconto' ? (input.percentuale ?? 30) : 100) / 100));

    const emissione = input.dataEmissione ?? oggiIso();

    return fattureService.create({
      tipo: input.tipo,
      clienteId: input.clienteId,
      commessaId: input.commessaId,
      dataEmissione: emissione,
      dataScadenza: sommaGiorni(emissione, input.giorniPagamento ?? 30),
      note: input.note,
      righe: [
        {
          descrizione: descrizioneDaCommessa(input),
          quantita: 1,
          prezzoUnitario: importo,
          aliquotaIva: input.aliquotaIva ?? ALIQUOTA_IVA_DEFAULT,
        },
      ],
    });
  },

  /**
   * Quanto imponibile è già stato fatturato su una commessa.
   *
   * Somma la colonna `imponibile` e non le righe JSONB: è la colonna che il
   * database mantiene a ogni scrittura, ed è quella su cui un domani si
   * potranno fare i conti in SQL senza tirarsi in casa le righe.
   */
  async giaFatturatoSuCommessa(commessaId: string): Promise<number> {
    const { data, error } = await supabase
      .from(TABELLA)
      .select('imponibile')
      .eq('commessa_id', commessaId)
      .not('data_emissione', 'is', null)
      .is('deleted_at', null);
    esplodi('Lettura fatturato della commessa', error);

    return arrotonda(
      (data ?? []).reduce((t, r) => t + num((r as { imponibile: number | string }).imponibile), 0),
    );
  },
};

/**
 * Quello che serve per fatturare una commessa.
 *
 * È un oggetto piatto e non una `Commessa`: così `commesseService` chiama
 * questa funzione senza che il modulo Fatture dipenda dal tipo `Commessa`, e i
 * due moduli restano scollegati come devono.
 */
export interface EmissioneDaCommessa {
  commessaId: string;
  clienteId: string;
  numeroCommessa: string;
  /** Imponibile pieno del lavoro: la percentuale la applica il service. */
  imponibile: number;
  tipo: TipoFattura;
  percentuale?: number;
  aliquotaIva?: number;
  dataEmissione?: string;
  giorniPagamento?: number;
  note?: string;
}

function descrizioneDaCommessa(input: EmissioneDaCommessa): string {
  const riferimento = `commessa ${input.numeroCommessa}`;
  if (input.tipo === 'acconto') return `Acconto ${input.percentuale ?? 30}% su ${riferimento}`;
  if (input.tipo === 'saldo') return `Saldo lavori, ${riferimento}`;
  return `Lavori come da ${riferimento}`;
}
