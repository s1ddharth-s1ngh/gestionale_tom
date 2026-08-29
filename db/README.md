# Schema del database

SQL del gestionale Tom. **Si esegue una volta sola, in ordine**, dal SQL Editor di Supabase
oppure via `psql`.

```
000_setup.sql       estensione pgcrypto + funzione set_updated_at()
001_clienti.sql     clienti, luoghi_intervento
002_preventivi.sql  preventivi + vista v_preventivi (stato "scaduto" derivato)
003_commesse.sql    commesse + trigger ore/avanzamento + vista v_commesse
004_fatture.sql     fatture + vista v_fatture (incassato, residuo, stato derivato)
005_costi.sql       fornitori, mezzi, costi + vista v_costi
006_rls.sql         Row Level Security — LEGGERE L'AVVISO IN TESTA AL FILE
007_fatture_fornitore.sql   fatture passive + viste v_fatture_fornitore e v_marginalita_commessa
008_costi_riga_fattura.sql  costi.riga_fattura_id + indice unico anti-doppia-generazione
009_numerazione.sql         assegna_numero_fattura(): progressivo annuale sotto lock
012_genera_costi_da_fattura.sql  le righe di una fattura fornitore diventano costi, in transazione

010_seed_clienti.sql   dati di esempio: clienti e luoghi di intervento
011_seed_preventivi.sql dati di esempio: 24 preventivi — richiede 010
013_seed_fatture.sql   dati di esempio: 13 fatture attive — richiede 010
014_seed_costi.sql     dati di esempio: 9 fornitori, 6 mezzi, 38 costi
015_seed_commesse.sql  dati di esempio: 15 commesse — richiede 010
016_seed_fatture_fornitore.sql  dati di esempio: 10 fatture ricevute — richiede 014
```

**`006_rls.sql` va rilanciato dopo il `007`**: quel file aggiunge due tabelle con RLS attiva,
e finché non ricevono una policy rispondono zero righe a tutti — che a schermo si legge come
"le fatture fornitore non ci sono" invece che "non hai il permesso".

L'ordine non è decorativo: `002` referenzia `001`, `003` aggiunge una foreign key a `002`,
`004` ne aggiunge una a `003`. Eseguirli fuori ordine dà errori di chiave mancante.

## La via breve: `TUTTO.sql`

I file numerati sono la fonte; **`TUTTO.sql` è la loro concatenazione nell'ordine giusto**, da
incollare in una volta sola nel SQL Editor. Diciassette esecuzioni in sequenza sono diciassette
occasioni di saltarne una o invertirne due, e l'ordine non è decorativo: sbagliarlo dà un errore
di chiave mancante a metà, con mezzo schema già creato.

È **generato**: non si modifica a mano. Si modificano i file numerati e si rigenera, o le due
versioni divergono e non si sa più quale sia quella vera.

## Come eseguirli

**Dal SQL Editor** (https://supabase.com/dashboard → progetto → SQL Editor): apri i file in
ordine, incolla, esegui. Sono idempotenti (`create table if not exists`, `drop trigger if
exists`), quindi rilanciarli non rompe niente.

**Da `psql`**, se hai la stringa di connessione:

```bash
for f in db/0*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

## Le tre decisioni che spiegano tutto il resto

**1. JSONB per ciò che vive solo dentro il padre.** Righe di preventivo, alberi rilevati,
foto, lavorazioni, incassi e solleciti sono colonne `jsonb`. Non vengono mai letti senza il
record che li contiene e nessuno li referenzia da fuori: renderli tabelle significherebbe
quattro join per aprire una scheda e altrettanti insert/delete per salvarla.

L'eccezione è `luoghi_intervento`, che **è una tabella vera** proprio perché preventivi e
commesse ci puntano: un riferimento dentro un JSONB non è una foreign key, e nessuno
impedirebbe di cancellare un luogo su cui sono appesi tre lavori.

Il prezzo da sapere: non si possono aggregare gli incassi in SQL con un `sum()` semplice —
serve `jsonb_array_elements`, che è quello che fa `v_fatture`. Con qualche centinaio di
fatture non è un problema; con centomila lo diventerebbe.

**2. Gli stati derivati non si salvano.** Un preventivo `scaduto`, una fattura `pagata` o
`pagata_parziale`, le ore reali e l'avanzamento di una commessa **non stanno in colonna come
verità**: si calcolano. In tabella resta solo la decisione umana — `bozza`, `inviato`,
`emessa`. Le viste `v_preventivi`, `v_fatture` e il trigger su `commesse` aggiungono il
resto.

Il motivo è sempre lo stesso: un campo che si può scrivere a mano diverge dai dati il primo
giorno che qualcuno registra un incasso e si dimentica di aggiornare lo stato. E se lo si
tenesse allineato con un job, quel giorno che il job non gira i dati mentono.

**Conseguenza per il frontend:** le liste leggono dalle **viste**, non dalle tabelle. Le
scritture vanno sulle tabelle.

**3. Soft-delete ovunque.** Ogni tabella ha `created_at`, `updated_at`, `deleted_at` — la
convenzione di Telebi, senza eccezioni. Non si cancella: si valorizza `deleted_at = now()`, e
ogni query filtra `deleted_at is null`. Le foreign key sono `on delete restrict` proprio
perché la cancellazione vera non deve avvenire: un cliente eliminato per errore si porterebbe
dietro preventivi, commesse e fatture.

## Cosa il database impedisce, e non solo il form

I vincoli che contano sono anche `CHECK` in tabella, non solo regole zod nel browser: valgono
per gli import, per le correzioni fatte a mano da SQL e per qualunque client futuro.

- `chk_fiscale` — P.IVA obbligatoria per le aziende, codice fiscale per tutti gli altri
- `chk_referente_condominio` — un condominio senza amministratore non si inserisce
- `chk_carburante_ha_mezzo` — **è il requisito «carburante distinto per mezzo»**
- `chk_noleggio_ha_tipo` — un noleggio dice sempre cosa si è noleggiato
- `chk_emessa` — una fattura emessa ha emissione e scadenza, o non entra nello scadenzario
- `chk_pianificata` — una commessa pianificata ha una data, o sparisce dal calendario
- `chk_esito` — un preventivo accettato o rifiutato dice quando è stato deciso

## Sicurezza

`006_rls.sql` apre il database a chiunque abbia la chiave pubblica, perché **non c'è ancora un
login**. Va bene per dati di prova in locale; smette di andare bene nel momento in cui entra
il primo cliente vero o l'app va online. La versione con `to authenticated` è già scritta in
fondo a quel file, commentata.
