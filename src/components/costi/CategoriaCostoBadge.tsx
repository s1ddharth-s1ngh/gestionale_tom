import { StatusPill } from '@/components/ui/status-pill';
import { categoriaCostoIcona, categoriaCostoLabel, type CategoriaCosto } from '@/types/costo';

interface CategoriaCostoBadgeProps {
  categoria: CategoriaCosto;
  className?: string;
}

/**
 * La categoria di un costo: icona più etichetta, sempre in `neutral`.
 *
 * Non è una svista che non abbia colori. Gli accent del design system
 * significano gravità, e una categoria non è grave: colorare otto categorie
 * trasformerebbe l'elenco dei costi in un semaforo di allarmi inesistenti.
 * A distinguerle è l'icona.
 */
export function CategoriaCostoBadge({ categoria, className }: CategoriaCostoBadgeProps) {
  return (
    <StatusPill accent="neutral" icon={categoriaCostoIcona(categoria)} className={className}>
      {categoriaCostoLabel(categoria)}
    </StatusPill>
  );
}
