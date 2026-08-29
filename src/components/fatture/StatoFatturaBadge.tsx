import { StatusPill } from '@/components/ui/status-pill';
import { statoFatturaAccent, statoFatturaLabel, type StatoFattura } from '@/types/fattura';

interface StatoFatturaBadgeProps {
  stato: StatoFattura;
  /** 'dot' nella colonna stato di una tabella, 'solid' quando la badge è sola. */
  variant?: 'solid' | 'dot';
  className?: string;
}

/**
 * L'unico posto che traduce uno stato di fattura in colore ed etichetta.
 * Il markup della pill non si riscrive: passa da `StatusPill`.
 */
export function StatoFatturaBadge({ stato, variant = 'dot', className }: StatoFatturaBadgeProps) {
  return (
    <StatusPill accent={statoFatturaAccent(stato)} variant={variant} className={className}>
      {statoFatturaLabel(stato)}
    </StatusPill>
  );
}
