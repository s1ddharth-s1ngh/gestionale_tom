import { InCostruzione } from '@/components/layout/InCostruzione';
import { Wallet } from '@/components/ui/icons';

export default function FornitoreDetail() {
  return (
    <InCostruzione
      titolo="Fornitore"
      sottotitolo="Anagrafica e costi collegati"
      icona={Wallet}
      lavoro="D"
    />
  );
}
