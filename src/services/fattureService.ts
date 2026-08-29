import { fattureMock } from '@/mocks/fatture';
import { clientiMock } from '@/mocks/clienti';
import type { FiltriBase, Paginato } from '@/types/comune';
import { impagina, ritardo } from '@/types/comune';
import type {
  Fattura,
  FatturaFiltri,
  FatturaInput,
  IncassoInput,
  RigaFattura,
  SollecitoInput,
  StatoFattura,
  TipoFattura,
} from '@/types/fattura';
import {
  ALIQUOTA_IVA_DEFAULT,
  calcolaStatoFattura,
  imponibileFattura,
  incassato,
  ivaFattura,
  residuo,
  totaleFattura,
} from '@/types/fattura';
import { matchesSearch, nuovoId } from '@/lib/utils';

/**
 * L'unico punto che tocca i dati delle fatture.
 *
 * Oggi legge un array in memoria, domani una `fetch`: le firme sono già quelle
 * che avranno con un backend vero — filtri, ricerca e paginazione sono
 * parametri, non lavoro fatto nel componente.
 *
 * Le modifiche vivono nella sessione e si perdono al reload. È voluto: si vede
 * l'effetto delle proprie azioni navigando, e si riparte puliti ricaricando.
 */

/** Copia mutabile: il mock resta il punto di partenza a ogni ricarica di pagina. */
let fatture: Fattura[] = fattureMock.map((f) => ({ ...f }));

/**
 * La fattura come la vogliono elenco, scadenzario e dettaglio: con i derivati
 * già calcolati e il nome del cliente già risolto.
 *
 * I derivati si calcolano qui e non nei componenti perché sono la stessa
 * verità in quattro schermate: quattro `reduce` scritti in quattro posti
 * diventano quattro totali leggermente diversi appena si tocca l'IVA.
 */
export interface FatturaConCliente extends Fattura {
  clienteDenominazione: string;
  imponibile: number;
  iva: number;
  totale: number;
  incassato: number;
  residuo: number;
  stato: StatoFattura;
  /** Negativo se scaduta, positivo se ancora nei termini, `null` senza scadenza. */
  giorniAllaScadenza: number | null;
}

/**
 * TODO(chat A): diventa una lettura di `clientiService` quando esiste. Finché
 * la fattura mostra `cli-003` invece del nome, elenco e scadenzario non si
 * possono giudicare a schermo — che è l'unico modo che abbiamo di sapere se
 * funzionano.
 */
function denominazione(clienteId: string): string {
  return clientiMock.find((c) => c.id === clienteId)?.denominazione ?? clienteId;
}

function giorniAllaScadenza(dataScadenza: string | undefined, oggi: Date): number | null {
  if (!dataScadenza) return null;
  const scadenza = new Date(dataScadenza);
  scadenza.setHours(12, 0, 0, 0);
  const riferimento = new Date(oggi);
  riferimento.setHours(12, 0, 0, 0);
  return Math.round((scadenza.getTime() - riferimento.getTime()) / 86_400_000);
}

/**
 * `oggi` si passa una volta sola per tutta la lista: valutare cento fatture
 * contro cento istanti diversi è il modo per avere una riga «scaduta» e la sua
 * gemella no, a mezzanotte in punto.
 */
function arricchisci(f: Fattura, oggi: Date): FatturaConCliente {
  const totale = totaleFattura(f.righe);
  const riscosso = incassato(f.incassi);

  return {
    ...f,
    clienteDenominazione: denominazione(f.clienteId),
    imponibile: imponibileFattura(f.righe),
    iva: ivaFattura(f.righe),
    totale,
    incassato: riscosso,
    residuo: residuo(f),
    stato: calcolaStatoFattura(f, oggi),
    giorniAllaScadenza: giorniAllaScadenza(f.dataScadenza, oggi),
  };
}

function trova(id: string): Fattura {
  const f = fatture.find((x) => x.id === id);
  if (!f) throw new Error(`Fattura ${id} non trovata`);
  return f;
}

function scrivi(id: string, patch: Partial<Fattura>): Fattura {
  const aggiornata: Fattura = { ...trova(id), ...patch, aggiornataIl: new Date().toISOString() };
  fatture = fatture.map((f) => (f.id === id ? aggiornata : f));
  return aggiornata;
}

/** FT-AAAA-NNNN: progressivo annuale, e l'anno lo decide la data di emissione. */
function prossimoNumero(): string {
  const anno = new Date().getFullYear();
  const prefisso = `FT-${anno}-`;
  const ultimo = fatture
    .filter((f) => f.numero.startsWith(prefisso))
    .map((f) => Number(f.numero.slice(prefisso.length)))
    .reduce((max, n) => (Number.isFinite(n) && n > max ? n : max), 0);
  return `${prefisso}${String(ultimo + 1).padStart(4, '0')}`;
}

function conIdRighe(righe: Omit<RigaFattura, 'id'>[]): RigaFattura[] {
  return righe.map((r) => ({ ...r, id: nuovoId() }));
}

/** Le più recenti in cima: chi apre l'elenco cerca quasi sempre l'ultima emessa.
 *  Le bozze non hanno data di emissione e restano in testa, dove servono. */
function perData(a: Fattura, b: Fattura): number {
  if (!a.dataEmissione && !b.dataEmissione) return b.numero.localeCompare(a.numero);
  if (!a.dataEmissione) return -1;
  if (!b.dataEmissione) return 1;
  return b.dataEmissione.localeCompare(a.dataEmissione);
}

export const fattureService = {
  async list(filtri?: FatturaFiltri): Promise<Paginato<FatturaConCliente>> {
    await ritardo();
    const oggi = new Date();

    // L'arricchimento sta PRIMA del filtro: `stato` e il nome del cliente sono
    // derivati, e su un campo che non esiste ancora non si può filtrare.
    let righe = fatture.map((f) => arricchisci(f, oggi));

    if (filtri?.stato) righe = righe.filter((f) => f.stato === filtri.stato);
    if (filtri?.clienteId) righe = righe.filter((f) => f.clienteId === filtri.clienteId);
    if (filtri?.commessaId) righe = righe.filter((f) => f.commessaId === filtri.commessaId);
    if (filtri?.dal) righe = righe.filter((f) => !!f.dataScadenza && f.dataScadenza >= filtri.dal!);
    if (filtri?.al) righe = righe.filter((f) => !!f.dataScadenza && f.dataScadenza <= filtri.al!);

    if (filtri?.q) {
      righe = righe.filter((f) =>
        matchesSearch(filtri.q!, f.numero, f.clienteDenominazione, f.note, ...f.righe.map((r) => r.descrizione)),
      );
    }

    return impagina([...righe].sort(perData), filtri as FiltriBase);
  },

  async getById(id: string): Promise<FatturaConCliente | null> {
    await ritardo(200);
    const f = fatture.find((x) => x.id === id);
    return f ? arricchisci(f, new Date()) : null;
  },

  /** Le fatture di un cliente, per la sezione «Fatture» della sua scheda. */
  async listPerCliente(clienteId: string): Promise<FatturaConCliente[]> {
    await ritardo(200);
    const oggi = new Date();
    return fatture
      .filter((f) => f.clienteId === clienteId)
      .sort(perData)
      .map((f) => arricchisci(f, oggi));
  },

  /**
   * Lo scadenzario: solo ciò che ha ancora un residuo, ordinato per scadenza
   * crescente. Le pagate escono di scena da sole — non c'è un filtro da
   * ricordarsi di applicare, e quindi non c'è modo di sbagliarlo.
   */
  async scadenzario(): Promise<FatturaConCliente[]> {
    await ritardo();
    const oggi = new Date();
    return fatture
      .map((f) => arricchisci(f, oggi))
      .filter((f) => f.stato === 'emessa' || f.stato === 'pagata_parziale' || f.stato === 'scaduta')
      .sort((a, b) => (a.dataScadenza ?? '9999').localeCompare(b.dataScadenza ?? '9999'));
  },

  async create(input: FatturaInput): Promise<Fattura> {
    await ritardo(400);
    const adesso = new Date().toISOString();
    const nuova: Fattura = {
      id: nuovoId(),
      numero: prossimoNumero(),
      tipo: input.tipo,
      clienteId: input.clienteId,
      commessaId: input.commessaId,
      dataEmissione: input.dataEmissione,
      dataScadenza: input.dataScadenza,
      righe: conIdRighe(input.righe),
      incassi: [],
      solleciti: [],
      datiFE: input.datiFE,
      note: input.note,
      creataIl: adesso,
      aggiornataIl: adesso,
    };
    fatture = [nuova, ...fatture];
    return nuova;
  },

  async update(id: string, patch: Partial<FatturaInput>): Promise<Fattura> {
    await ritardo(400);
    return scrivi(id, {
      ...patch,
      righe: patch.righe ? conIdRighe(patch.righe) : undefined,
    } as Partial<Fattura>);
  },

  /** Emette una bozza: da qui in poi la fattura ha un numero e una scadenza. */
  async emetti(id: string, opts: { dataEmissione?: string; giorniPagamento?: number } = {}): Promise<Fattura> {
    await ritardo(400);
    const emissione = opts.dataEmissione ?? oggiIso();
    return scrivi(id, {
      dataEmissione: emissione,
      dataScadenza: sommaGiorni(emissione, opts.giorniPagamento ?? 30),
    });
  },

  async registraIncasso(id: string, input: IncassoInput): Promise<Fattura> {
    await ritardo(400);
    const fattura = trova(id);
    return scrivi(id, { incassi: [...fattura.incassi, { ...input, id: nuovoId() }] });
  },

  async rimuoviIncasso(id: string, incassoId: string): Promise<Fattura> {
    await ritardo(300);
    const fattura = trova(id);
    return scrivi(id, { incassi: fattura.incassi.filter((i) => i.id !== incassoId) });
  },

  async registraSollecito(id: string, input: SollecitoInput): Promise<Fattura> {
    await ritardo(400);
    const fattura = trova(id);
    return scrivi(id, { solleciti: [...fattura.solleciti, { ...input, id: nuovoId() }] });
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    fatture = fatture.filter((f) => f.id !== id);
  },

  /**
   * Emette una fattura a partire da una commessa completata.
   *
   * Il tipo decide l'importo: `acconto` prende la percentuale del totale,
   * `saldo` prende quello che resta dopo gli acconti già emessi sulla stessa
   * commessa. È il calcolo che nessuno vuole rifare a mano ogni volta, ed è il
   * punto in cui il modulo Fatture si aggancia al modulo Commesse.
   */
  async emettiDaCommessa(input: EmissioneDaCommessa): Promise<Fattura> {
    await ritardo(400);

    const giaEmesso = fatture
      .filter((f) => f.commessaId === input.commessaId && f.dataEmissione)
      .reduce((tot, f) => tot + totaleFattura(f.righe), 0);

    const imponibilePieno = input.imponibile;
    const percentuale = input.tipo === 'acconto' ? (input.percentuale ?? 30) / 100 : 1;

    // Il saldo è il totale meno quello che si è già fatturato: se non ci sono
    // acconti coincide col totale, quindi il caso «unica» non ha un ramo suo.
    const importo =
      input.tipo === 'saldo'
        ? Math.max(0, Math.round((imponibilePieno - giaEmesso / (1 + ALIQUOTA_IVA_DEFAULT / 100)) * 100) / 100)
        : Math.round(imponibilePieno * percentuale * 100) / 100;

    const emissione = input.dataEmissione ?? oggiIso();
    const adesso = new Date().toISOString();

    const nuova: Fattura = {
      id: nuovoId(),
      numero: prossimoNumero(),
      tipo: input.tipo,
      clienteId: input.clienteId,
      commessaId: input.commessaId,
      dataEmissione: emissione,
      dataScadenza: sommaGiorni(emissione, input.giorniPagamento ?? 30),
      righe: [
        {
          id: nuovoId(),
          descrizione: descrizioneDaCommessa(input),
          quantita: 1,
          prezzoUnitario: importo,
          aliquotaIva: input.aliquotaIva ?? ALIQUOTA_IVA_DEFAULT,
        },
      ],
      incassi: [],
      solleciti: [],
      note: input.note,
      creataIl: adesso,
      aggiornataIl: adesso,
    };

    fatture = [nuova, ...fatture];
    return nuova;
  },
};

/**
 * Quello che serve per fatturare una commessa.
 *
 * È un oggetto piatto e non una `Commessa`: così `commesseService` può
 * chiamare questa funzione senza che il modulo Fatture dipenda dal tipo
 * `Commessa`, e le due chat restano scollegate come devono.
 */
export interface EmissioneDaCommessa {
  commessaId: string;
  clienteId: string;
  /** Numero della commessa, per scriverlo nella descrizione della riga. */
  numeroCommessa: string;
  /** Imponibile pieno del lavoro: la percentuale la applica il service. */
  imponibile: number;
  tipo: TipoFattura;
  /** Solo per gli acconti. Il default è il 30%, che è l'uso corrente. */
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

/** Oggi in ISO `AAAA-MM-GG`, coerente con come sono scritte tutte le date. */
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
