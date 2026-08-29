import type { Indirizzo, FiltriBase } from '@/types/comune';

/**
 * Anagrafica cliente. docs/PLAN.md §Step 2.
 *
 * I quattro tipi non sono un'etichetta decorativa: cambiano quali campi
 * servono. Al condominio serve l'amministratore come referente, all'ente il
 * codice destinatario per la fattura, al privato il codice fiscale. Lo schema
 * zod del form è un discriminated union su `tipo`, così la validazione dice la
 * verità e i campi che non si applicano non compaiono.
 */
export type TipoCliente = 'privato' | 'condominio' | 'azienda' | 'ente_pubblico';

export const TIPI_CLIENTE: TipoCliente[] = ['privato', 'condominio', 'azienda', 'ente_pubblico'];

export function tipoClienteLabel(t: TipoCliente): string {
  switch (t) {
    case 'privato':
      return 'Privato';
    case 'condominio':
      return 'Condominio';
    case 'azienda':
      return 'Azienda';
    case 'ente_pubblico':
      return 'Ente pubblico';
  }
}

/**
 * Accent del tipo. `purple` e `teal` dicono CATEGORIA, non gravità
 * (docs/UI-BADGE.md §2): un tipo di cliente non è né buono né grave, quindi
 * non usa i colori di stato.
 */
export const TIPO_CLIENTE_ACCENT: Record<TipoCliente, 'neutral' | 'purple' | 'teal' | 'info'> = {
  privato: 'neutral',
  condominio: 'purple',
  azienda: 'teal',
  ente_pubblico: 'info',
};

/**
 * Il referente. Per i condomini è l'amministratore, ed è la persona che si
 * chiama davvero: il condominio come soggetto non risponde al telefono.
 */
export interface Referente {
  nome: string;
  ruolo?: string;
  telefono?: string;
  email?: string;
}

/** Quanto è comodo arrivarci col camion e la piattaforma. */
export type AccessoMezzi = 'facile' | 'medio' | 'difficile';

export function accessoMezziLabel(a: AccessoMezzi): string {
  switch (a) {
    case 'facile':
      return 'Accesso facile';
    case 'medio':
      return 'Accesso medio';
    case 'difficile':
      return 'Accesso difficile';
  }
}

export const ACCESSO_ACCENT: Record<AccessoMezzi, 'emerald' | 'amber' | 'danger'> = {
  facile: 'emerald',
  medio: 'amber',
  difficile: 'danger',
};

/**
 * Dove si va a lavorare. Separato dall'indirizzo di fatturazione perché quasi
 * mai coincidono: l'amministratore fattura dal suo studio, il lavoro è nel
 * cortile del condominio dall'altra parte della città.
 */
export interface LuogoIntervento {
  id: string;
  /** Nome parlante: "Cortile interno", "Giardino lato strada". */
  etichetta: string;
  indirizzo: Indirizzo;
  accessoMezzi?: AccessoMezzi;
  note?: string;
  /** Quello proposto per primo quando si apre un preventivo. */
  principale?: boolean;
}

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  /** Ragione sociale, o nome e cognome per i privati. */
  denominazione: string;

  // Fiscale — quali servono dipende dal tipo.
  codiceFiscale?: string;
  partitaIva?: string;
  /** Fatturazione elettronica: predisposta, non trasmessa. */
  codiceDestinatario?: string;
  pec?: string;

  referente?: Referente;
  telefono?: string;
  email?: string;

  indirizzoFatturazione: Indirizzo;
  luoghiIntervento: LuogoIntervento[];

  note?: string;
  /** ISO 8601. */
  creatoIl: string;
  aggiornatoIl: string;
}

/** Cosa serve per creare o aggiornare: tutto tranne id e date di sistema. */
export type ClienteInput = Omit<Cliente, 'id' | 'creatoIl' | 'aggiornatoIl'>;

export interface ClienteFiltri extends FiltriBase {
  /** 'tutti' è un valore vero, non l'assenza di filtro: è la pill selezionata. */
  tipo?: TipoCliente | 'tutti';
}

/** Il luogo da proporre per primo: il principale, se c'è, altrimenti il primo. */
export function luogoPrincipale(c: Cliente): LuogoIntervento | undefined {
  return c.luoghiIntervento.find((l) => l.principale) ?? c.luoghiIntervento[0];
}
