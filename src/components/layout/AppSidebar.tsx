import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from '@/components/ui/icons';
import { NAV_ITEMS, isItemActive } from '@/lib/navigation';
import { formatDataEstesa } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/**
 * AppSidebar — la colonna di navigazione. docs/DESIGN_SYSTEM.md §5.3.
 *
 * Una card che galleggia sul canvas nero, con le voci come pill. Telebi ne ha
 * DUE impilate (le sue 7 divisioni + le voci dell'area attiva): Tom ha un'area
 * sola, quindi la prima card non serve. Geometria e classi delle pill restano
 * identiche.
 *
 * Da quando l'header è sparito (§5.2) questa card è l'intera cornice dell'app:
 * marchio in testa, voci in mezzo, data e utente in fondo. Tre fasce separate da
 * un filo, così si leggono come tre cose diverse e non come una lista sola.
 *
 * Collassabile a w-16 (solo il chip icona, con tooltip nativo): la navigazione
 * non sparisce mai, cambia solo larghezza. Lo stato sopravvive al reload.
 *
 * Nota sulla voce attiva: è una pill CHIARA (`bg-neutral-200`), non blu. Il blu
 * è delle pill di tab. Sono due cose diverse e non vanno confuse.
 */

const CARD =
  'rounded-xl bg-[#121212] border border-white/[0.06] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]';

const STORAGE_KEY = 'tom-sidebar-collapsed';

/**
 * `h-10` fissa in entrambi gli stati: cambia solo la larghezza, così il
 * collasso non fa saltare l'altezza della card né il ritmo della colonna.
 */
function pillClass(active: boolean, collapsed: boolean): string {
  return cn(
    'group flex h-10 w-full items-center rounded-full font-medium transition-colors',
    collapsed ? 'justify-center px-1' : 'gap-2.5 pl-1.5 pr-3',
    active
      ? 'bg-neutral-200 text-neutral-900'
      : 'text-white/70 hover:bg-white/[0.05] hover:text-white',
  );
}

function pillChipClass(active: boolean): string {
  return cn(
    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors',
    active ? 'bg-neutral-900/10 text-neutral-900' : 'bg-white/[0.07] text-white',
  );
}

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const oggi = formatDataEstesa(new Date());

  return (
    // Sotto md la sidebar non c'è: le pagine scorrono a tutta larghezza.
    <div className="relative z-30 hidden h-full flex-shrink-0 py-3 pl-3 md:block">
      <aside
        className={cn(
          'flex h-full flex-col text-white transition-[width] duration-300',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn(CARD, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
          {/* Fascia 1 — il marchio. Allineato a sinistra come le voci sotto:
              in un gestionale la colonna di sinistra è una sola. */}
          <div
            className={cn(
              'flex flex-shrink-0 items-center border-b border-white/[0.06] py-3.5',
              collapsed ? 'justify-center px-2' : 'gap-2 px-4',
            )}
          >
            {!collapsed && (
              <Link
                to="/"
                className="truncate text-[15px] leading-none tracking-tight text-white/50 transition-colors hover:text-white/70"
              >
                Gestionale <span className="font-semibold text-white">Tom</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Espandi menu' : 'Comprimi menu'}
              aria-label={collapsed ? 'Espandi menu' : 'Comprimi menu'}
              aria-expanded={!collapsed}
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white',
                !collapsed && 'ml-auto',
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Fascia 2 — la navigazione. */}
          <nav
            className={cn(
              'flex-1 space-y-1 overflow-y-auto',
              collapsed ? 'px-2 py-3' : 'p-3',
            )}
          >
            {!collapsed && (
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Menu
              </p>
            )}
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(location.pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={pillClass(active, collapsed)}
                >
                  <span className={pillChipClass(active)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {!collapsed && (
                    <span className="truncate text-[13px] tracking-[-0.2px]">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Fascia 3 — utente e data. La data non è decorazione: chi compila un
              rapportino o registra un incasso scrive una data, e averla
              sott'occhio evita l'errore. Stava nell'header, ora sta qui. */}
          <div
            className={cn(
              'flex flex-shrink-0 items-center border-t border-white/[0.06] py-3',
              collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
            )}
          >
            <span
              title={collapsed ? oggi : undefined}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-white/70"
            >
              T
            </span>
            {!collapsed && (
              <span className="truncate text-[11px] capitalize text-white/40">{oggi}</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
