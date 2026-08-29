import { cn } from '@/lib/utils';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * TabPills — LA fila di bottoni sotto il titolo di una pagina.
 * docs/DESIGN_SYSTEM.md §6.2.
 *
 * Segmented control scuro: contenitore pill con bordo, pillola attiva blu di
 * brand, item bassi e compatti. Serve tre ruoli diversi, e vanno tutti bene:
 * filtri di lista, switch di vista, jump-nav fra le sezioni di un dettaglio.
 *
 * NIENTE alternative: ogni fila di bottoni di alto livello usa questo
 * componente. Lo stile si cambia QUI e cambia ovunque, non si riscrive il
 * markup a mano nelle pagine.
 *
 * Le costanti sono esportate perché i casi particolari (una pill quadrata di
 * sola icona, uno switch di vista) usino GLI STESSI valori invece di
 * inventarsene di paralleli.
 */

/** Contenitore del segmented control (senza il comportamento responsive). */
export const TAB_PILLS_CONTAINER =
  'flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]';
/** Classe base di una pillola. */
export const TAB_PILL_ITEM =
  'shrink-0 h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap';
/** Pillola selezionata — il blu di brand è il default. */
export const TAB_PILL_ACTIVE_BRAND = 'bg-[#1E6FFF] text-white';
/** Pillola selezionata, variante neutra: solo dentro superfici già colorate. */
export const TAB_PILL_ACTIVE = 'bg-white/[0.15] text-white';
/** Pillola non selezionata. */
export const TAB_PILL_INACTIVE = 'text-white/45 hover:text-white/80';
/** Icona dentro la pillola. */
export const TAB_PILL_ICON = 'w-3.5 h-3.5';

export interface TabPillItem<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Contatore a destra dell'etichetta. */
  count?: number;
  disabled?: boolean;
  /** Tooltip nativo, quando l'etichetta da sola non basta. */
  tooltip?: string;
  /** Nasconde la pill quando il contatore è 0 (bucket dinamici vuoti). */
  hideIfZero?: boolean;
}

interface TabPillsProps<T extends string = string> {
  /**
   * `NoInfer` blocca l'inferenza del generic su questa prop: senza, TS deduce
   * `T = string` dagli array costruiti con `.map()` e `onChange` smette di
   * accettare i setter tipizzati stretti.
   */
  items: TabPillItem<NoInfer<T>>[];
  value: T;
  onChange: (id: NoInfer<T>) => void;
  /** Colore della pillola attiva. Il default è il blu di brand. */
  tone?: 'brand' | 'neutral';
  className?: string;
}

/** Badge conteggio, esportato per i call-site che compongono la pill a mano. */
export function TabPillCount({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[16px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
        active ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/50',
      )}
    >
      {count}
    </span>
  );
}

export function TabPills<T extends string = string>({
  items,
  value,
  onChange,
  tone = 'brand',
  className,
}: TabPillsProps<T>) {
  const activeCls = tone === 'brand' ? TAB_PILL_ACTIVE_BRAND : TAB_PILL_ACTIVE;
  return (
    // Sotto sm il contenitore scorre in orizzontale: con più di tre pill
    // altrimenti sfonda la riga. Da sm in su torna inline statico.
    <div
      className={cn(
        TAB_PILLS_CONTAINER,
        'max-w-full flex-nowrap overflow-x-auto scrollbar-hide',
        'sm:inline-flex sm:max-w-none sm:overflow-visible',
        className,
      )}
    >
      {items.map((t) => {
        if (t.hideIfZero && t.count === 0) return null;
        const Icon = t.icon;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !t.disabled && onChange(t.id)}
            disabled={t.disabled}
            title={t.tooltip}
            className={cn(
              TAB_PILL_ITEM,
              t.disabled && 'cursor-not-allowed opacity-40',
              active && !t.disabled ? activeCls : TAB_PILL_INACTIVE,
            )}
          >
            {Icon && <Icon className={TAB_PILL_ICON} />}
            {t.label}
            {typeof t.count === 'number' && <TabPillCount count={t.count} active={active} />}
          </button>
        );
      })}
    </div>
  );
}
