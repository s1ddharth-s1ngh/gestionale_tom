import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRegistraIncasso } from '@/hooks/useFatture';
import { metodoIncassoLabel, type MetodoIncasso } from '@/types/fattura';
import { formatCurrency } from '@/lib/formatters';

interface RegistraIncassoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fatturaId: string;
  numero: string;
  /** Quanto manca: è il valore proposto, perché il caso normale è saldare. */
  residuo: number;
}

const METODI: MetodoIncasso[] = ['bonifico', 'contanti', 'assegno', 'carta', 'riba'];

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Registra un incasso, totale o parziale.
 *
 * L'importo è precompilato col residuo perché nove volte su dieci si sta
 * saldando; resta modificabile perché la decima volta è un acconto. Non si
 * tocca lo stato: lo ricalcola il modello dagli incassi.
 */
export function RegistraIncassoDialog({
  open,
  onOpenChange,
  fatturaId,
  numero,
  residuo,
}: RegistraIncassoDialogProps) {
  const registra = useRegistraIncasso();
  const [importo, setImporto] = useState(residuo);
  const [data, setData] = useState(oggiIso());
  const [metodo, setMetodo] = useState<MetodoIncasso>('bonifico');
  const [riferimento, setRiferimento] = useState('');

  // Il residuo cambia a ogni incasso registrato: senza questo, riaprendo il
  // dialog si ripropone il residuo di due incassi fa.
  useEffect(() => {
    if (open) {
      setImporto(residuo);
      setData(oggiIso());
      setRiferimento('');
    }
  }, [open, residuo]);

  const eccessivo = importo > residuo;

  function conferma() {
    if (importo <= 0) return;
    registra.mutate(
      { id: fatturaId, input: { data, importo, metodo, riferimento: riferimento.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(`Incasso registrato su ${numero}`);
          onOpenChange(false);
        },
        onError: () => toast.error("Impossibile registrare l'incasso"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !registra.isPending && onOpenChange(o)}>
      <DialogContent className="border border-white/[0.08] bg-[#111111] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Registra incasso</DialogTitle>
          <DialogDescription className="text-[12.5px] text-white/65">
            Residuo su {numero}: <span className="text-white/85 tabular-nums">{formatCurrency(residuo)}</span>.
            Lo stato della fattura si aggiorna da solo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Importo"
              obbligatorio
              error={eccessivo ? 'Supera il residuo: la fattura risulterebbe sovra-incassata.' : undefined}
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

          <FormField label="Metodo" obbligatorio>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoIncasso)}>
              <SelectTrigger className={INPUT_CLS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#15181B]">
                {METODI.map((m) => (
                  <SelectItem key={m} value={m}>
                    {metodoIncassoLabel(m)}
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

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={registra.isPending}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" onClick={conferma} disabled={importo <= 0 || registra.isPending}>
            {registra.isPending ? 'Salvataggio…' : 'Registra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
