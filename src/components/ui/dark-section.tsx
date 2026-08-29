import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * DarkSection — il contenitore "card di sezione" del design system.
 * docs/DESIGN_SYSTEM.md §6.5.
 *
 * Pattern: `bg-[#111111] border-white/[0.06] rounded-[20px] p-5`
 *
 *   <DarkSection title="Luoghi di intervento" action={<Button>Aggiungi</Button>}>
 *     …
 *   </DarkSection>
 */
interface DarkSectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Titolo mostrato in testata. */
  title?: string;
  /** Hint testuale in corsivo accanto al titolo. */
  hint?: string;
  /** Elemento (CTA, badge) ancorato a destra del titolo. */
  action?: React.ReactNode;
  /** Padding ridotto (p-4 invece di p-5). */
  compact?: boolean;
  /** Senza bordo — per sezioni inline su una superficie già distinta. */
  borderless?: boolean;
  /**
   * Riempie l'altezza del parent. Serve nelle pagine `h-full flex flex-col`
   * dove la sezione deve crescere e contenere una DarkTable con scroll
   * interno: la tabella scrolla, la pagina no.
   */
  fillHeight?: boolean;
  children: React.ReactNode;
}

export function DarkSection({
  title,
  hint,
  action,
  compact,
  borderless,
  fillHeight,
  children,
  className,
  ...rest
}: DarkSectionProps) {
  return (
    <section
      className={cn(
        'rounded-[20px] bg-[#111111]',
        !borderless && 'border border-white/[0.06]',
        compact ? 'p-4' : 'p-5',
        fillHeight && 'flex min-h-0 flex-1 flex-col overflow-hidden',
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <div
          className={cn('mb-4 flex items-center justify-between gap-3', fillHeight && 'shrink-0')}
        >
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2 className="truncate text-base font-semibold text-white">{title}</h2>}
            {hint && <span className="text-[11px] italic text-white/35">{hint}</span>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * SectionCard — la variante delle pagine di DETTAGLIO: padding più generoso e
 * `scroll-mt-20` perché il jump-nav sticky non copra il titolo quando ci si
 * salta sopra.
 */
export function SectionCard({
  id,
  title,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20 rounded-[20px] border border-white/[0.06] bg-[#111111] p-6',
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** SideCard — la colonna stretta (4/12) del dettaglio. Titolo in maiuscoletto. */
export function SideCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-[20px] border border-white/[0.06] bg-[#111111] p-5', className)}
    >
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
        {title}
      </h3>
      {children}
    </div>
  );
}
