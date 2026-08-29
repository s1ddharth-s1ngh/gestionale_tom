import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FornitoreFiltri } from '@/services/fornitoriService';
import { fornitoriService } from '@/services/fornitoriService';
import { costiKeys } from '@/hooks/useCosti';
import type { FornitoreInput } from '@/types/costo';

export const fornitoriKeys = {
  all: ['fornitori'] as const,
  list: (f?: FornitoreFiltri) => [...fornitoriKeys.all, 'list', f] as const,
  detail: (id: string) => [...fornitoriKeys.all, 'detail', id] as const,
  tutti: () => [...fornitoriKeys.all, 'tutti'] as const,
};

export function useFornitori(filtri?: FornitoreFiltri) {
  return useQuery({
    queryKey: fornitoriKeys.list(filtri),
    queryFn: () => fornitoriService.list(filtri),
  });
}

export function useFornitore(id: string | undefined) {
  return useQuery({
    queryKey: fornitoriKeys.detail(id ?? ''),
    queryFn: () => fornitoriService.getById(id!),
    enabled: !!id,
  });
}

/** Per le tendine: tutti, in ordine alfabetico, senza paginazione. */
export function useTuttiFornitori() {
  return useQuery({
    queryKey: fornitoriKeys.tutti(),
    queryFn: () => fornitoriService.listTutti(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Invalida anche i costi: il totale speso di un fornitore vive nella sua
 * scheda ma è calcolato sui costi, e le due cache si smentiscono a vicenda
 * se se ne aggiorna una sola.
 */
function useInvalidaFornitori() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: fornitoriKeys.all });
    qc.invalidateQueries({ queryKey: costiKeys.all });
  };
}

export function useCreaFornitore() {
  const invalida = useInvalidaFornitori();
  return useMutation({
    mutationFn: (input: FornitoreInput) => fornitoriService.create(input),
    onSuccess: invalida,
  });
}

export function useAggiornaFornitore() {
  const invalida = useInvalidaFornitori();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FornitoreInput> }) =>
      fornitoriService.update(id, patch),
    onSuccess: invalida,
  });
}

export function useEliminaFornitore() {
  const invalida = useInvalidaFornitori();
  return useMutation({
    mutationFn: (id: string) => fornitoriService.remove(id),
    onSuccess: invalida,
  });
}
