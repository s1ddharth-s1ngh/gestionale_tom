-- =============================================================================
-- 008 — Il costo sa da quale RIGA di fattura fornitore è nato
-- =============================================================================
-- Il 007 ha aggiunto `costi.fattura_fornitore_id`, che dice da quale documento
-- viene un costo. Non basta a impedire di generarlo due volte.
--
-- Il controllo «questa fattura ha già dei costi, non rigenerare» fatto
-- nell'applicazione ha una finestra: fra la lettura del conteggio e la
-- scrittura delle righe. Due click ravvicinati, o due schede aperte, e il
-- periodo si ritrova con la spesa raddoppiata — senza nessun errore, perché
-- ogni singola riga è valida. È il bug più caro possibile in questo modulo:
-- non si vede, e falsa tutti i riepiloghi finché qualcuno non riconcilia a mano.
--
-- Con questa colonna la doppia generazione diventa IMPOSSIBILE invece che
-- improbabile: ogni costo porta l'id della riga JSONB da cui è nato, e l'indice
-- unico rifiuta il secondo tentativo. L'applicazione non deve più ricordarsi
-- di controllare, ed è il punto — un invariante ricordato è un invariante che
-- prima o poi qualcuno dimentica.
-- =============================================================================

alter table public.costi
  add column if not exists riga_fattura_id text;

comment on column public.costi.riga_fattura_id is
  'Id della riga JSONB di fatture_fornitore.righe che ha generato questo costo.';

-- Il predicato `deleted_at is null` NON è decorativo, ed è la parte che si
-- sbaglia più facilmente.
--
-- `annulla_costi_da_fattura` (012) corregge una registrazione sbagliata con un
-- soft-delete: i costi restano in tabella con `deleted_at` valorizzato. Senza
-- predicato continuerebbero a occupare il loro posto nell'indice, e la
-- rigenerazione — che il suo controllo di idempotenza lascia passare, perché
-- guarda solo le righe vive — sbatterebbe contro una violazione di unicità.
-- Annullare e rifare, cioè l'unica ragione per cui `annulla` esiste, sarebbe
-- rotto.
--
-- In Postgres due NULL non collidono mai, quindi i costi inseriti a mano — che
-- hanno entrambe le colonne NULL — non si disturbano fra loro comunque.
--
-- Nota: un indice parziale non è inferibile da `ON CONFLICT` via PostgREST, che
-- non permette di dichiararne il predicato. Non è un problema, perché la
-- generazione passa dalla funzione `genera_costi_da_fattura` (012) con un
-- INSERT normale, non da un upsert del client.
create unique index if not exists uq_costi_riga_fattura
  on public.costi (fattura_fornitore_id, riga_fattura_id)
  where deleted_at is null;
