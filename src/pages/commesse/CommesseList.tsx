import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DarkSection } from '@/components/ui/dark-section';
import { Plus } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { TablePagination } from '@/components/ui/pagination';
import { useCommesse, useConteggiCommesse } from '@/hooks/useCommesse';
import { pluralize } from '@/lib/utils';
import type { CommessaFiltri } from '@/types/commessa';
import {
  CommesseCalendario,
  finestraDelMese,
} from '@/components/commesse/CommesseCalendario';
import { CommesseTable } from '@/components/commesse/CommesseTable';
import {
  CommesseToolbar,
  type FiltroStato,
  type VistaCommesse,
} from '@/components/commesse/CommesseToolbar';

/** Sotto questa soglia la ricerca parte a ogni tasto e la lista sfarfalla. */
const DEBOUNCE_MS = 250;

const PER_PAGINA = 20;

/** La vista scelta sopravvive al reload: è una preferenza, non uno stato di sessione. */
const CHIAVE_VISTA = 'tom.commesse.vista';

export default function CommesseList() {
  const navigate = useNavigate();

  const [stato, setStato] = React.useState<FiltroStato>('tutte');
  const [ricerca, setRicerca] = React.useState('');
  const [ricercaApplicata, setRicercaApplicata] = React.useState('');
  const [pagina, setPagina] = React.useState(1);
  const [vista, setVista] = React.useState<VistaCommesse>(() =>
    localStorage.getItem(CHIAVE_VISTA) === 'calendario' ? 'calendario' : 'elenco',
  );

  React.useEffect(() => {
    localStorage.setItem(CHIAVE_VISTA, vista);
  }, [vista]);

  // La ricerca arriva al service in ritardo, non a ogni tasto: il campo resta
  // reattivo mentre le query partono una sola volta a fine digitazione.
  React.useEffect(() => {
    const t = setTimeout(() => setRicercaApplicata(ricerca.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [ricerca]);

  // Cambiare filtro riporta a pagina 1. Senza, si resta su una pagina 7 che nel
  // nuovo risultato non esiste, e la lista sembra vuota.
  React.useEffect(() => {
    setPagina(1);
  }, [stato, ricercaApplicata]);

  const filtri: CommessaFiltri = {
    stato: stato === 'tutte' ? undefined : stato,
    q: ricercaApplicata || undefined,
    pagina,
    perPagina: PER_PAGINA,
  };

  const elenco = useCommesse(filtri);
  const conteggi = useConteggiCommesse();

  const righe = elenco.data?.righe ?? [];
  const totale = elenco.data?.totale ?? 0;
  const filtroAttivo = stato !== 'tutte' || !!ricercaApplicata;

  const nuova = () => navigate('/commesse/nuova');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commesse"
        subtitle="I lavori pianificati, in corso e chiusi"
        meta={
          // Il conteggio viene dai contatori dell'archivio, non dalla pagina:
          // "20 commesse" sotto una tabella che ne mostra 20 di 137 è una bugia.
          conteggi.data ? (
            <span className="text-[12px] tabular-nums text-white/40">
              {conteggi.data.tutte} {pluralize(conteggi.data.tutte, 'commessa', 'commesse')} in
              archivio · {conteggi.data.in_corso} in corso
            </span>
          ) : undefined
        }
        actions={
          <Button variant="primary" size="md" onClick={nuova}>
            <Plus className="h-4 w-4" />
            Nuova commessa
          </Button>
        }
      />

      <DarkSection>
        <div className="space-y-4">
          <CommesseToolbar
            stato={stato}
            onStato={setStato}
            ricerca={ricerca}
            onRicerca={setRicerca}
            vista={vista}
            onVista={setVista}
            conteggi={conteggi.data}
            cercando={elenco.isFetching}
            onNuova={nuova}
          />

          {vista === 'elenco' ? (
            <>
              <CommesseTable
                commesse={righe}
                loading={elenco.isLoading}
                ricercaAttiva={filtroAttivo}
                emptyAction={
                  <Button variant="primary" onClick={nuova}>
                    <Plus className="h-4 w-4" />
                    Crea la prima commessa
                  </Button>
                }
              />
              <TablePagination
                paginaCorrente={pagina}
                paginePerTotale={Math.max(1, Math.ceil(totale / PER_PAGINA))}
                elementiTotali={totale}
                elementiPerPagina={PER_PAGINA}
                onCambiaPagina={setPagina}
                nomeElementi="commesse"
              />
            </>
          ) : (
            <TableEmptyState
              icon={Calendar}
              title="Il calendario arriva col prossimo commit"
              description="La griglia mensile con le commesse pianificate nelle celle."
            />
          )}
        </div>
      </DarkSection>
    </div>
  );
}
