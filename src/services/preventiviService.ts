import { preventiviMock } from '@/mocks/preventivi';
import { commesseService } from '@/services/commesseService';
import type { FiltriBase, Paginato } from '@/types/comune';
import { impagina, ritardo } from '@/types/comune';
import type {
  Preventivo,
  PreventivoFiltri,
  PreventivoInput,
  RigaPreventivo,
  SchedaSopralluogo,
  StatoPreventivo,
} from '@/types/preventivo';
import { STATI_PREVENTIVO, calcolaImporto, calcolaTotali, statoEffettivo } from '@/types/preventivo';

/**
 * L'unico punto che tocca i dati dei preventivi.
 *
 * Oggi legge un array in memoria, domani una `fetch`: le firme sono già quelle
 * che avranno con un backend vero — filtri e paginazione sono parametri, non
 * lavoro che si fa nel componente. Per questo `list()` torna un `Paginato` e
 * non un array: il giorno del backend la pagina non cambia di una riga.
 *
 * Le modifiche vivono nella sessione e si perdono al reload. È voluto: si vede
 * l'effetto delle proprie azioni navigando, e si riparte puliti ricaricando.
 */

/** Copia mutabile: il mock resta il punto di partenza a ogni ricarica di pagina. */
let preventivi: Preventivo[] = preventiviMock.map((p) => ({ ...p }));

function oggi(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function adesso(): string {
  return new Date().toISOString();
}

/**
 * Riporta importi e totali in accordo con le righe.
 *
 * Passa di qui OGNI scrittura, senza eccezioni: è l'unico motivo per cui
 * `imponibile` e `totale` si possono leggere senza ricalcolarli, e basta una
 * scrittura che salta il ricalcolo perché tornino a mentire.
 */
function ricalcola(p: Preventivo): Preventivo {
  const righe = p.righe.map((r) => ({ ...r, importo: calcolaImporto(r) }));
  const { imponibile, totale } = calcolaTotali(righe, p.aliquotaIva);
  return { ...p, righe, imponibile, totale, aggiornatoIl: adesso() };
}

/** Progressivo annuale: `PR-2026-0031`. Il massimo dell'anno più uno, non il
 *  conteggio delle righe — cancellarne uno non deve riassegnare un numero già usato. */
function prossimoNumero(): string {
  const anno = new Date().getFullYear();
  const prefisso = `PR-${anno}-`;
  const ultimo = preventivi
    .filter((p) => p.numero.startsWith(prefisso))
    .map((p) => Number(p.numero.slice(prefisso.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefisso}${String(ultimo + 1).padStart(4, '0')}`;
}

/** Id locali: con un backend li genera il database, e questa funzione sparisce. */
let contatoreId = preventivi.length;
function nuovoId(prefisso: string): string {
  contatoreId += 1;
  return `${prefisso}-${String(contatoreId).padStart(3, '0')}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Ordinamento di default: il più recente in cima. Su un preventivo si lavora nei
 * giorni subito dopo averlo scritto, e quello che serve è sempre in alto.
 * A parità di data decide il numero, o l'ordine balla a ogni ricarica.
 */
function perDataEmissione(a: Preventivo, b: Preventivo): number {
  if (a.dataEmissione === b.dataEmissione) return b.numero.localeCompare(a.numero);
  return b.dataEmissione.localeCompare(a.dataEmissione);
}

function trova(id: string): Preventivo {
  const p = preventivi.find((x) => x.id === id);
  if (!p) throw new Error(`Preventivo ${id} non trovato`);
  return p;
}

/** Sostituisce il preventivo in elenco ricalcolando i derivati, e lo restituisce. */
function scrivi(id: string, patch: Partial<Preventivo>): Preventivo {
  const aggiornato = ricalcola({ ...trova(id), ...patch });
  preventivi = preventivi.map((p) => (p.id === id ? aggiornato : p));
  return aggiornato;
}

/** Le righe in ingresso non hanno id né importo: glieli dà il service. */
function componiRighe(righe: PreventivoInput['righe']): RigaPreventivo[] {
  return righe.map((r) => ({
    ...r,
    id: (r as Partial<RigaPreventivo>).id ?? nuovoId('rp'),
    importo: calcolaImporto(r),
  }));
}

/** Gli alberi del rilievo, stessa storia delle righe. */
function componiSopralluogo(s: SchedaSopralluogo): SchedaSopralluogo {
  return { ...s, alberi: s.alberi.map((a) => ({ ...a, id: a.id || nuovoId('ra') })) };
}

/**
 * I filtri che NON dipendono dallo stato. Li applica sia `list` sia
 * `contaPerStato`: i contatori delle pill devono contare dentro la ricerca
 * corrente, o mostrerebbero numeri che non c'entrano con quello che si vede.
 */
function applicaFiltriBase(righe: Preventivo[], filtri?: PreventivoFiltri): Preventivo[] {
  let out = righe;
  if (filtri?.clienteId) out = out.filter((p) => p.clienteId === filtri.clienteId);
  if (filtri?.q) {
    const q = filtri.q.trim().toLowerCase();
    // TODO(chat A): quando esiste `clientiService`, la ricerca copre anche la
    // denominazione del cliente e l'etichetta del luogo. Il join va fatto qui e
    // non nella pagina: con un backend vero diventa una condizione della query.
    out = out.filter(
      (p) =>
        p.numero.toLowerCase().includes(q) ||
        (p.note?.toLowerCase().includes(q) ?? false) ||
        p.righe.some((r) => r.descrizione.toLowerCase().includes(q)) ||
        p.sopralluogo.alberi.some((a) => a.specie.toLowerCase().includes(q)),
    );
  }
  return out;
}

export const preventiviService = {
  async list(filtri?: PreventivoFiltri): Promise<Paginato<Preventivo>> {
    await ritardo();

    let righe = applicaFiltriBase(preventivi, filtri);

    // Il confronto è sullo stato EFFETTIVO e non su `p.stato`: `scaduto` non
    // esiste fra i valori salvati, quindi filtrare sul campo grezzo darebbe
    // sempre zero risultati sulla pill «Scaduti» e lascerebbe gli scaduti
    // mescolati agli inviati.
    if (filtri?.stato) {
      const g = oggi();
      righe = righe.filter((p) => statoEffettivo(p, g) === filtri.stato);
    }

    return impagina([...righe].sort(perDataEmissione), filtri as FiltriBase);
  },

  async getById(id: string): Promise<Preventivo | null> {
    await ritardo(200);
    return preventivi.find((p) => p.id === id) ?? null;
  },

  /** I preventivi di un cliente, per la sezione dedicata nella sua scheda. */
  async listPerCliente(clienteId: string): Promise<Preventivo[]> {
    await ritardo(200);
    return preventivi.filter((p) => p.clienteId === clienteId).sort(perDataEmissione);
  },

  /**
   * Quanti preventivi per stato, dentro la ricerca corrente.
   *
   * Sta nel service e non nella pagina perché con un backend vero è una query
   * di aggregazione: contarli in pagina vorrebbe dire scaricare tutto l'archivio
   * per mettere un numero dentro una pillola.
   */
  async contaPerStato(
    filtri?: Omit<PreventivoFiltri, 'stato' | 'pagina' | 'perPagina'>,
  ): Promise<Record<StatoPreventivo, number>> {
    await ritardo(150);
    const g = oggi();
    const righe = applicaFiltriBase(preventivi, filtri);
    const conta = Object.fromEntries(STATI_PREVENTIVO.map((s) => [s, 0])) as Record<
      StatoPreventivo,
      number
    >;
    for (const p of righe) conta[statoEffettivo(p, g)] += 1;
    return conta;
  },

  async create(input: PreventivoInput): Promise<Preventivo> {
    await ritardo(400);
    const righe = componiRighe(input.righe);
    const { imponibile, totale } = calcolaTotali(righe, input.aliquotaIva);
    const nuovo: Preventivo = {
      id: nuovoId('pr'),
      numero: prossimoNumero(),
      clienteId: input.clienteId,
      luogoInterventoId: input.luogoInterventoId,
      // Un preventivo nasce SEMPRE in bozza: si invia con un gesto esplicito,
      // e quel gesto è quello che scrive la data di invio.
      stato: 'bozza',
      dataEmissione: input.dataEmissione,
      validoFino: input.validoFino,
      sopralluogo: componiSopralluogo(input.sopralluogo),
      righe,
      imponibile,
      aliquotaIva: input.aliquotaIva,
      totale,
      note: input.note,
      creatoIl: adesso(),
      aggiornatoIl: adesso(),
    };
    preventivi = [nuovo, ...preventivi];
    return nuovo;
  },

  async update(id: string, patch: Partial<PreventivoInput>): Promise<Preventivo> {
    await ritardo(400);
    const attuale = trova(id);
    return scrivi(id, {
      clienteId: patch.clienteId ?? attuale.clienteId,
      luogoInterventoId: patch.luogoInterventoId ?? attuale.luogoInterventoId,
      dataEmissione: patch.dataEmissione ?? attuale.dataEmissione,
      validoFino: patch.validoFino ?? attuale.validoFino,
      aliquotaIva: patch.aliquotaIva ?? attuale.aliquotaIva,
      note: patch.note ?? attuale.note,
      sopralluogo: patch.sopralluogo ? componiSopralluogo(patch.sopralluogo) : attuale.sopralluogo,
      // Le righe in ingresso possono essere nuove (senza id) o esistenti: le
      // prime ne ricevono uno, le seconde tengono il loro.
      righe: patch.righe ? componiRighe(patch.righe) : attuale.righe,
    });
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    preventivi = preventivi.filter((p) => p.id !== id);
  },

  // ── Il ciclo di vita ───────────────────────────────────────────────────────
  // Transizioni esplicite invece di un `update({stato})` libero: così l'insieme
  // dei passaggi possibili si legge qui, e non va ricostruito leggendo le pagine.
  //
  // `scaduto` non compare qui, e non è una dimenticanza: non è uno stato che si
  // sceglie, è quello che diventa un inviato quando passa la sua validità.

  /** Manda il preventivo al cliente. È il gesto che fissa la data di invio. */
  async invia(id: string): Promise<Preventivo> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      stato: 'inviato',
      // Un rinvio dopo una correzione non riscrive la data del primo invio.
      dataInvio: attuale.dataInvio ?? oggi(),
    });
  },

  async accetta(id: string): Promise<Preventivo> {
    await ritardo(300);
    return scrivi(id, { stato: 'accettato', dataEsito: oggi() });
  },

  async rifiuta(id: string, motivo?: string): Promise<Preventivo> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      stato: 'rifiutato',
      dataEsito: oggi(),
      note: motivo ? [attuale.note, motivo].filter(Boolean).join('\n') : attuale.note,
    });
  },

  /**
   * Riporta in bozza un preventivo inviato o scaduto, per correggerlo e
   * rimandarlo. Azzera la data di invio: quello che ripartirà è un altro
   * documento, e tenersi la data vecchia farebbe sembrare inviato qualcosa che
   * il cliente non ha ancora visto.
   */
  async riportaInBozza(id: string): Promise<Preventivo> {
    await ritardo(300);
    return scrivi(id, { stato: 'bozza', dataInvio: undefined, dataEsito: undefined });
  },

  // ── L'aggancio alle commesse ───────────────────────────────────────────────

  /**
   * Trasforma il preventivo accettato in una commessa.
   *
   * Un preventivo già convertito non ne genera una seconda: restituisce quella
   * che ha. Il doppio click sul bottone è la norma, non l'eccezione, e senza
   * questo controllo produrrebbe due commesse per lo stesso lavoro.
   *
   * L'accettazione è implicita nella conversione: si converte quello che il
   * cliente ha detto di sì, e chiedere prima un passaggio ad `accettato`
   * lascerebbe in giro preventivi inviati con una commessa attaccata.
   */
  async convertiInCommessa(preventivoId: string): Promise<{ commessaId: string }> {
    await ritardo(200);
    const p = trova(preventivoId);
    if (p.commessaId) return { commessaId: p.commessaId };

    const commessa = await commesseService.creaDaPreventivo(p);
    scrivi(preventivoId, {
      commessaId: commessa.id,
      stato: 'accettato',
      dataEsito: p.dataEsito ?? new Date().toISOString().slice(0, 10),
    });
    return { commessaId: commessa.id };
  },
};
