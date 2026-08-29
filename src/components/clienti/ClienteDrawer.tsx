import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EntityDrawer, SectionBox } from '@/components/ui/entity-drawer';
import { FormField } from '@/components/ui/form-field';
import { TabPills } from '@/components/ui/tab-pills';
import { IndirizzoFields } from '@/components/shared/IndirizzoFields';
import { useCreaCliente } from '@/hooks/useClienti';
import { TIPI_CLIENTE, tipoClienteLabel, type Cliente, type TipoCliente } from '@/types/cliente';
import { INDIRIZZO_VUOTO } from '@/types/comune';
import { clienteSchema, type ClienteForm } from './clienteSchema';

/**
 * Creazione di un cliente. docs/DESIGN_SYSTEM.md §6.10 e §6.11.
 *
 * Drawer e non pagina: l'anagrafica è breve. Preventivi e commesse, che hanno
 * form lunghi, vanno su pagina dedicata (docs/PLAN.md).
 *
 * I campi cambiano col tipo, e non è cosmetica: lo schema zod è un
 * discriminated union, quindi mostrare un campo che quel tipo non prevede
 * significherebbe raccogliere un dato che la validazione poi ignora.
 */

const VUOTO: ClienteForm = {
  tipo: 'privato',
  denominazione: '',
  codiceFiscale: '',
  telefono: '',
  email: '',
  pec: '',
  codiceDestinatario: '',
  indirizzoFatturazione: { ...INDIRIZZO_VUOTO },
  note: '',
};

interface ClienteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreato?: (cliente: Cliente) => void;
}

export function ClienteDrawer({ open, onOpenChange, onCreato }: ClienteDrawerProps) {
  const crea = useCreaCliente();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: VUOTO,
    // Gli errori compaiono quando si lascia il campo, non mentre si digita:
    // «email non valida» al terzo carattere è rumore, non aiuto.
    mode: 'onBlur',
  });

  const tipo = watch('tipo');

  // Riaprire il drawer deve dare un form pulito: senza, si ritrova la bozza
  // abbandonata e si rischia di salvarla per sbaglio.
  useEffect(() => {
    if (open) reset(VUOTO);
  }, [open, reset]);

  const onSubmit = handleSubmit(async (dati) => {
    try {
      const creato = await crea.mutateAsync({
        ...dati,
        tipo: dati.tipo as TipoCliente,
        // Un cliente nasce senza cantieri: si aggiungono dalla sua scheda,
        // dopo il sopralluogo.
        luoghiIntervento: [],
      });
      toast.success(`Cliente «${creato.denominazione}» creato`);
      onCreato?.(creato);
      onOpenChange(false);
    } catch {
      toast.error('Non è stato possibile salvare il cliente');
    }
  });

  const mostraPartitaIva = tipo === 'azienda' || tipo === 'ente_pubblico';
  const mostraCodiceFiscale = tipo !== 'azienda';
  const referenteObbligatorio = tipo === 'condominio';

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={Users}
      title="Nuovo cliente"
      subtitle="I campi richiesti cambiano in base al tipo"
      footer={
        <>
          <Button size="lg" onClick={() => onOpenChange(false)} disabled={crea.isPending}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" onClick={onSubmit} disabled={crea.isPending}>
            {crea.isPending ? 'Salvataggio…' : 'Crea cliente'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <SectionBox title="Tipo di cliente">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <TabPills
                items={TIPI_CLIENTE.map((t) => ({ id: t, label: tipoClienteLabel(t) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <p className="mt-3 text-[11px] text-white/35">
            {tipo === 'condominio'
              ? 'Per i condomini il referente è l’amministratore, ed è obbligatorio: il condominio come soggetto non risponde al telefono.'
              : tipo === 'ente_pubblico'
                ? 'Per gli enti servono codice fiscale e codice destinatario: senza, la fattura elettronica non parte.'
                : tipo === 'azienda'
                  ? 'Per le aziende la partita IVA è obbligatoria.'
                  : 'Per i privati serve il codice fiscale.'}
          </p>
        </SectionBox>

        <SectionBox title="Identità">
          <div className="space-y-3">
            <FormField label="Denominazione" obbligatorio error={errors.denominazione?.message}>
              <Input
                {...register('denominazione')}
                placeholder={
                  tipo === 'privato' ? 'Nome e cognome' : 'Ragione sociale o denominazione'
                }
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              {/* Dentro questo ramo `tipo` non può essere 'azienda' (lo esclude
                  mostraCodiceFiscale), quindi il campo è sempre obbligatorio. */}
              {mostraCodiceFiscale && (
                <FormField label="Codice fiscale" obbligatorio error={errors.codiceFiscale?.message}>
                  <Input
                    {...register('codiceFiscale')}
                    placeholder={tipo === 'privato' ? 'RSSMRA80A01H501Z' : '92018740376'}
                    className="font-mono uppercase"
                  />
                </FormField>
              )}

              {mostraPartitaIva && (
                <FormField
                  label="Partita IVA"
                  obbligatorio={tipo === 'azienda'}
                  error={errors.partitaIva?.message}
                >
                  <Input
                    {...register('partitaIva')}
                    placeholder="03847210378"
                    className="font-mono"
                  />
                </FormField>
              )}
            </div>
          </div>
        </SectionBox>

        <SectionBox title={referenteObbligatorio ? 'Amministratore' : 'Referente'}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label={referenteObbligatorio ? 'Studio o amministratore' : 'Nome'}
                obbligatorio={referenteObbligatorio}
                error={errors.referente?.nome?.message}
              >
                <Input
                  {...register('referente.nome')}
                  placeholder={referenteObbligatorio ? 'Studio Moretti' : 'Nome e cognome'}
                />
              </FormField>
              <FormField label="Ruolo" error={errors.referente?.ruolo?.message}>
                <Input
                  {...register('referente.ruolo')}
                  placeholder={referenteObbligatorio ? 'Amministratore' : 'Es. Responsabile'}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Telefono referente" error={errors.referente?.telefono?.message}>
                <Input {...register('referente.telefono')} placeholder="051 234567" />
              </FormField>
              <FormField label="Email referente" error={errors.referente?.email?.message}>
                <Input {...register('referente.email')} type="email" placeholder="nome@studio.it" />
              </FormField>
            </div>
          </div>
        </SectionBox>

        <SectionBox title="Contatti">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Telefono" error={errors.telefono?.message}>
                <Input {...register('telefono')} placeholder="335 4471209" />
              </FormField>
              <FormField label="Email" error={errors.email?.message}>
                <Input {...register('email')} type="email" placeholder="cliente@esempio.it" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="PEC"
                error={errors.pec?.message}
                hint="Serve alla fattura elettronica"
              >
                <Input {...register('pec')} type="email" placeholder="cliente@pec.it" />
              </FormField>
              <FormField
                label="Codice destinatario"
                obbligatorio={tipo === 'ente_pubblico'}
                error={errors.codiceDestinatario?.message}
              >
                <Input
                  {...register('codiceDestinatario')}
                  placeholder="UFY8T4"
                  maxLength={7}
                  className="font-mono uppercase"
                />
              </FormField>
            </div>
          </div>
        </SectionBox>

        <SectionBox title="Indirizzo di fatturazione">
          <Controller
            control={control}
            name="indirizzoFatturazione"
            render={({ field }) => (
              <IndirizzoFields
                obbligatorio
                value={field.value}
                onChange={field.onChange}
                errors={{
                  via: errors.indirizzoFatturazione?.via?.message,
                  cap: errors.indirizzoFatturazione?.cap?.message,
                  comune: errors.indirizzoFatturazione?.comune?.message,
                  provincia: errors.indirizzoFatturazione?.provincia?.message,
                }}
              />
            )}
          />
          <p className="mt-3 text-[11px] text-white/35">
            I luoghi di intervento sono un'altra cosa e si aggiungono dalla scheda del
            cliente, dopo il sopralluogo.
          </p>
        </SectionBox>

        <SectionBox title="Note">
          <FormField label="Note interne" error={errors.note?.message}>
            <Textarea
              {...register('note')}
              placeholder="Orari preferiti, accordi, cose da ricordare prima di chiamare…"
            />
          </FormField>
        </SectionBox>
      </form>
    </EntityDrawer>
  );
}
