import { formatOre } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Commessa } from '@/types/commessa';
import { scostamentoOre } from '@/types/commessa';

interface OreConfrontoProps {
  commessa: Pick<Commessa, 'orePreviste' | 'oreReali'>;
  className?: string;
}

/**
 * Ore previste contro ore reali, con lo scostamento.
 *
 * Due barre sovrapposte e non affiancate: il confronto è «quanto sono uscito
 * dal binario», e due barre una accanto all'altra fanno leggere due grandezze
 * indipendenti invece di una misura e il suo riferimento.
 *
 * Lo scostamento è ambra sopra il previsto e bianco in linea. Mai verde:
 * rientrare nelle ore è la norma e non un risultato, e colorarlo di verde
 * trasformerebbe ogni commessa ordinaria in una piccola vittoria — col
 * risultato che l'ambra, a furia di stare accanto al verde, smette di
 * significare "guarda qui".
 */
export function OreConfronto({ commessa, className }: OreConfrontoProps) {
  const { orePreviste, oreReali } = commessa;
  const scostamento = scostamentoOre(commessa);
  const oltre = scostamento > 0;

  // La scala è il massimo fra le due: se le reali sfondano il previsto, la
  // barra deve mostrare DI QUANTO, non fermarsi al 100% e nascondere lo sforo.
  const scala = Math.max(orePreviste, oreReali, 1);
  const pctPreviste = (orePreviste / scala) * 100;
  const pctReali = (oreReali / scala) * 100;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <Barra
          etichetta="Previste"
          valore={orePreviste}
          pct={pctPreviste}
          classeBarra="bg-white/25"
        />
        <Barra
          etichetta="Reali"
          valore={oreReali}
          pct={pctReali}
          classeBarra={oltre ? 'bg-amber-400/80' : 'bg-[#1E6FFF]'}
          // Zero ore consuntivate non è "nessun dato": è una commessa che non è
          // ancora partita, e va detto invece di lasciare una barra vuota muta.
          nota={oreReali === 0 ? 'nessuna ora consuntivata' : undefined}
        />
      </div>

      <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[11px] uppercase tracking-wider text-white/40">Scostamento</span>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            oltre ? 'text-amber-300' : 'text-white/70',
          )}
        >
          {oreReali === 0
            ? '—'
            : `${scostamento > 0 ? '+' : ''}${formatOre(scostamento)}`}
        </span>
      </div>
    </div>
  );
}

function Barra({
  etichetta,
  valore,
  pct,
  classeBarra,
  nota,
}: {
  etichetta: string;
  valore: number;
  pct: number;
  classeBarra: string;
  nota?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-white/45">
          {etichetta}
          {nota && <span className="ml-1.5 text-white/25">· {nota}</span>}
        </span>
        <span className="text-[12px] tabular-nums text-white/70">{formatOre(valore)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', classeBarra)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
