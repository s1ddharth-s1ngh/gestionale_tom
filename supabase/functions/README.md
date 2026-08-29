# Edge function

Funzioni Deno che girano sull'edge runtime di Supabase. **Non sono ancora
deployate**: il progetto Supabase nuovo non è configurato, e vanno caricate
quando lo sarà.

```
_shared/risposta.ts             client amministratore, CORS, helper di risposta
importa-fattura-xml/            XML FatturaPA → record in fatture_fornitore
registra-fattura-fornitore/     invoca genera_costi_da_fattura(): le righe diventano costi
promemoria-scadenze/            cosa c'è da pagare — manda l'email, per pg_cron
numera-fattura/                 progressivo annuale delle fatture attive, sotto lock
```

Sono registrate in `../config.toml`, tutte con `verify_jwt = false` perché
l'app non ha ancora autenticazione. **Va rimesso a `true` insieme al login** —
finché è false chiunque conosca l'URL può invocarle.

## Il criterio: quando una cosa merita una edge function

Quattro funzioni, e non è una lista incompleta. Il criterio è **serve qualcosa
che il browser non deve o non può fare**:

- una **chiave** che nel browser sarebbe pubblica — la `service_role` per
  scrivere, quella del servizio di posta per spedire;
- un'operazione che deve **restare atomica** anche se la connessione cade;
- un lavoro che deve poter partire **quando l'app non è aperta** — un webhook
  che consegna una fattura, una scadenza che matura di lunedì mattina;
- un progressivo che due schede aperte assegnerebbero uguale.

Tutto ciò che è **aggregazione resta una vista SQL** — `v_scadenzario_fornitori`,
`v_fatture_fornitore`, `v_costi`. Una edge function che fa somme è un giro di
rete in più per un lavoro che il database fa meglio, e un secondo posto in cui
la stessa formula può divergere.

Per la stessa ragione la generazione dei costi **non è scritta qui**:
`registra-fattura-fornitore` non fa il lavoro, invoca
`public.genera_costi_da_fattura()` in `db/012`. Una transazione la sa fare
plpgsql, non un ciclo `for` in TypeScript che a metà può perdere la connessione
e lasciare tre costi su cinque.

## Deploy

Serve la CLI di Supabase e il progetto collegato:

```bash
npm i -g supabase          # o brew install supabase/tap/supabase
supabase login
supabase link --project-ref <PROJECT_REF>

supabase functions deploy importa-fattura-xml
supabase functions deploy registra-fattura-fornitore
supabase functions deploy promemoria-scadenze
supabase functions deploy numera-fattura
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono iniettate dal runtime: non
vanno impostate a mano e **non vanno messe nel `.env` dell'app**.

Per il promemoria serve invece un secret vero:

```bash
supabase secrets set RESEND_API_KEY=... DESTINATARIO_SCADENZE=omar@growe.dev
```

## Prova in locale

```bash
supabase functions serve importa-fattura-xml --no-verify-jwt

curl -X POST http://localhost:54321/functions/v1/importa-fattura-xml \
  -H 'Content-Type: application/json' \
  -d "{\"xml\": $(jq -Rs . < IT01234567890_00001.xml)}"
```

## Prima di andare in produzione

Tre cose, in quest'ordine:

1. `verify_jwt = true` in `config.toml`, insieme al login.
2. `db/006_rls.sql` nella versione con `to authenticated` — quella attiva oggi
   apre il database a chiunque abbia la chiave pubblica.
3. Il secret del servizio di posta: finché non c'è, `promemoria-scadenze`
   costruisce il messaggio e **dichiara** di non averlo mandato, invece di
   fingere che sia partito. Nessuno andrebbe a cercare un'email che crede
   inviata.
