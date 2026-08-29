import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatoPreventivoBadge } from '@/components/preventivi/StatoPreventivoBadge';
import type { LucideIcon } from '@/components/ui/icons';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';
import { cn, pluralize } from '@/lib/utils';
import type { Preventivo } from '@/types/preventivo';
import { giorniAllaScadenza, statoEffettivo } from '@/types/preventivo';

/** Sotto questa soglia la scadenza si segnala: è il momento di sollecitare. */
const GIORNI_URGENZA = 7;

interface PreventiviTableProps {
  righe: Preventivo[];
  loading?: boolean;
  /** Risolve la denominazione del cliente. La pagina la prende da `useClientiCompleti`. */
  nomeCliente: (clienteId: string) => string;
  /** Risolve l'etichetta del luogo di intervento. */
  etichettaLuogo: (clienteId: string, luogoId: string) => string;
  onApri: (p: Preventivo) => void;
  // ── Stato vuoto ───────────────────────────────────────────────────────────
  // Due casi DIVERSI, e mostrare il secondo quando vale il primo fa credere che
  // i dati siano spariti. Li decide la pagina, che sa se ci sono filtri attivi.
  vuotoIcona?: LucideIcon;
  vuotoTitolo?: string;
  vuotoDescrizione?: string;
  vuotoAzione?: React.ReactNode;
}

/**
 * L'elenco dei preventivi. docs/DESIGN_SYSTEM.md §6.4.
 *
 * Lo stato mostrato passa SEMPRE da `statoEffettivo`: il campo salvato non
 * contiene mai «scaduto», e stamparlo grezzo darebbe righe marcate «Inviato»
 * che la pill «Scaduti» ha però già contato.
 */
export function PreventiviTable({
  righe,
  loading,
  nomeCliente,
  etichettaLuogo,
  onApri,
  vuotoIcona,
  vuotoTitolo = 'Nessun preventivo',
  vuotoDescrizione,
  vuotoAzione,
}: PreventiviTableProps) {
  return (
    <DarkTable
      loading={loading}
      empty={righe.length === 0}
      emptyIcon={vuotoIcona}
      emptyMessage={vuotoTitolo}
      emptyDescription={vuotoDescrizione}
      emptyAction={vuotoAzione}
    >
      <DarkTableHeader>
        <DarkTableHead>Numero</DarkTableHead>
        <DarkTableHead>Cliente</DarkTableHead>
        <DarkTableHead>Luogo</DarkTableHead>
        <DarkTableHead>Emissione</DarkTableHead>
        <DarkTableHead>Valido fino</DarkTableHead>
        <DarkTableHead align="right">Totale</DarkTableHead>
        <DarkTableHead>Stato</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {righe.map((p, i) => {
          const stato = statoEffettivo(p);
          const giorni = giorniAllaScadenza(p);
          // Il richiamo sulla scadenza vale solo per chi è ancora in gioco: su
          // una bozza non c'è niente da sollecitare, e su un esito ormai dato la
          // data di validità non interessa più a nessuno.
          const urgente = stato === 'inviato' && giorni <= GIORNI_URGENZA;

          return (
            <DarkTableRow key={p.id} zebraIndex={i} onRowClick={() => onApri(p)}>
              <DarkTableCell mono className="whitespace-nowrap text-white">
                {p.numero}
              </DarkTableCell>

              <DarkTableCell truncate="220px" className="text-white">
                {nomeCliente(p.clienteId)}
              </DarkTableCell>

              <DarkTableCell truncate="180px" className="text-white/55">
                {etichettaLuogo(p.clienteId, p.luogoInterventoId)}
              </DarkTableCell>

              <DarkTableCell tabular className="whitespace-nowrap text-white/70">
                {formatDataBreve(p.dataEmissione)}
              </DarkTableCell>

              <DarkTableCell
                tabular
                className={cn('whitespace-nowrap', urgente ? 'text-amber-300' : 'text-white/70')}
              >
                {formatDataBreve(p.validoFino)}
                {urgente && (
                  <span className="ml-1.5 text-[11px] text-amber-300/80">
                    {giorni <= 0
                      ? 'oggi'
                      : `fra ${giorni} ${pluralize(giorni, 'giorno', 'giorni')}`}
                  </span>
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular className="whitespace-nowrap text-white">
                {formatCurrency(p.totale)}
              </DarkTableCell>

              <DarkTableCell>
                <StatoPreventivoBadge stato={stato} variant="dot" />
              </DarkTableCell>
            </DarkTableRow>
          );
        })}
      </DarkTableBody>
    </DarkTable>
  );
}
