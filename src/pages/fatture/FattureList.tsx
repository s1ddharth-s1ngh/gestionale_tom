import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TablePagination } from '@/components/ui/pagination';
import { FattureTable } from '@/components/fatture/FattureTable';
import { FattureToolbar, type FiltroStatoFattura } from '@/components/fatture/FattureToolbar';
import { useConteggiFatture, useFatture } from '@/hooks/useFatture';

const PER_PAGINA = 20;

/**
 * Elenco delle fatture.
 *
 * Il filtro di stato e la ricerca sono parametri del service, non un
 * `.filter()` fatto qui: il giorno che arriva il backend diventano una query e
 * questa pagina non cambia di una riga.
 */
export default function FattureList() {
  const navigate = useNavigate();
  const [stato, setStato] = useState<FiltroStatoFattura>('tutte');
  const [ricerca, setRicerca] = useState('');
  const [pagina, setPagina] = useState(1);

  const filtri = {
    stato: stato === 'tutte' ? undefined : stato,
    q: ricerca.trim() || undefined,
    pagina,
    perPagina: PER_PAGINA,
  };

  const elenco = useFatture(filtri);
  const conteggi = useConteggiFatture();

  const righe = elenco.data?.righe ?? [];
  const totale = elenco.data?.totale ?? 0;
  const filtriAttivi = stato !== 'tutte' || ricerca.trim().length > 0;

  /** Cambiare filtro e restare a pagina 4 mostra una lista vuota che sembra un bug. */
  function cambiaFiltro(prossimo: FiltroStatoFattura) {
    setStato(prossimo);
    setPagina(1);
  }

  function cambiaRicerca(q: string) {
    setRicerca(q);
    setPagina(1);
  }

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        title="Fatture"
        subtitle="Emissione, incassi e solleciti"
      />

      <FattureToolbar
        stato={stato}
        onStatoChange={cambiaFiltro}
        conteggi={conteggi.data}
        ricerca={ricerca}
        onRicercaChange={cambiaRicerca}
        caricando={elenco.isFetching}
        filtrate={totale}
        totali={conteggi.data?.tutte ?? 0}
        onNuova={() => navigate('/fatture/nuova')}
        onScadenzario={() => navigate('/fatture/scadenzario')}
      />

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <FattureTable
          fatture={righe}
          loading={elenco.isLoading}
          filtriAttivi={filtriAttivi}
          onApri={(id) => navigate(`/fatture/${id}`)}
          nuovaAzione={
            <Button variant="primary" size="sm" onClick={() => navigate('/fatture/nuova')}>
              <Plus className="h-3.5 w-3.5" />
              Emetti la prima fattura
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
