import { z } from 'zod';
import { CATEGORIE_COSTO, TIPI_NOLEGGIO } from '@/types/costo';

/**
 * Lo schema del costo.
 *
 * Le due regole di dominio stanno QUI e non in un `if` dentro il componente:
 * la validazione va dove sta la verità sul dato, o la stessa regola va
 * riscritta in ogni form che tocca un costo — e la seconda volta si scrive
 * leggermente diversa.
 */
export const costoSchema = z
  .object({
    data: z.string().min(1, 'La data è obbligatoria'),
    categoria: z.enum(CATEGORIE_COSTO as [string, ...string[]]),
    descrizione: z.string().trim().min(3, 'Descrivi il costo in almeno tre caratteri'),
    importo: z.coerce.number().positive("L'importo deve essere maggiore di zero"),
    aliquotaIva: z.coerce.number().min(0).max(100).optional(),
    fornitoreId: z.string().optional(),
    mezzoId: z.string().optional(),
    tipoNoleggio: z.enum(TIPI_NOLEGGIO as [string, ...string[]]).optional(),
    commessaId: z.string().optional(),
    documento: z.string().optional(),
    litri: z.coerce.number().positive().optional(),
    note: z.string().optional(),
  })
  // «Carburante distinto per mezzo» è il requisito del modulo: un rifornimento
  // senza targa è un costo che non entrerà mai in nessun riepilogo per mezzo.
  .refine((c) => c.categoria !== 'carburante' || !!c.mezzoId, {
    path: ['mezzoId'],
    message: 'Per il carburante il mezzo è obbligatorio',
  })
  // Un noleggio senza tipo finisce in un riepilogo dove «piattaforma» e «gru»
  // stanno nello stesso mucchio, che è esattamente quello che il riepilogo
  // dovrebbe separare.
  .refine((c) => c.categoria !== 'noleggio' || !!c.tipoNoleggio, {
    path: ['tipoNoleggio'],
    message: 'Per un noleggio scegli che cosa si è noleggiato',
  });

export type CostoForm = z.infer<typeof costoSchema>;
