import { InCostruzione } from '@/components/layout/InCostruzione';
import { Wallet } from '@/components/ui/icons';

export default function FornitoriList() {
  return (
    <InCostruzione
      titolo="Fornitori"
      sottotitolo="Chi fornisce materiali, noleggi e servizi"
      icona={Wallet}
      lavoro="D"
    />
  );
}
