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

-- Niente predicato sull'indice, ed è voluto.
--
-- In Postgres due NULL non collidono mai, quindi i costi inseriti a mano — che
-- hanno entrambe le colonne NULL — non si disturbano fra loro e non serve
-- escluderli. Un indice parziale, oltre a non servire, renderebbe impossibile
-- l'inferenza di ON CONFLICT da PostgREST, che non permette di dichiararne il
-- predicato: la generazione idempotente smetterebbe di funzionare proprio dove
-- serve.
--
-- I soft-deleted restano dentro l'indice di proposito: se si cancella un costo
-- generato e si rigenera, il duplicato è quasi sempre un errore. Per rigenerare
-- davvero si azzera prima il legame (`update costi set fattura_fornitore_id =
-- null, riga_fattura_id = null where ...`), che è un gesto esplicito.
create unique index if not exists uq_costi_riga_fattura
  on public.costi (fattura_fornitore_id, riga_fattura_id);
