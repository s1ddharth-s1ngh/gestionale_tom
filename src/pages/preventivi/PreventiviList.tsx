import { InCostruzione } from '@/components/layout/InCostruzione';
import { FileText } from '@/components/ui/icons';

export default function PreventiviList() {
  return (
    <InCostruzione
      titolo="Preventivi"
      sottotitolo="Sopralluoghi e offerte, dalla bozza all'accettazione"
      icona={FileText}
      lavoro="B"
    />
  );
}
