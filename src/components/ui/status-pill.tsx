import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * StatusPill — la badge dell'app. Una forma sola, otto colori.
 * docs/DESIGN_SYSTEM.md §6.9, e docs/UI-BADGE.md di Telebi.
 *
 * Una badge è SEMPRE una pillola: rounded-full, 10.5px semibold, bordo tenue.
 * Non ci sono badge squadrate, grandi o con ombra.
 *
 * REGOLA: non si scrive mai a mano `inline-flex … rounded-full … px-2 py-0.5
 * text-[10.5px]`. Se StatusPill non basta, si estende StatusPill — non si apre
 * una seconda strada.
 *
 * Il colore dice cosa succede al record, non da quale pagina arriva: un
 * preventivo rifiutato, una commessa annullata e una fattura scaduta sono
 * tutti `danger`. Chi legge impara il codice una volta e vale ovunque.
 */

export type StatusPillAccent =
  | 'neutral'
  | 'info'
  | 'emerald'
  | 'orange'
  | 'danger'
  | 'amber'
  | 'purple'
  | 'teal';

/**
 * Classi di ogni accent — esportate perché le eccezioni di dimensione (le
 * sigle strette nelle celle del calendario) usino GLI STESSI colori.
 */
export const STATUS_PILL_ACCENT: Record<StatusPillAccent, string> = {
  neutral: 'border-white/[0.08] bg-white/[0.04] text-white/65',
  info: 'border-[#1E6FFF]/30 bg-[#1E6FFF]/15 text-[#7eb0ff]',
  emerald: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  orange: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
  danger: 'border-red-500/30 bg-red-500/15 text-red-300',
  amber: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  purple: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  teal: 'border-teal-500/30 bg-teal-500/15 text-teal-300',
};

/** Colore del pallino per la variante `dot`. */
export const STATUS_PILL_DOT: Record<StatusPillAccent, string> = {
  neutral: 'bg-white/40',
  info: 'bg-[#1E6FFF]',
  emerald: 'bg-emerald-400',
  orange: 'bg-orange-400',
  danger: 'bg-red-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  teal: 'bg-teal-400',
};

interface StatusPillProps {
  accent?: StatusPillAccent;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  /** Tooltip nativo: il posto dove spiegare un numero, invece di allungare la pill. */
  title?: string;
  /**
   * 'dot' — pill neutra con pallino colorato davanti. È la variante della
   * COLONNA STATO di una tabella: in una colonna di dieci righe, dieci pillole
   * piene diventano una bandiera e il testo smette di leggersi. Il pallino dà
   * il colpo d'occhio, il testo resta bianco.
   *
   * 'solid' (default) — pill interamente colorata. Per etichette e contatori,
   * cioè quando la badge è una fra tante e deve distinguersi da sola.
   */
  variant?: 'solid' | 'dot';
}

export function StatusPill({
  accent = 'neutral',
  icon: Icon,
  children,
  className,
  title,
  variant = 'solid',
}: StatusPillProps) {
  if (variant === 'dot') {
    return (
      <span
        title={title}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
          'border-white/[0.08] bg-white/[0.04] text-white/70',
          className,
        )}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_PILL_DOT[accent])} />
        {Icon && <Icon className="h-3 w-3" />}
        {children}
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
        STATUS_PILL_ACCENT[accent],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

/**
 * Contatore tondo accanto a un titolo — NON è una badge: non ha un accent
 * perché non ha una semantica. Sta qui perché è la forma corretta da usare
 * quando si è tentati di mettere una StatusPill neutra.
 */
export function CountDot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] px-1 text-[10px] tabular-nums text-white/55',
        className,
      )}
    >
      {children}
    </span>
  );
}
