import { InCostruzione } from '@/components/layout/InCostruzione';
import { Users } from '@/components/ui/icons';

export default function ClientiList() {
  return (
    <InCostruzione
      titolo="Clienti"
      sottotitolo="Privati, condomini, aziende ed enti"
      icona={Users}
      lavoro="A"
    />
  );
}
