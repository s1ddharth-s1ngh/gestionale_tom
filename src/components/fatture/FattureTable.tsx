import { Receipt, Search } from '@/components/ui/icons';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatoFatturaBadge } from '@/components/fatture/StatoFatturaBadge';
import type { FatturaConCliente } from '@/services/fattureService';
import { tipoFatturaLabel } from '@/types/fattura';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FattureTableProps {
  fatture: FatturaConCliente[];
  loading?: boolean;
  /** Con i filtri attivi lo stato vuoto dice «nessun risultato», non «archivio vuoto». */
  filtriAttivi?: boolean;
  onApri: (id: string) => void;
  nuovaAzione?: React.ReactNode;
}

export function FattureTable({ fatture, loading, filtriAttivi, onApri, nuovaAzione }: FattureTableProps) {
  return (
    <DarkTable
      loading={loading}
      empty={fatture.length === 0}
      emptyIcon={filtriAttivi ? Search : Receipt}
      emptyMessage={filtriAttivi ? 'Nessun risultato per i filtri' : 'Nessuna fattura'}
      emptyDescription={
        filtriAttivi
          ? 'Prova a cambiare stato o a cercare un altro numero.'
          : 'Le fatture emesse dalle commesse compariranno qui.'
      }
      emptyAction={filtriAttivi ? undefined : nuovaAzione}
    >
      <DarkTableHeader sticky>
        <DarkTableHead>Numero</DarkTableHead>
        <DarkTableHead>Cliente</DarkTableHead>
        <DarkTableHead>Tipo</DarkTableHead>
        <DarkTableHead>Emissione</DarkTableHead>
        <DarkTableHead>Scadenza</DarkTableHead>
        <DarkTableHead align="right">Totale</DarkTableHead>
        <DarkTableHead align="right">Residuo</DarkTableHead>
        <DarkTableHead>Stato</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {fatture.map((f, i) => (
          <DarkTableRow key={f.id} zebraIndex={i} onRowClick={() => onApri(f.id)}>
            <DarkTableCell mono>{f.numero}</DarkTableCell>
            <DarkTableCell truncate="max-w-[260px]">{f.clienteDenominazione}</DarkTableCell>
            <DarkTableCell>
              <span className="text-white/55">{tipoFatturaLabel(f.tipo)}</span>
            </DarkTableCell>
            <DarkTableCell tabular>
              {f.dataEmissione ? (
                formatDataBreve(f.dataEmissione)
              ) : (
                <span className="italic text-white/30">—</span>
              )}
            </DarkTableCell>
            <DarkTableCell tabular>
              <span className={cn(coloreScadenza(f))}>{formatDataBreve(f.dataScadenza)}</span>
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(f.totale)}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {/* Il residuo a zero è l'informazione meno interessante della riga:
                  si smorza, così le colonne con qualcosa da incassare risaltano. */}
              <span className={f.residuo > 0 ? 'text-white' : 'text-white/30'}>
                {formatCurrency(f.residuo)}
              </span>
            </DarkTableCell>
            <DarkTableCell>
              <StatoFatturaBadge stato={f.stato} />
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}

/** L'urgenza si legge sulla data, non solo sulla badge di stato: scaduta in
 *  rosso, entro sette giorni in ambra, il resto bianco come tutto il resto. */
function coloreScadenza(f: FatturaConCliente): string {
  if (f.residuo <= 0 || f.giorniAllaScadenza === null) return 'text-white/55';
  if (f.giorniAllaScadenza < 0) return 'text-red-300';
  if (f.giorniAllaScadenza <= 7) return 'text-amber-300';
  return 'text-white/55';
}
