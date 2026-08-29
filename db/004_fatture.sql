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
