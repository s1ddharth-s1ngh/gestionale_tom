import { Plus, Users } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabPills, type TabPillItem } from '@/components/ui/tab-pills';
import { SearchAdornment } from '@/components/ui/search-adornment';
import { TIPI_CLIENTE, tipoClienteLabel, type TipoCliente } from '@/types/cliente';

/**
 * La riga sopra l'elenco: filtri a sinistra, conteggio e azioni a destra.
 * docs/DESIGN_SYSTEM.md §6.14.
 *
 * Tutto alla stessa altezza (h-8): pill, campo e bottoni. È la regola che fa
 * sembrare la barra una riga sola invece di tre elementi impilati male.
 */
type FiltroTipo = TipoCliente | 'tutti';

interface ClientiToolbarProps {
  tipo: FiltroTipo;
  onTipoChange: (t: FiltroTipo) => void;
  ricerca: string;
  onRicercaChange: (q: string) => void;
  /** Conteggi per pill, dalla chiave del tipo. `tutti` incluso. */
  conteggi?: Record<string, number>;
  /** Righe mostrate dopo i filtri, per il testo del conteggio. */
  mostrati: number;
  totale: number;
  cercando?: boolean;
  onNuovo: () => void;
}

export function ClientiToolbar({
  tipo,
  onTipoChange,
  ricerca,
  onRicercaChange,
  conteggi,
  mostrati,
  totale,
  cercando,
  onNuovo,
}: ClientiToolbarProps) {
  const pills: TabPillItem<FiltroTipo>[] = [
    { id: 'tutti', label: 'Tutti', icon: Users, count: conteggi?.tutti },
    ...TIPI_CLIENTE.map((t) => ({
      id: t,
      label: tipoClienteLabel(t),
      count: conteggi?.[t],
    })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TabPills items={pills} value={tipo} onChange={onTipoChange} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchAdornment
            busy={cercando}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          />
          <Input
            value={ricerca}
            onChange={(e) => onRicercaChange(e.target.value)}
            placeholder="Cerca nome, comune, P.IVA…"
            className="w-[240px] pl-9"
          />
        </div>

        {/* Conteggio come testo semplice, non come badge: accanto a una fila di
            pill un badge leggerebbe come una pill in più. */}
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-white/45">
          <span className="font-medium text-white/70">{mostrati}</span> di {totale}
        </span>

        <Button variant="primary" onClick={onNuovo}>
          <Plus className="h-3.5 w-3.5" />
          Nuovo cliente
        </Button>
      </div>
    </div>
  );
}
