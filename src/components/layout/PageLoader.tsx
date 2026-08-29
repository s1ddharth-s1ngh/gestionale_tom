import { Spinner } from '@/components/ui/spinner';

/** Fallback del Suspense mentre il chunk di una pagina arriva. */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" className="text-white/25" />
    </div>
  );
}
