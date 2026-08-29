import { InCostruzione } from '@/components/layout/InCostruzione';
import { Receipt } from '@/components/ui/icons';

export default function Scadenzario() {
  return (
    <InCostruzione
      titolo="Scadenzario"
      sottotitolo="Cosa c'e da incassare, e cosa e gia scaduto"
      icona={Receipt}
      lavoro="D"
    />
  );
}
