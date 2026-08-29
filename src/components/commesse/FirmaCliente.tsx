import { useCallback, useEffect, useRef, useState } from 'react';
import { Signature, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { formatData } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FirmaClienteProps {
  /** dataUrl già acquisito: se c'è, si mostra la firma invece della lavagna. */
  value?: string;
  firmatoIl?: string;
  /** `undefined` quando si cancella: il rapportino torna non firmato. */
  onChange: (dataUrl: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

/** Il canvas è disegnato a densità doppia e riscalato via CSS: a densità 1
 *  il tratto su schermo retina esce sgranato. */
const SCALA = 2;
const ALTEZZA = 160;

/**
 * Firma del cliente su canvas, salvata come dataUrl dentro il rapportino.
 *
 * Scritta a mano invece di `react-signature-canvas`: sono i listener di
 * pointer e un `toDataURL`, e una dipendenza in più andrebbe poi vestita
 * per farla stare nel tema scuro.
 */
export function FirmaCliente({ value, firmatoIl, onChange, disabled, className }: FirmaClienteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disegnando = useRef(false);
  const [vuoto, setVuoto] = useState(true);

  // Il canvas si dimensiona sul contenitore, che dipende dal layout: va fatto
  // dopo il mount, e rifatto al resize della finestra.
  const dimensiona = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const larghezza = canvas.parentElement?.clientWidth ?? 480;
    canvas.width = larghezza * SCALA;
    canvas.height = ALTEZZA * SCALA;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(SCALA, SCALA);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  }, []);

  useEffect(() => {
    if (value) return; // con una firma già acquisita la lavagna non è montata
    dimensiona();
    window.addEventListener('resize', dimensiona);
    return () => window.removeEventListener('resize', dimensiona);
  }, [dimensiona, value]);

  function puntoDa(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function giu(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Il pointer capture serve a non perdere il tratto quando il dito esce
    // dal canvas e rientra: senza, la firma si spezza sul bordo.
    e.currentTarget.setPointerCapture(e.pointerId);
    disegnando.current = true;
    const { x, y } = puntoDa(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function muovi(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = puntoDa(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vuoto) setVuoto(false);
  }

  function su() {
    disegnando.current = false;
  }

  function conferma() {
    const canvas = canvasRef.current;
    if (!canvas || vuoto) return;
    onChange(canvas.toDataURL('image/png'));
  }

  function pulisci() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVuoto(true);
  }

  if (value) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
          <img src={value} alt="Firma del cliente" className="h-[120px] w-full object-contain" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-white/40">
            Firmato il {formatData(firmatoIl)}
          </span>
          {!disabled && (
            <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <Trash2 className="h-3.5 w-3.5" />
              Rifai la firma
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative rounded-xl border border-white/[0.07] bg-white/[0.03]">
        <canvas
          ref={canvasRef}
          style={{ height: ALTEZZA }}
          className="w-full touch-none"
          onPointerDown={giu}
          onPointerMove={muovi}
          onPointerUp={su}
          onPointerCancel={su}
        />
        {vuoto && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Signature className="h-5 w-5 text-white/25" />
            <p className="text-[12px] text-white/30">Firma qui con il dito o il mouse</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={pulisci} disabled={vuoto || disabled}>
          Cancella
        </Button>
        <Button variant="primary" size="sm" onClick={conferma} disabled={vuoto || disabled}>
          Conferma firma
        </Button>
      </div>
    </div>
  );
}
