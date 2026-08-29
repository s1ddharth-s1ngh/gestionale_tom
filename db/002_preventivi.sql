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
