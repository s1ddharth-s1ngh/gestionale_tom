import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { STATI_FATTURA, statoFatturaLabel, type StatoFattura } from '@/types/fattura';

/** 'tutte' è un valore vero e non l'assenza di filtro: è la pill selezionata. */
export type FiltroStatoFattura = StatoFattura | 'tutte';

interface FattureToolbarProps {
  stato: FiltroStatoFattura;
  onStatoChange: (stato: FiltroStatoFattura) => void;
  conteggi?: Record<FiltroStatoFattura, number>;
  ricerca: string;
  onRicercaChange: (q: string) => void;
  caricando?: boolean;
  /** Quante righe passano i filtri, su quante ce ne sono in archivio. */
  filtrate: number;
  totali: number;
  onNuova: () => void;
  onScadenzario: () => void;
}

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/**
 * Riga sola: filtri a sinistra, azioni a destra, tutto alla stessa altezza h-8.
 * Il conteggio è testo semplice e non una badge — accanto a una fila di pill,
 * una badge leggerebbe come una pill in più.
 */
export function FattureToolbar({
  stato,
  onStatoChange,
  conteggi,
  ricerca,
  onRicercaChange,
  caricando,
  filtrate,
  totali,
  onNuova,
  onScadenzario,
}: FattureToolbarProps) {
  const items: TabPillItem<FiltroStatoFattura>[] = [
    { id: 'tutte', label: 'Tutte', count: conteggi?.tutte },
    ...STATI_FATTURA.map((s) => ({
      id: s,
      label: statoFatturaLabel(s),
      count: conteggi?.[s],
    })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TabPills items={items} value={stato} onChange={onStatoChange} />

      <div className="flex items-center gap-2">
        <div className="relative">
          <SearchAdornment
            busy={caricando}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          />
          <Input
            value={ricerca}
            onChange={(e) => onRicercaChange(e.target.value)}
            placeholder="Cerca numero, cliente, descrizione…"
            className={`${INPUT_CLS} w-[260px] pl-9`}
          />
        </div>

        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
          <span className="font-medium text-white/70">{filtrate}</span> di {totali} fatture
        </span>

        <Button variant="secondary" size="sm" onClick={onScadenzario}>
          Scadenzario
        </Button>
        <Button variant="primary" size="sm" onClick={onNuova}>
          <Plus className="h-3.5 w-3.5" />
          Nuova fattura
        </Button>
      </div>
    </div>
  );
}
