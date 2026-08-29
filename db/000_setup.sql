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
