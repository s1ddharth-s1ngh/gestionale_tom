import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fattureFornitoreService } from '@/services/fattureFornitoreService';
import type {
  FatturaFornitoreFiltri,
  FatturaFornitoreInput,
  PagamentoInput,
} from '@/types/fatturaFornitore';

/**
 * Gli hook del ciclo passivo. Nessun componente parla col service: ci passa da
 * qui, o la cache diventa un secondo posto in cui i dati invecchiano.
 */

/** I contatori si calcolano dentro la ricerca corrente, non dentro lo stato. */
export type ContatoriFiltri = Omit<FatturaFornitoreFiltri, 'stato' | 'pagina' | 'perPagina'>;

export const fattureFornitoreKeys = {
  all: ['fattureFornitore'] as const,
  list: (f?: FatturaFornitoreFiltri) => [...fattureFornitoreKeys.all, 'list', f] as const,
  detail: (id: string) => [...fattureFornitoreKeys.all, 'detail', id] as const,
  perFornitore: (id: string) => [...fattureFornitoreKeys.all, 'fornitore', id] as const,
  conteggi: (f?: ContatoriFiltri) => [...fattureFornitoreKeys.all, 'conteggi', f] as const,
  scadenzario: () => [...fattureFornitoreKeys.all, 'scadenzario'] as const,
};

export function useFattureFornitore(filtri?: FatturaFornitoreFiltri) {
  return useQuery({
    queryKey: fattureFornitoreKeys.list(filtri),
    queryFn: () => fattureFornitoreService.list(filtri),
    // I dati precedenti restano a schermo mentre arriva la pagina nuova: senza,
    // cambiare filtro fa lampeggiare la tabella a vuoto a ogni click.
    placeholderData: (precedenti) => precedenti,
  });
}

export function useFatturaFornitore(id: string | undefined) {
  return useQuery({
    queryKey: fattureFornitoreKeys.detail(id ?? ''),
    queryFn: () => fattureFornitoreService.getById(id!),
    enabled: !!id,
  });
}

/** Le fatture del fornitore, per la sezione dedicata nella sua scheda. */
export function useFattureDelFornitore(fornitoreId: string | undefined) {
  return useQuery({
    queryKey: fattureFornitoreKeys.perFornitore(fornitoreId ?? ''),
    queryFn: () => fattureFornitoreService.listPerFornitore(fornitoreId!),
    enabled: !!fornitoreId,
  });
}

export function useConteggiFattureFornitore(filtri?: ContatoriFiltri) {
  return useQuery({
    queryKey: fattureFornitoreKeys.conteggi(filtri),
    queryFn: () => fattureFornitoreService.contaPerStato(filtri),
    placeholderData: (precedenti) => precedenti,
  });
}

export function useScadenzarioFornitori() {
  return useQuery({
    queryKey: fattureFornitoreKeys.scadenzario(),
    queryFn: () => fattureFornitoreService.scadenzario(),
  });
}

/**
 * Ogni mutazione invalida `fattureFornitoreKeys.all` e non la sola riga toccata:
 * registrare un pagamento sposta i contatori delle pill, lo scadenzario e la
 * sezione nella scheda del fornitore, non solo il dettaglio aperto.
 *
 * `generaCosti` invalida ANCHE i costi: è l'unico punto dell'app in cui una
 * scrittura in un modulo cambia i numeri di un altro, e dimenticarlo lascerebbe
 * i riepiloghi indietro finché qualcuno non ricarica la pagina.
 */
function useInvalida() {
  const qc = useQueryClient();
  return (ancheCosti = false) => {
    qc.invalidateQueries({ queryKey: fattureFornitoreKeys.all });
    if (ancheCosti) {
      qc.invalidateQueries({ queryKey: ['costi'] });
      qc.invalidateQueries({ queryKey: ['fornitori'] });
    }
  };
}

export function useCreaFatturaFornitore() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: (input: FatturaFornitoreInput) => fattureFornitoreService.create(input),
    onSuccess: () => invalida(),
  });
}

export function useAggiornaFatturaFornitore() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FatturaFornitoreInput> }) =>
      fattureFornitoreService.update(id, patch),
    onSuccess: () => invalida(),
  });
}

export function useEliminaFatturaFornitore() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: (id: string) => fattureFornitoreService.remove(id),
    onSuccess: () => invalida(),
  });
}

/** Le transizioni di stato in un hook solo, scelte per nome. */
export type AzioneFatturaFornitore = 'registra' | 'annullaRegistrazione';

export function useAzioneFatturaFornitore() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: ({ id, azione }: { id: string; azione: AzioneFatturaFornitore }) =>
      azione === 'registra'
        ? fattureFornitoreService.registra(id)
        : fattureFornitoreService.annullaRegistrazione(id),
    onSuccess: () => invalida(),
  });
}

export function useRegistraPagamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: ({ id, pagamento }: { id: string; pagamento: PagamentoInput }) =>
      fattureFornitoreService.registraPagamento(id, pagamento),
    onSuccess: () => invalida(),
  });
}

export function useEliminaPagamento() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: ({ id, pagamentoId }: { id: string; pagamentoId: string }) =>
      fattureFornitoreService.eliminaPagamento(id, pagamentoId),
    onSuccess: () => invalida(),
  });
}

export function useGeneraCosti() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: (id: string) => fattureFornitoreService.generaCosti(id),
    onSuccess: () => invalida(true),
  });
}

export function useAnnullaCosti() {
  const invalida = useInvalida();
  return useMutation({
    mutationFn: (id: string) => fattureFornitoreService.annullaCosti(id),
    onSuccess: () => invalida(true),
  });
}
