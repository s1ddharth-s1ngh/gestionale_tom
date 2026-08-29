import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Receipt, Wallet } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { DarkKpi } from '@/components/ui/dark-kpi';
import { DataState } from '@/components/ui/data-state';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatoFatturaBadge } from '@/components/fatture/StatoFatturaBadge';
import { useScadenzario } from '@/hooks/useFatture';
import type { FatturaConCliente } from '@/services/fattureService';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';

/** Sotto questa soglia una scadenza è «imminente»: è la settimana lavorativa. */
const GIORNI_URGENZA = 7;

/**
 * Scadenzario incassi.
 *
 * Ordinato per scadenza crescente, con le scadute in cima — che è lo stesso
 * ordine: una fattura scaduta ha una data più vecchia di tutte. Non c'è un
 * filtro «solo da incassare» da ricordarsi di attivare: le pagate non entrano
 * proprio nell'elenco, quindi non c'è modo di sbagliarlo.
 */
export default function Scadenzario() {
  const navigate = useNavigate();
  const query = useScadenzario();
  const righe = query.data ?? [];

  const totali = useMemo(() => {
    let scaduto = 0;
    let inScadenza = 0;
    let aScadere = 0;
    for (const f of righe) {
      const g = f.giorniAllaScadenza;
      if (g !== null && g < 0) scaduto += f.residuo;
      else if (g !== null && g <= GIORNI_URGENZA) inScadenza += f.residuo;
      else aScadere += f.residuo;
    }
    return { scaduto, inScadenza, aScadere, totale: scaduto + inScadenza + aScadere };
  }, [righe]);

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/fatture', label: 'Fatture' }}
        title="Scadenzario"
        subtitle="Quello che c'è ancora da incassare, dalla scadenza più vecchia"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DarkKpi
          icon={AlertTriangle}
          label="Scaduto"
          valueFormatted={formatCurrency(totali.scaduto, { interi: true })}
          accent="danger"
        />
        <DarkKpi
          icon={Clock}
          label={`Entro ${GIORNI_URGENZA} giorni`}
          valueFormatted={formatCurrency(totali.inScadenza, { interi: true })}
          accent="amber"
        />
        <DarkKpi
          icon={Receipt}
          label="A scadere"
          valueFormatted={formatCurrency(totali.aScadere, { interi: true })}
          accent="neutral"
        />
        <DarkKpi
          icon={Wallet}
          label="Totale da incassare"
          valueFormatted={formatCurrency(totali.totale, { interi: true })}
          accent="info"
        />
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <DataState
          loading={query.isLoading}
          error={query.error}
          isEmpty={righe.length === 0}
          onRetry={() => query.refetch()}
          emptyState={
            <TableEmptyState
              icon={CheckCircle}
              title="Non c'è niente da incassare"
              description="Tutte le fatture emesse risultano saldate."
            />
          }
        >
          <DarkTable>
            <DarkTableHeader sticky>
              <DarkTableHead>Scadenza</DarkTableHead>
              <DarkTableHead>Urgenza</DarkTableHead>
              <DarkTableHead>Numero</DarkTableHead>
              <DarkTableHead>Cliente</DarkTableHead>
              <DarkTableHead align="right">Totale</DarkTableHead>
              <DarkTableHead align="right">Residuo</DarkTableHead>
              <DarkTableHead>Solleciti</DarkTableHead>
              <DarkTableHead>Stato</DarkTableHead>
            </DarkTableHeader>

            <DarkTableBody>
              {righe.map((f, i) => (
                <DarkTableRow key={f.id} zebraIndex={i} onRowClick={() => navigate(`/fatture/${f.id}`)}>
                  <DarkTableCell tabular>{formatDataBreve(f.dataScadenza)}</DarkTableCell>
                  <DarkTableCell>
                    <PillUrgenza fattura={f} />
                  </DarkTableCell>
                  <DarkTableCell mono>{f.numero}</DarkTableCell>
                  <DarkTableCell truncate="max-w-[280px]">{f.clienteDenominazione}</DarkTableCell>
                  <DarkTableCell align="right" tabular>
                    {formatCurrency(f.totale)}
                  </DarkTableCell>
                  <DarkTableCell align="right" tabular>
                    {formatCurrency(f.residuo)}
                  </DarkTableCell>
                  <DarkTableCell tabular>
                    {/* Il numero di solleciti è il dato che dice se serve alzare il
                        telefono: tre solleciti senza incasso non sono un ritardo. */}
                    {f.solleciti.length > 0 ? (
                      <span className="text-white/70">{f.solleciti.length}</span>
                    ) : (
                      <span className="italic text-white/30">—</span>
                    )}
                  </DarkTableCell>
                  <DarkTableCell>
                    <StatoFatturaBadge stato={f.stato} />
                  </DarkTableCell>
                </DarkTableRow>
              ))}
            </DarkTableBody>
          </DarkTable>
        </DataState>
      </div>
    </div>
  );
}

/**
 * L'urgenza in parole, non solo in colore: «scaduta da 45 giorni» si capisce
 * al primo sguardo, una data rossa va confrontata a mente con oggi.
 */
function PillUrgenza({ fattura }: { fattura: FatturaConCliente }) {
  const g = fattura.giorniAllaScadenza;
  if (g === null) return <span className="text-[12px] italic text-white/30">senza scadenza</span>;
  if (g < 0) return <StatusPill accent="danger">Scaduta da {Math.abs(g)} gg</StatusPill>;
  if (g === 0) return <StatusPill accent="orange">Scade oggi</StatusPill>;
  if (g <= GIORNI_URGENZA) return <StatusPill accent="amber">Fra {g} gg</StatusPill>;
  return <StatusPill accent="neutral">Fra {g} gg</StatusPill>;
}
