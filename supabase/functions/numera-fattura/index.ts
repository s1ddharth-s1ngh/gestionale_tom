import { clientAmministratore, errore, ok, preflight } from '../_shared/risposta.ts';

/**
 * Assegna il numero a una fattura attiva, in modo atomico.
 *
 * **Perché sta sul server e non nel service del frontend.** Il frontend fa
 * «leggi l'ultimo numero, aggiungi uno, scrivi»: fra la lettura e la scrittura
 * un'altra scheda del browser può fare lo stesso, e il `unique` sul numero
 * rifiuta la seconda. Con un utente solo è un fastidio raro; con due persone
 * che fatturano lo stesso giorno è un errore quotidiano, e l'operatore non ha
 * modo di capire cosa fare.
 *
 * Qui il numero lo assegna una funzione SQL sotto lock (`assegna_numero_fattura`,
 * in `db/009_numerazione.sql`): due richieste in parallelo si mettono in fila e
 * ottengono due numeri diversi, invece di litigare per lo stesso.
 *
 * POST { fatturaId: string }
 *   → 200 { ok: true, numero: "FT-2026-0042" }
 *   → 409 se la fattura ha già un numero definitivo
 */
Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;

  if (req.method !== 'POST') return errore('Metodo non ammesso.', 405);

  let fatturaId: string | undefined;
  try {
    ({ fatturaId } = await req.json());
  } catch {
    return errore('Corpo della richiesta non leggibile.');
  }

  if (!fatturaId) return errore('Manca `fatturaId`.');

  const supabase = clientAmministratore();

  const { data: fattura, error: erroreLettura } = await supabase
    .from('fatture')
    .select('id, numero, data_emissione')
    .eq('id', fatturaId)
    .is('deleted_at', null)
    .maybeSingle();

  if (erroreLettura) return errore(`Lettura fattura: ${erroreLettura.message}`, 500);
  if (!fattura) return errore('Fattura non trovata.', 404);

  // Un numero già assegnato non si tocca: rinumerare una fattura emessa
  // significa avere due documenti con lo stesso protocollo in giro.
  if (fattura.numero && !fattura.numero.startsWith('TMP-')) {
    return ok({ numero: fattura.numero, giaAssegnato: true });
  }

  // L'anno del progressivo è quello della data di emissione, non di oggi: una
  // fattura di dicembre emessa il 2 gennaio resta nel registro di dicembre.
  const anno = new Date(fattura.data_emissione ?? new Date()).getFullYear();

  const { data, error } = await supabase.rpc('assegna_numero_fattura', {
    p_fattura_id: fatturaId,
    p_anno: anno,
  });

  if (error) return errore(`Assegnazione numero: ${error.message}`, 500);

  return ok({ numero: data as string });
});
