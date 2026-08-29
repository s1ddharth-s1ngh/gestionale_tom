import { commesseMock } from '@/mocks/commesse';
import type { FiltriBase, Foto, Paginato } from '@/types/comune';
import { impagina, ritardo } from '@/types/comune';
import type {
  Commessa,
  CommessaConCliente,
  CommessaFiltri,
  CommessaInput,
  Lavorazione,
  Rapportino,
  StatoCommessa,
} from '@/types/commessa';
import { avanzamentoDa, oreRealiDa } from '@/types/commessa';

/**
 * L'unico punto che tocca i dati delle commesse.
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
let commesse: Commessa[] = commesseMock.map((c) => ({ ...c }));

/**
 * Riporta i derivati in accordo con le lavorazioni.
 *
 * Passa di qui OGNI scrittura, senza eccezioni: è l'unico motivo per cui
 * `oreReali` e `avanzamentoPct` si possono leggere senza ricalcolarli, e basta
 * una scrittura che salta il ricalcolo perché tornino a mentire.
 */
function ricalcola(c: Commessa): Commessa {
  return {
    ...c,
    oreReali: oreRealiDa(c.lavorazioni),
    avanzamentoPct: avanzamentoDa(c.lavorazioni),
  };
}

/** Progressivo annuale: `CM-2026-0007`. Il massimo dell'anno più uno, non il
 *  conteggio delle righe — cancellarne una non deve riassegnare un numero già usato. */
function prossimoNumero(): string {
  const anno = new Date().getFullYear();
  const prefisso = `CM-${anno}-`;
  const ultimo = commesse
    .filter((c) => c.numero.startsWith(prefisso))
    .map((c) => Number(c.numero.slice(prefisso.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefisso}${String(ultimo + 1).padStart(4, '0')}`;
}

/** Id locali: con un backend li genera il database, e questa funzione sparisce. */
let contatoreId = commesse.length;
function nuovoId(prefisso: string): string {
  contatoreId += 1;
  return `${prefisso}-${String(contatoreId).padStart(3, '0')}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Ordinamento di default: le pianificate più vicine in cima, poi quelle senza
 * data. Chi apre l'elenco vuole sapere cosa succede adesso, non cosa è successo.
 */
function perDataPianificata(a: Commessa, b: Commessa): number {
  if (!a.dataPianificata && !b.dataPianificata) return b.numero.localeCompare(a.numero);
  if (!a.dataPianificata) return 1; // le non pianificate in fondo, non in cima
  if (!b.dataPianificata) return -1;
  return b.dataPianificata.localeCompare(a.dataPianificata);
}

/**
 * PROVVISORIO — TODO(chat A): sparisce quando esiste `clientiService`, e le due
 * righe di `conCliente` diventano una sua lettura.
 *
 * Sta qui e non nei mock delle commesse perché è anagrafica di qualcun altro:
 * il giorno che l'originale esiste si cancella questa mappa e non si tocca
 * nient'altro. L'alternativa — mostrare `cli-03` in tabella finché la chat A non
 * arriva — renderebbe elenco e calendario impossibili da giudicare a schermo,
 * che è l'unico modo che abbiamo di sapere se funzionano.
 */
const ANAGRAFICA_PROVVISORIA: Record<string, { cliente: string; luoghi: Record<string, string> }> = {
  'cli-01': { cliente: 'Condominio Via Battisti 14', luoghi: { 'lgo-01-1': 'Cortile interno' } },
  'cli-02': {
    cliente: 'Comune di Casalecchio di Reno',
    luoghi: { 'lgo-02-1': 'Viale Carducci', 'lgo-02-2': 'Parco della Chiusa' },
  },
  'cli-03': { cliente: 'Az. Agricola Ferrari Luca', luoghi: { 'lgo-03-1': 'Podere Le Fontane' } },
  'cli-04': { cliente: 'Villa Monteveglio', luoghi: { 'lgo-04-1': 'Parco della villa' } },
  'cli-05': { cliente: 'Condominio Le Querce', luoghi: { 'lgo-05-1': 'Area verde condominiale' } },
  'cli-06': { cliente: 'Hotel San Luca', luoghi: { 'lgo-06-1': 'Giardino e siepe perimetrale' } },
  'cli-07': { cliente: "Parrocchia di Sant'Agata", luoghi: { 'lgo-07-1': 'Viale dei cipressi' } },
  'cli-08': { cliente: 'Gandolfi Marco', luoghi: { 'lgo-08-1': 'Giardino privato' } },
  'cli-09': {
    cliente: 'Logistica Emiliana Trasporti e Magazzinaggio S.r.l.',
    luoghi: { 'lgo-09-1': 'Piazzale e area di manovra' },
  },
};

/** Aggiunge alla commessa i due campi che elenco e calendario devono mostrare. */
function conCliente(c: Commessa): CommessaConCliente {
  const voce = ANAGRAFICA_PROVVISORIA[c.clienteId];
  return {
    ...c,
    clienteDenominazione: voce?.cliente ?? c.clienteId,
    luogoEtichetta: voce?.luoghi[c.luogoInterventoId] ?? c.luogoInterventoId,
  };
}

function trova(id: string): Commessa {
  const c = commesse.find((x) => x.id === id);
  if (!c) throw new Error(`Commessa ${id} non trovata`);
  return c;
}

/** Sostituisce la commessa in elenco ricalcolando i derivati, e la restituisce. */
function scrivi(id: string, patch: Partial<Commessa>): Commessa {
  const aggiornata = ricalcola({ ...trova(id), ...patch });
  commesse = commesse.map((c) => (c.id === id ? aggiornata : c));
  return aggiornata;
}

export const commesseService = {
  async list(filtri?: CommessaFiltri): Promise<Paginato<CommessaConCliente>> {
    await ritardo();

    // Il join col cliente sta PRIMA del filtro, o la ricerca per nome non
    // troverebbe niente: `q` deve poter cercare su un campo che ancora non c'è.
    let righe = commesse.map(conCliente);

    if (filtri?.stato) righe = righe.filter((c) => c.stato === filtri.stato);
    if (filtri?.clienteId) righe = righe.filter((c) => c.clienteId === filtri.clienteId);

    // Finestra sulla data pianificata: la usa il calendario per chiedere il mese.
    // Le commesse senza data non appartengono a nessun mese e restano fuori.
    if (filtri?.dal) righe = righe.filter((c) => !!c.dataPianificata && c.dataPianificata >= filtri.dal!);
    if (filtri?.al) righe = righe.filter((c) => !!c.dataPianificata && c.dataPianificata <= filtri.al!);

    if (filtri?.q) {
      const q = filtri.q.trim().toLowerCase();
      righe = righe.filter(
        (c) =>
          c.numero.toLowerCase().includes(q) ||
          c.clienteDenominazione.toLowerCase().includes(q) ||
          c.luogoEtichetta.toLowerCase().includes(q) ||
          (c.note?.toLowerCase().includes(q) ?? false) ||
          c.lavorazioni.some((l) => l.descrizione.toLowerCase().includes(q)),
      );
    }

    return impagina([...righe].sort(perDataPianificata), filtri as FiltriBase);
  },

  async getById(id: string): Promise<CommessaConCliente | null> {
    await ritardo(200);
    const c = commesse.find((x) => x.id === id);
    return c ? conCliente(c) : null;
  },

  /** Le commesse di un cliente, per lo storico interventi nella sua scheda. */
  async listPerCliente(clienteId: string): Promise<CommessaConCliente[]> {
    await ritardo(200);
    return commesse
      .filter((c) => c.clienteId === clienteId)
      .sort(perDataPianificata)
      .map(conCliente);
  },

  async create(input: CommessaInput): Promise<Commessa> {
    await ritardo(400);
    const nuova = ricalcola({
      id: nuovoId('cm'),
      numero: prossimoNumero(),
      preventivoId: input.preventivoId,
      clienteId: input.clienteId,
      luogoInterventoId: input.luogoInterventoId,
      // Lo stato non si sceglie: una commessa con una data è pianificata, senza è
      // da pianificare. Lasciarlo scegliere significa elenchi che si contraddicono.
      stato: input.dataPianificata ? 'pianificata' : 'da_pianificare',
      dataPianificata: input.dataPianificata,
      orePreviste: input.orePreviste,
      oreReali: 0,
      lavorazioni: input.lavorazioni.map((l) => ({ ...l, id: nuovoId('lv') })),
      fotoPrima: [],
      fotoDopo: [],
      avanzamentoPct: 0,
      note: input.note,
    });
    commesse = [nuova, ...commesse];
    return nuova;
  },

  async update(id: string, patch: Partial<CommessaInput>): Promise<Commessa> {
    await ritardo(400);
    const attuale = trova(id);
    return scrivi(id, {
      ...patch,
      // Le lavorazioni in ingresso possono essere nuove (senza id) o esistenti:
      // le prime ne ricevono uno, le seconde tengono il loro o perdono le ore già
      // consuntivate.
      lavorazioni: patch.lavorazioni
        ? patch.lavorazioni.map((l) => ({ ...l, id: (l as Lavorazione).id ?? nuovoId('lv') }))
        : attuale.lavorazioni,
    });
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    commesse = commesse.filter((c) => c.id !== id);
  },

  // ── Il ciclo di vita ───────────────────────────────────────────────────────
  // Transizioni esplicite invece di un `update({stato})` libero: così l'insieme
  // dei passaggi possibili si legge qui, e non va ricostruito leggendo le pagine.

  /** Mette la commessa a calendario. È anche il modo per spostarla di giorno. */
  async pianifica(id: string, data: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      dataPianificata: data,
      // Una commessa già avviata che si sposta di data resta in corso: la
      // ripianificazione non annulla il lavoro già fatto.
      stato: attuale.stato === 'da_pianificare' ? 'pianificata' : attuale.stato,
    });
  },

  async avvia(id: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      stato: 'in_corso',
      dataInizio: attuale.dataInizio ?? oggi(),
      // Avviare una commessa mai pianificata la data ce l'ha comunque: è oggi.
      dataPianificata: attuale.dataPianificata ?? oggi(),
    });
  },

  async sospendi(id: string, motivo?: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      stato: 'sospesa',
      note: motivo ? [attuale.note, motivo].filter(Boolean).join('\n') : attuale.note,
    });
  },

  /** Riprende una sospesa: torna in corso se era già iniziata, pianificata se no. */
  async riprendi(id: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, { stato: attuale.dataInizio ? 'in_corso' : 'pianificata' });
  },

  async annulla(id: string, motivo?: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, {
      stato: 'annullata',
      note: motivo ? [attuale.note, motivo].filter(Boolean).join('\n') : attuale.note,
    });
  },

  async completa(id: string): Promise<Commessa> {
    await ritardo(300);
    const attuale = trova(id);
    return scrivi(id, { stato: 'completata', dataFine: attuale.dataFine ?? oggi() });
  },

  // ── Il lavoro sul campo ────────────────────────────────────────────────────

  /**
   * Sostituisce l'elenco delle lavorazioni: ore reali e avanzamento si aggiornano
   * di conseguenza, perché passa da `scrivi`.
   */
  async aggiornaLavorazioni(id: string, lavorazioni: Lavorazione[]): Promise<Commessa> {
    await ritardo(250);
    return scrivi(id, { lavorazioni });
  },

  async salvaFoto(id: string, quando: 'prima' | 'dopo', foto: Foto[]): Promise<Commessa> {
    await ritardo(300);
    return scrivi(id, quando === 'prima' ? { fotoPrima: foto } : { fotoDopo: foto });
  },

  /**
   * Salva il rapportino. Se il cliente ha firmato la commessa si chiude: la firma
   * È la conclusione del lavoro, e chiedere anche un click su «completa» significa
   * ritrovarsi commesse firmate e ancora aperte.
   */
  async salvaRapportino(id: string, rapportino: Rapportino): Promise<Commessa> {
    await ritardo(400);
    const firmato = !!rapportino.firmaCliente;
    const attuale = trova(id);
    return scrivi(id, {
      rapportino,
      stato: firmato ? 'completata' : attuale.stato,
      dataFine: firmato ? (attuale.dataFine ?? rapportino.dataCompilazione) : attuale.dataFine,
      // Firmare chiude tutte le lavorazioni: il rapportino dice che il lavoro è
      // finito, e un avanzamento all'80% su una commessa firmata è una svista.
      lavorazioni: firmato
        ? attuale.lavorazioni.map((l) => ({ ...l, completata: true, oreReali: l.oreReali ?? l.orePreviste }))
        : attuale.lavorazioni,
    });
  },

  /** Conteggi per le pill di filtro. Vengono dall'archivio intero, non dalla
   *  pagina corrente: un contatore che cambia cambiando pagina non è un contatore. */
  async contaPerStato(): Promise<Record<StatoCommessa | 'tutte', number>> {
    await ritardo(150);
    const conta = {
      tutte: commesse.length,
      da_pianificare: 0,
      pianificata: 0,
      in_corso: 0,
      completata: 0,
      sospesa: 0,
      annullata: 0,
    };
    for (const c of commesse) conta[c.stato] += 1;
    return conta;
  },

  // TODO(chat B): `creaDaPreventivo(preventivo)` — non ancora scrivibile, il tipo
  // `Preventivo` non esiste. Arriva col modulo Preventivi, insieme al corpo di
  // `convertiInCommessa` in preventiviService.

  // TODO(chat D): `generaFattura(id)` — la aggancia il modulo Fatture, che decide
  // acconto o saldo. Qui resterà solo la scrittura di `fatturaId`.
};

/** Oggi in ISO `AAAA-MM-GG`, coerente con come sono scritte tutte le date. */
function oggi(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
