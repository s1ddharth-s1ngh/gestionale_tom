import { InCostruzione } from '@/components/layout/InCostruzione';
import { Users } from '@/components/ui/icons';

export default function ClienteDetail() {
  return (
    <InCostruzione
      titolo="Scheda cliente"
      sottotitolo="Anagrafica, luoghi di intervento e storico"
      icona={Users}
      lavoro="A"
    />
  );
}
