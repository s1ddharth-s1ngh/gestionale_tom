import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * TablePagination — la barra sotto una lista. docs/DESIGN_SYSTEM.md §6.16.
 * Conteggio a sinistra, controlli a destra, separata da un filo sottile.
 *
 * Sotto sm i numeri di pagina spariscono e restano "‹ 3 / 12 ›": una fila di
 * numeri su schermo stretto sfonda la riga.
 */
interface TablePaginationProps {
  paginaCorrente: number;
  paginePerTotale: number;
  elementiTotali: number;
  elementiPerPagina: number;
  onCambiaPagina: (pagina: number) => void;
  /** Nome al plurale di cosa si sta elencando: "clienti", "preventivi". */
  nomeElementi?: string;
  className?: string;
}

/** Numeri visibili con le ellissi: 1 … 4 5 [6] 7 8 … 20 */
function paginaVisibili(corrente: number, totale: number): (number | '…')[] {
  const delta = 2;
  const range: number[] = [];
  for (
    let i = Math.max(2, corrente - delta);
    i <= Math.min(totale - 1, corrente + delta);
    i++
  ) {
    range.push(i);
  }

  const out: (number | '…')[] = [1];
  if (corrente - delta > 2) out.push('…');
  out.push(...range);
  if (corrente + delta < totale - 1) out.push('…');
  if (totale > 1) out.push(totale);
  return out;
}

const NAV_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40';

export function TablePagination({
  paginaCorrente,
  paginePerTotale,
  elementiTotali,
  elementiPerPagina,
  onCambiaPagina,
  nomeElementi = 'elementi',
  className,
}: TablePaginationProps) {
  if (paginePerTotale <= 1) return null;

  const primo = (paginaCorrente - 1) * elementiPerPagina + 1;
  const ultimo = Math.min(paginaCorrente * elementiPerPagina, elementiTotali);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.06] px-4 py-3',
        className,
      )}
    >
      <div className="text-[11px] tabular-nums text-white/45">
        Mostrando{' '}
        <span className="font-semibold text-white/70">
          {primo}–{ultimo}
        </span>{' '}
        di <span className="font-semibold text-white/70">{elementiTotali}</span> {nomeElementi}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={NAV_BTN}
          disabled={paginaCorrente <= 1}
          onClick={() => onCambiaPagina(paginaCorrente - 1)}
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {paginaVisibili(paginaCorrente, paginePerTotale).map((p, i) =>
          p === '…' ? (
            <span key={`sep-${i}`} className="hidden px-1 text-white/30 sm:inline">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onCambiaPagina(p)}
              className={cn(
                'hidden h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs tabular-nums transition-colors sm:inline-flex',
                p === paginaCorrente
                  ? 'bg-[#1E6FFF] font-semibold text-white'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              {p}
            </button>
          ),
        )}

        {/* Sotto sm: indicatore compatto al posto dei numeri. */}
        <span className="inline-flex h-8 items-center px-2.5 text-[12px] tabular-nums text-white/60 sm:hidden">
          {paginaCorrente} / {paginePerTotale}
        </span>

        <button
          type="button"
          className={NAV_BTN}
          disabled={paginaCorrente >= paginePerTotale}
          onClick={() => onCambiaPagina(paginaCorrente + 1)}
          aria-label="Pagina successiva"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
