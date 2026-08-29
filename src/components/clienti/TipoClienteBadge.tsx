import { StatusPill } from '@/components/ui/status-pill';
import { tipoClienteLabel, TIPO_CLIENTE_ACCENT, type TipoCliente } from '@/types/cliente';

/**
 * Il tipo di cliente come badge.
 *
 * Variante `solid` e non `dot`: il tipo non è uno stato di avanzamento, è una
 * categoria — e nella colonna Stato di una tabella non ci va mai. Il `dot` è
 * riservato agli stati che cambiano nel tempo (docs/UI-BADGE.md §1).
 *
 * Il fallback su `neutral` non è opzionale: un tipo aggiunto e non ancora
 * mappato deve rendersi grigio, non far esplodere la cella.
 */
export function TipoClienteBadge({ tipo }: { tipo: TipoCliente }) {
  return (
    <StatusPill accent={TIPO_CLIENTE_ACCENT[tipo] ?? 'neutral'}>
      {tipoClienteLabel(tipo)}
    </StatusPill>
  );
}
