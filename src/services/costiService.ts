import { costiMock } from '@/mocks/costi';
import { fornitoriMock } from '@/mocks/fornitori';
import { mezziMock } from '@/mocks/mezzi';
import type { FiltriBase, Paginato } from '@/types/comune';
import { impagina, ritardo } from '@/types/comune';
import type {
  CategoriaCosto,
  Costo,
  CostoFiltri,
  CostoInput,
  Mezzo,
  RiepilogoVoce,
} from '@/types/costo';
import { categoriaCostoLabel, riepiloga } from '@/types/costo';
import { matchesSearch, nuovoId } from '@/lib/utils';

/**
 * L'unico punto che tocca i dati dei costi.
 *
 * Le firme sono già quelle che avranno con un backend vero: filtri, periodo e
 * paginazione sono parametri, non `.filter()` fatti nel componente.
 *
 * Le modifiche vivono nella sessione e si perdono al reload: è voluto.
 */

let costi: Costo[] = costiMock.map((c) => ({ ...c }));

/** Il costo come lo vuole la tabella: con fornitore e mezzo già risolti. */
export interface CostoArricchito extends Costo {
  fornitoreDenominazione?: string;
  mezzoTarga?: string;
  mezzoDescrizione?: string;
  /** Imponibile + IVA. Serve al drawer, non ai riepiloghi: l'IVA non è un costo. */
  totaleConIva: number;
}

function arricchisci(c: Costo): CostoArricchito {
  const mezzo = c.mezzoId ? mezziMock.find((m) => m.id === c.mezzoId) : undefined;
  return {
    ...c,
    fornitoreDenominazione: c.fornitoreId
      ? fornitoriMock.find((f) => f.id === c.fornitoreId)?.denominazione
      : undefined,
    mezzoTarga: mezzo?.targa,
    mezzoDescrizione: mezzo?.descrizione,
    totaleConIva: Math.round(c.importo * (1 + (c.aliquotaIva ?? 0) / 100) * 100) / 100,
  };
}

function trova(id: string): Costo {
  const c = costi.find((x) => x.id === id);
  if (!c) throw new Error(`Costo ${id} non trovato`);
  return c;
}

/** Applica i filtri diversi dalla paginazione. Sta a parte perché la usano
 *  anche i riepiloghi: un riepilogo che ignora i filtri della pagina mostra
 *  numeri che non c'entrano con la tabella che gli sta sopra. */
function filtra(filtri?: CostoFiltri): CostoArricchito[] {
  let righe = costi.map(arricchisci);

  if (filtri?.categoria) righe = righe.filter((c) => c.categoria === filtri.categoria);
  if (filtri?.fornitoreId) righe = righe.filter((c) => c.fornitoreId === filtri.fornitoreId);
  if (filtri?.mezzoId) righe = righe.filter((c) => c.mezzoId === filtri.mezzoId);
  if (filtri?.commessaId) righe = righe.filter((c) => c.commessaId === filtri.commessaId);
  if (filtri?.imputazione === 'imputati') righe = righe.filter((c) => !!c.commessaId);
  if (filtri?.imputazione === 'generali') righe = righe.filter((c) => !c.commessaId);
  if (filtri?.dal) righe = righe.filter((c) => c.data >= filtri.dal!);
  if (filtri?.al) righe = righe.filter((c) => c.data <= filtri.al!);

  if (filtri?.q) {
    righe = righe.filter((c) =>
      matchesSearch(filtri.q!, c.descrizione, c.documento, c.note, c.fornitoreDenominazione, c.mezzoTarga),
    );
  }

  // Dal più recente: i costi si consultano per controllare quello che si è
  // appena registrato, non per leggere la storia dall'inizio.
  return righe.sort((a, b) => b.data.localeCompare(a.data));
}

export const costiService = {
  async list(filtri?: CostoFiltri): Promise<Paginato<CostoArricchito>> {
    await ritardo();
    return impagina(filtra(filtri), filtri as FiltriBase);
  },

  async getById(id: string): Promise<CostoArricchito | null> {
    await ritardo(200);
    const c = costi.find((x) => x.id === id);
    return c ? arricchisci(c) : null;
  },

  /** I costi di un fornitore, per la sua scheda. */
  async listPerFornitore(fornitoreId: string): Promise<CostoArricchito[]> {
    await ritardo(200);
    return filtra({ fornitoreId });
  },

  /** I costi imputati a una commessa: serve al report di marginalità futuro,
   *  e intanto alla scheda della commessa. */
  async listPerCommessa(commessaId: string): Promise<CostoArricchito[]> {
    await ritardo(200);
    return filtra({ commessaId });
  },

  async contaPerCategoria(): Promise<Record<CategoriaCosto | 'tutte', number>> {
    await ritardo(150);
    const conta = {
      tutte: costi.length,
      carburante: 0,
      materiali: 0,
      noleggio: 0,
      smaltimento: 0,
      manutenzione: 0,
      assicurazione: 0,
      personale: 0,
      altro: 0,
    };
    for (const c of costi) conta[c.categoria] += 1;
    return conta;
  },

  /**
   * Riepilogo per categoria, sugli stessi filtri della tabella.
   *
   * Somma l'imponibile e non il totale con IVA: l'IVA sugli acquisti si
   * detrae, quindi non è un costo — sommarla gonfierebbe ogni voce del 22%.
   */
  async riepilogoPerCategoria(filtri?: CostoFiltri): Promise<RiepilogoVoce[]> {
    await ritardo(250);
    return riepiloga(
      filtra(filtri),
      (c) => c.categoria,
      (chiave) => categoriaCostoLabel(chiave as CategoriaCosto),
      (c) => c.importo,
    );
  },

  /**
   * Riepilogo per mezzo. I costi senza mezzo restano fuori: un mezzo
   * «non assegnato» in cima alla classifica non dice niente a nessuno.
   */
  async riepilogoPerMezzo(filtri?: CostoFiltri): Promise<RiepilogoVoce[]> {
    await ritardo(250);
    const conMezzo = filtra(filtri).filter((c) => !!c.mezzoId);
    return riepiloga(
      conMezzo,
      (c) => c.mezzoId!,
      (chiave) => {
        const m = mezziMock.find((x) => x.id === chiave);
        return m ? `${m.targa} · ${m.descrizione}` : chiave;
      },
      (c) => c.importo,
    );
  },

  /** L'anagrafica dei mezzi. Vive qui perché il modulo mezzi vero non c'è
   *  ancora, e un service da tre righe per sei record sarebbe più codice da
   *  spostare il giorno che arriva. */
  async listMezzi(soloAttivi = true): Promise<Mezzo[]> {
    await ritardo(150);
    return mezziMock.filter((m) => !soloAttivi || m.attivo);
  },

  async create(input: CostoInput): Promise<Costo> {
    await ritardo(400);
    const adesso = new Date().toISOString();
    const nuovo: Costo = { ...input, id: nuovoId(), creatoIl: adesso, aggiornatoIl: adesso };
    costi = [nuovo, ...costi];
    return nuovo;
  },

  async update(id: string, patch: Partial<CostoInput>): Promise<Costo> {
    await ritardo(400);
    const aggiornato: Costo = { ...trova(id), ...patch, aggiornatoIl: new Date().toISOString() };
    costi = costi.map((c) => (c.id === id ? aggiornato : c));
    return aggiornato;
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    costi = costi.filter((c) => c.id !== id);
  },
};
