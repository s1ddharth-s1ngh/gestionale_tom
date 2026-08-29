import React from 'react';
import { Link } from 'react-router-dom';
import { SideCard } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { Wallet } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { useRiepilogoPerCategoria } from '@/hooks/useCosti';
import { formatCurrency } from '@/lib/formatters';
import { categoriaCostoIcona, categoriaCostoLabel } from '@/types/costo';
import type { CategoriaCosto } from '@/types/costo';

/** Quante voci stanno nella colonna stretta. Oltre, la coda si somma in «altre». */
const MAX_VOCI = 4;

/** Primo e ultimo giorno del mese corrente, in ISO. */
function meseCorrente(): { dal: string; al: string; etichetta: string } {
  const oggi = new Date();
  const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1, 12);
  const ultimo = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0, 12);
  return {
    dal: primo.toISOString().slice(0, 10),
    al: ultimo.toISOString().slice(0, 10),
    etichetta: oggi.toLocaleDateString('it-IT', { month: 'long' }),
  };
}

/**
 * Quanto è uscito questo mese, spaccato per categoria.
 *
 * Il periodo è il mese di calendario e non gli ultimi trenta giorni: è così che
 * si ragiona quando si guardano i costi, ed è l'unico taglio che si può
 * confrontare con quello che dirà il commercialista.
 *
 * Le voci oltre la quarta si sommano in «altre» invece di essere troncate.
 * Tagliare la coda farebbe apparire un totale che non torna con la somma delle
 * righe mostrate — e chi legge lo nota, prova a sommare, e smette di fidarsi
 * anche del resto della pagina.
 */
export function CostiDelMese() {
  const { dal, al, etichetta } = React.useMemo(meseCorrente, []);
  const query = useRiepilogoPerCategoria({ dal, al });

  const voci = query.data ?? [];
  const totale = voci.reduce((t, v) => t + v.totale, 0);

  const principali = voci.slice(0, MAX_VOCI);
  const coda = voci.slice(MAX_VOCI);
  const altre = coda.reduce((t, v) => t + v.totale, 0);

  return (
    <SideCard title={`Costi di ${etichetta}`}>
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && voci.length === 0}
        skeleton={
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        }
        emptyState={
          <TableEmptyState compact icon={Wallet} title="Nessun costo registrato questo mese" />
        }
        onRetry={query.refetch}
      >
        <div className="space-y-2.5">
          {principali.map((v) => {
            const Icona = categoriaCostoIcona(v.chiave as CategoriaCosto);
            return (
              <div key={v.chiave} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-white/60">
                    <Icona className="h-3.5 w-3.5 shrink-0 text-white/35" />
                    <span className="truncate">
                      {categoriaCostoLabel(v.chiave as CategoriaCosto)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-white/75">
                    {formatCurrency(v.totale)}
                  </span>
                </div>
                {/* La barra è azzurra e non colorata per categoria: gli accent
                    del design system dicono gravità, non appartenenza, e otto
                    categorie colorate farebbero sembrare la card un semaforo di
                    allarmi che non ci sono. */}
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-[#1E6FFF]/70"
                    style={{ width: `${Math.max(2, v.quotaPct)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {coda.length > 0 && (
            <div className="flex items-baseline justify-between gap-2 pt-0.5">
              <span className="text-[12px] text-white/40">
                Altre {coda.length} categorie
              </span>
              <span className="text-[12px] tabular-nums text-white/55">
                {formatCurrency(altre)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
          <Link
            to="/costi"
            className="text-[11.5px] text-white/40 transition-colors hover:text-white"
          >
            Vedi tutti
          </Link>
          <span className="text-[12.5px] font-medium tabular-nums text-white/80">
            {formatCurrency(totale)}
          </span>
        </div>
      </DataState>
    </SideCard>
  );
}
