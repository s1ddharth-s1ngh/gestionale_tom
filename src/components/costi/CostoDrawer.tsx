import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Wallet } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EntityDrawer, SectionBox } from '@/components/ui/entity-drawer';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAggiornaCosto, useCreaCosto, useMezzi } from '@/hooks/useCosti';
import { useTuttiFornitori } from '@/hooks/useFornitori';
import type { Fornitore } from '@/types/costo';
import { useCommesse } from '@/hooks/useCommesse';
import {
  CATEGORIE_COSTO,
  TIPI_NOLEGGIO,
  categoriaCostoLabel,
  tipoNoleggioLabel,
  type CategoriaCosto,
  type Costo,
  type CostoInput,
  type TipoNoleggio,
} from '@/types/costo';
import { costoSchema, type CostoForm } from './costoSchema';

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/** Il valore che il Select usa per «nessuno»: la stringa vuota in Radix
 *  significa «non selezionato» e non si può usare come valore di una voce. */
const NESSUNO = '__nessuno__';

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const VUOTO: CostoForm = {
  data: oggiIso(),
  categoria: 'materiali',
  descrizione: '',
  importo: 0,
};

interface CostoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = modifica, assente = creazione. */
  costo?: Costo;
}

/**
 * Registrazione e modifica di un costo.
 *
 * I campi cambiano con la categoria e non è cosmetica: `mezzoId` compare solo
 * dove ha senso, `tipoNoleggio` solo sui noleggi, `litri` solo sul carburante.
 * Mostrare un campo che quella categoria non prevede significa raccogliere un
 * dato che poi nessun riepilogo legge.
 */
export function CostoDrawer({ open, onOpenChange, costo }: CostoDrawerProps) {
  const crea = useCreaCosto();
  const aggiorna = useAggiornaCosto();
  const mezzi = useMezzi();
  const fornitori = useTuttiFornitori();
  const commesse = useCommesse({ perPagina: 100 });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CostoForm>({
    resolver: zodResolver(costoSchema),
    defaultValues: VUOTO,
    mode: 'onBlur',
  });

  // Riaprire il drawer su un altro costo senza questo reset mostrerebbe i
  // valori del precedente: RHF tiene i default del primo mount.
  useEffect(() => {
    if (!open) return;
    reset(costo ? ({ ...costo } as CostoForm) : { ...VUOTO, data: oggiIso() });
  }, [open, costo, reset]);

  const categoria = watch('categoria') as CategoriaCosto;
  const mostraMezzo = categoria === 'carburante' || categoria === 'manutenzione' || categoria === 'assicurazione';
  const mostraLitri = categoria === 'carburante';
  const mostraNoleggio = categoria === 'noleggio';

  const inCorso = crea.isPending || aggiorna.isPending;

  function salva(valori: CostoForm) {
    const input: CostoInput = {
      ...valori,
      categoria: valori.categoria as CategoriaCosto,
      tipoNoleggio: mostraNoleggio ? (valori.tipoNoleggio as TipoNoleggio) : undefined,
      mezzoId: mostraMezzo ? valori.mezzoId : undefined,
      litri: mostraLitri ? valori.litri : undefined,
    };

    const azione = costo
      ? aggiorna.mutateAsync({ id: costo.id, patch: input })
      : crea.mutateAsync(input);

    azione
      .then(() => {
        toast.success(costo ? 'Costo aggiornato' : 'Costo registrato');
        onOpenChange(false);
      })
      .catch(() => toast.error('Impossibile salvare il costo'));
  }

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={Wallet}
      title={costo ? 'Modifica costo' : 'Nuovo costo'}
      subtitle={costo?.descrizione ?? 'Carburante, materiali, noleggi, smaltimenti'}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit(salva)} disabled={inCorso}>
            {inCorso ? 'Salvataggio…' : 'Salva'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(salva)}>
        <SectionBox title="Il costo">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Data" obbligatorio error={errors.data?.message}>
                <Input type="date" {...register('data')} className={`${INPUT_CLS} tabular-nums`} />
              </FormField>

              <FormField label="Categoria" obbligatorio>
                <Controller
                  control={control}
                  name="categoria"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={INPUT_CLS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#15181B]">
                        {CATEGORIE_COSTO.map((c) => (
                          <SelectItem key={c} value={c}>
                            {categoriaCostoLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <FormField label="Descrizione" obbligatorio error={errors.descrizione?.message}>
              <Input
                {...register('descrizione')}
                placeholder="es. Rifornimento gasolio"
                className={INPUT_CLS}
              />
            </FormField>

            {/* Nessun campo IVA: sugli acquisti si detrae, quindi non è un
                costo e in `public.costi` non c'è la colonna. Un campo che si
                compila e non si salva è peggio di un campo che non c'è. */}
            <FormField
              label="Importo (imponibile)"
              obbligatorio
              error={errors.importo?.message}
              hint="IVA esclusa."
            >
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register('importo')}
                className={`${INPUT_CLS} w-40 text-right tabular-nums`}
              />
            </FormField>
          </div>
        </SectionBox>

        <SectionBox title="Da chi e su cosa">
          <div className="space-y-4">
            <FormField label="Fornitore">
              <Controller
                control={control}
                name="fornitoreId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NESSUNO}
                    onValueChange={(v) => field.onChange(v === NESSUNO ? undefined : v)}
                  >
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="Nessun fornitore" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#15181B]">
                      <SelectItem value={NESSUNO}>Nessun fornitore</SelectItem>
                      {(fornitori.data ?? []).map((f: Fornitore) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.denominazione}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {mostraMezzo && (
              <FormField
                label="Mezzo"
                obbligatorio={categoria === 'carburante'}
                error={errors.mezzoId?.message}
              >
                <Controller
                  control={control}
                  name="mezzoId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? NESSUNO}
                      onValueChange={(v) => field.onChange(v === NESSUNO ? undefined : v)}
                    >
                      <SelectTrigger className={INPUT_CLS}>
                        <SelectValue placeholder="Scegli il mezzo…" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#15181B]">
                        {categoria !== 'carburante' && <SelectItem value={NESSUNO}>Nessun mezzo</SelectItem>}
                        {(mezzi.data ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.targa} · {m.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            {mostraLitri && (
              <FormField label="Litri" hint="Serve a leggere il consumo, non solo la spesa.">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  {...register('litri')}
                  className={`${INPUT_CLS} w-32 text-right tabular-nums`}
                />
              </FormField>
            )}

            {mostraNoleggio && (
              <FormField label="Cosa si è noleggiato" obbligatorio error={errors.tipoNoleggio?.message}>
                <Controller
                  control={control}
                  name="tipoNoleggio"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className={INPUT_CLS}>
                        <SelectValue placeholder="Scegli…" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#15181B]">
                        {TIPI_NOLEGGIO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {tipoNoleggioLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            <FormField
              label="Imputa a una commessa"
              hint="Senza commessa il costo è generale, ed è una scelta legittima."
            >
              <Controller
                control={control}
                name="commessaId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NESSUNO}
                    onValueChange={(v) => field.onChange(v === NESSUNO ? undefined : v)}
                  >
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="Costo generale" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#15181B]">
                      <SelectItem value={NESSUNO}>Costo generale</SelectItem>
                      {(commesse.data?.righe ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numero} · {c.clienteDenominazione}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
        </SectionBox>

        <SectionBox title="Documento e note">
          <div className="space-y-4">
            <FormField label="Documento" hint="Numero della fattura o dello scontrino.">
              <Input
                {...register('documento')}
                placeholder="es. FT 2026/318"
                className={`${INPUT_CLS} font-mono`}
              />
            </FormField>

            <FormField label="Note">
              <Textarea
                {...register('note')}
                rows={3}
                className="rounded-lg border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/25"
              />
            </FormField>
          </div>
        </SectionBox>
      </form>
    </EntityDrawer>
  );
}
