import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TablePagination } from '@/components/ui/pagination';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { FornitoriTable } from '@/components/costi/FornitoriTable';
import { FornitoreDrawer } from '@/components/costi/FornitoreDrawer';
import { useFornitori } from '@/hooks/useFornitori';
import { useDebounce } from '@/hooks/useDebounce';
import { CATEGORIE_COSTO, categoriaCostoLabel, type CategoriaCosto } from '@/types/costo';

const PER_PAGINA = 20;

type FiltroCategoria = CategoriaCosto | 'tutte';

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/**
 * Elenco dei fornitori, ordinato dal più caro.
 *
 * Non alfabetico: chi apre questa pagina vuole sapere dove vanno i soldi, e
 * un elenco alfabetico costringe a leggere tutta la colonna «speso» per
 * scoprire quello che l'ordinamento poteva dire da solo.
 */
export default function FornitoriList() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<FiltroCategoria>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [drawerAperto, setDrawerAperto] = useState(false);

  const ricercaDebounced = useDebounce(ricerca);

  useEffect(() => {
    setPagina(1);
  }, [categoria, ricercaDebounced]);

  const elenco = useFornitori({
    categoria: categoria === 'tutte' ? undefined : categoria,
    q: ricercaDebounced.trim() || undefined,
    pagina,
    perPagina: PER_PAGINA,
  });

  const righe = elenco.data?.righe ?? [];
  const totale = elenco.data?.totale ?? 0;
  const filtriAttivi = categoria !== 'tutte' || ricercaDebounced.trim().length > 0;

  const categorie: TabPillItem<FiltroCategoria>[] = [
    { id: 'tutte', label: 'Tutte' },
    ...CATEGORIE_COSTO.map((c) => ({ id: c, label: categoriaCostoLabel(c) })),
  ];

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/costi', label: 'Costi' }}
        title="Fornitori"
        subtitle="Da chi si compra, e quanto"
      />

      <div className="!mt-2 flex flex-wrap items-center justify-between gap-2">
        <TabPills items={categorie} value={categoria} onChange={setCategoria} />

        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchAdornment
              busy={elenco.isFetching && !elenco.isLoading}
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <Input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca nome, P. IVA, note…"
              className={`${INPUT_CLS} w-[260px] pl-9`}
            />
          </div>

          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
            <span className="font-medium text-white/70">{totale}</span> fornitori
          </span>

          <Button variant="primary" size="sm" onClick={() => setDrawerAperto(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nuovo fornitore
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <FornitoriTable
          fornitori={righe}
          loading={elenco.isLoading}
          filtriAttivi={filtriAttivi}
          onApri={(id) => navigate(`/costi/fornitori/${id}`)}
          azioneVuoto={
            <Button variant="primary" size="sm" onClick={() => setDrawerAperto(true)}>
              <Plus className="h-3.5 w-3.5" />
              Aggiungi il primo fornitore
            </Button>
          }
        />

        <TablePagination
          paginaCorrente={pagina}
          paginePerTotale={Math.max(1, Math.ceil(totale / PER_PAGINA))}
          elementiTotali={totale}
          elementiPerPagina={PER_PAGINA}
          onCambiaPagina={setPagina}
          nomeElementi="fornitori"
        />
      </div>

      <FornitoreDrawer open={drawerAperto} onOpenChange={setDrawerAperto} />
    </div>
  );
}
