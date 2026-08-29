import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costiService } from '@/services/costiService';
import type { CostoFiltri, CostoInput } from '@/types/costo';

export const costiKeys = {
  all: ['costi'] as const,
  list: (f?: CostoFiltri) => [...costiKeys.all, 'list', f] as const,
  detail: (id: string) => [...costiKeys.all, 'detail', id] as const,
  perFornitore: (id: string) => [...costiKeys.all, 'fornitore', id] as const,
  perCommessa: (id: string) => [...costiKeys.all, 'commessa', id] as const,
  conteggi: () => [...costiKeys.all, 'conteggi'] as const,
  riepilogoCategoria: (f?: CostoFiltri) => [...costiKeys.all, 'riepilogo', 'categoria', f] as const,
  riepilogoMezzo: (f?: CostoFiltri) => [...costiKeys.all, 'riepilogo', 'mezzo', f] as const,
  mezzi: (soloAttivi: boolean) => [...costiKeys.all, 'mezzi', soloAttivi] as const,
};

export function useCosti(filtri?: CostoFiltri) {
  return useQuery({
    queryKey: costiKeys.list(filtri),
    queryFn: () => costiService.list(filtri),
  });
}

export function useCosto(id: string | undefined) {
  return useQuery({
    queryKey: costiKeys.detail(id ?? ''),
    queryFn: () => costiService.getById(id!),
    enabled: !!id,
  });
}

export function useCostiPerFornitore(fornitoreId: string | undefined) {
  return useQuery({
    queryKey: costiKeys.perFornitore(fornitoreId ?? ''),
    queryFn: () => costiService.listPerFornitore(fornitoreId!),
    enabled: !!fornitoreId,
  });
}

export function useCostiPerCommessa(commessaId: string | undefined) {
  return useQuery({
    queryKey: costiKeys.perCommessa(commessaId ?? ''),
    queryFn: () => costiService.listPerCommessa(commessaId!),
    enabled: !!commessaId,
  });
}

export function useConteggiCosti() {
  return useQuery({
    queryKey: costiKeys.conteggi(),
    queryFn: () => costiService.contaPerCategoria(),
  });
}

/**
 * I riepiloghi prendono gli STESSI filtri della tabella: un riepilogo che
 * ignora il periodo selezionato mostra numeri che non c'entrano con le righe
 * che gli stanno sotto, e nessuno si accorge dell'incoerenza finché non
 * prova a sommare a mano.
 */
export function useRiepilogoPerCategoria(filtri?: CostoFiltri) {
  return useQuery({
    queryKey: costiKeys.riepilogoCategoria(filtri),
    queryFn: () => costiService.riepilogoPerCategoria(filtri),
  });
}

export function useRiepilogoPerMezzo(filtri?: CostoFiltri) {
  return useQuery({
    queryKey: costiKeys.riepilogoMezzo(filtri),
    queryFn: () => costiService.riepilogoPerMezzo(filtri),
  });
}

export function useMezzi(soloAttivi = true) {
  return useQuery({
    queryKey: costiKeys.mezzi(soloAttivi),
    queryFn: () => costiService.listMezzi(soloAttivi),
    // L'anagrafica dei mezzi cambia una volta l'anno: rileggerla a ogni
    // apertura del drawer è latenza regalata.
    staleTime: 10 * 60_000,
  });
}

function useInvalidaCosti() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: costiKeys.all });
}

export function useCreaCosto() {
  const invalida = useInvalidaCosti();
  return useMutation({
    mutationFn: (input: CostoInput) => costiService.create(input),
    onSuccess: invalida,
  });
}

export function useAggiornaCosto() {
  const invalida = useInvalidaCosti();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CostoInput> }) =>
      costiService.update(id, patch),
    onSuccess: invalida,
  });
}

export function useEliminaCosto() {
  const invalida = useInvalidaCosti();
  return useMutation({
    mutationFn: (id: string) => costiService.remove(id),
    onSuccess: invalida,
  });
}
