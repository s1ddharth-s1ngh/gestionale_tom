import { cn } from '@/lib/utils';

/** Placeholder di caricamento. Su fondo nero il grigio va tenuto bassissimo. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-white/[0.04]', className)}
      {...props}
    />
  );
}

export { Skeleton };
