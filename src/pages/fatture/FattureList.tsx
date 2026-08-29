import { InCostruzione } from '@/components/layout/InCostruzione';
import { Receipt } from '@/components/ui/icons';

export default function FattureList() {
  return (
    <InCostruzione
      titolo="Fatture"
      sottotitolo="Emissione, acconti e saldi"
      icona={Receipt}
      lavoro="D"
    />
  );
}
