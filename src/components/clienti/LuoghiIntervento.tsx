import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Plus, Edit, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/dark-section';
import { StatusPill } from '@/components/ui/status-pill';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRimuoviLuogo } from '@/hooks/useClienti';
import { ACCESSO_ACCENT, accessoMezziLabel, type LuogoIntervento } from '@/types/cliente';
import { indirizzoInRiga } from '@/types/comune';
import { LuogoDrawer } from './LuogoDrawer';

/**
 * I luoghi di intervento di un cliente: dove si va a lavorare.
 *
 * Sono separati dall'indirizzo di fatturazione perché quasi mai coincidono —
 * l'amministratore fattura dal suo studio e il lavoro è nel cortile dall'altra
 * parte della città — e perché un cliente ne ha spesso più di uno.
 *
 * Il principale è marcato: è quello che il preventivo propone per primo, e
 * senza l'evidenza non si capirebbe perché ne sceglie uno invece di un altro.
 */
export function LuoghiIntervento({
  clienteId,
  luoghi,
}: {
  clienteId: string;
  luoghi: LuogoIntervento[];
}) {
  const [drawerAperto, setDrawerAperto] = useState(false);
  const [inModifica, setInModifica] = useState<LuogoIntervento | null>(null);
  const [daRimuovere, setDaRimuovere] = useState<LuogoIntervento | null>(null);
  const rimuovi = useRimuoviLuogo();

  const apriNuovo = () => {
    setInModifica(null);
    setDrawerAperto(true);
  };

  const apriModifica = (l: LuogoIntervento) => {
    setInModifica(l);
    setDrawerAperto(true);
  };

  const confermaRimozione = async () => {
    if (!daRimuovere) return;
    try {
      await rimuovi.mutateAsync(daRimuovere.id);
      toast.success(`«${daRimuovere.etichetta}» rimosso`);
      setDaRimuovere(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Non è stato possibile rimuovere il luogo');
    }
  };

  return (
    <>
      <SectionCard
        id="luoghi"
        title="Luoghi di intervento"
        action={
          <Button variant="primary" onClick={apriNuovo}>
            <Plus className="h-3.5 w-3.5" />
            Aggiungi
          </Button>
        }
      >
        {luoghi.length === 0 ? (
          <TableEmptyState
            compact
            icon={MapPin}
            title="Nessun luogo di intervento"
            description="Si aggiungono dopo il sopralluogo. Senza almeno uno non si può aprire un preventivo per questo cliente."
            action={
              <Button variant="primary" onClick={apriNuovo}>
                <Plus className="h-3.5 w-3.5" />
                Aggiungi il primo
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {luoghi.map((l) => (
              <div
                key={l.id}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.12]"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-white">
                      {l.etichetta}
                    </span>
                    {l.principale && <StatusPill accent="info">Principale</StatusPill>}
                    {l.accessoMezzi && (
                      <StatusPill accent={ACCESSO_ACCENT[l.accessoMezzi]}>
                        {accessoMezziLabel(l.accessoMezzi)}
                      </StatusPill>
                    )}
                  </div>

                  <p className="mt-1 text-[12px] text-white/55">{indirizzoInRiga(l.indirizzo)}</p>

                  {l.note && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">{l.note}</p>
                  )}
                </div>

                {/* Le azioni compaiono all'hover: su una lista di sei luoghi,
                    dodici bottoni sempre accesi coprono il contenuto. */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Modifica"
                    onClick={() => apriModifica(l)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rimuovi"
                    onClick={() => setDaRimuovere(l)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <LuogoDrawer
        open={drawerAperto}
        onOpenChange={setDrawerAperto}
        clienteId={clienteId}
        luogo={inModifica}
      />

      <ConfirmDialog
        open={!!daRimuovere}
        onOpenChange={(o) => !o && setDaRimuovere(null)}
        title="Rimuovere questo luogo?"
        description={
          <>
            «{daRimuovere?.etichetta}» non comparirà più fra i luoghi selezionabili.
          </>
        }
        avviso="I preventivi e le commesse che ci puntano restano dove sono: continuano a mostrare l'indirizzo, ma non si potrà più sceglierlo per un lavoro nuovo."
        confermaLabel="Rimuovi"
        variante="pericolo"
        inCorso={rimuovi.isPending}
        onConferma={confermaRimozione}
      />
    </>
  );
}
