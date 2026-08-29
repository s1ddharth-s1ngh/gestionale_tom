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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardText, Plus, Trash2 } from '@/components/ui/icons';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { nuovoId } from '@/lib/utils';
import type { RigaPreventivo, UnitaMisura } from '@/types/preventivo';
import { UNITA_MISURA, calcolaImporto, calcolaTotali, unitaLabel } from '@/types/preventivo';

/** La riga com'è nel form: l'importo non c'è perché si calcola, non si digita. */
export type RigaBozza = Omit<RigaPreventivo, 'importo'>;

interface RighePreventivoTableProps {
  value: RigaBozza[];
  onChange: (righe: RigaBozza[]) => void;
  aliquotaIva: number;
  /** Sola lettura: il dettaglio di un preventivo già inviato non si modifica qui. */
  disabled?: boolean;
}

/**
 * Le righe economiche del preventivo, con il riepilogo in coda.
 *
 * L'importo di riga e i totali sono CALCOLATI e non digitabili. È la decisione
 * che regge il modulo: un totale scrivibile a mano smette di combaciare con le
 * righe che dovrebbe riassumere il primo giorno, e ci si accorge dello
 * scostamento quando il cliente confronta la fattura con l'offerta.
 *
 * Il corollario è che uno sconto a totale si scrive come riga con prezzo
 * negativo — motivo per cui il campo prezzo accetta valori sotto zero invece di
 * bloccarli come farebbe un `min={0}` messo per abitudine.
 */
export function RighePreventivoTable({
  value,
  onChange,
  aliquotaIva,
  disabled,
}: RighePreventivoTableProps) {
  const { imponibile, iva, totale } = calcolaTotali(value, aliquotaIva);

  const aggiungi = () => {
    onChange([
      ...value,
      { id: nuovoId(), descrizione: '', quantita: 1, unita: 'ore', prezzoUnitario: 0 },
    ]);
  };

  const modifica = (id: string, patch: Partial<RigaBozza>) => {
    onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const rimuovi = (id: string) => onChange(value.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      <DarkTable
        empty={value.length === 0}
        emptyIcon={ClipboardText}
        emptyMessage="Nessuna riga"
        emptyDescription="Le righe sono quello che il cliente legge accanto al prezzo: una voce per lavorazione, non un totale unico."
        tableClassName="min-w-[760px]"
      >
        <DarkTableHeader>
          <DarkTableHead>Descrizione</DarkTableHead>
          <DarkTableHead align="right">Q.tà</DarkTableHead>
          <DarkTableHead>Unità</DarkTableHead>
          <DarkTableHead align="right">Prezzo unitario</DarkTableHead>
          <DarkTableHead align="right">Importo</DarkTableHead>
          <DarkTableHead />
        </DarkTableHeader>

        <DarkTableBody>
          {value.map((r, i) => (
            <DarkTableRow key={r.id} zebraIndex={i}>
              <DarkTableCell className="min-w-[280px]">
                <Input
                  value={r.descrizione}
                  disabled={disabled}
                  onChange={(e) => modifica(r.id, { descrizione: e.target.value })}
                  placeholder="es. Abbattimento controllato con piattaforma aerea"
                  aria-label={`Descrizione della riga ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell align="right">
                <Input
                  type="number"
                  step="any"
                  value={r.quantita}
                  disabled={disabled}
                  onChange={(e) => modifica(r.id, { quantita: Number(e.target.value) })}
                  className="w-[84px] text-right tabular-nums"
                  aria-label={`Quantità della riga ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell className="min-w-[120px]">
                <Select
                  value={r.unita}
                  disabled={disabled}
                  onValueChange={(v) => modifica(r.id, { unita: v as UnitaMisura })}
                >
                  <SelectTrigger aria-label={`Unità della riga ${i + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITA_MISURA.map((u) => (
                      <SelectItem key={u} value={u}>
                        {unitaLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DarkTableCell>

              <DarkTableCell align="right">
                {/* Nessun min={0}: uno sconto a totale è una riga negativa. */}
                <Input
                  type="number"
                  step="any"
                  value={r.prezzoUnitario}
                  disabled={disabled}
                  onChange={(e) => modifica(r.id, { prezzoUnitario: Number(e.target.value) })}
                  className="w-[120px] text-right tabular-nums"
                  aria-label={`Prezzo unitario della riga ${i + 1}`}
                />
              </DarkTableCell>

              {/* Calcolato: è testo, non un campo. Renderlo editabile aprirebbe
                  la porta a una riga il cui importo non è quantità per prezzo. */}
              <DarkTableCell align="right" tabular className="whitespace-nowrap text-white">
                {formatCurrency(calcolaImporto(r))}
              </DarkTableCell>

              <DarkTableCell align="right">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => rimuovi(r.id)}
                  aria-label={`Rimuovi la riga ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DarkTableCell>
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {!disabled && (
          <Button variant="secondary" size="sm" onClick={aggiungi}>
            <Plus className="h-3.5 w-3.5" />
            Aggiungi riga
          </Button>
        )}

        <RiepilogoTotali
          imponibile={imponibile}
          iva={iva}
          aliquotaIva={aliquotaIva}
          totale={totale}
        />
      </div>
    </div>
  );
}

/**
 * Il riepilogo in coda alle righe. Sta in fondo a destra come su un documento
 * di carta, che è dove l'occhio lo cerca.
 */
export function RiepilogoTotali({
  imponibile,
  iva,
  aliquotaIva,
  totale,
  className,
}: {
  imponibile: number;
  iva: number;
  aliquotaIva: number;
  totale: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="ml-auto w-[260px] space-y-1.5 text-[12.5px]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-white/45">Imponibile</dt>
          <dd className="tabular-nums text-white/85">{formatCurrency(imponibile)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-white/45">IVA {formatPercent(aliquotaIva)}</dt>
          <dd className="tabular-nums text-white/85">{formatCurrency(iva)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.06] pt-1.5">
          <dt className="font-semibold text-white">Totale</dt>
          <dd className="text-base font-bold tabular-nums text-white">{formatCurrency(totale)}</dd>
        </div>
      </dl>
    </div>
  );
}
