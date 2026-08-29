import { StatusPill } from '@/components/ui/status-pill';
import type { StatoFatturaFornitoreEffettivo } from '@/types/fatturaFornitore';
import {
  statoFatturaFornitoreAccent,
  statoFatturaFornitoreLabel,
} from '@/types/fatturaFornitore';

interface StatoFatturaFornitoreBadgeProps {
  stato: StatoFatturaFornitoreEffettivo;
  /**
   * `dot` è la variante della COLONNA STATO: in dieci righe, dieci pillole
   * piene diventano una bandiera e il testo smette di leggersi.
   */
  variant?: 'solid' | 'dot';
  className?: string;
}

/**
 * Lo stato di una fattura fornitore.
 *
 * Va alimentato con lo stato EFFETTIVO, quello che calcola
 * `v_fatture_fornitore`: in tabella ci sono solo `bozza` e `registrata`, e
 * stampare il campo grezzo mostrerebbe «Registrata» su righe che l'elenco ha
 * già contato fra le scadute.
 */
export function StatoFatturaFornitoreBadge({
  stato,
  variant = 'solid',
  className,
}: StatoFatturaFornitoreBadgeProps) {
  return (
    <StatusPill
      accent={statoFatturaFornitoreAccent(stato)}
      variant={variant}
      className={className}
    >
      {statoFatturaFornitoreLabel(stato)}
    </StatusPill>
  );
}
