import { useNavigate } from 'react-router-dom';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { Tree } from '@/components/ui/icons';
import { formatDataBreve, formatOre } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CommessaConCliente } from '@/types/commessa';
import { scostamentoOre } from '@/types/commessa';
import { AvanzamentoBar } from './AvanzamentoBar';
import { StatoCommessaBadge } from './StatoCommessaBadge';

interface CommesseTableProps {
  commesse: CommessaConCliente[];
  loading?: boolean;
  /** true = il filtro non ha prodotto risultati; false = l'archivio è vuoto. */
  ricercaAttiva?: boolean;
  emptyAction?: React.ReactNode;
}

/**
 * L'elenco delle commesse in tabella.
 *
 * Le ore sono due colonne e non una: «16 / 20» in una cella sola si legge come
 * una frazione, e la frazione suggerisce un avanzamento che invece sta già
 * nella sua barra. Separate, previste e reali si confrontano incolonnate — ed è
 * per questo che portano `tabular`: senza cifre tabellari due colonne di numeri
 * ballano riga per riga e il confronto verticale, che è tutto il punto, salta.
 */
export function CommesseTable({
  commesse,
  loading,
  ricercaAttiva,
  emptyAction,
}: CommesseTableProps) {
  const navigate = useNavigate();

  return (
    <DarkTable
      loading={loading}
      empty={!loading && commesse.length === 0}
      emptyIcon={Tree}
      // I due stati vuoti dicono cose diverse e non vanno confusi: mostrare
      // "nessuna commessa" quando è il filtro a non trovare niente fa credere
      // che i dati siano spariti.
      emptyMessage={ricercaAttiva ? 'Nessuna commessa trovata' : 'Nessuna commessa'}
      emptyDescription={
        ricercaAttiva
          ? 'Prova a cambiare filtro di stato o termine di ricerca.'
          : 'Le commesse nascono da un preventivo accettato, o si creano a mano.'
      }
      emptyAction={ricercaAttiva ? undefined : emptyAction}
      tableClassName="min-w-[860px]"
    >
      <DarkTableHeader>
        <DarkTableHead className="w-[130px]">Numero</DarkTableHead>
        <DarkTableHead>Cliente</DarkTableHead>
        <DarkTableHead className="w-[120px]">Pianificata</DarkTableHead>
        <DarkTableHead align="right" className="w-[80px]">
          Previste
        </DarkTableHead>
        <DarkTableHead align="right" className="w-[80px]">
          Reali
        </DarkTableHead>
        <DarkTableHead className="w-[150px]">Avanzamento</DarkTableHead>
        <DarkTableHead className="w-[130px]">Stato</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {commesse.map((c, i) => {
          const scostamento = scostamentoOre(c);
          return (
            <DarkTableRow
              key={c.id}
              zebraIndex={i}
              onRowClick={() => navigate(`/commesse/${c.id}`)}
            >
              <DarkTableCell mono className="text-white/80">
                {c.numero}
              </DarkTableCell>

              <DarkTableCell truncate="280px">
                <span className="text-white/85">{c.clienteDenominazione}</span>
                <span className="ml-2 text-white/35">{c.luogoEtichetta}</span>
              </DarkTableCell>

              <DarkTableCell tabular className="text-white/60">
                {/* Il trattino e non "—" vuoto: una commessa da pianificare NON
                    ha una data, e la cella deve dirlo invece di sembrare persa. */}
                {c.dataPianificata ? formatDataBreve(c.dataPianificata) : '—'}
              </DarkTableCell>

              <DarkTableCell align="right" tabular className="text-white/60">
                {formatOre(c.orePreviste)}
              </DarkTableCell>

              <DarkTableCell
                align="right"
                tabular
                // Ambra sopra il previsto, bianco in linea. Mai verde: qui
                // "a posto" è bianco, il verde direbbe "bene" a un numero che
                // al massimo può essere corretto.
                className={cn(scostamento > 0 ? 'text-amber-300' : 'text-white/60')}
                title={
                  scostamento > 0
                    ? `${formatOre(scostamento)} oltre il previsto`
                    : undefined
                }
              >
                {c.oreReali > 0 ? formatOre(c.oreReali) : '—'}
              </DarkTableCell>

              <DarkTableCell>
                <AvanzamentoBar valore={c.avanzamentoPct} />
              </DarkTableCell>

              <DarkTableCell>
                <StatoCommessaBadge stato={c.stato} variant="dot" />
              </DarkTableCell>
            </DarkTableRow>
          );
        })}
      </DarkTableBody>
    </DarkTable>
  );
}
