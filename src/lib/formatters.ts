/**
 * Formattazione dei dati — docs/DESIGN_SYSTEM.md §7.
 *
 * Tutto in locale `it-IT`. Il valore assente si scrive sempre `—`, mai stringa
 * vuota e mai "N/D": in tabella una cella vuota si legge come un errore di
 * caricamento, un trattino si legge come "non c'è".
 */

const EUR_INTERI = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const EUR_DECIMALI = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Importo in euro. Il default ha i CENTESIMI, al contrario di Telebi che
 * arrotonda: Telebi mostra volumi di produzione, qui si mostrano preventivi e
 * fatture al cliente, e un preventivo di € 1.240,50 non si arrotonda.
 * `interi: true` per i riepiloghi dove i centesimi sono rumore.
 */
export function formatCurrency(
  value: number | null | undefined,
  opts: { interi?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return (opts.interi ? EUR_INTERI : EUR_DECIMALI).format(value);
}

export function formatNumber(value: number | null | undefined, decimali = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimali = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, decimali)}%`;
}

/** Ore in formato "6,5 h". Mezz'ore e quarti d'ora sono la norma sui rapportini. */
export function formatOre(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} h`;
}

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** "08/05/2026" — il formato per le celle di tabella e i campi. */
export function formatData(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "08 mag '26" — più corto, per le liste dense. */
export function formatDataBreve(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  return (
    dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) +
    " '" +
    String(dt.getFullYear()).slice(-2)
  );
}

/** "8 maggio 2026" — per le testate di dettaglio, dove c'è spazio. */
export function formatDataEstesa(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return '—';
  return dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Giorni fra oggi e una data: negativo = passata. Serve allo scadenzario e
 * alle commesse in arrivo. Confronta le date a mezzanotte, altrimenti "oggi"
 * diventa -1 giorno appena passa l'ora della scadenza.
 */
export function giorniDaOggi(d: Date | string | null | undefined): number | null {
  const dt = toDate(d);
  if (!dt) return null;
  const a = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const oggi = new Date();
  const b = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
