import { costiMock } from '@/mocks/costi';
import { fornitoriMock } from '@/mocks/fornitori';
import type { FiltriBase, Paginato } from '@/types/comune';
import { impagina, ritardo } from '@/types/comune';
import type { CategoriaCosto, Fornitore, FornitoreInput } from '@/types/costo';
import { matchesSearch, nuovoId } from '@/lib/utils';

/**
 * L'unico punto che tocca i dati dei fornitori.
 *
 * Anagrafica piccola e stabile: nessun ciclo di vita, nessuno stato derivato.
 * L'unica cosa che vale la pena calcolare è quanto si è speso da ciascuno, ed
 * è il motivo per cui l'elenco esiste come pagina invece che come tendina.
 */

let fornitori: Fornitore[] = fornitoriMock.map((f) => ({ ...f }));

export interface FornitoreConTotale extends Fornitore {
  /** Imponibile speso da questo fornitore, su tutto lo storico. */
  totaleSpeso: number;
  numeroCosti: number;
  /** Data dell'ultimo costo, `undefined` se non se n'è mai comprato niente. */
  ultimoCosto?: string;
}

export interface FornitoreFiltri extends FiltriBase {
  categoria?: CategoriaCosto;
}

/**
 * I totali si leggono dai mock dei costi e non da `costiService`: un service
 * che ne chiama un altro per un conteggio crea una dipendenza circolare
 * appena il secondo vuole sapere qualcosa del primo.
 */
function conTotale(f: Fornitore): FornitoreConTotale {
  const suoi = costiMock.filter((c) => c.fornitoreId === f.id);
  return {
    ...f,
    totaleSpeso: Math.round(suoi.reduce((t, c) => t + c.importo, 0) * 100) / 100,
    numeroCosti: suoi.length,
    ultimoCosto: suoi.map((c) => c.data).sort().at(-1),
  };
}

export const fornitoriService = {
  async list(filtri?: FornitoreFiltri): Promise<Paginato<FornitoreConTotale>> {
    await ritardo();
    let righe = fornitori.map(conTotale);

    if (filtri?.categoria) righe = righe.filter((f) => f.categoriaPrevalente === filtri.categoria);
    if (filtri?.q) {
      righe = righe.filter((f) =>
        matchesSearch(filtri.q!, f.denominazione, f.partitaIva, f.email, f.note),
      );
    }

    // Dal più caro: chi apre questa pagina vuole sapere dove vanno i soldi,
    // non consultare un elenco telefonico in ordine alfabetico.
    righe.sort((a, b) => b.totaleSpeso - a.totaleSpeso);

    return impagina(righe, filtri);
  },

  async getById(id: string): Promise<FornitoreConTotale | null> {
    await ritardo(200);
    const f = fornitori.find((x) => x.id === id);
    return f ? conTotale(f) : null;
  },

  /** Per le tendine del drawer dei costi: tutti, senza paginazione. */
  async listTutti(): Promise<Fornitore[]> {
    await ritardo(150);
    return [...fornitori].sort((a, b) => a.denominazione.localeCompare(b.denominazione));
  },

  async create(input: FornitoreInput): Promise<Fornitore> {
    await ritardo(400);
    const adesso = new Date().toISOString();
    const nuovo: Fornitore = { ...input, id: nuovoId(), creatoIl: adesso, aggiornatoIl: adesso };
    fornitori = [nuovo, ...fornitori];
    return nuovo;
  },

  async update(id: string, patch: Partial<FornitoreInput>): Promise<Fornitore> {
    await ritardo(400);
    const attuale = fornitori.find((f) => f.id === id);
    if (!attuale) throw new Error(`Fornitore ${id} non trovato`);
    const aggiornato: Fornitore = { ...attuale, ...patch, aggiornatoIl: new Date().toISOString() };
    fornitori = fornitori.map((f) => (f.id === id ? aggiornato : f));
    return aggiornato;
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    fornitori = fornitori.filter((f) => f.id !== id);
  },
};
