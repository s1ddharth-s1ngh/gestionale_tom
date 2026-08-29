import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import type { Indirizzo } from '@/types/comune';

/**
 * I cinque campi di un indirizzo, sempre nella stessa disposizione.
 *
 * Controllato (`value` + `onChange`) e non legato a react-hook-form: così lo
 * usano sia i form con RHF, via `Controller`, sia le modifiche inline del
 * dettaglio, che RHF non lo usano. Legarlo a `register` lo renderebbe
 * inservibile nella metà dei posti dove serve.
 *
 * La griglia: via larga con civico stretto accanto, poi CAP stretto, comune
 * largo e provincia strettissima. È il ritmo con cui un indirizzo si scrive
 * davvero, e tenerlo uguale ovunque fa sì che chi compila non debba rileggere
 * le etichette ogni volta.
 */
interface IndirizzoFieldsProps {
  value: Indirizzo;
  onChange: (v: Indirizzo) => void;
  /** Errori per campo, dalle stesse chiavi di `Indirizzo`. */
  errors?: Partial<Record<keyof Indirizzo, string>>;
  disabled?: boolean;
  /** Marca via, CAP e comune come obbligatori. */
  obbligatorio?: boolean;
  className?: string;
}

export function IndirizzoFields({
  value,
  onChange,
  errors,
  disabled,
  obbligatorio,
  className,
}: IndirizzoFieldsProps) {
  const set = (campo: keyof Indirizzo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [campo]: e.target.value });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <FormField label="Via" obbligatorio={obbligatorio} error={errors?.via}>
          <Input value={value.via} onChange={set('via')} disabled={disabled} placeholder="Via Cesare Battisti" />
        </FormField>
        <FormField label="Civico" error={errors?.civico}>
          <Input value={value.civico} onChange={set('civico')} disabled={disabled} placeholder="14" />
        </FormField>
      </div>

      <div className="grid grid-cols-[100px_1fr_80px] gap-3">
        <FormField label="CAP" obbligatorio={obbligatorio} error={errors?.cap}>
          <Input
            value={value.cap}
            onChange={set('cap')}
            disabled={disabled}
            placeholder="40123"
            inputMode="numeric"
            maxLength={5}
            className="font-mono"
          />
        </FormField>
        <FormField label="Comune" obbligatorio={obbligatorio} error={errors?.comune}>
          <Input value={value.comune} onChange={set('comune')} disabled={disabled} placeholder="Bologna" />
        </FormField>
        <FormField label="Prov." error={errors?.provincia}>
          <Input
            value={value.provincia}
            // La sigla è sempre maiuscola: normalizzare qui evita "bo" in
            // mezzo a una colonna di "BO".
            onChange={(e) => onChange({ ...value, provincia: e.target.value.toUpperCase().slice(0, 2) })}
            disabled={disabled}
            placeholder="BO"
            maxLength={2}
            className="font-mono uppercase"
          />
        </FormField>
      </div>
    </div>
  );
}
