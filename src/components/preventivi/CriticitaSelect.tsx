import { Check } from '@/components/ui/icons';
import {
  TAB_PILLS_CONTAINER,
  TAB_PILL_ICON,
  TAB_PILL_INACTIVE,
  TAB_PILL_ITEM,
} from '@/components/ui/tab-pills';
import { STATUS_PILL_ACCENT } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import type { Criticita } from '@/types/preventivo';
import { CRITICITA, criticitaAccent, criticitaLabel } from '@/types/preventivo';

interface CriticitaSelectProps {
  value: Criticita[];
  onChange: (v: Criticita[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Le criticità rilevate in sopralluogo: si spuntano, non si scelgono a una a
 * una. Sono quasi sempre più di una, e un select singolo costringerebbe a
 * infilare le altre nelle note — dove nessuna query le troverà più.
 *
 * Le classi sono quelle di `TabPills` e di `StatusPill`, importate e non
 * ricopiate: una pillola cliccabile con un suo stile parallelo sarebbe la
 * seconda strada che DESIGN_SYSTEM §6.2 vieta di aprire. La differenza è solo
 * che qui la selezionata prende l'accent della propria gravità invece del blu,
 * perché «cavi elettrici» acceso deve leggersi come un pericolo e non come un
 * filtro attivo.
 */
export function CriticitaSelect({ value, onChange, disabled, className }: CriticitaSelectProps) {
  const attiva = (c: Criticita) => value.includes(c);

  const inverti = (c: Criticita) => {
    if (disabled) return;
    onChange(attiva(c) ? value.filter((x) => x !== c) : [...value, c]);
  };

  return (
    <div
      className={cn(TAB_PILLS_CONTAINER, 'flex-wrap gap-1 p-1', className)}
      role="group"
      aria-label="Criticità rilevate"
    >
      {CRITICITA.map((c) => {
        const on = attiva(c);
        return (
          <button
            key={c}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled}
            onClick={() => inverti(c)}
            className={cn(
              TAB_PILL_ITEM,
              'border',
              on ? STATUS_PILL_ACCENT[criticitaAccent(c)] : cn('border-transparent', TAB_PILL_INACTIVE),
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {on && <Check className={TAB_PILL_ICON} weight="bold" />}
            {criticitaLabel(c)}
          </button>
        );
      })}
    </div>
  );
}
