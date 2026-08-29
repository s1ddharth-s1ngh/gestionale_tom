import { lazy } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Le rotte di TUTTI i moduli sono dichiarate qui fin dal primo giorno, anche
 * quelle dei moduli non ancora scritti: puntano a file segnaposto che chi
 * prende in carico il modulo riempie.
 *
 * Non è pigrizia, è la mossa che toglie il conflitto più probabile fra le
 * quattro chat che lavorano in parallelo: nessuno deve toccare questo file per
 * far comparire la propria pagina. Si riscrive il contenuto del proprio file e
 * la rotta funziona già. Vedi docs/lavori/A-fondazione-clienti-dashboard.md §3.
 *
 * Tutto in `lazy()`: una pagina per chunk, così l'avvio non scarica moduli che
 * non si stanno guardando.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const ClientiList = lazy(() => import('@/pages/clienti/ClientiList'));
const ClienteDetail = lazy(() => import('@/pages/clienti/ClienteDetail'));

const PreventiviList = lazy(() => import('@/pages/preventivi/PreventiviList'));
const PreventivoNuovo = lazy(() => import('@/pages/preventivi/PreventivoNuovo'));
const PreventivoDetail = lazy(() => import('@/pages/preventivi/PreventivoDetail'));

const CommesseList = lazy(() => import('@/pages/commesse/CommesseList'));
const CommessaNuova = lazy(() => import('@/pages/commesse/CommessaNuova'));
const CommessaDetail = lazy(() => import('@/pages/commesse/CommessaDetail'));

const FattureList = lazy(() => import('@/pages/fatture/FattureList'));
const FatturaNuova = lazy(() => import('@/pages/fatture/FatturaNuova'));
const Scadenzario = lazy(() => import('@/pages/fatture/Scadenzario'));
const FatturaDetail = lazy(() => import('@/pages/fatture/FatturaDetail'));

const CostiList = lazy(() => import('@/pages/costi/CostiList'));
const CostoDetail = lazy(() => import('@/pages/costi/CostoDetail'));
const FornitoriList = lazy(() => import('@/pages/costi/FornitoriList'));
const FornitoreDetail = lazy(() => import('@/pages/costi/FornitoreDetail'));
// Il ciclo passivo: le fatture che RICEVIAMO. Stanno sotto /costi e non sotto
// /fatture perché è da qui che nascono i costi — una fattura fornitore
// registrata genera le righe di spesa.
const FattureFornitoreList = lazy(() => import('@/pages/costi/FattureFornitoreList'));
const FatturaFornitoreNuova = lazy(() => import('@/pages/costi/FatturaFornitoreNuova'));
const FatturaFornitoreDetail = lazy(() => import('@/pages/costi/FatturaFornitoreDetail'));
const ScadenzarioFornitori = lazy(() => import('@/pages/costi/ScadenzarioFornitori'));

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route index element={<Dashboard />} />

      <Route path="clienti">
        <Route index element={<ClientiList />} />
        <Route path=":id" element={<ClienteDetail />} />
      </Route>

      <Route path="preventivi">
        <Route index element={<PreventiviList />} />
        {/* `nuovo` prima di `:id`, o verrebbe letto come l'id "nuovo". */}
        <Route path="nuovo" element={<PreventivoNuovo />} />
        <Route path=":id" element={<PreventivoDetail />} />
      </Route>

      <Route path="commesse">
        <Route index element={<CommesseList />} />
        <Route path="nuova" element={<CommessaNuova />} />
        <Route path=":id" element={<CommessaDetail />} />
      </Route>

      <Route path="fatture">
        <Route index element={<FattureList />} />
        <Route path="nuova" element={<FatturaNuova />} />
        <Route path="scadenzario" element={<Scadenzario />} />
        <Route path=":id" element={<FatturaDetail />} />
      </Route>

      <Route path="costi">
        <Route index element={<CostiList />} />
        {/* `fornitori` prima di `:id`, stessa ragione. */}
        <Route path="fornitori" element={<FornitoriList />} />
        <Route path="fornitori/:id" element={<FornitoreDetail />} />
        {/* Il ciclo passivo sta sotto /costi e non sotto /fatture: quelle sono
            le fatture che emettiamo noi, queste quelle che riceviamo, e
            confonderle in un solo elenco e' il modo di pagarne una due volte. */}
        {/* `scadenzario` e `fatture/nuova` prima di `fatture/:id` e di `:id`,
            o verrebbero letti come identificativi. */}
        <Route path="scadenzario" element={<ScadenzarioFornitori />} />
        <Route path="fatture" element={<FattureFornitoreList />} />
        <Route path="fatture/nuova" element={<FatturaFornitoreNuova />} />
        <Route path="fatture/:id" element={<FatturaFornitoreDetail />} />
        <Route path=":id" element={<CostoDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

/**
 * `staleTime` a un minuto e un solo retry: gli stessi valori di Telebi. Con i
 * mock non cambia niente, ma il giorno che sotto c'è un'API vera il
 * comportamento è già quello giusto.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#15181B',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
            },
          }}
        />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
