import { Plus, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import type { RigaFattura } from '@/types/fattura';
import {
  ALIQUOTA_IVA_DEFAULT,
  imponibileFattura,
  imponibileRiga,
  ivaFattura,
  totaleFattura,
} from '@/types/fattura';
import { formatCurrency } from '@/lib/formatters';

/** La riga in lavorazione non ha ancora un id: lo mette il service al salvataggio. */
export type RigaBozza = Omit<RigaFattura, 'id'>;

interface RigheFatturaTableProps {
  righe: RigaBozza[];
  /** Assente = sola lettura. È così che il dettaglio riusa questa tabella. */
  onChange?: (righe: RigaBozza[]) => void;
  errore?: string;
}

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

export const RIGA_VUOTA: RigaBozza = {
  descrizione: '',
  quantita: 1,
  prezzoUnitario: 0,
  aliquotaIva: ALIQUOTA_IVA_DEFAULT,
};

/**
 * Le righe della fattura, con i totali sotto.
 *
 * I totali si calcolano con le funzioni di `types/fattura`, le stesse che usa
 * il service: se li ricalcolasse a modo suo, la fattura mostrerebbe un numero
 * mentre l'archivio ne conserva un altro.
 */
export function RigheFatturaTable({ righe, onChange, errore }: RigheFatturaTableProps) {
  const modificabile = !!onChange;
  const complete = righe.map((r, i) => ({ ...r, id: `bozza-${i}` }));

  function aggiorna(indice: number, patch: Partial<RigaBozza>) {
    onChange?.(righe.map((r, i) => (i === indice ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-3">
      <DarkTable
        empty={righe.length === 0}
        emptyMessage="Nessuna riga"
        emptyDescription="Aggiungi almeno una riga: senza, la fattura non ha un importo."
      >
        <DarkTableHeader>
          <DarkTableHead>Descrizione</DarkTableHead>
          <DarkTableHead align="right">Q.tà</DarkTableHead>
          <DarkTableHead align="right">Prezzo</DarkTableHead>
          <DarkTableHead align="right">IVA</DarkTableHead>
          <DarkTableHead align="right">Imponibile</DarkTableHead>
          {modificabile && <DarkTableHead />}
        </DarkTableHeader>

        <DarkTableBody>
          {complete.map((riga, i) => (
            <DarkTableRow key={riga.id} zebraIndex={i}>
              <DarkTableCell>
                {modificabile ? (
                  <Input
                    value={riga.descrizione}
                    onChange={(e) => aggiorna(i, { descrizione: e.target.value })}
                    placeholder="es. Potatura di quattro tigli"
                    className={INPUT_CLS}
                  />
                ) : (
                  riga.descrizione
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular>
                {modificabile ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={riga.quantita}
                    onChange={(e) => aggiorna(i, { quantita: Number(e.target.value) })}
                    className={`${INPUT_CLS} w-20 text-right tabular-nums`}
                  />
                ) : (
                  riga.quantita
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular>
                {modificabile ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={riga.prezzoUnitario}
                    onChange={(e) => aggiorna(i, { prezzoUnitario: Number(e.target.value) })}
                    className={`${INPUT_CLS} w-28 text-right tabular-nums`}
                  />
                ) : (
                  formatCurrency(riga.prezzoUnitario)
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular>
                {modificabile ? (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={riga.aliquotaIva}
                    onChange={(e) => aggiorna(i, { aliquotaIva: Number(e.target.value) })}
                    className={`${INPUT_CLS} w-16 text-right tabular-nums`}
                  />
                ) : (
                  `${riga.aliquotaIva}%`
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular>
                {formatCurrency(imponibileRiga(riga))}
              </DarkTableCell>

              {modificabile && (
                <DarkTableCell align="right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Elimina la riga"
                    onClick={() => onChange?.(righe.filter((_, x) => x !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DarkTableCell>
              )}
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      {errore && <p className="text-xs text-red-400">{errore}</p>}

      <div className="flex items-start justify-between gap-4">
        {modificabile ? (
          <Button variant="secondary" size="sm" onClick={() => onChange?.([...righe, { ...RIGA_VUOTA }])}>
            <Plus className="h-3.5 w-3.5" />
            Aggiungi riga
          </Button>
        ) : (
          <span />
        )}

        <dl className="min-w-[240px] space-y-1.5">
          <Totale label="Imponibile" valore={imponibileFattura(complete)} />
          <Totale label="IVA" valore={ivaFattura(complete)} />
          <div className="flex items-baseline justify-between gap-6 border-t border-white/[0.06] pt-1.5">
            <dt className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">Totale</dt>
            <dd className="text-[15px] font-semibold tabular-nums text-white">
              {formatCurrency(totaleFattura(complete))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Totale({ label, valore }: { label: string; valore: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">{label}</dt>
      <dd className="text-[13px] tabular-nums text-white/70">{formatCurrency(valore)}</dd>
    </div>
  );
}
