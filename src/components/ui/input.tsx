import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input — le classi sono quelle di Telebi (`inputCls` in NewCustomerDrawer),
 * qui dentro il componente invece che ricopiate in ogni form:
 * `bg-white/[0.04] border-white/[0.08] h-8 text-sm rounded-lg`.
 *
 * Le frecce degli `<input type="number">` sono nascoste: nei campi importo e
 * quantità si digita, non si clicca, e lo stepper mangia spazio nella cella.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white',
          'placeholder:text-white/25 transition-colors',
          'focus-visible:outline-none focus-visible:border-[#1E6FFF]/60 focus-visible:bg-white/[0.06]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white/70',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
