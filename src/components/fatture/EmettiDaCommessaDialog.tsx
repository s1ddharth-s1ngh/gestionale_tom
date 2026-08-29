import { useMemo, useState } from 'react';
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
import { useCommesse } from '@/hooks/useCommesse';
import { useEmettiDaCommessa } from '@/hooks/useFatture';
import { ALIQUOTA_IVA_DEFAULT, type TipoFattura } from '@/types/fattura';
import { formatCurrency } from '@/lib/formatters';

interface EmettiDaCommessaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmessa: (fatturaId: string) => void;
}

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/**
 * Emette una fattura partendo da una commessa.
 *
 * L'imponibile si chiede qui e non si legge dalla commessa: la commessa
 * conosce le ore, non il prezzo concordato col cliente. Il calcolo della
 * percentuale e dello scorporo degli acconti già emessi lo fa il service.
 */
export function EmettiDaCommessaDialog({ open, onOpenChange, onEmessa }: EmettiDaCommessaDialogProps) {
  const [commessaId, setCommessaId] = useState('');
  const [tipo, setTipo] = useState<TipoFattura>('unica');
  const [imponibile, setImponibile] = useState(0);
  const [percentuale, setPercentuale] = useState(30);

  // Solo le commesse completate: fatturare un lavoro non ancora fatto è
  // possibile solo come acconto, e l'acconto si emette dalla scheda commessa.
  const commesse = useCommesse({ stato: 'completata', perPagina: 100 });
  const emetti = useEmettiDaCommessa();

  const scelta = useMemo(
    () => commesse.data?.righe.find((c) => c.id === commessaId),
    [commesse.data, commessaId],
  );

  const anteprima =
    tipo === 'acconto' ? (imponibile * percentuale) / 100 : imponibile;

  function conferma() {
    if (!scelta || imponibile <= 0) return;
    emetti.mutate(
      {
        commessaId: scelta.id,
        clienteId: scelta.clienteId,
        numeroCommessa: scelta.numero,
        imponibile,
        tipo,
        percentuale: tipo === 'acconto' ? percentuale : undefined,
        aliquotaIva: ALIQUOTA_IVA_DEFAULT,
      },
      {
        onSuccess: (fattura) => {
          onOpenChange(false);
          onEmessa(fattura.id);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !emetti.isPending && onOpenChange(o)}>
      <DialogContent className="border border-white/[0.08] bg-[#111111] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Emetti da commessa</DialogTitle>
          <DialogDescription className="text-[12.5px] text-white/65">
            La fattura eredita cliente e riferimento della commessa. Il numero lo assegna il
            progressivo annuale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Commessa" obbligatorio>
            <Select value={commessaId} onValueChange={setCommessaId}>
              <SelectTrigger className={INPUT_CLS}>
                <SelectValue placeholder="Scegli una commessa completata…" />
              </SelectTrigger>
              <SelectContent className="bg-[#15181B]">
                {(commesse.data?.righe ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.numero} · {c.clienteDenominazione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo" obbligatorio>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFattura)}>
                <SelectTrigger className={INPUT_CLS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#15181B]">
                  <SelectItem value="unica">Fattura unica</SelectItem>
                  <SelectItem value="acconto">Acconto</SelectItem>
                  <SelectItem value="saldo">Saldo</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Imponibile del lavoro"
              obbligatorio
              hint="Il prezzo concordato, IVA esclusa."
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={imponibile}
                onChange={(e) => setImponibile(Number(e.target.value))}
                className={`${INPUT_CLS} text-right tabular-nums`}
              />
            </FormField>
          </div>

          {tipo === 'acconto' && (
            <FormField label="Percentuale di acconto" obbligatorio>
              <Input
                type="number"
                min={1}
                max={100}
                step="1"
                value={percentuale}
                onChange={(e) => setPercentuale(Number(e.target.value))}
                className={`${INPUT_CLS} w-28 text-right tabular-nums`}
              />
            </FormField>
          )}

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">
              Imponibile della fattura
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-white">
              {formatCurrency(anteprima)}
            </p>
            {tipo === 'saldo' && (
              <p className="mt-2 text-[11px] text-white/40">
                Dal saldo il service scorpora gli acconti già emessi su questa commessa.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={emetti.isPending}
          >
            Annulla
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={conferma}
            disabled={!commessaId || imponibile <= 0 || emetti.isPending}
          >
            {emetti.isPending ? 'Emissione…' : 'Emetti fattura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
