import { commesseMock } from '@/mocks/commesse';
import { clientiService } from '@/services/clientiService';
import { fattureService } from '@/services/fattureService';
import type { TipoFattura } from '@/types/fattura';
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
import type { Preventivo } from '@/types/preventivo';
import { oreStimate } from '@/types/preventivo';

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
 * Il join con l'anagrafica clienti.
 *
 * Una lettura sola dell'elenco completo e poi una mappa, invece di un
 * `getById` per riga: venti righe sarebbero venti chiamate, e con un backend
 * vero diventerebbero venti round-trip per una tabella. Qui è la stessa forma
 * che avrà una JOIN.
 *
 * Il fallback sull'id non è pigrizia: una commessa il cui cliente è stato
 * cancellato deve restare leggibile e dire quale riferimento ha perso, non
 * sparire dall'elenco.
 */
async function risolutoreCliente(): Promise<(c: Commessa) => CommessaConCliente> {
  const clienti = await clientiService.listaCompleta();
  const perId = new Map(clienti.map((cl) => [cl.id, cl]));

  return (c) => {
    const cliente = perId.get(c.clienteId);
    const luogo = cliente?.luoghiIntervento.find((l) => l.id === c.luogoInterventoId);
    return {
      ...c,
      clienteDenominazione: cliente?.denominazione ?? c.clienteId,
      luogoEtichetta: luogo?.etichetta ?? c.luogoInterventoId,
    };
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
    // troverebbe niente: `q` cerca su un campo che prima del join non esiste.
    const conCliente = await risolutoreCliente();
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
    if (!c) return null;
    const conCliente = await risolutoreCliente();
    return conCliente(c);
  },

  /** Le commesse di un cliente, per lo storico interventi nella sua scheda. */
  async listPerCliente(clienteId: string): Promise<CommessaConCliente[]> {
    await ritardo(200);
    const conCliente = await risolutoreCliente();
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

  /**
   * Crea la commessa che nasce da un preventivo accettato.
   *
   * Ogni riga del preventivo diventa una lavorazione, comprese quelle che non
   * sono ore: «smaltimento a corpo» è lavoro che qualcuno deve spuntare come
   * fatto, e tenerlo fuori perché non ha un monte ore lo farebbe sparire dal
   * rapportino. Quelle righe entrano con zero ore previste — è vero, non è un
   * segnaposto: il loro costo sta nel preventivo, non nel tempo.
   *
   * Le ore previste totali sono quelle stimate dal preventivo e non la somma
   * delle lavorazioni: le due coincidono oggi, ma la prima è l'impegno preso
   * col cliente, e deve restare ferma anche se in cantiere le lavorazioni
   * vengono risistemate.
   *
   * Non tocca il preventivo. È `preventiviService.convertiInCommessa` a
   * scrivere `commessaId` e portarlo ad accettato: due service che si scrivono
   * a vicenda sono due posti da cui può partire una conversione a metà.
   */
  async creaDaPreventivo(preventivo: Preventivo): Promise<Commessa> {
    await ritardo(400);
    const nuova = ricalcola({
      id: nuovoId('cm'),
      numero: prossimoNumero(),
      preventivoId: preventivo.id,
      clienteId: preventivo.clienteId,
      luogoInterventoId: preventivo.luogoInterventoId,
      // Nasce da pianificare: la data la decide chi organizza le squadre, non
      // la conversione. Metterci quella del preventivo riempirebbe il
      // calendario di giorni che nessuno ha scelto.
      stato: 'da_pianificare',
      orePreviste: oreStimate(preventivo.righe),
      oreReali: 0,
      lavorazioni: preventivo.righe.map((r) => ({
        id: nuovoId('lv'),
        descrizione: r.descrizione,
        orePreviste: r.unita === 'ore' ? r.quantita : 0,
        completata: false,
      })),
      fotoPrima: [],
      fotoDopo: [],
      avanzamentoPct: 0,
      // Le note del preventivo servono in cantiere quanto in trattativa:
      // «accesso mezzi difficile» è scritto lì e va letto qui.
      note: preventivo.note,
    });
    commesse = [nuova, ...commesse];
    return nuova;
  },

  /**
   * Emette una fattura per la commessa e ne conserva il riferimento.
   *
   * L'imponibile è un parametro e non un campo della commessa: la commessa
   * conosce le ore, non il prezzo concordato — quello sta sul preventivo o lo
   * decide chi fattura. Il calcolo di acconto e saldo lo fa `fattureService`,
   * qui resta la sola scrittura di `fatturaId`.
   */
  async generaFattura(
    id: string,
    opts: { tipo: TipoFattura; imponibile: number; percentuale?: number; note?: string },
  ): Promise<{ fatturaId: string; numero: string }> {
    const c = trova(id);

    const fattura = await fattureService.emettiDaCommessa({
      commessaId: c.id,
      clienteId: c.clienteId,
      numeroCommessa: c.numero,
      imponibile: opts.imponibile,
      tipo: opts.tipo,
      percentuale: opts.percentuale,
      note: opts.note,
    });

    // Solo il saldo e la fattura unica chiudono la commessa: dopo un acconto
    // resta da fatturare, e sovrascrivere il riferimento perderebbe il legame
    // con l'acconto appena emesso.
    if (opts.tipo !== 'acconto') scrivi(id, { fatturaId: fattura.id });

    return { fatturaId: fattura.id, numero: fattura.numero };
  },
};

/** Oggi in ISO `AAAA-MM-GG`, coerente con come sono scritte tutte le date. */
function oggi(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
