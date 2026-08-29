import type { Foto } from '@/types/comune';
import type { Preventivo, RigaPreventivo } from '@/types/preventivo';
import { calcolaImporto, calcolaTotali } from '@/types/preventivo';

/**
 * Preventivi di esempio. Sostituiti da una fetch il giorno che arriva il
 * backend: nessuno fuori da `preventiviService` importa questo file.
 *
 * Le date sono TUTTE relative a oggi, così i mock non invecchiano: un elenco in
 * cui il preventivo più recente è dell'anno scorso fa sembrare rotta l'app
 * invece che vecchi i dati. Vale soprattutto qui, dove `scaduto` si DERIVA da
 * `validoFino`: con date fisse, dopo qualche mese sarebbero scaduti tutti e la
 * pill «Inviati» resterebbe vuota per sempre.
 */

/** Data di N giorni fa (negativo) o fra N giorni (positivo), in ISO `AAAA-MM-GG`. */
function giorni(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // mezzogiorno: così il fuso non sposta il giorno all'indietro
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Come sopra ma con l'ora: serve a `creatoIl`, `aggiornatoIl` e alle foto. */
function istante(n: number): string {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * I riferimenti alle altre entità stanno tutti qui, non sparsi nei preventivi:
 * quando l'anagrafica clienti fissa i suoi id, si riallinea questo blocco e
 * basta. Gli stessi identificativi sono usati da `mocks/commesse.ts`, ed è
 * voluto — è quello che rende vero il legame preventivo → commessa.
 */
const CLI = {
  condominioBattisti: { id: 'cli-01', luogo: 'lgo-01-1' },
  comuneCasalecchio: { id: 'cli-02', luogo: 'lgo-02-1' },
  comuneCasalecchioParco: { id: 'cli-02', luogo: 'lgo-02-2' },
  agricolaFerrari: { id: 'cli-03', luogo: 'lgo-03-1' },
  villaMonteveglio: { id: 'cli-04', luogo: 'lgo-04-1' },
  condominioLeQuerce: { id: 'cli-05', luogo: 'lgo-05-1' },
  hotelSanLuca: { id: 'cli-06', luogo: 'lgo-06-1' },
  parrocchiaSantAgata: { id: 'cli-07', luogo: 'lgo-07-1' },
  gandolfiPrivato: { id: 'cli-08', luogo: 'lgo-08-1' },
  logisticaEmiliana: { id: 'cli-09', luogo: 'lgo-09-1' },
} as const;

/**
 * Foto finta come `data:` URI, mai un URL esterno.
 *
 * Un URL remoto offline diventa un riquadro rotto, e la schermata sembra
 * sbagliata quando invece funziona. È un SVG e non un PNG di un pixel perché
 * un pixel stirato è una macchia di colore: così invece si legge la didascalia,
 * e chi guarda capisce al volo che è un segnaposto e non una foto persa.
 */
function foto(id: string, didascalia: string, tinta: string, quando: number): Foto {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">` +
    `<rect width="640" height="480" fill="${tinta}"/>` +
    `<text x="320" y="240" font-family="sans-serif" font-size="26" fill="#ffffff" ` +
    `text-anchor="middle" dominant-baseline="middle">${didascalia}</text>` +
    `</svg>`;
  return {
    id,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    didascalia,
    caricataIl: istante(quando),
  };
}

const ANNO = new Date().getFullYear();
const num = (n: number) => `PR-${ANNO}-${String(n).padStart(4, '0')}`;

/**
 * Costruisce il preventivo calcolando importi e totali dalle righe: così i mock
 * non possono mentire. Un totale scritto a mano che non torna con le sue righe
 * è il bug che si scopre in demo, davanti al cliente.
 */
function preventivo(
  base: Omit<Preventivo, 'imponibile' | 'totale' | 'righe'> & {
    righe: Omit<RigaPreventivo, 'id' | 'importo'>[];
  },
): Preventivo {
  const righe: RigaPreventivo[] = base.righe.map((r, i) => ({
    ...r,
    id: `${base.id}-r${String(i + 1).padStart(2, '0')}`,
    importo: calcolaImporto(r),
  }));
  const { imponibile, totale } = calcolaTotali(righe, base.aliquotaIva);
  return { ...base, righe, imponibile, totale };
}

export const preventiviMock: Preventivo[] = [
  // ── Bozze ───────────────────────────────────────────────────────────────────
  preventivo({
    id: 'pr-001',
    numero: num(1),
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'bozza',
    dataEmissione: giorni(-2),
    validoFino: giorni(28),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-3),
      foto: [foto('ft-001', 'Cedro lato nord, vista dal cortile', '#2f4f3a', -3)],
      alberi: [
        {
          id: 'ra-001',
          specie: "Cedro dell'Atlante",
          altezzaM: 16,
          diametroCm: 72,
          quantita: 1,
          lavorazione: 'abbattimento',
          note: 'Inclinato verso il fabbricato, capitozzature vecchie sul lato sud.',
        },
      ],
      accessibilita: 'difficile',
      criticita: ['vicinanza_edifici', 'cavi_elettrici'],
      noteTecniche:
        'Cortile interno stretto: la piattaforma non entra, si lavora in tree climbing con calata controllata.',
    },
    righe: [
      {
        descrizione: 'Abbattimento in tree climbing con calata controllata dei toppi',
        quantita: 1,
        unita: 'corpo',
        prezzoUnitario: 1450,
      },
      { descrizione: 'Cippatura della ramaglia e carico', quantita: 6, unita: 'ore', prezzoUnitario: 45 },
      { descrizione: 'Smaltimento in impianto autorizzato', quantita: 1, unita: 'corpo', prezzoUnitario: 180 },
    ],
    note: 'In attesa che l’amministratore confermi la delibera assembleare.',
    creatoIl: istante(-2),
    aggiornatoIl: istante(-1),
  }),

  // Zero righe: il preventivo appena aperto dopo il sopralluogo. Serve a vedere
  // che il riepilogo totali regga il caso vuoto invece di mostrare NaN.
  preventivo({
    id: 'pr-002',
    numero: num(2),
    clienteId: CLI.gandolfiPrivato.id,
    luogoInterventoId: CLI.gandolfiPrivato.luogo,
    stato: 'bozza',
    dataEmissione: giorni(0),
    validoFino: giorni(30),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(0),
      foto: [],
      alberi: [],
      accessibilita: 'facile',
      criticita: [],
      noteTecniche: 'Sopralluogo fatto stamattina, righe ancora da comporre.',
    },
    righe: [],
    creatoIl: istante(0),
    aggiornatoIl: istante(0),
  }),

  preventivo({
    id: 'pr-008',
    numero: num(8),
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'bozza',
    dataEmissione: giorni(-5),
    validoFino: giorni(25),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-6),
      foto: [],
      alberi: [
        {
          id: 'ra-008',
          specie: 'Magnolia',
          altezzaM: 9,
          diametroCm: 38,
          quantita: 2,
          lavorazione: 'potatura',
        },
      ],
      accessibilita: 'facile',
      criticita: ['presenza_pubblico'],
      noteTecniche: 'Lavorare prima delle 10, la terrazza colazioni è sotto le chiome.',
    },
    righe: [
      { descrizione: 'Potatura di rimonda su due magnolie', quantita: 8, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Raccolta e smaltimento del materiale di risulta', quantita: 1, unita: 'corpo', prezzoUnitario: 140 },
    ],
    creatoIl: istante(-5),
    aggiornatoIl: istante(-5),
  }),

  // Dodici righe: è il preventivo che sforza il layout della tabella e del
  // riepilogo. Un modulo che regge solo tre righe si scopre tardi.
  preventivo({
    id: 'pr-014',
    numero: num(14),
    clienteId: CLI.agricolaFerrari.id,
    luogoInterventoId: CLI.agricolaFerrari.luogo,
    stato: 'bozza',
    dataEmissione: giorni(-4),
    validoFino: giorni(26),
    aliquotaIva: 10,
    sopralluogo: {
      dataSopralluogo: giorni(-7),
      foto: [
        foto('ft-014a', 'Filare est, robinie sul confine', '#3a4a2a', -7),
        foto('ft-014b', 'Capezzagna da ripristinare', '#4a412a', -7),
      ],
      alberi: [
        { id: 'ra-014a', specie: 'Robinia', altezzaM: 14, diametroCm: 42, quantita: 9, lavorazione: 'abbattimento' },
        { id: 'ra-014b', specie: 'Pioppo cipressino', altezzaM: 18, diametroCm: 46, quantita: 4, lavorazione: 'messa_in_sicurezza' },
        { id: 'ra-014c', specie: 'Nocciolo', altezzaM: 4, diametroCm: 12, quantita: 120, lavorazione: 'potatura' },
      ],
      accessibilita: 'media',
      criticita: ['pendenza', 'accesso_difficile'],
      noteTecniche:
        'Intervento su più giornate. Il fondo regge i mezzi solo a terreno asciutto: da rimandare dopo le piogge.',
    },
    righe: [
      { descrizione: 'Abbattimento di nove robinie sul confine ferroviario', quantita: 16, unita: 'ore', prezzoUnitario: 45 },
      { descrizione: 'Sezionamento e accatastamento dei fusti', quantita: 8, unita: 'ore', prezzoUnitario: 40 },
      { descrizione: 'Fresatura delle ceppaie', quantita: 9, unita: 'nr', prezzoUnitario: 65 },
      { descrizione: 'Messa in sicurezza di quattro pioppi cipressini', quantita: 12, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Potatura di produzione del noccioleto', quantita: 2.4, unita: 'mq', prezzoUnitario: 780 },
      { descrizione: 'Trinciatura dei residui di potatura', quantita: 10, unita: 'ore', prezzoUnitario: 42 },
      { descrizione: 'Ripristino della capezzagna con livellatrice', quantita: 12, unita: 'ore', prezzoUnitario: 55 },
      { descrizione: 'Noleggio trincia forestale', quantita: 3, unita: 'nr', prezzoUnitario: 220 },
      { descrizione: 'Carburante e consumabili di cantiere', quantita: 1, unita: 'corpo', prezzoUnitario: 340 },
      { descrizione: 'Trasporto mezzi andata e ritorno', quantita: 64, unita: 'km', prezzoUnitario: 1.4 },
      { descrizione: 'Smaltimento del legname non recuperabile', quantita: 4200, unita: 'kg', prezzoUnitario: 0.12 },
      { descrizione: 'Sconto per intervento su più giornate consecutive', quantita: 1, unita: 'corpo', prezzoUnitario: -650 },
    ],
    note: 'Sconto a totale scritto come riga negativa: il totale resta la somma delle righe, sempre.',
    creatoIl: istante(-4),
    aggiornatoIl: istante(-1),
  }),

  preventivo({
    id: 'pr-022',
    numero: num(22),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'bozza',
    dataEmissione: giorni(-1),
    validoFino: giorni(29),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-1),
      foto: [],
      alberi: [],
      accessibilita: 'facile',
      criticita: ['traffico'],
      noteTecniche: 'Area logistica: gilet alta visibilità obbligatorio, accesso dal varco 3.',
      },
    righe: [
      { descrizione: 'Diserbo meccanico lungo la recinzione perimetrale', quantita: 900, unita: 'mq', prezzoUnitario: 0.9 },
    ],
    creatoIl: istante(-1),
    aggiornatoIl: istante(-1),
  }),

  // Descrizione lunghissima su una riga sola: serve a vedere se la tabella
  // tronca o sfonda. È il caso che in demo capita sempre.
  preventivo({
    id: 'pr-028',
    numero: num(28),
    clienteId: CLI.comuneCasalecchioParco.id,
    luogoInterventoId: CLI.comuneCasalecchioParco.luogo,
    stato: 'bozza',
    dataEmissione: giorni(-3),
    validoFino: giorni(27),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-4),
      foto: [foto('ft-028', 'Viale principale del parco', '#2a3f4a', -4)],
      alberi: [
        { id: 'ra-028', specie: 'Ippocastano', altezzaM: 13, diametroCm: 55, quantita: 18, lavorazione: 'vta' },
      ],
      accessibilita: 'media',
      criticita: ['presenza_pubblico', 'vicinanza_edifici'],
    },
    righe: [
      {
        descrizione:
          'Valutazione di stabilità VTA su diciotto ippocastani del viale principale, comprensiva di schedatura fotografica, rilievo dendrometrico, prova strumentale con martello a impulsi sui soggetti classificati in classe C e relazione tecnica firmata da agronomo abilitato per il deposito in Comune',
        quantita: 18,
        unita: 'nr',
        prezzoUnitario: 95,
      },
      { descrizione: 'Relazione agronomica e deposito pratica', quantita: 1, unita: 'corpo', prezzoUnitario: 420 },
    ],
    creatoIl: istante(-3),
    aggiornatoIl: istante(-2),
  }),

  // ── Inviati, ancora validi ──────────────────────────────────────────────────
  preventivo({
    id: 'pr-003',
    numero: num(3),
    clienteId: CLI.comuneCasalecchioParco.id,
    luogoInterventoId: CLI.comuneCasalecchioParco.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-12),
    validoFino: giorni(18),
    dataInvio: giorni(-11),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-14),
      foto: [foto('ft-003', 'Area giochi, alberature perimetrali', '#33452f', -14)],
      alberi: [
        { id: 'ra-003', specie: 'Platano', altezzaM: 17, diametroCm: 68, quantita: 6, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: ['presenza_pubblico'],
      noteTecniche: 'Chiusura dell’area giochi per la durata del cantiere, concordata con l’ufficio verde.',
    },
    righe: [
      { descrizione: 'Potatura di sicurezza su sei platani con piattaforma aerea', quantita: 24, unita: 'ore', prezzoUnitario: 52 },
      { descrizione: 'Noleggio piattaforma aerea 22 m', quantita: 3, unita: 'nr', prezzoUnitario: 280 },
      { descrizione: 'Cippatura e smaltimento della ramaglia', quantita: 1, unita: 'corpo', prezzoUnitario: 340 },
    ],
    creatoIl: istante(-12),
    aggiornatoIl: istante(-11),
  }),

  preventivo({
    id: 'pr-010',
    numero: num(10),
    clienteId: CLI.villaMonteveglio.id,
    luogoInterventoId: CLI.villaMonteveglio.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-8),
    validoFino: giorni(22),
    dataInvio: giorni(-8),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-10),
      foto: [
        foto('ft-010a', 'Filare di cipressi lungo il viale', '#2e3f2c', -10),
        foto('ft-010b', 'Cipresso n. 3, seccume in chioma', '#3c4a30', -10),
      ],
      alberi: [
        { id: 'ra-010', specie: 'Cipresso comune', altezzaM: 12, diametroCm: 34, quantita: 11, lavorazione: 'rimonda_secco' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Rimonda del secco su undici cipressi del viale', quantita: 18, unita: 'ore', prezzoUnitario: 46 },
      { descrizione: 'Trattamento contro il cancro corticale', quantita: 11, unita: 'nr', prezzoUnitario: 28 },
      { descrizione: 'Raccolta e smaltimento', quantita: 1, unita: 'corpo', prezzoUnitario: 190 },
    ],
    creatoIl: istante(-8),
    aggiornatoIl: istante(-8),
  }),

  preventivo({
    id: 'pr-016',
    numero: num(16),
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-6),
    validoFino: giorni(24),
    dataInvio: giorni(-6),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-9),
      foto: [],
      alberi: [
        { id: 'ra-016', specie: 'Tiglio', altezzaM: 11, diametroCm: 40, quantita: 4, lavorazione: 'rimonda_secco' },
      ],
      accessibilita: 'media',
      criticita: ['vicinanza_edifici'],
    },
    righe: [
      { descrizione: 'Rimonda del secco su quattro tigli del cortile', quantita: 12, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Cippatura in loco', quantita: 4, unita: 'ore', prezzoUnitario: 42 },
    ],
    creatoIl: istante(-6),
    aggiornatoIl: istante(-6),
  }),

  preventivo({
    id: 'pr-023',
    numero: num(23),
    clienteId: CLI.condominioLeQuerce.id,
    luogoInterventoId: CLI.condominioLeQuerce.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-15),
    validoFino: giorni(15),
    dataInvio: giorni(-14),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-17),
      foto: [foto('ft-023', 'Siepe di lauroceraso lato parcheggio', '#31462f', -17)],
      alberi: [
        { id: 'ra-023', specie: 'Lauroceraso', altezzaM: 3, diametroCm: 8, quantita: 80, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Potatura di contenimento della siepe (80 m lineari)', quantita: 14, unita: 'ore', prezzoUnitario: 40 },
      { descrizione: 'Raccolta e smaltimento del materiale di risulta', quantita: 1, unita: 'corpo', prezzoUnitario: 160 },
    ],
    creatoIl: istante(-15),
    aggiornatoIl: istante(-14),
  }),

  // Scade fra tre giorni: è quello che deve saltare all'occhio in elenco.
  preventivo({
    id: 'pr-027',
    numero: num(27),
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-27),
    validoFino: giorni(3),
    dataInvio: giorni(-27),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-29),
      foto: [],
      alberi: [
        { id: 'ra-027', specie: 'Olivo', altezzaM: 4, diametroCm: 22, quantita: 14, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: ['presenza_pubblico'],
    },
    righe: [
      { descrizione: 'Potatura di formazione su quattordici olivi ornamentali', quantita: 16, unita: 'ore', prezzoUnitario: 44 },
      { descrizione: 'Concimazione e pacciamatura', quantita: 14, unita: 'nr', prezzoUnitario: 18 },
    ],
    note: 'Sollecitato telefonicamente, il direttore deve rispondere entro la settimana.',
    creatoIl: istante(-27),
    aggiornatoIl: istante(-4),
  }),

  // ── Inviati e ormai scaduti (stato DERIVATO, non salvato) ───────────────────
  preventivo({
    id: 'pr-006',
    numero: num(6),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-72),
    validoFino: giorni(-42),
    dataInvio: giorni(-71),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-74),
      foto: [],
      alberi: [
        { id: 'ra-006', specie: 'Ailanto', altezzaM: 10, diametroCm: 28, quantita: 22, lavorazione: 'abbattimento' },
      ],
      accessibilita: 'media',
      criticita: ['traffico'],
      noteTecniche: 'Ailanti infestanti lungo la recinzione: serve anche il devitalizzante sulle ceppaie.',
    },
    righe: [
      { descrizione: 'Abbattimento di ventidue ailanti infestanti', quantita: 20, unita: 'ore', prezzoUnitario: 45 },
      { descrizione: 'Devitalizzazione delle ceppaie', quantita: 22, unita: 'nr', prezzoUnitario: 22 },
      { descrizione: 'Cippatura e smaltimento', quantita: 1, unita: 'corpo', prezzoUnitario: 480 },
    ],
    note: 'Mai risposto. Da ripresentare aggiornato se il cliente si rifà vivo.',
    creatoIl: istante(-72),
    aggiornatoIl: istante(-71),
  }),

  preventivo({
    id: 'pr-013',
    numero: num(13),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-58),
    validoFino: giorni(-28),
    dataInvio: giorni(-58),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-60),
      foto: [],
      alberi: [],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Sfalcio straordinario delle aree verdi perimetrali', quantita: 3200, unita: 'mq', prezzoUnitario: 0.35 },
    ],
    creatoIl: istante(-58),
    aggiornatoIl: istante(-58),
  }),

  preventivo({
    id: 'pr-020',
    numero: num(20),
    clienteId: CLI.villaMonteveglio.id,
    luogoInterventoId: CLI.villaMonteveglio.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-95),
    validoFino: giorni(-65),
    dataInvio: giorni(-94),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-97),
      foto: [foto('ft-020', 'Laghetto, sponda ovest', '#2b3d46', -97)],
      alberi: [
        { id: 'ra-020', specie: 'Ontano nero', altezzaM: 8, diametroCm: 24, quantita: 6, lavorazione: 'potatura' },
      ],
      accessibilita: 'difficile',
      criticita: ['pendenza', 'accesso_difficile'],
    },
    righe: [
      { descrizione: 'Potatura degli ontani sulla sponda del laghetto', quantita: 10, unita: 'ore', prezzoUnitario: 50 },
      { descrizione: 'Rimozione della vegetazione infestante di sponda', quantita: 8, unita: 'ore', prezzoUnitario: 42 },
    ],
    creatoIl: istante(-95),
    aggiornatoIl: istante(-94),
  }),

  preventivo({
    id: 'pr-029',
    numero: num(29),
    clienteId: CLI.gandolfiPrivato.id,
    luogoInterventoId: CLI.gandolfiPrivato.luogo,
    stato: 'inviato',
    dataEmissione: giorni(-48),
    validoFino: giorni(-18),
    dataInvio: giorni(-48),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-50),
      foto: [],
      alberi: [
        { id: 'ra-029', specie: 'Betulla', altezzaM: 9, diametroCm: 26, quantita: 3, lavorazione: 'abbattimento' },
      ],
      accessibilita: 'media',
      criticita: ['vicinanza_edifici'],
    },
    righe: [
      { descrizione: 'Abbattimento di tre betulle deperienti', quantita: 8, unita: 'ore', prezzoUnitario: 46 },
      { descrizione: 'Fresatura delle ceppaie e ripristino del prato', quantita: 3, unita: 'nr', prezzoUnitario: 75 },
    ],
    note: 'Il cliente ha rimandato a dopo l’estate: da riemettere con prezzi aggiornati.',
    creatoIl: istante(-48),
    aggiornatoIl: istante(-48),
  }),

  // ── Accettati e già diventati commessa ──────────────────────────────────────
  // Gli id qui sotto sono quelli che `mocks/commesse.ts` referenzia in
  // `preventivoId`: cambiarli rompe il legame fra i due moduli.
  preventivo({
    id: 'pr-004',
    numero: num(4),
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-48),
    validoFino: giorni(-18),
    dataInvio: giorni(-47),
    dataEsito: giorni(-43),
    commessaId: 'cm-001',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-50),
      foto: [
        foto('ft-004a', 'Tigli del cortile prima dell’intervento', '#33452f', -50),
        foto('ft-004b', 'Ramaglia da cippare, lato portico', '#3f4630', -50),
      ],
      alberi: [
        { id: 'ra-004', specie: 'Tiglio', altezzaM: 11, diametroCm: 44, quantita: 4, lavorazione: 'rimonda_secco' },
      ],
      accessibilita: 'media',
      criticita: ['vicinanza_edifici'],
      noteTecniche: 'Accesso dal cortile interno, cancello aperto dal portiere alle 7:30.',
    },
    righe: [
      { descrizione: 'Potatura di rimonda del secco su quattro tigli', quantita: 10, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Cippatura e carico della ramaglia', quantita: 4, unita: 'ore', prezzoUnitario: 42 },
      { descrizione: 'Pulizia area e ripristino degli accessi', quantita: 2, unita: 'ore', prezzoUnitario: 35 },
    ],
    creatoIl: istante(-48),
    aggiornatoIl: istante(-43),
  }),

  preventivo({
    id: 'pr-007',
    numero: num(7),
    clienteId: CLI.comuneCasalecchio.id,
    luogoInterventoId: CLI.comuneCasalecchio.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-42),
    validoFino: giorni(-12),
    dataInvio: giorni(-41),
    dataEsito: giorni(-36),
    commessaId: 'cm-002',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-44),
      foto: [
        foto('ft-007a', 'Cedro di 18 m, vista da via Porrettana', '#2f4238', -44),
        foto('ft-007b', 'Colletto con carie estesa', '#4a3d2a', -44),
      ],
      alberi: [
        {
          id: 'ra-007',
          specie: "Cedro dell'Atlante",
          altezzaM: 18,
          diametroCm: 86,
          quantita: 1,
          lavorazione: 'abbattimento',
          note: 'Carie al colletto, classe di propensione al cedimento D.',
        },
      ],
      accessibilita: 'media',
      criticita: ['traffico', 'vicinanza_edifici', 'presenza_pubblico'],
      noteTecniche:
        'Serve la chiusura della strada, da concordare con la Polizia Locale. Piattaforma da 22 m per due giorni.',
    },
    righe: [
      { descrizione: "Abbattimento controllato di un cedro dell'Atlante di 18 m con piattaforma aerea", quantita: 16, unita: 'ore', prezzoUnitario: 55 },
      { descrizione: 'Sezionamento e allontanamento del fusto', quantita: 12, unita: 'ore', prezzoUnitario: 45 },
      { descrizione: 'Fresatura della ceppaia', quantita: 6, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Smaltimento in discarica autorizzata', quantita: 6, unita: 'ore', prezzoUnitario: 40 },
      { descrizione: 'Noleggio piattaforma aerea 22 m', quantita: 2, unita: 'nr', prezzoUnitario: 280 },
    ],
    creatoIl: istante(-42),
    aggiornatoIl: istante(-36),
  }),

  preventivo({
    id: 'pr-009',
    numero: num(9),
    clienteId: CLI.agricolaFerrari.id,
    luogoInterventoId: CLI.agricolaFerrari.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-26),
    validoFino: giorni(4),
    dataInvio: giorni(-25),
    dataEsito: giorni(-21),
    commessaId: 'cm-012',
    aliquotaIva: 10,
    sopralluogo: {
      dataSopralluogo: giorni(-28),
      foto: [foto('ft-009', 'Noccioleto, blocco sud', '#3a4a2a', -28)],
      alberi: [
        { id: 'ra-009', specie: 'Nocciolo', altezzaM: 4, diametroCm: 10, quantita: 240, lavorazione: 'potatura' },
      ],
      accessibilita: 'media',
      criticita: ['pendenza'],
      noteTecniche: 'Il fondo regge i mezzi solo asciutto.',
    },
    righe: [
      { descrizione: 'Trinciatura del noccioleto (2,4 ha)', quantita: 16, unita: 'ore', prezzoUnitario: 52 },
      { descrizione: 'Ripristino della capezzagna', quantita: 12, unita: 'ore', prezzoUnitario: 48 },
    ],
    creatoIl: istante(-26),
    aggiornatoIl: istante(-21),
  }),

  preventivo({
    id: 'pr-012',
    numero: num(12),
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-18),
    validoFino: giorni(12),
    dataInvio: giorni(-17),
    dataEsito: giorni(-11),
    commessaId: 'cm-004',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-20),
      foto: [foto('ft-012', 'Siepe di lauroceraso, lato piscina', '#31462f', -20)],
      alberi: [
        { id: 'ra-012a', specie: 'Lauroceraso', altezzaM: 3, diametroCm: 9, quantita: 140, lavorazione: 'potatura' },
        { id: 'ra-012b', specie: 'Pino domestico', altezzaM: 15, diametroCm: 58, quantita: 6, lavorazione: 'rimonda_secco' },
      ],
      accessibilita: 'facile',
      criticita: ['presenza_pubblico'],
      noteTecniche: 'Lavorare prima delle 10 per non disturbare la colazione degli ospiti.',
    },
    righe: [
      { descrizione: 'Potatura di contenimento della siepe di lauroceraso (140 m)', quantita: 10, unita: 'ore', prezzoUnitario: 42 },
      { descrizione: 'Rimonda del secco su sei pini domestici', quantita: 10, unita: 'ore', prezzoUnitario: 52 },
      { descrizione: 'Cippatura e smaltimento', quantita: 4, unita: 'ore', prezzoUnitario: 42 },
    ],
    creatoIl: istante(-18),
    aggiornatoIl: istante(-11),
  }),

  preventivo({
    id: 'pr-015',
    numero: num(15),
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-32),
    validoFino: giorni(-2),
    dataInvio: giorni(-31),
    dataEsito: giorni(-27),
    commessaId: 'cm-014',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-34),
      foto: [],
      alberi: [
        { id: 'ra-015', specie: 'Carpino bianco', altezzaM: 2, diametroCm: 6, quantita: 12, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Messa a dimora di dodici carpini in siepe', quantita: 8, unita: 'ore', prezzoUnitario: 40 },
      { descrizione: 'Fornitura piante in zolla, altezza 200/250', quantita: 12, unita: 'nr', prezzoUnitario: 68 },
      { descrizione: 'Ammendante e pacciamatura', quantita: 1, unita: 'corpo', prezzoUnitario: 130 },
    ],
    note: 'Commessa poi annullata dal cliente: rimandata alla stagione di piantagione autunnale.',
    creatoIl: istante(-32),
    aggiornatoIl: istante(-27),
  }),

  preventivo({
    id: 'pr-018',
    numero: num(18),
    clienteId: CLI.condominioLeQuerce.id,
    luogoInterventoId: CLI.condominioLeQuerce.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-16),
    validoFino: giorni(14),
    dataInvio: giorni(-15),
    dataEsito: giorni(-8),
    commessaId: 'cm-006',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-18),
      foto: [foto('ft-018', 'I due platani sul fronte strada', '#33452f', -18)],
      alberi: [
        { id: 'ra-018', specie: 'Platano', altezzaM: 16, diametroCm: 64, quantita: 2, lavorazione: 'potatura' },
      ],
      accessibilita: 'media',
      criticita: ['traffico', 'cavi_elettrici'],
      noteTecniche:
        'Serve l’occupazione di suolo pubblico. Linea elettrica aerea a 4 m dalla chioma: distanza di sicurezza da rispettare.',
    },
    righe: [
      { descrizione: 'Potatura di due platani con piattaforma aerea', quantita: 14, unita: 'ore', prezzoUnitario: 52 },
      { descrizione: 'Cippatura e smaltimento della ramaglia', quantita: 6, unita: 'ore', prezzoUnitario: 42 },
      { descrizione: 'Pratica di occupazione suolo pubblico', quantita: 1, unita: 'corpo', prezzoUnitario: 150 },
    ],
    creatoIl: istante(-16),
    aggiornatoIl: istante(-8),
  }),

  preventivo({
    id: 'pr-021',
    numero: num(21),
    clienteId: CLI.parrocchiaSantAgata.id,
    luogoInterventoId: CLI.parrocchiaSantAgata.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-14),
    validoFino: giorni(16),
    dataInvio: giorni(-13),
    dataEsito: giorni(-6),
    commessaId: 'cm-007',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-16),
      foto: [
        foto('ft-021a', 'Cipresso secolare, lato sagrato', '#2e3f2c', -16),
        foto('ft-021b', 'Codominanza con inclusione corticale', '#4a412a', -16),
      ],
      alberi: [
        {
          id: 'ra-021a',
          specie: 'Cipresso comune',
          altezzaM: 19,
          diametroCm: 78,
          quantita: 1,
          lavorazione: 'consolidamento',
          note: 'Codominanza con inclusione corticale a 6 m: tirante dinamico in cima ai due fusti.',
        },
        { id: 'ra-021b', specie: 'Cipresso comune', altezzaM: 15, diametroCm: 52, quantita: 4, lavorazione: 'vta' },
      ],
      accessibilita: 'facile',
      criticita: ['presenza_pubblico'],
    },
    righe: [
      { descrizione: 'Consolidamento con tirante dinamico su un cipresso secolare', quantita: 8, unita: 'ore', prezzoUnitario: 58 },
      { descrizione: 'Fornitura e posa del sistema di tiranteria', quantita: 1, unita: 'corpo', prezzoUnitario: 420 },
      { descrizione: 'Verifica visiva VTA sugli altri quattro cipressi del viale', quantita: 4, unita: 'ore', prezzoUnitario: 65 },
    ],
    creatoIl: istante(-14),
    aggiornatoIl: istante(-6),
  }),

  preventivo({
    id: 'pr-025',
    numero: num(25),
    clienteId: CLI.villaMonteveglio.id,
    luogoInterventoId: CLI.villaMonteveglio.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-10),
    validoFino: giorni(20),
    dataInvio: giorni(-9),
    dataEsito: giorni(-3),
    commessaId: 'cm-010',
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-12),
      foto: [foto('ft-025', 'Salice piangente inclinato sul laghetto', '#2b3d46', -12)],
      alberi: [
        {
          id: 'ra-025',
          specie: 'Salice piangente',
          altezzaM: 13,
          diametroCm: 66,
          quantita: 1,
          lavorazione: 'abbattimento',
          note: 'Pericolante sul laghetto, apparato radicale scalzato dalla sponda.',
        },
      ],
      accessibilita: 'difficile',
      criticita: ['accesso_difficile', 'pendenza'],
      noteTecniche: 'Cortile stretto: i mezzi grandi non passano, si lavora con minipala e calate.',
    },
    righe: [
      { descrizione: 'Abbattimento di un salice piangente pericolante sul laghetto', quantita: 12, unita: 'ore', prezzoUnitario: 55 },
      { descrizione: 'Fresatura della ceppaia e ripristino del prato', quantita: 6, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Trasporto e smaltimento', quantita: 1, unita: 'corpo', prezzoUnitario: 260 },
    ],
    creatoIl: istante(-10),
    aggiornatoIl: istante(-3),
  }),

  // ── Accettati, commessa ancora da creare ────────────────────────────────────
  // Sono quelli su cui si prova il dialog di conversione: hanno esito positivo
  // e nessun `commessaId`.
  preventivo({
    id: 'pr-017',
    numero: num(17),
    clienteId: CLI.gandolfiPrivato.id,
    luogoInterventoId: CLI.gandolfiPrivato.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-7),
    validoFino: giorni(23),
    dataInvio: giorni(-7),
    dataEsito: giorni(-2),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-9),
      foto: [foto('ft-017', 'Quercia in giardino, lato sud', '#33452f', -9)],
      alberi: [
        { id: 'ra-017', specie: 'Quercia farnia', altezzaM: 14, diametroCm: 58, quantita: 1, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Potatura di una quercia in giardino privato', quantita: 6, unita: 'ore', prezzoUnitario: 50 },
      { descrizione: 'Raccolta e smaltimento della ramaglia', quantita: 1, unita: 'corpo', prezzoUnitario: 120 },
    ],
    note: 'Accettato a voce, in attesa di generare la commessa.',
    creatoIl: istante(-7),
    aggiornatoIl: istante(-2),
  }),

  preventivo({
    id: 'pr-024',
    numero: num(24),
    clienteId: CLI.agricolaFerrari.id,
    luogoInterventoId: CLI.agricolaFerrari.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-5),
    validoFino: giorni(25),
    dataInvio: giorni(-5),
    dataEsito: giorni(-1),
    aliquotaIva: 10,
    sopralluogo: {
      dataSopralluogo: giorni(-6),
      foto: [],
      alberi: [
        { id: 'ra-024', specie: 'Pioppo cipressino', altezzaM: 20, diametroCm: 48, quantita: 8, lavorazione: 'messa_in_sicurezza' },
      ],
      accessibilita: 'media',
      criticita: ['pendenza'],
    },
    righe: [
      { descrizione: 'Messa in sicurezza del filare di pioppi lungo il fosso', quantita: 20, unita: 'ore', prezzoUnitario: 48 },
      { descrizione: 'Cippatura in campo', quantita: 8, unita: 'ore', prezzoUnitario: 42 },
    ],
    creatoIl: istante(-5),
    aggiornatoIl: istante(-1),
  }),

  preventivo({
    id: 'pr-030',
    numero: num(30),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'accettato',
    dataEmissione: giorni(-4),
    validoFino: giorni(26),
    dataInvio: giorni(-4),
    dataEsito: giorni(0),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-5),
      foto: [],
      alberi: [],
      accessibilita: 'facile',
      criticita: ['traffico'],
      noteTecniche: 'Gilet alta visibilità obbligatorio, accesso dal varco 3.',
    },
    righe: [
      { descrizione: 'Sfalcio delle aree verdi perimetrali del piazzale', quantita: 12, unita: 'ore', prezzoUnitario: 38 },
      { descrizione: 'Diserbo meccanico lungo la recinzione', quantita: 4, unita: 'ore', prezzoUnitario: 38 },
    ],
    note: 'Accettato stamattina via email.',
    creatoIl: istante(-4),
    aggiornatoIl: istante(0),
  }),

  // ── Rifiutati ───────────────────────────────────────────────────────────────
  preventivo({
    id: 'pr-005',
    numero: num(5),
    clienteId: CLI.condominioLeQuerce.id,
    luogoInterventoId: CLI.condominioLeQuerce.luogo,
    stato: 'rifiutato',
    dataEmissione: giorni(-64),
    validoFino: giorni(-34),
    dataInvio: giorni(-63),
    dataEsito: giorni(-55),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-66),
      foto: [],
      alberi: [
        { id: 'ra-005', specie: 'Ippocastano', altezzaM: 12, diametroCm: 50, quantita: 3, lavorazione: 'abbattimento' },
      ],
      accessibilita: 'media',
      criticita: ['vicinanza_edifici'],
    },
    righe: [
      { descrizione: 'Abbattimento di tre ippocastani deperienti', quantita: 18, unita: 'ore', prezzoUnitario: 50 },
      { descrizione: 'Fresatura delle ceppaie', quantita: 3, unita: 'nr', prezzoUnitario: 85 },
      { descrizione: 'Fornitura e messa a dimora di tre carpini sostitutivi', quantita: 3, unita: 'nr', prezzoUnitario: 190 },
    ],
    note: 'Assemblea contraria all’abbattimento: si è preferita la potatura di contenimento.',
    creatoIl: istante(-64),
    aggiornatoIl: istante(-55),
  }),

  preventivo({
    id: 'pr-011',
    numero: num(11),
    clienteId: CLI.parrocchiaSantAgata.id,
    luogoInterventoId: CLI.parrocchiaSantAgata.luogo,
    stato: 'rifiutato',
    dataEmissione: giorni(-52),
    validoFino: giorni(-22),
    dataInvio: giorni(-52),
    dataEsito: giorni(-45),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-54),
      foto: [],
      alberi: [
        { id: 'ra-011', specie: 'Tasso', altezzaM: 5, diametroCm: 20, quantita: 8, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Potatura topiaria degli otto tassi del chiostro', quantita: 14, unita: 'ore', prezzoUnitario: 46 },
    ],
    note: 'Rifiutato per budget: se ne riparla il prossimo anno pastorale.',
    creatoIl: istante(-52),
    aggiornatoIl: istante(-45),
  }),

  preventivo({
    id: 'pr-019',
    numero: num(19),
    clienteId: CLI.comuneCasalecchio.id,
    luogoInterventoId: CLI.comuneCasalecchio.luogo,
    stato: 'rifiutato',
    dataEmissione: giorni(-38),
    validoFino: giorni(-8),
    dataInvio: giorni(-37),
    dataEsito: giorni(-30),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-40),
      foto: [],
      alberi: [
        { id: 'ra-019', specie: 'Bagolaro', altezzaM: 13, diametroCm: 48, quantita: 24, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: ['traffico'],
    },
    righe: [
      { descrizione: 'Potatura di rimonda su ventiquattro bagolari di alberata stradale', quantita: 56, unita: 'ore', prezzoUnitario: 52 },
      { descrizione: 'Noleggio piattaforma aerea', quantita: 7, unita: 'nr', prezzoUnitario: 280 },
      { descrizione: 'Segnaletica e gestione del traffico', quantita: 7, unita: 'nr', prezzoUnitario: 180 },
    ],
    note: 'Gara aggiudicata a un altro operatore: offerta più bassa dell’8%.',
    creatoIl: istante(-38),
    aggiornatoIl: istante(-30),
  }),

  preventivo({
    id: 'pr-026',
    numero: num(26),
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'rifiutato',
    dataEmissione: giorni(-22),
    validoFino: giorni(8),
    dataInvio: giorni(-21),
    dataEsito: giorni(-13),
    aliquotaIva: 22,
    sopralluogo: {
      dataSopralluogo: giorni(-24),
      foto: [],
      alberi: [
        { id: 'ra-026', specie: 'Acero campestre', altezzaM: 7, diametroCm: 22, quantita: 5, lavorazione: 'potatura' },
      ],
      accessibilita: 'facile',
      criticita: [],
    },
    righe: [
      { descrizione: 'Potatura di rialzo su cinque aceri del parcheggio', quantita: 9, unita: 'ore', prezzoUnitario: 44 },
      { descrizione: 'Smaltimento', quantita: 1, unita: 'corpo', prezzoUnitario: 110 },
    ],
    note: 'L’amministratore ha preferito rimandare al prossimo esercizio.',
    creatoIl: istante(-22),
    aggiornatoIl: istante(-13),
  }),
];
