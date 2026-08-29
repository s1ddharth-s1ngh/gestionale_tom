import { Buildings, Search } from '@/components/ui/icons';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { CategoriaCostoBadge } from '@/components/costi/CategoriaCostoBadge';
import type { FornitoreConTotale } from '@/services/fornitoriService';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';

interface FornitoriTableProps {
  fornitori: FornitoreConTotale[];
  loading?: boolean;
  filtriAttivi?: boolean;
  onApri: (id: string) => void;
  azioneVuoto?: React.ReactNode;
}

export function FornitoriTable({
  fornitori,
  loading,
  filtriAttivi,
  onApri,
  azioneVuoto,
}: FornitoriTableProps) {
  return (
    <DarkTable
      loading={loading}
      empty={fornitori.length === 0}
      emptyIcon={filtriAttivi ? Search : Buildings}
      emptyMessage={filtriAttivi ? 'Nessun fornitore per i filtri' : 'Nessun fornitore'}
      emptyDescription={
        filtriAttivi
          ? 'Prova a cambiare categoria o a cercare un altro nome.'
          : 'Distributori, noleggiatori, officine e impianti di smaltimento.'
      }
      emptyAction={filtriAttivi ? undefined : azioneVuoto}
    >
      <DarkTableHeader sticky>
        <DarkTableHead>Fornitore</DarkTableHead>
        <DarkTableHead>Categoria</DarkTableHead>
        <DarkTableHead>P. IVA</DarkTableHead>
        <DarkTableHead>Ultimo costo</DarkTableHead>
        <DarkTableHead align="right">Registrazioni</DarkTableHead>
        <DarkTableHead align="right">Speso</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {fornitori.map((f, i) => (
          <DarkTableRow key={f.id} zebraIndex={i} onRowClick={() => onApri(f.id)}>
            <DarkTableCell truncate="max-w-[360px]">{f.denominazione}</DarkTableCell>
            <DarkTableCell>
              {f.categoriaPrevalente ? (
                <CategoriaCostoBadge categoria={f.categoriaPrevalente} />
              ) : (
                <span className="italic text-white/30">—</span>
              )}
            </DarkTableCell>
            <DarkTableCell mono>
              {f.partitaIva || <span className="font-sans italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell tabular>
              {f.ultimoCosto ? (
                formatDataBreve(f.ultimoCosto)
              ) : (
                <span className="italic text-white/30">mai</span>
              )}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {f.numeroCosti}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(f.totaleSpeso, { interi: true })}
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}
