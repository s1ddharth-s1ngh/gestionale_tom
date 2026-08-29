import { formatOre } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface OreConfrontoProps {
  orePreviste: number;
  /** Somma delle lavorazioni chiuse: zero finché non se ne spunta una. */
  oreReali: number;
  className?: string;
}

/**
 * Previste contro reali, con lo scostamento.
 *
 * Lo scostamento si colora in ambra solo quando si è sforato il previsto:
 * «in linea» e «sotto il previsto» restano bianchi. Mai verde — in questo
 * progetto lo stato «a posto» è bianco (ONBOARDING-GRAFICO §8), e un
 * risparmio di ore in verde suggerirebbe un merito che nessuno ha misurato.
 */
export function OreConfronto({ orePreviste, oreReali, className }: OreConfrontoProps) {
  const scostamento = oreReali - orePreviste;
  const sopra = oreReali > 0 && scostamento > 0;

  // La barra delle reali si misura sul massimo fra le due: se si sfora, il
  // previsto smette di essere il fondo scala e la barra uscirebbe dalla traccia.
  const fondoScala = Math.max(orePreviste, oreReali, 1);

  return (
    <div className={cn('space-y-3', className)}>
      <Riga label="Previste" valore={orePreviste} fondoScala={fondoScala} muta />
      <Riga label="Reali" valore={oreReali} fondoScala={fondoScala} ambra={sopra} />

      <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
          Scostamento
        </span>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            sopra ? 'text-amber-300' : 'text-white',
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

function Riga({
  label,
  valore,
  fondoScala,
  muta,
  ambra,
}: {
  label: string;
  valore: number;
  fondoScala: number;
  muta?: boolean;
  ambra?: boolean;
}) {
  const pct = Math.round((valore / fondoScala) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">
          {label}
        </span>
        <span
          className={cn(
            'text-[13px] tabular-nums',
            ambra ? 'text-amber-300' : muta ? 'text-white/70' : 'text-white',
          )}
        >
          {formatOre(valore)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            ambra ? 'bg-amber-400/80' : muta ? 'bg-white/25' : 'bg-white/70',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
