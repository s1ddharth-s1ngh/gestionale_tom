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
