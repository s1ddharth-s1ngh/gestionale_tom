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
import { useMezzi } from '@/hooks/useCosti';
import { useCommesse } from '@/hooks/useCommesse';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CategoriaCosto, TipoNoleggio } from '@/types/costo';
import {
  CATEGORIE_COSTO,
  TIPI_NOLEGGIO,
  categoriaCostoLabel,
  tipoNoleggioLabel,
} from '@/types/costo';
import type { RigaFatturaFornitore } from '@/types/fatturaFornitore';
import { calcolaTotaliFattura, imponibileRiga } from '@/types/fatturaFornitore';

/** Radix non accetta la stringa vuota come valore di una voce. */
const NESSUNO = '__nessuno__';

/** Le aliquote che si incontrano davvero su una fattura di questo settore. */
const ALIQUOTE = [22, 10, 4, 0];

interface RigheFatturaFornitoreTableProps {
  value: RigaFatturaFornitore[];
  onChange?: (righe: RigaFatturaFornitore[]) => void;
  /** Sola lettura: il dettaglio di una fattura già registrata non si modifica qui. */
  readOnly?: boolean;
}

/**
 * Le righe della fattura del fornitore.
 *
 * Ogni riga porta la sua **categoria di costo** e la sua **aliquota**, e non è
 * un dettaglio: la fattura di un noleggiatore contiene il noleggio e il
 * trasporto, che diventano due righe di `costi` diverse; e una fattura può
 * avere il 22% su una voce e il 10% su una manutenzione agevolata. Una
 * categoria o un'aliquota in testata costringerebbero a scegliere quale delle
 * due mentire.
 *
 * Mezzo e commessa si scelgono qui perché è qui che si sa a cosa si riferisce
 * la spesa: chiederli dopo, sul costo generato, significherebbe rileggere la
 * fattura per ricordarselo.
 */
export function RigheFatturaFornitoreTable({
  value,
  onChange,
  readOnly,
}: RigheFatturaFornitoreTableProps) {
  const mezzi = useMezzi();
  const commesse = useCommesse({ perPagina: 100 });
  const { imponibile, iva, totale, fasce } = calcolaTotaliFattura(value);

  const modifica = (id: string, patch: Partial<RigaFatturaFornitore>) => {
    onChange?.(value.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const aggiungi = () => {
    onChange?.([
      ...value,
      {
        id: `riga-${Date.now().toString(36)}`,
        descrizione: '',
        quantita: 1,
        prezzoUnitario: 0,
        aliquotaIva: 22,
        categoria: 'materiali',
      },
    ]);
  };

  const rimuovi = (id: string) => onChange?.(value.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      <DarkTable
        empty={value.length === 0}
        emptyIcon={ClipboardText}
        emptyMessage="Nessuna riga"
        emptyDescription="Le righe della fattura diventano righe di costo: una per ogni voce che il fornitore ha addebitato."
        tableClassName="min-w-[1040px]"
      >
        <DarkTableHeader>
          <DarkTableHead>Descrizione</DarkTableHead>
          <DarkTableHead>Categoria</DarkTableHead>
          <DarkTableHead align="right">Q.tà</DarkTableHead>
          <DarkTableHead align="right">Prezzo</DarkTableHead>
          <DarkTableHead align="right">IVA</DarkTableHead>
          <DarkTableHead>Mezzo / commessa</DarkTableHead>
          <DarkTableHead align="right">Imponibile</DarkTableHead>
          {!readOnly && <DarkTableHead />}
        </DarkTableHeader>

        <DarkTableBody>
          {value.map((r, i) => {
            // Gli stessi due vincoli che `public.costi` impone con un CHECK. Si
            // segnalano qui, mentre si compila, invece di far fallire la
            // generazione dopo — quando il messaggio nomina un vincolo e non
            // dice quale riga sistemare.
            const mancaMezzo = r.categoria === 'carburante' && !r.mezzoId;
            const mancaNoleggio = r.categoria === 'noleggio' && !r.tipoNoleggio;

            return (
              <DarkTableRow key={r.id} zebraIndex={i}>
                <DarkTableCell className="min-w-[240px]">
                  {readOnly ? (
                    <span className="text-white">{r.descrizione || '—'}</span>
                  ) : (
                    <Input
                      value={r.descrizione}
                      onChange={(e) => modifica(r.id, { descrizione: e.target.value })}
                      placeholder="es. Noleggio piattaforma 22 m"
                      aria-label={`Descrizione della riga ${i + 1}`}
                    />
                  )}
                </DarkTableCell>

                <DarkTableCell className="min-w-[150px]">
                  {readOnly ? (
                    <span className="text-white/70">{categoriaCostoLabel(r.categoria)}</span>
                  ) : (
                    <Select
                      value={r.categoria}
                      onValueChange={(v) =>
                        modifica(r.id, {
                          categoria: v as CategoriaCosto,
                          // Cambiando categoria i campi che valevano solo per la
                          // precedente si azzerano: un tipo di noleggio appeso a
                          // una riga di carburante è un dato che nessuna
                          // schermata mostrerà mai, ma che il DB rifiuterebbe.
                          tipoNoleggio: v === 'noleggio' ? r.tipoNoleggio : undefined,
                          mezzoId: v === 'carburante' ? r.mezzoId : undefined,
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Categoria della riga ${i + 1}`}
                        className={cn((mancaMezzo || mancaNoleggio) && 'border-amber-500/50')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIE_COSTO.map((c) => (
                          <SelectItem key={c} value={c}>
                            {categoriaCostoLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </DarkTableCell>

                <DarkTableCell align="right">
                  {readOnly ? (
                    <span className="tabular-nums text-white/70">{r.quantita}</span>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      value={r.quantita}
                      onChange={(e) => modifica(r.id, { quantita: Number(e.target.value) })}
                      className="w-[80px] text-right tabular-nums"
                      aria-label={`Quantità della riga ${i + 1}`}
                    />
                  )}
                </DarkTableCell>

                <DarkTableCell align="right">
                  {readOnly ? (
                    <span className="tabular-nums text-white/70">
                      {formatCurrency(r.prezzoUnitario)}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      value={r.prezzoUnitario}
                      onChange={(e) => modifica(r.id, { prezzoUnitario: Number(e.target.value) })}
                      className="w-[110px] text-right tabular-nums"
                      aria-label={`Prezzo unitario della riga ${i + 1}`}
                    />
                  )}
                </DarkTableCell>

                <DarkTableCell align="right" className="min-w-[90px]">
                  {readOnly ? (
                    <span className="tabular-nums text-white/70">
                      {formatPercent(r.aliquotaIva)}
                    </span>
                  ) : (
                    <Select
                      value={String(r.aliquotaIva)}
                      onValueChange={(v) => modifica(r.id, { aliquotaIva: Number(v) })}
                    >
                      <SelectTrigger aria-label={`Aliquota della riga ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALIQUOTE.map((a) => (
                          <SelectItem key={a} value={String(a)}>
                            {a}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </DarkTableCell>

                <DarkTableCell className="min-w-[200px]">
                  {readOnly ? (
                    <span className="text-white/55">
                      {mezzi.data?.find((m) => m.id === r.mezzoId)?.targa ??
                        (r.tipoNoleggio ? tipoNoleggioLabel(r.tipoNoleggio) : '—')}
                    </span>
                  ) : r.categoria === 'carburante' ? (
                    <Select
                      value={r.mezzoId ?? NESSUNO}
                      onValueChange={(v) =>
                        modifica(r.id, { mezzoId: v === NESSUNO ? undefined : v })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Mezzo della riga ${i + 1}`}
                        className={cn(mancaMezzo && 'border-amber-500/50')}
                      >
                        <SelectValue placeholder="Scegli il mezzo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NESSUNO}>—</SelectItem>
                        {(mezzi.data ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.targa} · {m.descrizione}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : r.categoria === 'noleggio' ? (
                    <Select
                      value={r.tipoNoleggio ?? NESSUNO}
                      onValueChange={(v) =>
                        modifica(r.id, {
                          tipoNoleggio: v === NESSUNO ? undefined : (v as TipoNoleggio),
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Tipo di noleggio della riga ${i + 1}`}
                        className={cn(mancaNoleggio && 'border-amber-500/50')}
                      >
                        <SelectValue placeholder="Che cosa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NESSUNO}>—</SelectItem>
                        {TIPI_NOLEGGIO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {tipoNoleggioLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={r.commessaId ?? NESSUNO}
                      onValueChange={(v) =>
                        modifica(r.id, { commessaId: v === NESSUNO ? undefined : v })
                      }
                    >
                      <SelectTrigger aria-label={`Commessa della riga ${i + 1}`}>
                        <SelectValue placeholder="Commessa (facoltativa)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NESSUNO}>Costo generale</SelectItem>
                        {(commesse.data?.righe ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.numero}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </DarkTableCell>

                <DarkTableCell align="right" tabular className="whitespace-nowrap text-white">
                  {formatCurrency(imponibileRiga(r))}
                </DarkTableCell>

                {!readOnly && (
                  <DarkTableCell align="right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rimuovi(r.id)}
                      aria-label={`Rimuovi la riga ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DarkTableCell>
                )}
              </DarkTableRow>
            );
          })}
        </DarkTableBody>
      </DarkTable>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {!readOnly && (
          <Button variant="secondary" size="sm" onClick={aggiungi}>
            <Plus className="h-3.5 w-3.5" />
            Aggiungi riga
          </Button>
        )}

        <RiepilogoIva imponibile={imponibile} iva={iva} totale={totale} fasce={fasce} />
      </div>
    </div>
  );
}

/**
 * Il riepilogo IVA in coda, **per aliquota**.
 *
 * È la parte che si confronta col documento cartaceo del fornitore quando i
 * totali non tornano: senza lo spaccato per aliquota, uno scarto di qualche
 * euro resta inspiegabile e si finisce per riscriverlo a mano.
 */
export function RiepilogoIva({
  imponibile,
  iva,
  totale,
  fasce,
  className,
}: {
  imponibile: number;
  iva: number;
  totale: number;
  fasce: { aliquota: number; imponibile: number; iva: number }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="ml-auto w-[300px] space-y-1.5 text-[12.5px]">
        {fasce.map((f) => (
          <div key={f.aliquota} className="flex items-baseline justify-between gap-4">
            <dt className="text-white/45">
              Imponibile {formatPercent(f.aliquota)}
              <span className="ml-1.5 text-white/30">IVA {formatCurrency(f.iva)}</span>
            </dt>
            <dd className="tabular-nums text-white/85">{formatCurrency(f.imponibile)}</dd>
          </div>
        ))}

        {fasce.length > 1 && (
          <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.06] pt-1.5">
            <dt className="text-white/45">Totale imponibile</dt>
            <dd className="tabular-nums text-white/85">{formatCurrency(imponibile)}</dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-white/45">IVA</dt>
          <dd className="tabular-nums text-white/85">{formatCurrency(iva)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.06] pt-1.5">
          <dt className="font-semibold text-white">Totale documento</dt>
          <dd className="text-base font-bold tabular-nums text-white">{formatCurrency(totale)}</dd>
        </div>

        {/* Il promemoria che evita l'errore più comune del ciclo passivo: solo
            l'imponibile è costo, perché l'IVA sugli acquisti si detrae. */}
        <p className="pt-1 text-[11px] leading-relaxed text-white/35">
          Diventa costo il solo imponibile: l’IVA sugli acquisti si detrae.
        </p>
      </dl>
    </div>
  );
}
