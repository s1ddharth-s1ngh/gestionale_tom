import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Check, Trash2, Wallet } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DataState } from '@/components/ui/data-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatoFatturaFornitoreBadge } from '@/components/costi/StatoFatturaFornitoreBadge';
import { CategoriaCostoBadge } from '@/components/costi/CategoriaCostoBadge';
import { PagamentiFornitoreTable } from '@/components/costi/PagamentiFornitoreTable';
import {
  useAnnullaCosti,
  useAzioneFatturaFornitore,
  useEliminaFatturaFornitore,
  useFatturaFornitore,
  useGeneraCosti,
} from '@/hooks/useFattureFornitore';
import { imponibileRiga, statoEffettivoFattura } from '@/types/fatturaFornitore';
import { formatCurrency, formatData, formatNumber } from '@/lib/formatters';
import { cn, pluralize } from '@/lib/utils';

/**
 * Dettaglio di una fattura fornitore.
 *
 * Due azioni distinte, e tenerle separate è il punto della schermata:
 *
 *  - **registrare** significa dire che il documento è nostro e va pagato;
 *  - **generare i costi** significa farlo entrare nei riepiloghi di spesa.
 *
 * Sono due gesti perché due sono le domande — «questa fattura la riconosco?» e
 * «queste righe sono imputate giuste?» — e chi le fa spesso non è la stessa
 * persona nello stesso momento. Unirle vorrebbe dire che riconoscere una
 * fattura scrive costi che nessuno ha guardato.
 */
export default function FatturaFornitoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useFatturaFornitore(id);
  const azione = useAzioneFatturaFornitore();
  const generaCosti = useGeneraCosti();
  const annullaCosti = useAnnullaCosti();
  const elimina = useEliminaFatturaFornitore();

  const [daEliminare, setDaEliminare] = useState(false);
  const [daScollegare, setDaScollegare] = useState(false);

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
              breadcrumb={{ to: '/costi/fatture', label: 'Fatture fornitore' }}
              eyebrow={fattura.fornitoreDenominazione}
              title={fattura.numero}
              subtitle={`Documento del ${formatData(fattura.dataDocumento)}`}
              // Lo stato EFFETTIVO: in tabella ci sono solo `bozza` e `registrata`.
              meta={<StatoFatturaFornitoreBadge stato={statoEffettivoFattura(fattura, fattura.pagato)} />}
              actions={
                <>
                  {fattura.stato === 'bozza' ? (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={azione.isPending}
                      onClick={() =>
                        azione.mutate(
                          { id: fattura.id, azione: 'registra' },
                          {
                            onSuccess: () => toast.success('Fattura registrata'),
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : 'Impossibile registrare'),
                          },
                        )
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      {azione.isPending ? 'Registrazione…' : 'Registra'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={azione.isPending}
                      onClick={() =>
                        azione.mutate(
                          { id: fattura.id, azione: 'annullaRegistrazione' },
                          { onSuccess: () => toast.success('Registrazione annullata') },
                        )
                      }
                    >
                      Annulla registrazione
                    </Button>
                  )}

                  <Button variant="secondary" size="md" onClick={() => setDaEliminare(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </Button>
                </>
              }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <Sezione
                  titolo="Righe"
                  azione={
                    fattura.stato !== 'bozza' &&
                    (fattura.costiGenerati === 0 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={generaCosti.isPending}
                        onClick={() =>
                          generaCosti.mutate(fattura.id, {
                            onSuccess: (r) =>
                              toast.success(
                                `${r.creati} ${pluralize(r.creati, 'costo generato', 'costi generati')}`,
                              ),
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : 'Generazione non riuscita'),
                          })
                        }
                      >
                        {generaCosti.isPending ? 'Generazione…' : 'Genera i costi'}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setDaScollegare(true)}>
                        Scollega i costi
                      </Button>
                    ))
                  }
                >
                  <RigheTable righe={fattura.righe} />
                </Sezione>

                <Sezione titolo="Pagamenti">
                  <PagamentiFornitoreTable
                    fatturaId={fattura.id}
                    pagamenti={fattura.pagamenti}
                    residuo={fattura.residuo}
                    pagabile={fattura.stato !== 'bozza'}
                  />
                </Sezione>
              </div>

              <div className="space-y-5 lg:col-span-4">
                <SideCard titolo="Riepilogo">
                  <dl className="space-y-2.5">
                    <Voce label="Imponibile" valore={formatCurrency(fattura.imponibile)} />
                    <Voce label="IVA" valore={formatCurrency(fattura.iva)} />
                    <Voce label="Totale" valore={formatCurrency(fattura.totale)} forte />
                    <Voce label="Pagato" valore={formatCurrency(fattura.pagato)} />
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
                    <Voce label="Documento" valore={formatData(fattura.dataDocumento)} />
                    <Voce label="Ricezione" valore={formatData(fattura.dataRicezione)} />
                    <Voce label="Scadenza" valore={formatData(fattura.dataScadenza)} />
                  </dl>

                  {/* Il ritardo di ricezione spiega le registrazioni tardive: se
                      è alto e si ripete, il problema è la posta del fornitore. */}
                  {!!fattura.giorniRitardoRicezione && fattura.giorniRitardoRicezione > 3 && (
                    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-200/90">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Arrivata {fattura.giorniRitardoRicezione} giorni dopo la data del documento.
                    </p>
                  )}
                </SideCard>

                <SideCard titolo="Costi generati">
                  {fattura.costiGenerati > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-white">
                        {fattura.costiGenerati}{' '}
                        {pluralize(fattura.costiGenerati, 'riga di costo', 'righe di costo')}
                      </p>
                      <Link
                        to={`/costi?fatturaFornitoreId=${fattura.id}`}
                        className="text-[13px] text-[#7eb0ff] transition-colors hover:text-white"
                      >
                        Vedile nell'elenco costi
                      </Link>
                    </div>
                  ) : fattura.stato === 'bozza' ? (
                    <p className="text-[13px] text-white/55">
                      I costi si generano dopo aver registrato la fattura.
                    </p>
                  ) : (
                    <p className="text-[13px] text-amber-200/90">
                      Nessun costo generato: questa spesa non compare in nessun riepilogo.
                    </p>
                  )}
                </SideCard>

                <SideCard titolo="Fornitore">
                  <Link
                    to={`/costi/fornitori/${fattura.fornitoreId}`}
                    className="text-[13px] text-[#7eb0ff] transition-colors hover:text-white"
                  >
                    {fattura.fornitoreDenominazione ?? 'Apri il fornitore'}
                  </Link>
                  {fattura.fornitorePartitaIva && (
                    <p className="mt-1 font-mono text-[12px] text-white/40">
                      {fattura.fornitorePartitaIva}
                    </p>
                  )}
                </SideCard>

                {fattura.note && (
                  <SideCard titolo="Note">
                    <p className="text-[13px] leading-relaxed text-white/70">{fattura.note}</p>
                  </SideCard>
                )}
              </div>
            </div>

            <ConfirmDialog
              open={daScollegare}
              onOpenChange={setDaScollegare}
              title="Scollegare i costi?"
              description={`Le ${fattura.costiGenerati} righe di costo generate da questa fattura verranno annullate.`}
              avviso="I riepiloghi di spesa cambieranno di conseguenza."
              confermaLabel="Scollega"
              variante="pericolo"
              inCorso={annullaCosti.isPending}
              onConferma={() =>
                annullaCosti.mutate(fattura.id, {
                  onSuccess: (r) => {
                    toast.success(
                      `${r.annullati} ${pluralize(r.annullati, 'costo annullato', 'costi annullati')}`,
                    );
                    setDaScollegare(false);
                  },
                })
              }
            />

            <ConfirmDialog
              open={daEliminare}
              onOpenChange={setDaEliminare}
              title="Eliminare la fattura?"
              description={`La fattura ${fattura.numero} sparirà dall'elenco e dallo scadenzario.`}
              avviso={
                fattura.costiGenerati > 0
                  ? `I ${fattura.costiGenerati} costi generati restano: la spesa è stata sostenuta comunque.`
                  : undefined
              }
              confermaLabel="Elimina"
              variante="pericolo"
              inCorso={elimina.isPending}
              onConferma={() =>
                elimina.mutate(fattura.id, {
                  onSuccess: () => {
                    toast.success('Fattura eliminata');
                    navigate('/costi/fatture');
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

function RigheTable({ righe }: { righe: import('@/types/fatturaFornitore').RigaFatturaFornitore[] }) {
  return (
    <DarkTable
      empty={righe.length === 0}
      emptyIcon={Wallet}
      emptyMessage="Nessuna riga"
      emptyDescription="Senza righe la fattura non ha un importo e non genera costi."
    >
      <DarkTableHeader>
        <DarkTableHead>Descrizione</DarkTableHead>
        <DarkTableHead>Categoria</DarkTableHead>
        <DarkTableHead align="right">Q.tà</DarkTableHead>
        <DarkTableHead align="right">Prezzo</DarkTableHead>
        <DarkTableHead align="right">IVA</DarkTableHead>
        <DarkTableHead align="right">Imponibile</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {righe.map((r, i) => (
          <DarkTableRow key={r.id} zebraIndex={i}>
            <DarkTableCell truncate="max-w-[320px]">{r.descrizione}</DarkTableCell>
            <DarkTableCell>
              <CategoriaCostoBadge categoria={r.categoria} />
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatNumber(r.quantita, r.quantita % 1 === 0 ? 0 : 2)}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(r.prezzoUnitario)}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {r.aliquotaIva}%
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(imponibileRiga(r))}
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}

function Sezione({
  titolo,
  azione,
  children,
}: {
  titolo: string;
  azione?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{titolo}</h2>
        {azione}
      </div>
      {children}
    </section>
  );
}

function SideCard({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
        {titolo}
      </h3>
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
