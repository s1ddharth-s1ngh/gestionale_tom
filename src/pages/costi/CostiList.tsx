import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TablePagination } from '@/components/ui/pagination';
import { CostiTable } from '@/components/costi/CostiTable';
import { CostiToolbar, intervalloDa, type FiltroCategoria, type Periodo } from '@/components/costi/CostiToolbar';
import { CostoDrawer } from '@/components/costi/CostoDrawer';
import { CostiPerCategoria } from '@/components/costi/CostiPerCategoria';
import { CostiPerMezzo } from '@/components/costi/CostiPerMezzo';
import { useConteggiCosti, useCosti } from '@/hooks/useCosti';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/formatters';

const PER_PAGINA = 20;

/**
 * Elenco dei costi, con i due riepiloghi sotto.
 *
 * I riepiloghi ricevono gli stessi filtri della tabella: se mostrassero
 * sempre tutto lo storico, cambiare periodo lascerebbe le barre ferme e chi
 * guarda concluderebbe che il filtro non funziona.
 */
export default function CostiList() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<FiltroCategoria>('tutte');
  const [periodo, setPeriodo] = useState<Periodo>('trimestre');
  const [ricerca, setRicerca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [drawerAperto, setDrawerAperto] = useState(false);

  const ricercaDebounced = useDebounce(ricerca);

  useEffect(() => {
    setPagina(1);
  }, [categoria, periodo, ricercaDebounced]);

  /** I filtri senza paginazione: sono quelli che vanno anche ai riepiloghi. */
  const filtriBase = useMemo(
    () => ({
      categoria: categoria === 'tutte' ? undefined : categoria,
      q: ricercaDebounced.trim() || undefined,
      ...intervalloDa(periodo),
    }),
    [categoria, periodo, ricercaDebounced],
  );

  const elenco = useCosti({ ...filtriBase, pagina, perPagina: PER_PAGINA });
  const conteggi = useConteggiCosti();

  const righe = elenco.data?.righe ?? [];
  const totaleFiltrato = elenco.data?.totale ?? 0;
  const filtriAttivi = categoria !== 'tutte' || ricercaDebounced.trim().length > 0 || periodo !== 'sempre';

  // La spesa del periodo si somma sulle righe filtrate, non sulla pagina:
  // «€ 2.100 su questa pagina» non è un numero che qualcuno voglia leggere.
  const speso = useMemo(() => righe.reduce((t, c) => t + c.importo, 0), [righe]);

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        title="Costi"
        subtitle="Carburante per mezzo, materiali, noleggi, smaltimenti"
        meta={
          <span className="text-[12px] text-white/45">
            In pagina:{' '}
            <span className="font-medium tabular-nums text-white/70">{formatCurrency(speso)}</span>
          </span>
        }
      />

      <div className="!mt-2">
        <CostiToolbar
          categoria={categoria}
          onCategoriaChange={setCategoria}
          conteggi={conteggi.data}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          ricerca={ricerca}
          onRicercaChange={setRicerca}
          caricando={elenco.isFetching && !elenco.isLoading}
          filtrati={totaleFiltrato}
          totali={conteggi.data?.tutte ?? 0}
          onNuovo={() => setDrawerAperto(true)}
          onFornitori={() => navigate('/costi/fornitori')}
        />
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <CostiTable
          costi={righe}
          loading={elenco.isLoading}
          filtriAttivi={filtriAttivi}
          onApri={(id) => navigate(`/costi/${id}`)}
          azioneVuoto={
            <Button variant="primary" size="sm" onClick={() => setDrawerAperto(true)}>
              <Plus className="h-3.5 w-3.5" />
              Registra il primo costo
            </Button>
          }
        />

        <TablePagination
          paginaCorrente={pagina}
          paginePerTotale={Math.max(1, Math.ceil(totaleFiltrato / PER_PAGINA))}
          elementiTotali={totaleFiltrato}
          elementiPerPagina={PER_PAGINA}
          onCambiaPagina={setPagina}
          nomeElementi="costi"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CostiPerCategoria filtri={filtriBase} />
        <CostiPerMezzo filtri={filtriBase} />
      </div>

      <CostoDrawer open={drawerAperto} onOpenChange={setDrawerAperto} />
    </div>
  );
}
