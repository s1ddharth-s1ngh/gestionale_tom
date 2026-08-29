import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { AlertTriangle } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * DataState — il punto UNICO da cui passa loading → errore → vuoto → dati.
 * docs/DESIGN_SYSTEM.md §6.7.
 *
 * Le pagine avvolgono la lista e non reimplementano skeleton, stato vuoto ed
 * errore ognuna a modo suo.
 *
 *   <DataState loading={q.isLoading} error={q.error} isEmpty={righe.length === 0}
 *     emptyState={<TableEmptyState icon={Users} title="Nessun cliente" />}
 *     onRetry={q.refetch}>
 *     …
 *   </DataState>
 */
interface DataStateProps {
  loading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  /** Passa lo skeleton che rispecchia il layout vero, per evitare i salti. */
  skeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataState({
  loading,
  error,
  isEmpty,
  skeleton,
  emptyState,
  errorState,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) return <>{skeleton ?? <ListSkeleton />}</>;
  if (error) return <>{errorState ?? <DefaultErrorState onRetry={onRetry} />}</>;
  if (isEmpty) return <>{emptyState ?? <TableEmptyState title="Nessun dato." />}</>;
  return <>{children}</>;
}

/** Ripete uno skeleton-riga N volte. Riempi il viewport: 6-8 righe. */
export function ListSkeleton({
  count = 6,
  item,
  className,
}: {
  count?: number;
  item?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{item ?? <Skeleton className="h-16 rounded-2xl" />}</React.Fragment>
      ))}
    </div>
  );
}

function DefaultErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-red-500/20 bg-[#111111] p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-red-300/80" />
      <p className="text-[13px] text-white/70">Si è verificato un errore nel caricamento.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-8 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[12px] text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          Riprova
        </button>
      )}
    </div>
  );
}
