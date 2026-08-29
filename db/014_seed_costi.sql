-- =============================================================================
-- 014 — Dati di esempio: fornitori, mezzi, costi
-- =============================================================================
-- Sono i dati di `src/mocks/{fornitori,mezzi,costi}.ts`, portati nel database.
--
-- I costi coprono **tre mesi** e non due settimane: i riepiloghi per categoria
-- e per mezzo, su pochi giorni, mostrerebbero barre tutte uguali e non
-- direbbero se funzionano.
--
-- Due cose che il seed rispetta perché il database non lo lascerebbe passare:
--
--  * ogni riga `carburante` ha un `mezzo_id` (`chk_carburante_ha_mezzo`);
--  * ogni riga `noleggio` ha un `tipo_noleggio` (`chk_noleggio_ha_tipo`).
--
-- Non c'è nessuna colonna per l'IVA sugli acquisti: si detrae, quindi non è un
-- costo. `importo` è sempre l'imponibile.
--
-- `commessa_id` resta NULL: le commesse hanno il loro seed e i loro id, e una
-- FK indovinata è una riga che non si inserisce. Si imputa dopo, dall'app.
--
-- Idempotente: id fissi e `on conflict (id) do nothing`.
--
-- Per svuotare e ricominciare, nell'ordine (i costi puntano agli altri due):
--   delete from public.costi      where id::text like '00000000-0000-4000-d000-%';
--   delete from public.mezzi      where id::text like '00000000-0000-4000-c100-%';
--   delete from public.fornitori  where id::text like '00000000-0000-4000-c000-%';
-- =============================================================================

-- ── Fornitori ────────────────────────────────────────────────────────────────
insert into public.fornitori (
  id, denominazione, partita_iva, categoria_prevalente, telefono, email,
  via, civico, cap, comune, provincia, note
) values
  ('00000000-0000-4000-c000-000000000001','Q8 — Stazione di servizio via Emilia Ponente',
   'IT00891234567','carburante','051 384112',null,
   'Via Emilia Ponente','218','40133','Bologna','BO',null),

  ('00000000-0000-4000-c000-000000000002','Eni Station — Casalecchio',
   'IT00905553311','carburante',null,null,
   '','','','','',null),

  ('00000000-0000-4000-c000-000000000003','Noleggi Zanardi S.r.l. — piattaforme e sollevamento',
   'IT02887410372','noleggio','051 6140228','noleggi@zanardisollevamenti.it',
   'Via del Lavoro','44','40057','Granarolo dell''Emilia','BO',
   'Tariffa concordata sulla piattaforma 22 m: 250 euro al giorno, trasporto escluso.'),

  ('00000000-0000-4000-c000-000000000004','Ecoservizi Reno S.c.a r.l. — impianto di trattamento rifiuti vegetali',
   'IT03114420376','smaltimento','051 6789043','accettazione@ecoservizireno.it',
   'Via dell''Industria','7/B','40012','Calderara di Reno','BO',
   'Formulario obbligatorio a ogni conferimento. Chiudono alle 16:30.'),

  ('00000000-0000-4000-c000-000000000005','Ferramenta Marchi & C. S.n.c.',
   'IT01223340375','materiali','051 271884',null,
   '','','','','',null),

  ('00000000-0000-4000-c000-000000000006','Agriforest Bologna — ricambi e attrezzatura forestale',
   'IT02556710379','manutenzione',null,'ricambi@agriforestbo.it',
   '','','','','',
   'Catene, barre e ricambi Stihl. Assistenza sulle motoseghe in tre giorni.'),

  ('00000000-0000-4000-c000-000000000007','Officina Autotrasporti Baldi',
   'IT00778890370','manutenzione','051 750129',null,
   '','','','','',null),

  ('00000000-0000-4000-c000-000000000008','Assicurazioni Generali — agenzia di Bologna Ovest',
   'IT00079760328','assicurazione',null,'agenzia.bolognaovest@generali.it',
   '','','','','',null),

  -- Nessun costo da questo fornitore: serve a vedere lo stato vuoto della sua
  -- scheda, che altrimenti non si prova mai.
  ('00000000-0000-4000-c000-000000000009','Vivai Corticella — piante e sementi',
   'IT02001110376','materiali',null,null,
   '','','','','',null)

on conflict (id) do nothing;

-- ── Mezzi ────────────────────────────────────────────────────────────────────
insert into public.mezzi (id, targa, descrizione, tipo, attivo) values
  ('00000000-0000-4000-c100-000000000001','FL429GT','Iveco Daily con cassone ribaltabile','autocarro',true),
  ('00000000-0000-4000-c100-000000000002','GA817PR','Ford Ranger, mezzo di sopralluogo','pickup',true),
  ('00000000-0000-4000-c100-000000000003','DV205BX','Piattaforma aerea semovente 18 m','piattaforma',true),
  ('00000000-0000-4000-c100-000000000004','ZA4471','Cippatrice Pezzolato da 15 cm','cippatrice',true),
  ('00000000-0000-4000-c100-000000000005','BO994AC','Trattore Landini con trincia argini','trattore',true),
  -- Venduto. Resta in anagrafica perché i costi vecchi lo citano: cancellarlo
  -- li lascerebbe con un riferimento che non risolve.
  ('00000000-0000-4000-c100-000000000006','CX330HY','Fiat Doblò, venduto','altro',false)
on conflict (id) do nothing;

-- ── Costi ────────────────────────────────────────────────────────────────────
insert into public.costi (
  id, data, categoria, descrizione, importo, quantita, unita,
  fornitore_id, mezzo_id, tipo_noleggio, numero_documento, note
) values
  -- Carburante: sempre con il mezzo, e i litri in `quantita` con `unita = 'l'`.
  ('00000000-0000-4000-d000-000000000001', current_date - 2,  'carburante','Rifornimento gasolio',118.40, 82,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000001',null,'Scontrino 4471',null),
  ('00000000-0000-4000-d000-000000000002', current_date - 5,  'carburante','Rifornimento gasolio',61.20, 42,'l','00000000-0000-4000-c000-000000000002','00000000-0000-4000-c100-000000000002',null,'Scontrino 1180',null),
  ('00000000-0000-4000-d000-000000000003', current_date - 9,  'carburante','Rifornimento gasolio piattaforma',74.50, 51,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000003',null,null,null),
  ('00000000-0000-4000-d000-000000000004', current_date - 12, 'carburante','Miscela per cippatrice',46.90, 30,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000004',null,null,null),
  ('00000000-0000-4000-d000-000000000005', current_date - 16, 'carburante','Rifornimento gasolio',132.70, 91,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000001',null,'Scontrino 4288',null),
  ('00000000-0000-4000-d000-000000000006', current_date - 23, 'carburante','Rifornimento gasolio trattore',187.30,128,'l','00000000-0000-4000-c000-000000000002','00000000-0000-4000-c100-000000000005',null,null,null),
  ('00000000-0000-4000-d000-000000000007', current_date - 29, 'carburante','Rifornimento gasolio',109.80, 76,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000001',null,null,null),
  ('00000000-0000-4000-d000-000000000008', current_date - 37, 'carburante','Rifornimento gasolio',58.60, 40,'l','00000000-0000-4000-c000-000000000002','00000000-0000-4000-c100-000000000002',null,null,null),
  ('00000000-0000-4000-d000-000000000009', current_date - 44, 'carburante','Rifornimento gasolio piattaforma',96.40, 66,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000003',null,null,null),
  ('00000000-0000-4000-d000-00000000000a', current_date - 58, 'carburante','Rifornimento gasolio',124.10, 85,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000001',null,null,null),
  ('00000000-0000-4000-d000-00000000000b', current_date - 71, 'carburante','Miscela per motoseghe e soffiatori',38.20, 24,'l','00000000-0000-4000-c000-000000000001','00000000-0000-4000-c100-000000000004',null,null,null),

  -- Noleggi: sempre con il tipo.
  ('00000000-0000-4000-d000-000000000010', current_date - 30, 'noleggio','Piattaforma aerea 22 m, due giornate',500,null,null,'00000000-0000-4000-c000-000000000003',null,'piattaforma','FT 2026/318',null),
  ('00000000-0000-4000-d000-000000000011', current_date - 14, 'noleggio','Piattaforma aerea 18 m, una giornata',230,null,null,'00000000-0000-4000-c000-000000000003',null,'piattaforma','FT 2026/402',null),
  ('00000000-0000-4000-d000-000000000012', current_date - 47, 'noleggio','Autogru per rimozione alberatura caduta',780,null,null,'00000000-0000-4000-c000-000000000003',null,'gru','FT 2026/271',null),
  ('00000000-0000-4000-d000-000000000013', current_date - 62, 'noleggio','Cippatrice da 25 cm, noleggio settimanale',640,null,null,'00000000-0000-4000-c000-000000000003',null,'cippatrice',null,null),
  ('00000000-0000-4000-d000-000000000014', current_date - 8,  'noleggio','Autocarro ribaltabile, sostituzione durante il fermo officina',190,null,null,'00000000-0000-4000-c000-000000000003',null,'autocarro',null,null),

  -- Smaltimenti.
  ('00000000-0000-4000-d000-000000000020', current_date - 6,  'smaltimento','Conferimento ramaglia, 3,2 t',208, 3.2,'t','00000000-0000-4000-c000-000000000004',null,null,'FIR 4471/A',null),
  ('00000000-0000-4000-d000-000000000021', current_date - 28, 'smaltimento','Conferimento ceppaie e legname, 5,8 t',412, 5.8,'t','00000000-0000-4000-c000-000000000004',null,null,'FIR 4390/A',null),
  ('00000000-0000-4000-d000-000000000022', current_date - 41, 'smaltimento','Conferimento verde, 2,1 t',136, 2.1,'t','00000000-0000-4000-c000-000000000004',null,null,null,null),
  ('00000000-0000-4000-d000-000000000023', current_date - 66, 'smaltimento','Conferimento verde e terra di risulta',289,null,null,'00000000-0000-4000-c000-000000000004',null,null,'FIR 4102/A',null),

  -- Materiali.
  ('00000000-0000-4000-d000-000000000030', current_date - 3,  'materiali','Corda da arrampicata 11 mm, 60 m',214,null,null,'00000000-0000-4000-c000-000000000006',null,null,null,null),
  ('00000000-0000-4000-d000-000000000031', current_date - 11, 'materiali','Mastice cicatrizzante e nastro di segnalazione',47.30,null,null,'00000000-0000-4000-c000-000000000005',null,null,null,null),
  ('00000000-0000-4000-d000-000000000032', current_date - 19, 'materiali','Tiranti dinamici per consolidamento, kit da 2',386,null,null,'00000000-0000-4000-c000-000000000006',null,null,null,null),
  ('00000000-0000-4000-d000-000000000033', current_date - 33, 'materiali','Sacchi per ramaglia e teli da cantiere',88.50,null,null,'00000000-0000-4000-c000-000000000005',null,null,null,null),
  ('00000000-0000-4000-d000-000000000034', current_date - 52, 'materiali','Concime a lenta cessione, 4 sacchi da 25 kg',168,null,null,'00000000-0000-4000-c000-000000000005',null,null,null,null),
  ('00000000-0000-4000-d000-000000000035', current_date - 77, 'materiali','Dispositivi di protezione: due caschi e visiere di ricambio',276,null,null,'00000000-0000-4000-c000-000000000006',null,null,null,null),

  -- Manutenzione.
  ('00000000-0000-4000-d000-000000000040', current_date - 7,  'manutenzione','Tagliando e revisione idraulica della piattaforma',540,null,null,'00000000-0000-4000-c000-000000000007','00000000-0000-4000-c100-000000000003',null,'FT 2026/91',null),
  ('00000000-0000-4000-d000-000000000041', current_date - 18, 'manutenzione','Catene, barre e affilatura motoseghe',162.40,null,null,'00000000-0000-4000-c000-000000000006',null,null,null,null),
  ('00000000-0000-4000-d000-000000000042', current_date - 26, 'manutenzione','Sostituzione frizione autocarro',1240,null,null,'00000000-0000-4000-c000-000000000007','00000000-0000-4000-c100-000000000001',null,'FT 2026/78','Mezzo fermo tre giorni: nel periodo si è noleggiato un ribaltabile.'),
  ('00000000-0000-4000-d000-000000000043', current_date - 54, 'manutenzione','Cambio olio e filtri trattore',218,null,null,'00000000-0000-4000-c000-000000000007','00000000-0000-4000-c100-000000000005',null,null,null),
  ('00000000-0000-4000-d000-000000000044', current_date - 80, 'manutenzione','Sostituzione coltelli della cippatrice',395,null,null,'00000000-0000-4000-c000-000000000006','00000000-0000-4000-c100-000000000004',null,null,null),

  -- Assicurazioni, personale, altro: costi generali.
  ('00000000-0000-4000-d000-000000000050', current_date - 21, 'assicurazione','RCA autocarro, rata semestrale',684,null,null,'00000000-0000-4000-c000-000000000008','00000000-0000-4000-c100-000000000001',null,'Polizza 77120944',null),
  ('00000000-0000-4000-d000-000000000051', current_date - 21, 'assicurazione','RC professionale, rata annuale',1450,null,null,'00000000-0000-4000-c000-000000000008',null,null,null,null),
  ('00000000-0000-4000-d000-000000000052', current_date - 49, 'assicurazione','RCA piattaforma semovente',412,null,null,'00000000-0000-4000-c000-000000000008','00000000-0000-4000-c100-000000000003',null,null,null),
  ('00000000-0000-4000-d000-000000000060', current_date - 35, 'personale','Corso di aggiornamento tree climbing, due operatori',640,null,null,null,null,null,null,null),
  ('00000000-0000-4000-d000-000000000061', current_date - 63, 'personale','Visite mediche periodiche',285,null,null,null,null,null,null,null),
  ('00000000-0000-4000-d000-000000000070', current_date - 15, 'altro','Pedaggi e parcheggi del mese',96.80,null,null,null,null,null,null,null),
  ('00000000-0000-4000-d000-000000000071', current_date - 45, 'altro','Quota associativa di categoria',340,null,null,null,null,null,null,null)

on conflict (id) do nothing;
