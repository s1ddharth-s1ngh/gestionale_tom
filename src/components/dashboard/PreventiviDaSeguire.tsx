import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DarkSection } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { FileText } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { useClientiCompleti } from '@/hooks/useClienti';
import { usePreventivi } from '@/hooks/usePreventivi';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';
import { statoEffettivo, statoPreventivoAccent, statoPreventivoLabel } from '@/types/preventivo';

/**
 * I preventivi mandati al cliente e ancora senza risposta, più quelli scaduti.
 *
 * Sono le due facce dello stesso problema — offerte che non si sono chiuse — e
 * stanno insieme perché il gesto che seguono è lo stesso: una telefonata. Su un
 * preventivo scaduto la telefonata è più urgente, non diversa.
 *
 * Ordinati per scadenza e non per data di invio: chi apre questa sezione vuole
 * sapere a chi telefonare oggi, non cosa ha spedito per primo.
 */
export function PreventiviDaSeguire() {
  const navigate = useNavigate();

  const inviati = usePreventivi({ stato: 'inviato', perPagina: 6 });
  const scaduti = usePreventivi({ stato: 'scaduto', perPagina: 6 });
  const clienti = useClientiCompleti();

  const nomi = React.useMemo(
    () => new Map((clienti.data ?? []).map((c) => [c.id, c.denominazione])),
    [clienti.data],
  );

  const righe = React.useMemo(() => {
    const tutti = [...(scaduti.data?.righe ?? []), ...(inviati.data?.righe ?? [])];
    // Gli scaduti prima, poi gli inviati per scadenza più vicina: dentro ogni
    // gruppo la data decide, ma il gruppo scaduto viene comunque prima —
    // ordinare tutto per sola data mescolerebbe l'urgenza con l'attesa.
    return tutti.sort((a, b) => a.validoFino.localeCompare(b.validoFino)).slice(0, 6);
  }, [inviati.data, scaduti.data]);

  const caricamento = inviati.isLoading || scaduti.isLoading;

  return (
    <DarkSection
      title="Preventivi da seguire"
      hint="inviati e in attesa di risposta"
      action={
        <Link
          to="/preventivi"
          className="text-[12px] text-white/45 transition-colors hover:text-white"
        >
          Vedi tutti
        </Link>
      }
    >
      <DataState
        loading={caricamento}
        error={inviati.error ?? scaduti.error}
        isEmpty={!caricamento && righe.length === 0}
        skeleton={
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        }
        emptyState={
          <TableEmptyState
            compact
            icon={FileText}
            title="Nessun preventivo in sospeso"
            description="Tutto quello che è partito ha già avuto una risposta."
          />
        }
        onRetry={() => {
          inviati.refetch();
          scaduti.refetch();
        }}
      >
        <ul className="space-y-1.5">
          {righe.map((p) => {
            const stato = statoEffettivo(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/preventivi/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white/85">
                      {nomi.get(p.clienteId) ?? p.numero}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-white/35">
                      {p.numero} · valido fino al {formatDataBreve(p.validoFino)}
                    </span>
                  </span>

                  <span className="shrink-0 text-[12.5px] tabular-nums text-white/70">
                    {formatCurrency(p.totale)}
                  </span>

                  <StatusPill accent={statoPreventivoAccent(stato)} variant="dot">
                    {statoPreventivoLabel(stato)}
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
