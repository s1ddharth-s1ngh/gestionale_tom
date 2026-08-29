import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * FormField — etichetta, campo ed errore nella disposizione del design system.
 * docs/DESIGN_SYSTEM.md §6.11.
 *
 * L'asterisco dell'obbligatorio, la spaziatura e il colore dell'errore stanno
 * qui: in Telebi sono ricopiati campo per campo, e basta un `mt-1` dimenticato
 * perché una riga di errore si attacchi al campo sotto.
 *
 *   <FormField label="Partita IVA" obbligatorio error={errors.partitaIva?.message}>
 *     <Input {...register('partitaIva')} className="font-mono" />
 *   </FormField>
 */
interface FormFieldProps {
  label: string;
  /** Aggiunge l'asterisco. La validazione vera sta nello schema zod. */
  obbligatorio?: boolean;
  /** Messaggio di react-hook-form. */
  error?: string;
  /** Nota sotto il campo, quando l'etichetta da sola non basta. */
  hint?: React.ReactNode;
  /** Id dell'input, per legare la label. */
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  obbligatorio,
  error,
  hint,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {obbligatorio && <span className="ml-0.5 text-white/30">*</span>}
      </Label>
      {children}
      {/* Errore e hint si escludono: mostrarli insieme raddoppia l'altezza del
          campo e fa saltare la griglia mentre si compila. */}
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-white/35">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * VField — la coppia etichetta/valore delle pagine di DETTAGLIO (sola
 * lettura). Stessa scala del form, ma il valore è testo, non un input.
 * Il valore assente è un trattino in corsivo, mai una cella vuota.
 */
export function VField({
  icon: Icon,
  label,
  value,
  mono,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn('text-[13px] text-white', mono && 'font-mono')}>
        {value || <span className="italic text-white/30">—</span>}
      </div>
    </div>
  );
}
