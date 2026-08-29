-- =============================================================================
-- 010 — Dati di esempio: clienti e luoghi di intervento
-- =============================================================================
-- Sono gli stessi clienti di `src/mocks/clienti.ts`, portati nel database.
-- Servono a due cose: avere qualcosa da guardare appena l'app si collega, e
-- capire se le schermate reggono — c'è una ragione sociale lunghissima che deve
-- troncare, un cliente senza cantieri, uno con tre.
--
-- Idempotente: gli id sono fissi e c'è `on conflict (id) do nothing`, quindi
-- rilanciarlo non duplica niente.
--
-- Per svuotare e ricominciare:
--   delete from public.luoghi_intervento where cliente_id in
--     (select id from public.clienti where id::text like '00000000-0000-4000-8000-%');
--   delete from public.clienti where id::text like '00000000-0000-4000-8000-%';
-- =============================================================================

insert into public.clienti (
  id, tipo, denominazione, codice_fiscale, partita_iva, codice_destinatario, pec,
  referente_nome, referente_ruolo, referente_telefono, referente_email,
  telefono, email,
  fatt_via, fatt_civico, fatt_cap, fatt_comune, fatt_provincia, note
) values
  ('00000000-0000-4000-8000-000000000001','condominio','Condominio Via Cesare Battisti 14',
   '92018740376',null,null,'studiomoretti@pec.it',
   'Studio Moretti Amministrazioni','Amministratore','051 234567','amministrazione@studiomoretti.it',
   '051 234567','amministrazione@studiomoretti.it',
   'Via Marconi','8','40122','Bologna','BO',
   'Assemblea delibera i lavori a fine marzo. Preventivi da inviare entro febbraio.'),

  ('00000000-0000-4000-8000-000000000002','privato','Marco Benedetti',
   'BNDMRC72E14A944K',null,null,null,
   null,null,null,null,
   '335 4471209','marco.benedetti@gmail.com',
   'Via dei Tigli','3','40068','San Lazzaro di Savena','BO',null),

  ('00000000-0000-4000-8000-000000000003','ente_pubblico',
   'Comune di Casalecchio di Reno — Settore Ambiente e Verde Pubblico',
   '01004910371','00577350374','UFY8T4','comune.casalecchio@cert.provincia.bo.it',
   'Ing. Laura Vitali','Responsabile verde pubblico','051 598111','l.vitali@comune.casalecchio.bo.it',
   '051 598111','ambiente@comune.casalecchio.bo.it',
   'Via dei Mille','9','40033','Casalecchio di Reno','BO',
   'Pagamenti a 60 giorni data fattura. Serve sempre il CIG sulle fatture.'),

  ('00000000-0000-4000-8000-000000000004','azienda',
   'Agriturismo Le Querce Antiche di Ferrari Luca & C. S.a.s.',
   '03847210378','03847210378','M5UXCR1','lequerceantiche@pec.it',
   'Luca Ferrari','Titolare','347 8823410',null,
   '051 6712340','info@lequerceantiche.it',
   'Via Idice','112','40064','Ozzano dell''Emilia','BO',null),

  ('00000000-0000-4000-8000-000000000005','privato','Andrea Corticelli',
   'CRTNDR85M22A944Z',null,null,null,
   null,null,null,null,
   '328 7719044','a.corticelli@outlook.it',
   'Via Nazionale Toscana','41','40065','Pianoro','BO',
   'Cliente appena inserito: il sopralluogo non e ancora stato fatto.'),

  ('00000000-0000-4000-8000-000000000006','condominio','Condominio Via Andrea Costa 142/A',
   '92104580371',null,null,null,
   'Rag. Paolo Sandri','Amministratore','051 385512','p.sandri@amministrazionisandri.it',
   '051 385512','p.sandri@amministrazionisandri.it',
   'Via Saffi','20','40131','Bologna','BO',
   'Un condomino ha segnalato rami pericolanti sul parcheggio. Priorita.'),

  ('00000000-0000-4000-8000-000000000007','azienda','Immobiliare San Petronio S.r.l.',
   null,'02934560371','KRRH6B9','immsanpetronio@pec.it',
   'Chiara Neri','Property manager','051 227700','c.neri@immsanpetronio.it',
   '051 227700','info@immsanpetronio.it',
   'Piazza Galvani','2','40124','Bologna','BO',null),

  ('00000000-0000-4000-8000-000000000008','condominio',
   'Condominio Corte dei Platani — Scala A, B, C e D con area verde comune',
   '92233410379',null,null,null,
   'Gestimm S.r.l.','Amministratore','051 442200','condomini@gestimm.it',
   '051 442200','condomini@gestimm.it',
   'Via Zanardi','270','40131','Bologna','BO',
   'Ragione sociale lunga: verificare che tronchi bene nelle tabelle.'),

  ('00000000-0000-4000-8000-000000000009','azienda','Hotel Villa Aurora S.r.l.',
   null,'03551240376','W7YVJK9','villaaurora@pec.it',
   'Davide Rossi','Direttore','051 774400',null,
   '051 774400','direzione@hotelvillaaurora.it',
   'Via Toscana','52','40141','Bologna','BO',null),

  ('00000000-0000-4000-8000-00000000000a','ente_pubblico',
   'Istituto Comprensivo Statale n. 12 di Bologna',
   '91201380375',null,'UFEJ8V','boic86200x@pec.istruzione.it',
   'DSGA Marina Poli','Direttore servizi generali','051 320735',null,
   null,'boic86200x@istruzione.it',
   'Via Populonia','11','40128','Bologna','BO',null),

  ('00000000-0000-4000-8000-00000000000b','privato','Roberto Guidotti',
   'GDTRRT65L03A944D',null,null,null,
   null,null,null,null,
   '051 6199233',null,
   'Via Gaibola','17','40136','Bologna','BO',
   'Cliente storico, chiama sempre a fine estate per la manutenzione.'),

  ('00000000-0000-4000-8000-00000000000c','azienda','Meccanica Bolognese S.p.A.',
   null,'00456780378','A4707H7','meccanicabolognese@legalmail.it',
   'Ufficio acquisti',null,'051 3399100','acquisti@meccanicabolognese.it',
   '051 3399100','acquisti@meccanicabolognese.it',
   'Via dell''Industria','22','40138','Bologna','BO',
   'Ordini solo con numero d''ordine acquisti, altrimenti la fattura torna indietro.')
on conflict (id) do nothing;


insert into public.luoghi_intervento (
  id, cliente_id, etichetta, via, civico, cap, comune, provincia, accesso_mezzi, note, principale
) values
  ('00000000-0000-4000-9000-000000000001','00000000-0000-4000-8000-000000000001',
   'Cortile interno','Via Cesare Battisti','14','40123','Bologna','BO','difficile',
   'Passo carraio stretto, la piattaforma entra solo smontata. Chiedere le chiavi al portiere.',true),
  ('00000000-0000-4000-9000-000000000002','00000000-0000-4000-8000-000000000001',
   'Giardino lato strada','Via Cesare Battisti','14','40123','Bologna','BO','facile',null,false),

  ('00000000-0000-4000-9000-000000000003','00000000-0000-4000-8000-000000000002',
   'Giardino di casa','Via dei Tigli','3','40068','San Lazzaro di Savena','BO','facile',null,true),

  ('00000000-0000-4000-9000-000000000004','00000000-0000-4000-8000-000000000003',
   'Parco della Chiusa — filare nord','Via Panoramica','24','40033','Casalecchio di Reno','BO','medio',
   'Area aperta al pubblico: transennare prima di iniziare.',true),
  ('00000000-0000-4000-9000-000000000005','00000000-0000-4000-8000-000000000003',
   'Scuola primaria Garibaldi — cortile','Via Porrettana','211','40033','Casalecchio di Reno','BO','facile',
   'Lavori solo in orario extrascolastico o durante le vacanze.',false),
  ('00000000-0000-4000-9000-000000000006','00000000-0000-4000-8000-000000000003',
   'Viale Carducci — alberata','Viale Carducci','1','40033','Casalecchio di Reno','BO','difficile',
   'Strada trafficata, serve ordinanza di chiusura e movieri.',false),

  ('00000000-0000-4000-9000-000000000007','00000000-0000-4000-8000-000000000004',
   'Viale d''ingresso','Via Idice','112','40064','Ozzano dell''Emilia','BO','facile',null,true),
  ('00000000-0000-4000-9000-000000000008','00000000-0000-4000-8000-000000000004',
   'Bosco dietro le stalle','Via Idice','112','40064','Ozzano dell''Emilia','BO','difficile',
   'Terreno in pendenza, con la pioggia non si sale.',false),

  -- Il cliente 005 non ha luoghi: serve a vedere lo stato vuoto della sezione.

  ('00000000-0000-4000-9000-000000000009','00000000-0000-4000-8000-000000000006',
   'Cortile condominiale','Via Andrea Costa','142/A','40134','Bologna','BO','difficile',
   'Cavi della linea elettrica sopra il cedro: chiedere sospensione a Enel prima di abbattere.',true),

  ('00000000-0000-4000-9000-00000000000a','00000000-0000-4000-8000-000000000007',
   'Complesso Le Terrazze — corte A','Via Larga','35','40138','Bologna','BO','medio',null,true),
  ('00000000-0000-4000-9000-00000000000b','00000000-0000-4000-8000-000000000007',
   'Complesso Le Terrazze — corte B','Via Larga','37','40138','Bologna','BO','medio',null,false),
  ('00000000-0000-4000-9000-00000000000c','00000000-0000-4000-8000-000000000007',
   'Palazzina uffici Zanolini','Via Zanolini','14','40126','Bologna','BO','difficile',
   'Centro storico: ZTL, serve permesso per il camion.',false),

  ('00000000-0000-4000-9000-00000000000d','00000000-0000-4000-8000-000000000008',
   'Viale dei platani','Via Agucchi','128','40131','Bologna','BO','medio',
   'Sei platani adulti lungo il viale, alcuni con cavita evidenti.',true),
  ('00000000-0000-4000-9000-00000000000e','00000000-0000-4000-8000-000000000008',
   'Area giochi bambini','Via Agucchi','128','40131','Bologna','BO','facile',null,false),

  ('00000000-0000-4000-9000-00000000000f','00000000-0000-4000-8000-000000000009',
   'Parco dell''hotel','Via Toscana','52','40141','Bologna','BO','facile',
   'Lavori entro le 9 del mattino: dopo ci sono gli ospiti in giardino.',true),

  ('00000000-0000-4000-9000-000000000010','00000000-0000-4000-8000-00000000000a',
   'Cortile scuola media','Via Populonia','11','40128','Bologna','BO','medio',
   'Solo in agosto o durante le vacanze scolastiche.',true),
  ('00000000-0000-4000-9000-000000000011','00000000-0000-4000-8000-00000000000a',
   'Giardino scuola dell''infanzia','Via Ferrarese','203','40128','Bologna','BO','facile',null,false),

  ('00000000-0000-4000-9000-000000000012','00000000-0000-4000-8000-00000000000b',
   'Bosco privato in collina','Via Gaibola','17','40136','Bologna','BO','difficile',
   'Strada sterrata in salita, ultimi 300 m solo con il fuoristrada.',true),

  ('00000000-0000-4000-9000-000000000013','00000000-0000-4000-8000-00000000000c',
   'Perimetro dello stabilimento','Via dell''Industria','22','40138','Bologna','BO','facile',
   'Serve DUVRI firmato prima di entrare in stabilimento.',true)
on conflict (id) do nothing;
