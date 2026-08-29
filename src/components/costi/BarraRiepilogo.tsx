import type { RiepilogoVoce } from '@/types/costo';
import { formatCurrency } from '@/lib/formatters';
import { pluralize } from '@/lib/utils';

interface BarraRiepilogoProps {
  voce: RiepilogoVoce;
}

/**
 * Una riga di riepilogo: etichetta, importo, barra della quota.
 *
 * La barra è bianca e non colorata: è una proporzione, non un allarme, e in
 * questo progetto «a posto» è bianco. Il conteggio delle registrazioni sta
 * accanto alla percentuale perché è il dato che distingue una spesa grossa
 * fatta una volta da una piccola che si ripete e nessuno ha mai guardato.
 */
export function BarraRiepilogo({ voce }: BarraRiepilogoProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] text-white/85">{voce.etichetta}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">
          {formatCurrency(voce.totale, { interi: true })}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${voce.quotaPct}%` }} />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-[11px] text-white/40">
        <span className="tabular-nums">
          {voce.conteggio} {pluralize(voce.conteggio, 'registrazione', 'registrazioni')}
        </span>
        <span className="tabular-nums">{voce.quotaPct}%</span>
      </div>
    </div>
  );
}
