/**
 * Parsa UN file e stampa l'esito in JSON. Lo lancia `verifica.mjs` in un
 * processo separato per file: pg-query-emscripten, su input grossi, muore con
 * un errore interno del WASM che porterebbe giù tutto il runner.
 */
import { readFileSync } from 'node:fs';
import init from 'pg-query-emscripten';

try {
  const pg = await init();
  const sql = readFileSync(process.argv[2], 'utf8');
  const res = pg.parse(sql);

  if (res.error) {
    // `cursorpos` è un offset in caratteri: tradotto in riga e colonna, o
    // «errore a carattere 48213» non aiuta nessuno a trovarlo.
    const pos = res.error.cursorpos ?? 0;
    const prima = sql.slice(0, pos);
    console.log(
      JSON.stringify({
        esito: 'errore',
        messaggio: res.error.message,
        riga: prima.split('\n').length,
        colonna: pos - prima.lastIndexOf('\n'),
      }),
    );
    process.exit(1);
  }

  console.log(JSON.stringify({ esito: 'ok', statement: res.parse_tree?.stmts?.length ?? 0 }));
} catch (e) {
  console.log(JSON.stringify({ esito: 'crash', messaggio: e.message }));
  process.exit(2);
}
