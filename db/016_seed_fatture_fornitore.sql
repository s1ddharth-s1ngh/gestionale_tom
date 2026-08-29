-- =============================================================================
-- 016 — Dati di esempio: fatture fornitore (ciclo passivo)
-- =============================================================================
-- Richiede 014_seed_costi.sql: i `fornitore_id` e i `mezzoId` delle righe sono
-- quelli fissi di quel seed. Eseguirlo prima, o le foreign key falliscono.
--
-- Dieci fatture, scelte per coprire tutti gli stati DERIVATI da
-- `v_fatture_fornitore` — bozza, da_pagare, pagata_parziale, pagata, scaduta —
-- e almeno un caso per ognuno dei rami che si sbagliano più facilmente:
--
--   * una fattura con righe a due aliquote diverse (22% e 10%), che è il caso
--     in cui un totale calcolato su un'aliquota unica sbaglia di decine di euro;
--   * una scaduta CON un pagamento parziale: nella vista `scaduta` viene prima
--     di `pagata_parziale`, e senza un esempio quel ramo non si prova mai;
--   * righe di carburante col `mezzoId` valorizzato, perché senza la
--     generazione dei costi si ferma su `chk_carburante_ha_mezzo`.
--
-- Le date sono relative a `current_date`: con date fisse, dopo qualche mese
-- sarebbero scadute tutte e le pill «Da pagare» e «In scadenza» resterebbero
-- vuote per sempre.
--
-- Nessuna ha ancora generato i costi: `fatture_fornitore` e `costi` restano
-- scollegati, così la generazione si può provare davvero invece di trovarla
-- già fatta. I costi del seed 014 sono inseriti a mano e non hanno
-- `fattura_fornitore_id`.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`.
--
-- Per svuotare:
--   delete from public.fatture_fornitore where id::text like '00000000-0000-4000-e000-%';
-- =============================================================================

insert into public.fatture_fornitore (
  id, fornitore_id, numero,
  data_documento, data_ricezione, data_scadenza,
  stato, righe, pagamenti, note
) values

-- ── Bozze: arrivate, non ancora registrate ──────────────────────────────────
('00000000-0000-4000-e000-000000000001',
 '00000000-0000-4000-c000-000000000005', '2026/1184',
 current_date - 3, current_date - 1, current_date + 27,
 'bozza',
 '[{"id":"r1","descrizione":"Catene per motosega 3/8 (6 pz)","quantita":6,"prezzoUnitario":38.50,"aliquotaIva":22,"categoria":"materiali"},
   {"id":"r2","descrizione":"Olio catena biodegradabile 5 l (4 taniche)","quantita":4,"prezzoUnitario":19.90,"aliquotaIva":22,"categoria":"materiali"},
   {"id":"r3","descrizione":"Guanti antitaglio classe 1 (3 paia)","quantita":3,"prezzoUnitario":27.00,"aliquotaIva":22,"categoria":"materiali"}]'::jsonb,
 '[]'::jsonb,
 'Da controllare: mancano i guanti di una misura rispetto all’ordine.'),

('00000000-0000-4000-e000-000000000002',
 '00000000-0000-4000-c000-000000000006', 'FT-A-0442',
 current_date - 6, current_date - 4, current_date + 24,
 'bozza',
 '[{"id":"r1","descrizione":"Barra 45 cm per abbattimento","quantita":2,"prezzoUnitario":92.00,"aliquotaIva":22,"categoria":"materiali"},
   {"id":"r2","descrizione":"Corda statica 11 mm — 60 m","quantita":1,"prezzoUnitario":310.00,"aliquotaIva":22,"categoria":"materiali"}]'::jsonb,
 '[]'::jsonb,
 null),

-- ── Registrate, ancora da pagare ────────────────────────────────────────────
-- Due aliquote nello stesso documento: il noleggio al 22%, la manutenzione
-- della piattaforma agevolata al 10%. È il caso che smaschera un totale
-- calcolato su un'aliquota sola.
('00000000-0000-4000-e000-000000000003',
 '00000000-0000-4000-c000-000000000003', '318',
 current_date - 12, current_date - 10, current_date + 18,
 'registrata',
 '[{"id":"r1","descrizione":"Noleggio piattaforma aerea 22 m — 3 giorni","quantita":3,"prezzoUnitario":280.00,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"piattaforma"},
   {"id":"r2","descrizione":"Trasporto andata e ritorno della piattaforma","quantita":1,"prezzoUnitario":180.00,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"piattaforma"},
   {"id":"r3","descrizione":"Manutenzione ordinaria concordata","quantita":1,"prezzoUnitario":140.00,"aliquotaIva":10,"categoria":"manutenzione"}]'::jsonb,
 '[]'::jsonb,
 'Noleggio per il cantiere del cedro in via Porrettana.'),

('00000000-0000-4000-e000-000000000004',
 '00000000-0000-4000-c000-000000000004', '2026-0771',
 current_date - 9, current_date - 7, current_date + 21,
 'registrata',
 '[{"id":"r1","descrizione":"Conferimento ramaglia vegetale — 4.240 kg","quantita":4240,"prezzoUnitario":0.085,"aliquotaIva":10,"categoria":"smaltimento"},
   {"id":"r2","descrizione":"Conferimento ceppaie e legname grosso — 1.800 kg","quantita":1800,"prezzoUnitario":0.120,"aliquotaIva":10,"categoria":"smaltimento"}]'::jsonb,
 '[]'::jsonb,
 null),

-- ── Pagate in parte ─────────────────────────────────────────────────────────
('00000000-0000-4000-e000-000000000005',
 '00000000-0000-4000-c000-000000000001', '0004417',
 current_date - 20, current_date - 18, current_date + 10,
 'registrata',
 '[{"id":"r1","descrizione":"Gasolio autotrazione — rifornimenti del mese","quantita":620,"prezzoUnitario":1.649,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000001","litri":620},
   {"id":"r2","descrizione":"Gasolio autotrazione — pick-up sopralluoghi","quantita":180,"prezzoUnitario":1.649,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000002","litri":180}]'::jsonb,
 '[]'::jsonb,
 'Fattura riepilogativa mensile della carta carburante.'),

('00000000-0000-4000-e000-000000000006',
 '00000000-0000-4000-c000-000000000007', '241',
 current_date - 25, current_date - 24, current_date + 5,
 'registrata',
 '[{"id":"r1","descrizione":"Tagliando Iveco Daily FL429GT — filtri e olio","quantita":1,"prezzoUnitario":420.00,"aliquotaIva":22,"categoria":"manutenzione"},
   {"id":"r2","descrizione":"Sostituzione pastiglie freni anteriori","quantita":1,"prezzoUnitario":185.00,"aliquotaIva":22,"categoria":"manutenzione"},
   {"id":"r3","descrizione":"Revisione periodica","quantita":1,"prezzoUnitario":78.00,"aliquotaIva":22,"categoria":"manutenzione"}]'::jsonb,
 '[]'::jsonb,
 null),

-- ── Pagate ──────────────────────────────────────────────────────────────────
('00000000-0000-4000-e000-000000000007',
 '00000000-0000-4000-c000-000000000002', '0000912',
 current_date - 55, current_date - 54, current_date - 25,
 'registrata',
 '[{"id":"r1","descrizione":"Gasolio autotrazione — cippatrice e trattore","quantita":340,"prezzoUnitario":1.612,"aliquotaIva":22,"categoria":"carburante","mezzoId":"00000000-0000-4000-c100-000000000004","litri":340}]'::jsonb,
 '[]'::jsonb,
 null),

('00000000-0000-4000-e000-000000000008',
 '00000000-0000-4000-c000-000000000009', '2026/207',
 current_date - 48, current_date - 46, current_date - 16,
 'registrata',
 '[{"id":"r1","descrizione":"Carpino bianco in zolla h 200/250 (12 pz)","quantita":12,"prezzoUnitario":58.00,"aliquotaIva":10,"categoria":"materiali"},
   {"id":"r2","descrizione":"Ammendante organico e pacciamatura","quantita":1,"prezzoUnitario":126.00,"aliquotaIva":10,"categoria":"materiali"}]'::jsonb,
 '[]'::jsonb,
 'Fornitura per la messa a dimora all’Hotel Villa Aurora.'),

-- ── Scadute ─────────────────────────────────────────────────────────────────
('00000000-0000-4000-e000-000000000009',
 '00000000-0000-4000-c000-000000000008', 'POL-2026-88431',
 current_date - 70, current_date - 68, current_date - 40,
 'registrata',
 '[{"id":"r1","descrizione":"RC professionale — premio annuale","quantita":1,"prezzoUnitario":1480.00,"aliquotaIva":0,"categoria":"assicurazione"},
   {"id":"r2","descrizione":"Infortuni operatori — integrazione","quantita":1,"prezzoUnitario":320.00,"aliquotaIva":0,"categoria":"assicurazione"}]'::jsonb,
 '[]'::jsonb,
 'Sollecitata dall’agenzia. Da pagare con priorità: senza polizza non si va in cantiere.'),

-- Scaduta MA con un acconto già versato. Nella vista `scaduta` viene prima di
-- `pagata_parziale`, quindi questa riga prova quel ramo — che senza un esempio
-- non si vedrebbe mai funzionare.
('00000000-0000-4000-e000-00000000000a',
 '00000000-0000-4000-c000-000000000003', '289',
 current_date - 62, current_date - 60, current_date - 32,
 'registrata',
 '[{"id":"r1","descrizione":"Noleggio cippatrice da 20 cm — 5 giorni","quantita":5,"prezzoUnitario":190.00,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"cippatrice"},
   {"id":"r2","descrizione":"Noleggio gru cingolata — 2 giorni","quantita":2,"prezzoUnitario":460.00,"aliquotaIva":22,"categoria":"noleggio","tipoNoleggio":"gru"}]'::jsonb,
 '[]'::jsonb,
 'Contestato un giorno di noleggio non goduto: pagato un acconto in attesa della nota di credito.')

on conflict (id) do nothing;


-- ── Imponibile, IVA e totale, calcolati DALLE RIGHE ──────────────────────────
-- Non si scrivono a mano nel seed, per la stessa ragione per cui non sono campi
-- modificabili nell'app: un totale battuto a mano che non torna con le sue
-- righe è il bug che si scopre in demo.
--
-- L'arrotondamento è PER FASCIA di aliquota e poi si somma, non sul totale:
-- è così che lo fa la fattura elettronica, ed è la stessa formula di
-- `calcolaTotaliFattura` in src/types/fatturaFornitore.ts. Arrotondare alla
-- fine darebbe un centesimo di scarto rispetto a quello che mostra l'app.
with per_fascia as (
  select
    f.id,
    coalesce((r->>'aliquotaIva')::numeric, 0) as aliquota,
    round(sum(
      coalesce((r->>'quantita')::numeric, 0) * coalesce((r->>'prezzoUnitario')::numeric, 0)
    ), 2) as imponibile
  from public.fatture_fornitore f
  cross join lateral jsonb_array_elements(f.righe) r
  where f.id::text like '00000000-0000-4000-e000-%'
  group by f.id, coalesce((r->>'aliquotaIva')::numeric, 0)
),
totali as (
  select
    id,
    round(sum(imponibile), 2) as imponibile,
    round(sum(round(imponibile * aliquota / 100, 2)), 2) as iva
  from per_fascia
  group by id
)
update public.fatture_fornitore f
set imponibile = t.imponibile,
    iva        = t.iva,
    totale     = round(t.imponibile + t.iva, 2)
from totali t
where t.id = f.id;


-- ── I pagamenti ──────────────────────────────────────────────────────────────
-- Stanno qui e non nel JSONB letterale per due motivi: dentro una stringa JSON
-- non si può usare `current_date`, e soprattutto l'importo si deve poter
-- riferire al `totale` — che esiste solo dopo l'UPDATE qui sopra. Un acconto
-- scritto a mano che non è una frazione esatta del totale renderebbe il residuo
-- un numero che non torna con niente.

-- Saldate per intero.
update public.fatture_fornitore f
set pagamenti = jsonb_build_array(
  jsonb_build_object(
    'id', 'pag-1',
    'data', to_char(f.data_scadenza - interval '2 days', 'YYYY-MM-DD'),
    'importo', f.totale,
    'metodo', 'bonifico',
    'riferimento', 'CRO ' || lpad((extract(epoch from f.created_at)::bigint % 100000000)::text, 8, '0')
  )
)
where f.id in (
  '00000000-0000-4000-e000-000000000007',
  '00000000-0000-4000-e000-000000000008'
);

-- Acconto del 40%: resta un residuo che si legge nello scadenzario.
update public.fatture_fornitore f
set pagamenti = jsonb_build_array(
  jsonb_build_object(
    'id', 'pag-1',
    'data', to_char(f.data_documento + interval '12 days', 'YYYY-MM-DD'),
    'importo', round(f.totale * 0.40, 2),
    'metodo', 'bonifico',
    'riferimento', 'acconto'
  )
)
where f.id in (
  '00000000-0000-4000-e000-000000000005',
  '00000000-0000-4000-e000-000000000006',
  '00000000-0000-4000-e000-00000000000a'
);
