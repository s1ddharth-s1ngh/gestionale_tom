# Edge functions

Quattro funzioni, e una regola per decidere se scriverne una quinta.

## La regola

**Un'aggregazione non è una edge function.** Somme, conteggi, riepiloghi per categoria o per
mezzo, marginalità per commessa: tutta roba che sa fare Postgres, e che in una vista o in una
funzione SQL costa un indice invece di un round-trip più il trasferimento delle righe da
sommare. Le viste `v_costi`, `v_fatture_fornitore` e `v_marginalita_commessa` sono lì per
questo.

Una edge function si scrive quando serve **una delle tre cose che il database e il browser non
possono fare**:

1. **un segreto** — una chiave che non può stare nel bundle (posta, SdI, pagamenti);
2. **un permesso che il client non ha** — scrivere scavalcando la RLS con la service key;
3. **un ingresso da fuori** — un webhook, o un lavoro che gira a orario senza che nessuno
   abbia il browser aperto.

Le tre qui sotto ne hanno almeno una a testa. Se la quarta non ne ha nessuna, è una query.

---

## `registra-fattura-fornitore`

Trasforma le righe di una fattura fornitore in costi.

`POST { fatturaId }` → `{ costiCreati, giaRegistrata }`

Il lavoro vero lo fa `public.genera_costi_da_fattura()` (in `db/008`), perché **deve essere
atomico**: cinque `insert` separati dal browser, con la connessione che cade a metà, lasciano
tre costi su cinque e nessuno che se ne accorga finché il riepilogo del mese non torna. Il
corpo di una funzione plpgsql è una transazione, e questo risolve il problema alla radice.

La funzione SQL è anche **idempotente**: se la fattura ha già costi collegati torna `0` senza
toccare niente. Il doppio click su «Registra» è la norma, non l'eccezione.

Motivo per cui è una edge function e non una `rpc()` chiamata dal client: il permesso. Oggi la
RLS lascia scrivere tutto a `anon`, ma il giorno che arriva l'autenticazione i costi non
saranno più scrivibili dal browser, e questa funzione continuerà a funzionare senza modifiche.

## `promemoria-scadenze`

Che cosa c'è da pagare e che cosa è già in ritardo.

`POST { giorniPreavviso?, aSecco? }` → `{ scadute, inScadenza, inviata }`

Manda una email, quindi serve la chiave del servizio di posta: ecco il segreto che la rende una
edge function e non una query. `aSecco: true` calcola e restituisce l'anteprima HTML senza
spedire — è il modo di provarla senza riempire la casella di Tom.

Se `RESEND_API_KEY` o `EMAIL_AMMINISTRAZIONE` non sono configurati **non fallisce**: torna i
conteggi e dice che non ha spedito. Così è usabile subito come endpoint di lettura, e la posta
si accende quando Tom decide qual è la sua casella.

Non manda niente quando non c'è niente da segnalare. Un promemoria che arriva ogni mattina
anche a scadenzario vuoto smette di essere letto entro una settimana, e allora non protegge più
nemmeno quando ha ragione.

**Per farla girare a orario**, dal SQL Editor:

```sql
select cron.schedule(
  'promemoria-scadenze-passive',
  '0 8 * * 1',                       -- lunedì alle 8
  $$select net.http_post(
      url     := 'https://<progetto>.supabase.co/functions/v1/promemoria-scadenze',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}'::jsonb,
      body    := '{}'::jsonb
    );$$
);
```

Richiede le estensioni `pg_cron` e `pg_net`, che si attivano dalla dashboard.

## `numera-fattura`

Assegna `FT-AAAA-NNNN` a una fattura attiva.

`POST { fatturaId }` → `{ numero, giaAssegnato? }`

Il permesso, di nuovo, ma qui il problema è un altro: **«leggi l'ultimo numero, aggiungi uno,
scrivi» dal browser è una corsa**. Due schede aperte producono due volte lo stesso numero e il
`UNIQUE` rifiuta la seconda, con un errore che l'operatore non sa interpretare. Il lavoro lo fa
`public.assegna_numero_fattura()` (in `db/009`), che incrementa un contatore per anno **sotto
lock di riga**: due richieste in parallelo si mettono in fila.

È idempotente: su una fattura che ha già un numero definitivo lo restituisce senza consumarne
uno nuovo. Finché non ce l'ha, la riga porta un `TMP-<uuid>`, che il `UNIQUE` accetta.

`fattureService.create()` la chiama e, se non risponde, ricade sul calcolo lato client — più
lento e non atomico, ma la schermata salva lo stesso mentre la funzione non è ancora deployata.

## `importa-fattura-xml`

Legge una fattura elettronica FatturaPA e ne ricava fornitore, testata e righe.

`POST { xml, nomeFile? }` → `{ fatturaId, creata, righe }`

Ogni fornitore italiano manda già le fatture in XML: ribatterle a mano è lavoro che il formato
rende inutile. Crea il fornitore se non esiste — cercandolo per **partita IVA e non per nome**,
perché «Rossi S.r.l.» e «ROSSI SRL» sono lo stesso fornitore e cercare per denominazione ne
creerebbe due.

È idempotente sul `ProgressivoInvio` (il protocollo SdI): reimportare lo stesso file è quello
che succede appena qualcuno svuota la cartella dei download e riprova.

**Non registra i costi.** Crea la fattura e si ferma: la trasformazione in costi resta un gesto
esplicito di chi ha guardato le righe. Un XML che entra e diventa spesa senza che nessuno
l'abbia letto è il modo di scoprire a fine anno di aver contabilizzato la fattura sbagliata.

La categoria di ogni riga è **indovinata dalla descrizione e proposta**, non decisa: finisce in
`categoriaSuggerita`, si vede nel form e si corregge prima di registrare.

---

## Deploy

```bash
npx supabase link --project-ref <ref>
npx supabase functions deploy registra-fattura-fornitore
npx supabase functions deploy promemoria-scadenze
npx supabase functions deploy importa-fattura-xml
npx supabase functions deploy numera-fattura
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ci sono già in ogni funzione: le inietta la
piattaforma. Gli altri si impostano a mano:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set EMAIL_AMMINISTRAZIONE=amministrazione@example.com
npx supabase secrets set EMAIL_MITTENTE=gestionale@example.com
```

In locale: `npx supabase functions serve` con un file `supabase/.env` (già coperto da
`.gitignore`).

## Una cosa da sistemare prima di andare online

`_shared/risposta.ts` risponde `Access-Control-Allow-Origin: *`. Va bene adesso, perché Vite
cambia porta a ogni avvio e un elenco di origini sarebbe da riscrivere ogni volta. **Il giorno
che l'app ha un dominio, quello diventa il dominio**: una edge function che accetta chiamate da
qualunque pagina è una funzione che chiunque può far girare col proprio JavaScript.
