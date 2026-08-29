import * as React from 'react';
import { cn } from '@/lib/utils';

/** Gemello di Input per il testo lungo: stesse superfici, altezza libera. */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[72px] w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white',
          'placeholder:text-white/25 transition-colors resize-y',
          'focus-visible:outline-none focus-visible:border-[#1E6FFF]/60 focus-visible:bg-white/[0.06]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
