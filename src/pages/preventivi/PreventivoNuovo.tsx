import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { SectionBox } from '@/components/ui/entity-drawer';
import { Spinner } from '@/components/ui/spinner';
import { ClienteSelect } from '@/components/shared/ClienteSelect';
import { LuogoInterventoSelect } from '@/components/shared/LuogoInterventoSelect';
import { SopralluogoForm } from '@/components/preventivi/SopralluogoForm';
import { useCreaPreventivo } from '@/hooks/usePreventivi';
import type { Foto } from '@/types/comune';
import type { Accessibilita, Criticita, Lavorazione } from '@/types/preventivo';
import {
  ACCESSIBILITA,
  ALIQUOTA_IVA_DEFAULT,
  CRITICITA,
  LAVORAZIONI,
  SOPRALLUOGO_VUOTO,
  VALIDITA_GIORNI_DEFAULT,
} from '@/types/preventivo';

/**
 * `z.enum` vuole una tupla non vuota, mentre le costanti del dominio sono
 * array. Il cast sta qui, una volta, invece di ripetere le stringhe dentro lo
 * schema: elencarle una seconda volta significa che il giorno che se ne
 * aggiunge una, la validazione la rifiuta senza dire perché.
 */
const comeTupla = <T extends string>(v: T[]) => v as [T, ...T[]];

const alberoSchema = z.object({
  id: z.string(),
  specie: z.string().trim().min(1, 'Indica la specie'),
  altezzaM: z.coerce.number().min(0, 'Non può essere negativa'),
  diametroCm: z.coerce.number().min(0, 'Non può essere negativo'),
  quantita: z.coerce.number().int().min(1, 'Almeno uno'),
  lavorazione: z.enum(comeTupla<Lavorazione>(LAVORAZIONI)),
  note: z.string().optional(),
});

const schema = z
  .object({
    clienteId: z.string().min(1, 'Scegli il cliente'),
    luogoInterventoId: z.string().min(1, 'Scegli il luogo di intervento'),
    dataEmissione: z.string().min(1, 'Indica la data di emissione'),
    validoFino: z.string().min(1, 'Indica fino a quando è valido'),
    aliquotaIva: z.coerce.number().min(0, 'Non può essere negativa').max(100, 'Al massimo 100'),
    note: z.string().optional(),
    sopralluogo: z.object({
      dataSopralluogo: z.string().optional(),
      accessibilita: z.enum(comeTupla<Accessibilita>(ACCESSIBILITA)),
      criticita: z.array(z.enum(comeTupla<Criticita>(CRITICITA))),
      noteTecniche: z.string().optional(),
      foto: z.array(z.custom<Foto>()),
      alberi: z.array(alberoSchema),
    }),
  })
  // Un preventivo che scade prima di essere emesso non è un errore di battitura
  // innocuo: nasce già scaduto e sparisce dalla pill «Inviati» appena spedito.
  .refine((d) => d.validoFino >= d.dataEmissione, {
    message: 'La validità non può precedere la data di emissione',
    path: ['validoFino'],
  });

type FormValues = z.infer<typeof schema>;

/** Data di oggi in ISO `AAAA-MM-GG`, a mezzogiorno per non farci spostare dal fuso. */
function oggi(piuGiorni = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + piuGiorni);
  return d.toISOString().slice(0, 10);
}

/**
 * La creazione di un preventivo è una PAGINA e non un drawer.
 *
 * Il form è lungo — anagrafica, sopralluogo, rilievo, foto, righe — e in un
 * pannello da 640px il rilievo degli alberi diventa una tabella che scorre in
 * orizzontale mentre si compila. I record brevi (cliente, costo) stanno nel
 * drawer; questo no. Vedi docs/PLAN.md §Step 3.
 */
export default function PreventivoNuovo() {
  const navigate = useNavigate();
  const crea = useCreaPreventivo();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clienteId: '',
      luogoInterventoId: '',
      dataEmissione: oggi(),
      validoFino: oggi(VALIDITA_GIORNI_DEFAULT),
      aliquotaIva: ALIQUOTA_IVA_DEFAULT,
      note: '',
      sopralluogo: SOPRALLUOGO_VUOTO,
    },
  });

  const clienteId = watch('clienteId');

  const onSubmit = handleSubmit(async (valori) => {
    const creato = await crea.mutateAsync({
      clienteId: valori.clienteId,
      luogoInterventoId: valori.luogoInterventoId,
      dataEmissione: valori.dataEmissione,
      validoFino: valori.validoFino,
      aliquotaIva: valori.aliquotaIva,
      note: valori.note || undefined,
      sopralluogo: valori.sopralluogo,
      // Le righe economiche si aggiungono dal dettaglio: un preventivo nasce
      // dal sopralluogo, e i prezzi si fanno dopo, a tavolino.
      righe: [],
    });
    toast.success(`Preventivo ${creato.numero} creato in bozza`);
    navigate(`/preventivi/${creato.id}`);
  });

  /**
   * Gli errori sulle righe del rilievo sono per riga, ma la tabella non ha uno
   * spazio dove mostrarli senza sfondare. Si riassumono qui sotto la sezione:
   * il campo mancante è comunque uno solo e si trova a colpo d'occhio.
   */
  const erroriAlberi = errors.sopralluogo?.alberi;
  const messaggioAlberi = Array.isArray(erroriAlberi)
    ? 'Completa la specie e la quantità di ogni albero rilevato.'
    : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/preventivi', label: 'Preventivi' }}
        eyebrow="Nuovo preventivo"
        title="Scheda di sopralluogo"
        subtitle="Il numero lo assegna il sistema al salvataggio. Il preventivo nasce in bozza."
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => navigate('/preventivi')}>
              Annulla
            </Button>
            {/* L'unico bottone del form con type="submit": tutti gli altri sono
                type="button" per default, ed è quello che evita il salvataggio
                involontario premendo Invio dentro un campo. */}
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Salvataggio…' : 'Salva bozza'}
            </Button>
          </>
        }
      />

      <SectionBox title="Cliente e luogo">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Cliente" obbligatorio error={errors.clienteId?.message}>
            <Controller
              control={control}
              name="clienteId"
              render={({ field }) => (
                <ClienteSelect
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    // Il luogo appartiene al cliente: cambiando cliente, quello
                    // scelto prima non esiste più nel nuovo elenco e resterebbe
                    // un id orfano che il dettaglio mostra come «—».
                    setValue('luogoInterventoId', '');
                  }}
                />
              )}
            />
          </FormField>

          <FormField
            label="Luogo di intervento"
            obbligatorio
            error={errors.luogoInterventoId?.message}
            hint={!clienteId ? 'Scegli prima il cliente.' : undefined}
          >
            <Controller
              control={control}
              name="luogoInterventoId"
              render={({ field }) => (
                <LuogoInterventoSelect
                  clienteId={clienteId}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!clienteId}
                />
              )}
            />
          </FormField>
        </div>
      </SectionBox>

      <SectionBox title="Validità e aliquota">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormField
            label="Data di emissione"
            obbligatorio
            error={errors.dataEmissione?.message}
            htmlFor="data-emissione"
          >
            <Input id="data-emissione" type="date" {...register('dataEmissione')} />
          </FormField>

          <FormField
            label="Valido fino al"
            obbligatorio
            error={errors.validoFino?.message}
            hint={`Proposta: ${VALIDITA_GIORNI_DEFAULT} giorni, la prassi del settore.`}
            htmlFor="valido-fino"
          >
            <Input id="valido-fino" type="date" {...register('validoFino')} />
          </FormField>

          <FormField
            label="Aliquota IVA"
            obbligatorio
            error={errors.aliquotaIva?.message}
            hint="22% ordinaria, 10% sulle manutenzioni agevolate."
            htmlFor="aliquota"
          >
            <Input
              id="aliquota"
              type="number"
              min={0}
              max={100}
              className="tabular-nums"
              {...register('aliquotaIva')}
            />
          </FormField>
        </div>
      </SectionBox>

      <div>
        <Controller
          control={control}
          name="sopralluogo"
          render={({ field }) => (
            <SopralluogoForm value={field.value} onChange={field.onChange} />
          )}
        />
        {messaggioAlberi && <p className="mt-2 text-xs text-red-400">{messaggioAlberi}</p>}
      </div>

      <SectionBox title="Note per il cliente">
        <Textarea
          {...register('note')}
          placeholder="Quello che il cliente deve leggere insieme al prezzo: tempi, condizioni, cosa è escluso."
        />
      </SectionBox>
    </form>
  );
}
