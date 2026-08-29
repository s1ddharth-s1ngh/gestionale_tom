import { InCostruzione } from '@/components/layout/InCostruzione';
import { Tree } from '@/components/ui/icons';

export default function CommesseList() {
  return (
    <InCostruzione
      titolo="Commesse"
      sottotitolo="I lavori pianificati e in corso"
      icona={Tree}
      lavoro="C"
    />
  );
}
