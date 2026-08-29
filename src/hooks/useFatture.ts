import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmissioneDaCommessa } from '@/services/fattureService';
import { fattureService } from '@/services/fattureService';
import type {
  FatturaFiltri,
  FatturaInput,
  IncassoInput,
  SollecitoInput,
} from '@/types/fattura';

/** Chiavi di cache in un posto solo: un typo qui è una cache che non si
 *  invalida mai, e il bug si vede tre schermate dopo. */
export const fattureKeys = {
  all: ['fatture'] as const,
  list: (f?: FatturaFiltri) => [...fattureKeys.all, 'list', f] as const,
  detail: (id: string) => [...fattureKeys.all, 'detail', id] as const,
  perCliente: (clienteId: string) => [...fattureKeys.all, 'cliente', clienteId] as const,
  scadenzario: () => [...fattureKeys.all, 'scadenzario'] as const,
};

export function useFatture(filtri?: FatturaFiltri) {
  return useQuery({
    queryKey: fattureKeys.list(filtri),
    queryFn: () => fattureService.list(filtri),
  });
}

export function useFattura(id: string | undefined) {
  return useQuery({
    queryKey: fattureKeys.detail(id ?? ''),
    queryFn: () => fattureService.getById(id!),
    enabled: !!id,
  });
}

/** Serve alla scheda cliente: la sezione «Fatture» si popola da sola. */
export function useFatturePerCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: fattureKeys.perCliente(clienteId ?? ''),
    queryFn: () => fattureService.listPerCliente(clienteId!),
    enabled: !!clienteId,
  });
}

export function useScadenzario() {
  return useQuery({
    queryKey: fattureKeys.scadenzario(),
    queryFn: () => fattureService.scadenzario(),
  });
}

/**
 * Ogni mutazione invalida `fattureKeys.all` e non la sola chiave toccata: un
 * incasso cambia lo stato della fattura, e lo stato cambia i contatori delle
 * pill, lo scadenzario e la scheda del cliente. Invalidare in modo chirurgico
 * qui significa tre schermate che restano indietro.
 */
function useInvalidaFatture() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: fattureKeys.all });
}

export function useCreaFattura() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: (input: FatturaInput) => fattureService.create(input),
    onSuccess: invalida,
  });
}

export function useAggiornaFattura() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FatturaInput> }) =>
      fattureService.update(id, patch),
    onSuccess: invalida,
  });
}

export function useEmettiFattura() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: ({ id, ...opts }: { id: string; dataEmissione?: string; giorniPagamento?: number }) =>
      fattureService.emetti(id, opts),
    onSuccess: invalida,
  });
}

export function useEmettiDaCommessa() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: (input: EmissioneDaCommessa) => fattureService.emettiDaCommessa(input),
    onSuccess: invalida,
  });
}

export function useRegistraIncasso() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IncassoInput }) =>
      fattureService.registraIncasso(id, input),
    onSuccess: invalida,
  });
}

export function useRimuoviIncasso() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: ({ id, incassoId }: { id: string; incassoId: string }) =>
      fattureService.rimuoviIncasso(id, incassoId),
    onSuccess: invalida,
  });
}

export function useRegistraSollecito() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SollecitoInput }) =>
      fattureService.registraSollecito(id, input),
    onSuccess: invalida,
  });
}

export function useEliminaFattura() {
  const invalida = useInvalidaFatture();
  return useMutation({
    mutationFn: (id: string) => fattureService.remove(id),
    onSuccess: invalida,
  });
}
