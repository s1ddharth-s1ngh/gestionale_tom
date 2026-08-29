import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

/**
 * Label dei form — la scala di Telebi (`labelCls`): minuscola in maiuscoletto,
 * grigia, staccata dal campo di 6px.
 * `text-white/40 text-[10px] uppercase tracking-widest font-medium`
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'block mb-1.5 text-[10px] font-medium uppercase tracking-widest text-white/40',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
