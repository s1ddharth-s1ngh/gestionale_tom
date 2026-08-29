/**
 * Le regole di stato sono scritte due volte: in TypeScript per il form, in SQL
 * per le liste. Entrambi i file dicono «va tenuta allineata», ma nessuno lo
 * aveva mai controllato.
 *
 * Qui si prendono le righe VERE dal database e si confronta quello che dice la
 * vista con quello che dicono le funzioni dell'app, riga per riga.
 */
import { readFileSync } from 'node:fs';
import { calcolaStatoFattura } from '@/types/fattura';
import { statoEffettivoFattura } from '@/types/fatturaFornitore';

const cartella = process.argv[2];

interface RigaAttiva {
  numero: string;
  stato: string;
  data_emissione: string | null;
  data_scadenza: string | null;
  righe: unknown[];
  incassi: unknown[];
  stato_effettivo: string;
}

interface RigaPassiva {
  numero: string;
  stato: string;
  data_scadenza: string | null;
  totale: string | number;
  pagato: string | number;
  stato_effettivo: string;
}

const attive: RigaAttiva[] = JSON.parse(readFileSync(`${cartella}/attive.json`, 'utf8'));
const passive: RigaPassiva[] = JSON.parse(readFileSync(`${cartella}/passive.json`, 'utf8'));

let divergenze = 0;

console.log('=== Fatture attive: v_fatture.stato_effettivo vs calcolaStatoFattura() ===');
for (const r of attive) {
  const ts = calcolaStatoFattura(
    {
      id: '',
      numero: r.numero,
      tipo: 'unica',
      clienteId: '',
      dataEmissione: r.data_emissione ?? undefined,
      dataScadenza: r.data_scadenza ?? undefined,
      righe: r.righe as never,
      incassi: r.incassi as never,
      solleciti: [],
      creataIl: '',
      aggiornataIl: '',
    },
    new Date(),
  );
  if (ts !== r.stato_effettivo) {
    divergenze++;
    console.log(`  ✗ ${r.numero}: SQL dice "${r.stato_effettivo}", TypeScript dice "${ts}"`);
  }
}
console.log(`  ${attive.length} righe controllate`);

console.log('=== Fatture fornitore: stato_effettivo vs statoEffettivoFattura() ===');
for (const r of passive) {
  const ts = statoEffettivoFattura(
    {
      stato: r.stato as never,
      totale: Number(r.totale),
      dataScadenza: r.data_scadenza ?? undefined,
    },
    Number(r.pagato),
  );
  if (ts !== r.stato_effettivo) {
    divergenze++;
    console.log(`  ✗ ${r.numero}: SQL dice "${r.stato_effettivo}", TypeScript dice "${ts}"`);
  }
}
console.log(`  ${passive.length} righe controllate`);

console.log(divergenze === 0 ? '\nOK: le due regole coincidono su tutte le righe.' : `\n${divergenze} DIVERGENZE`);
process.exit(divergenze === 0 ? 0 : 1);
