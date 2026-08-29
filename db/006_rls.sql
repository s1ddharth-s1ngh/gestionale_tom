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
