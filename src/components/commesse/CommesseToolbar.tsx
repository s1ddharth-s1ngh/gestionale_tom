import React from 'react';
import { Calendar, List, Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { cn } from '@/lib/utils';
import type { StatoCommessa } from '@/types/commessa';
import { STATI_COMMESSA, statoCommessaLabel } from '@/types/commessa';

/** `'tutte'` non è uno stato del dominio: è la pill che toglie il filtro. */
export type FiltroStato = StatoCommessa | 'tutte';

export type VistaCommesse = 'elenco' | 'calendario';

interface CommesseToolbarProps {
  stato: FiltroStato;
  onStato: (s: FiltroStato) => void;
  ricerca: string;
  onRicerca: (q: string) => void;
  vista: VistaCommesse;
  onVista: (v: VistaCommesse) => void;
  /** Conteggi dell'archivio intero, non della pagina a schermo. */
  conteggi?: Record<FiltroStato, number>;
  /** La ricerca è in volo: lo dice l'icona della lente, non uno spinner a parte. */
  cercando?: boolean;
  onNuova: () => void;
}

const VISTE: { id: VistaCommesse; label: string; icon: typeof List }[] = [
  { id: 'elenco', label: 'Elenco', icon: List },
  { id: 'calendario', label: 'Calendario', icon: Calendar },
];

/**
 * La barra sopra l'elenco: filtro di stato, ricerca, switch elenco/calendario.
 *
 * La ricerca non filtra mentre si digita: il valore risale al genitore che lo
 * manda al service con un ritardo. È lui a decidere quando, perché è lui che
 * possiede la query — qui resta un campo controllato e basta.
 */
export function CommesseToolbar({
  stato,
  onStato,
  ricerca,
  onRicerca,
  vista,
  onVista,
  conteggi,
  cercando,
  onNuova,
}: CommesseToolbarProps) {
  const pills: TabPillItem<FiltroStato>[] = React.useMemo(
    () => [
      { id: 'tutte', label: 'Tutte', count: conteggi?.tutte },
      ...STATI_COMMESSA.map((s) => ({
        id: s,
        label: statoCommessaLabel(s),
        count: conteggi?.[s],
        // Gli stati eccezionali spariscono quando sono vuoti: sospesa e
        // annullata sono la minoranza, e tenerle sempre a schermo allunga la
        // barra per due pill che dicono zero. Le sei del ciclo normale restano
        // sempre, o l'elenco cambia forma a ogni cambio di dato.
        hideIfZero: s === 'sospesa' || s === 'annullata',
      })),
    ],
    [conteggi],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TabPills items={pills} value={stato} onChange={onStato} />

      <div className="relative ml-auto w-full sm:w-64">
        <SearchAdornment
          busy={cercando}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
        />
        <Input
          value={ricerca}
          onChange={(e) => onRicerca(e.target.value)}
          placeholder="Numero, cliente, luogo…"
          className="pl-9"
        />
      </div>

      {/* Lo switch di vista riusa le classi delle pill invece di inventarsi un
          segmented control: è lo stesso gesto, deve avere lo stesso aspetto. */}
      <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        {VISTE.map((v) => {
          const Icon = v.icon;
          const attiva = vista === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onVista(v.id)}
              title={v.label}
              aria-pressed={attiva}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                attiva ? 'bg-white/[0.15] text-white' : 'text-white/45 hover:text-white/80',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          );
        })}
      </div>

      <Button variant="primary" onClick={onNuova}>
        <Plus className="h-4 w-4" />
        Nuova commessa
      </Button>
    </div>
  );
}
