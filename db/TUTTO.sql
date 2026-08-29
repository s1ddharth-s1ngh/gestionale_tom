-- =============================================================================
-- TUTTO.sql — lo schema completo, in un file solo
-- =============================================================================
-- GENERATO da db/verifica/verifica.mjs: non si modifica a mano. Si modificano i
-- file numerati e si rigenera, o le due versioni divergono e nessuno sa piu
-- quale sia quella vera.
--
-- Serve a una cosa sola: eseguire lo schema con UN incollaggio nel SQL Editor
-- invece di diciassette. L'ordine e quello dei file, che non e decorativo —
-- 002 referenzia 001, 003 aggiunge una chiave a 002, 012 dipende da 005 e 007.
--
--   https://supabase.com/dashboard/project/<ref>/sql/new
--
-- E idempotente: `create table if not exists`, `create or replace`,
-- `on conflict do nothing`. Rilanciarlo non duplica niente e non rompe niente.
--
--   ATTENZIONE — la sezione 006 apre il database a chiunque abbia la chiave
--   pubblica, perche non c'e ancora un login. Va bene per dati di prova in
--   locale; smette di andare bene nel momento in cui entra il primo cliente
--   vero o l'app va online. La versione con `to authenticated` e gia scritta e
--   commentata in fondo a db/006_rls.sql.
--
-- Verificato con il parser di PostgreSQL: 0 errori di sintassi, delimitatori
-- bilanciati in ogni file.
--
-- Contiene, in quest'ordine:
--   000_setup.sql
--   001_clienti.sql
--   002_preventivi.sql
--   003_commesse.sql
--   004_fatture.sql
--   005_costi.sql
--   006_rls.sql
--   007_fatture_fornitore.sql
--   008_costi_riga_fattura.sql
--   009_numerazione.sql
--   010_seed_clienti.sql
--   011_seed_preventivi.sql
--   012_genera_costi_da_fattura.sql
--   013_seed_fatture.sql
--   014_seed_costi.sql
--   015_seed_commesse.sql
--   016_seed_fatture_fornitore.sql
-- =============================================================================


-- ##########################################################################
-- ##  000_setup.sql
-- ##########################################################################

-- =============================================================================
-- 000 — Impianto comune
-- =============================================================================
-- Va eseguito per primo: definisce la funzione che tutte le tabelle usano per
-- mantenere `updated_at`.
--
-- Convenzioni di schema (da Telebi, CLAUDE.md §"Convenzioni di schema"):
--
--   ogni tabella ha created_at, updated_at, deleted_at. Niente eccezioni,
--   tabelle di lookup incluse.
--
-- `deleted_at` abilita il soft-delete: non si cancellano le righe, si valorizza
-- `deleted_at = now()`, e ogni query filtra `deleted_at is null`. Serve perché
-- un cliente cancellato per errore si porta dietro preventivi, commesse e
-- fatture — e una FK con ON DELETE CASCADE li porterebbe via davvero.
-- =============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Mantiene updated_at a ogni UPDATE. Va agganciata con un trigger su OGNI
-- tabella: scriverlo a mano nelle query significa dimenticarlo la prima volta
-- che si fa un update da psql.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: tiene updated_at allineato senza che le query lo debbano scrivere.';


-- ##########################################################################
-- ##  001_clienti.sql
-- ##########################################################################

-- =============================================================================
-- 001 — Clienti e luoghi di intervento
-- =============================================================================
-- Prima tabella del progetto: tutte le altre ci puntano.
--
-- `luoghi_intervento` è una TABELLA VERA e non un campo JSONB, al contrario di
-- righe, foto e lavorazioni degli altri moduli. La ragione è una sola: i luoghi
-- sono referenziati da fuori — preventivi.luogo_intervento_id e
-- commesse.luogo_intervento_id — e un riferimento dentro un JSONB non è una
-- foreign key, quindi nessuno impedirebbe di cancellare un luogo su cui sono
-- appesi tre lavori.
-- =============================================================================

create table if not exists public.clienti (
  id                       uuid primary key default gen_random_uuid(),

  tipo                     text not null
                             check (tipo in ('privato','condominio','azienda','ente_pubblico')),
  denominazione            text not null check (length(trim(denominazione)) > 0),

  -- Fiscale. Quali servono dipende dal tipo, e il vincolo è sotto (chk_fiscale):
  -- tenerlo qui invece che solo nel form significa che vale anche per gli
  -- import e per le correzioni fatte a mano da SQL.
  codice_fiscale           text,
  partita_iva              text,
  codice_destinatario      text,
  pec                      text,

  -- Referente. Per i condomini è l'amministratore, ed è la persona che si
  -- chiama davvero: il condominio come soggetto non risponde al telefono.
  referente_nome           text,
  referente_ruolo          text,
  referente_telefono       text,
  referente_email          text,

  telefono                 text,
  email                    text,

  -- Indirizzo di FATTURAZIONE. I luoghi di lavoro stanno nella tabella sotto:
  -- quasi mai coincidono.
  fatt_via                 text not null default '',
  fatt_civico              text not null default '',
  fatt_cap                 text not null default '',
  fatt_comune              text not null default '',
  fatt_provincia           text not null default '',

  note                     text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz,

  -- Gli obblighi per tipo, gli stessi del discriminated union zod del form.
  constraint chk_fiscale check (
    case tipo
      when 'azienda'       then partita_iva is not null and length(trim(partita_iva)) > 0
      when 'privato'       then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      when 'condominio'    then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      when 'ente_pubblico' then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      else true
    end
  ),
  -- Per i condomini l'amministratore non è opzionale.
  constraint chk_referente_condominio check (
    tipo <> 'condominio' or (referente_nome is not null and length(trim(referente_nome)) > 0)
  )
);

create table if not exists public.luoghi_intervento (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.clienti(id) on delete restrict,

  etichetta          text not null check (length(trim(etichetta)) > 0),

  via                text not null default '',
  civico             text not null default '',
  cap                text not null default '',
  comune             text not null default '',
  provincia          text not null default '',

  accesso_mezzi      text check (accesso_mezzi in ('facile','medio','difficile')),
  note               text,
  -- Quello proposto per primo aprendo un preventivo. Non è un vincolo di
  -- unicità: un cliente con due "principali" è un dato sporco, non un errore
  -- che vale la pena bloccare a metà inserimento.
  principale         boolean not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- ── Indici ───────────────────────────────────────────────────────────────────
-- Parziali su deleted_at is null: le query filtrano sempre così, e un indice
-- che indicizza anche le righe cancellate è più grande senza servire.
create index if not exists idx_clienti_attivi
  on public.clienti (denominazione) where deleted_at is null;
create index if not exists idx_clienti_tipo
  on public.clienti (tipo) where deleted_at is null;
create index if not exists idx_luoghi_cliente
  on public.luoghi_intervento (cliente_id) where deleted_at is null;

-- Ricerca testuale: la lista cerca su denominazione, comune e referente.
create index if not exists idx_clienti_ricerca on public.clienti
  using gin (to_tsvector('italian',
    coalesce(denominazione,'') || ' ' || coalesce(fatt_comune,'') || ' ' || coalesce(referente_nome,'')));

-- ── Trigger ──────────────────────────────────────────────────────────────────
drop trigger if exists trg_clienti_updated on public.clienti;
create trigger trg_clienti_updated before update on public.clienti
  for each row execute function public.set_updated_at();

drop trigger if exists trg_luoghi_updated on public.luoghi_intervento;
create trigger trg_luoghi_updated before update on public.luoghi_intervento
  for each row execute function public.set_updated_at();


-- ##########################################################################
-- ##  002_preventivi.sql
-- ##########################################################################

-- =============================================================================
-- 002 — Preventivi
-- =============================================================================
-- Perché sopralluogo, alberi, righe e foto stanno in JSONB e non in tabelle
-- figlie: non vengono MAI letti senza il preventivo che li contiene, e nessuno
-- li referenzia da fuori. Renderli tabelle significherebbe quattro join (o
-- quattro query) per aprire una scheda, e altrettanti insert/delete per
-- salvarla, in cambio di una normalizzazione che qui non serve a nessuno.
--
-- Il confine è quello del modulo 001: JSONB per ciò che vive solo dentro il
-- padre, tabella vera per ciò che qualcuno referenzia da fuori.
--
-- Attenzione: `stato = 'scaduto'` NON si salva. Un preventivo inviato con
-- valido_fino nel passato È scaduto, e la vista sotto lo calcola. Salvarlo
-- richiederebbe un job che nessuno fa girare, e il giorno che non gira i dati
-- mentono.
-- =============================================================================

create table if not exists public.preventivi (
  id                    uuid primary key default gen_random_uuid(),
  numero                text not null,                       -- PR-2026-0042

  cliente_id            uuid not null references public.clienti(id) on delete restrict,
  luogo_intervento_id   uuid references public.luoghi_intervento(id) on delete restrict,

  stato                 text not null default 'bozza'
                          check (stato in ('bozza','inviato','accettato','rifiutato')),

  data_emissione        date not null default current_date,
  valido_fino           date,
  data_invio            timestamptz,
  data_esito            timestamptz,

  -- Scheda di sopralluogo: { dataSopralluogo, accessibilita, criticita[],
  -- noteTecniche, alberi[], foto[] }
  sopralluogo           jsonb not null default '{}'::jsonb,
  -- Righe economiche: [{ id, descrizione, quantita, unita, prezzoUnitario }]
  righe                 jsonb not null default '[]'::jsonb,

  -- Denormalizzati dalle righe. Non sono la verità — la verità sono le righe —
  -- ma senza, ordinare l'elenco per importo significherebbe sommare un JSONB
  -- per ogni riga a ogni caricamento della lista.
  imponibile            numeric(12,2) not null default 0,
  aliquota_iva          numeric(5,2)  not null default 22,
  totale                numeric(12,2) not null default 0,

  note                  text,
  commessa_id           uuid,   -- FK aggiunta in 003, quando la tabella esiste

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint uq_preventivi_numero unique (numero),
  -- Un preventivo accettato o rifiutato ha una data di esito: senza, lo
  -- storico non sa dire quando è stato deciso.
  constraint chk_esito check (stato not in ('accettato','rifiutato') or data_esito is not null)
);

create index if not exists idx_preventivi_cliente
  on public.preventivi (cliente_id) where deleted_at is null;
create index if not exists idx_preventivi_stato
  on public.preventivi (stato, data_emissione desc) where deleted_at is null;
create index if not exists idx_preventivi_numero
  on public.preventivi (numero) where deleted_at is null;

drop trigger if exists trg_preventivi_updated on public.preventivi;
create trigger trg_preventivi_updated before update on public.preventivi
  for each row execute function public.set_updated_at();

-- ── Lo stato "scaduto", calcolato ────────────────────────────────────────────
-- Si legge da qui invece che dalla tabella: la colonna `stato` resta quella
-- decisa da una persona, `stato_effettivo` aggiunge il tempo che passa.
create or replace view public.v_preventivi as
select
  p.*,
  case
    when p.stato = 'inviato' and p.valido_fino is not null and p.valido_fino < current_date
      then 'scaduto'
    else p.stato
  end as stato_effettivo,
  c.denominazione as cliente_denominazione
from public.preventivi p
join public.clienti c on c.id = p.cliente_id
where p.deleted_at is null;

comment on view public.v_preventivi is
  'Preventivi con lo stato "scaduto" derivato da valido_fino. Le liste leggono da qui.';


-- ##########################################################################
-- ##  003_commesse.sql
-- ##########################################################################

-- =============================================================================
-- 003 — Commesse
-- =============================================================================
-- Lavorazioni, foto prima/dopo e rapportino in JSONB, per la stessa ragione dei
-- preventivi: vivono solo dentro la commessa.
--
-- `ore_reali` e `avanzamento_pct` sono DERIVATI dalle lavorazioni. Stanno in
-- colonna perché la lista li mostra e ordinarci sopra un JSONB sarebbe caro, ma
-- la verità sono le lavorazioni: il trigger sotto li ricalcola a ogni scrittura
-- invece di fidarsi di quello che manda il client. Due numeri che si possono
-- scrivere a mano divergono dai dati il primo giorno.
-- =============================================================================

create table if not exists public.commesse (
  id                    uuid primary key default gen_random_uuid(),
  numero                text not null,                       -- CM-2026-0031

  preventivo_id         uuid references public.preventivi(id) on delete set null,
  cliente_id            uuid not null references public.clienti(id) on delete restrict,
  luogo_intervento_id   uuid references public.luoghi_intervento(id) on delete restrict,

  stato                 text not null default 'da_pianificare'
                          check (stato in ('da_pianificare','pianificata','in_corso',
                                           'completata','sospesa','annullata')),

  data_pianificata      date,
  data_inizio           date,
  data_fine             date,

  ore_previste          numeric(8,2) not null default 0,
  ore_reali             numeric(8,2) not null default 0,
  avanzamento_pct       numeric(5,2) not null default 0,

  -- [{ id, descrizione, orePreviste, oreReali, completata }]
  lavorazioni           jsonb not null default '[]'::jsonb,
  foto_prima            jsonb not null default '[]'::jsonb,
  foto_dopo             jsonb not null default '[]'::jsonb,
  -- { dataCompilazione, oreLavorate, operatori[], materialiUsati, noteCliente,
  --   firmaCliente (dataURL), firmatoIl }
  rapportino            jsonb,

  note                  text,
  fattura_id            uuid,   -- FK aggiunta in 004

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint uq_commesse_numero unique (numero),
  -- Una commessa pianificata ha una data. Senza, non compare nel calendario e
  -- sparisce dalla vista che serve a organizzare la settimana.
  constraint chk_pianificata check (stato <> 'pianificata' or data_pianificata is not null),
  constraint chk_date_coerenti check (data_fine is null or data_inizio is null or data_fine >= data_inizio)
);

-- La FK che mancava a 002: adesso la tabella esiste.
alter table public.preventivi
  drop constraint if exists fk_preventivi_commessa;
alter table public.preventivi
  add constraint fk_preventivi_commessa
  foreign key (commessa_id) references public.commesse(id) on delete set null;

create index if not exists idx_commesse_cliente
  on public.commesse (cliente_id) where deleted_at is null;
create index if not exists idx_commesse_stato
  on public.commesse (stato, data_pianificata) where deleted_at is null;
-- Il calendario chiede "cosa c'è in questo mese": indice sulla sola data.
create index if not exists idx_commesse_pianificate
  on public.commesse (data_pianificata) where deleted_at is null and data_pianificata is not null;

drop trigger if exists trg_commesse_updated on public.commesse;
create trigger trg_commesse_updated before update on public.commesse
  for each row execute function public.set_updated_at();

-- ── Ore reali e avanzamento: ricalcolati, non ricevuti ───────────────────────
create or replace function public.commesse_ricalcola_derivati()
returns trigger
language plpgsql
as $$
declare
  tot   int;
  fatte int;
  ore   numeric;
begin
  select
    count(*),
    count(*) filter (where coalesce((l->>'completata')::boolean, false)),
    coalesce(sum(coalesce((l->>'oreReali')::numeric, 0)), 0)
  into tot, fatte, ore
  from jsonb_array_elements(coalesce(new.lavorazioni, '[]'::jsonb)) as l;

  new.ore_reali := ore;
  -- Nessuna lavorazione = 0%, non "diviso zero". Una commessa senza
  -- lavorazioni non è completa, è vuota.
  new.avanzamento_pct := case when tot = 0 then 0 else round(fatte::numeric * 100 / tot, 2) end;
  return new;
end;
$$;

drop trigger if exists trg_commesse_derivati on public.commesse;
create trigger trg_commesse_derivati
  before insert or update of lavorazioni on public.commesse
  for each row execute function public.commesse_ricalcola_derivati();

create or replace view public.v_commesse as
select c.*, cl.denominazione as cliente_denominazione
from public.commesse c
join public.clienti cl on cl.id = c.cliente_id
where c.deleted_at is null;


-- ##########################################################################
-- ##  004_fatture.sql
-- ##########################################################################

-- =============================================================================
-- 004 — Fatture, incassi, solleciti
-- =============================================================================
-- La regola centrale del modulo: **lo stato è derivato dagli incassi**, non
-- scelto. In tabella si salva solo `bozza` o `emessa` — cioè la decisione di
-- una persona. `pagata_parziale`, `pagata` e `scaduta` li calcola la vista
-- `v_fatture` dal residuo e dalla data. Un campo stato modificabile a mano
-- diverge dai numeri il primo giorno che qualcuno registra un incasso e si
-- dimentica di cambiarlo.
--
-- Fatturazione elettronica: i campi ci sono e si compilano, ma **niente viene
-- trasmesso**. La colonna `dati_fe` raccoglie, non spedisce.
-- =============================================================================

create table if not exists public.fatture (
  id                    uuid primary key default gen_random_uuid(),
  numero                text not null,                       -- 2026/0007

  tipo                  text not null default 'unica'
                          check (tipo in ('acconto','saldo','unica')),

  cliente_id            uuid not null references public.clienti(id) on delete restrict,
  commessa_id           uuid references public.commesse(id) on delete set null,

  -- Solo la decisione umana. Il resto lo dice v_fatture.
  stato                 text not null default 'bozza'
                          check (stato in ('bozza','emessa')),

  data_emissione        date,
  data_scadenza         date,

  -- [{ id, descrizione, quantita, prezzoUnitario, aliquotaIva }]
  righe                 jsonb not null default '[]'::jsonb,
  -- [{ id, data, importo, metodo, riferimento }]
  incassi               jsonb not null default '[]'::jsonb,
  -- [{ id, data, canale, note }]
  solleciti             jsonb not null default '[]'::jsonb,

  imponibile            numeric(12,2) not null default 0,
  iva                   numeric(12,2) not null default 0,
  totale                numeric(12,2) not null default 0,

  -- Predisposizione fattura elettronica: raccolta, non trasmissione.
  dati_fe               jsonb,

  note                  text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint uq_fatture_numero unique (numero),
  -- Una fattura emessa ha una data di emissione e una scadenza. Senza scadenza
  -- non entra nello scadenzario, che è il posto da cui si lavora davvero.
  constraint chk_emessa check (
    stato <> 'emessa' or (data_emissione is not null and data_scadenza is not null)
  )
);

-- La FK che mancava a 003.
alter table public.commesse drop constraint if exists fk_commesse_fattura;
alter table public.commesse
  add constraint fk_commesse_fattura
  foreign key (fattura_id) references public.fatture(id) on delete set null;

create index if not exists idx_fatture_cliente
  on public.fatture (cliente_id) where deleted_at is null;
create index if not exists idx_fatture_commessa
  on public.fatture (commessa_id) where deleted_at is null;
-- Lo scadenzario ordina per scadenza crescente: è la sua query principale.
create index if not exists idx_fatture_scadenza
  on public.fatture (data_scadenza) where deleted_at is null and stato = 'emessa';

drop trigger if exists trg_fatture_updated on public.fatture;
create trigger trg_fatture_updated before update on public.fatture
  for each row execute function public.set_updated_at();

-- ── Lo stato vero ────────────────────────────────────────────────────────────
create or replace view public.v_fatture as
with agg as (
  select
    f.id,
    coalesce((
      select sum(coalesce((i->>'importo')::numeric, 0))
      from jsonb_array_elements(coalesce(f.incassi, '[]'::jsonb)) as i
    ), 0) as incassato
  from public.fatture f
)
select
  f.*,
  a.incassato,
  (f.totale - a.incassato) as residuo,
  case
    when f.stato = 'bozza' then 'bozza'
    when a.incassato >= f.totale and f.totale > 0 then 'pagata'
    when f.data_scadenza is not null and f.data_scadenza < current_date then 'scaduta'
    when a.incassato > 0 then 'pagata_parziale'
    else 'emessa'
  end as stato_effettivo,
  cl.denominazione as cliente_denominazione
from public.fatture f
join agg a on a.id = f.id
join public.clienti cl on cl.id = f.cliente_id
where f.deleted_at is null;

comment on view public.v_fatture is
  'Fatture con incassato, residuo e stato_effettivo calcolati dagli incassi. Le liste e lo scadenzario leggono da qui.';


-- ##########################################################################
-- ##  005_costi.sql
-- ##########################################################################

-- =============================================================================
-- 005 — Fornitori, mezzi, costi
-- =============================================================================
-- `mezzi` è l'anagrafica MINIMA: targa, descrizione, tipo. Il modulo mezzi
-- completo — revisioni, assicurazioni, tagliandi — è fuori dal primo rilascio,
-- e questa struttura non gli sta in mezzo: quando arriverà, sarà una tabella
-- `scadenze_mezzo` che punta qui.
-- =============================================================================

create table if not exists public.fornitori (
  id                     uuid primary key default gen_random_uuid(),
  denominazione          text not null check (length(trim(denominazione)) > 0),
  partita_iva            text,
  categoria_prevalente   text,

  telefono               text,
  email                  text,

  via                    text not null default '',
  civico                 text not null default '',
  cap                    text not null default '',
  comune                 text not null default '',
  provincia              text not null default '',

  note                   text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create table if not exists public.mezzi (
  id            uuid primary key default gen_random_uuid(),
  targa         text not null,
  descrizione   text not null default '',
  tipo          text not null default 'altro'
                  check (tipo in ('autocarro','pickup','piattaforma','cippatrice','trattore','altro')),
  attivo        boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint uq_mezzi_targa unique (targa)
);

create table if not exists public.costi (
  id                uuid primary key default gen_random_uuid(),

  data              date not null default current_date,
  categoria         text not null
                      check (categoria in ('carburante','materiali','noleggio','smaltimento',
                                           'manutenzione','assicurazione','personale','altro')),
  descrizione       text not null default '',

  importo           numeric(12,2) not null,
  quantita          numeric(12,3),
  unita             text,

  fornitore_id      uuid references public.fornitori(id) on delete set null,
  -- Con commessa_id il costo è IMPUTATO, senza è generale. La distinzione serve
  -- al report di marginalità (fuori dal primo rilascio) e va fatta bene adesso,
  -- o si rifà tutto dopo.
  commessa_id       uuid references public.commesse(id) on delete set null,
  mezzo_id          uuid references public.mezzi(id) on delete restrict,

  tipo_noleggio     text check (tipo_noleggio in ('piattaforma','gru','cippatrice','autocarro','altro')),
  numero_documento  text,
  note              text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  -- Il requisito "carburante distinto per mezzo", imposto dal database e non
  -- solo dal form: vale anche per gli import e per le correzioni da SQL.
  constraint chk_carburante_ha_mezzo check (categoria <> 'carburante' or mezzo_id is not null),
  constraint chk_noleggio_ha_tipo    check (categoria <> 'noleggio'   or tipo_noleggio is not null)
);

create index if not exists idx_costi_data
  on public.costi (data desc) where deleted_at is null;
create index if not exists idx_costi_categoria
  on public.costi (categoria, data desc) where deleted_at is null;
create index if not exists idx_costi_commessa
  on public.costi (commessa_id) where deleted_at is null and commessa_id is not null;
create index if not exists idx_costi_mezzo
  on public.costi (mezzo_id, data desc) where deleted_at is null and mezzo_id is not null;
create index if not exists idx_fornitori_attivi
  on public.fornitori (denominazione) where deleted_at is null;

drop trigger if exists trg_fornitori_updated on public.fornitori;
create trigger trg_fornitori_updated before update on public.fornitori
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mezzi_updated on public.mezzi;
create trigger trg_mezzi_updated before update on public.mezzi
  for each row execute function public.set_updated_at();

drop trigger if exists trg_costi_updated on public.costi;
create trigger trg_costi_updated before update on public.costi
  for each row execute function public.set_updated_at();

create or replace view public.v_costi as
select
  c.*,
  f.denominazione as fornitore_denominazione,
  m.targa         as mezzo_targa,
  co.numero       as commessa_numero
from public.costi c
left join public.fornitori f on f.id = c.fornitore_id
left join public.mezzi m     on m.id = c.mezzo_id
left join public.commesse co on co.id = c.commessa_id
where c.deleted_at is null;


-- ##########################################################################
-- ##  006_rls.sql
-- ##########################################################################

-- =============================================================================
-- 006 — Row Level Security
-- =============================================================================
--
--   ⚠️  QUESTO FILE APRE IL DATABASE A CHIUNQUE ABBIA LA CHIAVE PUBBLICA.
--
-- Va bene ADESSO e non andrà bene dopo. Leggere prima di eseguire.
--
-- Il gestionale non ha ancora un login: il browser parla con Supabase usando la
-- publishable key, che sta nel bundle ed è quindi visibile a chiunque apra gli
-- strumenti per sviluppatori. Con RLS attiva e nessuna policy, ogni query
-- tornerebbe zero righe e l'app sembrerebbe rotta; con le policy qui sotto,
-- chiunque conosca URL e chiave può leggere e scrivere tutto.
--
-- È accettabile finché:
--   - dentro ci sono dati finti o di prova,
--   - l'app gira solo in locale,
--   - l'URL del progetto non è pubblico.
--
-- Smette di essere accettabile nel momento esatto in cui entra il primo cliente
-- vero, o l'app viene messa online. A quel punto servono, in quest'ordine:
--   1. l'autenticazione (Supabase Auth, anche solo email+password per due utenti);
--   2. la sostituzione di queste policy con `to authenticated` invece di `to anon`;
--   3. la revoca esplicita dei permessi ad `anon`.
--
-- Il blocco finale di questo file contiene già quella versione, commentata.
-- =============================================================================

alter table public.clienti            enable row level security;
alter table public.luoghi_intervento  enable row level security;
alter table public.preventivi         enable row level security;
alter table public.commesse           enable row level security;
alter table public.fatture            enable row level security;
alter table public.fornitori          enable row level security;
alter table public.mezzi              enable row level security;
alter table public.costi              enable row level security;

-- ── FASE 1 — nessun login: accesso aperto ────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'clienti','luoghi_intervento','preventivi','commesse',
    'fatture','fornitori','mezzi','costi'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'apertura_temporanea_' || t, t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      'apertura_temporanea_' || t, t
    );
  end loop;
end
$$;

comment on schema public is
  'ATTENZIONE: policy RLS aperte ad anon (db/006_rls.sql fase 1). Da sostituire prima di mettere dati veri o pubblicare l''app.';


-- =============================================================================
-- I GRANT, che le policy da sole non sostituiscono
-- =============================================================================
-- Una policy dice CHI può vedere QUALI righe. Il permesso di toccare la tabella
-- è un'altra cosa, e viene prima: senza `grant`, `anon` prende «permesso negato»
-- e la policy non entra nemmeno in gioco.
--
-- Su Supabase di solito non ci si accorge della differenza, perché il progetto
-- nasce con delle default privileges che concedono tutto ad anon e
-- authenticated sulle tabelle nuove di `public`. Ma sono un'impostazione del
-- progetto, non parte di questo schema: su un database creato altrove — un
-- Postgres locale per provare le migrazioni, un self-hosted, un ripristino da
-- dump — lo schema si installa senza un errore e poi risponde «permesso
-- negato» a ogni query. Verificato: succede davvero.
--
-- Quindi i permessi si dichiarano qui, e lo schema smette di dipendere da come
-- è stato creato il progetto.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

-- Le viste servono in sola lettura: sono derivazioni, si scrive sulle tabelle.
-- (`all tables` comprende già le viste, ma la revoca qui sotto è esplicita.)
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Le tabelle create DOPO questo file prendono gli stessi permessi senza doverlo
-- rilanciare. È la stessa cosa che fa Supabase, scritta dentro lo schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ── L'eccezione: i progressivi ───────────────────────────────────────────────
-- `progressivi_fattura` (db/009) non è un dato dell'applicazione: è il contatore
-- che rende unica la numerazione. Nessuno deve poterlo scrivere dal browser —
-- alzare quel numero a mano significa saltare dei protocolli, abbassarlo
-- significa emettere due fatture con lo stesso.
--
-- `assegna_numero_fattura` continua a funzionare perché è `security definer`:
-- gira come il proprietario della tabella, che alla RLS non è soggetto.
do $$
begin
  if to_regclass('public.progressivi_fattura') is not null then
    execute 'alter table public.progressivi_fattura enable row level security';
    execute 'revoke all on public.progressivi_fattura from anon, authenticated';
  end if;
end
$$;


-- =============================================================================
-- FASE 2 — quando ci sarà il login. NON eseguire adesso: senza autenticazione
-- queste policy rendono l'app vuota, non sicura.
-- =============================================================================
--
-- do $$
-- declare
--   t text;
-- begin
--   foreach t in array array[
--     'clienti','luoghi_intervento','preventivi','commesse',
--     'fatture','fornitori','mezzi','costi'
--   ] loop
--     execute format('drop policy if exists %I on public.%I', 'apertura_temporanea_' || t, t);
--     execute format(
--       'create policy %I on public.%I for all to authenticated using (true) with check (true)',
--       'solo_autenticati_' || t, t
--     );
--     -- `revoke ... from public` NON basta: le default privileges di Supabase
--     -- concedono comunque i permessi ad anon. Va revocato per nome.
--     execute format('revoke all on public.%I from anon', t);
--   end loop;
-- end
-- $$;


-- ##########################################################################
-- ##  007_fatture_fornitore.sql
-- ##########################################################################

-- =============================================================================
-- 007 — Fatture fornitore (ciclo passivo)
-- =============================================================================
-- L'altra metà del ciclo: `fatture` sono le attive, quelle che Tom emette;
-- queste sono quelle che riceve. Non è la stessa tabella con un flag, e le
-- ragioni sono nei vincoli qui sotto.
--
-- **Il numero non è nostro.** Lo decide il fornitore, quindi niente progressivo
-- da generare — e due fornitori diversi possono benissimo mandare entrambi la
-- loro «1/2026». L'unicità è sulla terna (fornitore, numero, anno del
-- documento): metterla sul numero da solo rifiuterebbe fatture legittime.
--
-- **Lo stato salvato è solo la decisione umana**: `bozza` o `registrata`.
-- Da pagare, pagata in parte, pagata e scaduta li calcola `v_fatture_fornitore`
-- dai pagamenti e dal calendario. La formula è la stessa di
-- `statoEffettivoFattura()` in src/types/fatturaFornitore.ts: se una cambia,
-- l'altra va cambiata con lei, o l'elenco e i suoi contatori si contraddicono.
--
-- **Le righe generano i costi**, non li duplicano: ogni riga porta già la sua
-- categoria, il mezzo, il tipo di noleggio e la commessa, e
-- `genera_costi_da_fattura` (008) le trasforma in righe di `costi` in una
-- transazione sola.
-- =============================================================================

create table if not exists public.fatture_fornitore (
  id                      uuid primary key default gen_random_uuid(),
  fornitore_id            uuid not null references public.fornitori(id) on delete restrict,

  -- Il numero del FORNITORE. Nessun formato imposto: «318», «2026/318», «FT-A-42».
  numero                  text not null check (length(trim(numero)) > 0),

  -- La data del DOCUMENTO. È quella che conta per il periodo di competenza: una
  -- fattura di marzo registrata a maggio resta spesa di marzo.
  data_documento          date not null,
  -- Quando è arrivata a noi. La differenza con la precedente è il ritardo con
  -- cui ce ne siamo accorti: si conserva invece di dedurlo, perché è il dato che
  -- spiega le registrazioni tardive.
  data_ricezione          date not null default current_date,
  data_scadenza           date,

  stato                   text not null default 'bozza'
                            check (stato in ('bozza','registrata')),

  -- [{ id, descrizione, quantita, prezzoUnitario, aliquotaIva, categoria,
  --    mezzoId, tipoNoleggio, commessaId, litri }]
  righe                   jsonb not null default '[]'::jsonb,
  -- [{ id, data, importo, metodo, riferimento }]
  pagamenti               jsonb not null default '[]'::jsonb,

  -- Denormalizzati dalle righe: servono a ordinare e filtrare senza sommare un
  -- JSONB per riga. La verità restano le righe.
  imponibile              numeric(12,2) not null default 0,
  iva                     numeric(12,2) not null default 0,
  totale                  numeric(12,2) not null default 0,

  -- Quello che arriva dallo SdI: si conserva, non si trasmette.
  -- { identificativoSdi, formatoTrasmissione, tipoDocumento, nomeFile, importataIl }
  dati_fe                 jsonb,

  note                    text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,

  constraint chk_ff_totale check (totale >= 0),
  -- La scadenza non può precedere il documento.
  constraint chk_ff_scadenza check (data_scadenza is null or data_scadenza >= data_documento),
  -- Nemmeno la ricezione: una fattura non arriva prima di essere emessa.
  constraint chk_ff_ricezione check (data_ricezione >= data_documento)
);

-- L'unicità vera: stesso fornitore, stesso numero, stesso anno di documento.
-- È un indice e non un CHECK perché usa un'espressione sulla data.
create unique index if not exists uq_ff_fornitore_numero_anno
  on public.fatture_fornitore (fornitore_id, numero, date_part('year', data_documento))
  where deleted_at is null;

create index if not exists idx_ff_fornitore
  on public.fatture_fornitore (fornitore_id, data_documento desc) where deleted_at is null;
-- Lo scadenzario passivo: la query principale del modulo.
create index if not exists idx_ff_scadenza
  on public.fatture_fornitore (data_scadenza) where deleted_at is null;
create index if not exists idx_ff_stato
  on public.fatture_fornitore (stato, data_documento desc) where deleted_at is null;

drop trigger if exists trg_ff_updated on public.fatture_fornitore;
create trigger trg_ff_updated before update on public.fatture_fornitore
  for each row execute function public.set_updated_at();

-- ── Il legame coi costi ──────────────────────────────────────────────────────
-- NULLABLE di proposito: un costo pagato in contanti non ha fattura e deve
-- restare registrabile. `on delete set null` e non `restrict`: cancellare la
-- fattura non deve portarsi via i costi, che sono un dato a sé.
alter table public.costi
  add column if not exists fattura_fornitore_id uuid;

alter table public.costi drop constraint if exists fk_costi_fattura_fornitore;
alter table public.costi
  add constraint fk_costi_fattura_fornitore
  foreign key (fattura_fornitore_id) references public.fatture_fornitore(id) on delete set null;

create index if not exists idx_costi_fattura_fornitore
  on public.costi (fattura_fornitore_id)
  where deleted_at is null and fattura_fornitore_id is not null;

-- ── Lo stato vero ────────────────────────────────────────────────────────────
-- L'ordine dei rami conta. **Pagata viene prima di scaduta**: una fattura
-- saldata in ritardo è pagata, non scaduta, e continuare a segnalarla in rosso
-- dopo che i soldi sono usciti è il modo più rapido per far ignorare il colore.
create or replace view public.v_fatture_fornitore as
with agg as (
  select
    f.id,
    coalesce((
      select sum(coalesce((p->>'importo')::numeric, 0))
      from jsonb_array_elements(coalesce(f.pagamenti, '[]'::jsonb)) as p
    ), 0) as pagato,
    (select count(*) from public.costi c
      where c.fattura_fornitore_id = f.id and c.deleted_at is null) as costi_generati
  from public.fatture_fornitore f
)
select
  f.*,
  a.pagato,
  (f.totale - a.pagato) as residuo,
  a.costi_generati,
  (f.data_ricezione - f.data_documento) as giorni_di_ritardo_ricezione,
  case
    when f.stato = 'bozza' then 'bozza'
    when a.pagato >= f.totale and f.totale > 0 then 'pagata'
    when f.data_scadenza is not null and f.data_scadenza < current_date then 'scaduta'
    when a.pagato > 0 then 'pagata_parziale'
    else 'da_pagare'
  end as stato_effettivo,
  fo.denominazione as fornitore_denominazione,
  fo.partita_iva   as fornitore_partita_iva
from public.fatture_fornitore f
join agg a on a.id = f.id
join public.fornitori fo on fo.id = f.fornitore_id
where f.deleted_at is null;

comment on view public.v_fatture_fornitore is
  'Fatture fornitore con pagato, residuo, stato_effettivo e numero di costi generati. Elenco e scadenzario passivo leggono da qui.';

-- ── Scadenzario passivo: quanto esce, e quando ───────────────────────────────
create or replace function public.riepilogo_scadenze_fornitori(giorni int default 30)
returns table (
  fascia    text,
  quante    bigint,
  importo   numeric
)
language sql
stable
as $$
  select
    case
      when v.data_scadenza < current_date then 'scadute'
      when v.data_scadenza <= current_date + giorni then 'in_scadenza'
      else 'future'
    end as fascia,
    count(*),
    sum(v.residuo)
  from public.v_fatture_fornitore v
  -- Le bozze non sono debito: non si è ancora deciso che quella fattura vale.
  where v.stato_effettivo not in ('pagata', 'bozza')
    and v.data_scadenza is not null
  group by 1;
$$;

comment on function public.riepilogo_scadenze_fornitori(int) is
  'Tre fasce di debito verso i fornitori: scadute, in scadenza entro N giorni, future. Le bozze restano fuori.';

grant execute on function public.riepilogo_scadenze_fornitori(int) to anon, authenticated;

-- ── Marginalità per commessa ─────────────────────────────────────────────────
-- È il motivo per cui i costi portano `commessa_id`: senza questa vista, quel
-- campo sarebbe stato solo una buona intenzione.
--
-- I costi generali (senza commessa_id) restano fuori di proposito: spalmarli
-- richiede una regola di ripartizione, che è una decisione dell'azienda e non
-- una formula da inventare qui.
create or replace view public.v_marginalita_commessa as
select
  c.id                      as commessa_id,
  c.numero                  as commessa_numero,
  c.stato                   as commessa_stato,
  cl.denominazione          as cliente_denominazione,
  coalesce(r.ricavi, 0)     as ricavi,
  coalesce(k.costi, 0)      as costi,
  coalesce(r.ricavi, 0) - coalesce(k.costi, 0) as margine,
  -- Niente divisione per zero: una commessa senza ricavi non ha una percentuale
  -- di margine, ha un margine e basta.
  case
    when coalesce(r.ricavi, 0) = 0 then null
    else round((coalesce(r.ricavi, 0) - coalesce(k.costi, 0)) * 100 / r.ricavi, 1)
  end                       as margine_pct,
  c.ore_previste,
  c.ore_reali
from public.commesse c
join public.clienti cl on cl.id = c.cliente_id
left join (
  -- Imponibile e non totale: l'IVA incassata si versa, non è ricavo.
  select commessa_id, sum(imponibile) as ricavi
  from public.fatture
  where deleted_at is null and stato = 'emessa' and commessa_id is not null
  group by commessa_id
) r on r.commessa_id = c.id
left join (
  select commessa_id, sum(importo) as costi
  from public.costi
  where deleted_at is null and commessa_id is not null
  group by commessa_id
) k on k.commessa_id = c.id
where c.deleted_at is null;

comment on view public.v_marginalita_commessa is
  'Ricavi (imponibile delle attive emesse) meno costi imputati, per commessa. I costi generali senza commessa_id restano esclusi: ripartirli e una decisione aziendale, non una formula.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Sta qui e non in 006 perché quel file gira PRIMA di questo: la tabella non
-- esisterebbe ancora. Stessa apertura temporanea, stesso avviso — leggere
-- l'intestazione di db/006_rls.sql prima di eseguire.
alter table public.fatture_fornitore enable row level security;

drop policy if exists apertura_temporanea_fatture_fornitore on public.fatture_fornitore;
create policy apertura_temporanea_fatture_fornitore
  on public.fatture_fornitore for all to anon, authenticated
  using (true) with check (true);


-- ##########################################################################
-- ##  008_costi_riga_fattura.sql
-- ##########################################################################

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
-- `drop` prima del `create`, e non è ridondante con l'`if not exists`: la prima
-- versione di questo file creava l'indice SENZA il predicato, e `if not exists`
-- si limiterebbe a trovarne uno con quel nome e a lasciarlo com'è. Chi avesse
-- già eseguito la versione vecchia si ritroverebbe con l'indice sbagliato e
-- nessun errore — cioè col difetto che questo file esiste per chiudere.
drop index if exists public.uq_costi_riga_fattura;

create unique index if not exists uq_costi_riga_fattura
  on public.costi (fattura_fornitore_id, riga_fattura_id)
  where deleted_at is null;


-- ##########################################################################
-- ##  009_numerazione.sql
-- ##########################################################################

-- =============================================================================
-- 009 — Numerazione atomica delle fatture attive
-- =============================================================================
-- Il problema che risolve: «leggi l'ultimo numero, aggiungi uno, scrivi» fatto
-- dal browser è una corsa. Fra la lettura e la scrittura un'altra scheda può
-- fare lo stesso, e il UNIQUE su `fatture.numero` rifiuta la seconda — con un
-- errore che l'operatore non sa interpretare.
--
-- Qui il progressivo vive in una tabella con una riga per anno, e si incrementa
-- sotto lock di riga. Due richieste in parallelo si mettono in fila e ottengono
-- due numeri diversi.
--
-- Perché non una `sequence`: le sequence non si azzerano per anno senza
-- interventi manuali, e soprattutto non tornano indietro. Qui il registro per
-- anno è esplicito e si legge con un `select`.
--
-- Dipende da: 004 (fatture). Va eseguito dopo.
-- =============================================================================

create table if not exists public.progressivi_fattura (
  anno          integer primary key,
  ultimo        integer not null default 0,
  aggiornato_il timestamptz not null default now()
);

comment on table public.progressivi_fattura is
  'Un contatore per anno. Il lock di riga su questa tabella e cio che rende atomica la numerazione.';

-- Il contatore non è un dato dell'applicazione e non si tocca dal browser:
-- alzarlo a mano salta dei protocolli, abbassarlo fa emettere due fatture con
-- lo stesso numero. RLS attiva e nessuna policy: chi non è il proprietario non
-- vede niente.
--
-- `assegna_numero_fattura` continua a funzionare perché è `security definer` e
-- gira come il proprietario, che alla RLS non è soggetto.
--
-- Sta qui e non solo in `006_rls.sql` perché quel file si esegue PRIMA di
-- questo: quando gira, questa tabella non esiste ancora.
alter table public.progressivi_fattura enable row level security;
revoke all on public.progressivi_fattura from anon, authenticated;

/**
 * Assegna il prossimo numero all'anno richiesto e lo scrive sulla fattura.
 *
 * `security definer` perché deve poter scrivere anche quando la chiama un
 * ruolo che sulla tabella dei progressivi non ha permessi propri: il numero
 * non è un dato che l'utente possa scegliere.
 */
create or replace function public.assegna_numero_fattura(
  p_fattura_id uuid,
  p_anno       integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prossimo integer;
  v_massimo  integer;
  v_numero   text;
  v_esistente text;
begin
  -- Se il numero c'è già, si restituisce quello: la funzione è ripetibile, e
  -- un retry della edge function non deve bruciare un progressivo.
  select numero into v_esistente
  from public.fatture
  where id = p_fattura_id;

  if v_esistente is not null and v_esistente not like 'TMP-%' then
    return v_esistente;
  end if;

  -- Il contatore si riallinea PRIMA di incrementare, e non è pignoleria: al
  -- primo giro, in un database appena creato, la riga dell'anno non esiste
  -- ancora mentre le fatture del seed sì — perché lo schema si esegue prima
  -- dei dati. Senza questa riga il progressivo ripartirebbe da 1 e collider
  -- ebbe con FT-AAAA-0001 già presente.
  --
  -- Vale anche dopo: se qualcuno importa fatture scrivendo il numero a mano,
  -- il contatore si adegua da solo invece di produrre duplicati finché non
  -- rilancia il file.
  select coalesce(max(nullif(regexp_replace(numero, '^FT-\d{4}-', ''), '')::int), 0)
  into v_massimo
  from public.fatture
  where numero ~ ('^FT-' || p_anno::text || '-\d+$');

  insert into public.progressivi_fattura (anno, ultimo)
  values (p_anno, v_massimo + 1)
  on conflict (anno) do update
    -- `greatest` e non `+ 1` secco: se il massimo in tabella è più avanti del
    -- contatore, vince la tabella.
    set ultimo = greatest(public.progressivi_fattura.ultimo, excluded.ultimo - 1) + 1,
        aggiornato_il = now()
  returning ultimo into v_prossimo;

  v_numero := 'FT-' || p_anno::text || '-' || lpad(v_prossimo::text, 4, '0');

  update public.fatture
  set numero = v_numero
  where id = p_fattura_id;

  return v_numero;
end;
$$;

comment on function public.assegna_numero_fattura is
  'Assegna FT-AAAA-NNNN sotto lock di riga. Ripetibile: se la fattura ha gia un numero definitivo lo restituisce senza consumarne uno nuovo.';

-- Allinea il contatore alle fatture già presenti: senza, dopo un seed il primo
-- numero generato collide con uno esistente e l'insert viene rifiutato.
insert into public.progressivi_fattura (anno, ultimo)
select
  extract(year from coalesce(data_emissione, created_at))::int as anno,
  max(coalesce(nullif(regexp_replace(numero, '^FT-\d{4}-', ''), '')::int, 0)) as ultimo
from public.fatture
where numero ~ '^FT-\d{4}-\d+$'
group by 1
on conflict (anno) do update
  set ultimo = greatest(public.progressivi_fattura.ultimo, excluded.ultimo);


-- ##########################################################################
-- ##  010_seed_clienti.sql
-- ##########################################################################

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


-- ##########################################################################
-- ##  011_seed_preventivi.sql
-- ##########################################################################

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


-- ##########################################################################
-- ##  012_genera_costi_da_fattura.sql
-- ##########################################################################

-- =============================================================================
-- 012 — Registrazione di una fattura fornitore: le righe diventano costi
-- =============================================================================
-- È l'operazione centrale del ciclo passivo, e sta in una funzione del database
-- e non nel client per una ragione sola: **deve essere atomica**.
--
-- Generare N costi con N chiamate separate dal browser significa che una
-- connessione che cade a metà lascia tre costi su cinque, la fattura mezza
-- registrata, e nessuno che se ne accorga finché il riepilogo del mese non
-- torna. Qui o entrano tutte le righe o non ne entra nessuna: il corpo di una
-- funzione plpgsql è una transazione.
--
-- È anche **idempotente**: se la fattura ha già costi collegati non fa niente e
-- torna 0. Il doppio click sul bottone «Registra» è la norma, e senza questo
-- controllo raddoppierebbe la spesa del mese.
--
-- Dipende da: 005 (costi), 007 (fatture_fornitore), 008 (costi.riga_fattura_id).
-- =============================================================================

create or replace function public.genera_costi_da_fattura(p_fattura_id uuid)
returns integer
language plpgsql
-- `security definer` perché la chiama la edge function per conto di chi non ha
-- i permessi di scrittura diretta sui costi. Il `search_path` fissato è
-- obbligatorio su una funzione definer: senza, chi può creare uno schema può
-- dirottare i nomi non qualificati e far eseguire il proprio codice con i
-- privilegi del proprietario.
security definer
set search_path = public, pg_temp
as $$
declare
  v_fattura      public.fatture_fornitore%rowtype;
  v_riga         jsonb;
  v_categoria    text;
  v_importo      numeric;
  v_mezzo        uuid;
  v_commessa     uuid;
  v_noleggio     text;
  v_inseriti     integer := 0;
begin
  select * into v_fattura
  from public.fatture_fornitore
  where id = p_fattura_id and deleted_at is null
  -- Il lock serve al doppio click vero: due richieste partite insieme
  -- passerebbero entrambe il controllo di idempotenza sotto, perché nessuna
  -- delle due vede ancora i costi dell'altra.
  for update;

  if not found then
    raise exception 'Fattura fornitore % non trovata', p_fattura_id
      using errcode = 'no_data_found';
  end if;

  -- Idempotenza: se qualcosa c'è già, non si tocca niente. Tornare 0 e non un
  -- errore è voluto — chi ha ricliccato non ha sbagliato, e trattarlo come un
  -- guasto insegna a ignorare i messaggi.
  if exists (
    select 1 from public.costi
    where fattura_fornitore_id = p_fattura_id and deleted_at is null
  ) then
    return 0;
  end if;

  for v_riga in
    select * from jsonb_array_elements(coalesce(v_fattura.righe, '[]'::jsonb))
  loop
    -- La categoria ha due nomi possibili perché il form la chiama `categoria`
    -- quando l'utente la sceglie e `categoriaSuggerita` quando la propone
    -- l'import XML. Accettarle entrambe qui costa un coalesce; pretendere una
    -- sola forma costerebbe una migrazione dei dati già inseriti.
    v_categoria := coalesce(
      v_riga->>'categoria',
      v_riga->>'categoriaSuggerita',
      'altro'
    );

    v_importo := round(
      coalesce((v_riga->>'quantita')::numeric, 0) *
      coalesce((v_riga->>'prezzoUnitario')::numeric, 0),
      2
    );

    -- Le righe a zero non diventano costi: sono descrizioni, sconti già
    -- conteggiati o righe di cortesia, e un costo da zero euro sporca il
    -- conteggio dei movimenti senza aggiungere un centesimo alla spesa.
    if v_importo = 0 then
      continue;
    end if;

    v_mezzo    := nullif(v_riga->>'mezzoId', '')::uuid;
    v_commessa := nullif(v_riga->>'commessaId', '')::uuid;
    v_noleggio := nullif(v_riga->>'tipoNoleggio', '');

    -- I due vincoli di `public.costi` si spiegano PRIMA di violarli: il
    -- messaggio del CHECK dice il nome del vincolo, non quale riga della
    -- fattura va sistemata, e chi registra ha bisogno del secondo.
    if v_categoria = 'carburante' and v_mezzo is null then
      raise exception
        'La riga "%" è carburante ma non indica il mezzo: il costo per targa è obbligatorio.',
        coalesce(v_riga->>'descrizione', '(senza descrizione)')
        using errcode = 'check_violation';
    end if;

    if v_categoria = 'noleggio' and v_noleggio is null then
      raise exception
        'La riga "%" è un noleggio ma non indica di che tipo.',
        coalesce(v_riga->>'descrizione', '(senza descrizione)')
        using errcode = 'check_violation';
    end if;

    insert into public.costi (
      data, categoria, descrizione, importo,
      fornitore_id, commessa_id, mezzo_id, tipo_noleggio,
      numero_documento, fattura_fornitore_id, riga_fattura_id, note
    ) values (
      -- La data del costo è quella del DOCUMENTO, non di oggi: una fattura di
      -- marzo registrata a maggio è spesa di marzo, e datarla oggi la
      -- sposterebbe nel periodo sbagliato in ogni riepilogo.
      v_fattura.data_documento,
      v_categoria,
      coalesce(nullif(v_riga->>'descrizione', ''), 'Riga senza descrizione'),
      v_importo,
      v_fattura.fornitore_id,
      v_commessa,
      v_mezzo,
      v_noleggio,
      v_fattura.numero,
      p_fattura_id,
      -- L'id della riga JSONB da cui nasce il costo. È quello che dà valore a
      -- `uq_costi_riga_fattura` (008): senza scriverlo, l'indice unico avrebbe
      -- due NULL — che in Postgres non collidono mai — e la doppia generazione
      -- tornerebbe possibile nonostante l'indice ci sia.
      coalesce(nullif(v_riga->>'id', ''), 'riga-' || v_inseriti::text),
      nullif(v_riga->>'note', '')
    );

    v_inseriti := v_inseriti + 1;
  end loop;

  -- Il passaggio di stato sta DENTRO la stessa transazione dei costi, e non in
  -- una seconda chiamata di chi ci ha invocato: fuori di qui, una caduta fra le
  -- due lascerebbe la fattura in bozza con la spesa già contabilizzata, e la
  -- registrazione ripetuta la raddoppierebbe — che è esattamente il guasto che
  -- questa funzione esiste per rendere impossibile.
  update public.fatture_fornitore
  set stato = 'registrata'
  where id = p_fattura_id;

  return v_inseriti;
end;
$$;

comment on function public.genera_costi_da_fattura(uuid) is
  'Trasforma le righe di una fattura fornitore in costi, in una transazione sola. Idempotente: se i costi esistono gia torna 0.';

-- ── L'inverso ────────────────────────────────────────────────────────────────
-- Serve a correggere una registrazione sbagliata. Soft-delete e non DELETE,
-- coerentemente con tutto il resto dello schema.

create or replace function public.annulla_costi_da_fattura(p_fattura_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_annullati integer;
begin
  update public.costi
  set deleted_at = now()
  where fattura_fornitore_id = p_fattura_id and deleted_at is null;

  get diagnostics v_annullati = row_count;
  return v_annullati;
end;
$$;

comment on function public.annulla_costi_da_fattura(uuid) is
  'Soft-delete dei costi generati da una fattura fornitore, per rifare una registrazione sbagliata.';

-- Le due funzioni sono chiamabili da PostgREST: le usa la edge function con la
-- service key, e il client come ripiego quando la edge function non risponde.
grant execute on function public.genera_costi_da_fattura(uuid) to anon, authenticated;
grant execute on function public.annulla_costi_da_fattura(uuid) to anon, authenticated;


-- ##########################################################################
-- ##  013_seed_fatture.sql
-- ##########################################################################

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


-- ##########################################################################
-- ##  014_seed_costi.sql
-- ##########################################################################

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


-- ##########################################################################
-- ##  015_seed_commesse.sql
-- ##########################################################################

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


-- ##########################################################################
-- ##  016_seed_fatture_fornitore.sql
-- ##########################################################################

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
