import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DarkKpi } from '@/components/ui/dark-kpi';
import { DataState } from '@/components/ui/data-state';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { CheckCircle, Clock, Receipt, Wallet } from '@/components/ui/icons';
import { FattureFornitoreTable } from '@/components/costi/FattureFornitoreTable';
import { useScadenzarioFornitori } from '@/hooks/useFattureFornitore';
import { formatCurrency } from '@/lib/formatters';
import type { FatturaFornitore } from '@/types/fatturaFornitore';
import { giorniAllaScadenza, urgenzaScadenza } from '@/types/fatturaFornitore';

/**
 * Lo scadenzario passivo: cosa dobbiamo, e quanto è già in ritardo.
 *
 * È l'immagine speculare di `pages/fatture/Scadenzario.tsx`, e usa lo stesso
 * codice colore — scaduto in rosso, entro sette giorni in ambra, il resto
 * neutro. Due scadenzari nella stessa applicazione che si leggono in due modi
 * diversi sono peggio di averne uno solo.
 *
 * L'ordinamento è per scadenza crescente e non per importo: si paga in ordine
 * di scadenza, non di grandezza, e mettere in cima la fattura più grossa
 * inviterebbe a sbagliare priorità.
 */
export default function ScadenzarioFornitori() {
  const navigate = useNavigate();
  const q = useScadenzarioFornitori();

  const gruppi = useMemo(() => {
    const righe = q.data ?? [];
    const per = (u: ReturnType<typeof urgenzaScadenza>) =>
      righe.filter((f) => urgenzaScadenza(giorniAllaScadenza(f.dataScadenza)) === u);

    const somma = (r: FatturaFornitore[]) =>
      Math.round(r.reduce((t, f) => t + f.residuo, 0) * 100) / 100;

    const scadute = per('scaduto');
    const imminenti = per('imminente');
    const future = per('futuro');

    return {
      righe,
      scadute,
      imminenti,
      future,
      totaleDovuto: somma(righe),
      totaleScaduto: somma(scadute),
      totaleImminente: somma(imminenti),
    };
  }, [q.data]);

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/costi/fatture', label: 'Fatture fornitore' }}
        title="Scadenzario fornitori"
        subtitle="Cosa dobbiamo, in ordine di scadenza"
        actions={
          <Button variant="secondary" size="md" onClick={() => navigate('/costi/fatture')}>
            <Receipt className="h-4 w-4" />
            Tutte le fatture
          </Button>
        }
      />

      {/* Ogni tile ha il suo `loading`: sono tre numeri che arrivano insieme,
          ma la regola del design system è che una tile non aspetti le altre. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DarkKpi
          icon={Wallet}
          // Il totale dovuto è `danger` solo se c'è dello scaduto: altrimenti
          // è un numero normale, e colorarlo di rosso sempre insegnerebbe a
          // ignorare il rosso.
          accent={gruppi.totaleScaduto > 0 ? 'danger' : 'info'}
          label="Totale da pagare"
          valueFormatted={formatCurrency(gruppi.totaleDovuto, { interi: true })}
          loading={q.isLoading}
        />
        <DarkKpi
          icon={Clock}
          accent="danger"
          label={`Scaduto · ${gruppi.scadute.length}`}
          valueFormatted={formatCurrency(gruppi.totaleScaduto, { interi: true })}
          loading={q.isLoading}
        />
        <DarkKpi
          icon={Clock}
          accent="amber"
          label={`Entro 7 giorni · ${gruppi.imminenti.length}`}
          valueFormatted={formatCurrency(gruppi.totaleImminente, { interi: true })}
          loading={q.isLoading}
        />
      </div>

      <DataState
        loading={q.isLoading}
        error={q.error}
        isEmpty={!q.isLoading && gruppi.righe.length === 0}
        emptyState={
          <TableEmptyState
            icon={CheckCircle}
            title="Non c’è niente da pagare"
            description="Tutte le fatture ricevute risultano saldate. Le nuove compaiono qui appena vengono registrate."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/costi/fatture')}>
                Vai alle fatture
              </Button>
            }
          />
        }
        onRetry={q.refetch}
      >
        <div className="space-y-5">
          <Sezione
            titolo="Scadute"
            sottotitolo="Da pagare subito: il ritardo è già maturato."
            fatture={gruppi.scadute}
            onApri={(id) => navigate(`/costi/fatture/${id}`)}
          />
          <Sezione
            titolo="In scadenza entro 7 giorni"
            sottotitolo="È il momento di disporre i pagamenti."
            fatture={gruppi.imminenti}
            onApri={(id) => navigate(`/costi/fatture/${id}`)}
          />
          <Sezione
            titolo="Più avanti"
            sottotitolo="Da tenere d’occhio, senza fretta."
            fatture={gruppi.future}
            onApri={(id) => navigate(`/costi/fatture/${id}`)}
          />
        </div>
      </DataState>
    </div>
  );
}

/**
 * Una fascia dello scadenzario.
 *
 * Le fasce vuote non si mostrano: una sezione «Scadute» vuota ma presente
 * occupa spazio per dire che non c'è niente, e su tre fasce su tre riduce a
 * un terzo lo spazio di quelle che invece hanno righe.
 */
function Sezione({
  titolo,
  sottotitolo,
  fatture,
  onApri,
}: {
  titolo: string;
  sottotitolo: string;
  fatture: FatturaFornitore[];
  onApri: (id: string) => void;
}) {
  if (fatture.length === 0) return null;

  const totale = Math.round(fatture.reduce((t, f) => t + f.residuo, 0) * 100) / 100;

  return (
    <section className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">{titolo}</h2>
          <p className="mt-0.5 text-[12px] text-white/40">{sottotitolo}</p>
        </div>
        <p className="text-[12px] tabular-nums text-white/45">
          <span className="font-semibold text-white/70">{formatCurrency(totale)}</span> su{' '}
          {fatture.length}
        </p>
      </div>

      <FattureFornitoreTable fatture={fatture} onApri={onApri} />
    </section>
  );
}
