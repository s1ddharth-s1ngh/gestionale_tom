import { InCostruzione } from '@/components/layout/InCostruzione';
import { House } from '@/components/ui/icons';

export default function Dashboard() {
  return (
    <InCostruzione
      titolo="Home"
      sottotitolo="Il quadro della settimana: interventi, preventivi da seguire, incassi"
      icona={House}
      lavoro="A"
    />
  );
}
