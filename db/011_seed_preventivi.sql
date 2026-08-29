-- =============================================================================
-- 011 — Dati di esempio: preventivi
-- =============================================================================
-- Richiede 010_seed_clienti.sql: i `cliente_id` e i `luogo_intervento_id` qui
-- sotto sono quelli fissi del seed clienti. Eseguirlo prima, o le foreign key
-- falliscono.
--
-- Sono ventiquattro e non trenta come i mock, ed è una scelta: un seed serve a
-- coprire i casi, non a fare volume. Ci sono comunque tutti gli stati almeno due
-- volte, il preventivo da dodici righe che sforza la tabella, quello senza
-- righe che deve dare totale zero invece di NaN, la descrizione lunghissima che
-- deve troncare, e abbastanza record da mandare l'elenco in seconda pagina
-- (PER_PAGINA_DEFAULT = 20).
--
-- Le date sono TUTTE relative a `current_date`, come nei mock: con date fisse,
-- dopo qualche mese sarebbero scaduti tutti e la pill «Inviati» resterebbe
-- vuota per sempre — proprio lo stato che qui è derivato e va visto funzionare.
--
-- `commessa_id` è sempre NULL: le commesse non sono ancora migrate, e un id
-- inventato non passerebbe la foreign key. Gli accettati sono quindi tutti
-- candidati alla conversione, che è comodo per provarla.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`.
--
-- Per svuotare e ricominciare:
--   delete from public.preventivi where id::text like '00000000-0000-4000-a000-%';
-- =============================================================================

insert into public.preventivi (
  id, numero, cliente_id, luogo_intervento_id, stato,
  data_emissione, valido_fino, data_invio, data_esito,
  sopralluogo, righe, aliquota_iva, note
) values

-- ── Bozze ───────────────────────────────────────────────────────────────────
('00000000-0000-4000-a000-000000000001',
 'PR-' || to_char(current_date,'YYYY') || '-0001',
 '00000000-0000-4000-8000-000000000006','00000000-0000-4000-9000-000000000009','bozza',
 current_date - 2, current_date + 28, null, null,
 '{"accessibilita":"difficile","criticita":["cavi_elettrici","vicinanza_edifici"],
   "noteTecniche":"Linea elettrica aerea sopra la chioma: chiedere la sospensione a Enel prima di salire. Cortile stretto, la piattaforma entra solo smontata.",
   "alberi":[{"id":"a1","specie":"Cedro dell''Atlante","altezzaM":16,"diametroCm":72,"quantita":1,"lavorazione":"abbattimento","note":"Inclinato verso il fabbricato, capitozzature vecchie sul lato sud."}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Abbattimento in tree climbing con calata controllata dei toppi","quantita":1,"unita":"corpo","prezzoUnitario":1450},
   {"id":"r2","descrizione":"Cippatura della ramaglia e carico","quantita":6,"unita":"ore","prezzoUnitario":45},
   {"id":"r3","descrizione":"Smaltimento in impianto autorizzato","quantita":1,"unita":"corpo","prezzoUnitario":180}]'::jsonb,
 22, 'In attesa che l''amministratore confermi la delibera assembleare.'),

-- Zero righe: il totale deve leggersi come zero, non come NaN.
('00000000-0000-4000-a000-000000000002',
 'PR-' || to_char(current_date,'YYYY') || '-0002',
 '00000000-0000-4000-8000-00000000000b','00000000-0000-4000-9000-000000000012','bozza',
 current_date, current_date + 30, null, null,
 '{"accessibilita":"facile","criticita":[],"noteTecniche":"Sopralluogo fatto stamattina, righe ancora da comporre.","alberi":[],"foto":[]}'::jsonb,
 '[]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000003',
 'PR-' || to_char(current_date,'YYYY') || '-0003',
 '00000000-0000-4000-8000-000000000009','00000000-0000-4000-9000-00000000000f','bozza',
 current_date - 5, current_date + 25, null, null,
 '{"accessibilita":"facile","criticita":["presenza_pubblico"],
   "noteTecniche":"Lavorare prima delle 10, la terrazza colazioni è sotto le chiome.",
   "alberi":[{"id":"a1","specie":"Magnolia","altezzaM":9,"diametroCm":38,"quantita":2,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di rimonda su due magnolie","quantita":8,"unita":"ore","prezzoUnitario":48},
   {"id":"r2","descrizione":"Raccolta e smaltimento del materiale di risulta","quantita":1,"unita":"corpo","prezzoUnitario":140}]'::jsonb,
 22, null),

-- Dodici righe, IVA agevolata al 10% e uno sconto scritto come riga negativa.
('00000000-0000-4000-a000-000000000004',
 'PR-' || to_char(current_date,'YYYY') || '-0004',
 '00000000-0000-4000-8000-000000000004','00000000-0000-4000-9000-000000000008','bozza',
 current_date - 4, current_date + 26, null, null,
 '{"accessibilita":"media","criticita":["pendenza","accesso_difficile"],
   "noteTecniche":"Intervento su più giornate. Il fondo regge i mezzi solo a terreno asciutto: da rimandare dopo le piogge.",
   "alberi":[{"id":"a1","specie":"Robinia","altezzaM":14,"diametroCm":42,"quantita":9,"lavorazione":"abbattimento"},
             {"id":"a2","specie":"Pioppo cipressino","altezzaM":18,"diametroCm":46,"quantita":4,"lavorazione":"messa_in_sicurezza"},
             {"id":"a3","specie":"Nocciolo","altezzaM":4,"diametroCm":12,"quantita":120,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r01","descrizione":"Abbattimento di nove robinie sul confine","quantita":16,"unita":"ore","prezzoUnitario":45},
   {"id":"r02","descrizione":"Sezionamento e accatastamento dei fusti","quantita":8,"unita":"ore","prezzoUnitario":40},
   {"id":"r03","descrizione":"Fresatura delle ceppaie","quantita":9,"unita":"nr","prezzoUnitario":65},
   {"id":"r04","descrizione":"Messa in sicurezza di quattro pioppi cipressini","quantita":12,"unita":"ore","prezzoUnitario":48},
   {"id":"r05","descrizione":"Potatura di produzione del noccioleto","quantita":2.4,"unita":"mq","prezzoUnitario":780},
   {"id":"r06","descrizione":"Trinciatura dei residui di potatura","quantita":10,"unita":"ore","prezzoUnitario":42},
   {"id":"r07","descrizione":"Ripristino della capezzagna con livellatrice","quantita":12,"unita":"ore","prezzoUnitario":55},
   {"id":"r08","descrizione":"Noleggio trincia forestale","quantita":3,"unita":"nr","prezzoUnitario":220},
   {"id":"r09","descrizione":"Carburante e consumabili di cantiere","quantita":1,"unita":"corpo","prezzoUnitario":340},
   {"id":"r10","descrizione":"Trasporto mezzi andata e ritorno","quantita":64,"unita":"km","prezzoUnitario":1.4},
   {"id":"r11","descrizione":"Smaltimento del legname non recuperabile","quantita":4200,"unita":"kg","prezzoUnitario":0.12},
   {"id":"r12","descrizione":"Sconto per intervento su più giornate consecutive","quantita":1,"unita":"corpo","prezzoUnitario":-650}]'::jsonb,
 10, 'Sconto a totale scritto come riga negativa: il totale resta la somma delle righe, sempre.'),

-- Descrizione lunghissima: deve troncare, non sfondare.
('00000000-0000-4000-a000-000000000005',
 'PR-' || to_char(current_date,'YYYY') || '-0005',
 '00000000-0000-4000-8000-000000000003','00000000-0000-4000-9000-000000000005','bozza',
 current_date - 3, current_date + 27, null, null,
 '{"accessibilita":"media","criticita":["presenza_pubblico","vicinanza_edifici"],
   "noteTecniche":"Lavori solo in orario extrascolastico o durante le vacanze.",
   "alberi":[{"id":"a1","specie":"Ippocastano","altezzaM":13,"diametroCm":55,"quantita":18,"lavorazione":"vta"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Valutazione di stabilità VTA su diciotto ippocastani del cortile scolastico, comprensiva di schedatura fotografica, rilievo dendrometrico, prova strumentale con martello a impulsi sui soggetti classificati in classe C e relazione tecnica firmata da agronomo abilitato per il deposito in Comune","quantita":18,"unita":"nr","prezzoUnitario":95},
   {"id":"r2","descrizione":"Relazione agronomica e deposito pratica","quantita":1,"unita":"corpo","prezzoUnitario":420}]'::jsonb,
 22, null),

-- ── Inviati, ancora validi ──────────────────────────────────────────────────
('00000000-0000-4000-a000-000000000006',
 'PR-' || to_char(current_date,'YYYY') || '-0006',
 '00000000-0000-4000-8000-000000000003','00000000-0000-4000-9000-000000000004','inviato',
 current_date - 12, current_date + 18, current_date - 11, null,
 '{"accessibilita":"facile","criticita":["presenza_pubblico"],
   "noteTecniche":"Area aperta al pubblico: transennare prima di iniziare.",
   "alberi":[{"id":"a1","specie":"Platano","altezzaM":17,"diametroCm":68,"quantita":6,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di sicurezza su sei platani con piattaforma aerea","quantita":24,"unita":"ore","prezzoUnitario":52},
   {"id":"r2","descrizione":"Noleggio piattaforma aerea 22 m","quantita":3,"unita":"nr","prezzoUnitario":280},
   {"id":"r3","descrizione":"Cippatura e smaltimento della ramaglia","quantita":1,"unita":"corpo","prezzoUnitario":340}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000007',
 'PR-' || to_char(current_date,'YYYY') || '-0007',
 '00000000-0000-4000-8000-00000000000b','00000000-0000-4000-9000-000000000012','inviato',
 current_date - 8, current_date + 22, current_date - 8, null,
 '{"accessibilita":"facile","criticita":[],
   "alberi":[{"id":"a1","specie":"Cipresso comune","altezzaM":12,"diametroCm":34,"quantita":11,"lavorazione":"rimonda_secco"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Rimonda del secco su undici cipressi del viale","quantita":18,"unita":"ore","prezzoUnitario":46},
   {"id":"r2","descrizione":"Trattamento contro il cancro corticale","quantita":11,"unita":"nr","prezzoUnitario":28},
   {"id":"r3","descrizione":"Raccolta e smaltimento","quantita":1,"unita":"corpo","prezzoUnitario":190}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000008',
 'PR-' || to_char(current_date,'YYYY') || '-0008',
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-9000-000000000001','inviato',
 current_date - 6, current_date + 24, current_date - 6, null,
 '{"accessibilita":"difficile","criticita":["vicinanza_edifici"],
   "noteTecniche":"Passo carraio stretto, la piattaforma entra solo smontata. Chiedere le chiavi al portiere.",
   "alberi":[{"id":"a1","specie":"Tiglio","altezzaM":11,"diametroCm":40,"quantita":4,"lavorazione":"rimonda_secco"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Rimonda del secco su quattro tigli del cortile","quantita":12,"unita":"ore","prezzoUnitario":48},
   {"id":"r2","descrizione":"Cippatura in loco","quantita":4,"unita":"ore","prezzoUnitario":42}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000009',
 'PR-' || to_char(current_date,'YYYY') || '-0009',
 '00000000-0000-4000-8000-000000000008','00000000-0000-4000-9000-00000000000d','inviato',
 current_date - 15, current_date + 15, current_date - 14, null,
 '{"accessibilita":"facile","criticita":[],
   "alberi":[{"id":"a1","specie":"Lauroceraso","altezzaM":3,"diametroCm":8,"quantita":80,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di contenimento della siepe (80 m lineari)","quantita":14,"unita":"ore","prezzoUnitario":40},
   {"id":"r2","descrizione":"Raccolta e smaltimento del materiale di risulta","quantita":1,"unita":"corpo","prezzoUnitario":160}]'::jsonb,
 22, null),

-- Scade fra tre giorni: è quello che in elenco deve segnarsi in ambra.
('00000000-0000-4000-a000-00000000000a',
 'PR-' || to_char(current_date,'YYYY') || '-0010',
 '00000000-0000-4000-8000-000000000009','00000000-0000-4000-9000-00000000000f','inviato',
 current_date - 27, current_date + 3, current_date - 27, null,
 '{"accessibilita":"facile","criticita":["presenza_pubblico"],
   "alberi":[{"id":"a1","specie":"Olivo","altezzaM":4,"diametroCm":22,"quantita":14,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di formazione su quattordici olivi ornamentali","quantita":16,"unita":"ore","prezzoUnitario":44},
   {"id":"r2","descrizione":"Concimazione e pacciamatura","quantita":14,"unita":"nr","prezzoUnitario":18}]'::jsonb,
 22, 'Sollecitato telefonicamente, il direttore deve rispondere entro la settimana.'),

-- ── Inviati e ormai scaduti: lo stato NON è salvato, lo calcola v_preventivi ─
('00000000-0000-4000-a000-00000000000b',
 'PR-' || to_char(current_date,'YYYY') || '-0011',
 '00000000-0000-4000-8000-00000000000c','00000000-0000-4000-9000-000000000013','inviato',
 current_date - 72, current_date - 42, current_date - 71, null,
 '{"accessibilita":"media","criticita":["traffico"],
   "noteTecniche":"Ailanti infestanti lungo la recinzione: serve anche il devitalizzante sulle ceppaie.",
   "alberi":[{"id":"a1","specie":"Ailanto","altezzaM":10,"diametroCm":28,"quantita":22,"lavorazione":"abbattimento"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Abbattimento di ventidue ailanti infestanti","quantita":20,"unita":"ore","prezzoUnitario":45},
   {"id":"r2","descrizione":"Devitalizzazione delle ceppaie","quantita":22,"unita":"nr","prezzoUnitario":22},
   {"id":"r3","descrizione":"Cippatura e smaltimento","quantita":1,"unita":"corpo","prezzoUnitario":480}]'::jsonb,
 22, 'Mai risposto. Da ripresentare aggiornato se il cliente si rifà vivo.'),

('00000000-0000-4000-a000-00000000000c',
 'PR-' || to_char(current_date,'YYYY') || '-0012',
 '00000000-0000-4000-8000-00000000000c','00000000-0000-4000-9000-000000000013','inviato',
 current_date - 58, current_date - 28, current_date - 58, null,
 '{"accessibilita":"facile","criticita":[],"alberi":[],"foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Sfalcio straordinario delle aree verdi perimetrali","quantita":3200,"unita":"mq","prezzoUnitario":0.35}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-00000000000d',
 'PR-' || to_char(current_date,'YYYY') || '-0013',
 '00000000-0000-4000-8000-000000000007','00000000-0000-4000-9000-00000000000a','inviato',
 current_date - 95, current_date - 65, current_date - 94, null,
 '{"accessibilita":"difficile","criticita":["pendenza","accesso_difficile"],
   "alberi":[{"id":"a1","specie":"Ontano nero","altezzaM":8,"diametroCm":24,"quantita":6,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura degli ontani sulla sponda","quantita":10,"unita":"ore","prezzoUnitario":50},
   {"id":"r2","descrizione":"Rimozione della vegetazione infestante di sponda","quantita":8,"unita":"ore","prezzoUnitario":42}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-00000000000e',
 'PR-' || to_char(current_date,'YYYY') || '-0014',
 '00000000-0000-4000-8000-000000000002','00000000-0000-4000-9000-000000000003','inviato',
 current_date - 48, current_date - 18, current_date - 48, null,
 '{"accessibilita":"media","criticita":["vicinanza_edifici"],
   "alberi":[{"id":"a1","specie":"Betulla","altezzaM":9,"diametroCm":26,"quantita":3,"lavorazione":"abbattimento"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Abbattimento di tre betulle deperienti","quantita":8,"unita":"ore","prezzoUnitario":46},
   {"id":"r2","descrizione":"Fresatura delle ceppaie e ripristino del prato","quantita":3,"unita":"nr","prezzoUnitario":75}]'::jsonb,
 22, 'Il cliente ha rimandato a dopo l''estate: da riemettere con prezzi aggiornati.'),

-- ── Accettati (commessa_id NULL: sono i candidati alla conversione) ──────────
('00000000-0000-4000-a000-00000000000f',
 'PR-' || to_char(current_date,'YYYY') || '-0015',
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-9000-000000000001','accettato',
 current_date - 48, current_date - 18, current_date - 47, current_date - 43,
 '{"accessibilita":"media","criticita":["vicinanza_edifici"],
   "noteTecniche":"Accesso dal cortile interno, cancello aperto dal portiere alle 7:30.",
   "alberi":[{"id":"a1","specie":"Tiglio","altezzaM":11,"diametroCm":44,"quantita":4,"lavorazione":"rimonda_secco"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di rimonda del secco su quattro tigli","quantita":10,"unita":"ore","prezzoUnitario":48},
   {"id":"r2","descrizione":"Cippatura e carico della ramaglia","quantita":4,"unita":"ore","prezzoUnitario":42},
   {"id":"r3","descrizione":"Pulizia area e ripristino degli accessi","quantita":2,"unita":"ore","prezzoUnitario":35}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000010',
 'PR-' || to_char(current_date,'YYYY') || '-0016',
 '00000000-0000-4000-8000-000000000003','00000000-0000-4000-9000-000000000006','accettato',
 current_date - 42, current_date - 12, current_date - 41, current_date - 36,
 '{"accessibilita":"media","criticita":["traffico","vicinanza_edifici","presenza_pubblico"],
   "noteTecniche":"Serve la chiusura della strada, da concordare con la Polizia Locale. Piattaforma da 22 m per due giorni.",
   "alberi":[{"id":"a1","specie":"Cedro dell''Atlante","altezzaM":18,"diametroCm":86,"quantita":1,"lavorazione":"abbattimento","note":"Carie al colletto, classe di propensione al cedimento D."}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Abbattimento controllato di un cedro di 18 m con piattaforma aerea","quantita":16,"unita":"ore","prezzoUnitario":55},
   {"id":"r2","descrizione":"Sezionamento e allontanamento del fusto","quantita":12,"unita":"ore","prezzoUnitario":45},
   {"id":"r3","descrizione":"Fresatura della ceppaia","quantita":6,"unita":"ore","prezzoUnitario":48},
   {"id":"r4","descrizione":"Smaltimento in discarica autorizzata","quantita":6,"unita":"ore","prezzoUnitario":40},
   {"id":"r5","descrizione":"Noleggio piattaforma aerea 22 m","quantita":2,"unita":"nr","prezzoUnitario":280}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000011',
 'PR-' || to_char(current_date,'YYYY') || '-0017',
 '00000000-0000-4000-8000-000000000004','00000000-0000-4000-9000-000000000007','accettato',
 current_date - 26, current_date + 4, current_date - 25, current_date - 21,
 '{"accessibilita":"media","criticita":["pendenza"],
   "noteTecniche":"Il fondo regge i mezzi solo asciutto.",
   "alberi":[{"id":"a1","specie":"Nocciolo","altezzaM":4,"diametroCm":10,"quantita":240,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Trinciatura del noccioleto (2,4 ha)","quantita":16,"unita":"ore","prezzoUnitario":52},
   {"id":"r2","descrizione":"Ripristino della capezzagna","quantita":12,"unita":"ore","prezzoUnitario":48}]'::jsonb,
 10, null),

('00000000-0000-4000-a000-000000000012',
 'PR-' || to_char(current_date,'YYYY') || '-0018',
 '00000000-0000-4000-8000-000000000009','00000000-0000-4000-9000-00000000000f','accettato',
 current_date - 18, current_date + 12, current_date - 17, current_date - 11,
 '{"accessibilita":"facile","criticita":["presenza_pubblico"],
   "noteTecniche":"Lavorare prima delle 10 per non disturbare la colazione degli ospiti.",
   "alberi":[{"id":"a1","specie":"Lauroceraso","altezzaM":3,"diametroCm":9,"quantita":140,"lavorazione":"potatura"},
             {"id":"a2","specie":"Pino domestico","altezzaM":15,"diametroCm":58,"quantita":6,"lavorazione":"rimonda_secco"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di contenimento della siepe di lauroceraso (140 m)","quantita":10,"unita":"ore","prezzoUnitario":42},
   {"id":"r2","descrizione":"Rimonda del secco su sei pini domestici","quantita":10,"unita":"ore","prezzoUnitario":52},
   {"id":"r3","descrizione":"Cippatura e smaltimento","quantita":4,"unita":"ore","prezzoUnitario":42}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000013',
 'PR-' || to_char(current_date,'YYYY') || '-0019',
 '00000000-0000-4000-8000-000000000008','00000000-0000-4000-9000-00000000000e','accettato',
 current_date - 16, current_date + 14, current_date - 15, current_date - 8,
 '{"accessibilita":"media","criticita":["traffico","cavi_elettrici"],
   "noteTecniche":"Serve l''occupazione di suolo pubblico. Linea elettrica aerea a 4 m dalla chioma: distanza di sicurezza da rispettare.",
   "alberi":[{"id":"a1","specie":"Platano","altezzaM":16,"diametroCm":64,"quantita":2,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di due platani con piattaforma aerea","quantita":14,"unita":"ore","prezzoUnitario":52},
   {"id":"r2","descrizione":"Cippatura e smaltimento della ramaglia","quantita":6,"unita":"ore","prezzoUnitario":42},
   {"id":"r3","descrizione":"Pratica di occupazione suolo pubblico","quantita":1,"unita":"corpo","prezzoUnitario":150}]'::jsonb,
 22, null),

('00000000-0000-4000-a000-000000000014',
 'PR-' || to_char(current_date,'YYYY') || '-0020',
 '00000000-0000-4000-8000-00000000000a','00000000-0000-4000-9000-000000000010','accettato',
 current_date - 14, current_date + 16, current_date - 13, current_date - 6,
 '{"accessibilita":"facile","criticita":["presenza_pubblico"],
   "alberi":[{"id":"a1","specie":"Cipresso comune","altezzaM":19,"diametroCm":78,"quantita":1,"lavorazione":"consolidamento","note":"Codominanza con inclusione corticale a 6 m: tirante dinamico in cima ai due fusti."},
             {"id":"a2","specie":"Cipresso comune","altezzaM":15,"diametroCm":52,"quantita":4,"lavorazione":"vta"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Consolidamento con tirante dinamico su un cipresso secolare","quantita":8,"unita":"ore","prezzoUnitario":58},
   {"id":"r2","descrizione":"Fornitura e posa del sistema di tiranteria","quantita":1,"unita":"corpo","prezzoUnitario":420},
   {"id":"r3","descrizione":"Verifica visiva VTA sugli altri quattro cipressi","quantita":4,"unita":"ore","prezzoUnitario":65}]'::jsonb,
 22, null),

-- ── Rifiutati ───────────────────────────────────────────────────────────────
('00000000-0000-4000-a000-000000000015',
 'PR-' || to_char(current_date,'YYYY') || '-0021',
 '00000000-0000-4000-8000-000000000008','00000000-0000-4000-9000-00000000000d','rifiutato',
 current_date - 64, current_date - 34, current_date - 63, current_date - 55,
 '{"accessibilita":"media","criticita":["vicinanza_edifici"],
   "alberi":[{"id":"a1","specie":"Ippocastano","altezzaM":12,"diametroCm":50,"quantita":3,"lavorazione":"abbattimento"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Abbattimento di tre ippocastani deperienti","quantita":18,"unita":"ore","prezzoUnitario":50},
   {"id":"r2","descrizione":"Fresatura delle ceppaie","quantita":3,"unita":"nr","prezzoUnitario":85},
   {"id":"r3","descrizione":"Fornitura e messa a dimora di tre carpini sostitutivi","quantita":3,"unita":"nr","prezzoUnitario":190}]'::jsonb,
 22, 'Assemblea contraria all''abbattimento: si è preferita la potatura di contenimento.'),

('00000000-0000-4000-a000-000000000016',
 'PR-' || to_char(current_date,'YYYY') || '-0022',
 '00000000-0000-4000-8000-00000000000a','00000000-0000-4000-9000-000000000011','rifiutato',
 current_date - 52, current_date - 22, current_date - 52, current_date - 45,
 '{"accessibilita":"facile","criticita":[],
   "alberi":[{"id":"a1","specie":"Tasso","altezzaM":5,"diametroCm":20,"quantita":8,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura topiaria degli otto tassi","quantita":14,"unita":"ore","prezzoUnitario":46}]'::jsonb,
 22, 'Rifiutato per budget: se ne riparla il prossimo anno scolastico.'),

('00000000-0000-4000-a000-000000000017',
 'PR-' || to_char(current_date,'YYYY') || '-0023',
 '00000000-0000-4000-8000-000000000003','00000000-0000-4000-9000-000000000006','rifiutato',
 current_date - 38, current_date - 8, current_date - 37, current_date - 30,
 '{"accessibilita":"facile","criticita":["traffico"],
   "noteTecniche":"Strada trafficata, serve ordinanza di chiusura e movieri.",
   "alberi":[{"id":"a1","specie":"Bagolaro","altezzaM":13,"diametroCm":48,"quantita":24,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di rimonda su ventiquattro bagolari di alberata stradale","quantita":56,"unita":"ore","prezzoUnitario":52},
   {"id":"r2","descrizione":"Noleggio piattaforma aerea","quantita":7,"unita":"nr","prezzoUnitario":280},
   {"id":"r3","descrizione":"Segnaletica e gestione del traffico","quantita":7,"unita":"nr","prezzoUnitario":180}]'::jsonb,
 22, 'Gara aggiudicata a un altro operatore: offerta più bassa dell''8%.'),

('00000000-0000-4000-a000-000000000018',
 'PR-' || to_char(current_date,'YYYY') || '-0024',
 '00000000-0000-4000-8000-000000000001','00000000-0000-4000-9000-000000000002','rifiutato',
 current_date - 22, current_date + 8, current_date - 21, current_date - 13,
 '{"accessibilita":"facile","criticita":[],
   "alberi":[{"id":"a1","specie":"Acero campestre","altezzaM":7,"diametroCm":22,"quantita":5,"lavorazione":"potatura"}],
   "foto":[]}'::jsonb,
 '[{"id":"r1","descrizione":"Potatura di rialzo su cinque aceri del parcheggio","quantita":9,"unita":"ore","prezzoUnitario":44},
   {"id":"r2","descrizione":"Smaltimento","quantita":1,"unita":"corpo","prezzoUnitario":110}]'::jsonb,
 22, 'L''amministratore ha preferito rimandare al prossimo esercizio.')

on conflict (id) do nothing;


-- ── La data di sopralluogo, relativa all'emissione ───────────────────────────
-- Sta qui e non nel JSONB letterale perché dentro una stringa JSON non si può
-- usare `current_date`. Due giorni prima dell'emissione: si va a vedere, poi si
-- scrive il preventivo.
update public.preventivi
set sopralluogo = jsonb_set(
      sopralluogo, '{dataSopralluogo}',
      to_jsonb(to_char(data_emissione - interval '2 days', 'YYYY-MM-DD')))
-- `jsonb_exists(...)` e non l'operatore `?`: quest'ultimo viene scambiato per un
-- segnaposto di parametro da parecchi client, e il file deve poter girare
-- ovunque, non solo nel SQL Editor.
where id::text like '00000000-0000-4000-a000-%'
  and not jsonb_exists(sopralluogo, 'dataSopralluogo');


-- ── Due foto di esempio, come data: URI ──────────────────────────────────────
-- Mai un URL esterno: offline diventa un riquadro rotto, e la schermata sembra
-- sbagliata quando invece funziona. È un SVG e non un PNG di un pixel perché un
-- pixel stirato è una macchia di colore, mentre così si legge la didascalia e
-- chi guarda capisce che è un segnaposto, non una foto persa.
update public.preventivi
set sopralluogo = jsonb_set(sopralluogo, '{foto}', $json$[
  {"id":"ft-1","didascalia":"Vista d'insieme dal cortile","caricataIl":"2026-01-01T09:30:00.000Z",
   "dataUrl":"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22640%22%20height%3D%22480%22%3E%3Crect%20width%3D%22640%22%20height%3D%22480%22%20fill%3D%22%232f4f3a%22%2F%3E%3Ctext%20x%3D%22320%22%20y%3D%22240%22%20font-family%3D%22sans-serif%22%20font-size%3D%2226%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%3EVista%20d%27insieme%3C%2Ftext%3E%3C%2Fsvg%3E"},
  {"id":"ft-2","didascalia":"Dettaglio del colletto","caricataIl":"2026-01-01T09:35:00.000Z",
   "dataUrl":"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22640%22%20height%3D%22480%22%3E%3Crect%20width%3D%22640%22%20height%3D%22480%22%20fill%3D%22%234a3d2a%22%2F%3E%3Ctext%20x%3D%22320%22%20y%3D%22240%22%20font-family%3D%22sans-serif%22%20font-size%3D%2226%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%3EDettaglio%20colletto%3C%2Ftext%3E%3C%2Fsvg%3E"}
]$json$::jsonb)
where id in (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000010',
  '00000000-0000-4000-a000-000000000014'
);


-- ── Imponibile e totale, calcolati DALLE RIGHE ───────────────────────────────
-- Non si scrivono a mano nel seed, per la stessa ragione per cui non sono un
-- campo modificabile nell'app: un totale battuto a mano che non torna con le
-- sue righe è il bug che si scopre in demo, davanti al cliente.
update public.preventivi p
set imponibile = t.imp,
    totale     = round(t.imp * (1 + p.aliquota_iva / 100), 2)
from (
  select p2.id,
         round(coalesce(sum(
           (r->>'quantita')::numeric * (r->>'prezzoUnitario')::numeric
         ), 0), 2) as imp
  from public.preventivi p2
  left join lateral jsonb_array_elements(p2.righe) r on true
  where p2.id::text like '00000000-0000-4000-a000-%'
  group by p2.id
) t
where t.id = p.id;
