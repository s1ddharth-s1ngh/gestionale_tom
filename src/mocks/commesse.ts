import type { Commessa, Lavorazione } from '@/types/commessa';
import { calcolaAvanzamento, calcolaOreReali } from '@/types/commessa';

/**
 * Commesse di esempio. Sostituite da una fetch il giorno che arriva il backend:
 * nessuno fuori da `commesseService` importa questo file.
 *
 * Le date sono TUTTE relative a oggi, così i mock non invecchiano: un elenco in cui
 * la commessa più recente è dell'anno scorso fa sembrare rotta l'app invece che
 * vecchi i dati.
 */

/** Data di N giorni fa (negativo) o fra N giorni (positivo), in ISO `AAAA-MM-GG`. */
function giorni(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // mezzogiorno: così il fuso non sposta il giorno all'indietro
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Come sopra ma con l'ora: serve ai campi che sono istanti e non giornate, come `firmatoIl`. */
function istante(n: number): string {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * I riferimenti alle altre entità stanno tutti qui, non sparsi nelle commesse:
 * quando l'anagrafica clienti fissa i suoi id, si riallinea questo blocco e basta.
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

/** Costruisce la commessa calcolando i derivati: così i mock non possono mentire. */
function commessa(
  base: Omit<Commessa, 'oreReali' | 'avanzamentoPct' | 'creataIl' | 'aggiornataIl'> & {
    lavorazioni: Lavorazione[];
    creataIl?: string;
    aggiornataIl?: string;
  },
): Commessa {
  // Le due date di sistema si ricavano dal ciclo di vita invece di essere
  // ripetute in quindici oggetti: creata il giorno prima della pianificazione,
  // aggiornata all'ultimo evento accaduto davvero.
  const riferimentoCreazione = base.dataPianificata ?? giorni(-1);
  const ultimoEvento = base.dataFine ?? base.dataInizio ?? base.dataPianificata ?? riferimentoCreazione;

  return {
    ...base,
    creataIl: base.creataIl ?? `${riferimentoCreazione}T08:00:00.000Z`,
    aggiornataIl: base.aggiornataIl ?? `${ultimoEvento}T17:00:00.000Z`,
    oreReali: calcolaOreReali(base.lavorazioni),
    avanzamentoPct: calcolaAvanzamento(base.lavorazioni),
  };
}

const ANNO = new Date().getFullYear();
const num = (n: number) => `CM-${ANNO}-${String(n).padStart(4, '0')}`;

export const commesseMock: Commessa[] = [
  // ── completate ─────────────────────────────────────────────────────────────
  commessa({
    id: 'cm-001',
    numero: num(1),
    preventivoId: 'pr-004',
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'completata',
    dataPianificata: giorni(-38),
    dataInizio: giorni(-38),
    dataFine: giorni(-37),
    orePreviste: 16,
    lavorazioni: [
      { id: 'lv-001', descrizione: 'Potatura di rimonda del secco su quattro tigli', orePreviste: 10, oreReali: 11, completata: true },
      { id: 'lv-002', descrizione: 'Cippatura e carico della ramaglia', orePreviste: 4, oreReali: 4, completata: true },
      { id: 'lv-003', descrizione: 'Pulizia area e ripristino degli accessi', orePreviste: 2, oreReali: 2.5, completata: true },
    ],
    fotoPrima: [],
    fotoDopo: [],
    rapportino: {
      dataCompilazione: giorni(-37),
      oreLavorate: 17.5,
      operatori: ['Tommaso Neri', 'Andrea Lolli'],
      materialiUsati: 'Sacchi per ramaglia, mastice cicatrizzante',
      noteCliente: "L'amministratore chiede un preventivo per il cedro sul lato nord.",
      firmaCliente: 'data:image/png;base64,iVBORw0KGgo=',
      firmatoIl: istante(-37),
    },
    note: 'Accesso dal cortile interno, cancello aperto dal portiere alle 7:30.',
  }),
  commessa({
    id: 'cm-002',
    numero: num(2),
    preventivoId: 'pr-007',
    clienteId: CLI.comuneCasalecchio.id,
    luogoInterventoId: CLI.comuneCasalecchio.luogo,
    stato: 'completata',
    dataPianificata: giorni(-30),
    dataInizio: giorni(-30),
    dataFine: giorni(-28),
    orePreviste: 40,
    lavorazioni: [
      { id: 'lv-004', descrizione: "Abbattimento controllato di un cedro dell'Atlante di 18 m con piattaforma aerea", orePreviste: 16, oreReali: 20, completata: true },
      { id: 'lv-005', descrizione: 'Sezionamento e allontanamento del fusto', orePreviste: 12, oreReali: 12, completata: true },
      { id: 'lv-006', descrizione: 'Fresatura della ceppaia', orePreviste: 6, oreReali: 6, completata: true },
      { id: 'lv-007', descrizione: 'Smaltimento in discarica autorizzata', orePreviste: 6, oreReali: 5, completata: true },
    ],
    fotoPrima: [],
    fotoDopo: [],
    rapportino: {
      dataCompilazione: giorni(-28),
      oreLavorate: 43,
      operatori: ['Tommaso Neri', 'Andrea Lolli', 'Michele Fabbri'],
      materialiUsati: 'Noleggio piattaforma 22 m (2 giorni), carburante per la cippatrice',
      noteCliente: 'Intervento eseguito con chiusura strada concordata con la Polizia Locale.',
      firmaCliente: 'data:image/png;base64,iVBORw0KGgo=',
      firmatoIl: istante(-28),
    },
    note: 'Tre ore oltre il previsto: il cedro era più compromesso di quanto visto in sopralluogo.',
  }),
  commessa({
    id: 'cm-003',
    numero: num(3),
    clienteId: CLI.agricolaFerrari.id,
    luogoInterventoId: CLI.agricolaFerrari.luogo,
    stato: 'completata',
    dataPianificata: giorni(-55),
    dataInizio: giorni(-55),
    dataFine: giorni(-55),
    orePreviste: 8,
    lavorazioni: [
      { id: 'lv-008', descrizione: 'Cippatura delle ramaglie di potatura accatastate', orePreviste: 8, oreReali: 7, completata: true },
    ],
    fotoPrima: [],
    fotoDopo: [],
    rapportino: {
      dataCompilazione: giorni(-55),
      oreLavorate: 7,
      operatori: ['Andrea Lolli'],
      firmaCliente: 'data:image/png;base64,iVBORw0KGgo=',
      firmatoIl: istante(-55),
    },
  }),

  // ── in corso ───────────────────────────────────────────────────────────────
  commessa({
    id: 'cm-004',
    numero: num(4),
    preventivoId: 'pr-012',
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'in_corso',
    dataPianificata: giorni(-1),
    dataInizio: giorni(-1),
    orePreviste: 24,
    lavorazioni: [
      { id: 'lv-009', descrizione: 'Potatura di contenimento della siepe di lauroceraso (140 m)', orePreviste: 10, oreReali: 10, completata: true },
      { id: 'lv-010', descrizione: 'Rimonda del secco su sei pini domestici', orePreviste: 10, oreReali: 4, completata: false },
      { id: 'lv-011', descrizione: 'Cippatura e smaltimento', orePreviste: 4, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Lavorare prima delle 10 per non disturbare la colazione degli ospiti.',
  }),
  commessa({
    id: 'cm-005',
    numero: num(5),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'in_corso',
    dataPianificata: giorni(-2),
    dataInizio: giorni(-2),
    orePreviste: 32,
    lavorazioni: [
      { id: 'lv-012', descrizione: 'Sfalcio delle aree verdi perimetrali del piazzale', orePreviste: 12, oreReali: 13, completata: true },
      { id: 'lv-013', descrizione: 'Abbattimento di nove robinie sul confine ferroviario', orePreviste: 16, oreReali: 7, completata: false },
      { id: 'lv-014', descrizione: 'Diserbo meccanico lungo la recinzione', orePreviste: 4, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Cantiere in area logistica: gilet alta visibilità obbligatorio, accesso dal varco 3.',
  }),

  // ── pianificate ────────────────────────────────────────────────────────────
  commessa({
    id: 'cm-006',
    numero: num(6),
    preventivoId: 'pr-018',
    clienteId: CLI.condominioLeQuerce.id,
    luogoInterventoId: CLI.condominioLeQuerce.luogo,
    stato: 'pianificata',
    dataPianificata: giorni(3),
    orePreviste: 20,
    lavorazioni: [
      { id: 'lv-015', descrizione: 'Potatura di due platani con piattaforma aerea', orePreviste: 14, completata: false },
      { id: 'lv-016', descrizione: 'Cippatura e smaltimento della ramaglia', orePreviste: 6, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Serve l’occupazione di suolo pubblico: richiesta protocollata, in attesa di risposta.',
  }),
  commessa({
    id: 'cm-007',
    numero: num(7),
    preventivoId: 'pr-021',
    clienteId: CLI.parrocchiaSantAgata.id,
    luogoInterventoId: CLI.parrocchiaSantAgata.luogo,
    stato: 'pianificata',
    dataPianificata: giorni(5),
    orePreviste: 12,
    lavorazioni: [
      { id: 'lv-017', descrizione: 'Consolidamento con tirante dinamico su un cipresso secolare', orePreviste: 8, completata: false },
      { id: 'lv-018', descrizione: 'Verifica visiva VTA sugli altri quattro cipressi del viale', orePreviste: 4, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
  }),
  commessa({
    id: 'cm-008',
    numero: num(8),
    clienteId: CLI.comuneCasalecchioParco.id,
    luogoInterventoId: CLI.comuneCasalecchioParco.luogo,
    stato: 'pianificata',
    dataPianificata: giorni(5),
    orePreviste: 48,
    lavorazioni: [
      { id: 'lv-019', descrizione: 'Censimento e mappatura di 120 alberature del parco', orePreviste: 24, completata: false },
      { id: 'lv-020', descrizione: 'Potatura di sicurezza sulle alberature lungo i vialetti', orePreviste: 24, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Due squadre in parallelo, cantiere di tre giorni.',
  }),
  commessa({
    id: 'cm-009',
    numero: num(9),
    clienteId: CLI.gandolfiPrivato.id,
    luogoInterventoId: CLI.gandolfiPrivato.luogo,
    stato: 'pianificata',
    dataPianificata: giorni(12),
    orePreviste: 6,
    lavorazioni: [
      { id: 'lv-021', descrizione: 'Potatura di una quercia in giardino privato', orePreviste: 6, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
  }),

  // ── da pianificare ─────────────────────────────────────────────────────────
  commessa({
    id: 'cm-010',
    numero: num(10),
    preventivoId: 'pr-025',
    clienteId: CLI.villaMonteveglio.id,
    luogoInterventoId: CLI.villaMonteveglio.luogo,
    stato: 'da_pianificare',
    orePreviste: 18,
    lavorazioni: [
      { id: 'lv-022', descrizione: 'Abbattimento di un salice piangente pericolante sul laghetto', orePreviste: 12, completata: false },
      { id: 'lv-023', descrizione: 'Fresatura della ceppaia e ripristino del prato', orePreviste: 6, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Il cliente deve confermare la settimana. Accesso mezzi difficile: cortile stretto.',
  }),
  commessa({
    id: 'cm-011',
    numero: num(11),
    clienteId: CLI.condominioLeQuerce.id,
    luogoInterventoId: CLI.condominioLeQuerce.luogo,
    stato: 'da_pianificare',
    orePreviste: 4,
    lavorazioni: [],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Sopralluogo fatto, lavorazioni ancora da dettagliare.',
  }),

  // ── sospese ────────────────────────────────────────────────────────────────
  commessa({
    id: 'cm-012',
    numero: num(12),
    preventivoId: 'pr-009',
    clienteId: CLI.agricolaFerrari.id,
    luogoInterventoId: CLI.agricolaFerrari.luogo,
    stato: 'sospesa',
    dataPianificata: giorni(-14),
    dataInizio: giorni(-14),
    orePreviste: 28,
    lavorazioni: [
      { id: 'lv-024', descrizione: 'Trinciatura del noccioleto (2,4 ha)', orePreviste: 16, oreReali: 6, completata: false },
      { id: 'lv-025', descrizione: 'Ripristino della capezzagna', orePreviste: 12, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Sospesa per terreno impraticabile dopo le piogge. Si riprende a terreno asciutto.',
  }),
  commessa({
    id: 'cm-013',
    numero: num(13),
    clienteId: CLI.condominioBattisti.id,
    luogoInterventoId: CLI.condominioBattisti.luogo,
    stato: 'sospesa',
    dataPianificata: giorni(-7),
    orePreviste: 10,
    lavorazioni: [
      { id: 'lv-026', descrizione: 'Abbattimento del cedro sul lato nord', orePreviste: 10, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: "In attesa dell'autorizzazione paesaggistica del Comune.",
  }),

  // ── annullate ──────────────────────────────────────────────────────────────
  commessa({
    id: 'cm-014',
    numero: num(14),
    preventivoId: 'pr-015',
    clienteId: CLI.hotelSanLuca.id,
    luogoInterventoId: CLI.hotelSanLuca.luogo,
    stato: 'annullata',
    dataPianificata: giorni(-21),
    orePreviste: 8,
    lavorazioni: [
      { id: 'lv-027', descrizione: 'Messa a dimora di dodici carpini in siepe', orePreviste: 8, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Annullata dal cliente: rimandata alla stagione di piantagione autunnale.',
  }),
  commessa({
    id: 'cm-015',
    numero: num(15),
    clienteId: CLI.logisticaEmiliana.id,
    luogoInterventoId: CLI.logisticaEmiliana.luogo,
    stato: 'annullata',
    orePreviste: 4,
    lavorazioni: [
      { id: 'lv-028', descrizione: "Sfalcio straordinario dell'area nord", orePreviste: 4, completata: false },
    ],
    fotoPrima: [],
    fotoDopo: [],
    note: 'Doppione della commessa 5, annullata in fase di inserimento.',
  }),
];
