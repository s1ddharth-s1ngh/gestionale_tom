import type { Fattura, Incasso, RigaFattura } from '@/types/fattura';
import { ALIQUOTA_IVA_DEFAULT, totaleFattura } from '@/types/fattura';

/**
 * Fatture di esempio. Nessuno fuori da `fattureService` importa questo file.
 *
 * Le date sono tutte relative a oggi, così i mock non invecchiano — e con lo
 * stato derivato dalla scadenza sarebbe peggio del solito: un archivio con date
 * fisse diventerebbe, mese dopo mese, tutto «scaduto».
 */

/** Data di N giorni fa (negativo) o fra N giorni (positivo), in ISO `AAAA-MM-GG`. */
function giorni(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // mezzogiorno: il fuso non sposta il giorno indietro
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const ANNO = new Date().getFullYear();
const num = (n: number) => `FT-${ANNO}-${String(n).padStart(4, '0')}`;

/** Riferimenti alle altre entità in un posto solo: quando l'anagrafica clienti
 *  fissa i suoi id si riallinea questo blocco e basta. */
const CLI = {
  condominioBattisti: 'cli-001',
  comuneCasalecchio: 'cli-003',
  agriturismoLeQuerce: 'cli-004',
  condominioIlParco: 'cli-005',
  immobiliareSanPetronio: 'cli-007',
  hotelVillaAurora: 'cli-013',
  robertoGuidotti: 'cli-015',
  meccanicaBolognese: 'cli-016',
  istitutoComprensivo: 'cli-018',
} as const;

type RigaMock = Omit<RigaFattura, 'id' | 'aliquotaIva'> & { aliquotaIva?: number };

/**
 * Un incasso si dichiara come **quota del totale**, non come importo assoluto:
 * scrivere «€ 677,10» a mano accanto a un imponibile di € 555 significa
 * sbagliare l'IVA la metà delle volte, e una fattura che non si chiude per due
 * centesimi resta «pagata parziale» per sempre.
 */
type IncassoMock = Omit<Incasso, 'id' | 'importo'> & { quota: number };

interface FatturaMock extends Omit<Fattura, 'righe' | 'incassi' | 'solleciti' | 'creataIl' | 'aggiornataIl'> {
  righe: RigaMock[];
  incassi?: IncassoMock[];
  solleciti?: Fattura['solleciti'];
}

function fattura(base: FatturaMock): Fattura {
  const righe: RigaFattura[] = base.righe.map((r, i) => ({
    ...r,
    id: `${base.id}-r${i + 1}`,
    aliquotaIva: r.aliquotaIva ?? ALIQUOTA_IVA_DEFAULT,
  }));

  const totale = totaleFattura(righe);
  const incassi: Incasso[] = (base.incassi ?? []).map((inc, i) => ({
    data: inc.data,
    metodo: inc.metodo,
    riferimento: inc.riferimento,
    id: `${base.id}-i${i + 1}`,
    importo: Math.round(totale * inc.quota * 100) / 100,
  }));

  return {
    ...base,
    righe,
    incassi,
    solleciti: base.solleciti ?? [],
    creataIl: `${base.dataEmissione ?? giorni(-1)}T09:00:00.000Z`,
    aggiornataIl: `${incassi.at(-1)?.data ?? base.dataEmissione ?? giorni(-1)}T17:00:00.000Z`,
  };
}

export const fattureMock: Fattura[] = [
  // ── pagate ────────────────────────────────────────────────────────────────
  fattura({
    id: 'ft-001',
    numero: num(1),
    tipo: 'unica',
    clienteId: CLI.condominioBattisti,
    commessaId: 'cm-001',
    dataEmissione: giorni(-36),
    dataScadenza: giorni(-6),
    righe: [
      {
        descrizione: 'Potatura di rimonda del secco su quattro tigli, via Battisti 14',
        quantita: 1,
        prezzoUnitario: 620,
        aliquotaIva: 10, // parti comuni di un condominio: aliquota agevolata
      },
      { descrizione: 'Cippatura e smaltimento della ramaglia', quantita: 1, prezzoUnitario: 340, aliquotaIva: 10 },
    ],
    incassi: [{ data: giorni(-9), metodo: 'bonifico', riferimento: 'CRO 8842190', quota: 1 }],
  }),
  fattura({
    id: 'ft-002',
    numero: num(2),
    tipo: 'acconto',
    clienteId: CLI.comuneCasalecchio,
    commessaId: 'cm-002',
    dataEmissione: giorni(-34),
    dataScadenza: giorni(-4),
    note: 'Acconto 30% come da capitolato, determina n. 412 del 2026.',
    righe: [{ descrizione: "Acconto 30% su abbattimento cedro dell'Atlante, parco Rodari", quantita: 1, prezzoUnitario: 1_665 }],
    incassi: [{ data: giorni(-11), metodo: 'bonifico', riferimento: 'Mandato 1204', quota: 1 }],
  }),
  fattura({
    id: 'ft-003',
    numero: num(3),
    tipo: 'unica',
    clienteId: CLI.robertoGuidotti,
    dataEmissione: giorni(-22),
    dataScadenza: giorni(-7),
    righe: [{ descrizione: 'Abbattimento di una robinia pericolante e fresatura della ceppaia', quantita: 1, prezzoUnitario: 480 }],
    incassi: [{ data: giorni(-22), metodo: 'contanti', quota: 1 }],
  }),

  // ── pagate parziali ───────────────────────────────────────────────────────
  fattura({
    id: 'ft-004',
    numero: num(4),
    tipo: 'saldo',
    clienteId: CLI.comuneCasalecchio,
    commessaId: 'cm-002',
    dataEmissione: giorni(-24),
    dataScadenza: giorni(6),
    note: 'Saldo: totale commessa € 5.550 meno acconto FT-0002 di € 1.665.',
    righe: [
      { descrizione: "Saldo abbattimento cedro dell'Atlante di 18 m con piattaforma aerea", quantita: 1, prezzoUnitario: 2_885 },
      { descrizione: 'Noleggio piattaforma 22 m, 2 giornate', quantita: 2, prezzoUnitario: 500 },
    ],
    incassi: [{ data: giorni(-3), metodo: 'bonifico', riferimento: 'Mandato 1731', quota: 0.5 }],
  }),
  fattura({
    id: 'ft-005',
    numero: num(5),
    tipo: 'unica',
    clienteId: CLI.hotelVillaAurora,
    commessaId: 'cm-004',
    dataEmissione: giorni(-14),
    dataScadenza: giorni(16),
    righe: [
      { descrizione: 'Potatura di contenimento di sei pini domestici lungo il viale di accesso', quantita: 6, prezzoUnitario: 210 },
      { descrizione: 'Trattamento endoterapico contro la processionaria', quantita: 6, prezzoUnitario: 45 },
    ],
    incassi: [{ data: giorni(-2), metodo: 'riba', riferimento: 'Ri.Ba. 04/2026', quota: 0.4 }],
  }),

  // ── scadute ───────────────────────────────────────────────────────────────
  fattura({
    id: 'ft-006',
    numero: num(6),
    tipo: 'unica',
    clienteId: CLI.condominioIlParco,
    dataEmissione: giorni(-75),
    dataScadenza: giorni(-45),
    note: "L'amministratore ha cambiato studio: la fattura era finita alla PEC vecchia.",
    righe: [
      { descrizione: 'Abbattimento di due querce compromesse nel parco condominiale', quantita: 2, prezzoUnitario: 890, aliquotaIva: 10 },
      { descrizione: 'Smaltimento in discarica autorizzata', quantita: 1, prezzoUnitario: 260, aliquotaIva: 10 },
    ],
    solleciti: [
      { id: 'ft-006-s1', data: giorni(-30), canale: 'email', note: 'Primo sollecito allo studio Moretti.' },
      { id: 'ft-006-s2', data: giorni(-12), canale: 'pec', note: 'Sollecito via PEC al nuovo amministratore.' },
      { id: 'ft-006-s3', data: giorni(-3), canale: 'telefono', note: 'Promesso pagamento entro fine mese.' },
    ],
  }),
  fattura({
    id: 'ft-007',
    numero: num(7),
    tipo: 'saldo',
    clienteId: CLI.agriturismoLeQuerce,
    commessaId: 'cm-003',
    dataEmissione: giorni(-58),
    dataScadenza: giorni(-28),
    righe: [{ descrizione: 'Sfalcio e trinciatura di due ettari di argine, saldo', quantita: 1, prezzoUnitario: 1_240 }],
    incassi: [{ data: giorni(-40), metodo: 'bonifico', riferimento: 'CRO 7719002', quota: 0.35 }],
    solleciti: [{ id: 'ft-007-s1', data: giorni(-10), canale: 'email', note: 'Sollecito sul residuo.' }],
  }),
  fattura({
    id: 'ft-008',
    numero: num(8),
    tipo: 'unica',
    clienteId: CLI.meccanicaBolognese,
    dataEmissione: giorni(-49),
    dataScadenza: giorni(-19),
    righe: [{ descrizione: "Rimozione di alberatura caduta sull'area di manovra dopo il temporale", quantita: 1, prezzoUnitario: 1_450 }],
    solleciti: [{ id: 'ft-008-s1', data: giorni(-5), canale: 'raccomandata', note: 'Raccomandata A/R alla sede legale.' }],
  }),

  // ── emesse, ancora nei termini ────────────────────────────────────────────
  fattura({
    id: 'ft-009',
    numero: num(9),
    tipo: 'acconto',
    clienteId: CLI.istitutoComprensivo,
    commessaId: 'cm-008',
    dataEmissione: giorni(-8),
    dataScadenza: giorni(22),
    note: 'Acconto 40% alla conferma dei lavori nel cortile della scuola.',
    righe: [{ descrizione: 'Acconto 40% su messa in sicurezza dei cipressi del cortile della scuola', quantita: 1, prezzoUnitario: 760 }],
  }),
  fattura({
    id: 'ft-010',
    numero: num(10),
    tipo: 'unica',
    clienteId: CLI.immobiliareSanPetronio,
    dataEmissione: giorni(-4),
    dataScadenza: giorni(26),
    righe: [
      { descrizione: 'Consolidamento con tirante dinamico su un platano secolare', quantita: 1, prezzoUnitario: 1_180 },
      { descrizione: 'Relazione agronomica di valutazione della stabilità (VTA)', quantita: 1, prezzoUnitario: 320 },
    ],
    datiFE: {
      codiceDestinatario: '0000000',
      pecDestinatario: 'immobiliaresanpetronio@pec.it',
      tipoDocumento: 'TD01',
      regimeFiscale: 'RF01',
    },
  }),
  fattura({
    id: 'ft-011',
    numero: num(11),
    tipo: 'unica',
    clienteId: CLI.comuneCasalecchio,
    commessaId: 'cm-007',
    dataEmissione: giorni(-2),
    dataScadenza: giorni(58), // gli enti pubblici pagano a 60 giorni
    note: 'Split payment: il Comune versa il solo imponibile, l\'IVA la assolve direttamente.',
    righe: [{ descrizione: 'Potatura di venti platani del viale Carducci, lotto 2', quantita: 20, prezzoUnitario: 145 }],
    datiFE: {
      codiceDestinatario: 'UFY9MH',
      tipoDocumento: 'TD01',
      regimeFiscale: 'RF01',
      riferimentoAmministrazione: 'CIG Z9A4471B02',
      scissionePagamenti: true,
    },
  }),

  // ── bozze ─────────────────────────────────────────────────────────────────
  fattura({
    id: 'ft-012',
    numero: num(12),
    tipo: 'saldo',
    clienteId: CLI.istitutoComprensivo,
    commessaId: 'cm-008',
    righe: [{ descrizione: 'Saldo messa in sicurezza dei cipressi del cortile della scuola', quantita: 1, prezzoUnitario: 1_140 }],
    note: 'Da emettere a fine lavori, previsti la prossima settimana.',
  }),
  fattura({
    id: 'ft-013',
    numero: num(13),
    tipo: 'unica',
    clienteId: CLI.condominioBattisti,
    righe: [
      { descrizione: 'Abbattimento del cedro sul lato nord, come richiesto in rapportino', quantita: 1, prezzoUnitario: 1_850, aliquotaIva: 10 },
      { descrizione: 'Fresatura della ceppaia e ripristino del prato', quantita: 1, prezzoUnitario: 290, aliquotaIva: 10 },
    ],
    note: 'In attesa della delibera assembleare: non emettere prima.',
  }),

  // Ragione sociale lunga e dodici righe: serve a vedere se il layout regge.
  fattura({
    id: 'ft-014',
    numero: num(14),
    tipo: 'unica',
    clienteId: CLI.meccanicaBolognese,
    dataEmissione: giorni(-6),
    dataScadenza: giorni(24),
    note: 'Manutenzione programmata del verde di stabilimento, primo semestre.',
    righe: [
      { descrizione: 'Sfalcio delle aree verdi perimetrali, marzo', quantita: 1, prezzoUnitario: 380 },
      { descrizione: 'Sfalcio delle aree verdi perimetrali, aprile', quantita: 1, prezzoUnitario: 380 },
      { descrizione: 'Sfalcio delle aree verdi perimetrali, maggio', quantita: 1, prezzoUnitario: 380 },
      { descrizione: 'Potatura delle siepi di lauroceraso, fronte uffici', quantita: 1, prezzoUnitario: 540 },
      { descrizione: 'Potatura delle siepi di lauroceraso, fronte magazzino', quantita: 1, prezzoUnitario: 460 },
      { descrizione: 'Diserbo meccanico dei piazzali di manovra', quantita: 3, prezzoUnitario: 210 },
      { descrizione: 'Trattamento fitosanitario sugli aceri del parcheggio visitatori', quantita: 8, prezzoUnitario: 38 },
      { descrizione: 'Concimazione a lenta cessione delle aiuole', quantita: 1, prezzoUnitario: 290 },
      { descrizione: 'Ripristino del tappeto erboso sul fronte strada', quantita: 1, prezzoUnitario: 620 },
      { descrizione: 'Cippatura e allontanamento del materiale di risulta', quantita: 4, prezzoUnitario: 130 },
      { descrizione: 'Smaltimento in discarica autorizzata, formulari inclusi', quantita: 1, prezzoUnitario: 340 },
      { descrizione: 'Coordinamento sicurezza in fase di esecuzione', quantita: 1, prezzoUnitario: 180 },
    ],
  }),
];
