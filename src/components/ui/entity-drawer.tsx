import * as React from 'react';
import { X } from '@/components/ui/icons';
import { Sheet, SheetPrimitive, SheetPortal, SheetOverlay } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * EntityDrawer — il pannello di creazione/modifica che entra da destra.
 * docs/DESIGN_SYSTEM.md §6.10.
 *
 * Header sticky con icona e titolo, corpo scrollabile, footer sticky con le
 * azioni. Staccato dai bordi (`inset-y-3`) e arrotondato solo a sinistra:
 * è il pattern di Telebi.
 *
 * Si usa per i record BREVI (cliente, costo, fornitore). Preventivi e commesse
 * hanno un form lungo e vanno su pagina dedicata — vedi docs/PLAN.md.
 */

const sizeMap = {
  sm: 'sm:max-w-[460px]',
  md: 'sm:max-w-[640px]',
  lg: 'sm:max-w-[800px]',
  xl: 'sm:max-w-[1120px]',
} as const;

interface EntityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: keyof typeof sizeMap;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function EntityDrawer({
  open,
  onOpenChange,
  size = 'lg',
  title,
  subtitle,
  icon: Icon,
  footer,
  children,
}: EntityDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          className={cn(
            'fixed inset-y-3 right-0 z-[120] flex w-3/4 flex-col overflow-hidden',
            'rounded-bl-[20px] rounded-tl-[20px] border border-white/[0.08] bg-[#131417] text-white',
            'transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:duration-200 data-[state=open]:duration-300',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            sizeMap[size],
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0f12] px-6 py-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Icon className="h-4 w-4 text-white/60" />
                </div>
              )}
              <div>
                <SheetPrimitive.Title className="text-base font-semibold text-white">
                  {title}
                </SheetPrimitive.Title>
                {subtitle ? (
                  <SheetPrimitive.Description className="text-xs text-white/40">
                    {subtitle}
                  </SheetPrimitive.Description>
                ) : (
                  // Radix avvisa in console se manca la Description. Quando non
                  // c'è un sottotitolo se ne mette una per i lettori di schermo.
                  <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
                )}
              </div>
            </div>
            <SheetPrimitive.Close className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Chiudi</span>
            </SheetPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/[0.06] bg-[#0d0f12] px-6 py-4">
              {footer}
            </div>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}

/**
 * SectionBox — il raggruppamento di campi dentro un drawer o un form lungo.
 * Superficie più chiara del fondo, titolo in maiuscoletto.
 */
export function SectionBox({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-white/[0.07] bg-white/[0.03] p-5', className)}>
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {title}
      </h3>
      {children}
    </div>
  );
}
