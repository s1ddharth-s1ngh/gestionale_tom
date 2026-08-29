import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Wallet } from '@/components/ui/icons';
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
import { useEliminaPagamento, useRegistraPagamento } from '@/hooks/useFattureFornitore';
import {
  METODI_PAGAMENTO,
  metodoPagamentoLabel,
  type MetodoPagamento,
  type Pagamento,
} from '@/types/fatturaFornitore';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';

interface PagamentiFornitoreTableProps {
  fatturaId: string;
  pagamenti: Pagamento[];
  /** Quanto manca: è il valore proposto, perché il caso normale è saldare. */
  residuo: number;
  /** Su una bozza non si paga: prima si registra il documento. */
  pagabile: boolean;
}

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * I pagamenti fatti al fornitore, col form in linea.
 *
 * In linea e non in un dialog, al contrario degli incassi sulle attive: un
 * pagamento si registra guardando quelli già fatti — «ho già mandato un
 * acconto?» è la domanda che ci si fa prima di firmare il bonifico, e un
 * dialog copre proprio l'elenco che la risponde.
 *
 * Non si tocca lo stato: lo ricalcola la vista dai pagamenti.
 */
export function PagamentiFornitoreTable({
  fatturaId,
  pagamenti,
  residuo,
  pagabile,
}: PagamentiFornitoreTableProps) {
  const registra = useRegistraPagamento();
  const elimina = useEliminaPagamento();

  const [aperto, setAperto] = useState(false);
  const [importo, setImporto] = useState(residuo);
  const [data, setData] = useState(oggiIso());
  const [metodo, setMetodo] = useState<MetodoPagamento>('bonifico');
  const [riferimento, setRiferimento] = useState('');

  // Il residuo cambia a ogni pagamento: senza questo, riaprendo il form si
  // riproporrebbe il residuo di due pagamenti fa.
  useEffect(() => {
    if (aperto) {
      setImporto(residuo);
      setData(oggiIso());
      setRiferimento('');
    }
  }, [aperto, residuo]);

  const eccessivo = importo > residuo;

  function conferma() {
    if (importo <= 0) return;
    registra.mutate(
      { id: fatturaId, pagamento: { data, importo, metodo, riferimento: riferimento.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success('Pagamento registrato');
          setAperto(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Impossibile registrare il pagamento'),
      },
    );
  }

  return (
    <div className="space-y-3">
      <DarkTable
        empty={pagamenti.length === 0}
        emptyIcon={Wallet}
        emptyMessage="Nessun pagamento"
        emptyDescription="Registrando un pagamento lo stato della fattura si aggiorna da solo."
      >
        <DarkTableHeader>
          <DarkTableHead>Data</DarkTableHead>
          <DarkTableHead>Metodo</DarkTableHead>
          <DarkTableHead>Riferimento</DarkTableHead>
          <DarkTableHead align="right">Importo</DarkTableHead>
          <DarkTableHead />
        </DarkTableHeader>

        <DarkTableBody>
          {pagamenti.map((p, i) => (
            <DarkTableRow key={p.id} zebraIndex={i}>
              <DarkTableCell tabular>{formatDataBreve(p.data)}</DarkTableCell>
              <DarkTableCell>{metodoPagamentoLabel(p.metodo)}</DarkTableCell>
              <DarkTableCell mono>
                {p.riferimento || <span className="font-sans italic text-white/30">—</span>}
              </DarkTableCell>
              <DarkTableCell align="right" tabular>
                {formatCurrency(p.importo)}
              </DarkTableCell>
              <DarkTableCell align="right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Elimina il pagamento"
                  onClick={() =>
                    elimina.mutate(
                      { id: fatturaId, pagamentoId: p.id },
                      { onSuccess: () => toast.success('Pagamento eliminato') },
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DarkTableCell>
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      {pagabile &&
        residuo > 0 &&
        (aperto ? (
          <div className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Importo"
                obbligatorio
                error={eccessivo ? 'Supera il residuo: il database rifiuterebbe la riga.' : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={importo}
                  onChange={(e) => setImporto(Number(e.target.value))}
                  className={`${INPUT_CLS} text-right tabular-nums`}
                />
              </FormField>

              <FormField label="Data" obbligatorio>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={`${INPUT_CLS} tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Metodo" obbligatorio>
                <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPagamento)}>
                  <SelectTrigger className={INPUT_CLS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15181B]">
                    {METODI_PAGAMENTO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {metodoPagamentoLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Riferimento" hint="CRO del bonifico, numero dell'assegno.">
                <Input
                  value={riferimento}
                  onChange={(e) => setRiferimento(e.target.value)}
                  placeholder="es. CRO 8842190"
                  className={`${INPUT_CLS} font-mono`}
                />
              </FormField>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAperto(false)} disabled={registra.isPending}>
                Annulla
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={conferma}
                disabled={importo <= 0 || registra.isPending}
              >
                {registra.isPending ? 'Salvataggio…' : 'Registra pagamento'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAperto(true)}>
            <Plus className="h-3.5 w-3.5" />
            Registra pagamento
          </Button>
        ))}
    </div>
  );
}
