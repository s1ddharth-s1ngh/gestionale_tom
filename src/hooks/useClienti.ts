import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientiService } from '@/services/clientiService';
import type { ClienteFiltri, ClienteInput, LuogoIntervento } from '@/types/cliente';

/**
 * Hook dei clienti. docs/CONVENTIONS.md §4.3.
 *
 * Modello per gli altri moduli. Le chiavi di cache stanno in un oggetto solo:
 * scritte a mano nei call-site, un refuso diventa una cache che non si
 * invalida mai — e il bug si presenta come "ho salvato ma la lista non cambia",
 * che si insegue a lungo prima di guardare la chiave.
 */
export const clientiKeys = {
  all: ['clienti'] as const,
  list: (filtri?: ClienteFiltri) => [...clientiKeys.all, 'list', filtri ?? {}] as const,
  completa: () => [...clientiKeys.all, 'completa'] as const,
  detail: (id: string) => [...clientiKeys.all, 'detail', id] as const,
  conteggi: () => [...clientiKeys.all, 'conteggi'] as const,
};

export function useClienti(filtri?: ClienteFiltri) {
  return useQuery({
    queryKey: clientiKeys.list(filtri),
    queryFn: () => clientiService.list(filtri),
    // I dati della pagina precedente restano mentre arriva la nuova: senza,
    // ogni cambio di filtro fa lampeggiare la tabella sullo skeleton.
    placeholderData: (prec) => prec,
  });
}

/** Elenco completo, per le select. Non pagina e cambia di rado. */
export function useClientiCompleti() {
  return useQuery({
    queryKey: clientiKeys.completa(),
    queryFn: () => clientiService.listaCompleta(),
    staleTime: 5 * 60_000,
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: clientiKeys.detail(id ?? ''),
    queryFn: () => clientiService.getById(id!),
    enabled: !!id,
  });
}

export function useConteggioClientiPerTipo() {
  return useQuery({
    queryKey: clientiKeys.conteggi(),
    queryFn: () => clientiService.conteggioPerTipo(),
  });
}

export function useCreaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClienteInput) => clientiService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}

export function useAggiornaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClienteInput> }) =>
      clientiService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}

export function useEliminaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientiService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}

// ── Luoghi di intervento ─────────────────────────────────────────────────────
// Stanno in una tabella loro, ma si vedono e si modificano solo dentro la
// scheda del cliente: invalidano quindi le stesse chiavi.

export function useAggiungiLuogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clienteId, luogo }: { clienteId: string; luogo: Omit<LuogoIntervento, 'id'> }) =>
      clientiService.aggiungiLuogo(clienteId, luogo),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}

export function useAggiornaLuogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clienteId,
      luogoId,
      patch,
    }: {
      clienteId: string;
      luogoId: string;
      patch: Omit<LuogoIntervento, 'id'>;
    }) => clientiService.aggiornaLuogo(clienteId, luogoId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}

export function useRimuoviLuogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (luogoId: string) => clientiService.rimuoviLuogo(luogoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}
