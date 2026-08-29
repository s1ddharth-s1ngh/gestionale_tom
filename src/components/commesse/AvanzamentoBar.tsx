import { cn } from '@/lib/utils';

interface AvanzamentoBarProps {
  /** 0–100. Arriva già calcolato dalle lavorazioni: qui non si calcola niente. */
  valore: number;
  /** Nasconde la percentuale a destra, per le celle strette. */
  senzaEtichetta?: boolean;
  className?: string;
}

/**
 * La barra di avanzamento di una commessa.
 *
 * Il 100% è bianco e non verde. In questo progetto «a posto» è bianco: il verde
 * è riservato agli stati che dicono incassato/completato nella colonna stato, e
 * usarlo anche qui farebbe leggere due volte la stessa informazione con due pesi
 * diversi. Sotto il 100% la barra è azzurra di brand — sta avanzando, non sta
 * andando male: una barra ambra a metà lavoro suggerirebbe un problema che non c'è.
 */
export function AvanzamentoBar({ valore, senzaEtichetta, className }: AvanzamentoBarProps) {
  // Difesa dai dati: una percentuale fuori scala allargherebbe la riga invece
  // di riempire la barra, e il difetto si vedrebbe come un bug di layout.
  const pct = Math.max(0, Math.min(100, Math.round(valore)));
  const completo = pct === 100;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            completo ? 'bg-white/80' : 'bg-[#1E6FFF]',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!senzaEtichetta && (
        <span
          className={cn(
            'w-9 shrink-0 text-right text-[11px] tabular-nums',
            completo ? 'text-white/70' : 'text-white/45',
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
