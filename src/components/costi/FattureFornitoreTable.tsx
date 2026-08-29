import { Receipt, Search } from '@/components/ui/icons';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { StatusPill } from '@/components/ui/status-pill';
import { StatoFatturaFornitoreBadge } from '@/components/costi/StatoFatturaFornitoreBadge';
import type { FatturaFornitore } from '@/types/fatturaFornitore';
import { statoEffettivoFattura } from '@/types/fatturaFornitore';
import { formatCurrency, formatDataBreve } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FattureFornitoreTableProps {
  fatture: FatturaFornitore[];
  loading?: boolean;
  filtriAttivi?: boolean;
  onApri: (id: string) => void;
  azioneVuoto?: React.ReactNode;
}

export function FattureFornitoreTable({
  fatture,
  loading,
  filtriAttivi,
  onApri,
  azioneVuoto,
}: FattureFornitoreTableProps) {
  return (
    <DarkTable
      loading={loading}
      empty={fatture.length === 0}
      emptyIcon={filtriAttivi ? Search : Receipt}
      emptyMessage={filtriAttivi ? 'Nessuna fattura per i filtri' : 'Nessuna fattura ricevuta'}
      emptyDescription={
        filtriAttivi
          ? 'Prova a cambiare stato o a cercare un altro numero.'
          : 'Le fatture dei fornitori si registrano da qui, o si importano dall’XML.'
      }
      emptyAction={filtriAttivi ? undefined : azioneVuoto}
    >
      <DarkTableHeader sticky>
        <DarkTableHead>Numero</DarkTableHead>
        <DarkTableHead>Fornitore</DarkTableHead>
        <DarkTableHead>Documento</DarkTableHead>
        <DarkTableHead>Scadenza</DarkTableHead>
        <DarkTableHead align="right">Totale</DarkTableHead>
        <DarkTableHead align="right">Residuo</DarkTableHead>
        <DarkTableHead>Costi</DarkTableHead>
        <DarkTableHead>Stato</DarkTableHead>
      </DarkTableHeader>

      <DarkTableBody>
        {fatture.map((f, i) => (
          <DarkTableRow key={f.id} zebraIndex={i} onRowClick={() => onApri(f.id)}>
            <DarkTableCell mono>{f.numero}</DarkTableCell>
            <DarkTableCell truncate="max-w-[260px]">
              {f.fornitoreDenominazione ?? <span className="italic text-white/30">—</span>}
            </DarkTableCell>
            <DarkTableCell tabular>{formatDataBreve(f.dataDocumento)}</DarkTableCell>
            <DarkTableCell tabular>
              <span className={cn(coloreScadenza(f))}>{formatDataBreve(f.dataScadenza)}</span>
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {formatCurrency(f.totale)}
            </DarkTableCell>
            <DarkTableCell align="right" tabular>
              {/* Il residuo a zero è l'informazione meno interessante della riga:
                  si smorza, così le fatture ancora da pagare risaltano. */}
              <span className={f.residuo > 0 ? 'text-white' : 'text-white/30'}>
                {formatCurrency(f.residuo)}
              </span>
            </DarkTableCell>
            <DarkTableCell>
              {/* Zero costi su una fattura registrata non è un dettaglio: vuol
                  dire che la spesa non è finita in nessun riepilogo. */}
              {f.costiGenerati > 0 ? (
                <StatusPill accent="teal">{f.costiGenerati}</StatusPill>
              ) : f.stato === 'bozza' ? (
                <span className="text-[12px] text-white/30">—</span>
              ) : (
                <StatusPill accent="amber">da generare</StatusPill>
              )}
            </DarkTableCell>
            <DarkTableCell>
              {/* Lo stato EFFETTIVO, non `f.stato`: in tabella ci sono solo
                  `bozza` e `registrata`, e stampare il campo grezzo mostrerebbe
                  «Registrata» su righe che i contatori hanno già messo fra le
                  scadute o le pagate. */}
              <StatoFatturaFornitoreBadge
                stato={statoEffettivoFattura(f, f.pagato)}
                variant="dot"
              />
            </DarkTableCell>
          </DarkTableRow>
        ))}
      </DarkTableBody>
    </DarkTable>
  );
}

/** L'urgenza si legge anche sulla data, non solo sulla badge: scaduta in
 *  rosso, entro sette giorni in ambra, il resto come tutto il resto. */
function coloreScadenza(f: FatturaFornitore): string {
  if (f.residuo <= 0 || !f.dataScadenza) return 'text-white/55';
  const scadenza = new Date(f.dataScadenza);
  scadenza.setHours(12, 0, 0, 0);
  const oggi = new Date();
  oggi.setHours(12, 0, 0, 0);
  const giorni = Math.round((scadenza.getTime() - oggi.getTime()) / 86_400_000);

  if (giorni < 0) return 'text-red-300';
  if (giorni <= 7) return 'text-amber-300';
  return 'text-white/55';
}
