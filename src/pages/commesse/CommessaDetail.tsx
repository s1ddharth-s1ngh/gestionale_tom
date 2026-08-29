import { InCostruzione } from '@/components/layout/InCostruzione';
import { Tree } from '@/components/ui/icons';

export default function CommessaDetail() {
  return (
    <InCostruzione
      titolo="Commessa"
      sottotitolo="Avanzamento, foto prima e dopo, rapportino"
      icona={Tree}
      lavoro="C"
    />
  );
}
