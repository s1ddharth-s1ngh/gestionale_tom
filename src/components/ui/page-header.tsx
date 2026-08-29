import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * PageHeader — l'intestazione di TUTTE le pagine e sottopagine.
 * docs/DESIGN_SYSTEM.md §6.1.
 *
 * La scala è quella di Telebi: titolo `text-2xl font-bold tracking-tight`,
 * sottotitolo `text-[12px] text-white/40`. Prima di avere questo componente,
 * in Telebi convivevano una ventina di varianti di <h1>. Il senso di averne
 * UNO è che lo stile si cambia QUI e cambia ovunque — non se ne aggiunge un
 * secondo.
 *
 * Le pagine di dettaglio passano il dato come `title` (numero preventivo,
 * denominazione cliente) e nel `subtitle` dicono cosa si fa in quella pagina.
 *
 *   <PageHeader
 *     breadcrumb={{ to: '/preventivi', label: 'Preventivi' }}
 *     eyebrow="Preventivo"
 *     title="PR-2026-0042"
 *     subtitle="Condominio Via Battisti 14 · sopralluogo del 12 marzo"
 *     actions={<Button variant="primary">Invia</Button>}
 *   />
 */
interface PageHeaderProps {
  /** Mini-link in alto (ChevronLeft + etichetta) verso la lista di provenienza. */
  breadcrumb?: { to: string; label: string } | null;
  /** Eyebrow in maiuscoletto sopra il titolo (es. "Cliente", "Commessa"). */
  eyebrow?: string;
  /** Titolo principale. Accetta JSX per i dettagli che affiancano un badge. */
  title: React.ReactNode;
  /** Sottotitolo: cosa fa questa pagina, o il contesto del record. */
  subtitle?: React.ReactNode;
  /** Extra sul solo <h1> (es. `font-mono`, `truncate`) — non sostituisce la scala. */
  titleClassName?: string;
  /** Riga di badge o metadati ancorata sotto il titolo. */
  meta?: React.ReactNode;
  /** Azioni a destra. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumb,
  eyebrow,
  title,
  subtitle,
  titleClassName,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumb && (
        <Link
          to={breadcrumb.to}
          className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'text-2xl font-bold tracking-tight text-white',
              eyebrow && 'mt-1',
              titleClassName,
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-[12px] text-white/40">{subtitle}</p>}
          {meta && <div className="mt-3">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
