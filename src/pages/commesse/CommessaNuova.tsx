import { InCostruzione } from '@/components/layout/InCostruzione';
import { Tree } from '@/components/ui/icons';

export default function CommessaNuova() {
  return (
    <InCostruzione
      titolo="Nuova commessa"
      sottotitolo="Pianificazione, lavorazioni e ore previste"
      icona={Tree}
      lavoro="C"
    />
  );
}
