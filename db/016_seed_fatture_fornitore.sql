-- =============================================================================
-- 015 — Dati di esempio: fatture fornitore (ciclo passivo)
-- =============================================================================
-- Le fatture che Tom riceve, sui fornitori di `014_seed_costi.sql`.
--
-- Coprono tutti e cinque gli stati che `v_fatture_fornitore` sa calcolare —
-- bozza, da pagare, pagata in parte, pagata, scaduta — perché con due stati su
-- cinque non si vede se le badge e lo scadenzario passivo funzionano.
--
-- Quattro cose da sapere:
--
--  * **`stato` vale solo `bozza` o `registrata`.** Pagata, parziale e scaduta
--    le calcola la vista da `pagamenti` e `data_scadenza`.
--  * **Le date sono relative a `current_date`.** Con date fisse, e lo stato
--    derivato dalla scadenza, dopo qualche mese l'archivio diventerebbe tutto
--    scaduto: mentirebbe il seed, non l'app.
--  * **`imponibile`, `iva` e `totale` non si scrivono a mano**: li ricalcola
--    l'UPDATE in fondo leggendo le righe JSONB, così il seed non può contenere
--    un totale che non corrisponde alle sue stesse righe.
--  * **Nessuna riga di `costi` viene collegata qui.** Generare i costi è un
--    gesto esplicito che si fa dall'app: un seed che li scrive già collegati
--    toglierebbe di mezzo proprio il passaggio che vale la pena provare — e
--    lascerebbe `costi_generati` a un numero che nessuno ha deciso.
--
-- Le righe rispettano i due vincoli che valgono sui costi generati: ogni riga
-- `carburante` porta un `mezzoId`, ogni `noleggio` un `tipoNoleggio`. Senza,
-- la generazione fallirebbe a metà.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`.
--
-- Per svuotare e ricominciare:
--   update public.costi set fattura_fornitore_id = null
--     where fattura_fornitore_id::text like '00000000-0000-4000-e000-%';
--   delete from public.fatture_fornitore where id::text like '00000000-0000-4000-e000-%';
-- =============================================================================

insert into public.fatture_fornitore (
  id, fornitore_id, numero, data_documento, data_ricezione, data_scadenza,
  stato, righe, pagamenti, note
) values

-- ── Pagata ───────────────────────────────────────────────────────────────────
('00000000-0000-4000-e000-000000000001',
 '00000000-0000-4000-c000-000000000003', '2026/318',
 current_date - 30, current_date - 28, current_date - 8, 'registrata',
 -- Due righe con due categorie: è il motivo per cui la categoria sta sulla
 -- riga e non in testata. Questa fattura diventa due costi diversi.
 ('[{"id":"r1","descrizione":"Noleggio piattaforma aerea 22 m, due giornate","quantita":2,"prezzoUnitario":250,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"piattaforma"},
    {"id":"r2","descrizione":"Trasporto della piattaforma, andata e ritorno","quantita":1,"prezzoUnitario":120,"aliquotaIva":22,"categoria":"altro"}]')::jsonb,
 ('[{"id":"p1","data":"' || to_char(current_date - 10, 'YYYY-MM-DD') || '","importo":756.40,"metodo":"bonifico","riferimento":"CRO 4471902"}]')::jsonb,
 null),

-- ── Pagata in parte ──────────────────────────────────────────────────────────
('00000000-0000-4000-e000-000000000002',
 '00000000-0000-4000-c000-000000000007', 'FT 2026/78',
 current_date - 26, current_date - 24, current_date + 4, 'registrata',
 ('[{"id":"r1","descrizione":"Sostituzione frizione autocarro","quantita":1,"prezzoUnitario":1240,"aliquotaIva":22,"categoria":"manutenzione","mezzoId":"00000000-0000-4000-c100-000000000001"},
    {"id":"r2","descrizione":"Olio e filtri","quantita":1,"prezzoUnitario":86,"aliquotaIva":22,"categoria":"manutenzione","mezzoId":"00000000-0000-4000-c100-000000000001"}]')::jsonb,
 ('[{"id":"p1","data":"' || to_char(current_date - 12, 'YYYY-MM-DD') || '","importo":800,"metodo":"bonifico","riferimento":"CRO 4460118"}]')::jsonb,
 'Acconto concordato: il saldo alla riconsegna del mezzo.'),

-- ── Scaduta, e con un pagamento parziale sopra ───────────────────────────────
('00000000-0000-4000-e000-000000000003',
 '00000000-0000-4000-c000-000000000004', '4390/A',
 current_date - 62, current_date - 55, current_date - 32, 'registrata',
 ('[{"id":"r1","descrizione":"Conferimento ceppaie e legname, 5,8 t","quantita":5.8,"prezzoUnitario":71,"aliquotaIva":22,"categoria":"smaltimento"}]')::jsonb,
 ('[{"id":"p1","data":"' || to_char(current_date - 40, 'YYYY-MM-DD') || '","importo":200,"metodo":"bonifico"}]')::jsonb,
 'Contestato il peso a destino: in attesa della nota di credito.'),

-- ── Scaduta, non pagata affatto ──────────────────────────────────────────────
('00000000-0000-4000-e000-000000000004',
 '00000000-0000-4000-c000-000000000006', '2026-114',
 current_date - 48, current_date - 20, current_date - 18, 'registrata',
 ('[{"id":"r1","descrizione":"Ricambi motoseghe: catene, barre, pignoni","quantita":1,"prezzoUnitario":162.40,"aliquotaIva":22,"categoria":"materiali"},
    {"id":"r2","descrizione":"Dispositivi di protezione individuale","quantita":2,"prezzoUnitario":138,"aliquotaIva":22,"categoria":"materiali"}]')::jsonb,
 '[]'::jsonb,
 -- 28 giorni fra documento e ricezione: è il caso che la scheda segnala in
 -- ambra, e serve a vedere quel messaggio a schermo.
 'Arrivata in ritardo: era finita nella posta indesiderata.'),

-- ── Da pagare, ancora nei termini ────────────────────────────────────────────
('00000000-0000-4000-e000-000000000005',
 '00000000-0000-4000-c000-000000000001', '5512',
 current_date - 9, current_date - 8, current_date + 21, 'registrata',
 -- Rifornimenti del mese, uno per mezzo: è il requisito «carburante distinto
 -- per mezzo» visto dal lato del documento che li raggruppa.
 ('[{"id":"r1","descrizione":"Gasolio autotrazione, rifornimenti del mese","quantita":1,"prezzoUnitario":361,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000001","litri":249},
    {"id":"r2","descrizione":"Gasolio piattaforma","quantita":1,"prezzoUnitario":171,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000003","litri":117},
    {"id":"r3","descrizione":"Miscela per cippatrice e motoseghe","quantita":1,"prezzoUnitario":85,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000004","litri":54}]')::jsonb,
 '[]'::jsonb,
 'Fattura riepilogativa dei rifornimenti a fine mese.'),

('00000000-0000-4000-e000-000000000006',
 '00000000-0000-4000-c000-000000000008', 'POL-77120944/2',
 current_date - 21, current_date - 19, current_date + 39, 'registrata',
 -- Niente IVA: i premi assicurativi sono esenti. Serve a vedere che i totali
 -- reggono anche con aliquota a zero.
 ('[{"id":"r1","descrizione":"RCA autocarro, rata semestrale","quantita":1,"prezzoUnitario":684,"aliquotaIva":0,"categoria":"assicurazione","mezzoId":"00000000-0000-4000-c100-000000000001"},
    {"id":"r2","descrizione":"RC professionale, rata annuale","quantita":1,"prezzoUnitario":1450,"aliquotaIva":0,"categoria":"assicurazione"}]')::jsonb,
 '[]'::jsonb,
 null),

-- ── Bozze: arrivate, non ancora riconosciute ─────────────────────────────────
('00000000-0000-4000-e000-000000000007',
 '00000000-0000-4000-c000-000000000003', '2026/402',
 current_date - 3, current_date - 2, current_date + 27, 'bozza',
 ('[{"id":"r1","descrizione":"Noleggio piattaforma aerea 18 m, una giornata","quantita":1,"prezzoUnitario":230,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"piattaforma"}]')::jsonb,
 '[]'::jsonb,
 'Da controllare: la giornata dovrebbe essere mezza.'),

-- Ragione sociale lunga, otto righe e categorie miste: serve a vedere se il
-- dettaglio regge un documento vero.
('00000000-0000-4000-e000-000000000008',
 '00000000-0000-4000-c000-000000000004', 'ECO-2026/0771',
 current_date - 1, current_date, current_date + 29, 'bozza',
 ('[{"id":"r1","descrizione":"Conferimento verde, gennaio","quantita":2.4,"prezzoUnitario":65,"aliquotaIva":22,"categoria":"smaltimento"},
    {"id":"r2","descrizione":"Conferimento verde, febbraio","quantita":3.1,"prezzoUnitario":65,"aliquotaIva":22,"categoria":"smaltimento"},
    {"id":"r3","descrizione":"Conferimento verde, marzo","quantita":1.9,"prezzoUnitario":65,"aliquotaIva":22,"categoria":"smaltimento"},
    {"id":"r4","descrizione":"Conferimento terra di risulta","quantita":4.2,"prezzoUnitario":48,"aliquotaIva":22,"categoria":"smaltimento"},
    {"id":"r5","descrizione":"Conferimento ceppaie","quantita":2.7,"prezzoUnitario":71,"aliquotaIva":22,"categoria":"smaltimento"},
    {"id":"r6","descrizione":"Diritti di pesatura","quantita":5,"prezzoUnitario":12,"aliquotaIva":22,"categoria":"altro"},
    {"id":"r7","descrizione":"Gestione formulari FIR","quantita":5,"prezzoUnitario":8,"aliquotaIva":22,"categoria":"altro"},
    {"id":"r8","descrizione":"Contributo ambientale","quantita":1,"prezzoUnitario":45,"aliquotaIva":22,"categoria":"altro"}]')::jsonb,
 '[]'::jsonb,
 'Riepilogativa del trimestre: da controllare riga per riga prima di registrare.')

on conflict (id) do nothing;

-- ── I totali si calcolano, non si scrivono ───────────────────────────────────
-- Le tre colonne esistono perché lo scadenzario passivo ci ordina e ci somma
-- sopra, ma restano una derivazione delle righe.
update public.fatture_fornitore f
set imponibile = calcolo.imponibile,
    iva        = calcolo.iva,
    totale     = calcolo.imponibile + calcolo.iva
from (
  select
    f2.id,
    round(coalesce(sum((r->>'quantita')::numeric * (r->>'prezzoUnitario')::numeric), 0), 2) as imponibile,
    round(coalesce(sum((r->>'quantita')::numeric * (r->>'prezzoUnitario')::numeric
                       * coalesce((r->>'aliquotaIva')::numeric, 0) / 100), 0), 2) as iva
  from public.fatture_fornitore f2
  left join lateral jsonb_array_elements(coalesce(f2.righe, '[]'::jsonb)) as r on true
  where f2.id::text like '00000000-0000-4000-e000-%'
  group by f2.id
) as calcolo
where f.id = calcolo.id;
