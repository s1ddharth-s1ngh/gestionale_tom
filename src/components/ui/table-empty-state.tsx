import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * TableEmptyState — lo stato vuoto delle liste. docs/DESIGN_SYSTEM.md §6.6.
 *
 * Altezza minima uniforme così tutte le tabelle vuote dell'app appaiono
 * allineate fra loro invece di collassare ognuna alla sua altezza.
 *
 * Regola d'uso: gli stati vuoti sono DUE e vanno distinti.
 *  - filtri attivi e nessun risultato → icona `Search`, "Nessun risultato per
 *    i filtri", azione "Azzera filtri";
 *  - archivio proprio vuoto → icona dell'entità, "Nessun cliente", azione
 *    "Aggiungi il primo cliente".
 * Mostrare il secondo quando vale il primo fa credere che i dati siano spariti.
 */
interface TableEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Padding e altezza ridotti, per le card piccole. */
  compact?: boolean;
  className?: string;
}

export function TableEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: TableEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'min-h-[160px] py-10' : 'min-h-[260px] py-16',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04]">
          <Icon className="h-5 w-5 text-white/30" />
        </div>
      )}
      <p className="text-[13px] font-medium text-white/55">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-white/35">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
