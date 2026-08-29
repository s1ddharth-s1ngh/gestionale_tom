import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import { Spinner } from '@/components/ui/spinner';
import { Search, ChevronDown, Check } from '@/components/ui/icons';
import { useClientiCompleti } from '@/hooks/useClienti';
import { tipoClienteLabel, TIPO_CLIENTE_ACCENT } from '@/types/cliente';
import { matchesSearch, cn } from '@/lib/utils';

/**
 * Scelta del cliente, con ricerca. Lo usano preventivi, commesse e fatture.
 *
 * È un Popover e non un `<Select>` di Radix perché il Select non cerca: con
 * venti clienti si scorre, con duecento no. La ricerca guarda anche il comune
 * del cantiere e il referente, non solo la ragione sociale — si cerca «Pianoro»
 * pensando al lavoro, o «Moretti» pensando all'amministratore.
 */
interface ClienteSelectProps {
  value?: string | null;
  onChange: (clienteId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClienteSelect({
  value,
  onChange,
  placeholder = 'Scegli un cliente…',
  disabled,
  className,
}: ClienteSelectProps) {
  const [aperto, setAperto] = useState(false);
  const [q, setQ] = useState('');
  const { data: clienti = [], isLoading } = useClientiCompleti();

  const selezionato = clienti.find((c) => c.id === value);

  const filtrati = useMemo(() => {
    if (!q.trim()) return clienti;
    return clienti.filter((c) =>
      matchesSearch(
        q,
        c.denominazione,
        c.referente?.nome,
        c.indirizzoFatturazione.comune,
        ...c.luoghiIntervento.map((l) => l.indirizzo.comune),
      ),
    );
  }, [clienti, q]);

  return (
    <Popover
      open={aperto}
      onOpenChange={(o) => {
        setAperto(o);
        // Il termine si azzera alla chiusura: riaprire e trovare la ricerca
        // di ieri fa credere che manchino dei clienti.
        if (!o) setQ('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm transition-colors',
            'hover:bg-white/[0.06] focus:outline-none focus-visible:border-[#1E6FFF]/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selezionato ? 'text-white' : 'text-white/25',
            className,
          )}
        >
          <span className="truncate">{selezionato?.denominazione ?? placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
      >
        <div className="border-b border-white/[0.06] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca per nome, comune, referente…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[280px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-white/45">
              <Spinner size="xs" />
              Caricamento clienti…
            </div>
          ) : filtrati.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-white/35">
              Nessun cliente corrisponde a «{q}»
            </p>
          ) : (
            filtrati.map((c) => {
              const attivo = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setAperto(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                    attivo ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-white">{c.denominazione}</p>
                    <p className="truncate text-[11px] text-white/40">
                      {c.indirizzoFatturazione.comune}
                      {c.referente?.nome && ` · ${c.referente.nome}`}
                    </p>
                  </div>
                  <StatusPill accent={TIPO_CLIENTE_ACCENT[c.tipo]} className="shrink-0">
                    {tipoClienteLabel(c.tipo)}
                  </StatusPill>
                  {attivo && <Check className="h-3.5 w-3.5 shrink-0 text-[#7eb0ff]" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
