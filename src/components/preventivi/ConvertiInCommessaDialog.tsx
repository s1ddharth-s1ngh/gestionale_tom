import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from '@/components/ui/icons';
import { formatCurrency } from '@/lib/formatters';
import { pluralize } from '@/lib/utils';
import { useConvertiInCommessa } from '@/hooks/usePreventivi';
import type { Preventivo } from '@/types/preventivo';

interface ConvertiInCommessaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preventivo: Preventivo;
  /** Denominazione del cliente, già risolta dalla pagina. */
  nomeCliente: string;
  onConvertito: (commessaId: string) => void;
}

/**
 * La conferma prima di trasformare il preventivo accettato in una commessa.
 *
 * Non è un `ConfirmDialog`: quello conferma e basta, mentre qui l'operazione
 * può fallire e il fallimento va MOSTRATO dentro il dialog. L'aggancio a
 * `commesseService` è un pezzo che arriva da un'altra parte del progetto, e un
 * dialog che si chiude in silenzio lascerebbe credere che la commessa sia stata
 * creata — con l'utente che va a cercarla in un elenco dove non c'è.
 */
export function ConvertiInCommessaDialog({
  open,
  onOpenChange,
  preventivo,
  nomeCliente,
  onConvertito,
}: ConvertiInCommessaDialogProps) {
  const converti = useConvertiInCommessa();
  const [errore, setErrore] = useState<string | null>(null);

  // Riaprire il dialog dopo un errore deve ripartire pulito: un messaggio
  // rimasto da un tentativo precedente si legge come un secondo fallimento.
  useEffect(() => {
    if (open) setErrore(null);
  }, [open]);

  const inCorso = converti.isPending;
  const alberi = preventivo.sopralluogo.alberi.length;
  const righe = preventivo.righe.length;

  const conferma = async () => {
    setErrore(null);
    try {
      const { commessaId } = await converti.mutateAsync(preventivo.id);
      onConvertito(commessaId);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Conversione non riuscita.');
    }
  };

  return (
    <Dialog
      open={open}
      // Mentre l'operazione è in volo il dialog non si chiude: sparire a metà
      // lascia chi guarda senza sapere se è andata a buon fine.
      onOpenChange={(o) => {
        if (!o && inCorso) return;
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creare la commessa da {preventivo.numero}?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-[12.5px] text-white/65">
              <div>
                Nasce una commessa per <span className="text-white/85">{nomeCliente}</span> con{' '}
                <span className="tabular-nums text-white/85">{alberi}</span>{' '}
                {pluralize(alberi, 'albero rilevato', 'alberi rilevati')} e{' '}
                <span className="tabular-nums text-white/85">{righe}</span>{' '}
                {pluralize(righe, 'riga', 'righe')} da{' '}
                <span className="tabular-nums text-white/85">
                  {formatCurrency(preventivo.totale)}
                </span>
                .
              </div>
              <div className="text-amber-200/90">
                Il preventivo passa ad accettato e resta legato alla commessa.
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* L'errore vive dentro il dialog e non in un toast che sparisce: è qui
            che si sta decidendo, ed è qui che si deve leggere perché non si può. */}
        {errore && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300/80" />
            <p className="text-[12.5px] leading-relaxed text-red-200/90">{errore}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" size="lg" disabled={inCorso} onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" disabled={inCorso} onClick={conferma}>
            {inCorso && <Spinner size="sm" />}
            {inCorso ? 'Creazione…' : 'Crea commessa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
