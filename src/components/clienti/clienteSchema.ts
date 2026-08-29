import { z } from 'zod';

/**
 * Validazione dell'anagrafica cliente.
 *
 * È un **discriminated union su `tipo`**, non uno schema unico con tutto
 * opzionale: i quattro tipi hanno obblighi diversi, e uno schema piatto
 * costringerebbe a controllare a mano nel componente — dove la regola si perde
 * alla prima modifica. Qui la verità sul dato sta in un posto solo.
 *
 * Cosa cambia davvero:
 *  - **privato** → codice fiscale obbligatorio, niente P.IVA
 *  - **condominio** → codice fiscale e amministratore come referente
 *  - **azienda** → partita IVA obbligatoria
 *  - **ente pubblico** → codice fiscale e codice destinatario per la fattura
 */

/** 16 caratteri nella forma italiana. Non si valida il check digit: una P.IVA
 *  estera o un caso limite bloccherebbero l'inserimento per niente. */
const CODICE_FISCALE = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;
/** 11 cifre. Il prefisso "IT" si accetta e si toglie. */
const PARTITA_IVA = /^\d{11}$/;
const CAP = /^\d{5}$/;

const indirizzoSchema = z.object({
  via: z.string().trim().min(1, 'Indica la via'),
  // Niente `.default('')`: renderebbe il campo opzionale nel tipo di INPUT del
  // form, e `IndirizzoFields` vuole un `Indirizzo` completo. Il civico può
  // restare vuoto — capita, "località Ca' del Bosco" non ha numero — ma la
  // chiave c'è sempre.
  civico: z.string().trim().max(10, 'Civico troppo lungo'),
  cap: z.string().trim().regex(CAP, 'Il CAP è di 5 cifre'),
  comune: z.string().trim().min(1, 'Indica il comune'),
  provincia: z
    .string()
    .trim()
    .length(2, 'La provincia è la sigla di 2 lettere')
    .transform((v) => v.toUpperCase()),
});

const referenteSchema = z.object({
  nome: z.string().trim().min(1, 'Indica il nome del referente'),
  ruolo: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  email: z.string().trim().email('Email non valida').optional().or(z.literal('')),
});

const codiceFiscale = z
  .string()
  .trim()
  .min(1, 'Il codice fiscale è obbligatorio')
  .regex(CODICE_FISCALE, 'Formato del codice fiscale non valido');

/** Per condomini ed enti il CF è numerico (11 cifre), non nella forma persona. */
const codiceFiscaleEnte = z
  .string()
  .trim()
  .min(1, 'Il codice fiscale è obbligatorio')
  .regex(/^(\d{11}|[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])$/i, 'Formato non valido');

const partitaIva = z
  .string()
  .trim()
  .transform((v) => v.replace(/^IT/i, ''))
  .pipe(z.string().regex(PARTITA_IVA, 'La partita IVA è di 11 cifre'));

/** Campi comuni a tutti e quattro i tipi. */
const base = {
  denominazione: z.string().trim().min(2, 'Indica la denominazione'),
  telefono: z.string().trim().optional(),
  email: z.string().trim().email('Email non valida').optional().or(z.literal('')),
  pec: z.string().trim().email('PEC non valida').optional().or(z.literal('')),
  codiceDestinatario: z
    .string()
    .trim()
    .length(7, 'Il codice destinatario è di 7 caratteri')
    .optional()
    .or(z.literal('')),
  indirizzoFatturazione: indirizzoSchema,
  note: z.string().trim().optional(),
};

export const clienteSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('privato'),
    codiceFiscale,
    partitaIva: z.literal('').optional(),
    referente: referenteSchema.optional(),
    ...base,
  }),
  z.object({
    tipo: z.literal('condominio'),
    codiceFiscale: codiceFiscaleEnte,
    partitaIva: z.literal('').optional(),
    // L'amministratore non è un dettaglio: il condominio come soggetto non
    // risponde al telefono, si chiama sempre lui.
    referente: referenteSchema,
    ...base,
  }),
  z.object({
    tipo: z.literal('azienda'),
    partitaIva,
    codiceFiscale: z.string().trim().optional(),
    referente: referenteSchema.optional(),
    ...base,
  }),
  z.object({
    tipo: z.literal('ente_pubblico'),
    codiceFiscale: codiceFiscaleEnte,
    partitaIva: z.string().trim().optional(),
    referente: referenteSchema.optional(),
    ...base,
  }),
]);

export type ClienteForm = z.input<typeof clienteSchema>;
export type ClienteValidato = z.output<typeof clienteSchema>;
