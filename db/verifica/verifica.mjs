#!/usr/bin/env node
/**
 * Valida lo schema con il parser VERO di PostgreSQL, e rigenera TUTTO.sql.
 *
 *   cd db/verifica && npm install && node verifica.mjs
 *
 * Non è un lint di somiglianza: sotto c'è `libpg_query`, lo stesso analizzatore
 * che gira dentro il server, compilato in WASM. Quello che passa qui passa
 * anche là.
 *
 * Perché vale la pena averlo. Lo schema si esegue incollandolo tutto in una
 * volta nel SQL Editor: un errore di sintassi a riga 1.900 lascia mezzo schema
 * creato e mezzo no, ed è lo stato peggiore in cui trovarsi — le `create table
 * if not exists` successive non ripartono da capo, e capire cosa è entrato
 * richiede di leggere il catalogo a mano.
 *
 * Vive in una cartella sua, con un `package.json` suo: la dipendenza del
 * parser non deve entrare in quella dell'app, che finisce nel browser.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const QUI = dirname(fileURLToPath(import.meta.url));
const DB = join(QUI, '..');

const files = readdirSync(DB)
  .filter((f) => /^\d{3}_.*\.sql$/.test(f))
  .sort();

// ── 1. Sintassi, un file per processo ───────────────────────────────────────
// Il parser WASM, su input grossi, muore con un errore interno che porta giù
// tutto il runner. Isolandolo, un file che lo fa crashare resta un file
// segnalato invece di una verifica interrotta a metà.
let errori = 0;
let statement = 0;

for (const f of files) {
  let esito;
  try {
    esito = JSON.parse(execFileSync(process.execPath, [join(QUI, 'uno.mjs'), join(DB, f)], {
      encoding: 'utf8',
    }));
  } catch (e) {
    const out = e.stdout?.trim();
    esito = out ? JSON.parse(out) : { esito: 'crash', messaggio: e.message };
  }

  if (esito.esito === 'ok') {
    statement += esito.statement;
    console.log(`✅  ${f.padEnd(34)} ${String(esito.statement).padStart(3)} statement`);
  } else if (esito.esito === 'errore') {
    errori++;
    console.log(`❌  ${f}\n    ${esito.messaggio}\n    riga ${esito.riga}, colonna ${esito.colonna}`);
  } else {
    errori++;
    console.log(`⚠️   ${f.padEnd(34)} il parser è morto: ${esito.messaggio}`);
  }
}

// ── 2. Delimitatori bilanciati ──────────────────────────────────────────────
// Il controllo che rende sicura la concatenazione: se ogni file chiude i propri
// `$$` e i propri `/* */`, un blocco non può tracimare nel file successivo e
// mangiarselo. Senza questo, TUTTO.sql potrebbe essere invalido pur essendo
// fatto di pezzi validi.
let sbilanciati = 0;
for (const f of files) {
  const s = readFileSync(join(DB, f), 'utf8');
  const dollari = (s.match(/\$\$/g) ?? []).length;
  const apre = (s.match(/\/\*/g) ?? []).length;
  const chiude = (s.match(/\*\//g) ?? []).length;
  if (dollari % 2 !== 0 || apre !== chiude) {
    sbilanciati++;
    console.log(`❌  ${f}: delimitatori sbilanciati ($$ ${dollari}, /* ${apre}, */ ${chiude})`);
  }
}

console.log(
  `\n${files.length} file · ${statement} statement · ${errori} errori · ${sbilanciati} sbilanciati`,
);

// ── 3. Rigenera TUTTO.sql ───────────────────────────────────────────────────
if (errori === 0 && sbilanciati === 0) {
  const intestazione = [
    '-- =============================================================================',
    '-- TUTTO.sql — lo schema completo, in un file solo',
    '-- =============================================================================',
    '-- GENERATO da db/verifica/verifica.mjs: non si modifica a mano. Si modificano i',
    '-- file numerati e si rigenera, o le due versioni divergono e nessuno sa piu',
    '-- quale sia quella vera.',
    '--',
    '-- Serve a una cosa sola: eseguire lo schema con UN incollaggio nel SQL Editor',
    "-- invece di diciassette. L'ordine e quello dei file, che non e decorativo —",
    '-- 002 referenzia 001, 003 aggiunge una chiave a 002, 012 dipende da 005 e 007.',
    '--',
    '--   https://supabase.com/dashboard/project/<ref>/sql/new',
    '--',
    '-- E idempotente: `create table if not exists`, `create or replace`,',
    '-- `on conflict do nothing`. Rilanciarlo non duplica niente e non rompe niente.',
    '--',
    '--   ATTENZIONE — la sezione 006 apre il database a chiunque abbia la chiave',
    "--   pubblica, perche non c'e ancora un login. Va bene per dati di prova in",
    '--   locale; smette di andare bene nel momento in cui entra il primo cliente',
    "--   vero o l'app va online. La versione con `to authenticated` e gia scritta e",
    '--   commentata in fondo a db/006_rls.sql.',
    '--',
    "-- Verificato con il parser di PostgreSQL: 0 errori di sintassi, delimitatori",
    '-- bilanciati in ogni file.',
    '--',
    "-- Contiene, in quest'ordine:",
    ...files.map((f) => `--   ${f}`),
    '-- =============================================================================',
    '',
  ].join('\n');

  const corpo = files
    .map(
      (f) =>
        `\n\n-- ${'#'.repeat(74)}\n-- ##  ${f}\n-- ${'#'.repeat(74)}\n\n` +
        readFileSync(join(DB, f), 'utf8').trimEnd() +
        '\n',
    )
    .join('');

  writeFileSync(join(DB, 'TUTTO.sql'), intestazione + corpo, 'utf8');
  console.log('TUTTO.sql rigenerato.');
} else {
  console.log('TUTTO.sql NON rigenerato: prima si sistemano gli errori sopra.');
}

process.exit(errori + sbilanciati === 0 ? 0 : 1);
