import { InCostruzione } from '@/components/layout/InCostruzione';
import { FileText } from '@/components/ui/icons';

export default function PreventivoNuovo() {
  return (
    <InCostruzione
      titolo="Nuovo preventivo"
      sottotitolo="Sopralluogo, rilievo degli alberi e voci di spesa"
      icona={FileText}
      lavoro="B"
    />
  );
}
