import type { Cliente, ClienteInput, LuogoIntervento } from '@/types/cliente';
import type { Indirizzo } from '@/types/comune';

/**
 * Traduzione fra le righe del database e i tipi dell'app.
 *
 * Il database parla snake_case e tiene l'indirizzo spianato in cinque colonne;
 * l'app parla camelCase e lo tiene annidato. La traduzione sta QUI e non dentro
 * il service, per un motivo pratico: quando una colonna cambia nome si tocca un
 * file solo, e si vede subito se qualcosa non è mappato.
 *
 * Le altre entità hanno il loro mapper accanto al loro service — stesso schema,
 * stesso nome: `<entita>Mapper.ts`.
 */

/** La riga di `clienti` come arriva da PostgREST, con i luoghi annidati. */
export interface RigaCliente {
  id: string;
  tipo: string;
  denominazione: string;
  codice_fiscale: string | null;
  partita_iva: string | null;
  codice_destinatario: string | null;
  pec: string | null;
  referente_nome: string | null;
  referente_ruolo: string | null;
  referente_telefono: string | null;
  referente_email: string | null;
  telefono: string | null;
  email: string | null;
  fatt_via: string | null;
  fatt_civico: string | null;
  fatt_cap: string | null;
  fatt_comune: string | null;
  fatt_provincia: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  luoghi_intervento?: RigaLuogo[] | null;
}

export interface RigaLuogo {
  id: string;
  cliente_id: string;
  etichetta: string;
  via: string | null;
  civico: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  accesso_mezzi: string | null;
  note: string | null;
  principale: boolean;
  deleted_at?: string | null;
}

/** `null` dal DB diventa `undefined`: i tipi dell'app usano campi opzionali. */
const opt = (v: string | null | undefined): string | undefined => v ?? undefined;

/** Le colonne dell'indirizzo non sono mai NULL nello schema, ma un DB
 *  pre-esistente potrebbe averle: il `?? ''` evita `undefined` in un campo. */
function indirizzoDa(
  via: string | null,
  civico: string | null,
  cap: string | null,
  comune: string | null,
  provincia: string | null,
): Indirizzo {
  return {
    via: via ?? '',
    civico: civico ?? '',
    cap: cap ?? '',
    comune: comune ?? '',
    provincia: provincia ?? '',
  };
}

export function luogoDaRiga(r: RigaLuogo): LuogoIntervento {
  return {
    id: r.id,
    etichetta: r.etichetta,
    indirizzo: indirizzoDa(r.via, r.civico, r.cap, r.comune, r.provincia),
    accessoMezzi: (r.accesso_mezzi as LuogoIntervento['accessoMezzi']) ?? undefined,
    note: opt(r.note),
    principale: r.principale,
  };
}

export function clienteDaRiga(r: RigaCliente): Cliente {
  return {
    id: r.id,
    tipo: r.tipo as Cliente['tipo'],
    denominazione: r.denominazione,
    codiceFiscale: opt(r.codice_fiscale),
    partitaIva: opt(r.partita_iva),
    codiceDestinatario: opt(r.codice_destinatario),
    pec: opt(r.pec),
    // Il referente esiste solo se ha un nome: una scheda con ruolo e telefono
    // ma senza nome è un dato sporco, non un referente.
    referente: r.referente_nome
      ? {
          nome: r.referente_nome,
          ruolo: opt(r.referente_ruolo),
          telefono: opt(r.referente_telefono),
          email: opt(r.referente_email),
        }
      : undefined,
    telefono: opt(r.telefono),
    email: opt(r.email),
    indirizzoFatturazione: indirizzoDa(
      r.fatt_via,
      r.fatt_civico,
      r.fatt_cap,
      r.fatt_comune,
      r.fatt_provincia,
    ),
    // I luoghi cancellati non arrivano (li filtra la query), ma se il select
    // non li ha chiesti la chiave non c'è: array vuoto, non undefined.
    luoghiIntervento: (r.luoghi_intervento ?? []).map(luogoDaRiga),
    note: opt(r.note),
    creatoIl: r.created_at,
    aggiornatoIl: r.updated_at,
  };
}

/**
 * Dall'app al database. Le stringhe vuote diventano NULL: un `codice_fiscale`
 * valorizzato a `''` passerebbe il CHECK `is not null` pur non contenendo
 * niente, e il vincolo smetterebbe di proteggere.
 */
const vuotoANull = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
};

export function rigaDaCliente(c: Partial<ClienteInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (c.tipo !== undefined) out.tipo = c.tipo;
  if (c.denominazione !== undefined) out.denominazione = c.denominazione.trim();
  if (c.codiceFiscale !== undefined) out.codice_fiscale = vuotoANull(c.codiceFiscale)?.toUpperCase() ?? null;
  if (c.partitaIva !== undefined) out.partita_iva = vuotoANull(c.partitaIva);
  if (c.codiceDestinatario !== undefined)
    out.codice_destinatario = vuotoANull(c.codiceDestinatario)?.toUpperCase() ?? null;
  if (c.pec !== undefined) out.pec = vuotoANull(c.pec);
  if (c.telefono !== undefined) out.telefono = vuotoANull(c.telefono);
  if (c.email !== undefined) out.email = vuotoANull(c.email);
  if (c.note !== undefined) out.note = vuotoANull(c.note);

  // Il referente è un oggetto nell'app e quattro colonne nel DB. Passare
  // `referente: undefined` significa "non toccarlo"; passarlo a `null`
  // significa "cancellalo", e vanno azzerate tutte e quattro.
  if (c.referente !== undefined) {
    out.referente_nome = vuotoANull(c.referente?.nome);
    out.referente_ruolo = vuotoANull(c.referente?.ruolo);
    out.referente_telefono = vuotoANull(c.referente?.telefono);
    out.referente_email = vuotoANull(c.referente?.email);
  }

  if (c.indirizzoFatturazione !== undefined) {
    const a = c.indirizzoFatturazione;
    out.fatt_via = a.via ?? '';
    out.fatt_civico = a.civico ?? '';
    out.fatt_cap = a.cap ?? '';
    out.fatt_comune = a.comune ?? '';
    out.fatt_provincia = (a.provincia ?? '').toUpperCase();
  }

  return out;
}

export function rigaDaLuogo(
  l: Omit<LuogoIntervento, 'id'> & { id?: string },
  clienteId: string,
): Record<string, unknown> {
  return {
    ...(l.id ? { id: l.id } : {}),
    cliente_id: clienteId,
    etichetta: l.etichetta.trim(),
    via: l.indirizzo.via ?? '',
    civico: l.indirizzo.civico ?? '',
    cap: l.indirizzo.cap ?? '',
    comune: l.indirizzo.comune ?? '',
    provincia: (l.indirizzo.provincia ?? '').toUpperCase(),
    accesso_mezzi: l.accessoMezzi ?? null,
    note: vuotoANull(l.note),
    principale: l.principale ?? false,
  };
}
