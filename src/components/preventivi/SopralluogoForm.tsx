import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionBox } from '@/components/ui/entity-drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FotoUploader } from '@/components/shared/FotoUploader';
import { CriticitaSelect } from '@/components/preventivi/CriticitaSelect';
import { RilievoAlberiTable } from '@/components/preventivi/RilievoAlberiTable';
import type { Foto } from '@/types/comune';
import type { Accessibilita, RilievoAlbero, SchedaSopralluogo } from '@/types/preventivo';
import { ACCESSIBILITA, accessibilitaLabel } from '@/types/preventivo';

interface SopralluogoFormProps {
  value: SchedaSopralluogo;
  onChange: (s: SchedaSopralluogo) => void;
  disabled?: boolean;
}

/**
 * La scheda di sopralluogo: quello che si è visto sul posto, e che il preventivo
 * deve poter giustificare mesi dopo.
 *
 * Accessibilità e criticità sono campi e non note libere perché sono la ragione
 * per cui due potature dello stesso albero costano diverso: se finiscono in un
 * testo, il giorno che si vuole capire perché un cantiere è andato lungo non si
 * trovano più.
 */
export function SopralluogoForm({ value, onChange, disabled }: SopralluogoFormProps) {
  const set = <K extends keyof SchedaSopralluogo>(campo: K, v: SchedaSopralluogo[K]) =>
    onChange({ ...value, [campo]: v });

  return (
    <div className="space-y-5">
      <SectionBox title="Condizioni del sito">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormField label="Data del sopralluogo" htmlFor="data-sopralluogo">
            <Input
              id="data-sopralluogo"
              type="date"
              value={value.dataSopralluogo ?? ''}
              disabled={disabled}
              onChange={(e) => set('dataSopralluogo', e.target.value || undefined)}
            />
          </FormField>

          <FormField
            label="Accessibilità"
            obbligatorio
            hint="Quanto è difficile portare mezzi e squadra sul posto."
          >
            <Select
              value={value.accessibilita}
              disabled={disabled}
              onValueChange={(v) => set('accessibilita', v as Accessibilita)}
            >
              <SelectTrigger aria-label="Accessibilità del sito">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESSIBILITA.map((a) => (
                  <SelectItem key={a} value={a}>
                    {accessibilitaLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField
            label="Criticità rilevate"
            hint="Si spuntano tutte quelle che valgono: cambiano squadra, mezzi e prezzo."
          >
            <CriticitaSelect
              value={value.criticita}
              onChange={(c) => set('criticita', c)}
              disabled={disabled}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Note tecniche">
            <Textarea
              value={value.noteTecniche ?? ''}
              disabled={disabled}
              onChange={(e) => set('noteTecniche', e.target.value || undefined)}
              placeholder="Come si entra, dove si posiziona la piattaforma, vincoli di orario, autorizzazioni…"
            />
          </FormField>
        </div>
      </SectionBox>

      <SectionBox title="Rilievo degli alberi">
        <RilievoAlberiTable
          value={value.alberi}
          onChange={(a: RilievoAlbero[]) => set('alberi', a)}
          disabled={disabled}
        />
      </SectionBox>

      <SectionBox title="Foto del sopralluogo">
        <FotoUploader
          foto={value.foto}
          onChange={(f: Foto[]) => set('foto', f)}
          etichetta="Trascina qui le foto del sopralluogo"
          disabled={disabled}
        />
      </SectionBox>
    </div>
  );
}
