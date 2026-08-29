import { clientAmministratore, errore, ok, preflight } from '../_shared/risposta.ts';

/**
 * Registra una fattura fornitore: le sue righe diventano costi.
 *
 * È la funzione che `fattureFornitoreService.registra()` invoca. Il lavoro vero
 * NON è qui: lo fa `public.genera_costi_da_fattura()`, perché deve essere
 * atomico e una transazione la sa fare il database, non un ciclo `for` in
 * TypeScript che a metà può perdere la connessione e lasciare tre costi su
 * cinque.
 *
 * Quello che questa funzione aggiunge, e che una chiamata RPC diretta dal
 * browser non darebbe:
 *
 *  - **il permesso**. Gira con la service key, quindi funziona anche il giorno
 *    in cui la RLS smetterà di lasciar scrivere i costi al client — che è il
 *    giorno in cui arriva l'autenticazione, cioè presto;
 *  - **un messaggio leggibile**. Gli errori di plpgsql arrivano come stringhe
 *    di Postgres, e «new row violates check constraint chk_carburante_ha_mezzo»
 *    non dice a Tom quale riga della fattura deve sistemare.
 *
 * Contratto:  POST { fatturaId: string }
 *             → 200 { costiCreati: number, giaRegistrata: boolean }
 */

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  let fatturaId: string | undefined;
  try {
    ({ fatturaId } = await req.json());
  } catch {
    return errore('Corpo della richiesta non leggibile: serve { "fatturaId": "…" }.');
  }

  if (!fatturaId) {
    return errore('Manca `fatturaId`.');
  }

  try {
    const supabase = clientAmministratore();

    const { data, error } = await supabase.rpc('genera_costi_da_fattura', {
      p_fattura_id: fatturaId,
    });

    if (error) {
      // I `raise exception` della funzione SQL sono già scritti per essere
      // letti da un umano — dicono quale riga e perché. Si passano su tali e
      // quali invece di sostituirli con un messaggio generico.
      return errore(error.message, error.code === 'PGRST116' ? 404 : 400);
    }

    const costiCreati = Number(data ?? 0);

    return ok({
      costiCreati,
      // Zero costi creati non è un fallimento: è la seconda pressione del
      // bottone. Il client deve poterle distinguere per dire «registrata» e non
      // «non è successo niente».
      giaRegistrata: costiCreati === 0,
    });
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto.', 500);
  }
});
