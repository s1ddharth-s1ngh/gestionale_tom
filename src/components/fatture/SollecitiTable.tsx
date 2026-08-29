import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { useRegistraSollecito } from '@/hooks/useFatture';
import { canaleSollecitoLabel, type CanaleSollecito, type Sollecito } from '@/types/fattura';
import { formatDataBreve } from '@/lib/formatters';

interface SollecitiTableProps {
  fatturaId: string;
  solleciti: Sollecito[];
  /** Su una fattura pagata il sollecito non ha senso: il form non compare. */
  sollecitabile: boolean;
}

const CANALI: CanaleSollecito[] = ['email', 'telefono', 'pec', 'raccomandata'];

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Storico dei solleciti, col form di inserimento in linea.
 *
 * In linea e non in un dialog: un sollecito si registra subito dopo averlo
 * mandato, guardando l'elenco dei precedenti per sapere a che punto si è.
 */
export function SollecitiTable({ fatturaId, solleciti, sollecitabile }: SollecitiTableProps) {
  const registra = useRegistraSollecito();
  const [aperto, setAperto] = useState(false);
  const [data, setData] = useState(oggiIso());
  const [canale, setCanale] = useState<CanaleSollecito>('email');
  const [note, setNote] = useState('');

  function conferma() {
    registra.mutate(
      { id: fatturaId, input: { data, canale, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success('Sollecito registrato');
          setAperto(false);
          setNote('');
          setData(oggiIso());
        },
        onError: () => toast.error('Impossibile registrare il sollecito'),
      },
    );
  }

  return (
    <div className="space-y-3">
      <DarkTable
        empty={solleciti.length === 0}
        emptyIcon={Mail}
        emptyMessage="Nessun sollecito"
        emptyDescription="Qui resta traccia di quando e come si è chiesto il pagamento."
      >
        <DarkTableHeader>
          <DarkTableHead>Data</DarkTableHead>
          <DarkTableHead>Canale</DarkTableHead>
          <DarkTableHead>Note</DarkTableHead>
        </DarkTableHeader>

        <DarkTableBody>
          {solleciti.map((s, i) => (
            <DarkTableRow key={s.id} zebraIndex={i}>
              <DarkTableCell tabular>{formatDataBreve(s.data)}</DarkTableCell>
              <DarkTableCell>{canaleSollecitoLabel(s.canale)}</DarkTableCell>
              <DarkTableCell truncate="max-w-[420px]">
                {s.note || <span className="italic text-white/30">—</span>}
              </DarkTableCell>
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      {sollecitabile &&
        (aperto ? (
          <div className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Data" obbligatorio>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={`${INPUT_CLS} tabular-nums`}
                />
              </FormField>
              <FormField label="Canale" obbligatorio>
                <Select value={canale} onValueChange={(v) => setCanale(v as CanaleSollecito)}>
                  <SelectTrigger className={INPUT_CLS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15181B]">
                    {CANALI.map((c) => (
                      <SelectItem key={c} value={c}>
                        {canaleSollecitoLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Note">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="es. Promesso pagamento entro fine mese."
                className={INPUT_CLS}
              />
            </FormField>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAperto(false)} disabled={registra.isPending}>
                Annulla
              </Button>
              <Button variant="primary" size="sm" onClick={conferma} disabled={registra.isPending}>
                {registra.isPending ? 'Salvataggio…' : 'Registra sollecito'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAperto(true)}>
            <Plus className="h-3.5 w-3.5" />
            Registra sollecito
          </Button>
        ))}
    </div>
  );
}
