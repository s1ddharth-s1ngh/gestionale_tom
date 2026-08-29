import { InCostruzione } from '@/components/layout/InCostruzione';
import { Wallet } from '@/components/ui/icons';

export default function CostiList() {
  return (
    <InCostruzione
      titolo="Costi"
      sottotitolo="Carburante, materiali, noleggi e smaltimento"
      icona={Wallet}
      lavoro="D"
    />
  );
}
