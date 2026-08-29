import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/ui/data-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard, SideCard } from '@/components/ui/dark-section';
import { StatusPill } from '@/components/ui/status-pill';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { VField } from '@/components/ui/form-field';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import {
  Calendar,
  CheckCircle,
  ClipboardText,
  MapPin,
  Send,
  Tree,
  TreeEvergreen,
  User,
  XCircle,
} from '@/components/ui/icons';
import { FotoGallery } from '@/components/shared/FotoGallery';
import { StatoPreventivoBadge } from '@/components/preventivi/StatoPreventivoBadge';
import { RiepilogoTotali } from '@/components/preventivi/RighePreventivoTable';
import { ConvertiInCommessaDialog } from '@/components/preventivi/ConvertiInCommessaDialog';
import { useAzionePreventivo, usePreventivo, type AzionePreventivo } from '@/hooks/usePreventivi';
import { useCliente } from '@/hooks/useClienti';
import { formatCurrency, formatData, formatNumber } from '@/lib/formatters';
import { cn, pluralize } from '@/lib/utils';
import type { RilievoAlbero } from '@/types/preventivo';
import {
  accessibilitaAccent,
  accessibilitaLabel,
  calcolaTotali,
  criticitaAccent,
  criticitaLabel,
  giorniAllaScadenza,
  lavorazioneLabel,
  statoEffettivo,
  unitaLabel,
} from '@/types/preventivo';

/** Le sezioni del jump-nav. Gli id sono anche gli ancoraggi delle SectionCard. */
const SEZIONI: TabPillItem[] = [
  { id: 'dati', label: 'Dati generali' },
  { id: 'sopralluogo', label: 'Sopralluogo' },
  { id: 'righe', label: 'Righe e totali' },
];

/** Testo della conferma per ognuna delle azioni che non si annullano. */
type Conferma = {
  azione: AzionePreventivo;
  titolo: string;
  descrizione: string;
  avviso?: string;
  label: string;
  variante?: 'normale' | 'pericolo';
};

/**
 * La scheda di un preventivo. docs/DESIGN_SYSTEM.md §6.12: breadcrumb, testata
 * con le azioni, jump-nav sticky, griglia 8/4.
 *
 * Tutto quello che si mostra passa da `statoEffettivo`: il campo salvato non
 * contiene mai «scaduto», e stamparlo grezzo qui vorrebbe dire una testata che
 * dice «Inviato» su un preventivo che l'elenco ha già messo fra gli scaduti.
 */
export default function PreventivoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const q = usePreventivo(id);
  const preventivo = q.data ?? null;
  const cliente = useCliente(preventivo?.clienteId);
  const azione = useAzionePreventivo();

  const [sezione, setSezione] = useState('dati');
  const [conferma, setConferma] = useState<Conferma | null>(null);
  const [convertendo, setConvertendo] = useState(false);

  const vaiA = (idSezione: string) => {
    document.getElementById(idSezione)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSezione(idSezione);
  };

  const esegui = async (c: Conferma) => {
    await azione.mutateAsync({ id: id!, azione: c.azione });
    setConferma(null);
    toast.success(`${preventivo?.numero}: ${c.label.toLowerCase()}`);
  };

  return (
    <div className="space-y-5 p-3">
      <DataState
        loading={q.isLoading}
        error={q.error}
        isEmpty={!q.isLoading && !preventivo}
        emptyState={
          <TableEmptyState
            icon={ClipboardText}
            title="Preventivo non trovato"
            description="Potrebbe essere stato eliminato, o il collegamento non è più valido."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/preventivi')}>
                Torna all'elenco
              </Button>
            }
          />
        }
        onRetry={q.refetch}
      >
        {preventivo && (
          <Contenuto
            preventivo={preventivo}
            nomeCliente={cliente.data?.denominazione ?? '—'}
            etichettaLuogo={
              cliente.data?.luoghiIntervento.find((l) => l.id === preventivo.luogoInterventoId)
                ?.etichetta ?? '—'
            }
            sezione={sezione}
            onSezione={vaiA}
            inCorso={azione.isPending}
            onConferma={setConferma}
            onInvia={async () => {
              await azione.mutateAsync({ id: preventivo.id, azione: 'invia' });
              toast.success(`${preventivo.numero} inviato al cliente`);
            }}
            onConverti={() => setConvertendo(true)}
            onApriCommessa={(commessaId) => navigate(`/commesse/${commessaId}`)}
          />
        )}
      </DataState>

      {conferma && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConferma(null)}
          title={conferma.titolo}
          description={conferma.descrizione}
          avviso={conferma.avviso}
          confermaLabel={conferma.label}
          variante={conferma.variante}
          inCorso={azione.isPending}
          onConferma={() => esegui(conferma)}
        />
      )}

      {preventivo && (
        <ConvertiInCommessaDialog
          open={convertendo}
          onOpenChange={setConvertendo}
          preventivo={preventivo}
          nomeCliente={cliente.data?.denominazione ?? '—'}
          onConvertito={(commessaId) => {
            setConvertendo(false);
            toast.success('Commessa creata dal preventivo');
            navigate(`/commesse/${commessaId}`);
          }}
        />
      )}
    </div>
  );
}

// ── Il corpo, separato per non annidare tutto dentro il DataState ────────────

interface ContenutoProps {
  preventivo: NonNullable<ReturnType<typeof usePreventivo>['data']>;
  nomeCliente: string;
  etichettaLuogo: string;
  sezione: string;
  onSezione: (id: string) => void;
  inCorso: boolean;
  onConferma: (c: Conferma) => void;
  onInvia: () => void;
  onConverti: () => void;
  onApriCommessa: (commessaId: string) => void;
}

function Contenuto({
  preventivo: p,
  nomeCliente,
  etichettaLuogo,
  sezione,
  onSezione,
  inCorso,
  onConferma,
  onInvia,
  onConverti,
  onApriCommessa,
}: ContenutoProps) {
  const stato = statoEffettivo(p);
  const { imponibile, iva, totale } = calcolaTotali(p.righe, p.aliquotaIva);
  const giorni = giorniAllaScadenza(p);

  return (
    <>
      <PageHeader
        breadcrumb={{ to: '/preventivi', label: 'Preventivi' }}
        eyebrow="Preventivo"
        title={p.numero}
        titleClassName="font-mono"
        subtitle={`${nomeCliente} · ${etichettaLuogo}`}
        meta={<StatoPreventivoBadge stato={stato} />}
        actions={
          <AzioniStato
            stato={stato}
            haCommessa={!!p.commessaId}
            inCorso={inCorso}
            onConferma={onConferma}
            onInvia={onInvia}
            onConverti={onConverti}
            onApriCommessa={() => p.commessaId && onApriCommessa(p.commessaId)}
          />
        }
      />

      {/* `!mt-2` non è un capriccio: dentro un flusso `space-y-*` il selettore
          ha specificità 0,3,0 e un `mt-2` normale viene semplicemente ignorato. */}
      <TabPills
        className="sticky top-2 z-10 !mt-2 backdrop-blur"
        items={SEZIONI}
        value={sezione}
        onChange={onSezione}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <SectionCard id="dati" title="Dati generali">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <VField icon={User} label="Cliente" value={nomeCliente} />
              <VField icon={MapPin} label="Luogo di intervento" value={etichettaLuogo} />
              <VField icon={Calendar} label="Emissione" value={formatData(p.dataEmissione)} />
              <VField icon={Calendar} label="Valido fino al" value={formatData(p.validoFino)} />
              <VField icon={Send} label="Inviato il" value={formatData(p.dataInvio)} />
              <VField icon={CheckCircle} label="Esito del" value={formatData(p.dataEsito)} />
            </div>
            {p.note && (
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <VField label="Note per il cliente" value={p.note} />
              </div>
            )}
          </SectionCard>

          <SectionCard id="sopralluogo" title="Scheda di sopralluogo">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <VField
                icon={Calendar}
                label="Data del sopralluogo"
                value={formatData(p.sopralluogo.dataSopralluogo)}
              />
              <VField
                label="Accessibilità"
                value={
                  <StatusPill accent={accessibilitaAccent(p.sopralluogo.accessibilita)}>
                    {accessibilitaLabel(p.sopralluogo.accessibilita)}
                  </StatusPill>
                }
              />
            </div>

            <div className="mt-5">
              <VField
                label="Criticità rilevate"
                value={
                  p.sopralluogo.criticita.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.sopralluogo.criticita.map((c) => (
                        <StatusPill key={c} accent={criticitaAccent(c)}>
                          {criticitaLabel(c)}
                        </StatusPill>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-white/30">Nessuna</span>
                  )
                }
              />
            </div>

            {p.sopralluogo.noteTecniche && (
              <div className="mt-5">
                <VField label="Note tecniche" value={p.sopralluogo.noteTecniche} />
              </div>
            )}

            <div className="mt-6 space-y-2">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                Alberi rilevati
              </h3>
              <TabellaAlberi alberi={p.sopralluogo.alberi} />
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                Foto
              </h3>
              <FotoGallery
                foto={p.sopralluogo.foto}
                messaggioVuoto="Nessuna foto di sopralluogo"
              />
            </div>
          </SectionCard>

          <SectionCard id="righe" title="Righe economiche">
            {p.righe.length === 0 ? (
              <TableEmptyState
                compact
                icon={ClipboardText}
                title="Nessuna riga"
                description="Il preventivo non ha ancora voci: il totale è zero finché non se ne aggiunge una."
              />
            ) : (
              <div className="space-y-4">
                <DarkTable tableClassName="min-w-[620px]">
                  <DarkTableHeader>
                    <DarkTableHead>Descrizione</DarkTableHead>
                    <DarkTableHead align="right">Q.tà</DarkTableHead>
                    <DarkTableHead>Unità</DarkTableHead>
                    <DarkTableHead align="right">Prezzo</DarkTableHead>
                    <DarkTableHead align="right">Importo</DarkTableHead>
                  </DarkTableHeader>
                  <DarkTableBody>
                    {p.righe.map((r, i) => (
                      <DarkTableRow key={r.id} zebraIndex={i}>
                        <DarkTableCell className="text-white">{r.descrizione}</DarkTableCell>
                        <DarkTableCell align="right" tabular className="text-white/70">
                          {formatNumber(r.quantita, r.quantita % 1 === 0 ? 0 : 2)}
                        </DarkTableCell>
                        <DarkTableCell className="text-white/55">
                          {unitaLabel(r.unita)}
                        </DarkTableCell>
                        <DarkTableCell align="right" tabular className="text-white/70">
                          {formatCurrency(r.prezzoUnitario)}
                        </DarkTableCell>
                        <DarkTableCell
                          align="right"
                          tabular
                          className={cn(
                            'whitespace-nowrap',
                            // Una riga negativa è uno sconto: si legge come tale,
                            // invece di sembrare un importo sbagliato.
                            r.importo < 0 ? 'text-emerald-300' : 'text-white',
                          )}
                        >
                          {formatCurrency(r.importo)}
                        </DarkTableCell>
                      </DarkTableRow>
                    ))}
                  </DarkTableBody>
                </DarkTable>

                <RiepilogoTotali
                  imponibile={imponibile}
                  iva={iva}
                  aliquotaIva={p.aliquotaIva}
                  totale={totale}
                />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5 lg:col-span-4">
          <SideCard title="Totale">
            <p className="text-2xl font-bold leading-none tabular-nums text-white">
              {formatCurrency(totale)}
            </p>
            <p className="mt-1.5 text-[11px] text-white/45">
              {formatCurrency(imponibile)} + IVA {p.aliquotaIva}%
            </p>
          </SideCard>

          <SideCard title="Validità">
            <div className="space-y-3">
              <VField label="Valido fino al" value={formatData(p.validoFino)} />
              {stato === 'inviato' && (
                <p
                  className={cn(
                    'text-[12px]',
                    giorni <= 7 ? 'text-amber-300' : 'text-white/45',
                  )}
                >
                  {giorni <= 0
                    ? 'Scade oggi.'
                    : `Mancano ${giorni} ${pluralize(giorni, 'giorno', 'giorni')}.`}
                </p>
              )}
              {stato === 'scaduto' && (
                <p className="text-[12px] text-amber-300">
                  Scaduto da {Math.abs(giorni)} {pluralize(giorni, 'giorno', 'giorni')}. Si può
                  riportare in bozza e rimandare con prezzi aggiornati.
                </p>
              )}
            </div>
          </SideCard>

          <SideCard title="Commessa">
            {p.commessaId ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => onApriCommessa(p.commessaId!)}
              >
                <Tree className="h-3.5 w-3.5" />
                Apri la commessa
              </Button>
            ) : (
              <p className="text-[12px] text-white/45">
                {stato === 'accettato'
                  ? 'Accettato ma non ancora convertito: la commessa si crea dalla testata.'
                  : 'La commessa si crea da un preventivo accettato.'}
              </p>
            )}
          </SideCard>
        </div>
      </div>
    </>
  );
}

/** Il rilievo in sola lettura. La versione editabile sta in `RilievoAlberiTable`. */
function TabellaAlberi({ alberi }: { alberi: RilievoAlbero[] }) {
  return (
    <DarkTable
      empty={alberi.length === 0}
      emptyIcon={TreeEvergreen}
      emptyMessage="Nessun albero rilevato"
      tableClassName="min-w-[580px]"
    >
      <DarkTableHeader>
        <DarkTableHead>Specie</DarkTableHead>
        <DarkTableHead align="right">Altezza</DarkTableHead>
        <DarkTableHead align="right">Ø fusto</DarkTableHead>
        <DarkTableHead align="right">Q.tà</DarkTableHead>
        <DarkTableHead>Lavorazione</DarkTableHead>
        <DarkTableHead>Note</DarkTableHead>
      </DarkTableHeader>
      <DarkTableBody>
        {alberi.map((a, i) => (
          <DarkTableRow key={a.id} zebraIndex={i}>
            <DarkTableCell className="text-white">{a.specie}</DarkTableCell>
            <DarkTableCell align="right" tabular className="text-white/70">
              {formatNumber(a.altezzaM, a.altezzaM % 1 === 0 ? 0 : 1)} m
            </DarkTableCell>
            <DarkTableCell align="right" tabular className="text-white/70">
              {formatNumber(a.diametroCm)} cm
            </DarkTableCell>
            <DarkTableCell align="right" tabular className="text-white/70">
              {formatNumber(a.quantita)}
            </DarkTableCell>
            <DarkTableCell className="text-white/70">
              {lavorazioneLabel(a.lavorazione)}
            </DarkTableCell>
            <DarkTableCell truncate="240px" className="text-white/55">
              {a.note || <span className="italic text-white/30">—</span>}
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}

// ── Azioni di testata ───────────────────────────────────────────────────────

/**
 * Quali azioni compaiono dipende dallo stato EFFETTIVO.
 *
 * «Scaduto» non ha un bottone che lo produce, e non è una dimenticanza: non è
 * uno stato che si sceglie. Ha però le stesse azioni di un inviato, perché un
 * cliente che risponde in ritardo esiste, e costringere a riportare in bozza
 * per registrare un sì sarebbe una bugia sull'ordine dei fatti.
 */
function AzioniStato({
  stato,
  haCommessa,
  inCorso,
  onConferma,
  onInvia,
  onConverti,
  onApriCommessa,
}: {
  stato: ReturnType<typeof statoEffettivo>;
  haCommessa: boolean;
  inCorso: boolean;
  onConferma: (c: Conferma) => void;
  onInvia: () => void;
  onConverti: () => void;
  onApriCommessa: () => void;
}) {
  const accetta: Conferma = {
    azione: 'accetta',
    titolo: 'Il cliente ha accettato?',
    descrizione: 'Il preventivo passa ad accettato e da lì si può creare la commessa.',
    label: 'Segna accettato',
  };

  const rifiuta: Conferma = {
    azione: 'rifiuta',
    titolo: 'Il cliente ha rifiutato?',
    descrizione: 'Il preventivo si chiude con esito negativo e resta in archivio.',
    label: 'Segna rifiutato',
    variante: 'pericolo',
  };

  const inBozza: Conferma = {
    azione: 'riportaInBozza',
    titolo: 'Riportare in bozza?',
    descrizione: 'Serve per correggere il preventivo e rimandarlo al cliente.',
    avviso: 'La data di invio e quella di esito vengono azzerate.',
    label: 'Riporta in bozza',
  };

  if (stato === 'bozza') {
    return (
      <Button variant="primary" size="md" disabled={inCorso} onClick={onInvia}>
        <Send className="h-4 w-4" />
        Invia al cliente
      </Button>
    );
  }

  if (stato === 'inviato' || stato === 'scaduto') {
    return (
      <>
        <Button variant="secondary" size="md" disabled={inCorso} onClick={() => onConferma(inBozza)}>
          Riporta in bozza
        </Button>
        <Button variant="danger" size="md" disabled={inCorso} onClick={() => onConferma(rifiuta)}>
          <XCircle className="h-4 w-4" />
          Rifiutato
        </Button>
        <Button variant="primary" size="md" disabled={inCorso} onClick={() => onConferma(accetta)}>
          <CheckCircle className="h-4 w-4" />
          Accettato
        </Button>
      </>
    );
  }

  if (stato === 'accettato') {
    return haCommessa ? (
      <Button variant="secondary" size="md" onClick={onApriCommessa}>
        <Tree className="h-4 w-4" />
        Vai alla commessa
      </Button>
    ) : (
      <Button variant="primary" size="md" disabled={inCorso} onClick={onConverti}>
        <Tree className="h-4 w-4" />
        Crea commessa
      </Button>
    );
  }

  // Rifiutato: resta solo la strada del ripensamento.
  return (
    <Button variant="secondary" size="md" disabled={inCorso} onClick={() => onConferma(inBozza)}>
      Riporta in bozza
    </Button>
  );
}
