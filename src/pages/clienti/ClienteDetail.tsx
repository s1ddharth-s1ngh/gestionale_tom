import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, Mail, Phone, Hash, Bank, Buildings, FileText, Tree, Receipt,
  MapPin, Trash2, Edit, Plus,
} from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard, SideCard } from '@/components/ui/dark-section';
import { TabPills } from '@/components/ui/tab-pills';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineEditField } from '@/components/ui/inline-edit';
import { VField } from '@/components/ui/form-field';
import { IndirizzoCard } from '@/components/shared/IndirizzoCard';
import { LuoghiIntervento } from '@/components/clienti/LuoghiIntervento';
import { TipoClienteBadge } from '@/components/clienti/TipoClienteBadge';
import { useAggiornaCliente, useCliente, useEliminaCliente } from '@/hooks/useClienti';
import { usePreventiviPerCliente } from '@/hooks/usePreventivi';
import { useCommessePerCliente } from '@/hooks/useCommesse';
import { useFatturePerCliente } from '@/hooks/useFatture';
import { statoEffettivo, statoPreventivoAccent, statoPreventivoLabel } from '@/types/preventivo';
import { statoCommessaAccent, statoCommessaLabel } from '@/types/commessa';
import { calcolaStatoFattura, statoFatturaAccent, statoFatturaLabel } from '@/types/fattura';
import type { ClienteInput } from '@/types/cliente';
import type { LucideIcon } from '@/components/ui/icons';
import { formatCurrency, formatData } from '@/lib/formatters';

/**
 * Scheda cliente.
 *
 * È il pattern di dettaglio del progetto: breadcrumb, testata con le azioni,
 * jump-nav sticky, griglia 8/4. La modifica è **inline al clic** sul campo —
 * niente drawer «modifica», niente modalità edit sulla pagina intera: si tocca
 * il dato che si vuole cambiare e basta.
 *
 * Lo storico non è un campo del cliente: sono tre query sui suoi preventivi,
 * commesse e fatture. Per questo le tre sezioni esistono da subito col loro
 * stato vuoto, e si riempiono da sole man mano che gli altri moduli scrivono.
 */

const SEZIONI = [
  { id: 'anagrafica', label: 'Anagrafica' },
  { id: 'luoghi', label: 'Luoghi' },
  { id: 'preventivi', label: 'Preventivi' },
  { id: 'commesse', label: 'Commesse' },
  { id: 'fatture', label: 'Fatture' },
];

/** Riga di storico: numero, data, stato, importo. La stessa forma per i tre. */
function RigaStorico({
  to,
  numero,
  data,
  stato,
  importo,
}: {
  to: string;
  numero: string;
  data?: string;
  stato: React.ReactNode;
  importo?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      <span className="font-mono text-[12px] text-white">{numero}</span>
      <span className="text-[11px] text-white/40">{formatData(data)}</span>
      <span className="ml-auto flex items-center gap-3">
        {importo != null && (
          <span className="text-[12px] tabular-nums text-white/70">{formatCurrency(importo)}</span>
        )}
        {stato}
      </span>
    </Link>
  );
}

function SezioneStorico({
  id,
  titolo,
  icona,
  caricamento,
  vuoto,
  azione,
  children,
}: {
  id: string;
  titolo: string;
  icona: LucideIcon;
  caricamento: boolean;
  vuoto: boolean;
  azione?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SectionCard id={id} title={titolo} action={azione}>
      {caricamento ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : vuoto ? (
        <TableEmptyState compact icon={icona} title={`Nessun ${titolo.toLowerCase().slice(0, -1)}`} />
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </SectionCard>
  );
}

export default function ClienteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sezione, setSezione] = useState('anagrafica');
  const [daEliminare, setDaEliminare] = useState(false);

  const { data: cliente, isLoading, error } = useCliente(id);
  const aggiorna = useAggiornaCliente();
  const elimina = useEliminaCliente();

  const preventivi = usePreventiviPerCliente(id);
  const commesse = useCommessePerCliente(id);
  const fatture = useFatturePerCliente(id);

  /** Un campo modificato inline. L'errore lo rilancia: InlineEditField lo usa
   *  per rimettere il valore vecchio invece di lasciare a schermo una modifica
   *  che il database non ha accettato. */
  const salvaCampo = async (patch: Partial<ClienteInput>) => {
    if (!id) return;
    try {
      await aggiorna.mutateAsync({ id, patch });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Modifica non salvata');
      throw e;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 p-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="p-3">
        <TableEmptyState
          icon={Users}
          title="Cliente non trovato"
          description="L'indirizzo non corrisponde a nessun cliente in archivio. Può essere stato eliminato."
          action={<Button onClick={() => navigate('/clienti')}>Torna all’elenco</Button>}
        />
      </div>
    );
  }

  const totaleFatturato = (fatture.data ?? []).reduce((s, f) => s + (f.totale ?? 0), 0);

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/clienti', label: 'Clienti' }}
        title={cliente.denominazione}
        subtitle="Anagrafica, luoghi di intervento e storico dei lavori"
        titleClassName="truncate"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <TipoClienteBadge tipo={cliente.tipo} />
            {cliente.luoghiIntervento.length > 0 && (
              <StatusPill icon={MapPin}>
                {cliente.luoghiIntervento.length}{' '}
                {cliente.luoghiIntervento.length === 1 ? 'luogo' : 'luoghi'}
              </StatusPill>
            )}
          </div>
        }
        actions={
          <>
            {/* Dice come si modifica, perché un campo che si edita al clic non
                lo si scopre da soli: senza questa riga si cerca un bottone
                «Modifica» che non c'è. */}
            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/45 sm:inline-flex">
              <Edit className="h-3 w-3" />
              Clicca un campo per modificarlo
            </span>
            <Button variant="primary" onClick={() => navigate('/preventivi/nuovo')}>
              <Plus className="h-3.5 w-3.5" />
              Nuovo preventivo
            </Button>
            <Button variant="ghost" size="icon" title="Elimina" onClick={() => setDaEliminare(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      />

      <TabPills
        className="sticky top-2 z-10 backdrop-blur !mt-2"
        value={sezione}
        onChange={(s) => {
          document.getElementById(s)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setSezione(s);
        }}
        items={SEZIONI}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── Colonna principale ─────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-8">
          <SectionCard id="anagrafica" title="Anagrafica">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <VField
                icon={Users}
                label="Denominazione"
                value={
                  <InlineEditField
                    value={cliente.denominazione}
                    onCommit={(v) => salvaCampo({ denominazione: v })}
                    placeholder="Denominazione"
                  />
                }
              />
              <VField
                icon={Hash}
                label="Codice fiscale"
                value={
                  <InlineEditField
                    value={cliente.codiceFiscale ?? ''}
                    onCommit={(v) => salvaCampo({ codiceFiscale: v })}
                    normalizza={(v) => v.toUpperCase()}
                    inputClassName="font-mono"
                  />
                }
                mono
              />
              <VField
                icon={Bank}
                label="Partita IVA"
                value={
                  <InlineEditField
                    value={cliente.partitaIva ?? ''}
                    onCommit={(v) => salvaCampo({ partitaIva: v })}
                    inputClassName="font-mono"
                  />
                }
                mono
              />
              <VField
                icon={Buildings}
                label="Codice destinatario"
                value={
                  <InlineEditField
                    value={cliente.codiceDestinatario ?? ''}
                    onCommit={(v) => salvaCampo({ codiceDestinatario: v })}
                    normalizza={(v) => v.toUpperCase()}
                    inputClassName="font-mono"
                  />
                }
                mono
              />
              <VField
                icon={Phone}
                label="Telefono"
                value={
                  <InlineEditField
                    value={cliente.telefono ?? ''}
                    onCommit={(v) => salvaCampo({ telefono: v })}
                  />
                }
              />
              <VField
                icon={Mail}
                label="Email"
                value={
                  <InlineEditField
                    value={cliente.email ?? ''}
                    onCommit={(v) => salvaCampo({ email: v })}
                  />
                }
              />
              <VField
                icon={Mail}
                label="PEC"
                value={
                  <InlineEditField
                    value={cliente.pec ?? ''}
                    onCommit={(v) => salvaCampo({ pec: v })}
                  />
                }
              />
            </div>

            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <VField
                label="Note interne"
                value={
                  <InlineEditField
                    multiline
                    value={cliente.note ?? ''}
                    onCommit={(v) => salvaCampo({ note: v })}
                    placeholder="Orari preferiti, accordi, cose da ricordare prima di chiamare…"
                  />
                }
              />
            </div>
          </SectionCard>

          <LuoghiIntervento clienteId={cliente.id} luoghi={cliente.luoghiIntervento} />

          <SezioneStorico
            id="preventivi"
            titolo="Preventivi"
            icona={FileText}
            caricamento={preventivi.isLoading}
            vuoto={(preventivi.data ?? []).length === 0}
          >
            {(preventivi.data ?? []).map((p) => {
              const s = statoEffettivo(p);
              return (
                <RigaStorico
                  key={p.id}
                  to={`/preventivi/${p.id}`}
                  numero={p.numero}
                  data={p.dataEmissione}
                  importo={p.totale}
                  stato={
                    <StatusPill variant="dot" accent={statoPreventivoAccent(s)}>
                      {statoPreventivoLabel(s)}
                    </StatusPill>
                  }
                />
              );
            })}
          </SezioneStorico>

          <SezioneStorico
            id="commesse"
            titolo="Commesse"
            icona={Tree}
            caricamento={commesse.isLoading}
            vuoto={(commesse.data ?? []).length === 0}
          >
            {(commesse.data ?? []).map((c) => (
              <RigaStorico
                key={c.id}
                to={`/commesse/${c.id}`}
                numero={c.numero}
                data={c.dataPianificata ?? c.dataInizio}
                stato={
                  <StatusPill variant="dot" accent={statoCommessaAccent(c.stato)}>
                    {statoCommessaLabel(c.stato)}
                  </StatusPill>
                }
              />
            ))}
          </SezioneStorico>

          <SezioneStorico
            id="fatture"
            titolo="Fatture"
            icona={Receipt}
            caricamento={fatture.isLoading}
            vuoto={(fatture.data ?? []).length === 0}
          >
            {(fatture.data ?? []).map((f) => {
              const s = calcolaStatoFattura(f);
              return (
                <RigaStorico
                  key={f.id}
                  to={`/fatture/${f.id}`}
                  numero={f.numero}
                  data={f.dataEmissione}
                  importo={f.totale}
                  stato={
                    <StatusPill variant="dot" accent={statoFatturaAccent(s)}>
                      {statoFatturaLabel(s)}
                    </StatusPill>
                  }
                />
              );
            })}
          </SezioneStorico>
        </div>

        {/* ── Colonna laterale ───────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-4">
          <SideCard title="In sintesi">
            <dl className="space-y-3">
              {[
                ['Preventivi', (preventivi.data ?? []).length],
                ['Commesse', (commesse.data ?? []).length],
                ['Fatture', (fatture.data ?? []).length],
              ].map(([etichetta, valore]) => (
                <div key={etichetta as string} className="flex items-baseline justify-between">
                  <dt className="text-[12px] text-white/45">{etichetta}</dt>
                  <dd className="text-[15px] font-semibold tabular-nums text-white">{valore}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                <dt className="text-[12px] text-white/45">Fatturato</dt>
                <dd className="text-[15px] font-semibold tabular-nums text-white">
                  {formatCurrency(totaleFatturato, { interi: true })}
                </dd>
              </div>
            </dl>
          </SideCard>

          {cliente.referente && (
            <SideCard title={cliente.tipo === 'condominio' ? 'Amministratore' : 'Referente'}>
              <div className="space-y-2">
                <p className="text-[13px] text-white">{cliente.referente.nome}</p>
                {cliente.referente.ruolo && (
                  <p className="text-[11px] text-white/40">{cliente.referente.ruolo}</p>
                )}
                {cliente.referente.telefono && (
                  <p className="flex items-center gap-1.5 text-[12px] text-white/70">
                    <Phone className="h-3 w-3 text-white/30" />
                    {cliente.referente.telefono}
                  </p>
                )}
                {cliente.referente.email && (
                  <p className="flex items-center gap-1.5 truncate text-[12px] text-white/70">
                    <Mail className="h-3 w-3 shrink-0 text-white/30" />
                    <span className="truncate">{cliente.referente.email}</span>
                  </p>
                )}
              </div>
            </SideCard>
          )}

          <IndirizzoCard
            etichetta="Indirizzo di fatturazione"
            indirizzo={cliente.indirizzoFatturazione}
          />
        </div>
      </div>

      <ConfirmDialog
        open={daEliminare}
        onOpenChange={setDaEliminare}
        title="Eliminare questo cliente?"
        description={<>«{cliente.denominazione}» non comparirà più nell’elenco.</>}
        avviso={
          (preventivi.data ?? []).length + (commesse.data ?? []).length + (fatture.data ?? []).length >
          0
            ? `Ha ${(preventivi.data ?? []).length} preventivi, ${(commesse.data ?? []).length} commesse e ${(fatture.data ?? []).length} fatture: restano in archivio e continuano a citarlo, ma non si potrà più aprirne di nuovi.`
            : undefined
        }
        confermaLabel="Elimina"
        variante="pericolo"
        inCorso={elimina.isPending}
        onConferma={async () => {
          try {
            await elimina.mutateAsync(cliente.id);
            toast.success('Cliente eliminato');
            navigate('/clienti');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Non è stato possibile eliminare');
          }
        }}
      />
    </div>
  );
}
