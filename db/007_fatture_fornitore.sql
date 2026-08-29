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
