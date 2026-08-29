import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ClienteSelect } from '@/components/shared/ClienteSelect';
import { LuogoInterventoSelect } from '@/components/shared/LuogoInterventoSelect';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/dark-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { useCreaCommessa } from '@/hooks/useCommesse';
import type { Lavorazione } from '@/types/commessa';
import { LavorazioniTable } from '@/components/commesse/LavorazioniTable';

/**
 * Creazione a mano di una commessa.
 *
 * È una pagina e non un drawer: col blocco delle lavorazioni il form è lungo, e
 * un drawer che scrolla per due terzi della sua altezza è un drawer sbagliato.
 *
 * La strada normale però resta la conversione da preventivo accettato — questa
 * serve al lavoro che arriva senza passare da un'offerta, che in questo mestiere
 * è la chiamata urgente per il ramo caduto.
 */

const schema = z.object({
  clienteId: z.string().min(1, 'Scegli il cliente'),
  luogoInterventoId: z.string().min(1, "Scegli il luogo dell'intervento"),
  dataPianificata: z.string().optional(),
  orePreviste: z.coerce
    .number({ invalid_type_error: 'Indica le ore previste' })
    .min(0, 'Le ore non possono essere negative'),
  note: z.string().optional(),
});

type Campi = z.infer<typeof schema>;

export default function CommessaNuova() {
  const navigate = useNavigate();
  const crea = useCreaCommessa();

  // Le lavorazioni stanno fuori dal form: sono una lista con la sua tabella, e
  // infilarle in react-hook-form vorrebbe dire un field array per guadagnare
  // una validazione che qui non serve — una riga senza descrizione non si
  // aggiunge nemmeno.
  const [lavorazioni, setLavorazioni] = React.useState<Lavorazione[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Campi>({
    resolver: zodResolver(schema),
    defaultValues: { clienteId: '', luogoInterventoId: '', orePreviste: 0 },
  });

  const clienteId = watch('clienteId');
  const luogoInterventoId = watch('luogoInterventoId');
  const orePreviste = watch('orePreviste');

  // Le ore previste seguono le lavorazioni finché nessuno le tocca a mano: chi
  // compila le righe ha già detto quante ore servono, e farglielo riscrivere in
  // cima è il modo migliore per ottenere due numeri diversi.
  const totaleLavorazioni = lavorazioni.reduce((t, l) => t + l.orePreviste, 0);
  const [oreToccate, setOreToccate] = React.useState(false);
  React.useEffect(() => {
    if (!oreToccate) setValue('orePreviste', totaleLavorazioni);
  }, [totaleLavorazioni, oreToccate, setValue]);

  const onSubmit = handleSubmit(async (campi) => {
    try {
      const commessa = await crea.mutateAsync({
        clienteId: campi.clienteId,
        luogoInterventoId: campi.luogoInterventoId,
        dataPianificata: campi.dataPianificata || undefined,
        orePreviste: campi.orePreviste,
        lavorazioni: lavorazioni.map(({ descrizione, orePreviste: ore, completata }) => ({
          descrizione,
          orePreviste: ore,
          completata,
        })),
        note: campi.note?.trim() || undefined,
      });
      toast.success(`Commessa ${commessa.numero} creata`);
      navigate(`/commesse/${commessa.id}`, { replace: true });
    } catch {
      toast.error('Non è stato possibile creare la commessa');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        breadcrumb={{ to: '/commesse', label: 'Commesse' }}
        eyebrow="Commessa"
        title="Nuova commessa"
        subtitle="Per il lavoro che arriva senza passare da un preventivo"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="md" onClick={() => navigate('/commesse')}>
              Annulla
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={crea.isPending}>
              {crea.isPending ? 'Creazione…' : 'Crea commessa'}
            </Button>
          </div>
        }
      />

      <SectionCard title="Chi e dove">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cliente" obbligatorio error={errors.clienteId?.message}>
            <ClienteSelect
              value={clienteId}
              onChange={(id) => {
                setValue('clienteId', id, { shouldValidate: true });
                // Il luogo appartiene al cliente: cambiando cliente quello
                // scelto prima non esiste più, e lasciarlo salverebbe una
                // commessa su un indirizzo di qualcun altro.
                setValue('luogoInterventoId', '');
              }}
            />
          </FormField>

          <FormField
            label="Luogo di intervento"
            obbligatorio
            error={errors.luogoInterventoId?.message}
            hint={!clienteId ? 'Scegli prima il cliente' : undefined}
          >
            <LuogoInterventoSelect
              clienteId={clienteId}
              value={luogoInterventoId}
              onChange={(id) => setValue('luogoInterventoId', id, { shouldValidate: true })}
              disabled={!clienteId}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Pianificazione">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Data pianificata"
            hint="Lasciala vuota: la commessa nasce da pianificare e si mette a calendario dopo."
          >
            <Input type="date" {...register('dataPianificata')} />
          </FormField>

          <FormField
            label="Ore previste"
            obbligatorio
            error={errors.orePreviste?.message}
            hint={
              !oreToccate && totaleLavorazioni > 0
                ? 'Somma delle lavorazioni. Scrivi un valore per fissarlo a mano.'
                : undefined
            }
          >
            <Input
              type="number"
              min={0}
              step="0.5"
              className="tabular-nums"
              {...register('orePreviste', { onChange: () => setOreToccate(true) })}
              value={orePreviste}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Lavorazioni">
        <LavorazioniTable lavorazioni={lavorazioni} onChange={setLavorazioni} />
      </SectionCard>

      <SectionCard title="Note">
        <Textarea
          rows={3}
          placeholder="Accesso, orari, vincoli di cantiere…"
          {...register('note')}
        />
      </SectionCard>
    </form>
  );
}
