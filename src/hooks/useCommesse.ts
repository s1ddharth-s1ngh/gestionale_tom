import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commesseService } from '@/services/commesseService';
import type { CommessaFiltri, CommessaInput, Lavorazione, Rapportino } from '@/types/commessa';
import type { Foto } from '@/types/comune';

/**
 * Gli hook del modulo Commesse. Nessun componente parla col service: ci passa
 * da qui, o la cache diventa un secondo posto in cui i dati invecchiano.
 */

/**
 * Le chiavi di cache in un posto solo. Un typo qui non rompe niente subito: fa
 * una cache che non si invalida mai, e si scopre giorni dopo davanti a una
 * schermata che non si aggiorna.
 */
export const commesseKeys = {
  all: ['commesse'] as const,
  list: (f?: CommessaFiltri) => [...commesseKeys.all, 'list', f] as const,
  detail: (id: string) => [...commesseKeys.all, 'detail', id] as const,
  perCliente: (clienteId: string) => [...commesseKeys.all, 'cliente', clienteId] as const,
  conteggi: () => [...commesseKeys.all, 'conteggi'] as const,
};

export function useCommesse(filtri?: CommessaFiltri) {
  return useQuery({
    queryKey: commesseKeys.list(filtri),
    queryFn: () => commesseService.list(filtri),
    // I dati precedenti restano a schermo mentre arriva la pagina nuova: senza,
    // cambiare filtro fa lampeggiare la tabella a vuoto a ogni click.
    placeholderData: (precedenti) => precedenti,
  });
}

export function useCommessa(id: string | undefined) {
  return useQuery({
    queryKey: commesseKeys.detail(id ?? ''),
    queryFn: () => commesseService.getById(id!),
    enabled: !!id,
  });
}

/** Lo storico interventi nella scheda del cliente. */
export function useCommessePerCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: commesseKeys.perCliente(clienteId ?? ''),
    queryFn: () => commesseService.listPerCliente(clienteId!),
    enabled: !!clienteId,
  });
}

/** Contatori delle pill di filtro: contano l'archivio, non la pagina a schermo. */
export function useConteggiCommesse() {
  return useQuery({
    queryKey: commesseKeys.conteggi(),
    queryFn: () => commesseService.contaPerStato(),
  });
}

/**
 * Ogni mutazione invalida `commesseKeys.all` e non la sola riga toccata.
 *
 * Sembra eccessivo e non lo è: cambiare stato a una commessa sposta i contatori
 * delle pill, l'ordinamento dell'elenco e la cella del calendario. Invalidare
 * il singolo dettaglio lascerebbe tutti e tre indietro.
 */
function useInvalidaCommesse() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: commesseKeys.all });
}

export function useCreaCommessa() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: (input: CommessaInput) => commesseService.create(input),
    onSuccess: invalida,
  });
}

export function useAggiornaCommessa() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CommessaInput> }) =>
      commesseService.update(id, patch),
    onSuccess: invalida,
  });
}

export function useEliminaCommessa() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: (id: string) => commesseService.remove(id),
    onSuccess: invalida,
  });
}

/**
 * Le transizioni di stato in un hook solo, scelte per nome.
 *
 * Un hook per transizione sarebbero sei `useMutation` da dichiarare in ogni
 * pagina che ne usa più di una — e il dettaglio le usa quasi tutte. Qui l'azione
 * è un parametro, e il call-site resta una riga.
 */
export type AzioneCommessa = 'avvia' | 'sospendi' | 'riprendi' | 'annulla' | 'completa';

export function useAzioneCommessa() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, azione, motivo }: { id: string; azione: AzioneCommessa; motivo?: string }) => {
      switch (azione) {
        case 'avvia':
          return commesseService.avvia(id);
        case 'sospendi':
          return commesseService.sospendi(id, motivo);
        case 'riprendi':
          return commesseService.riprendi(id);
        case 'annulla':
          return commesseService.annulla(id, motivo);
        case 'completa':
          return commesseService.completa(id);
      }
    },
    onSuccess: invalida,
  });
}

/** Mette a calendario, o sposta di giorno una commessa già pianificata. */
export function usePianificaCommessa() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) => commesseService.pianifica(id, data),
    onSuccess: invalida,
  });
}

export function useAggiornaLavorazioni() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, lavorazioni }: { id: string; lavorazioni: Lavorazione[] }) =>
      commesseService.aggiornaLavorazioni(id, lavorazioni),
    onSuccess: invalida,
  });
}

export function useSalvaFoto() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, quando, foto }: { id: string; quando: 'prima' | 'dopo'; foto: Foto[] }) =>
      commesseService.salvaFoto(id, quando, foto),
    onSuccess: invalida,
  });
}

export function useSalvaRapportino() {
  const invalida = useInvalidaCommesse();
  return useMutation({
    mutationFn: ({ id, rapportino }: { id: string; rapportino: Rapportino }) =>
      commesseService.salvaRapportino(id, rapportino),
    onSuccess: invalida,
  });
}
