import { MapPin } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { Indirizzo } from '@/types/comune';

/**
 * Un indirizzo in sola lettura, su due righe come si scrive su una busta.
 * Se è vuoto lo dice, invece di mostrare una card con dentro delle virgole.
 */
export function IndirizzoCard({
  indirizzo,
  etichetta,
  className,
}: {
  indirizzo?: Indirizzo | null;
  /** Titolino sopra, es. "Fatturazione". */
  etichetta?: string;
  className?: string;
}) {
  const vuoto =
    !indirizzo || !(indirizzo.via || indirizzo.comune || indirizzo.cap);

  return (
    <div className={cn('rounded-xl border border-white/[0.07] bg-white/[0.03] p-4', className)}>
      {etichetta && (
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.06em] text-white/40">
          {etichetta}
        </p>
      )}
      {vuoto ? (
        <p className="text-[13px] italic text-white/30">Nessun indirizzo indicato</p>
      ) : (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <div className="min-w-0 text-[13px] leading-relaxed text-white">
            <div>
              {indirizzo.via} {indirizzo.civico}
            </div>
            <div className="text-white/55">
              {indirizzo.cap} {indirizzo.comune}
              {indirizzo.provincia && ` (${indirizzo.provincia})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
