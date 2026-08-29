import { cn } from '@/lib/utils';

interface AvanzamentoBarProps {
  /** 0–100, già derivato dalle lavorazioni completate. */
  valore: number;
  /** In tabella la barra è sottile e senza etichetta: la riga è alta 40px. */
  compact?: boolean;
  className?: string;
}

/**
 * Barra di avanzamento di una commessa.
 *
 * Il pieno è bianco, non verde: in questo progetto «a posto» è bianco e il
 * colore resta agli avvisi (ONBOARDING-GRAFICO §8). Al 100% resta bianco —
 * lo stato «completata» lo dice già la badge accanto, ripeterlo in verde
 * sarebbe la stessa informazione due volte.
 */
export function AvanzamentoBar({ valore, compact, className }: AvanzamentoBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(valore)));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-white/[0.06]',
          compact ? 'h-1' : 'h-1.5',
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-white/70 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <span className="shrink-0 text-[11px] tabular-nums text-white/45">{pct}%</span>
      )}
    </div>
  );
}
