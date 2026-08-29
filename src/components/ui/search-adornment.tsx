import * as React from 'react';
import { Search } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * SearchAdornment — la lente del campo di ricerca che, mentre l'app cerca,
 * diventa uno spinner nella stessa posizione.
 * docs/DESIGN_SYSTEM.md §6.15.
 *
 * Sostituisce la lente invece di aggiungere uno spinner a destra: non tocca il
 * padding del campo (zero salti di layout) e l'icona sta dove l'occhio è già
 * puntato mentre si digita.
 *
 *   <div className="relative">
 *     <SearchAdornment busy={q.isFetching}
 *       className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
 *     <Input className="pl-9" placeholder="Cerca…" />
 *   </div>
 */

/**
 * Il colore testo del call-site va scartato: la lente a riposo è volutamente
 * smorta (`text-white/40`), ma uno spinner a quel contrasto non si vede girare.
 */
function isTextColor(c: string): boolean {
  return /^text-(white|black|muted|foreground|slate|zinc|gray|neutral)/.test(c) || /^text-\[/.test(c);
}

const SIZE_CLASS = /^-?(w|h|size|min-w|min-h|max-w|max-h)-/;

/**
 * Separa le classi in posizione e taglia, e la ragione è un bug vero: la lente
 * è posizionata con `top-1/2 -translate-y-1/2`, ma `animate-spin` dichiara solo
 * il keyframe `to { rotate(360deg) }`. Il `from` implicito è il transform
 * CALCOLATO — cioè la traslazione — e il browser interpola fra le due matrici:
 * l'icona scende di mezza altezza durante il giro e risale di scatto al ciclo
 * dopo. Si legge come un saltello, non come una rotazione.
 *
 * Perciò posizione e trasformazione vanno su uno span esterno che non anima, e
 * sull'elemento che gira resta solo la taglia.
 */
function splitAdornmentClasses(className?: string): { size: string; wrapper: string } {
  const parts = (className ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => !isTextColor(c));
  return {
    size: parts.filter((c) => SIZE_CLASS.test(c)).join(' '),
    wrapper: parts.filter((c) => !SIZE_CLASS.test(c)).join(' '),
  };
}

interface SearchAdornmentProps {
  /** true = la ricerca sta lavorando (query in volo, debounce in corso). */
  busy?: boolean;
  /** La className che l'icona aveva: posizione, taglia, colore a riposo. */
  className?: string;
  /** Colore dello spinner: azzurro di brand, si stacca senza urlare. */
  spinnerClassName?: string;
}

export function SearchAdornment({
  busy,
  className,
  spinnerClassName = 'text-[#7eb0ff]',
}: SearchAdornmentProps) {
  const show = useBusySignal(busy);

  if (show) {
    const { size, wrapper } = splitAdornmentClasses(className);
    return (
      <span
        className={cn('pointer-events-none inline-flex items-center justify-center', wrapper)}
        aria-hidden
      >
        <Spinner size="sm" className={cn(size, spinnerClassName)} />
      </span>
    );
  }
  return <Search className={cn(className)} />;
}

/**
 * useBusySignal — antisfarfallio per gli indicatori di attesa. Due soglie,
 * entrambe necessarie:
 *  - `delay`: sotto i ~120ms l'indicatore NON compare. Una risposta dalla cache
 *    arriva in 20ms e uno spinner che lampeggia a ogni tasto è peggio di
 *    nessuno spinner.
 *  - `minVisible`: una volta comparso resta almeno ~400ms. Senza, una risposta
 *    a 130ms produce un guizzo che si legge come un glitch grafico.
 *
 * Esportato perché lo usino anche le etichette testuali, che devono comparire
 * e sparire NEGLI STESSI istanti dello spinner.
 */
export function useBusySignal(
  busy?: boolean,
  { delay = 120, minVisible = 400 }: { delay?: number; minVisible?: number } = {},
): boolean {
  const [show, setShow] = React.useState(false);
  const shownAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (busy) {
      if (show) return;
      const t = setTimeout(() => {
        shownAt.current = performance.now();
        setShow(true);
      }, delay);
      return () => clearTimeout(t);
    }

    if (!show) return;
    const elapsed = performance.now() - (shownAt.current ?? 0);
    const rest = Math.max(0, minVisible - elapsed);
    const t = setTimeout(() => setShow(false), rest);
    return () => clearTimeout(t);
  }, [busy, show, delay, minVisible]);

  return show;
}

/**
 * SearchStatus — l'etichetta accanto alla lista: "Ricerca in corso…" mentre il
 * termine è in volo, "Dati in caricamento…" al primo caricamento. Va dove sta
 * il conteggio dei risultati: è lì che si guarda per capire se il numero è
 * aggiornato.
 */
export function SearchStatus({
  busy,
  searching,
  className,
}: {
  busy?: boolean;
  searching?: boolean;
  className?: string;
}) {
  const show = useBusySignal(busy);
  if (!show) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-[11px] text-white/60', className)}
    >
      <Spinner size="xs" />
      {searching ? 'Ricerca in corso…' : 'Dati in caricamento…'}
    </span>
  );
}
