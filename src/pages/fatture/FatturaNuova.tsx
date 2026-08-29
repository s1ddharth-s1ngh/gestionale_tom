import { InCostruzione } from '@/components/layout/InCostruzione';
import { Receipt } from '@/components/ui/icons';

export default function FatturaNuova() {
  return (
    <InCostruzione
      titolo="Nuova fattura"
      sottotitolo="Righe, imponibile e scadenza"
      icona={Receipt}
      lavoro="D"
    />
  );
}
