import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCliente } from '@/hooks/useClienti';
import { luogoPrincipale } from '@/types/cliente';
import { indirizzoInRiga } from '@/types/comune';

/**
 * Scelta del luogo di intervento fra quelli del cliente selezionato.
 *
 * Dipende dal cliente: senza, è disabilitata e lo dice. Un Select normale
 * basta — i luoghi di un cliente sono pochi, non serve la ricerca.
 *
 * Se il cliente ne ha uno solo (o uno marcato principale) lo preseleziona:
 * far scegliere fra una cosa sola è un clic chiesto per niente.
 */
interface LuogoInterventoSelectProps {
  clienteId?: string | null;
  value?: string | null;
  onChange: (luogoId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function LuogoInterventoSelect({
  clienteId,
  value,
  onChange,
  disabled,
  className,
}: LuogoInterventoSelectProps) {
  const { data: cliente } = useCliente(clienteId ?? undefined);
  const luoghi = cliente?.luoghiIntervento ?? [];

  useEffect(() => {
    if (!cliente || value) return;
    const proposto = luogoPrincipale(cliente);
    if (proposto) onChange(proposto.id);
    // `onChange` fuori dalle dipendenze di proposito: i call-site lo passano
    // spesso come lambda inline, e includerlo rilancerebbe l'effetto a ogni
    // render riscrivendo la scelta dell'utente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, value]);

  const nessunLuogo = !!cliente && luoghi.length === 0;

  return (
    <div className={className}>
      <Select
        value={value ?? undefined}
        onValueChange={onChange}
        disabled={disabled || !clienteId || nessunLuogo}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              !clienteId
                ? 'Scegli prima il cliente'
                : nessunLuogo
                  ? 'Il cliente non ha luoghi di intervento'
                  : 'Scegli il luogo…'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {luoghi.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span className="text-white">{l.etichetta}</span>
              <span className="ml-2 text-white/40">{indirizzoInRiga(l.indirizzo)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {nessunLuogo && (
        <p className="mt-1 text-[11px] text-amber-200/90">
          Aggiungi un luogo di intervento dalla scheda del cliente prima di procedere.
        </p>
      )}
    </div>
  );
}
