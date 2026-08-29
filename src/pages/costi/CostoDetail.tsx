import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Edit, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DataState } from '@/components/ui/data-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CategoriaCostoBadge } from '@/components/costi/CategoriaCostoBadge';
import { CostoDrawer } from '@/components/costi/CostoDrawer';
import { useCosto, useEliminaCosto } from '@/hooks/useCosti';
import { tipoNoleggioLabel } from '@/types/costo';
import { formatCurrency, formatData, formatNumber } from '@/lib/formatters';

/**
 * Dettaglio di un costo.
 *
 * Pagina e non solo drawer: un costo si apre da un link (dalla scheda del
 * fornitore, un domani dal report di marginalità), e un drawer non ha un
 * indirizzo da mandare a qualcuno.
 */
export default function CostoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useCosto(id);
  const elimina = useEliminaCosto();
  const [modifica, setModifica] = useState(false);
  const [daEliminare, setDaEliminare] = useState(false);

  const costo = query.data;

  return (
    <div className="space-y-5 p-3">
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.isLoading && !costo}
        onRetry={() => query.refetch()}
      >
        {costo && (
          <>
            <PageHeader
              breadcrumb={{ to: '/costi', label: 'Costi' }}
              title={costo.descrizione}
              subtitle={formatData(costo.data)}
              meta={<CategoriaCostoBadge categoria={costo.categoria} />}
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
                  <h2 className="mb-5 text-base font-semibold text-white">Dati del costo</h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Campo label="Data" valore={formatData(costo.data)} />
                    <Campo label="Documento" valore={costo.documento} mono />
                    <Campo label="Fornitore" valore={costo.fornitoreDenominazione} />
                    <Campo
                      label="Mezzo"
                      valore={costo.mezzoTarga ? `${costo.mezzoTarga} · ${costo.mezzoDescrizione}` : undefined}
                    />
                    {costo.tipoNoleggio && (
                      <Campo label="Noleggio" valore={tipoNoleggioLabel(costo.tipoNoleggio)} />
                    )}
                    {costo.litri != null && (
                      <Campo label="Litri" valore={`${formatNumber(costo.litri, 1)} l`} />
                    )}
                  </div>

                  {costo.note && (
                    <div className="mt-5 border-t border-white/[0.06] pt-5">
                      <div className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
                        Note
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{costo.note}</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-5 lg:col-span-4">
                <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
                  <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                    Importo
                  </h3>
                  <p className="text-2xl font-bold leading-none tabular-nums text-white">
                    {formatCurrency(costo.importo)}
                  </p>
                  <p className="mt-2 text-[11px] text-white/40">
                    Imponibile. L'IVA sugli acquisti si detrae e non è un costo: non si
                    registra e non entra nei riepiloghi.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/[0.06] bg-[#111111] p-5">
                  <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
                    Imputazione
                  </h3>
                  {costo.commessaId ? (
                    <div className="space-y-1">
                      <p className="text-[13px] text-white">Imputato a una commessa</p>
                      <Link
                        to={`/commesse/${costo.commessaId}`}
                        className="text-[13px] text-[#7eb0ff] transition-colors hover:text-white"
                      >
                        Apri la commessa
                      </Link>
                    </div>
                  ) : (
                    <p className="text-[13px] text-white/55">
                      Costo generale, non legato a un singolo lavoro.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <CostoDrawer open={modifica} onOpenChange={setModifica} costo={costo} />

            <ConfirmDialog
              open={daEliminare}
              onOpenChange={setDaEliminare}
              title="Eliminare il costo?"
              description={`«${costo.descrizione}» sparirà dall'elenco e dai riepiloghi.`}
              avviso="Questa azione non si può annullare."
              confermaLabel="Elimina"
              variante="pericolo"
              inCorso={elimina.isPending}
              onConferma={() =>
                elimina.mutate(costo.id, {
                  onSuccess: () => {
                    toast.success('Costo eliminato');
                    navigate('/costi');
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

function Campo({ label, valore, mono }: { label: string; valore?: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">{label}</div>
      <div className={`text-[13px] text-white ${mono ? 'font-mono' : ''}`}>
        {valore || <span className="font-sans italic text-white/30">—</span>}
      </div>
    </div>
  );
}
