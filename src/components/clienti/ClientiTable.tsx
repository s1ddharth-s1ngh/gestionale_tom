import { useNavigate } from 'react-router-dom';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { CountDot } from '@/components/ui/status-pill';
import { TipoClienteBadge } from './TipoClienteBadge';
import type { Cliente } from '@/types/cliente';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * L'elenco clienti in tabella.
 *
 * Le colonne rispondono alle domande che ci si fa davvero guardando la lista:
 * chi è, chi chiamo, dov'è il lavoro, quanti cantieri ha. La P.IVA non è in
 * colonna — si cerca, non si legge — ma resta cercabile dal campo di ricerca.
 */
interface ClientiTableProps {
  clienti: Cliente[];
  loading?: boolean;
  /** Stato vuoto: cambia se i filtri sono attivi o se l'archivio è vuoto. */
  vuotoIcona?: LucideIcon;
  vuotoTitolo?: string;
  vuotoDescrizione?: string;
  vuotoAzione?: React.ReactNode;
}

export function ClientiTable({
  clienti,
  loading,
  vuotoIcona,
  vuotoTitolo,
  vuotoDescrizione,
  vuotoAzione,
}: ClientiTableProps) {
  const navigate = useNavigate();

  return (
    <DarkTable
      loading={loading}
      empty={clienti.length === 0}
      emptyIcon={vuotoIcona}
      emptyMessage={vuotoTitolo ?? 'Nessun cliente'}
      emptyDescription={vuotoDescrizione}
      emptyAction={vuotoAzione}
      tableClassName="min-w-[840px]"
    >
      <DarkTableHeader>
        <DarkTableHead>Cliente</DarkTableHead>
        <DarkTableHead>Referente</DarkTableHead>
        <DarkTableHead>Comune</DarkTableHead>
        <DarkTableHead>Contatti</DarkTableHead>
        <DarkTableHead align="center">Cantieri</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {clienti.map((c, i) => (
          <DarkTableRow
            key={c.id}
            zebraIndex={i}
            onRowClick={() => navigate(`/clienti/${c.id}`)}
          >
            <DarkTableCell>
              <div className="flex min-w-0 items-center gap-2">
                {/* `truncate` sulla cella e non sul div: la larghezza massima
                    la impone la colonna, non il contenuto. */}
                <span className="truncate font-medium text-white">{c.denominazione}</span>
                <TipoClienteBadge tipo={c.tipo} />
              </div>
            </DarkTableCell>

            <DarkTableCell truncate="180px">
              {c.referente?.nome ? (
                <span className="text-white/70">{c.referente.nome}</span>
              ) : (
                <span className="italic text-white/30">—</span>
              )}
            </DarkTableCell>

            <DarkTableCell>
              <span className="text-white/70">{c.indirizzoFatturazione.comune}</span>
              {c.indirizzoFatturazione.provincia && (
                <span className="ml-1 text-white/35">({c.indirizzoFatturazione.provincia})</span>
              )}
            </DarkTableCell>

            <DarkTableCell truncate="200px">
              {/* Telefono sopra, mail sotto: chi guarda questa colonna sta per
                  chiamare, non per scrivere. */}
              {c.telefono || c.email ? (
                <div className="min-w-0">
                  {c.telefono && (
                    <div className="truncate tabular-nums text-white/70">{c.telefono}</div>
                  )}
                  {c.email && <div className="truncate text-[11px] text-white/40">{c.email}</div>}
                </div>
              ) : (
                <span className="italic text-white/30">—</span>
              )}
            </DarkTableCell>

            <DarkTableCell align="center">
              <CountDot>{c.luoghiIntervento.length}</CountDot>
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}
