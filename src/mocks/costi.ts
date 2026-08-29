import type { Costo } from '@/types/costo';

/**
 * Costi di esempio. Nessuno fuori da `costiService` importa questo file.
 *
 * Coprono tre mesi indietro perché i riepiloghi per categoria e per mezzo, su
 * due settimane di dati, mostrerebbero barre tutte uguali e non direbbero se
 * funzionano. Le date sono relative a oggi.
 */

/** Data di N giorni fa in ISO `AAAA-MM-GG`. */
function giorni(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type CostoMock = Omit<Costo, 'id' | 'creatoIl' | 'aggiornatoIl'>;

/** Le date di sistema seguono la data del costo: registrarlo il giorno dopo è
 *  il caso normale, e ripeterle a mano in quaranta oggetti è solo rumore. */
function costo(indice: number, base: CostoMock): Costo {
  return {
    ...base,
    id: `co-${String(indice).padStart(3, '0')}`,
    creatoIl: `${base.data}T18:00:00.000Z`,
    aggiornatoIl: `${base.data}T18:00:00.000Z`,
  };
}

const righe: CostoMock[] = [
  // ── Carburante: sempre con il mezzo, è il requisito del modulo ────────────
  { data: giorni(-2), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 118.4, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-001', litri: 82, documento: 'Scontrino 4471' },
  { data: giorni(-5), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 61.2, aliquotaIva: 22, fornitoreId: 'for-002', mezzoId: 'mz-002', litri: 42, documento: 'Scontrino 1180' },
  { data: giorni(-9), categoria: 'carburante', descrizione: 'Rifornimento gasolio piattaforma', importo: 74.5, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-003', litri: 51, commessaId: 'cm-002' },
  { data: giorni(-12), categoria: 'carburante', descrizione: 'Miscela per cippatrice', importo: 46.9, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-004', litri: 30 },
  { data: giorni(-16), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 132.7, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-001', litri: 91, documento: 'Scontrino 4288' },
  { data: giorni(-23), categoria: 'carburante', descrizione: 'Rifornimento gasolio trattore', importo: 187.3, aliquotaIva: 22, fornitoreId: 'for-002', mezzoId: 'mz-005', litri: 128, commessaId: 'cm-003' },
  { data: giorni(-29), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 109.8, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-001', litri: 76 },
  { data: giorni(-37), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 58.6, aliquotaIva: 22, fornitoreId: 'for-002', mezzoId: 'mz-002', litri: 40 },
  { data: giorni(-44), categoria: 'carburante', descrizione: 'Rifornimento gasolio piattaforma', importo: 96.4, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-003', litri: 66 },
  { data: giorni(-58), categoria: 'carburante', descrizione: 'Rifornimento gasolio', importo: 124.1, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-001', litri: 85 },
  { data: giorni(-71), categoria: 'carburante', descrizione: 'Miscela per motoseghe e soffiatori', importo: 38.2, aliquotaIva: 22, fornitoreId: 'for-001', mezzoId: 'mz-004', litri: 24 },

  // ── Noleggi: sempre con il tipo, quasi sempre imputati ────────────────────
  { data: giorni(-30), categoria: 'noleggio', descrizione: 'Piattaforma aerea 22 m, due giornate', importo: 500, aliquotaIva: 22, fornitoreId: 'for-003', tipoNoleggio: 'piattaforma', commessaId: 'cm-002', documento: 'FT 2026/318' },
  { data: giorni(-14), categoria: 'noleggio', descrizione: 'Piattaforma aerea 18 m, una giornata', importo: 230, aliquotaIva: 22, fornitoreId: 'for-003', tipoNoleggio: 'piattaforma', commessaId: 'cm-004', documento: 'FT 2026/402' },
  { data: giorni(-47), categoria: 'noleggio', descrizione: 'Autogru per rimozione alberatura caduta', importo: 780, aliquotaIva: 22, fornitoreId: 'for-003', tipoNoleggio: 'gru', documento: 'FT 2026/271' },
  { data: giorni(-62), categoria: 'noleggio', descrizione: 'Cippatrice da 25 cm, noleggio settimanale', importo: 640, aliquotaIva: 22, fornitoreId: 'for-003', tipoNoleggio: 'cippatrice', commessaId: 'cm-003' },
  { data: giorni(-8), categoria: 'noleggio', descrizione: 'Autocarro con ribaltabile, sostituzione durante il fermo officina', importo: 190, aliquotaIva: 22, fornitoreId: 'for-003', tipoNoleggio: 'autocarro' },

  // ── Smaltimenti ───────────────────────────────────────────────────────────
  { data: giorni(-6), categoria: 'smaltimento', descrizione: 'Conferimento ramaglia, 3,2 t — formulario 4471/A', importo: 208, aliquotaIva: 22, fornitoreId: 'for-004', commessaId: 'cm-004', documento: 'FIR 4471/A' },
  { data: giorni(-28), categoria: 'smaltimento', descrizione: 'Conferimento ceppaie e legname, 5,8 t', importo: 412, aliquotaIva: 22, fornitoreId: 'for-004', commessaId: 'cm-002', documento: 'FIR 4390/A' },
  { data: giorni(-41), categoria: 'smaltimento', descrizione: 'Conferimento verde, 2,1 t', importo: 136, aliquotaIva: 22, fornitoreId: 'for-004' },
  { data: giorni(-66), categoria: 'smaltimento', descrizione: 'Conferimento verde e terra di risulta', importo: 289, aliquotaIva: 22, fornitoreId: 'for-004', documento: 'FIR 4102/A' },

  // ── Materiali ─────────────────────────────────────────────────────────────
  { data: giorni(-3), categoria: 'materiali', descrizione: 'Corda da arrampicata 11 mm, 60 m', importo: 214, aliquotaIva: 22, fornitoreId: 'for-006' },
  { data: giorni(-11), categoria: 'materiali', descrizione: 'Mastice cicatrizzante e nastro di segnalazione', importo: 47.3, aliquotaIva: 22, fornitoreId: 'for-005' },
  { data: giorni(-19), categoria: 'materiali', descrizione: 'Tiranti dinamici per consolidamento, kit da 2', importo: 386, aliquotaIva: 22, fornitoreId: 'for-006', commessaId: 'cm-009' },
  { data: giorni(-33), categoria: 'materiali', descrizione: 'Sacchi per ramaglia e teli da cantiere', importo: 88.5, aliquotaIva: 22, fornitoreId: 'for-005' },
  { data: giorni(-52), categoria: 'materiali', descrizione: 'Concime a lenta cessione, 4 sacchi da 25 kg', importo: 168, aliquotaIva: 22, fornitoreId: 'for-005', commessaId: 'cm-007' },
  { data: giorni(-77), categoria: 'materiali', descrizione: 'Dispositivi di protezione: due caschi e visiere di ricambio', importo: 276, aliquotaIva: 22, fornitoreId: 'for-006' },

  // ── Manutenzione ──────────────────────────────────────────────────────────
  { data: giorni(-7), categoria: 'manutenzione', descrizione: 'Tagliando e revisione idraulica della piattaforma', importo: 540, aliquotaIva: 22, fornitoreId: 'for-007', mezzoId: 'mz-003', documento: 'FT 2026/91' },
  { data: giorni(-18), categoria: 'manutenzione', descrizione: 'Catene, barre e affilatura motoseghe', importo: 162.4, aliquotaIva: 22, fornitoreId: 'for-006' },
  { data: giorni(-26), categoria: 'manutenzione', descrizione: 'Sostituzione frizione autocarro', importo: 1_240, aliquotaIva: 22, fornitoreId: 'for-007', mezzoId: 'mz-001', documento: 'FT 2026/78', note: 'Mezzo fermo tre giorni: nel periodo si è noleggiato un ribaltabile.' },
  { data: giorni(-54), categoria: 'manutenzione', descrizione: 'Cambio olio e filtri trattore', importo: 218, aliquotaIva: 22, fornitoreId: 'for-007', mezzoId: 'mz-005' },
  { data: giorni(-80), categoria: 'manutenzione', descrizione: 'Sostituzione coltelli della cippatrice', importo: 395, aliquotaIva: 22, fornitoreId: 'for-006', mezzoId: 'mz-004' },

  // ── Assicurazioni e personale: costi generali, mai imputati ───────────────
  { data: giorni(-21), categoria: 'assicurazione', descrizione: 'RCA autocarro, rata semestrale', importo: 684, fornitoreId: 'for-008', mezzoId: 'mz-001', documento: 'Polizza 77120944' },
  { data: giorni(-21), categoria: 'assicurazione', descrizione: 'RC professionale, rata annuale', importo: 1_450, fornitoreId: 'for-008' },
  { data: giorni(-49), categoria: 'assicurazione', descrizione: 'RCA piattaforma semovente', importo: 412, fornitoreId: 'for-008', mezzoId: 'mz-003' },
  { data: giorni(-35), categoria: 'personale', descrizione: 'Corso di aggiornamento tree climbing, due operatori', importo: 640, aliquotaIva: 22 },
  { data: giorni(-63), categoria: 'personale', descrizione: 'Visite mediche periodiche', importo: 285 },
  { data: giorni(-15), categoria: 'altro', descrizione: 'Pedaggi e parcheggi del mese', importo: 96.8 },
  { data: giorni(-45), categoria: 'altro', descrizione: 'Quota associativa di categoria', importo: 340 },
];

export const costiMock: Costo[] = righe.map((r, i) => costo(i + 1, r));
