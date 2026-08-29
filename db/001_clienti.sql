-- =============================================================================
-- 001 — Clienti e luoghi di intervento
-- =============================================================================
-- Prima tabella del progetto: tutte le altre ci puntano.
--
-- `luoghi_intervento` è una TABELLA VERA e non un campo JSONB, al contrario di
-- righe, foto e lavorazioni degli altri moduli. La ragione è una sola: i luoghi
-- sono referenziati da fuori — preventivi.luogo_intervento_id e
-- commesse.luogo_intervento_id — e un riferimento dentro un JSONB non è una
-- foreign key, quindi nessuno impedirebbe di cancellare un luogo su cui sono
-- appesi tre lavori.
-- =============================================================================

create table if not exists public.clienti (
  id                       uuid primary key default gen_random_uuid(),

  tipo                     text not null
                             check (tipo in ('privato','condominio','azienda','ente_pubblico')),
  denominazione            text not null check (length(trim(denominazione)) > 0),

  -- Fiscale. Quali servono dipende dal tipo, e il vincolo è sotto (chk_fiscale):
  -- tenerlo qui invece che solo nel form significa che vale anche per gli
  -- import e per le correzioni fatte a mano da SQL.
  codice_fiscale           text,
  partita_iva              text,
  codice_destinatario      text,
  pec                      text,

  -- Referente. Per i condomini è l'amministratore, ed è la persona che si
  -- chiama davvero: il condominio come soggetto non risponde al telefono.
  referente_nome           text,
  referente_ruolo          text,
  referente_telefono       text,
  referente_email          text,

  telefono                 text,
  email                    text,

  -- Indirizzo di FATTURAZIONE. I luoghi di lavoro stanno nella tabella sotto:
  -- quasi mai coincidono.
  fatt_via                 text not null default '',
  fatt_civico              text not null default '',
  fatt_cap                 text not null default '',
  fatt_comune              text not null default '',
  fatt_provincia           text not null default '',

  note                     text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz,

  -- Gli obblighi per tipo, gli stessi del discriminated union zod del form.
  constraint chk_fiscale check (
    case tipo
      when 'azienda'       then partita_iva is not null and length(trim(partita_iva)) > 0
      when 'privato'       then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      when 'condominio'    then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      when 'ente_pubblico' then codice_fiscale is not null and length(trim(codice_fiscale)) > 0
      else true
    end
  ),
  -- Per i condomini l'amministratore non è opzionale.
  constraint chk_referente_condominio check (
    tipo <> 'condominio' or (referente_nome is not null and length(trim(referente_nome)) > 0)
  )
);

create table if not exists public.luoghi_intervento (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.clienti(id) on delete restrict,

  etichetta          text not null check (length(trim(etichetta)) > 0),

  via                text not null default '',
  civico             text not null default '',
  cap                text not null default '',
  comune             text not null default '',
  provincia          text not null default '',

  accesso_mezzi      text check (accesso_mezzi in ('facile','medio','difficile')),
  note               text,
  -- Quello proposto per primo aprendo un preventivo. Non è un vincolo di
  -- unicità: un cliente con due "principali" è un dato sporco, non un errore
  -- che vale la pena bloccare a metà inserimento.
  principale         boolean not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- ── Indici ───────────────────────────────────────────────────────────────────
-- Parziali su deleted_at is null: le query filtrano sempre così, e un indice
-- che indicizza anche le righe cancellate è più grande senza servire.
create index if not exists idx_clienti_attivi
  on public.clienti (denominazione) where deleted_at is null;
create index if not exists idx_clienti_tipo
  on public.clienti (tipo) where deleted_at is null;
create index if not exists idx_luoghi_cliente
  on public.luoghi_intervento (cliente_id) where deleted_at is null;

-- Ricerca testuale: la lista cerca su denominazione, comune e referente.
create index if not exists idx_clienti_ricerca on public.clienti
  using gin (to_tsvector('italian',
    coalesce(denominazione,'') || ' ' || coalesce(fatt_comune,'') || ' ' || coalesce(referente_nome,'')));

-- ── Trigger ──────────────────────────────────────────────────────────────────
drop trigger if exists trg_clienti_updated on public.clienti;
create trigger trg_clienti_updated before update on public.clienti
  for each row execute function public.set_updated_at();

drop trigger if exists trg_luoghi_updated on public.luoghi_intervento;
create trigger trg_luoghi_updated before update on public.luoghi_intervento
  for each row execute function public.set_updated_at();
