import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compone classi Tailwind risolvendo i conflitti (l'ultima vince). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** pluralize(1, 'riga', 'righe') → 'riga'; pluralize(5, …) → 'righe'. */
export function pluralize(n: number, singular: string, plural: string): string {
  return Math.abs(n) === 1 ? singular : plural;
}

/**
 * Id per i record creati dai mock. `crypto.randomUUID` non c'è su http non
 * locale in qualche browser, quindi il fallback non è pignoleria.
 */
export function nuovoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Toglie accenti e maiuscole: serve a cercare "perù" digitando "peru". */
function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Match di ricerca su più campi: il termine passa se OGNI parola digitata
 * compare in almeno uno dei campi. Cercare "rossi bologna" trova il cliente
 * Rossi di Bologna anche se le due parole stanno in colonne diverse — con un
 * `includes` sull'intera stringa non lo troverebbe.
 */
export function matchesSearch(termine: string, ...campi: (string | null | undefined)[]): boolean {
  const parole = normalizza(termine).split(/\s+/).filter(Boolean);
  if (parole.length === 0) return true;
  const testo = campi.filter(Boolean).map((c) => normalizza(String(c))).join(' ');
  return parole.every((p) => testo.includes(p));
}
