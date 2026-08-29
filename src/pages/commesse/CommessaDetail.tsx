import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { IndirizzoCard } from '@/components/shared/IndirizzoCard';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard, SideCard } from '@/components/ui/dark-section';
import { DataState } from '@/components/ui/data-state';
import { CalendarBlank, ClipboardText, Trash2, Tree } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { useCliente } from '@/hooks/useClienti';
import {
  useAggiornaLavorazioni,
  useAzioneCommessa,
  useCommessa,
  useEliminaCommessa,
  usePianificaCommessa,
  useSalvaFoto,
  useSalvaRapportino,
} from '@/hooks/useCommesse';
import { formatData, formatOre } from '@/lib/formatters';
import type { Lavorazione, StatoCommessa } from '@/types/commessa';
import type { AzioneCommessa } from '@/hooks/useCommesse';
import { AvanzamentoBar } from '@/components/commesse/AvanzamentoBar';
import { FotoPrimaDopo } from '@/components/commesse/FotoPrimaDopo';
import { LavorazioniTable } from '@/components/commesse/LavorazioniTable';
import { OreConfronto } from '@/components/commesse/OreConfronto';
import { RapportinoForm } from '@/components/commesse/RapportinoForm';
import { StatoCommessaBadge } from '@/components/commesse/StatoCommessaBadge';

/**
 * La scheda di una commessa: quello che c'è da fare, quanto è stato fatto, e le
 * foto delle due metà del lavoro.
 *
 * Le azioni di stato stanno in testata e non sparse per la pagina, e sono solo
 * quelle possibili adesso: un bottone «completa» su una commessa da pianificare
 * esiste solo per essere cliccato per sbaglio.
 */

/** Le azioni offerte per ogni stato, nell'ordine in cui hanno senso. */
const AZIONI_PER_STATO: Record<StatoCommessa, AzioneCommessa[]> = {
  da_pianificare: ['avvia', 'annulla'],
  pianificata: ['avvia', 'sospendi', 'annulla'],
  in_corso: ['completa', 'sospendi', 'annulla'],
  completata: [],
  sospesa: ['riprendi', 'annulla'],
  annullata: [],
};

const AZIONE_LABEL: Record<AzioneCommessa, string> = {
  avvia: 'Avvia il lavoro',
  sospendi: 'Sospendi',
  riprendi: 'Riprendi',
  completa: 'Segna completata',
  annulla: 'Annulla la commessa',
};

/** Gli stati in cui la scheda è di sola lettura: chiusa o annullata non si tocca. */
const CHIUSA: StatoCommessa[] = ['completata', 'annullata'];

export default function CommessaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useCommessa(id);
  const commessa = query.data ?? null;

  const cliente = useCliente(commessa?.clienteId);
  const luogo = cliente.data?.luoghiIntervento.find((l) => l.id === commessa?.luogoInterventoId);

  const azione = useAzioneCommessa();
  const pianifica = usePianificaCommessa();
  const salvaLavorazioni = useAggiornaLavorazioni();
  const salvaFoto = useSalvaFoto();
  const salvaRapportino = useSalvaRapportino();
  const elimina = useEliminaCommessa();

  const [confermaElimina, setConfermaElimina] = React.useState(false);
  const [confermaAnnulla, setConfermaAnnulla] = React.useState(false);

  const readOnly = !!commessa && CHIUSA.includes(commessa.stato);

  const eseguiAzione = async (a: AzioneCommessa) => {
    if (!id) return;
    // L'annullamento è l'unico passaggio da cui non si torna indietro con un
    // click: chiede conferma, gli altri no. Un dialog su ogni azione si impara
    // a chiudere senza leggerlo, e allora smette di proteggere anche qui.
    if (a === 'annulla') {
      setConfermaAnnulla(true);
      return;
    }
    try {
      await azione.mutateAsync({ id, azione: a });
      toast.success('Commessa aggiornata');
    } catch {
      toast.error('Non è stato possibile aggiornare la commessa');
    }
  };

  const salvaLista = async (lavorazioni: Lavorazione[]) => {
    if (!id) return;
    try {
      await salvaLavorazioni.mutateAsync({ id, lavorazioni });
    } catch {
      toast.error('Non è stato possibile salvare le lavorazioni');
    }
  };

  return (
    <DataState
      loading={query.isLoading}
      error={query.error}
      isEmpty={!query.isLoading && !commessa}
      emptyState={
        <TableEmptyState
          icon={Tree}
          title="Commessa non trovata"
          description="Il numero non corrisponde a nessuna commessa in archivio."
          action={
            <Button variant="secondary" onClick={() => navigate('/commesse')}>
              Torna all'elenco
            </Button>
          }
        />
      }
      onRetry={query.refetch}
    >
      {commessa && (
        <div className="space-y-6">
          <PageHeader
            breadcrumb={{ to: '/commesse', label: 'Commesse' }}
            eyebrow="Commessa"
            title={commessa.numero}
            titleClassName="font-mono"
            subtitle={
              <>
                {commessa.clienteDenominazione}
                <span className="mx-2 text-white/20">·</span>
                {commessa.luogoEtichetta}
              </>
            }
            meta={
              <div className="flex flex-wrap items-center gap-2">
                <StatoCommessaBadge stato={commessa.stato} />
                {commessa.dataPianificata && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-white/45">
                    <CalendarBlank className="h-3.5 w-3.5" />
                    {formatData(commessa.dataPianificata)}
                  </span>
                )}
                {commessa.preventivoId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/preventivi/${commessa.preventivoId}`)}
                    className="text-[12px] text-white/45 underline-offset-2 hover:text-white hover:underline"
                  >
                    Nata da preventivo
                  </button>
                )}
              </div>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {AZIONI_PER_STATO[commessa.stato].map((a) => (
                  <Button
                    key={a}
                    size="md"
                    variant={a === 'annulla' ? 'ghost' : a === 'avvia' || a === 'completa' ? 'primary' : 'secondary'}
                    disabled={azione.isPending}
                    onClick={() => eseguiAzione(a)}
                  >
                    {AZIONE_LABEL[a]}
                  </Button>
                ))}
                <Button
                  size="icon"
                  variant="ghost"
                  title="Elimina la commessa"
                  onClick={() => setConfermaElimina(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            }
          />

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              <SectionCard title="Lavorazioni">
                <LavorazioniTable
                  lavorazioni={commessa.lavorazioni}
                  onChange={salvaLista}
                  readOnly={readOnly}
                  salvataggioInCorso={salvaLavorazioni.isPending}
                />
              </SectionCard>

              <SectionCard title="Foto">
                <FotoPrimaDopo
                  prima={commessa.fotoPrima}
                  dopo={commessa.fotoDopo}
                  onPrima={(foto) => id && salvaFoto.mutate({ id, quando: 'prima', foto })}
                  onDopo={(foto) => id && salvaFoto.mutate({ id, quando: 'dopo', foto })}
                  readOnly={readOnly}
                />
              </SectionCard>

              {/* Il rapportino compare solo quando c'e' qualcosa da
                  rapportare: su una commessa non ancora avviata un modulo di
                  fine lavoro vuoto invita a compilarlo prima del lavoro. */}
              {commessa.stato === 'da_pianificare' || commessa.stato === 'pianificata' ? (
                <SectionCard title="Rapportino">
                  <TableEmptyState
                    compact
                    icon={ClipboardText}
                    title="Il rapportino si compila a lavoro iniziato"
                    description="Avvia la commessa e qui trovi ore, operatori, materiali e la firma del cliente."
                  />
                </SectionCard>
              ) : (
                <SectionCard title="Rapportino">
                  <RapportinoForm
                    commessa={commessa}
                    readOnly={commessa.stato === 'annullata'}
                    salvataggioInCorso={salvaRapportino.isPending}
                    onSalva={async (rapportino) => {
                      if (!id) return;
                      try {
                        await salvaRapportino.mutateAsync({ id, rapportino });
                        toast.success(
                          rapportino.firmaCliente
                            ? 'Rapportino firmato, commessa completata'
                            : 'Rapportino salvato',
                        );
                      } catch {
                        toast.error('Non e’ stato possibile salvare il rapportino');
                      }
                    }}
                  />
                </SectionCard>
              )}
            </div>

            <div className="space-y-5 lg:col-span-4">
              <SideCard title="Avanzamento">
                <div className="space-y-4">
                  <AvanzamentoBar valore={commessa.avanzamentoPct} />
                  <OreConfronto commessa={commessa} />
                </div>
              </SideCard>

              <SideCard title="Pianificazione">
                <div className="space-y-3">
                  <Input
                    type="date"
                    value={commessa.dataPianificata ?? ''}
                    disabled={readOnly || pianifica.isPending}
                    onChange={(e) => {
                      if (!id || !e.target.value) return;
                      pianifica.mutate({ id, data: e.target.value });
                    }}
                  />
                  <Riga etichetta="Inizio" valore={commessa.dataInizio ? formatData(commessa.dataInizio) : '—'} />
                  <Riga etichetta="Fine" valore={commessa.dataFine ? formatData(commessa.dataFine) : '—'} />
                  <Riga etichetta="Previste" valore={formatOre(commessa.orePreviste)} />
                  <Riga etichetta="Reali" valore={commessa.oreReali > 0 ? formatOre(commessa.oreReali) : '—'} />
                </div>
              </SideCard>

              {luogo && (
                <SideCard title="Luogo di intervento">
                  <IndirizzoCard indirizzo={luogo.indirizzo} />
                </SideCard>
              )}

              {commessa.note && (
                <SideCard title="Note">
                  <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-white/65">
                    {commessa.note}
                  </p>
                </SideCard>
              )}
            </div>
          </div>

          <ConfirmDialog
            open={confermaAnnulla}
            onOpenChange={setConfermaAnnulla}
            title="Annullare la commessa?"
            description="La commessa resta in archivio con lo stato annullata, ma esce dal lavoro pianificato."
            avviso={
              commessa.oreReali > 0
                ? `Ci sono già ${formatOre(commessa.oreReali)} consuntivate su questa commessa.`
                : undefined
            }
            confermaLabel="Annulla la commessa"
            annullaLabel="Lascia com'è"
            variante="pericolo"
            inCorso={azione.isPending}
            onConferma={async () => {
              if (!id) return;
              try {
                await azione.mutateAsync({ id, azione: 'annulla' });
                setConfermaAnnulla(false);
                toast.success('Commessa annullata');
              } catch {
                toast.error('Non è stato possibile annullare la commessa');
              }
            }}
          />

          <ConfirmDialog
            open={confermaElimina}
            onOpenChange={setConfermaElimina}
            title={`Eliminare la commessa ${commessa.numero}?`}
            description="Sparisce dall'archivio, dal calendario e dallo storico del cliente."
            avviso={
              commessa.preventivoId
                ? 'Nasce da un preventivo, che resterà accettato ma senza commessa collegata. Se vuoi solo toglierla dal lavoro, annullala invece di eliminarla.'
                : 'Se vuoi solo toglierla dal lavoro pianificato, annullala invece di eliminarla.'
            }
            confermaLabel="Elimina"
            variante="pericolo"
            inCorso={elimina.isPending}
            onConferma={async () => {
              if (!id) return;
              try {
                await elimina.mutateAsync(id);
                toast.success('Commessa eliminata');
                navigate('/commesse', { replace: true });
              } catch {
                toast.error('Non è stato possibile eliminare la commessa');
              }
            }}
          />
        </div>
      )}
    </DataState>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex items-baseline justify-between text-[12.5px]">
      <span className="text-white/40">{etichetta}</span>
      <span className="tabular-nums text-white/75">{valore}</span>
    </div>
  );
}
