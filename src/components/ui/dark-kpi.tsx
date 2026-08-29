import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * DarkKpi — la tile numerica. docs/DESIGN_SYSTEM.md §6.8.
 * Icona in chip colorato + valore tabular + etichetta in maiuscoletto.
 *
 *   <DarkKpi icon={Receipt} accent="emerald" label="Da incassare"
 *            valueFormatted={formatCurrency(totale, { interi: true })} />
 */

export type DarkKpiAccent =
  | 'neutral'
  | 'info'
  | 'emerald'
  | 'orange'
  | 'danger'
  | 'purple'
  | 'amber';

const ACCENT_BG: Record<DarkKpiAccent, string> = {
  neutral: 'bg-white/[0.06]',
  info: 'bg-[#1E6FFF]/15',
  emerald: 'bg-emerald-500/15',
  orange: 'bg-orange-500/15',
  danger: 'bg-red-500/15',
  purple: 'bg-purple-500/15',
  amber: 'bg-amber-500/15',
};

const ACCENT_BORDER: Record<DarkKpiAccent, string> = {
  neutral: 'border-white/[0.08]',
  info: 'border-[#1E6FFF]/30',
  emerald: 'border-emerald-500/30',
  orange: 'border-orange-500/30',
  danger: 'border-red-500/30',
  purple: 'border-purple-500/30',
  amber: 'border-amber-500/30',
};

const ACCENT_ICON: Record<DarkKpiAccent, string> = {
  neutral: 'text-white/55',
  info: 'text-[#7eb0ff]',
  emerald: 'text-emerald-400',
  orange: 'text-orange-400',
  danger: 'text-red-400',
  purple: 'text-purple-400',
  amber: 'text-amber-300',
};

interface DarkKpiProps {
  icon: LucideIcon;
  accent?: DarkKpiAccent;
  label: string;
  /** Valore numerico, reso tabular. */
  value?: number | null;
  /** Versione già formattata (es. "€ 12.480"), scavalca `value`. */
  valueFormatted?: string;
  /** Suffisso minore inline (es. "h", "%"). */
  suffix?: string;
  /**
   * Ogni tile dichiara il PROPRIO caricamento: i moduli rispondono in tempi
   * diversi e chi è pronto non deve aspettare gli altri.
   */
  loading?: boolean;
  /** Quando presente, la tile diventa cliccabile. */
  onClick?: () => void;
  className?: string;
}

export function DarkKpi({
  icon: Icon,
  accent = 'neutral',
  label,
  value,
  valueFormatted,
  suffix,
  loading,
  onClick,
  className,
}: DarkKpiProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-[#111111] p-4',
        interactive && 'cursor-pointer transition-colors hover:border-white/[0.18]',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          ACCENT_BG[accent],
          ACCENT_BORDER[accent],
        )}
      >
        <Icon className={cn('h-5 w-5', ACCENT_ICON[accent])} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p
            className={cn(
              'font-bold leading-none tabular-nums text-white',
              valueFormatted ? 'truncate text-lg' : 'text-2xl',
            )}
          >
            {valueFormatted ?? value ?? 0}
            {suffix && (
              <span className="ml-0.5 text-[11px] font-normal text-white/40">{suffix}</span>
            )}
          </p>
        )}
        <p className="mt-1 text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      </div>
    </div>
  );
}
