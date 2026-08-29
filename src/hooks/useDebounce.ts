import { useEffect, useState } from 'react';

/**
 * Ritarda un valore finché smette di cambiare.
 *
 * Serve ai campi di ricerca: senza, ogni tasto è una query. Con i mock non si
 * nota, col backend vero sono venti richieste per «Casalecchio» — e le risposte
 * possono arrivare fuori ordine, facendo lampeggiare in tabella i risultati di
 * una ricerca già superata.
 *
 * 250 ms è la soglia sotto cui la ricerca sembra ancora istantanea.
 */
export function useDebounce<T>(valore: T, ms = 250): T {
  const [ritardato, setRitardato] = useState(valore);

  useEffect(() => {
    const t = setTimeout(() => setRitardato(valore), ms);
    return () => clearTimeout(t);
  }, [valore, ms]);

  return ritardato;
}
