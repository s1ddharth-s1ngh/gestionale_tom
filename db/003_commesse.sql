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
