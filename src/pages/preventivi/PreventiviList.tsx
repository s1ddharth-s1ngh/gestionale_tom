import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { FileText, Plus, Search } from '@/components/ui/icons';
import {
  PreventiviToolbar,
  type FiltroStato,
} from '@/components/preventivi/PreventiviToolbar';
import { PreventiviTable } from '@/components/preventivi/PreventiviTable';
import { useConteggiPreventivi, usePreventivi } from '@/hooks/usePreventivi';
import { useClientiCompleti } from '@/hooks/useClienti';
import { PER_PAGINA_DEFAULT } from '@/types/comune';

/**
 * Attesa prima di far partire la ricerca. Sotto i ~250ms si manda una query per
 * tasto premuto; sopra, la lista sembra in ritardo su quello che si è digitato.
 */
const DEBOUNCE_MS = 250;

/**
 * L'elenco dei preventivi.
 *
 * Filtro, ricerca e pagina vivono qui in `useState` e non nella cache: sono
 * stato di UI, non dati remoti (CONVENTIONS §4.4). Quello che invece NON si fa
 * qui è filtrare: i filtri sono parametri del service, così il giorno che sotto
 * c'è un'API diventano condizioni di query e questa pagina non cambia.
 */
export default function PreventiviList() {
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState<FiltroStato>('tutti');
  const [ricerca, setRicerca] = useState('');
  const [ricercaAttiva, setRicercaAttiva] = useState('');
  const [pagina, setPagina] = useState(1);

  // Il termine digitato diventa quello cercato solo dopo la pausa.
  useEffect(() => {
    const t = setTimeout(() => setRicercaAttiva(ricerca.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [ricerca]);

  // Cambiare filtro o ricerca rimette a pagina 1: restare sulla 3 di un elenco
  // che adesso ne ha una sola mostrerebbe una tabella vuota che sembra un bug.
  useEffect(() => {
    setPagina(1);
  }, [filtro, ricercaAttiva]);

  const filtriRicerca = useMemo(
    () => (ricercaAttiva ? { q: ricercaAttiva } : undefined),
    [ricercaAttiva],
  );

  const elenco = usePreventivi({
    stato: filtro === 'tutti' ? undefined : filtro,
    q: ricercaAttiva || undefined,
    pagina,
    perPagina: PER_PAGINA_DEFAULT,
  });
  const conteggi = useConteggiPreventivi(filtriRicerca);
  const clienti = useClientiCompleti();

  /**
   * Indice dei clienti per id. La tabella mostra la denominazione, e senza una
   * mappa sarebbe una `find` per riga a ogni render.
   *
   * Il join sta qui e non nel service solo perché `preventiviService` non ha
   * ancora il suo TODO(chat A) risolto: quando ce l'avrà, questa mappa sparisce
   * e i nomi arrivano già dentro la riga.
   */
  const perId = useMemo(
    () => new Map((clienti.data ?? []).map((c) => [c.id, c])),
    [clienti.data],
  );

  const nomeCliente = (clienteId: string) => perId.get(clienteId)?.denominazione ?? '—';
  const etichettaLuogo = (clienteId: string, luogoId: string) =>
    perId.get(clienteId)?.luoghiIntervento.find((l) => l.id === luogoId)?.etichetta ?? '—';

  const righe = elenco.data?.righe ?? [];
  const totale = elenco.data?.totale ?? 0;
  const filtriAttivi = filtro !== 'tutti' || !!ricercaAttiva;

  const azzera = () => {
    setFiltro('tutti');
    setRicerca('');
  };

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        title="Preventivi"
        subtitle="Sopralluogo, rilievo degli alberi e offerta al cliente"
        actions={
          <Button variant="primary" size="md" onClick={() => navigate('/preventivi/nuovo')}>
            <Plus className="h-4 w-4" />
            Nuovo preventivo
          </Button>
        }
      />

      <PreventiviToolbar
        filtro={filtro}
        onFiltro={setFiltro}
        ricerca={ricerca}
        onRicerca={setRicerca}
        conteggi={conteggi.data}
        filtrati={totale}
        cercando={elenco.isFetching || ricerca.trim() !== ricercaAttiva}
        onNuovo={() => navigate('/preventivi/nuovo')}
      />

      <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]">
        <PreventiviTable
          righe={righe}
          loading={elenco.isLoading || clienti.isLoading}
          nomeCliente={nomeCliente}
          etichettaLuogo={etichettaLuogo}
          onApri={(p) => navigate(`/preventivi/${p.id}`)}
          // I due stati vuoti sono diversi: «non trovo niente con questi filtri»
          // è una cosa, «non c'è ancora nulla in archivio» è un'altra.
          vuotoIcona={filtriAttivi ? Search : FileText}
          vuotoTitolo={filtriAttivi ? 'Nessun risultato per i filtri' : 'Nessun preventivo'}
          vuotoDescrizione={
            filtriAttivi
              ? 'Prova a cambiare stato o a cercare un altro termine.'
              : 'I preventivi nascono dal sopralluogo: rilievo degli alberi, criticità e righe economiche.'
          }
          vuotoAzione={
            filtriAttivi ? (
              <Button variant="secondary" size="sm" onClick={azzera}>
                Azzera filtri
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate('/preventivi/nuovo')}>
                <Plus className="h-3.5 w-3.5" />
                Crea il primo preventivo
              </Button>
            )
          }
        />

        <TablePagination
          paginaCorrente={pagina}
          paginePerTotale={Math.max(1, Math.ceil(totale / PER_PAGINA_DEFAULT))}
          elementiTotali={totale}
          elementiPerPagina={PER_PAGINA_DEFAULT}
          onCambiaPagina={setPagina}
          nomeElementi="preventivi"
        />
      </div>
    </div>
  );
}
