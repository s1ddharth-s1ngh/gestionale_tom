import { useRef, useState } from 'react';
import { Camera, Upload } from '@/components/ui/icons';
import { cn, nuovoId } from '@/lib/utils';
import type { Foto } from '@/types/comune';

/**
 * Caricamento foto — sopralluoghi e cantieri.
 *
 * Scritto a mano invece che con `react-dropzone`: sono un `<input type="file">`
 * nascosto e quattro handler di drag, e in cambio non si porta dentro una
 * dipendenza da vestire. Vedi docs/lavori/A-fondazione-clienti-dashboard.md §3.
 *
 * Le immagini diventano `data:` URI. Senza backend è l'unico modo perché
 * sopravvivano alla navigazione, e il giorno che c'è uno storage vero cambia
 * solo cosa si scrive in `Foto.dataUrl`.
 */

/** Oltre questa soglia il data: URI gonfia troppo la memoria della sessione. */
const MAX_MB = 8;

interface FotoUploaderProps {
  foto: Foto[];
  onChange: (foto: Foto[]) => void;
  /** Etichetta del riquadro, es. "Foto prima dell'intervento". */
  etichetta?: string;
  disabled?: boolean;
  className?: string;
}

function leggiComeDataUrl(file: File): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const r = new FileReader();
    r.onload = () => risolvi(String(r.result));
    r.onerror = () => rifiuta(new Error(`Impossibile leggere ${file.name}`));
    r.readAsDataURL(file);
  });
}

export function FotoUploader({
  foto,
  onChange,
  etichetta = 'Trascina le foto qui, o clicca per sceglierle',
  disabled,
  className,
}: FotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sopra, setSopra] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiungi(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);

    const immagini = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const scartatiPerTipo = files.length - immagini.length;

    const buoni = immagini.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    const scartatiPerPeso = immagini.length - buoni.length;

    // Si dice cosa è stato scartato e perché: senza, chi trascina cinque file
    // e ne vede comparire tre pensa che il caricamento sia rotto.
    const avvisi: string[] = [];
    if (scartatiPerTipo) avvisi.push(`${scartatiPerTipo} file non sono immagini`);
    if (scartatiPerPeso) avvisi.push(`${scartatiPerPeso} superano ${MAX_MB} MB`);
    if (avvisi.length) setErrore(`Scartati: ${avvisi.join(', ')}.`);

    const nuove = await Promise.all(
      buoni.map(async (f) => ({
        id: nuovoId(),
        dataUrl: await leggiComeDataUrl(f),
        didascalia: f.name,
        caricataIl: new Date().toISOString(),
      })),
    );

    if (nuove.length) onChange([...foto, ...nuove]);
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setSopra(true);
        }}
        onDragLeave={() => setSopra(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSopra(false);
          if (!disabled) void aggiungi(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
          sopra
            ? 'border-[#1E6FFF]/60 bg-[#1E6FFF]/[0.08]'
            : 'border-white/[0.12] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04]">
          {sopra ? (
            <Upload className="h-4 w-4 text-[#7eb0ff]" />
          ) : (
            <Camera className="h-4 w-4 text-white/30" />
          )}
        </div>
        <p className="text-[12px] text-white/55">{etichetta}</p>
        <p className="text-[11px] text-white/30">JPG o PNG, fino a {MAX_MB} MB l'una</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void aggiungi(e.target.files);
          // Azzerare il valore permette di ricaricare lo stesso file due volte:
          // senza, il secondo tentativo non emette alcun evento.
          e.target.value = '';
        }}
      />

      {errore && <p className="mt-2 text-[11px] text-amber-200/90">{errore}</p>}
    </div>
  );
}
