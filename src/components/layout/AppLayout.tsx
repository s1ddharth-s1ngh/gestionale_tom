import { Suspense, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { PageLoader } from './PageLoader';

/**
 * AppLayout — il guscio dell'app. docs/DESIGN_SYSTEM.md §5.1.
 *
 * Sidebar + main, e basta: **non c'è header**. La barra in alto costava 56px di
 * altezza su ogni schermata per mostrare un marchio e una data, e in un
 * gestionale l'altezza è la risorsa scarsa — le tabelle vivono di righe visibili.
 * Marchio e data sono scesi nella card della sidebar, che c'è già.
 *
 * Lo scroll sta DENTRO <main>, non sul body: così la sidebar resta ferma mentre
 * la pagina scorre, senza `position: fixed` e senza compensare l'altezza a mano.
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
      <div className="relative flex h-full w-full">
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
  );
}
