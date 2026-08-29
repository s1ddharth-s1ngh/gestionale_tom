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
