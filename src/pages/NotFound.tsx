import { Link } from 'react-router-dom';
import { AlertCircle } from '@/components/ui/icons';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04]">
        <AlertCircle className="h-5 w-5 text-white/30" />
      </div>
      <p className="text-2xl font-bold tracking-tight text-white">Pagina non trovata</p>
      <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-white/35">
        L'indirizzo non corrisponde a nessuna schermata del gestionale.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex h-8 items-center rounded-full bg-[#1E6FFF] px-3 text-xs font-medium text-white transition-colors hover:bg-[#1E6FFF]/90"
      >
        Torna alla home
      </Link>
    </div>
  );
}
