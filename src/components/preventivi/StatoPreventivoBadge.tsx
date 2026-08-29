import { StatusPill } from '@/components/ui/status-pill';
import type { StatoPreventivo } from '@/types/preventivo';
import { statoPreventivoAccent, statoPreventivoLabel } from '@/types/preventivo';

interface StatoPreventivoBadgeProps {
  stato: StatoPreventivo;
  /**
   * `dot` è la variante della COLONNA STATO di una tabella: in dieci righe,
   * dieci pillole piene diventano una bandiera e il testo smette di leggersi.
   * `solid` sta dove la badge è una sola — testate, riepiloghi.
   */
  variant?: 'solid' | 'dot';
  className?: string;
}

/**
 * Lo stato di un preventivo, sempre con lo stesso colore ovunque compaia.
 *
 * Va alimentato con `statoEffettivo(p)` e non con `p.stato`: «scaduto» non è un
 * valore salvato, è quello che diventa un inviato quando passa la sua validità.
 * Passare il campo grezzo qui vorrebbe dire un elenco che mostra «Inviato» su
 * righe che l'elenco stesso ha già contato fra gli scaduti.
 */
export function StatoPreventivoBadge({
  stato,
  variant = 'solid',
  className,
}: StatoPreventivoBadgeProps) {
  return (
    <StatusPill accent={statoPreventivoAccent(stato)} variant={variant} className={className}>
      {statoPreventivoLabel(stato)}
    </StatusPill>
  );
}
