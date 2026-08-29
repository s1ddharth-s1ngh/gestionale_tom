import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, Wallet } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DataState } from '@/components/ui/data-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { StatoFatturaBadge } from '@/components/fatture/StatoFatturaBadge';
import { RigheFatturaTable } from '@/components/fatture/RigheFatturaTable';
import { IncassiTable } from '@/components/fatture/IncassiTable';
import { RegistraIncassoDialog } from '@/components/fatture/RegistraIncassoDialog';
import { SollecitiTable } from '@/components/fatture/SollecitiTable';
import { DatiFatturazioneElettronica } from '@/components/fatture/DatiFatturazioneElettronica';
import { useEliminaFattura, useEmettiFattura, useFattura, useRimuoviIncasso } from '@/hooks/useFatture';
import { tipoFatturaLabel } from '@/types/fattura';
import { formatCurrency, formatData } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const SEZIONI: TabPillItem[] = [
  { id: 'righe', label: 'Righe' },
  { id: 'incassi', label: 'Incassi' },
  { id: 'solleciti', label: 'Solleciti' },
  { id: 'fe', label: 'Fatturazione elettronica' },
];

/**
 * Dettaglio della fattura.
 *
 * Le righe sono in sola lettura: una fattura emessa non si corregge cambiando
 * un numero: si emette una nota di credito. La nota di credito non è nel primo
 * rilascio, e per questo la modifica delle righe qui non c'è affatto — meglio
 * un'operazione assente di una che sembra fare la cosa giusta e non la fa.
 */
export default function FatturaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useFattura(id);
  const emetti = useEmettiFattura();
  const rimuoviIncasso = useRimuoviIncasso();
  const elimina = useEliminaFattura();

  const [sezione, setSezione] = useState('righe');
  const [incassoAperto, setIncassoAperto] = useState(false);
  const [daEliminare, setDaEliminare] = useState(false);

  const fattura = query.data;

  return (
    <div className="space-y-5 p-3">
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && !fattura}
        onRetry={() => query.refetch()}
      >
        {fattura && (
          <>
            <PageHeader
              breadcrumb={{ to: '/fatture', label: 'Fatture' }}
              eyebrow={tipoFatturaLabel(fattura.tipo)}
              title={fattura.numero}
              subtitle={fattura.clienteDenominazione}
              meta={<StatoFatturaBadge stato={fattura.stato} variant="solid" />}
              actions={
                <>
                  {fattura.stato === 'bozza' && (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={emetti.isPending}
                      onClick={() =>
                        emetti.mutate(
                          { id: fattura.id },
                          {
                            onSuccess: () => toast.success(`${fattura.numero} emessa`),
                            onError: () => toast.error('Impossibile emettere la fattura'),
                          },
                        )
                      }
                    >
                      {emetti.isPending ? 'Emissione…' : 'Emetti'}
                    </Button>
                  )}

                  {fattura.residuo > 0 && fattura.stato !== 'bozza' && (
                    <Button variant="primary" size="md" onClick={() => setIncassoAperto(true)}>
                      <Wallet className="h-3.5 w-3.5" />
                      Registra incasso
                    </Button>
                  )}

                  <Button variant="secondary" size="md" onClick={() => setDaEliminare(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </Button>
                </>
              }
            />

            <TabPills
              className="sticky top-2 z-10 !mt-2 backdrop-blur"
              items={SEZIONI}
              value={sezione}
              onChange={(prossima) => {
                document.getElementById(prossima)?.scrollIntoView({ behavior: 'smooth' });
                setSezione(prossima);
              }}
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <Sezione id="righe" titolo="Righe">
                  <RigheFatturaTable righe={fattura.righe} />
                </Sezione>

                <Sezione id="incassi" titolo="Incassi">
                  <IncassiTable
                    incassi={fattura.incassi}
                    onRimuovi={(incassoId) =>
                      rimuoviIncasso.mutate(
                        { id: fattura.id, incassoId },
                        { onSuccess: () => toast.success('Incasso eliminato') },
                      )
                    }
                    azioneVuoto={
                      fattura.stato !== 'bozza' ? (
                        <Button variant="primary" size="sm" onClick={() => setIncassoAperto(true)}>
                          <Wallet className="h-3.5 w-3.5" />
                          Registra incasso
                        </Button>
                      ) : undefined
                    }
                  />
                </Sezione>

                <Sezione id="solleciti" titolo="Solleciti">
                  <SollecitiTable
                    fatturaId={fattura.id}
                    solleciti={fattura.solleciti}
                    sollecitabile={fattura.residuo > 0 && fattura.stato !== 'bozza'}
                  />
                </Sezione>

                <Sezione id="fe" titolo="Fatturazione elettronica">
                  <DatiFatturazioneElettronica dati={fattura.datiFE} />
                </Sezione>
              </div>

              <div className="space-y-5 lg:col-span-4">
                <SideCard titolo="Riepilogo">
                  <dl className="space-y-2.5">
                    <Voce label="Imponibile" valore={formatCurrency(fattura.imponibile)} />
                    <Voce label="IVA" valore={formatCurrency(fattura.iva)} />
                    <Voce label="Totale" valore={formatCurrency(fattura.totale)} forte />
                    <Voce label="Incassato" valore={formatCurrency(fattura.incassato)} />
                    <Voce
                      label="Residuo"
                      valore={formatCurrency(fattura.residuo)}
                      forte
                      className={fattura.residuo > 0 ? 'text-amber-300' : 'text-white'}
                    />
                  </dl>
                </SideCard>

                <SideCard titolo="Date">
                  <dl className="space-y-2.5">
                    <Voce
                      label="Emissione"
                      valore={fattura.dataEmissione ? formatData(fattura.dataEmissione) : '—'}
                    />
                    <Voce label="Scadenza" valore={formatData(fattura.dataScadenza)} />
                    <Voce label="Giorni alla scadenza" valore={testoScadenza(fattura.giorniAllaScadenza, fattura.residuo)} />
                  </dl>
                </SideCard>

                <SideCard titolo="Riferimenti">
                  <dl className="space-y-2.5">
                    <Voce label="Cliente" valore={fattura.clienteDenominazione} />
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
                        Commessa
                      </dt>
                      <dd className="text-[13px] text-white">
                        {fattura.commessaId ? (
                          <Link
                            to={`/commesse/${fattura.commessaId}`}
                            className="text-[#7eb0ff] transition-colors hover:text-white"
                          >
                            Apri la commessa
                          </Link>
                        ) : (
                          <span className="italic text-white/30">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </SideCard>

                {fattura.note && (
                  <SideCard titolo="Note">
                    <p className="text-[13px] leading-relaxed text-white/70">{fattura.note}</p>
                  </SideCard>
                )}
              </div>
            </div>

            <RegistraIncassoDialog
              open={incassoAperto}
              onOpenChange={setIncassoAperto}
              fatturaId={fattura.id}
              numero={fattura.numero}
              residuo={fattura.residuo}
            />

            <ConfirmDialog
              open={daEliminare}
              onOpenChange={setDaEliminare}
              title="Eliminare la fattura?"
              description={`${fattura.numero} sparirà dall'elenco, insieme ai suoi incassi e ai suoi solleciti.`}
              avviso="Questa azione non si può annullare."
              confermaLabel="Elimina"
              variante="pericolo"
              inCorso={elimina.isPending}
              onConferma={() =>
                elimina.mutate(fattura.id, {
                  onSuccess: () => {
                    toast.success(`${fattura.numero} eliminata`);
                    navigate('/fatture');
                  },
                })
              }
            />
          </>
        )}
      </DataState>
    </div>
  );
}

function Sezione({ id, titolo, children }: { id: string; titolo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-[20px] border border-white/[0.06] bg-[#111111] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{titolo}</h2>
      </div>
      {children}
    </section>
  );
}

function SideCard({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">{titolo}</h3>
      {children}
    </div>
  );
}

function Voce({
  label,
  valore,
  forte,
  className,
}: {
  label: string;
  valore: string;
  forte?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          forte ? 'text-[15px] font-semibold text-white' : 'text-[13px] text-white/70',
          className,
        )}
      >
        {valore}
      </dd>
    </div>
  );
}

/** Su una fattura pagata i giorni alla scadenza non dicono più niente. */
function testoScadenza(giorni: number | null, residuo: number): string {
  if (residuo <= 0) return 'Saldata';
  if (giorni === null) return '—';
  if (giorni < 0) return `Scaduta da ${Math.abs(giorni)} giorni`;
  if (giorni === 0) return 'Scade oggi';
  return `Fra ${giorni} giorni`;
}
