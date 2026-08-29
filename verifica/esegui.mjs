/**
 * Esegue le verifiche che `tsc` non può fare.
 *
 *   node verifica/esegui.mjs            # solo quelle che non toccano il database
 *   node verifica/esegui.mjs --db       # anche la parità fra viste SQL e TypeScript
 *
 * Non è un framework di test e non vuole diventarlo: sono due controlli su due
 * punti dove il progetto ha una regola scritta in due posti, e dove finora
 * l'unico modo di sapere se coincidevano era fidarsi.
 *
 *   1. **Il parser di FatturaPA** — `importa-fattura-xml` legge l'XML con delle
 *      espressioni regolari invece che con un parser vero, ed è una scelta
 *      spiegata nel file. Le scelte si difendono con una prova.
 *   2. **Gli stati derivati** — `calcolaStatoFattura()` in TypeScript e
 *      `v_fatture.stato_effettivo` in SQL calcolano la stessa cosa in due
 *      linguaggi. Entrambi i file dicono «va tenuta allineata».
 *
 * Serve solo `node` ed `esbuild`, che ci sono già: nessuna dipendenza nuova.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const conDb = process.argv.includes('--db');
const tmp = mkdtempSync(join(tmpdir(), 'tom-verifica-'));
/**
 * Si chiama il binario di esbuild direttamente e non `npx`: su Windows
 * `execFileSync` non sa avviare un `.cmd` (EINVAL), e passare per la shell per
 * aggirarlo aprirebbe la porta ai problemi di quoting sui percorsi con spazi —
 * e questo progetto sta in «Documents\Work\MANUX».
 */
const esbuild = join(
  'node_modules',
  '@esbuild',
  process.platform === 'win32' ? 'win32-x64' : `${process.platform}-x64`,
  process.platform === 'win32' ? 'esbuild.exe' : 'bin/esbuild',
);

function bundle(ingresso, uscita, extra = []) {
  execFileSync(
    esbuild,
    [ingresso, '--bundle', '--platform=node', '--format=cjs', `--outfile=${uscita}`,
     '--log-level=error', ...extra],
    { stdio: 'inherit' },
  );
}

let falliti = 0;

// ── 1. Il parser XML ─────────────────────────────────────────────────────────
// Le funzioni di parsing non sono esportate dalla edge function: si prende il
// testo del file fino a `Deno.serve` e lo si compila così com'è. Provare una
// copia riscritta non proverebbe niente.
console.log('\n── Parser FatturaPA ──────────────────────────────────────────');
const sorgente = readFileSync('supabase/functions/importa-fattura-xml/index.ts', 'utf8');
const puro = sorgente
  .slice(0, sorgente.indexOf('Deno.serve'))
  .replace(/^import .*?;\s*$/gm, '')
  + '\nexport { tag, blocchi, decodifica, numero, categoriaProposta };\n';
writeFileSync(join(tmp, 'parser.ts'), puro);
writeFileSync(
  join(tmp, 'prova.ts'),
  readFileSync('verifica/parser-fattura-xml.ts', 'utf8'),
);

try {
  bundle(join(tmp, 'prova.ts'), join(tmp, 'prova.cjs'));
  execFileSync(process.execPath, [join(tmp, 'prova.cjs')], { stdio: 'inherit' });
} catch (e) {
  console.error('   errore:', e.message);
  falliti++;
}

// ── 2. Parità fra SQL e TypeScript ───────────────────────────────────────────
if (conDb) {
  console.log('\n── Stati derivati: SQL vs TypeScript ─────────────────────────');
  console.log('   (richiede le due esportazioni descritte in verifica/README.md)');
  try {
    bundle('verifica/parita-stati.ts', join(tmp, 'parita.cjs'), ['--alias:@=./src']);
    execFileSync(process.execPath, [join(tmp, 'parita.cjs'), 'verifica/dati'], { stdio: 'inherit' });
  } catch {
    falliti++;
  }
}

rmSync(tmp, { recursive: true, force: true });
process.exit(falliti === 0 ? 0 : 1);
