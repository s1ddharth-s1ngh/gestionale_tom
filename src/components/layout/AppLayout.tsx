import { Suspense, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { PageLoader } from './PageLoader';

/**
 * AppLayout — il guscio dell'app. docs/DESIGN_SYSTEM.md §5.1.
 *
 * Header + sidebar + main. Lo scroll sta DENTRO <main>, non sul body: così la
 * sidebar e l'header restano fermi mentre la pagina scorre, senza `position:
 * fixed` e senza compensare l'altezza a mano.
 *
 * Il padding del guscio è `px-3 py-3`. Le pagine mettono `p-3` sulla propria
 * radice e il contenuto sta a 24px dai bordi, uguale ovunque: è LA regola di
 * spaziatura del progetto (DESIGN_SYSTEM §4.1), e le varianti — p-6, p-4 sm:p-6,
 * px-4 — non esistono.
 */
export function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  // Cambio pagina → torna in cima. Senza, si atterra su una pagina nuova già
  // scrollata a metà, che si legge come un caricamento andato storto.
  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      <div className="relative flex h-full w-full flex-col">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main ref={mainRef} className="flex-1 overflow-y-auto">
            <div className="w-full px-3 py-3 pb-4">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
