import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errore, json, rispondiPreflight } from '../_shared/cors.ts';

/**
 * Il riepilogo di cosa c'è da pagare: scadute, in scadenza, e il totale dovuto.
 *
 * Pensata per `pg_cron`, una volta al giorno. Il punto non è mostrare i numeri
 * — quelli li mostra già la pagina dello scadenzario — ma **andarli a cercare
 * quando nessuno ha l'app aperta**: una fattura scade anche il lunedì in cui
 * non si apre il gestionale, e il ritardo si accorge il mese dopo, sul sollecito.
 *
 * L'aggregazione la fa la vista `v_scadenzario_fornitori`, non questa funzione.
 * Una edge function che somma sarebbe un giro di rete in più per un lavoro che
 * il database fa meglio: qui si legge, si raggruppa per destinatario umano, e
 * si consegna.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Sotto questa soglia una scadenza è «imminente». Uguale a GIORNI_IMMINENTE
 *  nei tipi dell'app: due soglie diverse darebbero due elenchi diversi. */
const GIORNI_IMMINENTE = 7;

interface RigaScadenzario {
  id: string;
  numero: string;
  fornitore_denominazione: string;
  data_scadenza: string | null;
  totale: number;
  pagato: number;
  residuo: number;
  stato_effettivo: string;
  giorni_alla_scadenza: number | null;
  urgenza: string;
}

const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

Deno.serve(async (req: Request) => {
  const preflight = rispondiPreflight(req);
  if (preflight) return preflight;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data, error } = await supabase
    .from('v_scadenzario_fornitori')
    .select('*')
    .order('data_scadenza', { ascending: true });

  if (error) return errore(`Lettura scadenzario: ${error.message}`, 500);

  const righe = (data ?? []) as RigaScadenzario[];

  const scadute = righe.filter((r) => r.urgenza === 'scaduto');
  const imminenti = righe.filter(
    (r) =>
      r.urgenza === 'imminente' ||
      (r.giorni_alla_scadenza != null &&
        r.giorni_alla_scadenza >= 0 &&
        r.giorni_alla_scadenza <= GIORNI_IMMINENTE),
  );

  const somma = (r: RigaScadenzario[]) =>
    Math.round(r.reduce((t, x) => t + Number(x.residuo ?? 0), 0) * 100) / 100;

  const riepilogo = {
    totaleDovuto: somma(righe),
    scadute: { quante: scadute.length, importo: somma(scadute) },
    imminenti: { quante: imminenti.length, importo: somma(imminenti) },
  };

  /**
   * Il testo pronto da mandare.
   *
   * Si costruisce anche quando non c'è un canale di invio, e non è sprecato:
   * è la prova che i dati bastano a scrivere il messaggio, e il giorno che si
   * collega un provider non resta da inventare niente.
   */
  const righeTesto = [
    `Fornitori — situazione al ${new Date().toLocaleDateString('it-IT')}`,
    '',
    `Totale da pagare: ${euro(riepilogo.totaleDovuto)}`,
    `Scadute: ${scadute.length} per ${euro(riepilogo.scadute.importo)}`,
    `In scadenza entro ${GIORNI_IMMINENTE} giorni: ${imminenti.length} per ${euro(riepilogo.imminenti.importo)}`,
  ];

  if (scadute.length > 0) {
    righeTesto.push('', 'Già scadute:');
    for (const r of scadute.slice(0, 20)) {
      righeTesto.push(
        `  · ${r.fornitore_denominazione} — ${r.numero} — ${euro(Number(r.residuo))} ` +
          `(da ${Math.abs(r.giorni_alla_scadenza ?? 0)} giorni)`,
      );
    }
    // Un elenco che continua oltre venti righe non si legge: si dice quante
    // mancano invece di stamparle tutte.
    if (scadute.length > 20) righeTesto.push(`  … e altre ${scadute.length - 20}.`);
  }

  const messaggio = righeTesto.join('\n');

  // TODO(Omar): l'invio vero. Serve una chiave di un provider — Resend, Postmark,
  // l'SMTP che preferisci — messa fra i secret della funzione:
  //
  //   supabase secrets set RESEND_API_KEY=... DESTINATARIO_SCADENZE=omar@growe.dev
  //
  // Finché non c'è, la funzione restituisce il messaggio invece di spedirlo, e
  // lo dice nella risposta con `inviato: false`. Fingere un invio riuscito
  // sarebbe peggio che non averlo: nessuno andrebbe a cercare l'email mancante.
  const destinatario = Deno.env.get('DESTINATARIO_SCADENZE');
  const chiaveInvio = Deno.env.get('RESEND_API_KEY');
  const puoInviare = Boolean(destinatario && chiaveInvio);

  return json({
    riepilogo,
    scadute,
    imminenti,
    messaggio,
    inviato: false,
    // Detto esplicitamente, perché è la differenza fra «non c'era niente da
    // mandare» e «non c'era modo di mandarlo».
    motivoMancatoInvio: puoInviare
      ? 'Invio non ancora implementato: manca il collegamento al provider.'
      : 'Mancano i secret RESEND_API_KEY e DESTINATARIO_SCADENZE.',
  });
});
