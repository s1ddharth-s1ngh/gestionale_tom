import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TablePagination } from '@/components/ui/pagination';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { FattureFornitoreTable } from '@/components/costi/FattureFornitoreTable';
import { useConteggiFattureFornitore, useFattureFornitore } from '@/hooks/useFattureFornitore';
import { useDebounce } from '@/hooks/useDebounce';
import {
  STATI_FATTURA_FORNITORE,
  statoFatturaFornitoreLabel,
  type StatoFatturaFornitoreEffettivo,
} from '@/types/fatturaFornitore';
import { formatCurrency } from '@/lib/formatters';

const PER_PAGINA = 20;

type FiltroStato = StatoFatturaFornitoreEffettivo | 'tutte';

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/**
 * Le fatture ricevute dai fornitori.
 *
 * Il ciclo passivo visto dall'elenco: cosa è arrivato, cosa resta da pagare e
 * cosa è già diventato costo. La colonna «Costi» è quella che vale la pena
 * guardare — una fattura registrata con zero costi generati è spesa che non è
 * finita in nessun riepilogo, e senza questa colonna non se ne accorge nessuno
 * fino a fine anno.
 */
export default function FattureFornitoreList() {
  const navigate = useNavigate();
  const [stato, setStato] = useState<FiltroStato>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [pagina, setPagina] = useState(1);

  const ricercaDebounced = useDebounce(ricerca);

  // Cambiare filtro restando a pagina 4 mostra una lista vuota che sembra un bug.
  useEffect(() => {
    setPagina(1);
  }, [stato, ricercaDebounced]);

  const filtriRicerca = useMemo(
    () => ({ q: ricercaDebounced.trim() || undefined }),
    [ricercaDebounced],
  );

  const elenco = useFattureFornitore({
    ...filtriRicerca,
    stato: stato === 'tutte' ? undefined : stato,
    pagina,
    perPagina: PER_PAGINA,
  });
  // I contatori seguono la ricerca ma non lo stato: devono dire quante ce ne
  // sono in ciascuno stato *dentro* quello che si sta cercando.
  const conteggi = useConteggiFattureFornitore(filtriRicerca);

  const righe = elenco.data?.righe ?? [];
  const totale = elenco.data?.totale ?? 0;
  const filtriAttivi = stato !== 'tutte' || ricercaDebounced.trim().length > 0;

  const tutte = useMemo(
    () => Object.values(conteggi.data ?? {}).reduce((t, n) => t + n, 0),
    [conteggi.data],
  );

  // Il residuo della pagina, non dell'archivio: dirlo è più onesto che
  // lasciare intendere che sia il debito totale.
  const residuoPagina = useMemo(
    () => righe.reduce((t, f) => t + f.residuo, 0),
    [righe],
  );

  const pills: TabPillItem<FiltroStato>[] = [
    { id: 'tutte', label: 'Tutte', count: tutte },
    ...STATI_FATTURA_FORNITORE.map((s) => ({
      id: s,
      label: statoFatturaFornitoreLabel(s),
      count: conteggi.data?.[s],
    })),
  ];

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/costi', label: 'Costi' }}
        title="Fatture fornitore"
        subtitle="Quello che riceviamo, e quello che resta da pagare"
        meta={
          <span className="text-[12px] text-white/45">
            Residuo in pagina:{' '}
            <span className="font-medium tabular-nums text-white/70">
              {formatCurrency(residuoPagina)}
            </span>
          </span>
        }
      />

      <div className="!mt-2 flex flex-wrap items-center justify-between gap-2">
        <TabPills items={pills} value={stato} onChange={setStato} />

        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchAdornment
              busy={elenco.isFetching && !elenco.isLoading}
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <Input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca numero, fornitore, note…"
              className={`${INPUT_CLS} w-[260px] pl-9`}
            />
          </div>

          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
            <span className="font-medium text-white/70">{totale}</span> di {tutte} fatture
          </span>

          <Button variant="secondary" size="sm" onClick={() => navigate('/costi/fornitori')}>
            Fornitori
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/costi/fatture/nuova')}>
            <Plus className="h-3.5 w-3.5" />
            Nuova fattura
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <FattureFornitoreTable
          fatture={righe}
          loading={elenco.isLoading}
          filtriAttivi={filtriAttivi}
          onApri={(id) => navigate(`/costi/fatture/${id}`)}
          azioneVuoto={
            <Button variant="primary" size="sm" onClick={() => navigate('/costi/fatture/nuova')}>
              <Plus className="h-3.5 w-3.5" />
              Registra la prima fattura
            </Button>
          }
        />

        <TablePagination
          paginaCorrente={pagina}
          paginePerTotale={Math.max(1, Math.ceil(totale / PER_PAGINA))}
          elementiTotali={totale}
          elementiPerPagina={PER_PAGINA}
          onCambiaPagina={setPagina}
          nomeElementi="fatture"
        />
      </div>
    </div>
  );
}
