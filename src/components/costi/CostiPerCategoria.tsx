import { DarkSection } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { ChartBar } from '@/components/ui/icons';
import { BarraRiepilogo } from '@/components/costi/BarraRiepilogo';
import { useRiepilogoPerCategoria } from '@/hooks/useCosti';
import type { CostoFiltri } from '@/types/costo';
import { formatCurrency } from '@/lib/formatters';

interface CostiPerCategoriaProps {
  filtri?: CostoFiltri;
}

/**
 * Quanto si spende per categoria, sul periodo selezionato.
 *
 * Barre costruite coi token del design system e non una libreria di grafici:
 * sono otto valori e una percentuale, e `recharts` arriverebbe con il suo
 * tema chiaro da combattere per mostrare quello che qui è un `div` largo il
 * tot per cento.
 */
export function CostiPerCategoria({ filtri }: CostiPerCategoriaProps) {
  const query = useRiepilogoPerCategoria(filtri);
  const voci = query.data ?? [];
  const totale = voci.reduce((t, v) => t + v.totale, 0);

  return (
    <DarkSection
      title="Per categoria"
      hint={voci.length > 0 ? formatCurrency(totale, { interi: true }) : undefined}
    >
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={voci.length === 0}
        onRetry={() => query.refetch()}
        emptyState={
          <TableEmptyState
            icon={ChartBar}
            title="Nessun costo nel periodo"
            description="Allarga il periodo o togli un filtro."
            compact
          />
        }
      >
        <div className="space-y-3">
          {voci.map((v) => (
            <BarraRiepilogo key={v.chiave} voce={v} />
          ))}
        </div>
      </DataState>
    </DarkSection>
  );
}
