import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { statoCommessaAccent, statoCommessaLabel, type Commessa } from '@/types/commessa';
import { cn } from '@/lib/utils';

interface CommesseCalendarioProps {
  commesse: Commessa[];
  /** Un giorno qualsiasi del mese mostrato. */
  mese: Date;
  onMeseChange: (mese: Date) => void;
  /** Cosa scrivere dentro la cella: il chiamante conosce i clienti, il calendario no. */
  etichetta: (commessa: Commessa) => string;
  onApri: (id: string) => void;
  className?: string;
}

/** La settimana italiana parte da lunedì: `getDay()` mette la domenica a 0. */
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Oltre tre pill la cella si allunga e la griglia perde la forma di mese. */
const MAX_PILL_PER_CELLA = 3;

/** Chiave giorno in ora locale: `toISOString()` sposta indietro di un fuso e
 *  una commessa dell'1 finirebbe nel 31 del mese prima. */
function chiaveGiorno(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Griglia mensile con le commesse pianificate dentro le celle.
 *
 * Costruita con i token del design system invece che con una libreria di
 * calendario: servono tre informazioni per cella (giorno, stato, cliente) e
 * ogni calendario pronto va poi combattuto per togliergli il suo stile.
 */
export function CommesseCalendario({
  commesse,
  mese,
  onMeseChange,
  etichetta,
  onApri,
  className,
}: CommesseCalendarioProps) {
  const celle = useMemo(() => costruisciGriglia(mese), [mese]);

  const perGiorno = useMemo(() => {
    const mappa = new Map<string, Commessa[]>();
    for (const c of commesse) {
      if (!c.dataPianificata) continue;
      const chiave = c.dataPianificata.slice(0, 10);
      const elenco = mappa.get(chiave);
      if (elenco) elenco.push(c);
      else mappa.set(chiave, [c]);
    }
    return mappa;
  }, [commesse]);

  const oggi = chiaveGiorno(new Date());
  const titolo = mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div className={cn('overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111]', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-base font-semibold capitalize text-white">{titolo}</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onMeseChange(new Date())}>
            Oggi
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Mese precedente"
            onClick={() => onMeseChange(new Date(mese.getFullYear(), mese.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Mese successivo"
            onClick={() => onMeseChange(new Date(mese.getFullYear(), mese.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {GIORNI.map((g) => (
          <div
            key={g}
            className="px-2 py-2 text-[10px] font-medium uppercase tracking-[0.04em] text-white/40"
          >
            {g}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celle.map((giorno) => {
          const chiave = chiaveGiorno(giorno);
          const delMese = giorno.getMonth() === mese.getMonth();
          const pianificate = perGiorno.get(chiave) ?? [];
          const nascoste = pianificate.length - MAX_PILL_PER_CELLA;

          return (
            <div
              key={chiave}
              className={cn(
                'min-h-[104px] space-y-1 border-b border-r border-white/[0.06] p-1.5',
                // I giorni degli altri mesi restano visibili ma spenti: toglierli
                // lascerebbe buchi nella griglia e si perde il senso della settimana.
                !delMese && 'bg-white/[0.015]',
              )}
            >
              <div
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums',
                  chiave === oggi
                    ? 'bg-[#1E6FFF] font-semibold text-white'
                    : delMese
                      ? 'text-white/70'
                      : 'text-white/25',
                )}
              >
                {giorno.getDate()}
              </div>

              {pianificate.slice(0, MAX_PILL_PER_CELLA).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onApri(c.id)}
                  title={`${c.numero} · ${statoCommessaLabel(c.stato)}`}
                  className="block w-full text-left transition-opacity hover:opacity-80"
                >
                  <StatusPill
                    accent={statoCommessaAccent(c.stato)}
                    variant="dot"
                    className="w-full justify-start"
                  >
                    <span className="truncate">{etichetta(c)}</span>
                  </StatusPill>
                </button>
              ))}

              {nascoste > 0 && (
                <p className="pl-1 text-[10px] tabular-nums text-white/35">+{nascoste} altre</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sempre 6 righe da 7 giorni: a righe variabili la griglia salta di altezza
 *  cambiando mese, e il click su «successivo» sposta il bottone sotto il dito. */
function costruisciGriglia(mese: Date): Date[] {
  const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
  const offsetLunedi = (primo.getDay() + 6) % 7;
  const partenza = new Date(primo);
  partenza.setDate(primo.getDate() - offsetLunedi);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(partenza);
    d.setDate(partenza.getDate() + i);
    return d;
  });
}
