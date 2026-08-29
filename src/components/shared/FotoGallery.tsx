import { useState } from 'react';
import { X, ImageIcon } from '@/components/ui/icons';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { formatDataBreve } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Foto } from '@/types/comune';

/**
 * Griglia di foto con ingrandimento al clic.
 *
 * Il lightbox è un overlay a mano e non un Dialog di Radix: qui serve solo
 * un'immagine su fondo scuro che si chiude ovunque si clicchi, e il Dialog
 * porterebbe focus trap e chiusure che qui non servono.
 */
interface FotoGalleryProps {
  foto: Foto[];
  /** Quando presente, ogni miniatura ha la sua X. */
  onRimuovi?: (id: string) => void;
  /** Testo dello stato vuoto, per distinguere "prima" da "dopo". */
  messaggioVuoto?: string;
  className?: string;
}

export function FotoGallery({ foto, onRimuovi, messaggioVuoto, className }: FotoGalleryProps) {
  const [ingrandita, setIngrandita] = useState<Foto | null>(null);

  if (foto.length === 0) {
    return (
      <TableEmptyState
        compact
        icon={ImageIcon}
        title={messaggioVuoto ?? 'Nessuna foto'}
        className={className}
      />
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {foto.map((f) => (
          <div
            key={f.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            <button
              type="button"
              onClick={() => setIngrandita(f)}
              className="h-full w-full"
              title={f.didascalia}
            >
              <img
                src={f.dataUrl}
                alt={f.didascalia ?? 'Foto'}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>

            {onRimuovi && (
              <button
                type="button"
                onClick={() => onRimuovi(f.id)}
                title="Rimuovi la foto"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/70 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
              <p className="truncate text-[10px] text-white/70">
                {formatDataBreve(f.caricataIl)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {ingrandita && (
        <div
          onClick={() => setIngrandita(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-6"
        >
          <img
            src={ingrandita.dataUrl}
            alt={ingrandita.didascalia ?? 'Foto'}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => setIngrandita(null)}
            aria-label="Chiudi"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/70 transition-colors hover:bg-white/[0.15] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
