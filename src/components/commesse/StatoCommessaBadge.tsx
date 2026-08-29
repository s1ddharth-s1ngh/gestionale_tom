import { StatusPill } from '@/components/ui/status-pill';
import { statoCommessaAccent, statoCommessaLabel, type StatoCommessa } from '@/types/commessa';

interface StatoCommessaBadgeProps {
  stato: StatoCommessa;
  /** 'dot' nella colonna stato di una tabella, 'solid' quando la badge è sola. */
  variant?: 'solid' | 'dot';
  className?: string;
}

/**
 * L'unico posto che traduce uno stato di commessa in colore ed etichetta.
 * Non si scrive a mano il markup di una pill: qui si passa da StatusPill.
 */
export function StatoCommessaBadge({ stato, variant = 'dot', className }: StatoCommessaBadgeProps) {
  return (
    <StatusPill accent={statoCommessaAccent(stato)} variant={variant} className={className}>
      {statoCommessaLabel(stato)}
    </StatusPill>
  );
}
