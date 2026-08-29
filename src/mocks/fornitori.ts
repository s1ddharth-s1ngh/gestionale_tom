import type { Fornitore } from '@/types/costo';

/** Data ISO di N giorni fa: i mock non devono invecchiare. */
function giorni(n: number): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * I fornitori ricorrenti. Nessuno fuori dai service importa questo file.
 *
 * `categoriaPrevalente` non è una classificazione fiscale: serve al drawer dei
 * costi a proporre la categoria giusta appena si sceglie il fornitore.
 */
export const fornitoriMock: Fornitore[] = [
  {
    id: 'for-001',
    denominazione: 'Q8 — Stazione di servizio via Emilia Ponente',
    partitaIva: 'IT00891234567',
    categoriaPrevalente: 'carburante',
    telefono: '051 384112',
    indirizzo: {
      via: 'Via Emilia Ponente',
      civico: '218',
      cap: '40133',
      comune: 'Bologna',
      provincia: 'BO',
    },
    creatoIl: giorni(-320),
    aggiornatoIl: giorni(-14),
  },
  {
    id: 'for-002',
    denominazione: 'Eni Station — Casalecchio',
    partitaIva: 'IT00905553311',
    categoriaPrevalente: 'carburante',
    creatoIl: giorni(-300),
    aggiornatoIl: giorni(-9),
  },
  {
    id: 'for-003',
    denominazione: 'Noleggi Zanardi S.r.l. — piattaforme e sollevamento',
    partitaIva: 'IT02887410372',
    categoriaPrevalente: 'noleggio',
    telefono: '051 6140228',
    email: 'noleggi@zanardisollevamenti.it',
    indirizzo: {
      via: 'Via del Lavoro',
      civico: '44',
      cap: '40057',
      comune: 'Granarolo dell\'Emilia',
      provincia: 'BO',
    },
    note: 'Tariffa concordata sulla piattaforma 22 m: € 250 al giorno, trasporto escluso.',
    creatoIl: giorni(-280),
    aggiornatoIl: giorni(-21),
  },
  {
    id: 'for-004',
    denominazione: 'Ecoservizi Reno S.c.a r.l. — impianto di trattamento rifiuti vegetali',
    partitaIva: 'IT03114420376',
    categoriaPrevalente: 'smaltimento',
    telefono: '051 6789043',
    email: 'accettazione@ecoservizireno.it',
    indirizzo: {
      via: 'Via dell\'Industria',
      civico: '7/B',
      cap: '40012',
      comune: 'Calderara di Reno',
      provincia: 'BO',
    },
    note: 'Formulario obbligatorio a ogni conferimento. Chiudono alle 16:30.',
    creatoIl: giorni(-275),
    aggiornatoIl: giorni(-6),
  },
  {
    id: 'for-005',
    denominazione: 'Ferramenta Marchi & C. S.n.c.',
    partitaIva: 'IT01223340375',
    categoriaPrevalente: 'materiali',
    telefono: '051 271884',
    creatoIl: giorni(-260),
    aggiornatoIl: giorni(-3),
  },
  {
    id: 'for-006',
    denominazione: 'Agriforest Bologna — ricambi e attrezzatura forestale',
    partitaIva: 'IT02556710379',
    categoriaPrevalente: 'manutenzione',
    email: 'ricambi@agriforestbo.it',
    note: 'Catene, barre e ricambi Stihl. Assistenza sulle motoseghe in tre giorni.',
    creatoIl: giorni(-240),
    aggiornatoIl: giorni(-30),
  },
  {
    id: 'for-007',
    denominazione: 'Officina Autotrasporti Baldi',
    partitaIva: 'IT00778890370',
    categoriaPrevalente: 'manutenzione',
    telefono: '051 750129',
    creatoIl: giorni(-210),
    aggiornatoIl: giorni(-45),
  },
  {
    id: 'for-008',
    denominazione: 'Assicurazioni Generali — agenzia di Bologna Ovest',
    partitaIva: 'IT00079760328',
    categoriaPrevalente: 'assicurazione',
    email: 'agenzia.bolognaovest@generali.it',
    creatoIl: giorni(-190),
    aggiornatoIl: giorni(-60),
  },
  {
    // Un fornitore senza nessun costo: serve a vedere lo stato vuoto della
    // sua scheda, che altrimenti non si prova mai.
    id: 'for-009',
    denominazione: 'Vivai Corticella — piante e sementi',
    partitaIva: 'IT02001110376',
    categoriaPrevalente: 'materiali',
    creatoIl: giorni(-40),
    aggiornatoIl: giorni(-40),
  },
];
