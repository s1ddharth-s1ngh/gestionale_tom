import { Search, Wallet } from '@/components/ui/icons';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatusPill } from '@/components/ui/status-pill';
import { CategoriaCostoBadge } from '@/components/costi/CategoriaCostoBadge';
import type { CostoArricchito } from '@/services/costiService';
import { formatCurrency, formatDataBreve, formatNumber } from '@/lib/formatters';

interface CostiTableProps {
  costi: CostoArricchito[];
  loading?: boolean;
  filtriAttivi?: boolean;
  onApri: (id: string) => void;
  azioneVuoto?: React.ReactNode;
}

export function CostiTable({ costi, loading, filtriAttivi, onApri, azioneVuoto }: CostiTableProps) {
  return (
    <DarkTable
      loading={loading}
      empty={costi.length === 0}
      emptyIcon={filtriAttivi ? Search : Wallet}
      emptyMessage={filtriAttivi ? 'Nessun costo per i filtri' : 'Nessun costo registrato'}
      emptyDescription={
        filtriAttivi
          ? 'Prova a cambiare categoria o ad allargare il periodo.'
          : 'Carburante, materiali, noleggi e smaltimenti si registrano da qui.'
      }
      emptyAction={filtriAttivi ? undefined : azioneVuoto}
    >
      <DarkTableHeader sticky>
        <DarkTableHead>Data</DarkTableHead>
        <DarkTableHead>Categoria</DarkTableHead>
        <DarkTableHead>Descrizione</DarkTableHead>
        <DarkTableHead>Fornitore</DarkTableHead>
        <DarkTableHead>Mezzo</DarkTableHead>
        <DarkTableHead align="right">Litri</DarkTableHead>
        <DarkTableHead align="right">Importo</DarkTableHead>
        <DarkTableHead>Imputazione</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {costi.map((c, i) => (
          <DarkTableRow key={c.id} zebraIndex={i} onRowClick={() => onApri(c.id)}>
            <DarkTableCell tabular>{formatDataBreve(c.data)}</DarkTableCell>
            <DarkTableCell>
              <CategoriaCostoBadge categoria={c.categoria} />
            </DarkTableCell>
            <DarkTableCell truncate="max-w-[320px]">{c.descrizione}</DarkTableCell>
            <DarkTableCell truncate="max-w-[200px]">
              {c.fornitoreDenominazione || <span className="italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell mono>
              {c.mezzoTarga || <span className="font-sans italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {c.litri != null ? formatNumber(c.litri) : <span className="italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(c.importo)}
            </DarkTableCell>
            <DarkTableCell>
              {/* Imputato o generale è la distinzione che regge il report di
                  marginalità: va vista nell'elenco, non solo nel dettaglio. */}
              {c.commessaId ? (
                <StatusPill accent="teal">Su commessa</StatusPill>
              ) : (
                <span className="text-[12px] text-white/40">Generale</span>
              )}
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}
