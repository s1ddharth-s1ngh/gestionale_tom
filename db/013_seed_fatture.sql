-- =============================================================================
-- 013 — Dati di esempio: fatture
-- =============================================================================
-- Sono le fatture di `src/mocks/fatture.ts`, portate nel database. Coprono
-- tutti e cinque gli stati che `v_fatture` sa calcolare — bozza, emessa,
-- pagata parziale, pagata, scaduta — perché con due stati su cinque non si vede
-- se le badge e lo scadenzario funzionano.
--
-- Tre cose da sapere prima di leggerlo:
--
--  * **Le date sono relative a `current_date`.** Con date fisse, dopo qualche
--    mese l'archivio diventerebbe tutto «scaduto» — e siccome lo stato è
--    derivato dalla scadenza, sarebbe il seed a mentire, non l'app.
--  * **`stato` vale solo `bozza` o `emessa`**, che è tutto quello che il CHECK
--    accetta. Pagata, parziale e scaduta le calcola la vista dagli incassi.
--  * **`imponibile`, `iva` e `totale` non si scrivono a mano**: li ricalcola
--    l'UPDATE in fondo leggendo le righe JSONB. Sommare a mente venti righe con
--    due aliquote diverse è il modo sicuro di lasciare un totale sbagliato.
--
-- `commessa_id` resta NULL: le commesse hanno il loro seed e i loro id, e una
-- FK indovinata è una riga che non si inserisce. Si collega dopo, dall'app.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`.
--
-- Per svuotare e ricominciare:
--   delete from public.fatture where id::text like '00000000-0000-4000-b000-%';
-- =============================================================================

insert into public.fatture (
  id, numero, tipo, cliente_id, stato, data_emissione, data_scadenza, righe, incassi, solleciti,
  dati_fe, note
) values

-- ── Pagate ───────────────────────────────────────────────────────────────────
('00000000-0000-4000-b000-000000000001',
 'FT-' || to_char(current_date, 'YYYY') || '-0001', 'unica',
 '00000000-0000-4000-8000-000000000001', 'emessa', current_date - 36, current_date - 6,
 '[{"id":"r1","descrizione":"Potatura di rimonda del secco su quattro tigli, via Battisti 14","quantita":1,"prezzoUnitario":620,"aliquotaIva":10},
   {"id":"r2","descrizione":"Cippatura e smaltimento della ramaglia","quantita":1,"prezzoUnitario":340,"aliquotaIva":10}]'::jsonb,
 -- L'incasso chiude la fattura: 960 di imponibile + 96 di IVA al 10%.
 ('[{"id":"i1","data":"' || to_char(current_date - 9, 'YYYY-MM-DD') || '","importo":1056,"metodo":"bonifico","riferimento":"CRO 8842190"}]')::jsonb,
 '[]'::jsonb, null,
 'Aliquota agevolata al 10%: lavori sulle parti comuni di un condominio.'),

('00000000-0000-4000-b000-000000000002',
 'FT-' || to_char(current_date, 'YYYY') || '-0002', 'acconto',
 '00000000-0000-4000-8000-000000000003', 'emessa', current_date - 34, current_date - 4,
 '[{"id":"r1","descrizione":"Acconto 30% su abbattimento cedro dell''Atlante, parco Rodari","quantita":1,"prezzoUnitario":1665,"aliquotaIva":22}]'::jsonb,
 ('[{"id":"i1","data":"' || to_char(current_date - 11, 'YYYY-MM-DD') || '","importo":2031.30,"metodo":"bonifico","riferimento":"Mandato 1204"}]')::jsonb,
 '[]'::jsonb,
 '{"codiceDestinatario":"UFY8T4","tipoDocumento":"TD02","regimeFiscale":"RF01","riferimentoAmministrazione":"Determina 412/2026","scissionePagamenti":true}'::jsonb,
 'Acconto 30% come da capitolato.'),

('00000000-0000-4000-b000-000000000003',
 'FT-' || to_char(current_date, 'YYYY') || '-0003', 'unica',
 '00000000-0000-4000-8000-00000000000b', 'emessa', current_date - 22, current_date - 7,
 '[{"id":"r1","descrizione":"Abbattimento di una robinia pericolante e fresatura della ceppaia","quantita":1,"prezzoUnitario":480,"aliquotaIva":22}]'::jsonb,
 ('[{"id":"i1","data":"' || to_char(current_date - 22, 'YYYY-MM-DD') || '","importo":585.60,"metodo":"contanti"}]')::jsonb,
 '[]'::jsonb, null, null),

-- ── Pagate parziali ──────────────────────────────────────────────────────────
('00000000-0000-4000-b000-000000000004',
 'FT-' || to_char(current_date, 'YYYY') || '-0004', 'saldo',
 '00000000-0000-4000-8000-000000000003', 'emessa', current_date - 24, current_date + 6,
 '[{"id":"r1","descrizione":"Saldo abbattimento cedro dell''Atlante di 18 m con piattaforma aerea","quantita":1,"prezzoUnitario":2885,"aliquotaIva":22},
   {"id":"r2","descrizione":"Noleggio piattaforma 22 m, 2 giornate","quantita":2,"prezzoUnitario":500,"aliquotaIva":22}]'::jsonb,
 -- Metà del totale: la fattura resta «pagata parziale» finché non scade.
 ('[{"id":"i1","data":"' || to_char(current_date - 3, 'YYYY-MM-DD') || '","importo":2367.85,"metodo":"bonifico","riferimento":"Mandato 1731"}]')::jsonb,
 '[]'::jsonb, null,
 'Saldo: totale lavori meno l''acconto della FT-0002.'),

('00000000-0000-4000-b000-000000000005',
 'FT-' || to_char(current_date, 'YYYY') || '-0005', 'unica',
 '00000000-0000-4000-8000-000000000009', 'emessa', current_date - 14, current_date + 16,
 '[{"id":"r1","descrizione":"Potatura di contenimento di sei pini domestici lungo il viale di accesso","quantita":6,"prezzoUnitario":210,"aliquotaIva":22},
   {"id":"r2","descrizione":"Trattamento endoterapico contro la processionaria","quantita":6,"prezzoUnitario":45,"aliquotaIva":22}]'::jsonb,
 ('[{"id":"i1","data":"' || to_char(current_date - 2, 'YYYY-MM-DD') || '","importo":746.50,"metodo":"riba","riferimento":"Ri.Ba. 04/2026"}]')::jsonb,
 '[]'::jsonb, null, null),

-- ── Scadute ──────────────────────────────────────────────────────────────────
('00000000-0000-4000-b000-000000000006',
 'FT-' || to_char(current_date, 'YYYY') || '-0006', 'unica',
 '00000000-0000-4000-8000-000000000006', 'emessa', current_date - 75, current_date - 45,
 '[{"id":"r1","descrizione":"Abbattimento di due querce compromesse nel parco condominiale","quantita":2,"prezzoUnitario":890,"aliquotaIva":10},
   {"id":"r2","descrizione":"Smaltimento in discarica autorizzata","quantita":1,"prezzoUnitario":260,"aliquotaIva":10}]'::jsonb,
 '[]'::jsonb,
 -- Tre solleciti e nessun incasso: è il caso che lo scadenzario deve far
 -- risaltare, non un semplice ritardo.
 ('[{"id":"s1","data":"' || to_char(current_date - 30, 'YYYY-MM-DD') || '","canale":"email","note":"Primo sollecito allo studio Moretti."},
    {"id":"s2","data":"' || to_char(current_date - 12, 'YYYY-MM-DD') || '","canale":"pec","note":"Sollecito via PEC al nuovo amministratore."},
    {"id":"s3","data":"' || to_char(current_date - 3, 'YYYY-MM-DD') || '","canale":"telefono","note":"Promesso pagamento entro fine mese."}]')::jsonb,
 null,
 'L''amministratore ha cambiato studio: la fattura era finita alla PEC vecchia.'),

('00000000-0000-4000-b000-000000000007',
 'FT-' || to_char(current_date, 'YYYY') || '-0007', 'saldo',
 '00000000-0000-4000-8000-000000000004', 'emessa', current_date - 58, current_date - 28,
 '[{"id":"r1","descrizione":"Sfalcio e trinciatura di due ettari di argine, saldo","quantita":1,"prezzoUnitario":1240,"aliquotaIva":22}]'::jsonb,
 ('[{"id":"i1","data":"' || to_char(current_date - 40, 'YYYY-MM-DD') || '","importo":529.50,"metodo":"bonifico","riferimento":"CRO 7719002"}]')::jsonb,
 ('[{"id":"s1","data":"' || to_char(current_date - 10, 'YYYY-MM-DD') || '","canale":"email","note":"Sollecito sul residuo."}]')::jsonb,
 null, null),

('00000000-0000-4000-b000-000000000008',
 'FT-' || to_char(current_date, 'YYYY') || '-0008', 'unica',
 '00000000-0000-4000-8000-00000000000c', 'emessa', current_date - 49, current_date - 19,
 '[{"id":"r1","descrizione":"Rimozione di alberatura caduta sull''area di manovra dopo il temporale","quantita":1,"prezzoUnitario":1450,"aliquotaIva":22}]'::jsonb,
 '[]'::jsonb,
 ('[{"id":"s1","data":"' || to_char(current_date - 5, 'YYYY-MM-DD') || '","canale":"raccomandata","note":"Raccomandata A/R alla sede legale."}]')::jsonb,
 null, null),

-- ── Emesse, ancora nei termini ───────────────────────────────────────────────
('00000000-0000-4000-b000-000000000009',
 'FT-' || to_char(current_date, 'YYYY') || '-0009', 'acconto',
 '00000000-0000-4000-8000-00000000000a', 'emessa', current_date - 8, current_date + 22,
 '[{"id":"r1","descrizione":"Acconto 40% su messa in sicurezza dei cipressi del cortile","quantita":1,"prezzoUnitario":760,"aliquotaIva":22}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, null,
 'Acconto 40% alla conferma dei lavori.'),

('00000000-0000-4000-b000-00000000000a',
 'FT-' || to_char(current_date, 'YYYY') || '-0010', 'unica',
 '00000000-0000-4000-8000-000000000007', 'emessa', current_date - 4, current_date + 26,
 '[{"id":"r1","descrizione":"Consolidamento con tirante dinamico su un platano secolare","quantita":1,"prezzoUnitario":1180,"aliquotaIva":22},
   {"id":"r2","descrizione":"Relazione agronomica di valutazione della stabilità (VTA)","quantita":1,"prezzoUnitario":320,"aliquotaIva":22}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb,
 '{"codiceDestinatario":"0000000","pecDestinatario":"immobiliaresanpetronio@pec.it","tipoDocumento":"TD01","regimeFiscale":"RF01"}'::jsonb,
 null),

-- Dodici righe e una scadenza a 60 giorni: serve a vedere se il dettaglio
-- regge una fattura lunga e se lo scadenzario ordina bene le code.
('00000000-0000-4000-b000-00000000000b',
 'FT-' || to_char(current_date, 'YYYY') || '-0011', 'unica',
 '00000000-0000-4000-8000-00000000000c', 'emessa', current_date - 6, current_date + 54,
 '[{"id":"r1","descrizione":"Sfalcio delle aree verdi perimetrali, marzo","quantita":1,"prezzoUnitario":380,"aliquotaIva":22},
   {"id":"r2","descrizione":"Sfalcio delle aree verdi perimetrali, aprile","quantita":1,"prezzoUnitario":380,"aliquotaIva":22},
   {"id":"r3","descrizione":"Sfalcio delle aree verdi perimetrali, maggio","quantita":1,"prezzoUnitario":380,"aliquotaIva":22},
   {"id":"r4","descrizione":"Potatura delle siepi di lauroceraso, fronte uffici","quantita":1,"prezzoUnitario":540,"aliquotaIva":22},
   {"id":"r5","descrizione":"Potatura delle siepi di lauroceraso, fronte magazzino","quantita":1,"prezzoUnitario":460,"aliquotaIva":22},
   {"id":"r6","descrizione":"Diserbo meccanico dei piazzali di manovra","quantita":3,"prezzoUnitario":210,"aliquotaIva":22},
   {"id":"r7","descrizione":"Trattamento fitosanitario sugli aceri del parcheggio visitatori","quantita":8,"prezzoUnitario":38,"aliquotaIva":22},
   {"id":"r8","descrizione":"Concimazione a lenta cessione delle aiuole","quantita":1,"prezzoUnitario":290,"aliquotaIva":22},
   {"id":"r9","descrizione":"Ripristino del tappeto erboso sul fronte strada","quantita":1,"prezzoUnitario":620,"aliquotaIva":22},
   {"id":"r10","descrizione":"Cippatura e allontanamento del materiale di risulta","quantita":4,"prezzoUnitario":130,"aliquotaIva":22},
   {"id":"r11","descrizione":"Smaltimento in discarica autorizzata, formulari inclusi","quantita":1,"prezzoUnitario":340,"aliquotaIva":22},
   {"id":"r12","descrizione":"Coordinamento sicurezza in fase di esecuzione","quantita":1,"prezzoUnitario":180,"aliquotaIva":22}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, null,
 'Manutenzione programmata del verde di stabilimento, primo semestre.'),

-- ── Bozze: niente data di emissione, ed è tutto ciò che le distingue ─────────
('00000000-0000-4000-b000-00000000000c',
 'FT-' || to_char(current_date, 'YYYY') || '-0012', 'saldo',
 '00000000-0000-4000-8000-00000000000a', 'bozza', null, null,
 '[{"id":"r1","descrizione":"Saldo messa in sicurezza dei cipressi del cortile","quantita":1,"prezzoUnitario":1140,"aliquotaIva":22}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, null,
 'Da emettere a fine lavori, previsti la prossima settimana.'),

('00000000-0000-4000-b000-00000000000d',
 'FT-' || to_char(current_date, 'YYYY') || '-0013', 'unica',
 '00000000-0000-4000-8000-000000000001', 'bozza', null, null,
 '[{"id":"r1","descrizione":"Abbattimento del cedro sul lato nord, come da rapportino","quantita":1,"prezzoUnitario":1850,"aliquotaIva":10},
   {"id":"r2","descrizione":"Fresatura della ceppaia e ripristino del prato","quantita":1,"prezzoUnitario":290,"aliquotaIva":10}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, null,
 'In attesa della delibera assembleare: non emettere prima.')

on conflict (id) do nothing;

-- ── I totali si calcolano, non si scrivono ───────────────────────────────────
-- Le tre colonne esistono perché lo scadenzario ci ordina e ci somma sopra, ma
-- restano una derivazione delle righe: qui si ricavano dal JSONB, così il seed
-- non può contenere un totale che non corrisponde alle sue stesse righe.
update public.fatture f
set imponibile = calcolo.imponibile,
    iva        = calcolo.iva,
    totale     = calcolo.imponibile + calcolo.iva
from (
  select
    f2.id,
    round(coalesce(sum((r->>'quantita')::numeric * (r->>'prezzoUnitario')::numeric), 0), 2) as imponibile,
    round(coalesce(sum((r->>'quantita')::numeric * (r->>'prezzoUnitario')::numeric
                       * coalesce((r->>'aliquotaIva')::numeric, 0) / 100), 0), 2) as iva
  from public.fatture f2
  left join lateral jsonb_array_elements(coalesce(f2.righe, '[]'::jsonb)) as r on true
  where f2.id::text like '00000000-0000-4000-b000-%'
  group by f2.id
) as calcolo
where f.id = calcolo.id;
