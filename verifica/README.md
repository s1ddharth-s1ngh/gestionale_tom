# Verifica

Due controlli su due punti dove il progetto ha **la stessa regola scritta in due posti**.
Non è un framework di test e non deve diventarlo: `tsc` e `eslint` coprono già il resto, e
una suite finta darebbe una sicurezza che non c'è.

```bash
node verifica/esegui.mjs        # il parser XML — non serve il database
node verifica/esegui.mjs --db   # anche la parità fra viste SQL e TypeScript
```

Serve solo `node` ed `esbuild`, che ci sono già. Nessuna dipendenza nuova.

---

## 1. `parser-fattura-xml.ts` — la FatturaPA

`importa-fattura-xml` legge l'XML con delle espressioni regolari invece che con un parser
vero. È una scelta motivata nel file — dodici campi, tutti a un livello di nidificazione,
contro una dipendenza in una funzione che gira una volta al mese — e le scelte così si
difendono con una prova, non con un commento.

L'XML di prova ha dentro i quattro casi su cui un parser ingenuo sbaglia:

- il **prefisso di namespace** (`p:FatturaElettronica`), che ogni gestionale mette a modo suo;
- il **`CessionarioCommittente`**, che siamo noi: cercare `Denominazione` nel documento intero
  importerebbe fatture intestate a Tom come se fossero di un fornitore;
- **due `DatiRiepilogo`** con aliquote diverse: leggere solo il primo scarterebbe metà
  dell'imponibile senza che nulla lo segnali — il totale sarebbe soltanto più basso;
- una **`&amp;`** nella ragione sociale.

Il test non ricopia le funzioni: prende il testo del file vero fino a `Deno.serve` e lo
compila. Provare una copia riscritta non proverebbe niente.

## 2. `parita-stati.ts` — SQL contro TypeScript

Lo stato di una fattura è calcolato due volte: da `calcolaStatoFattura()` mentre si compila
il form, e da `v_fatture.stato_effettivo` per le liste — perché ricalcolarlo nel browser
vorrebbe dire scaricare tutti gli incassi di tutte le fatture. Lo stesso per il ciclo passivo.

Entrambi i file portano scritto «va tenuta allineata». Questo lo controlla, sulle righe vere
del database invece che su casi inventati.

Richiede due esportazioni in `verifica/dati/`, che si producono con `psql` collegato al
database (locale o Supabase):

```bash
mkdir -p verifica/dati
psql "$DATABASE_URL" -tAc "select json_agg(row_to_json(x)) from (
  select id, numero, stato, data_emissione, data_scadenza, righe, incassi, stato_effettivo
  from v_fatture) x;" > verifica/dati/attive.json
psql "$DATABASE_URL" -tAc "select json_agg(row_to_json(x)) from (
  select id, numero, stato, data_scadenza, totale, pagato, stato_effettivo
  from v_fatture_fornitore) x;" > verifica/dati/passive.json
```

`verifica/dati/` è ignorato da git: sono dati, non codice.

---

## Quando rilanciarle

- **Il parser**, ogni volta che si tocca `importa-fattura-xml`.
- **La parità**, ogni volta che si cambia una regola di stato — da una parte o dall'altra.
  È l'unico modo di accorgersi che una fattura risulta «scaduta» in elenco e «da pagare» nel
  dettaglio prima che lo noti chi la sta guardando.
