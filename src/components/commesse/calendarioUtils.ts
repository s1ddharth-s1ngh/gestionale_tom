/**
 * I conti del calendario, separati dal componente che li disegna.
 *
 * Stanno in un file loro per due motivi. Il primo è pratico: `CommesseList` ha
 * bisogno di `finestraDelMese` per costruire la query, e importarla da un file
 * di componenti significa tirarsi dentro il componente per usare una funzione.
 * Il secondo è che sono aritmetica pura — date dentro, date fuori — e
 * l'aritmetica si legge meglio lontano dal JSX.
 */

/**
 * ISO `AAAA-MM-GG` di una data LOCALE.
 *
 * Non `toISOString()`: quello converte in UTC, e in Italia una data a mezzanotte
 * torna indietro di un giorno per tutta l'ora legale. Il calendario mostrerebbe
 * le commesse del giorno prima, e nessuno sospetterebbe il fuso.
 */
export function isoLocale(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const gg = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${gg}`;
}

/** Il lunedì della settimana che contiene `d`. Domenica appartiene alla
 *  settimana che finisce, non a quella che comincia. */
function lunediDi(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // 0 = lunedì
  out.setDate(out.getDate() - dow);
  out.setHours(12, 0, 0, 0);
  return out;
}

/**
 * Le 42 caselle della griglia: sei settimane SEMPRE, anche quando il mese ne
 * occupa cinque. Una griglia che cambia altezza a ogni cambio di mese fa
 * saltare in su e in giù tutto quello che le sta sotto.
 */
export function caselleDelMese(anno: number, mese: number): Date[] {
  const inizio = lunediDi(new Date(anno, mese, 1));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inizio);
    d.setDate(inizio.getDate() + i);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}

/**
 * Primo e ultimo giorno delle 42 caselle: è la finestra da chiedere al service.
 *
 * Sono gli estremi della GRIGLIA e non del mese, perché le celle di coda
 * mostrano giorni del mese prima e del mese dopo: chiedere solo il mese
 * lascerebbe vuote delle celle che invece hanno lavoro dentro.
 */
export function finestraDelMese(anno: number, mese: number): { dal: string; al: string } {
  const caselle = caselleDelMese(anno, mese);
  return { dal: isoLocale(caselle[0]), al: isoLocale(caselle[41]) };
}
