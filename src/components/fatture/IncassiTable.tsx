import { Trash2, Wallet } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import type { Incasso } from '@/types/fattura';
import { metodoIncassoLabel } from '@/types/fattura';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';

interface IncassiTableProps {
  incassi: Incasso[];
  onRimuovi?: (incassoId: string) => void;
  /** Il bottone «Registra incasso», mostrato nello stato vuoto. */
  azioneVuoto?: React.ReactNode;
}

export function IncassiTable({ incassi, onRimuovi, azioneVuoto }: IncassiTableProps) {
  return (
    <DarkTable
      empty={incassi.length === 0}
      emptyIcon={Wallet}
      emptyMessage="Nessun incasso registrato"
      emptyDescription="Registrando un incasso lo stato della fattura si aggiorna da solo."
      emptyAction={azioneVuoto}
    >
      <DarkTableHeader>
        <DarkTableHead>Data</DarkTableHead>
        <DarkTableHead>Metodo</DarkTableHead>
        <DarkTableHead>Riferimento</DarkTableHead>
        <DarkTableHead align="right">Importo</DarkTableHead>
        {onRimuovi && <DarkTableHead />}
      </DarkTableHeader>

      <DarkTableBody>
        {incassi.map((i, indice) => (
          <DarkTableRow key={i.id} zebraIndex={indice}>
            <DarkTableCell tabular>{formatDataBreve(i.data)}</DarkTableCell>
            <DarkTableCell>{metodoIncassoLabel(i.metodo)}</DarkTableCell>
            <DarkTableCell mono>
              {i.riferimento || <span className="font-sans italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(i.importo)}
            </DarkTableCell>
            {onRimuovi && (
              <DarkTableCell align="right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Elimina l'incasso"
                  onClick={() => onRimuovi(i.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DarkTableCell>
            )}
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}
