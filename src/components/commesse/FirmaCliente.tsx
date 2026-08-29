import React from 'react';
import { Button } from '@/components/ui/button';
import { Signature } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface FirmaClienteProps {
  /** dataUrl della firma già raccolta, se c'è. */
  valore?: string;
  onChange: (dataUrl: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

/** Il canvas è a densità doppia: a densità 1 la firma esce sgranata sui portatili. */
const SCALA = 2;
const ALTEZZA = 160;

/**
 * La firma del cliente, raccolta col dito o col mouse sul posto.
 *
 * Un `<canvas>` con i listener di pointer invece di una libreria: sono sessanta
 * righe, e una dipendenza in più per sessanta righe è una dipendenza che poi va
 * aggiornata per sempre. I pointer event coprono dito, penna e mouse con lo
 * stesso codice — è l'unico modo per cui questo funziona sia sul tablet in
 * cantiere sia sul portatile in ufficio.
 *
 * Il risultato è un dataUrl PNG, che è già la forma in cui `Foto` conserva le
 * immagini: il giorno che c'è uno storage vero cambia dove finisce, non cosa è.
 */
export function FirmaCliente({ valore, onChange, disabled, className }: FirmaClienteProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const disegnando = React.useRef(false);
  const [vuoto, setVuoto] = React.useState(!valore);

  /** Prepara il canvas e ridisegna la firma già salvata. */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const larghezza = canvas.clientWidth;
    canvas.width = larghezza * SCALA;
    canvas.height = ALTEZZA * SCALA;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(SCALA, SCALA);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Bianco su fondo trasparente: la firma vive dentro una scheda scura, e un
    // tratto nero sarebbe invisibile finché qualcuno non la stampa.
    ctx.strokeStyle = '#ffffff';

    if (valore) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, larghezza, ALTEZZA);
      img.src = valore;
      setVuoto(false);
    }
    // Solo al montaggio e al cambio della firma salvata: ridimensionare il
    // canvas lo azzera, e rifarlo a ogni render cancellerebbe il tratto in corso.
  }, [valore]);

  const posizione = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const inizia = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // La cattura tiene il tratto anche quando il dito esce dal riquadro: senza,
    // una firma che sborda si spezza a metà e va rifatta.
    e.currentTarget.setPointerCapture(e.pointerId);
    disegnando.current = true;
    const { x, y } = posizione(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const muovi = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!disegnando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posizione(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vuoto) setVuoto(false);
  };

  const finisci = () => {
    if (!disegnando.current) return;
    disegnando.current = false;
    // Si risale al genitore alla fine del tratto e non a ogni pixel: un dataUrl
    // per movimento del dito significa migliaia di stringhe base64 al secondo.
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) onChange(dataUrl);
  };

  const pulisci = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVuoto(true);
    onChange(undefined);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0d]">
        <canvas
          ref={canvasRef}
          style={{ height: ALTEZZA }}
          className={cn('w-full touch-none', disabled ? 'cursor-not-allowed' : 'cursor-crosshair')}
          onPointerDown={inizia}
          onPointerMove={muovi}
          onPointerUp={finisci}
          onPointerCancel={finisci}
        />
        {vuoto && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/25">
            <Signature className="h-6 w-6" />
            <span className="text-[11px]">
              {disabled ? 'Nessuna firma raccolta' : 'Firma qui col dito o col mouse'}
            </span>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={pulisci} disabled={vuoto}>
            Cancella e rifai
          </Button>
        </div>
      )}
    </div>
  );
}
