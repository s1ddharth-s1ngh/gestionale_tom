import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MapPin } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EntityDrawer, SectionBox } from '@/components/ui/entity-drawer';
import { FormField } from '@/components/ui/form-field';
import { TabPills } from '@/components/ui/tab-pills';
import { IndirizzoFields } from '@/components/shared/IndirizzoFields';
import { useAggiungiLuogo, useAggiornaLuogo } from '@/hooks/useClienti';
import { accessoMezziLabel, type AccessoMezzi, type LuogoIntervento } from '@/types/cliente';
import { INDIRIZZO_VUOTO, type Indirizzo } from '@/types/comune';

/**
 * Aggiunta e modifica di un luogo di intervento.
 *
 * Lo stesso drawer per le due cose: i campi sono identici, e due componenti
 * gemelli divergono alla prima modifica fatta solo su uno.
 *
 * `accessoMezzi` non è un dettaglio da anagrafica: decide se il lavoro si fa
 * con la piattaforma o in tree-climbing, quindi cambia il preventivo. Per
 * questo è in evidenza e non nascosto fra le note.
 */
interface LuogoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  /** Presente = modifica, assente = nuovo. */
  luogo?: LuogoIntervento | null;
}

const ACCESSI: AccessoMezzi[] = ['facile', 'medio', 'difficile'];

export function LuogoDrawer({ open, onOpenChange, clienteId, luogo }: LuogoDrawerProps) {
  const aggiungi = useAggiungiLuogo();
  const aggiorna = useAggiornaLuogo();
  const inCorso = aggiungi.isPending || aggiorna.isPending;

  const [etichetta, setEtichetta] = useState('');
  const [indirizzo, setIndirizzo] = useState<Indirizzo>({ ...INDIRIZZO_VUOTO });
  const [accesso, setAccesso] = useState<AccessoMezzi>('facile');
  const [note, setNote] = useState('');
  const [principale, setPrincipale] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // Si riempie all'apertura, non al montaggio: il drawer resta montato fra
  // un'apertura e l'altra, e senza questo si riaprirebbe con i dati di prima.
  useEffect(() => {
    if (!open) return;
    setErrore(null);
    setEtichetta(luogo?.etichetta ?? '');
    setIndirizzo(luogo?.indirizzo ?? { ...INDIRIZZO_VUOTO });
    setAccesso(luogo?.accessoMezzi ?? 'facile');
    setNote(luogo?.note ?? '');
    setPrincipale(luogo?.principale ?? false);
  }, [open, luogo]);

  const salva = async () => {
    if (!etichetta.trim()) {
      setErrore('Dai un nome al luogo: «Cortile interno», «Giardino lato strada».');
      return;
    }
    if (!indirizzo.comune.trim()) {
      setErrore('Indica almeno il comune: senza, il luogo non si trova.');
      return;
    }

    const dati = {
      etichetta: etichetta.trim(),
      indirizzo,
      accessoMezzi: accesso,
      note: note.trim() || undefined,
      principale,
    };

    try {
      if (luogo) {
        await aggiorna.mutateAsync({ clienteId, luogoId: luogo.id, patch: dati });
        toast.success('Luogo aggiornato');
      } else {
        await aggiungi.mutateAsync({ clienteId, luogo: dati });
        toast.success('Luogo aggiunto');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Non è stato possibile salvare');
    }
  };

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={MapPin}
      title={luogo ? 'Modifica luogo di intervento' : 'Nuovo luogo di intervento'}
      subtitle="Dove si va a lavorare — non dove si manda la fattura"
      footer={
        <>
          <Button size="lg" onClick={() => onOpenChange(false)} disabled={inCorso}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" onClick={salva} disabled={inCorso}>
            {inCorso ? 'Salvataggio…' : luogo ? 'Salva modifiche' : 'Aggiungi luogo'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <SectionBox title="Identificazione">
          <div className="space-y-3">
            <FormField
              label="Nome del luogo"
              obbligatorio
              hint="Come lo chiamate voi, non l'indirizzo: serve a riconoscerlo in un elenco."
            >
              <Input
                value={etichetta}
                onChange={(e) => setEtichetta(e.target.value)}
                placeholder="Cortile interno"
              />
            </FormField>

            <button
              type="button"
              onClick={() => setPrincipale((v) => !v)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                principale
                  ? 'border-[#1E6FFF]/40 bg-[#1E6FFF]/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium ${principale ? 'text-white' : 'text-white/55'}`}>
                  Luogo principale
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  È quello proposto per primo aprendo un preventivo.
                </p>
              </div>
              <span
                className={`relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors ${
                  principale ? 'bg-[#1E6FFF]' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-white transition-all ${
                    principale ? 'left-[18px]' : 'left-[3px]'
                  }`}
                />
              </span>
            </button>
          </div>
        </SectionBox>

        <SectionBox title="Indirizzo">
          <IndirizzoFields obbligatorio value={indirizzo} onChange={setIndirizzo} />
        </SectionBox>

        <SectionBox title="Accesso dei mezzi">
          <TabPills
            items={ACCESSI.map((a) => ({ id: a, label: accessoMezziLabel(a) }))}
            value={accesso}
            onChange={setAccesso}
          />
          <p className="mt-3 text-[11px] text-white/35">
            Non è un dettaglio da anagrafica: decide se il lavoro si fa con la piattaforma o in
            tree-climbing, e quindi cambia il preventivo.
          </p>
        </SectionBox>

        <SectionBox title="Note">
          <FormField label="Cosa sapere prima di arrivare">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Passo carraio stretto, chiedere le chiavi al portiere, cavi elettrici sopra il cedro…"
            />
          </FormField>
        </SectionBox>

        {errore && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200/90">
            {errore}
          </p>
        )}
      </div>
    </EntityDrawer>
  );
}
