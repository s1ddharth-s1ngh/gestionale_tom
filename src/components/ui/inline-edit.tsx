import * as React from 'react';
import { Check, X, Pencil } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * InlineEditField — il campo che si modifica cliccandolo.
 * docs/DESIGN_SYSTEM.md §6.12.
 *
 * È il modo in cui si modifica un record nelle pagine di dettaglio: niente
 * drawer «modifica», niente modalità edit sulla pagina intera. Si clicca il
 * valore, diventa un input, si conferma.
 *
 * Le scorciatoie sono quelle che chi compila si aspetta, e vanno tutte e tre:
 *   Invio     → salva
 *   Esc       → annulla e rimette il valore di prima
 *   uscita    → salva (blur). Chi clicca sul campo dopo, o preme Tab, ha
 *               finito con questo: chiedere una conferma in più sarebbe un
 *               clic per niente.
 *
 * Il valore torna quello vecchio se il salvataggio fallisce: lasciarlo
 * modificato a schermo farebbe credere che sia stato scritto.
 */
interface InlineEditFieldProps {
  value: string;
  onCommit: (nuovo: string) => Promise<void> | void;
  placeholder?: string;
  /** `mono` per codici e partite IVA, `uppercase` per CF e sigle. */
  className?: string;
  inputClassName?: string;
  /** Textarea invece di input, per le note. */
  multiline?: boolean;
  disabled?: boolean;
  /** Normalizza prima di salvare (es. maiuscolo per il codice fiscale). */
  normalizza?: (v: string) => string;
}

export function InlineEditField({
  value,
  onCommit,
  placeholder = 'Vuoto',
  className,
  inputClassName,
  multiline,
  disabled,
  normalizza,
}: InlineEditFieldProps) {
  const [inModifica, setInModifica] = React.useState(false);
  const [bozza, setBozza] = React.useState(value);
  const [salvando, setSalvando] = React.useState(false);
  // Evita il doppio salvataggio quando Invio fa anche perdere il focus.
  const giaChiuso = React.useRef(false);

  // Se il valore cambia da fuori (un refetch) mentre non si sta modificando,
  // la bozza deve seguirlo: altrimenti al clic successivo si riapre col
  // valore vecchio e lo si riscrive sopra a quello nuovo.
  React.useEffect(() => {
    if (!inModifica) setBozza(value);
  }, [value, inModifica]);

  const apri = () => {
    if (disabled) return;
    giaChiuso.current = false;
    setBozza(value);
    setInModifica(true);
  };

  const annulla = () => {
    giaChiuso.current = true;
    setBozza(value);
    setInModifica(false);
  };

  const conferma = async () => {
    if (giaChiuso.current) return;
    giaChiuso.current = true;

    const nuovo = (normalizza ? normalizza(bozza) : bozza).trim();
    if (nuovo === value.trim()) {
      setInModifica(false);
      return;
    }

    setSalvando(true);
    try {
      await onCommit(nuovo);
      setInModifica(false);
    } catch {
      // Il toast lo mostra il chiamante: qui si rimette il valore vero, così
      // a schermo non resta una modifica che il database non ha accettato.
      setBozza(value);
      setInModifica(false);
    } finally {
      setSalvando(false);
    }
  };

  if (!inModifica) {
    return (
      <button
        type="button"
        onClick={apri}
        disabled={disabled}
        title={disabled ? undefined : 'Clicca per modificare'}
        className={cn(
          'group -mx-1.5 flex w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left transition-colors',
          !disabled && 'hover:bg-white/[0.05]',
          disabled && 'cursor-default',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !value && 'italic text-white/30')}>
          {value || placeholder}
        </span>
        {!disabled && (
          <Pencil className="h-3 w-3 shrink-0 text-white/0 transition-colors group-hover:text-white/35" />
        )}
      </button>
    );
  }

  const comuni = {
    autoFocus: true,
    value: bozza,
    disabled: salvando,
    onBlur: () => void conferma(),
    className: cn(
      'w-full rounded-lg border border-[#1E6FFF]/60 bg-white/[0.06] px-1.5 py-0.5 text-inherit',
      'focus:outline-none disabled:opacity-60',
      inputClassName,
    ),
  };

  return (
    <div className="flex items-center gap-1.5">
      {multiline ? (
        <textarea
          {...comuni}
          rows={3}
          onChange={(e) => setBozza(e.target.value)}
          onKeyDown={(e) => {
            // Su textarea Invio va a capo: si conferma con Ctrl/Cmd+Invio.
            if (e.key === 'Escape') annulla();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void conferma();
          }}
        />
      ) : (
        <input
          {...comuni}
          onChange={(e) => setBozza(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') annulla();
            if (e.key === 'Enter') void conferma();
          }}
        />
      )}

      {salvando ? (
        <Spinner size="xs" className="shrink-0 text-[#7eb0ff]" />
      ) : (
        <span className="flex shrink-0 items-center gap-0.5">
          {/* onMouseDown e non onClick: il blur dell'input scatta prima del
              click, e con onClick il bottone sparirebbe senza essere premuto. */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              void conferma();
            }}
            title="Salva (Invio)"
            className="flex h-5 w-5 items-center justify-center rounded text-emerald-400/70 transition-colors hover:bg-white/[0.08] hover:text-emerald-300"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              annulla();
            }}
            title="Annulla (Esc)"
            className="flex h-5 w-5 items-center justify-center rounded text-white/35 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}
