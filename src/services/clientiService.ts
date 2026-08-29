import { clientiMock } from '@/mocks/clienti';
import type { Cliente, ClienteFiltri, ClienteInput } from '@/types/cliente';
import { impagina, ritardo, type Paginato } from '@/types/comune';
import { matchesSearch, nuovoId } from '@/lib/utils';

/**
 * Accesso ai dati dei clienti. docs/CONVENTIONS.md §4.
 *
 * È il PRIMO service del progetto e quindi il modello per gli altri tre
 * moduli. Tre cose da copiare:
 *
 *  1. **Le firme sono già quelle del backend vero.** Filtri, ordinamento e
 *     paginazione sono PARAMETRI, non lavoro che fa il componente. Il giorno
 *     che sotto c'è una API, il corpo di queste funzioni diventa una `fetch` e
 *     non si tocca una riga di pagina. Se invece la lista filtrasse in
 *     `useMemo` dentro il componente, quel giorno andrebbero riscritte tutte.
 *  2. **Tutto ritorna una Promise, con latenza finta.** Senza, gli stati di
 *     caricamento non si vedono mai e si scoprono rotti dopo.
 *  3. **Nessun componente importa da `mocks/`.** L'unico che ci arriva è questo
 *     file.
 *
 * Persistenza: l'array vive in memoria per la sessione. Le modifiche si vedono
 * navigando, un refresh riporta ai dati iniziali. È il comportamento giusto per
 * una demo, ma va detto o sembra un bug.
 */

let clienti: Cliente[] = [...clientiMock];

function ordina(righe: Cliente[], filtri?: ClienteFiltri): Cliente[] {
  const campo = filtri?.ordinaPer ?? 'denominazione';
  const segno = filtri?.ordine === 'desc' ? -1 : 1;
  return [...righe].sort((a, b) => {
    const va = String(a[campo as keyof Cliente] ?? '');
    const vb = String(b[campo as keyof Cliente] ?? '');
    // localeCompare con locale italiano: senza, "Àngelo" finisce dopo "Zoli".
    return va.localeCompare(vb, 'it') * segno;
  });
}

export const clientiService = {
  async list(filtri?: ClienteFiltri): Promise<Paginato<Cliente>> {
    await ritardo();
    let righe = clienti;

    if (filtri?.tipo && filtri.tipo !== 'tutti') {
      righe = righe.filter((c) => c.tipo === filtri.tipo);
    }

    if (filtri?.q?.trim()) {
      righe = righe.filter((c) =>
        matchesSearch(
          filtri.q!,
          c.denominazione,
          c.partitaIva,
          c.codiceFiscale,
          c.email,
          c.telefono,
          c.referente?.nome,
          c.indirizzoFatturazione.comune,
          // Anche i comuni dei cantieri: si cerca "Pianoro" pensando al lavoro,
          // non alla sede di fatturazione.
          ...c.luoghiIntervento.map((l) => l.indirizzo.comune),
        ),
      );
    }

    return impagina(ordina(righe, filtri), filtri);
  },

  /** Tutti i clienti senza paginazione — per le select, che non paginano. */
  async listaCompleta(): Promise<Cliente[]> {
    await ritardo(150);
    return ordina(clienti);
  },

  async getById(id: string): Promise<Cliente | null> {
    await ritardo(200);
    return clienti.find((c) => c.id === id) ?? null;
  },

  async create(input: ClienteInput): Promise<Cliente> {
    await ritardo(400);
    const ora = new Date().toISOString();
    const nuovo: Cliente = { ...input, id: nuovoId(), creatoIl: ora, aggiornatoIl: ora };
    clienti = [nuovo, ...clienti];
    return nuovo;
  },

  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    await ritardo(400);
    const i = clienti.findIndex((c) => c.id === id);
    if (i < 0) throw new Error('Cliente non trovato');
    const aggiornato: Cliente = { ...clienti[i], ...patch, aggiornatoIl: new Date().toISOString() };
    clienti = clienti.map((c, k) => (k === i ? aggiornato : c));
    return aggiornato;
  },

  async remove(id: string): Promise<void> {
    await ritardo(300);
    clienti = clienti.filter((c) => c.id !== id);
  },

  /** Quanti clienti per tipo — i contatori delle pill di filtro. */
  async conteggioPerTipo(): Promise<Record<string, number>> {
    await ritardo(150);
    const out: Record<string, number> = { tutti: clienti.length };
    for (const c of clienti) out[c.tipo] = (out[c.tipo] ?? 0) + 1;
    return out;
  },
};
