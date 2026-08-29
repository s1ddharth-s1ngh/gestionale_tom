-- =============================================================================
-- 008 — Numerazione atomica delle fatture attive
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

  -- `on conflict do update` invece di un select seguito da insert: anche la
  -- creazione della riga dell'anno è una corsa, il primo gennaio.
  insert into public.progressivi_fattura (anno, ultimo)
  values (p_anno, 1)
  on conflict (anno) do update
    set ultimo = public.progressivi_fattura.ultimo + 1,
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
