import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Edit, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DataState } from '@/components/ui/data-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IndirizzoCard } from '@/components/shared/IndirizzoCard';
import { CategoriaCostoBadge } from '@/components/costi/CategoriaCostoBadge';
import { CostiTable } from '@/components/costi/CostiTable';
import { FornitoreDrawer } from '@/components/costi/FornitoreDrawer';
import { useCostiPerFornitore } from '@/hooks/useCosti';
import { useEliminaFornitore, useFornitore } from '@/hooks/useFornitori';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';

/**
 * Scheda del fornitore: contatti e tutto quello che ci si è comprato.
 *
 * L'elenco dei costi è la ragione per cui questa pagina esiste — l'anagrafica
 * da sola starebbe in una riga di tabella. Riusa `CostiTable`, così le due
 * schermate non divergono al primo cambio di colonna.
 */
export default function FornitoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useFornitore(id);
  const costi = useCostiPerFornitore(id);
  const elimina = useEliminaFornitore();

  const [modifica, setModifica] = useState(false);
  const [daEliminare, setDaEliminare] = useState(false);

  const fornitore = query.data;

  return (
    <div className="space-y-5 p-3">
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && !fornitore}
        onRetry={() => query.refetch()}
      >
        {fornitore && (
          <>
            <PageHeader
              breadcrumb={{ to: '/costi/fornitori', label: 'Fornitori' }}
              title={fornitore.denominazione}
              subtitle={fornitore.partitaIva ? `P. IVA ${fornitore.partitaIva}` : 'Senza partita IVA registrata'}
              meta={
                fornitore.categoriaPrevalente ? (
                  <CategoriaCostoBadge categoria={fornitore.categoriaPrevalente} />
                ) : undefined
              }
              actions={
                <>
                  <Button variant="secondary" size="md" onClick={() => setModifica(true)}>
                    <Edit className="h-3.5 w-3.5" />
                    Modifica
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => setDaEliminare(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </Button>
                </>
              }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <section className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-white">Costi</h2>
                    <span className="text-[11px] tabular-nums text-white/40">
                      {fornitore.numeroCosti} registrazioni
                    </span>
                  </div>

                  <CostiTable
                    costi={costi.data ?? []}
                    loading={costi.isLoading}
                    onApri={(costoId) => navigate(`/costi/${costoId}`)}
                  />
                </section>
              </div>

              <div className="space-y-5 lg:col-span-4">
                <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
                  <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                    Speso in totale
                  </h3>
                  <p className="text-2xl font-bold leading-none tabular-nums text-white">
                    {formatCurrency(fornitore.totaleSpeso, { interi: true })}
                  </p>
                  <p className="mt-2 text-[11px] text-white/40">
                    {fornitore.ultimoCosto
                      ? `Ultimo costo il ${formatDataBreve(fornitore.ultimoCosto)}`
                      : 'Nessun costo registrato da questo fornitore'}
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
                  <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                    Contatti
                  </h3>
                  <dl className="space-y-2.5">
                    <Voce label="Telefono" valore={fornitore.telefono} />
                    <Voce label="Email" valore={fornitore.email} />
                  </dl>
                </div>

                {fornitore.indirizzo && (
                  <IndirizzoCard etichetta="Sede" indirizzo={fornitore.indirizzo} />
                )}

                {fornitore.note && (
                  <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
                    <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                      Note
                    </h3>
                    <p className="text-[13px] leading-relaxed text-white/70">{fornitore.note}</p>
                  </div>
                )}
              </div>
            </div>

            <FornitoreDrawer open={modifica} onOpenChange={setModifica} fornitore={fornitore} />

            <ConfirmDialog
              open={daEliminare}
              onOpenChange={setDaEliminare}
              title="Eliminare il fornitore?"
              description={`${fornitore.denominazione} sparirà dall'anagrafica.`}
              avviso={
                fornitore.numeroCosti > 0
                  ? `I ${fornitore.numeroCosti} costi registrati restano, ma perdono il riferimento al fornitore.`
                  : undefined
              }
              confermaLabel="Elimina"
              variante="pericolo"
              inCorso={elimina.isPending}
              onConferma={() =>
                elimina.mutate(fornitore.id, {
                  onSuccess: () => {
                    toast.success('Fornitore eliminato');
                    navigate('/costi/fornitori');
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

function Voce({ label, valore }: { label: string; valore?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">{label}</dt>
      <dd className="text-[13px] text-white">
        {valore || <span className="italic text-white/30">—</span>}
      </dd>
    </div>
  );
}
