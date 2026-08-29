import { PageHeader } from '@/components/ui/page-header';
import { KpiRow } from '@/components/dashboard/KpiRow';
import { ProssimiInterventi } from '@/components/dashboard/ProssimiInterventi';
import { PreventiviDaSeguire } from '@/components/dashboard/PreventiviDaSeguire';
import { ScadenzeInArrivo } from '@/components/dashboard/ScadenzeInArrivo';
import { CostiDelMese } from '@/components/dashboard/CostiDelMese';

/**
 * La home: il quadro della settimana.
 *
 * È l'ultima schermata costruita, e doveva esserlo. Fatta per prima sarebbe
 * stata una pagina di numeri finti da rifare appena esistevano le entità sotto;
 * fatta adesso, ogni numero che mostra viene da un modulo che funziona.
 *
 * Tre regole, tutte e tre visibili nel codice:
 *
 *  1. **Nessun service suo.** Questa pagina non tocca i dati: compone gli hook
 *     degli altri moduli. Se un numero non si riesce a calcolare da quelli che
 *     ci sono, il difetto è nel modulo, non qui — e va corretto lì, o due
 *     schermate diranno cose diverse sullo stesso dato.
 *  2. **Ogni riquadro carica per conto suo.** Sei moduli rispondono in sei
 *     tempi diversi, e un caricamento unico terrebbe grigia tutta la pagina
 *     finché non ha risposto anche il più lento.
 *  3. **Niente riquadri finti.** Quando un dato non c'è, il riquadro mostra il
 *     suo stato vuoto e dice cosa manca. Meglio una griglia più corta di un
 *     numero inventato: un numero inventato in home lo si crede.
 */
export default function Dashboard() {
  const oggi = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buongiorno"
        subtitle={<span className="capitalize">{oggi}</span>}
      />

      <KpiRow />

      {/*
        Otto e quattro, non sei e sei. A sinistra ci sono le due liste su cui si
        AGISCE — i lavori da fare e le offerte da richiamare — e hanno bisogno di
        larghezza per il nome del cliente. A destra ci sono i due riquadri che si
        CONSULTANO, dove basta una cifra e una data.
      */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <ProssimiInterventi />
          <PreventiviDaSeguire />
        </div>

        <div className="space-y-5 lg:col-span-4">
          <ScadenzeInArrivo />
          <CostiDelMese />
        </div>
      </div>
    </div>
  );
}
