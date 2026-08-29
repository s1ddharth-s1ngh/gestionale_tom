import { useEffect, useState } from 'react';
import { Search, Users, Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TablePagination } from '@/components/ui/pagination';
import { useClienti, useConteggioClientiPerTipo } from '@/hooks/useClienti';
import { useDebounce } from '@/hooks/useDebounce';
import { ClientiTable } from '@/components/clienti/ClientiTable';
import { ClientiToolbar } from '@/components/clienti/ClientiToolbar';
import { ClienteDrawer } from '@/components/clienti/ClienteDrawer';
import { PER_PAGINA_DEFAULT } from '@/types/comune';
import type { TipoCliente } from '@/types/cliente';
import { cn } from '@/lib/utils';

type FiltroTipo = TipoCliente | 'tutti';

/**
 * Elenco clienti.
 *
 * È l'implementazione di riferimento delle liste: preventivi, commesse,
 * fatture e costi copiano da qui la struttura — testata, toolbar, tabella
 * dentro una card, paginazione in coda.
 *
 * Il pezzo che vale la pena copiare davvero sono i DUE stati vuoti distinti:
 * «nessun risultato per questi filtri» e «non c'è ancora nessun cliente» sono
 * situazioni diverse e portano ad azioni diverse. Mostrare il secondo quando
 * vale il primo fa credere che i dati siano spariti.
 */
export default function ClientiList() {
  const [tipo, setTipo] = useState<FiltroTipo>('tutti');
  const [ricerca, setRicerca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [drawerAperto, setDrawerAperto] = useState(false);

  const ricercaDebounced = useDebounce(ricerca);

  // Cambiare filtro mentre si è a pagina 5 lascerebbe su una pagina che il
  // nuovo filtro non ha: si torna sempre alla prima.
  useEffect(() => {
    setPagina(1);
  }, [tipo, ricercaDebounced]);

  const { data, isLoading, isFetching } = useClienti({ tipo, q: ricercaDebounced, pagina });
  const { data: conteggi } = useConteggioClientiPerTipo();

  const righe = data?.righe ?? [];
  const totaleFiltrato = data?.totale ?? 0;
  const totaleArchivio = conteggi?.tutti ?? 0;
  const perPagina = data?.perPagina ?? PER_PAGINA_DEFAULT;
  const pagineTotali = Math.max(1, Math.ceil(totaleFiltrato / perPagina));
  const mostraPaginazione = pagineTotali > 1;

  const filtriAttivi = tipo !== 'tutti' || ricercaDebounced.trim().length > 0;

  const azzeraFiltri = () => {
    setTipo('tutti');
    setRicerca('');
  };

  return (
    <div className="space-y-5 p-3">
      <PageHeader title="Clienti" subtitle="Privati, condomini, aziende ed enti pubblici" />

      {/* 8px fra il sottotitolo e la fila di pill: è la geometria del design
          system. `!mt-2` batte lo `space-y-5` del flusso, che ha specificità
          0,3,0 e vincerebbe su un `mt-2` normale. */}
      <div className="!mt-2">
        <ClientiToolbar
          tipo={tipo}
          onTipoChange={setTipo}
          ricerca={ricerca}
          onRicercaChange={setRicerca}
          conteggi={conteggi}
          mostrati={totaleFiltrato}
          totale={totaleArchivio}
          cercando={isFetching && !isLoading}
          onNuovo={() => setDrawerAperto(true)}
        />
      </div>

      {/* La paginazione vive dentro la card, separata da un filo. Il padding
          inferiore sparisce solo quando c'è: senza, una tabella corta
          resterebbe attaccata al bordo. */}
      <div
        className={cn(
          '!mt-3 rounded-[20px] border border-white/[0.06] bg-[#111111] p-5',
          mostraPaginazione && 'pb-0',
        )}
      >
        <ClientiTable
          clienti={righe}
          loading={isLoading}
          vuotoIcona={filtriAttivi ? Search : Users}
          vuotoTitolo={
            filtriAttivi
              ? 'Nessun cliente corrisponde ai filtri'
              : 'Non c’è ancora nessun cliente'
          }
          vuotoDescrizione={
            filtriAttivi
              ? 'Prova a togliere un filtro o a cercare qualcos’altro.'
              : 'Inizia dal primo: bastano denominazione, codice fiscale e indirizzo.'
          }
          vuotoAzione={
            filtriAttivi ? (
              <Button onClick={azzeraFiltri}>Azzera i filtri</Button>
            ) : (
              <Button variant="primary" onClick={() => setDrawerAperto(true)}>
                <Plus className="h-3.5 w-3.5" />
                Aggiungi il primo cliente
              </Button>
            )
          }
        />

        <TablePagination
          paginaCorrente={data?.pagina ?? 1}
          paginePerTotale={pagineTotali}
          elementiTotali={totaleFiltrato}
          elementiPerPagina={perPagina}
          onCambiaPagina={setPagina}
          nomeElementi="clienti"
          className="-mx-5"
        />
      </div>

      <ClienteDrawer open={drawerAperto} onOpenChange={setDrawerAperto} />
    </div>
  );
}
