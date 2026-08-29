import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-2',
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Cerchio che gira. Costruito con un bordo e non con un SVG perché deve poter
 * ereditare il colore dal contesto (`text-*`) senza passare da una prop.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Caricamento"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em]',
        SIZES[size],
        className,
      )}
    />
  );
}
