import { Link } from 'react-router-dom';
import { Tree } from '@/components/ui/icons';
import { formatDataEstesa } from '@/lib/formatters';

/**
 * AppHeader — la barra in alto. docs/DESIGN_SYSTEM.md §5.2.
 * Altezza 56px, fondo nero, filo di separazione sotto.
 *
 * Volutamente scarno rispetto a Telebi, che qui ha selettore azienda, chat AI,
 * notifiche e dropdown del team: sono cose di un ERP multi-tenant con decine di
 * utenti. Qui gli utenti sono due e l'azienda è una.
 */
export function AppHeader() {
  const oggi = formatDataEstesa(new Date());

  return (
    <header className="z-50 flex h-14 w-full shrink-0 items-center gap-5 border-b border-white/[0.06] bg-black px-5">
      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E6FFF]/15 ring-1 ring-inset ring-[#1E6FFF]/30">
          <Tree className="h-4 w-4 text-[#7eb0ff]" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">Gestionale Tom</span>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* La data non è decorazione: chi compila un rapportino o registra un
            incasso scrive una data, e averla sott'occhio evita l'errore. */}
        <span className="hidden text-[11px] capitalize text-white/40 lg:inline">{oggi}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-white/70">
          T
        </span>
      </div>
    </header>
  );
}
