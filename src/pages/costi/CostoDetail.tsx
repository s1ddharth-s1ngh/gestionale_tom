import { InCostruzione } from '@/components/layout/InCostruzione';
import { Wallet } from '@/components/ui/icons';

export default function CostoDetail() {
  return (
    <InCostruzione
      titolo="Costo"
      sottotitolo="Dettaglio della registrazione"
      icona={Wallet}
      lavoro="D"
    />
  );
}
