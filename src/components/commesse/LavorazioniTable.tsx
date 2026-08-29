import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { ClipboardText, Plus, Trash2 } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { formatOre } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Lavorazione } from '@/types/commessa';
import { oreRealiDa } from '@/types/commessa';

interface LavorazioniTableProps {
  lavorazioni: Lavorazione[];
  /** Riceve l'elenco completo: chi salva decide quando, qui non si scrive nulla. */
  onChange: (lavorazioni: Lavorazione[]) => void;
  /** Su una commessa annullata le lavorazioni si leggono e basta. */
  readOnly?: boolean;
  salvataggioInCorso?: boolean;
}

/** Id temporaneo per le righe non ancora salvate: il definitivo lo dà il service. */
function idTemporaneo(): string {
  return `nuova-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Le lavorazioni della commessa: previste contro reali, con la spunta di
 * completamento.
 *
 * È l'unico punto in cui si scrivono le ore reali di tutta l'applicazione.
 * `oreReali` e `avanzamentoPct` della commessa derivano da questa tabella, e
 * questo è il motivo per cui in nessun'altra schermata esiste un campo «ore
 * reali»: due posti da cui scrivere lo stesso numero sono due numeri diversi
 * entro la settimana.
 */
export function LavorazioniTable({
  lavorazioni,
  onChange,
  readOnly,
  salvataggioInCorso,
}: LavorazioniTableProps) {
  const [nuova, setNuova] = React.useState({ descrizione: '', orePreviste: '' });

  const aggiorna = (id: string, patch: Partial<Lavorazione>) =>
    onChange(lavorazioni.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const rimuovi = (id: string) => onChange(lavorazioni.filter((l) => l.id !== id));

  const aggiungi = () => {
    const descrizione = nuova.descrizione.trim();
    if (!descrizione) return;
    onChange([
      ...lavorazioni,
      {
        id: idTemporaneo(),
        descrizione,
        orePreviste: Number(nuova.orePreviste) || 0,
        completata: false,
      },
    ]);
    setNuova({ descrizione: '', orePreviste: '' });
  };

  const totalePreviste = lavorazioni.reduce((t, l) => t + l.orePreviste, 0);
  const totaleReali = oreRealiDa(lavorazioni);

  return (
    <div className={cn('space-y-3', salvataggioInCorso && 'pointer-events-none opacity-60')}>
      <DarkTable
        empty={lavorazioni.length === 0}
        emptyIcon={ClipboardText}
        emptyMessage="Nessuna lavorazione"
        emptyDescription="Aggiungile qui sotto, o arrivano dalle righe del preventivo alla conversione."
        tableClassName="min-w-[560px]"
      >
        <DarkTableHeader>
          <DarkTableHead className="w-[44px]" align="center">
            Fatta
          </DarkTableHead>
          <DarkTableHead>Descrizione</DarkTableHead>
          <DarkTableHead align="right" className="w-[110px]">
            Previste
          </DarkTableHead>
          <DarkTableHead align="right" className="w-[110px]">
            Reali
          </DarkTableHead>
          {!readOnly && <DarkTableHead className="w-[48px]" />}
        </DarkTableHeader>

        <DarkTableBody>
          {lavorazioni.map((l, i) => (
            <DarkTableRow key={l.id} zebraIndex={i}>
              <DarkTableCell align="center">
                <Checkbox
                  checked={l.completata}
                  disabled={readOnly}
                  onCheckedChange={(v) => {
                    const completata = v === true;
                    aggiorna(l.id, {
                      completata,
                      // Spuntare una lavorazione senza aver scritto le ore
                      // consuntiva le previste: in cantiere si spunta e basta, e
                      // pretendere il numero prima della spunta significa avere
                      // commesse al 100% con zero ore lavorate.
                      oreReali: completata ? (l.oreReali ?? l.orePreviste) : l.oreReali,
                    });
                  }}
                />
              </DarkTableCell>

              <DarkTableCell>
                {readOnly ? (
                  <span className={cn(l.completata ? 'text-white/50' : 'text-white/85')}>
                    {l.descrizione}
                  </span>
                ) : (
                  <Input
                    value={l.descrizione}
                    onChange={(e) => aggiorna(l.id, { descrizione: e.target.value })}
                    className="h-8 border-transparent bg-transparent px-2 hover:border-white/[0.08] focus:border-white/[0.12]"
                  />
                )}
              </DarkTableCell>

              <DarkTableCell align="right" tabular className="text-white/50">
                {readOnly ? (
                  formatOre(l.orePreviste)
                ) : (
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={l.orePreviste}
                    onChange={(e) => aggiorna(l.id, { orePreviste: Number(e.target.value) || 0 })}
                    className="h-8 border-transparent bg-transparent px-2 text-right tabular-nums hover:border-white/[0.08] focus:border-white/[0.12]"
                  />
                )}
              </DarkTableCell>

              <DarkTableCell
                align="right"
                tabular
                className={cn(
                  (l.oreReali ?? 0) > l.orePreviste ? 'text-amber-300' : 'text-white/70',
                )}
              >
                {readOnly ? (
                  l.oreReali !== undefined ? (
                    formatOre(l.oreReali)
                  ) : (
                    '—'
                  )
                ) : (
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={l.oreReali ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      aggiorna(l.id, {
                        // Campo svuotato = "non ancora consuntivata", che è
                        // diverso da zero ore. Salvare 0 direbbe che il lavoro
                        // è stato fatto in un istante.
                        oreReali: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                      })
                    }
                    className="h-8 border-transparent bg-transparent px-2 text-right tabular-nums hover:border-white/[0.08] focus:border-white/[0.12]"
                  />
                )}
              </DarkTableCell>

              {!readOnly && (
                <DarkTableCell align="center">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Rimuovi la lavorazione"
                    onClick={() => rimuovi(l.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DarkTableCell>
              )}
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      {lavorazioni.length > 0 && (
        <div className="flex items-baseline justify-end gap-6 border-t border-white/[0.06] pt-3 text-[12px]">
          <span className="text-white/40">
            Totale previste{' '}
            <span className="ml-1 tabular-nums text-white/70">{formatOre(totalePreviste)}</span>
          </span>
          <span className="text-white/40">
            Totale reali{' '}
            <span
              className={cn(
                'ml-1 tabular-nums',
                totaleReali > totalePreviste ? 'text-amber-300' : 'text-white/70',
              )}
            >
              {formatOre(totaleReali)}
            </span>
          </span>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={nuova.descrizione}
            onChange={(e) => setNuova((n) => ({ ...n, descrizione: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aggiungi();
            }}
            placeholder="Nuova lavorazione…"
            className="h-8 min-w-[200px] flex-1"
          />
          <Input
            type="number"
            min={0}
            step="0.5"
            value={nuova.orePreviste}
            onChange={(e) => setNuova((n) => ({ ...n, orePreviste: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aggiungi();
            }}
            placeholder="Ore"
            className="h-8 w-24 text-right tabular-nums"
          />
          <Button variant="secondary" onClick={aggiungi} disabled={!nuova.descrizione.trim()}>
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      )}
    </div>
  );
}
