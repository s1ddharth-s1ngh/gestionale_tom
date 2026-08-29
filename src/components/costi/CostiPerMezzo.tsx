import { DarkSection } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { Truck } from '@/components/ui/icons';
import { BarraRiepilogo } from '@/components/costi/BarraRiepilogo';
import { useRiepilogoPerMezzo } from '@/hooks/useCosti';
import type { CostoFiltri } from '@/types/costo';
import { formatCurrency } from '@/lib/formatters';

interface CostiPerMezzoProps {
  filtri?: CostoFiltri;
}

/**
 * Quanto costa ogni mezzo: carburante, manutenzioni, assicurazione.
 *
 * I costi senza mezzo non entrano — un «non assegnato» in cima alla classifica
 * non risponde alla domanda che si fa aprendo questo riquadro, che è «quale
 * mezzo mi sta costando troppo».
 */
export function CostiPerMezzo({ filtri }: CostiPerMezzoProps) {
  const query = useRiepilogoPerMezzo(filtri);
  const voci = query.data ?? [];
  const totale = voci.reduce((t, v) => t + v.totale, 0);

  return (
    <DarkSection
      title="Per mezzo"
      hint={voci.length > 0 ? formatCurrency(totale, { interi: true }) : undefined}
    >
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={voci.length === 0}
        onRetry={() => query.refetch()}
        emptyState={
          <TableEmptyState
            icon={Truck}
            title="Nessun costo legato a un mezzo"
            description="Carburante e manutenzioni compaiono qui quando indicano la targa."
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
