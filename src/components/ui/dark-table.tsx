import * as React from 'react';
import { cn } from '@/lib/utils';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * DarkTable — la tabella dell'app. docs/DESIGN_SYSTEM.md §6.4.
 *
 * Header con bordo sottile, zebra sulle righe dispari, hover, scroll-x
 * interno, e loading/empty gestiti dal componente invece che da ogni pagina.
 *
 *   <DarkTable loading={q.isLoading} empty={righe.length === 0}
 *     emptyIcon={Users} emptyMessage="Nessun cliente">
 *     <DarkTableHeader sticky>
 *       <DarkTableHead>Cliente</DarkTableHead>
 *       <DarkTableHead align="right">Importo</DarkTableHead>
 *     </DarkTableHeader>
 *     <DarkTableBody>
 *       {righe.map((r, i) => (
 *         <DarkTableRow key={r.id} zebraIndex={i} onRowClick={() => apri(r)}>
 *           <DarkTableCell>{r.nome}</DarkTableCell>
 *           <DarkTableCell align="right" tabular>{fmt(r.importo)}</DarkTableCell>
 *         </DarkTableRow>
 *       ))}
 *     </DarkTableBody>
 *   </DarkTable>
 */

interface DarkTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Skeleton al posto delle righe. */
  loading?: boolean;
  loadingRows?: number;
  /** Stato vuoto interno (ignorato mentre `loading`). */
  empty?: boolean;
  emptyMessage?: string;
  emptyDescription?: React.ReactNode;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  /** Altezza massima con scroll-y interno, es. "60vh". */
  maxHeight?: string;
  /**
   * Riempie il parent invece di usare maxHeight. Per le pagine
   * `h-full flex flex-col` con DarkSection fillHeight.
   */
  fillContainer?: boolean;
  /**
   * Classi sull'elemento <table>, non sul wrapper. Serve per
   * `table-fixed min-w-*`: col layout automatico le colonne si dimensionano
   * sul contenuto della pagina corrente, quindi cambiano a ogni paginazione.
   */
  tableClassName?: string;
}

export function DarkTable({
  children,
  loading,
  loadingRows = 6,
  empty,
  emptyMessage = 'Nessun dato',
  emptyDescription,
  emptyIcon,
  emptyAction,
  maxHeight,
  fillContainer,
  className,
  tableClassName,
  ...rest
}: DarkTableProps) {
  if (loading) {
    return (
      <div
        className={cn('-mx-2 overflow-x-auto', fillContainer && 'min-h-0 flex-1', className)}
        {...rest}
      >
        <div className="space-y-1.5 px-2">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn(fillContainer && 'flex min-h-0 flex-1 flex-col', className)} {...rest}>
        <TableEmptyState
          icon={emptyIcon}
          title={emptyMessage}
          description={emptyDescription}
          action={emptyAction}
          className={fillContainer ? 'flex-1' : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        '-mx-2 overflow-x-auto',
        maxHeight && 'overflow-y-auto',
        fillContainer && 'min-h-0 flex-1 overflow-y-auto',
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
      {...rest}
    >
      <table className={cn('w-full text-[12.5px]', tableClassName)}>{children}</table>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

interface DarkTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  /** Da attivare quando la tabella ha uno scroll-y interno. */
  sticky?: boolean;
}

export function DarkTableHeader({ children, sticky, className, ...rest }: DarkTableHeaderProps) {
  return (
    <thead
      // Fascia header leggermente distinta dal corpo. Sticky → tono opaco,
      // altrimenti le righe traspaiono sotto mentre si scorre.
      className={cn(sticky ? 'sticky top-0 z-10 bg-[#141414]' : 'bg-white/[0.02]', className)}
      {...rest}
    >
      <tr className="h-9 border-b border-white/[0.06] text-left text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
        {children}
      </tr>
    </thead>
  );
}

// ── Celle di intestazione ───────────────────────────────────────────────────

type Align = 'left' | 'right' | 'center';

interface DarkTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  align?: Align;
}

export function DarkTableHead({
  children,
  align = 'left',
  className,
  ...rest
}: DarkTableHeadProps) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 font-medium',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

// ── Corpo ───────────────────────────────────────────────────────────────────

export function DarkTableBody({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

// ── Riga ────────────────────────────────────────────────────────────────────

interface DarkTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  /** Indice 0-based per lo zebra striping. */
  zebraIndex?: number;
  noZebra?: boolean;
  selected?: boolean;
  /** Quando presente la riga diventa cliccabile. */
  onRowClick?: () => void;
}

export function DarkTableRow({
  children,
  zebraIndex,
  noZebra,
  selected,
  onRowClick,
  className,
  ...rest
}: DarkTableRowProps) {
  const zebra = !noZebra && zebraIndex !== undefined && zebraIndex % 2 === 1;
  return (
    <tr
      onClick={onRowClick}
      className={cn(
        'border-b border-white/[0.04] transition-colors',
        selected
          ? 'bg-[#1E6FFF]/[0.10]'
          : zebra
            ? 'bg-white/[0.015] hover:bg-white/[0.04]'
            : 'hover:bg-white/[0.04]',
        onRowClick && 'cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

// ── Cella ───────────────────────────────────────────────────────────────────

interface DarkTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  align?: Align;
  /** Codici e identificativi. */
  mono?: boolean;
  /** Cifre allineate: obbligatorio su ogni numero incolonnato. */
  tabular?: boolean;
  /** Troncamento con larghezza massima (default 240px). */
  truncate?: boolean | string;
}

export function DarkTableCell({
  children,
  align,
  mono,
  tabular,
  truncate,
  className,
  ...rest
}: DarkTableCellProps) {
  const maxW = typeof truncate === 'string' ? truncate : truncate === true ? '240px' : undefined;
  return (
    <td
      className={cn(
        'px-3 py-2.5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono text-[12px]',
        tabular && 'tabular-nums',
        truncate && 'truncate',
        className,
      )}
      style={maxW ? { maxWidth: maxW } : undefined}
      {...rest}
    >
      {children}
    </td>
  );
}
