-- =============================================================================
-- 015 — Dati di esempio: commesse
-- =============================================================================
-- Le stesse commesse di `src/mocks/commesse.ts`, portate nel database e
-- agganciate ai clienti veri di `010_seed_clienti.sql`.
--
-- Tre regole che questi dati rispettano, e che vale la pena rispettare anche
-- aggiungendone altri:
--
--  1. **Ogni stato compare almeno due volte.** Con un solo esemplare per stato
--     non si vede se le badge del ciclo di vita funzionano davvero, e le due
--     che contano — sospesa e annullata — sono proprio quelle che in un
--     archivio vero si incontrano di rado.
--  2. **Le date sono relative a `current_date`, mai assolute.** Un seed con
--     date fisse invecchia: sei mesi dopo il calendario apre su un mese vuoto e
--     l'app sembra rotta invece che i dati vecchi.
--  3. **`ore_reali` e `avanzamento_pct` non si scrivono.** Li calcola il
--     trigger `commesse_ricalcola_derivati` dalle lavorazioni. Metterli qui a
--     mano vorrebbe dire un seed che si contraddice da solo il giorno che
--     qualcuno cambia una lavorazione.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`, quindi rilanciarlo non
-- duplica niente.
--
-- Per svuotare e ricominciare:
--   delete from public.commesse where id::text like '00000000-0000-4000-a000-%';
-- =============================================================================

insert into public.commesse (
  id, numero, cliente_id, luogo_intervento_id, stato,
  data_pianificata, data_inizio, data_fine,
  ore_previste, lavorazioni, rapportino, note
) values

-- ── completate ──────────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-000000000001',
   'CM-' || to_char(current_date, 'YYYY') || '-0001',
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
   'completata',
   current_date - 38, current_date - 38, current_date - 37,
   16,
   '[{"id":"a1","descrizione":"Potatura di rimonda del secco su quattro tigli","orePreviste":10,"oreReali":11,"completata":true},
     {"id":"a2","descrizione":"Cippatura e carico della ramaglia","orePreviste":4,"oreReali":4,"completata":true},
     {"id":"a3","descrizione":"Pulizia area e ripristino degli accessi","orePreviste":2,"oreReali":2.5,"completata":true}]'::jsonb,
   jsonb_build_object(
     'dataCompilazione', (current_date - 37)::text,
     'oreLavorate', 17.5,
     'operatori', jsonb_build_array('Tommaso Neri', 'Andrea Lolli'),
     'materialiUsati', 'Sacchi per ramaglia, mastice cicatrizzante',
     'noteCliente', 'L''amministratore chiede un preventivo per il cedro sul lato nord.',
     'firmatoIl', (current_date - 37)::text
   ),
   'Accesso dal cortile interno, cancello aperto dal portiere alle 7:30.'),

  ('00000000-0000-4000-a000-000000000002',
   'CM-' || to_char(current_date, 'YYYY') || '-0002',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-9000-000000000006',
   'completata',
   current_date - 30, current_date - 30, current_date - 28,
   40,
   '[{"id":"b1","descrizione":"Abbattimento controllato di un cedro dell''Atlante di 18 m con piattaforma aerea","orePreviste":16,"oreReali":20,"completata":true},
     {"id":"b2","descrizione":"Sezionamento e allontanamento del fusto","orePreviste":12,"oreReali":12,"completata":true},
     {"id":"b3","descrizione":"Fresatura della ceppaia","orePreviste":6,"oreReali":6,"completata":true},
     {"id":"b4","descrizione":"Smaltimento in discarica autorizzata","orePreviste":6,"oreReali":5,"completata":true}]'::jsonb,
   jsonb_build_object(
     'dataCompilazione', (current_date - 28)::text,
     'oreLavorate', 43,
     'operatori', jsonb_build_array('Tommaso Neri', 'Andrea Lolli', 'Michele Fabbri'),
     'materialiUsati', 'Noleggio piattaforma 22 m (2 giorni), carburante per la cippatrice',
     'noteCliente', 'Chiusura strada concordata con la Polizia Locale.',
     'firmatoIl', (current_date - 28)::text
   ),
   'Tre ore oltre il previsto: il cedro era piu compromesso di quanto visto in sopralluogo. Serve il CIG in fattura.'),

  ('00000000-0000-4000-a000-000000000003',
   'CM-' || to_char(current_date, 'YYYY') || '-0003',
   '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-9000-000000000008',
   'completata',
   current_date - 55, current_date - 55, current_date - 55,
   8,
   '[{"id":"c1","descrizione":"Cippatura delle ramaglie di potatura accatastate","orePreviste":8,"oreReali":7,"completata":true}]'::jsonb,
   jsonb_build_object(
     'dataCompilazione', (current_date - 55)::text,
     'oreLavorate', 7,
     'operatori', jsonb_build_array('Andrea Lolli'),
     'firmatoIl', (current_date - 55)::text
   ),
   null),

-- ── in corso ────────────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-000000000004',
   'CM-' || to_char(current_date, 'YYYY') || '-0004',
   '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-9000-00000000000f',
   'in_corso',
   current_date - 1, current_date - 1, null,
   24,
   '[{"id":"d1","descrizione":"Potatura di contenimento della siepe di lauroceraso (140 m)","orePreviste":10,"oreReali":10,"completata":true},
     {"id":"d2","descrizione":"Rimonda del secco su sei pini domestici","orePreviste":10,"oreReali":4,"completata":false},
     {"id":"d3","descrizione":"Cippatura e smaltimento","orePreviste":4,"completata":false}]'::jsonb,
   null,
   'Lavorare prima delle 10 per non disturbare la colazione degli ospiti.'),

  ('00000000-0000-4000-a000-000000000005',
   'CM-' || to_char(current_date, 'YYYY') || '-0005',
   '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-9000-000000000013',
   'in_corso',
   current_date - 2, current_date - 2, null,
   32,
   '[{"id":"e1","descrizione":"Sfalcio delle aree verdi perimetrali del piazzale","orePreviste":12,"oreReali":13,"completata":true},
     {"id":"e2","descrizione":"Abbattimento di nove robinie sul confine","orePreviste":16,"oreReali":7,"completata":false},
     {"id":"e3","descrizione":"Diserbo meccanico lungo la recinzione","orePreviste":4,"completata":false}]'::jsonb,
   null,
   'Area industriale: gilet alta visibilita obbligatorio, accesso dal varco 3.'),

-- ── pianificate ─────────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-000000000006',
   'CM-' || to_char(current_date, 'YYYY') || '-0006',
   '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-9000-00000000000d',
   'pianificata',
   current_date + 3, null, null,
   20,
   '[{"id":"f1","descrizione":"Potatura di due platani con piattaforma aerea","orePreviste":14,"completata":false},
     {"id":"f2","descrizione":"Cippatura e smaltimento della ramaglia","orePreviste":6,"completata":false}]'::jsonb,
   null,
   'Serve l''occupazione di suolo pubblico: richiesta protocollata, in attesa di risposta.'),

  ('00000000-0000-4000-a000-000000000007',
   'CM-' || to_char(current_date, 'YYYY') || '-0007',
   '00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9000-00000000000a',
   'pianificata',
   current_date + 5, null, null,
   12,
   '[{"id":"g1","descrizione":"Consolidamento con tirante dinamico su un cipresso secolare","orePreviste":8,"completata":false},
     {"id":"g2","descrizione":"Verifica visiva VTA sugli altri quattro cipressi","orePreviste":4,"completata":false}]'::jsonb,
   null,
   null),

  ('00000000-0000-4000-a000-000000000008',
   'CM-' || to_char(current_date, 'YYYY') || '-0008',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-9000-000000000004',
   'pianificata',
   current_date + 5, null, null,
   48,
   '[{"id":"h1","descrizione":"Censimento e mappatura di 120 alberature del parco","orePreviste":24,"completata":false},
     {"id":"h2","descrizione":"Potatura di sicurezza sulle alberature lungo i vialetti","orePreviste":24,"completata":false}]'::jsonb,
   null,
   'Due squadre in parallelo, cantiere di tre giorni. Stesso giorno della 0007: il calendario deve reggere due commesse nella stessa cella.'),

  ('00000000-0000-4000-a000-000000000009',
   'CM-' || to_char(current_date, 'YYYY') || '-0009',
   '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-9000-000000000010',
   'pianificata',
   current_date + 12, null, null,
   6,
   '[{"id":"i1","descrizione":"Potatura di una quercia nel cortile della scuola","orePreviste":6,"completata":false}]'::jsonb,
   null,
   'Da fare a scuola chiusa: sabato mattina.'),

-- ── da pianificare ──────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-00000000000a',
   'CM-' || to_char(current_date, 'YYYY') || '-0010',
   '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-9000-000000000012',
   'da_pianificare',
   null, null, null,
   18,
   '[{"id":"j1","descrizione":"Abbattimento di un salice piangente pericolante sul laghetto","orePreviste":12,"completata":false},
     {"id":"j2","descrizione":"Fresatura della ceppaia e ripristino del prato","orePreviste":6,"completata":false}]'::jsonb,
   null,
   'Il cliente deve confermare la settimana. Accesso mezzi difficile: strada di collina stretta.'),

  ('00000000-0000-4000-a000-00000000000b',
   'CM-' || to_char(current_date, 'YYYY') || '-0011',
   '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-9000-000000000009',
   'da_pianificare',
   null, null, null,
   4,
   -- Volutamente senza lavorazioni: e' il caso che manda l'avanzamento a 0 con
   -- zero righe, dove una divisione fatta male darebbe NaN invece che 0%.
   '[]'::jsonb,
   null,
   'Sopralluogo fatto, lavorazioni ancora da dettagliare.'),

-- ── sospese ─────────────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-00000000000c',
   'CM-' || to_char(current_date, 'YYYY') || '-0012',
   '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-9000-000000000007',
   'sospesa',
   current_date - 14, current_date - 14, null,
   28,
   '[{"id":"k1","descrizione":"Trinciatura del noccioleto (2,4 ha)","orePreviste":16,"oreReali":6,"completata":false},
     {"id":"k2","descrizione":"Ripristino della capezzagna","orePreviste":12,"completata":false}]'::jsonb,
   null,
   'Sospesa per terreno impraticabile dopo le piogge. Si riprende a terreno asciutto.'),

  ('00000000-0000-4000-a000-00000000000d',
   'CM-' || to_char(current_date, 'YYYY') || '-0013',
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000002',
   'sospesa',
   current_date - 7, null, null,
   10,
   '[{"id":"l1","descrizione":"Abbattimento del cedro sul lato strada","orePreviste":10,"completata":false}]'::jsonb,
   null,
   'In attesa dell''autorizzazione paesaggistica del Comune.'),

-- ── annullate ───────────────────────────────────────────────────────────────
  ('00000000-0000-4000-a000-00000000000e',
   'CM-' || to_char(current_date, 'YYYY') || '-0014',
   '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-9000-00000000000f',
   'annullata',
   current_date - 21, null, null,
   8,
   '[{"id":"m1","descrizione":"Messa a dimora di dodici carpini in siepe","orePreviste":8,"completata":false}]'::jsonb,
   null,
   'Annullata dal cliente: rimandata alla stagione di piantagione autunnale.'),

  ('00000000-0000-4000-a000-00000000000f',
   'CM-' || to_char(current_date, 'YYYY') || '-0015',
   '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-9000-000000000013',
   'annullata',
   null, null, null,
   4,
   '[{"id":"n1","descrizione":"Sfalcio straordinario dell''area nord","orePreviste":4,"completata":false}]'::jsonb,
   null,
   'Doppione della 0005, annullata in fase di inserimento.')

on conflict (id) do nothing;
