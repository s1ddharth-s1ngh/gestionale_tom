import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button — l'unico bottone dell'app. docs/DESIGN_SYSTEM.md §6.3.
 *
 * In Telebi questo componente è rimasto il default di shadcn (h-10, rounded-md,
 * bg-primary) e le pagine lo scavalcano scrivendo `<button>` con le classi pill
 * a mano — le stesse classi, ricopiate in decine di file. Qui quelle classi
 * stanno nelle varianti: stesso aspetto, scritto una volta.
 *
 * NIENTE alternative: se in una pagina serve un bottone, si usa questo. Lo
 * stile si cambia QUI e cambia ovunque.
 *
 * Le icone si dimensionano al call-site (`<Plus className="w-3.5 h-3.5" />`),
 * come nei frammenti del design system. Il bottone impone solo `shrink-0`:
 * fissare qui la taglia con `[&_svg]:size-*` vincerebbe per specificità su
 * quella del call-site, e sarebbe una sorpresa silenziosa.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FFF]/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#1E6FFF] text-white hover:bg-[#1E6FFF]/90',
        secondary:
          'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]',
        ghost: 'text-white/50 hover:text-white hover:bg-white/[0.06]',
        danger:
          'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:text-red-200',
      },
      size: {
        /** Toolbar e azioni di riga — l'altezza delle pill. */
        sm: 'h-8 px-3 text-xs',
        /** Testate di dettaglio. */
        md: 'h-9 px-4 text-[13px]',
        /** Footer dei dialog, dove il bottone deve pesare. */
        lg: 'h-10 px-5 text-[13px] font-semibold',
        /** Solo icona, quadrato. */
        icon: 'h-8 w-8 px-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'sm',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        // Un bottone dentro un <form> senza `type` fa submit. È la causa più
        // comune di "il form si è salvato da solo cliccando Aggiungi riga".
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
