import { StatusPill } from '@/components/ui/status-pill';
import type { StatoCommessa } from '@/types/commessa';
import { statoCommessaAccent, statoCommessaLabel } from '@/types/commessa';

interface StatoCommessaBadgeProps {
  stato: StatoCommessa;
  /**
   * `dot` è la variante della COLONNA STATO di una tabella: in dieci righe,
   * dieci pillole piene diventano una bandiera e il testo smette di leggersi.
   * `solid` sta dove la badge è una sola — testate, celle di calendario.
   */
  variant?: 'solid' | 'dot';
  className?: string;
}

/**
 * Lo stato di una commessa, sempre con lo stesso colore ovunque compaia.
 *
 * Esiste per un motivo solo: elenco, calendario e dettaglio devono dire la
 * stessa cosa nello stesso modo. Il giorno che un colore cambia, cambia qui.
 */
export function StatoCommessaBadge({ stato, variant = 'solid', className }: StatoCommessaBadgeProps) {
  return (
    <StatusPill accent={statoCommessaAccent(stato)} variant={variant} className={className}>
      {statoCommessaLabel(stato)}
    </StatusPill>
  );
}
