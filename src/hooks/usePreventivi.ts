import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { preventiviService } from '@/services/preventiviService';
import type { PreventivoFiltri, PreventivoInput } from '@/types/preventivo';

/**
 * Gli hook del modulo Preventivi. Nessun componente parla col service: ci passa
 * da qui, o la cache diventa un secondo posto in cui i dati invecchiano.
 */

/**
 * Le chiavi di cache in un posto solo. Un typo qui non rompe niente subito: fa
 * una cache che non si invalida mai, e si scopre giorni dopo davanti a una
 * schermata che non si aggiorna.
 */
export const preventiviKeys = {
  all: ['preventivi'] as const,
  list: (f?: PreventivoFiltri) => [...preventiviKeys.all, 'list', f] as const,
  detail: (id: string) => [...preventiviKeys.all, 'detail', id] as const,
  perCliente: (clienteId: string) => [...preventiviKeys.all, 'cliente', clienteId] as const,
  conteggi: (f?: ContatoriFiltri) => [...preventiviKeys.all, 'conteggi', f] as const,
};

/** I contatori si calcolano dentro la ricerca corrente, non sullo stato. */
export type ContatoriFiltri = Omit<PreventivoFiltri, 'stato' | 'pagina' | 'perPagina'>;

export function usePreventivi(filtri?: PreventivoFiltri) {
  return useQuery({
    queryKey: preventiviKeys.list(filtri),
    queryFn: () => preventiviService.list(filtri),
    // I dati precedenti restano a schermo mentre arriva la pagina nuova: senza,
    // cambiare filtro fa lampeggiare la tabella a vuoto a ogni click.
    placeholderData: (precedenti) => precedenti,
  });
}

export function usePreventivo(id: string | undefined) {
  return useQuery({
    queryKey: preventiviKeys.detail(id ?? ''),
    queryFn: () => preventiviService.getById(id!),
    enabled: !!id,
  });
}

/** I preventivi del cliente, per la sezione dedicata nella sua scheda. */
export function usePreventiviPerCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: preventiviKeys.perCliente(clienteId ?? ''),
    queryFn: () => preventiviService.listPerCliente(clienteId!),
    enabled: !!clienteId,
  });
}

/**
 * Contatori delle pill di filtro.
 *
 * Prendono gli stessi filtri dell'elenco TRANNE lo stato: se contassero anche
 * quello, ogni pill mostrerebbe il numero della pill attiva e le altre zero.
 */
export function useConteggiPreventivi(filtri?: ContatoriFiltri) {
  return useQuery({
    queryKey: preventiviKeys.conteggi(filtri),
    queryFn: () => preventiviService.contaPerStato(filtri),
    placeholderData: (precedenti) => precedenti,
  });
}

/**
 * Ogni mutazione invalida `preventiviKeys.all` e non la sola riga toccata.
 *
 * Sembra eccessivo e non lo è: cambiare stato a un preventivo sposta i contatori
 * delle pill, l'ordinamento dell'elenco e la sezione nella scheda del cliente.
 * Invalidare il singolo dettaglio lascerebbe tutti e tre indietro.
 */
function useInvalidaPreventivi() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: preventiviKeys.all });
}

export function useCreaPreventivo() {
  const invalida = useInvalidaPreventivi();
  return useMutation({
    mutationFn: (input: PreventivoInput) => preventiviService.create(input),
    onSuccess: invalida,
  });
}

export function useAggiornaPreventivo() {
  const invalida = useInvalidaPreventivi();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PreventivoInput> }) =>
      preventiviService.update(id, patch),
    onSuccess: invalida,
  });
}

export function useEliminaPreventivo() {
  const invalida = useInvalidaPreventivi();
  return useMutation({
    mutationFn: (id: string) => preventiviService.remove(id),
    onSuccess: invalida,
  });
}

/**
 * Le transizioni di stato in un hook solo, scelte per nome.
 *
 * Un hook per transizione sarebbero quattro `useMutation` da dichiarare nella
 * pagina di dettaglio, che le usa tutte. Qui l'azione è un parametro, e il
 * call-site resta una riga.
 *
 * `scaduto` non è fra le azioni: non è uno stato che si sceglie, è quello che
 * diventa un inviato quando passa la sua validità.
 */
export type AzionePreventivo = 'invia' | 'accetta' | 'rifiuta' | 'riportaInBozza';

export function useAzionePreventivo() {
  const invalida = useInvalidaPreventivi();
  return useMutation({
    mutationFn: ({
      id,
      azione,
      motivo,
    }: {
      id: string;
      azione: AzionePreventivo;
      motivo?: string;
    }) => {
      switch (azione) {
        case 'invia':
          return preventiviService.invia(id);
        case 'accetta':
          return preventiviService.accetta(id);
        case 'rifiuta':
          return preventiviService.rifiuta(id, motivo);
        case 'riportaInBozza':
          return preventiviService.riportaInBozza(id);
      }
    },
    onSuccess: invalida,
  });
}

/**
 * La conversione in commessa.
 *
 * Oggi il service lancia: l'aggancio lo fa la chat C al task 4.2. L'errore va
 * lasciato arrivare al chiamante invece di essere inghiottito qui, perché il
 * dialog lo deve MOSTRARE — chi prova capisce che manca il collegamento, non
 * che il modulo è rotto.
 */
export function useConvertiInCommessa() {
  const invalida = useInvalidaPreventivi();
  return useMutation({
    mutationFn: (id: string) => preventiviService.convertiInCommessa(id),
    onSuccess: invalida,
  });
}
