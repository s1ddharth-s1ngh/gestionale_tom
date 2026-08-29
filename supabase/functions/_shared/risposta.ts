/**
 * Il minimo condiviso da tutte le edge functions: CORS, risposte JSON, e il
 * client Supabase con la service key.
 *
 * Sta in `_shared/` e non copiato in ogni funzione perché la testata CORS
 * sbagliata in UNA funzione è un errore che si manifesta come «la richiesta non
 * parte» nel browser, senza niente nei log del server: il posto peggiore in cui
 * avere tre copie leggermente diverse.
 */

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * `*` è accettabile qui e non lo sarà dopo.
 *
 * Oggi l'app gira in locale su una porta che cambia a ogni avvio di Vite, e un
 * elenco di origini ammesse sarebbe da riscrivere ogni volta. Il giorno che
 * l'app ha un dominio, questo diventa quel dominio: una edge function che
 * accetta chiamate da qualunque pagina è una funzione che chiunque può far
 * girare col proprio JavaScript.
 */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** La preflight va risposta prima di qualunque altra cosa, o il browser non
 *  manda mai la richiesta vera e il client vede solo un errore di rete. */
export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS }) : null;
}

export function ok(corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * L'errore torna con un messaggio in italiano e leggibile.
 *
 * `supabase.functions.invoke()` dal client NON legge il corpo quando lo stato è
 * di errore: espone solo un generico «non-2xx status code». Per questo il
 * dettaglio viaggia anche nell'header, ed è l'unico modo perché chi sta
 * registrando una fattura veda QUALE riga è sbagliata invece di «errore».
 */
export function errore(messaggio: string, status = 400): Response {
  return new Response(JSON.stringify({ errore: messaggio }), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'x-errore': encodeURIComponent(messaggio),
    },
  });
}

/**
 * Il client con la SERVICE ROLE key: scavalca la RLS.
 *
 * È il motivo per cui questo codice sta in una edge function e non nel browser.
 * La service key non deve mai finire nel bundle — chi ce l'ha può leggere e
 * scrivere qualunque riga di qualunque tabella, ignorando ogni policy.
 */
export function clientAmministratore(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    // Fallire subito e a voce alta: senza queste due variabili ogni query
    // tornerebbe «Invalid API key» a valle, e si perderebbe mezz'ora a cercare
    // il problema nella query invece che nella configurazione.
    throw new Error(
      'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti fra i secret della funzione.',
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
