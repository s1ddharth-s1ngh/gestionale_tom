import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { CATEGORIE_COSTO, categoriaCostoIcona, categoriaCostoLabel, type CategoriaCosto } from '@/types/costo';

export type FiltroCategoria = CategoriaCosto | 'tutte';

/** I periodi che si guardano davvero: il mese in corso, il trimestre, tutto. */
export type Periodo = 'mese' | 'trimestre' | 'anno' | 'sempre';

interface CostiToolbarProps {
  categoria: FiltroCategoria;
  onCategoriaChange: (categoria: FiltroCategoria) => void;
  conteggi?: Record<FiltroCategoria, number>;
  periodo: Periodo;
  onPeriodoChange: (periodo: Periodo) => void;
  ricerca: string;
  onRicercaChange: (q: string) => void;
  caricando?: boolean;
  filtrati: number;
  totali: number;
  onNuovo: () => void;
  onFornitori: () => void;
}

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

const PERIODI: TabPillItem<Periodo>[] = [
  { id: 'mese', label: 'Mese' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'anno', label: 'Anno' },
  { id: 'sempre', label: 'Sempre' },
];

/**
 * Due file di pill: le categorie sopra, il periodo sotto insieme alla ricerca.
 *
 * Due file e non una: otto categorie più quattro periodi su una riga sola
 * scrollano orizzontalmente su qualunque schermo, e un filtro che si deve
 * cercare scorrendo non viene usato.
 */
export function CostiToolbar({
  categoria,
  onCategoriaChange,
  conteggi,
  periodo,
  onPeriodoChange,
  ricerca,
  onRicercaChange,
  caricando,
  filtrati,
  totali,
  onNuovo,
  onFornitori,
}: CostiToolbarProps) {
  const categorie: TabPillItem<FiltroCategoria>[] = [
    { id: 'tutte', label: 'Tutte', count: conteggi?.tutte },
    ...CATEGORIE_COSTO.map((c) => ({
      id: c,
      label: categoriaCostoLabel(c),
      icon: categoriaCostoIcona(c),
      count: conteggi?.[c],
    })),
  ];

  return (
    <div className="space-y-3">
      <TabPills items={categorie} value={categoria} onChange={onCategoriaChange} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabPills items={PERIODI} value={periodo} onChange={onPeriodoChange} tone="neutral" />

        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchAdornment
              busy={caricando}
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <Input
              value={ricerca}
              onChange={(e) => onRicercaChange(e.target.value)}
              placeholder="Cerca descrizione, fornitore, targa…"
              className={`${INPUT_CLS} w-[260px] pl-9`}
            />
          </div>

          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
            <span className="font-medium text-white/70">{filtrati}</span> di {totali} costi
          </span>

          <Button variant="secondary" size="sm" onClick={onFornitori}>
            Fornitori
          </Button>
          <Button variant="primary" size="sm" onClick={onNuovo}>
            <Plus className="h-3.5 w-3.5" />
            Nuovo costo
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Il periodo in date ISO. `sempre` non filtra: torna due `undefined`. */
export function intervalloDa(periodo: Periodo): { dal?: string; al?: string } {
  if (periodo === 'sempre') return {};

  const oggi = new Date();
  oggi.setHours(12, 0, 0, 0);
  const dal = new Date(oggi);

  if (periodo === 'mese') dal.setDate(oggi.getDate() - 30);
  if (periodo === 'trimestre') dal.setDate(oggi.getDate() - 90);
  if (periodo === 'anno') dal.setDate(oggi.getDate() - 365);

  return { dal: dal.toISOString().slice(0, 10), al: oggi.toISOString().slice(0, 10) };
}
