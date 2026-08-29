import { InCostruzione } from '@/components/layout/InCostruzione';
import { Receipt } from '@/components/ui/icons';

export default function FatturaDetail() {
  return (
    <InCostruzione
      titolo="Fattura"
      sottotitolo="Incassi, solleciti e dati di fatturazione"
      icona={Receipt}
      lavoro="D"
    />
  );
}
