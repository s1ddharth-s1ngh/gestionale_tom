import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from '@/components/ui/icons';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import type { StatoPreventivo } from '@/types/preventivo';
import { STATI_PREVENTIVO, statoPreventivoLabel } from '@/types/preventivo';
import { pluralize } from '@/lib/utils';

/** `tutti` non è uno stato del dominio: è l'assenza di filtro. */
export type FiltroStato = StatoPreventivo | 'tutti';

interface PreventiviToolbarProps {
  filtro: FiltroStato;
  onFiltro: (f: FiltroStato) => void;
  ricerca: string;
  onRicerca: (q: string) => void;
  /** Quanti per stato, dal service. Le pill senza numero sembrano rotte. */
  conteggi?: Record<StatoPreventivo, number>;
  filtrati: number;
  /** Query in volo: la lente diventa spinner nello stesso posto. */
  cercando?: boolean;
  onNuovo: () => void;
}

/**
 * La barra sopra l'elenco. docs/DESIGN_SYSTEM.md §6.14: una riga sola, filtri a
 * sinistra e azioni a destra, tutto alla stessa altezza `h-8`.
 *
 * Il conteggio dei risultati è testo semplice e non una badge: accanto a una
 * fila di pill una badge leggerebbe come una pill in più.
 */
export function PreventiviToolbar({
  filtro,
  onFiltro,
  ricerca,
  onRicerca,
  conteggi,
  filtrati,
  cercando,
  onNuovo,
}: PreventiviToolbarProps) {
  const totale = conteggi ? Object.values(conteggi).reduce((t, n) => t + n, 0) : undefined;

  const pill: TabPillItem<FiltroStato>[] = [
    { id: 'tutti', label: 'Tutti', count: totale },
    ...STATI_PREVENTIVO.map((s) => ({
      id: s,
      label: statoPreventivoLabel(s),
      count: conteggi?.[s],
    })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TabPills items={pill} value={filtro} onChange={onFiltro} />

      <div className="flex items-center gap-2">
        <div className="relative">
          <SearchAdornment
            busy={cercando}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          />
          <Input
            value={ricerca}
            onChange={(e) => onRicerca(e.target.value)}
            placeholder="Cerca numero, specie, descrizione…"
            className="w-[260px] pl-9"
            aria-label="Cerca fra i preventivi"
          />
        </div>

        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
          <span className="font-medium text-white/70">{filtrati}</span>{' '}
          {pluralize(filtrati, 'preventivo', 'preventivi')}
        </span>

        <Button variant="primary" size="sm" onClick={onNuovo}>
          <Plus className="h-3.5 w-3.5" />
          Nuovo preventivo
        </Button>
      </div>
    </div>
  );
}
