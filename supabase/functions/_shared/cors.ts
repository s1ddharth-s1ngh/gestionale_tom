/**
 * Intestazioni CORS condivise dalle edge function.
 *
 * `*` sull'origine va bene finché non c'è un login: non ci sono cookie di
 * sessione da proteggere, e le funzioni vogliono comunque un Bearer token nello
 * header `Authorization`. Il giorno che entra l'autenticazione va stretto al
 * dominio dell'app — con le credenziali in gioco, un'origine aperta diventa il
 * buco.
 */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** La preflight: senza, il browser non manda mai la POST vera. */
export function rispondiPreflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS }) : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export function errore(messaggio: string, status = 400, extra?: Record<string, unknown>): Response {
  return json({ errore: messaggio, ...extra }, status);
}
