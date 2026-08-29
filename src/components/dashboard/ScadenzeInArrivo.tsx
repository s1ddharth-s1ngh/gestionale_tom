import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SideCard } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { Receipt } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { useScadenzario } from '@/hooks/useFatture';
import { useScadenzarioFornitori } from '@/hooks/useFattureFornitore';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/** Quante righe stanno nella colonna stretta prima di diventare un elenco. */
const MAX_RIGHE = 5;

interface Voce {
  id: string;
  rotta: string;
  titolo: string;
  sottotitolo: string;
  importo: number;
  scadenza?: string;
  giorni: number | null;
}

/**
 * Le scadenze in arrivo, delle due direzioni insieme.
 *
 * Incassi e pagamenti nella stessa card, separati da un interruttore: sono la
 * stessa domanda — «cosa si muove questa settimana» — vista dai due lati, e
 * tenerli in due card costringerebbe a confrontare due colonne di numeri con
 * gli occhi invece che con un click.
 *
 * Il rosso è solo per lo scaduto. Una scadenza fra tre giorni non è un
 * problema: è un promemoria, ed è ambra.
 */
export function ScadenzeInArrivo() {
  const navigate = useNavigate();
  const [lato, setLato] = React.useState<'incassi' | 'pagamenti'>('incassi');

  const incassi = useScadenzario();
  const pagamenti = useScadenzarioFornitori();

  const voci: Voce[] = React.useMemo(() => {
    if (lato === 'incassi') {
      return (incassi.data ?? [])
        .filter((f) => (f.residuo ?? 0) > 0)
        .slice(0, MAX_RIGHE)
        .map((f) => ({
          id: f.id,
          rotta: `/fatture/${f.id}`,
          titolo: f.clienteDenominazione,
          sottotitolo: f.numero,
          importo: f.residuo ?? 0,
          scadenza: f.dataScadenza,
          giorni: f.giorniAllaScadenza ?? null,
        }));
    }
    return (pagamenti.data ?? [])
      .filter((f) => (f.residuo ?? 0) > 0)
      .slice(0, MAX_RIGHE)
      .map((f) => ({
        id: f.id,
        rotta: `/costi/fatture/${f.id}`,
        titolo: f.fornitoreDenominazione ?? f.numero,
        sottotitolo: f.numero,
        importo: f.residuo ?? 0,
        scadenza: f.dataScadenza,
        giorni: giorniDa(f.dataScadenza),
      }));
  }, [lato, incassi.data, pagamenti.data]);

  const query = lato === 'incassi' ? incassi : pagamenti;
  const totale = voci.reduce((t, v) => t + v.importo, 0);

  return (
    <SideCard title="Scadenze in arrivo">
      <div className="mb-3 inline-flex w-full items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        {(['incassi', 'pagamenti'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLato(l)}
            className={cn(
              'h-7 flex-1 rounded-full text-[11.5px] font-medium capitalize transition-colors',
              lato === l ? 'bg-white/[0.15] text-white' : 'text-white/45 hover:text-white/80',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && voci.length === 0}
        skeleton={
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        }
        emptyState={
          <TableEmptyState
            compact
            icon={Receipt}
            title={lato === 'incassi' ? 'Niente da incassare' : 'Niente da pagare'}
          />
        }
        onRetry={query.refetch}
      >
        <ul className="space-y-1">
          {voci.map((v) => {
            const scaduta = v.giorni !== null && v.giorni < 0;
            const imminente = v.giorni !== null && v.giorni >= 0 && v.giorni <= 7;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => navigate(v.rotta)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-white/80">{v.titolo}</span>
                    <span
                      className={cn(
                        'block text-[11px] tabular-nums',
                        scaduta
                          ? 'text-red-300'
                          : imminente
                            ? 'text-amber-300'
                            : 'text-white/35',
                      )}
                    >
                      {v.scadenza ? formatDataBreve(v.scadenza) : '—'}
                      {scaduta && v.giorni !== null ? ` · ${Math.abs(v.giorni)} gg fa` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-white/75">
                    {formatCurrency(v.importo)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
          <Link
            to={lato === 'incassi' ? '/fatture/scadenzario' : '/costi/fatture'}
            className="text-[11.5px] text-white/40 transition-colors hover:text-white"
          >
            Vedi tutte
          </Link>
          <span className="text-[12px] font-medium tabular-nums text-white/70">
            {formatCurrency(totale)}
          </span>
        </div>
      </DataState>
    </SideCard>
  );
}

/** I giorni che mancano, calcolati a mezzogiorno per non farsi spostare dal fuso. */
function giorniDa(dataScadenza?: string): number | null {
  if (!dataScadenza) return null;
  const fine = new Date(`${dataScadenza}T12:00:00`).getTime();
  const oggi = new Date();
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 12).getTime();
  return Math.round((fine - inizio) / 86_400_000);
}
