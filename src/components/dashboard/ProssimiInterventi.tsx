import { Link, useNavigate } from 'react-router-dom';
import { DarkSection } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { CalendarBlank } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { useCommesse } from '@/hooks/useCommesse';
import { formatDataBreve, formatOre } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { statoCommessaAccent, statoCommessaLabel } from '@/types/commessa';

/** Quanti giorni avanti guarda la home. Una settimana è l'orizzonte su cui si
 *  organizzano le squadre: due sarebbero previsioni, un giorno sarebbe tardi. */
const ORIZZONTE_GIORNI = 7;

function iso(d: Date): string {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

/**
 * I lavori dei prossimi sette giorni.
 *
 * La finestra la chiede al service (`dal`/`al`), non la filtra qui: è la stessa
 * query che usa il calendario, e con un backend vero diventa una condizione
 * della `where` invece di un archivio scaricato per tenerne cinque righe.
 *
 * Le commesse già chiuse restano fuori: «prossimi interventi» è quello che c'è
 * da fare, e una commessa completata la settimana scorsa non è un impegno.
 */
export function ProssimiInterventi() {
  const navigate = useNavigate();
  const oggi = new Date();
  const fra = new Date();
  fra.setDate(fra.getDate() + ORIZZONTE_GIORNI);

  const query = useCommesse({
    dal: iso(oggi),
    al: iso(fra),
    perPagina: 8,
  });

  const righe = (query.data?.righe ?? []).filter(
    (c) => c.stato !== 'completata' && c.stato !== 'annullata',
  );

  return (
    <DarkSection
      title="Prossimi interventi"
      hint={`i prossimi ${ORIZZONTE_GIORNI} giorni`}
      action={
        <Link
          to="/commesse"
          className="text-[12px] text-white/45 transition-colors hover:text-white"
        >
          Vedi tutte
        </Link>
      }
    >
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && righe.length === 0}
        skeleton={
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        }
        emptyState={
          <TableEmptyState
            compact
            icon={CalendarBlank}
            title="Nessun intervento in programma"
            description="Pianifica una commessa e comparirà qui."
          />
        }
        onRetry={query.refetch}
      >
        <ul className="space-y-1.5">
          {righe.map((c) => {
            // «Oggi» e «domani» al posto della data: sono le uniche due parole
            // che si leggono senza tradurle in giorni della settimana.
            const giorni = c.dataPianificata
              ? Math.round(
                  (new Date(`${c.dataPianificata}T12:00:00`).getTime() -
                    new Date(iso(oggi) + 'T12:00:00').getTime()) /
                    86_400_000,
                )
              : null;
            const quando =
              giorni === 0
                ? 'Oggi'
                : giorni === 1
                  ? 'Domani'
                  : c.dataPianificata
                    ? formatDataBreve(c.dataPianificata)
                    : '—';

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/commesse/${c.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span
                    className={cn(
                      'w-[70px] shrink-0 text-[12px] font-medium tabular-nums',
                      giorni === 0 ? 'text-[#7eb0ff]' : 'text-white/50',
                    )}
                  >
                    {quando}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white/85">
                      {c.clienteDenominazione}
                    </span>
                    <span className="block truncate text-[11.5px] text-white/35">
                      {c.luogoEtichetta}
                    </span>
                  </span>

                  <span className="shrink-0 text-[11.5px] tabular-nums text-white/40">
                    {formatOre(c.orePreviste)}
                  </span>

                  <StatusPill accent={statoCommessaAccent(c.stato)} variant="dot">
                    {statoCommessaLabel(c.stato)}
                  </StatusPill>
                </button>
              </li>
            );
          })}
        </ul>
      </DataState>
    </DarkSection>
  );
}
