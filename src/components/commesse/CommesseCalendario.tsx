import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_PILL_ACCENT } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import { caselleDelMese, isoLocale } from './calendarioUtils';
import { formatOre } from '@/lib/formatters';
import type { CommessaConCliente } from '@/types/commessa';
import { statoCommessaAccent, statoCommessaLabel } from '@/types/commessa';

/**
 * La griglia mensile delle commesse pianificate.
 *
 * Scritta a mano invece che presa da una libreria: servono tre informazioni per
 * cella — numero, cliente e stato a colpo d'occhio — e ogni calendario pronto
 * va combattuto per togliergli il suo stile prima di poterci mettere il nostro.
 * Qui la cella è `bg-[#111111] border-white/[0.06]` come ogni altra superficie
 * dell'app, e le commesse dentro usano gli stessi accent della colonna stato:
 * chi ha imparato i colori nell'elenco li ritrova qui senza reimpararli.
 */

/** Lunedì primo: è la settimana lavorativa, e questo è un calendario di cantiere. */
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/**
 * Oltre questo numero la cella smette di elencare e passa a «+N».
 * Tre commesse riempiono già una cella di griglia mensile: la quarta la fa
 * crescere e sfonda l'allineamento di tutta la riga.
 */
const MAX_PER_CELLA = 3;

interface CommesseCalendarioProps {
  anno: number;
  mese: number;
  onCambiaMese: (anno: number, mese: number) => void;
  /** Solo le commesse con `dataPianificata` dentro la finestra del mese. */
  commesse: CommessaConCliente[];
  loading?: boolean;
}

export function CommesseCalendario({
  anno,
  mese,
  onCambiaMese,
  commesse,
  loading,
}: CommesseCalendarioProps) {
  const navigate = useNavigate();
  const oggi = isoLocale(new Date());

  const caselle = React.useMemo(() => caselleDelMese(anno, mese), [anno, mese]);

  // Un indice per data invece di un `.filter()` per cella: 42 filtri su tutte
  // le commesse a ogni render è lavoro quadratico per una tabella che non ne
  // ha bisogno.
  const perGiorno = React.useMemo(() => {
    const mappa = new Map<string, CommessaConCliente[]>();
    for (const c of commesse) {
      if (!c.dataPianificata) continue;
      const lista = mappa.get(c.dataPianificata);
      if (lista) lista.push(c);
      else mappa.set(c.dataPianificata, [c]);
    }
    return mappa;
  }, [commesse]);

  const vaiA = (delta: number) => {
    const d = new Date(anno, mese + delta, 1);
    onCambiaMese(d.getFullYear(), d.getMonth());
  };

  const tornaAOggi = () => {
    const d = new Date();
    onCambiaMese(d.getFullYear(), d.getMonth());
  };

  const meseCorrente = (() => {
    const d = new Date();
    return d.getFullYear() === anno && d.getMonth() === mese;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => vaiA(-1)} title="Mese precedente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-[13px] font-semibold capitalize text-white">
            {MESI[mese]} {anno}
          </span>
          <Button variant="ghost" size="icon" onClick={() => vaiA(1)} title="Mese successivo">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Il bottone compare solo quando serve: su questo mese non ha nulla da fare. */}
        {!meseCorrente && (
          <Button variant="secondary" onClick={tornaAOggi}>
            Oggi
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06]">
        {GIORNI.map((g) => (
          <div
            key={g}
            className="bg-[#141414] py-2 text-center text-[10px] font-medium uppercase tracking-[0.04em] text-white/40"
          >
            {g}
          </div>
        ))}

        {caselle.map((giorno) => {
          const iso = isoLocale(giorno);
          const fuoriMese = giorno.getMonth() !== mese;
          const eOggi = iso === oggi;
          const delGiorno = perGiorno.get(iso) ?? [];

          return (
            <div
              key={iso}
              className={cn(
                'min-h-[104px] bg-[#111111] p-1.5',
                // I giorni degli altri mesi restano visibili ma spenti: toglierli
                // lascerebbe buchi nella griglia, e una griglia bucata si legge
                // come un errore di rendering.
                fuoriMese && 'bg-[#0d0d0d]',
              )}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    fuoriMese ? 'text-white/20' : 'text-white/45',
                    eOggi &&
                      'flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1E6FFF] font-semibold text-white',
                  )}
                >
                  {giorno.getDate()}
                </span>
                {delGiorno.length > 0 && !loading && (
                  <span className="text-[10px] tabular-nums text-white/30">
                    {formatOre(delGiorno.reduce((t, c) => t + c.orePreviste, 0))}
                  </span>
                )}
              </div>

              {loading ? (
                <Skeleton className="h-5 rounded-md" />
              ) : (
                <div className="space-y-1">
                  {delGiorno.slice(0, MAX_PER_CELLA).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate(`/commesse/${c.id}`)}
                      // Il titolo nativo porta quello che nella cella non ci sta:
                      // in una griglia mensile lo spazio per il nome intero del
                      // cliente non esiste, e troncarlo senza rimedio lo perde.
                      title={`${c.numero} · ${c.clienteDenominazione} · ${statoCommessaLabel(c.stato)}`}
                      className={cn(
                        'block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10.5px] font-medium transition-opacity hover:opacity-80',
                        STATUS_PILL_ACCENT[statoCommessaAccent(c.stato)],
                      )}
                    >
                      {c.clienteDenominazione}
                    </button>
                  ))}
                  {delGiorno.length > MAX_PER_CELLA && (
                    <span className="block px-1.5 text-[10px] text-white/35">
                      +{delGiorno.length - MAX_PER_CELLA} altre
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
