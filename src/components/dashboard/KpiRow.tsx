import { useNavigate } from 'react-router-dom';
import { DarkKpi } from '@/components/ui/dark-kpi';
import { FileText, Receipt, Tree, Wallet } from '@/components/ui/icons';
import { useConteggiCommesse } from '@/hooks/useCommesse';
import { useConteggiFatture, useScadenzario } from '@/hooks/useFatture';
import { useScadenzarioFornitori } from '@/hooks/useFattureFornitore';
import { useConteggiPreventivi } from '@/hooks/usePreventivi';
import { formatCurrency } from '@/lib/formatters';

/**
 * La riga dei numeri che aprono la giornata.
 *
 * **Ogni tile ha la sua query.** Sei moduli rispondono in sei tempi diversi, e
 * un hook unico che li aggrega tutti farebbe aspettare il più veloce dietro al
 * più lento: la pagina resterebbe grigia finché non ha risposto anche l'ultimo.
 * Così invece i numeri compaiono man mano.
 *
 * **Ogni tile porta da qualche parte.** Un numero che allarma e non si può
 * aprire costringe a cercare a mano nella lista giusta la riga che lo ha
 * prodotto — ed è il motivo per cui le dashboard smettono di essere usate.
 */
export function KpiRow() {
  const navigate = useNavigate();

  const preventivi = useConteggiPreventivi();
  const commesse = useConteggiCommesse();
  const fatture = useConteggiFatture();
  const daIncassare = useScadenzario();
  const daPagare = useScadenzarioFornitori();

  // Da incassare: il residuo vero, non il totale delle fatture aperte. Se una
  // fattura da 5.000 ha già incassato 3.000, quello che manca è 2.000 — ed è
  // l'unico numero su cui si prende una decisione.
  const scoperto = (daIncassare.data ?? []).reduce((t, f) => t + (f.residuo ?? 0), 0);
  const scadute = fatture.data?.scaduta ?? 0;

  const debito = (daPagare.data ?? []).reduce((t, f) => t + (f.residuo ?? 0), 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DarkKpi
        icon={FileText}
        accent="info"
        label="Preventivi in attesa"
        value={preventivi.data?.inviato ?? null}
        loading={preventivi.isLoading}
        onClick={() => navigate('/preventivi')}
      />

      <DarkKpi
        icon={Tree}
        accent="amber"
        label="Commesse in corso"
        value={commesse.data?.in_corso ?? null}
        loading={commesse.isLoading}
        onClick={() => navigate('/commesse')}
      />

      <DarkKpi
        icon={Receipt}
        // Verde se è solo denaro in arrivo, rosso se qualcuno è in ritardo:
        // la stessa cifra vuol dire due cose diverse, e il colore è l'unico
        // modo di dirlo senza aggiungere una riga di testo.
        accent={scadute > 0 ? 'danger' : 'emerald'}
        label={scadute > 0 ? `Da incassare · ${scadute} scadute` : 'Da incassare'}
        valueFormatted={daIncassare.isLoading ? undefined : formatCurrency(scoperto)}
        loading={daIncassare.isLoading}
        onClick={() => navigate('/fatture/scadenzario')}
      />

      <DarkKpi
        icon={Wallet}
        accent="neutral"
        label="Da pagare ai fornitori"
        valueFormatted={daPagare.isLoading ? undefined : formatCurrency(debito)}
        loading={daPagare.isLoading}
        onClick={() => navigate('/costi/fatture')}
      />
    </div>
  );
}
