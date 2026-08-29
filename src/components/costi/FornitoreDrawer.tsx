import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Buildings } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EntityDrawer, SectionBox } from '@/components/ui/entity-drawer';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndirizzoFields } from '@/components/shared/IndirizzoFields';
import { useAggiornaFornitore, useCreaFornitore } from '@/hooks/useFornitori';
import { INDIRIZZO_VUOTO, type Indirizzo } from '@/types/comune';
import {
  CATEGORIE_COSTO,
  categoriaCostoLabel,
  type CategoriaCosto,
  type Fornitore,
  type FornitoreInput,
} from '@/types/costo';

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

const NESSUNA = '__nessuna__';

interface FornitoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornitore?: Fornitore;
}

/**
 * Creazione e modifica di un fornitore.
 *
 * Senza react-hook-form: l'unico campo obbligatorio è la denominazione, e uno
 * schema zod per una regola sola sarebbe più codice da leggere della regola.
 * Dove le regole sono due o più — il drawer dei costi — lo schema c'è.
 */
export function FornitoreDrawer({ open, onOpenChange, fornitore }: FornitoreDrawerProps) {
  const crea = useCreaFornitore();
  const aggiorna = useAggiornaFornitore();

  const [denominazione, setDenominazione] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [categoria, setCategoria] = useState<CategoriaCosto | undefined>();
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [indirizzo, setIndirizzo] = useState<Indirizzo>({ ...INDIRIZZO_VUOTO });
  const [note, setNote] = useState('');
  const [errore, setErrore] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setDenominazione(fornitore?.denominazione ?? '');
    setPartitaIva(fornitore?.partitaIva ?? '');
    setCategoria(fornitore?.categoriaPrevalente);
    setTelefono(fornitore?.telefono ?? '');
    setEmail(fornitore?.email ?? '');
    setIndirizzo(fornitore?.indirizzo ?? { ...INDIRIZZO_VUOTO });
    setNote(fornitore?.note ?? '');
    setErrore(undefined);
  }, [open, fornitore]);

  const inCorso = crea.isPending || aggiorna.isPending;

  function salva() {
    if (denominazione.trim().length < 2) {
      setErrore('La denominazione è obbligatoria.');
      return;
    }

    const input: FornitoreInput = {
      denominazione: denominazione.trim(),
      partitaIva: partitaIva.trim() || undefined,
      categoriaPrevalente: categoria,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      // Un indirizzo tutto vuoto non si salva: darebbe una card indirizzo con
      // cinque trattini al posto di un'assenza onesta.
      indirizzo: indirizzo.via.trim() || indirizzo.comune.trim() ? indirizzo : undefined,
      note: note.trim() || undefined,
    };

    const azione = fornitore
      ? aggiorna.mutateAsync({ id: fornitore.id, patch: input })
      : crea.mutateAsync(input);

    azione
      .then(() => {
        toast.success(fornitore ? 'Fornitore aggiornato' : 'Fornitore creato');
        onOpenChange(false);
      })
      .catch(() => toast.error('Impossibile salvare il fornitore'));
  }

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={Buildings}
      title={fornitore ? 'Modifica fornitore' : 'Nuovo fornitore'}
      subtitle={fornitore?.denominazione ?? 'Distributori, noleggi, officine, smaltimenti'}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" onClick={salva} disabled={inCorso}>
            {inCorso ? 'Salvataggio…' : 'Salva'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <SectionBox title="Anagrafica">
          <div className="space-y-4">
            <FormField label="Denominazione" obbligatorio error={errore}>
              <Input
                value={denominazione}
                onChange={(e) => setDenominazione(e.target.value)}
                placeholder="es. Noleggi Zanardi S.r.l."
                className={INPUT_CLS}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Partita IVA">
                <Input
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  placeholder="es. IT02887410372"
                  className={`${INPUT_CLS} font-mono`}
                />
              </FormField>

              <FormField
                label="Categoria prevalente"
                hint="Precompila la categoria nel drawer dei costi."
              >
                <Select
                  value={categoria ?? NESSUNA}
                  onValueChange={(v) => setCategoria(v === NESSUNA ? undefined : (v as CategoriaCosto))}
                >
                  <SelectTrigger className={INPUT_CLS}>
                    <SelectValue placeholder="Nessuna" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15181B]">
                    <SelectItem value={NESSUNA}>Nessuna</SelectItem>
                    {CATEGORIE_COSTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoriaCostoLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        </SectionBox>

        <SectionBox title="Contatti">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Telefono">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="es. 051 6140228"
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="es. noleggi@esempio.it"
                className={INPUT_CLS}
              />
            </FormField>
          </div>
        </SectionBox>

        <SectionBox title="Sede">
          <IndirizzoFields value={indirizzo} onChange={setIndirizzo} />
        </SectionBox>

        <SectionBox title="Note">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="es. Tariffa concordata, orari di accettazione…"
            className="rounded-lg border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/25"
          />
        </SectionBox>
      </div>
    </EntityDrawer>
  );
}
