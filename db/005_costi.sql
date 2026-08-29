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
