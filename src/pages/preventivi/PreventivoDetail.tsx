import { InCostruzione } from '@/components/layout/InCostruzione';
import { FileText } from '@/components/ui/icons';

export default function PreventivoDetail() {
  return (
    <InCostruzione
      titolo="Preventivo"
      sottotitolo="Scheda completa e conversione in commessa"
      icona={FileText}
      lavoro="B"
    />
  );
}
