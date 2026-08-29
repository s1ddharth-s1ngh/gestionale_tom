# Edge function

Funzioni Deno che girano sull'edge runtime di Supabase. **Non sono ancora
deployate**: il progetto Supabase nuovo non è configurato, e queste vanno caricate
quando lo sarà.

```
_shared/cors.ts                    intestazioni CORS e helper di risposta
importa-fattura-fornitore/         XML FatturaPA → record in fatture_fornitore
scadenze-fornitori/                riepilogo di cosa c'è da pagare, per pg_cron
```

## Il criterio: quando una cosa merita una edge function

Solo due funzioni, e non è una lista incompleta. Il criterio è **serve qualcosa
che il browser non deve o non può fare**:

- il parser XML pesa più della pagina che lo userebbe, e si usa qualche volta al mese;
- la scrittura vuole la `service_role` key, che nel browser non ci va mai;
- l'import deve poter arrivare da un webhook, cioè quando l'app non è aperta;
- una scadenza matura anche il giorno in cui nessuno apre il gestionale.

Tutto ciò che è **aggregazione resta una vista SQL** — `v_scadenzario_fornitori`,
`v_fatture_fornitore`. Una edge function che fa somme è un giro di rete in più
per un lavoro che il database fa meglio, e un secondo posto in cui la stessa
formula può divergere.

Per lo stesso motivo la generazione dei costi **non** è qui ma in
`db/012_genera_costi_da_fattura.sql`: deve essere atomica, e una transazione la
garantisce plpgsql, non una funzione che fa N chiamate HTTP.

## Deploy

Serve la CLI di Supabase e il progetto collegato:

```bash
npm i -g supabase          # o brew install supabase/tap/supabase
supabase login
supabase link --project-ref <PROJECT_REF>

supabase functions deploy importa-fattura-fornitore
supabase functions deploy scadenze-fornitori
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono iniettate dal runtime: non
vanno impostate a mano e **non vanno messe nel `.env` dell'app**.

## Prova in locale

```bash
supabase functions serve importa-fattura-fornitore --no-verify-jwt

curl -X POST http://localhost:54321/functions/v1/importa-fattura-fornitore \
  -H 'Content-Type: application/xml' \
  --data-binary @IT01234567890_00001.xml
```

## `importa-fattura-fornitore`

Accetta l'XML grezzo (`Content-Type: application/xml`) o un JSON
`{ xml, nomeFile? }`. La prima forma è comoda per un webhook, la seconda è quella
che usa l'app.

Cosa fa, e le tre cose che vale la pena sapere:

1. **Toglie i prefissi di namespace.** FatturaPA arriva con `p:`, `ns2:`, `ns3:`
   o senza, a seconda di chi genera il file: un import scritto contro un solo
   fornitore smette di funzionare col secondo.
2. **Crea il fornitore se non lo trova** per partita IVA. Bloccare l'import per
   un'anagrafica mancante costringerebbe a uscire, crearla e ricominciare — con
   l'XML già in mano e tutti i dati dentro.
3. **La fattura resta in BOZZA**, e le categorie di costo finiscono in
   `categoriaSuggerita`, non in `categoria`. Sono indovinate da una regex sulla
   descrizione: registrarle da sole vorrebbe dire far entrare in contabilità
   righe che nessuno ha guardato, e una categoria sbagliata sposta una spesa nel
   riepilogo sbagliato.

Sul doppio import — la stessa fattura inoltrata due volte, che capita spesso —
risponde **409** con l'id di quella già presente, così chi ha chiamato ci porta
sopra invece di vedere un errore e riprovare.

## `scadenze-fornitori`

Legge `v_scadenzario_fornitori`, raggruppa in scadute e in scadenza entro sette
giorni, e costruisce il testo del messaggio.

**Non invia niente**, e lo dichiara nella risposta con `inviato: false` e il
motivo. Serve una chiave di un provider:

```bash
supabase secrets set RESEND_API_KEY=... DESTINATARIO_SCADENZE=omar@growe.dev
```

Fingere un invio riuscito sarebbe peggio che non averlo: nessuno andrebbe a
cercare l'email mancante.

Per farla girare ogni mattina, una volta deployata:

```sql
select cron.schedule(
  'scadenze-fornitori',
  '0 7 * * 1-5',            -- 07:00, dal lunedì al venerdì
  $$select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scadenze-fornitori',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
    )$$
);
```

Richiede le estensioni `pg_cron` e `pg_net`, da abilitare dal dashboard.
