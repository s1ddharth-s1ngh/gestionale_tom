import { clientAmministratore, errore, ok, preflight } from '../_shared/risposta.ts';

/**
 * Il promemoria delle scadenze passive: cosa c'è da pagare, e cosa è già in
 * ritardo.
 *
 * **Questa è una edge function per un motivo vero**, a differenza di un
 * riepilogo qualsiasi: manda una email, quindi serve la chiave del servizio di
 * posta. Una chiave in un'app che gira nel browser è una chiave pubblica, e
 * chiunque apra gli strumenti per sviluppatori può mandare posta a nome di Tom.
 *
 * Gira a orario, non a richiesta — si programma con pg_cron oppure con lo
 * scheduler di Supabase (vedi supabase/functions/README.md).
 *
 * Contratto:  POST { giorniPreavviso?: number, aSecco?: boolean }
 *             → 200 { scadute, inScadenza, inviata }
 *
 * `aSecco: true` calcola e restituisce senza spedire: è il modo di provarla
 * senza riempire la casella di Tom durante lo sviluppo.
 */

/** Giorni di preavviso di default: una settimana è il tempo che serve a fare
 *  un bonifico senza correre, ed è la stessa soglia di `GIORNI_URGENZA` lato app. */
const PREAVVISO_DEFAULT = 7;

interface RigaScadenza {
  id: string;
  numero: string;
  fornitore_denominazione: string;
  data_scadenza: string;
  residuo: number;
}

/** Formatta in euro all'italiana. `Intl` c'è anche in Deno: nessuna dipendenza. */
const eur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const data = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );

function corpoEmail(scadute: RigaScadenza[], inScadenza: RigaScadenza[]): string {
  const riga = (f: RigaScadenza) =>
    `<tr>
       <td style="padding:6px 12px 6px 0">${f.fornitore_denominazione}</td>
       <td style="padding:6px 12px 6px 0;color:#666">${f.numero}</td>
       <td style="padding:6px 12px 6px 0">${data(f.data_scadenza)}</td>
       <td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums">${eur(f.residuo)}</td>
     </tr>`;

  const sezione = (titolo: string, righe: RigaScadenza[], colore: string) =>
    righe.length === 0
      ? ''
      : `<h3 style="color:${colore};font-family:sans-serif;margin:24px 0 8px">${titolo}</h3>
         <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
           ${righe.map(riga).join('')}
         </table>`;

  const totale = [...scadute, ...inScadenza].reduce((t, f) => t + f.residuo, 0);

  return `<div style="font-family:sans-serif">
      <p>Situazione dei pagamenti ai fornitori.</p>
      ${sezione('Già scadute', scadute, '#c0392b')}
      ${sezione(`In scadenza entro ${PREAVVISO_DEFAULT} giorni`, inScadenza, '#b7791f')}
      <p style="margin-top:24px"><strong>Totale da pagare: ${eur(totale)}</strong></p>
    </div>`;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  let giorniPreavviso = PREAVVISO_DEFAULT;
  let aSecco = false;
  try {
    const corpo = await req.json().catch(() => ({}));
    giorniPreavviso = Number(corpo?.giorniPreavviso ?? PREAVVISO_DEFAULT);
    aSecco = corpo?.aSecco === true;
  } catch {
    // Un corpo assente è legittimo: quando la chiama il cron non manda niente.
  }

  try {
    const supabase = clientAmministratore();

    const limite = new Date();
    limite.setDate(limite.getDate() + giorniPreavviso);
    const oggi = new Date().toISOString().slice(0, 10);

    // Si legge dalla VISTA e non dalla tabella: residuo e stato sono derivati,
    // e ricalcolarli qui vorrebbe dire una seconda implementazione della stessa
    // regola che entro un mese risponde diverso da quella a schermo.
    const { data: righe, error } = await supabase
      .from('v_fatture_fornitore')
      .select('id, numero, fornitore_denominazione, data_scadenza, residuo')
      .gt('residuo', 0)
      .not('data_scadenza', 'is', null)
      .lte('data_scadenza', limite.toISOString().slice(0, 10))
      .order('data_scadenza', { ascending: true });

    if (error) return errore(`Lettura dello scadenzario: ${error.message}`, 500);

    const tutte = (righe ?? []) as RigaScadenza[];
    const scadute = tutte.filter((f) => f.data_scadenza < oggi);
    const inScadenza = tutte.filter((f) => f.data_scadenza >= oggi);

    // Niente da dire, nessuna email. Un promemoria che arriva ogni mattina
    // anche quando non c'è niente da pagare smette di essere letto entro una
    // settimana, e allora non protegge più nemmeno quando ha ragione.
    if (tutte.length === 0) {
      return ok({ scadute: 0, inScadenza: 0, inviata: false, motivo: 'niente da segnalare' });
    }

    const esito = { scadute: scadute.length, inScadenza: inScadenza.length };

    if (aSecco) {
      return ok({ ...esito, inviata: false, anteprima: corpoEmail(scadute, inScadenza) });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const destinatario = Deno.env.get('EMAIL_AMMINISTRAZIONE');

    // Senza i segreti la funzione NON fallisce: torna il conteggio e dice che
    // non ha spedito. Così è utilizzabile subito come endpoint di lettura, e la
    // posta si accende quando Tom decide qual è la sua casella.
    if (!apiKey || !destinatario) {
      return ok({
        ...esito,
        inviata: false,
        motivo: 'RESEND_API_KEY o EMAIL_AMMINISTRAZIONE non configurati',
      });
    }

    const risposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_MITTENTE') ?? 'gestionale@example.com',
        to: destinatario,
        subject:
          scadute.length > 0
            ? `${scadute.length} fatture fornitore scadute`
            : `${inScadenza.length} pagamenti in scadenza`,
        html: corpoEmail(scadute, inScadenza),
      }),
    });

    if (!risposta.ok) {
      return errore(`Invio email non riuscito: ${await risposta.text()}`, 502);
    }

    return ok({ ...esito, inviata: true });
  } catch (e) {
    return errore(e instanceof Error ? e.message : 'Errore imprevisto.', 500);
  }
});
