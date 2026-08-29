import type { Mezzo } from '@/types/costo';

/**
 * Il parco mezzi. Anagrafica minima: targa, descrizione, tipo.
 *
 * Nessuno fuori dai service importa questo file. Il modulo mezzi completo —
 * revisioni, assicurazioni, tagliandi — è fuori dal primo rilascio.
 */
export const mezziMock: Mezzo[] = [
  {
    id: 'mz-001',
    targa: 'FL429GT',
    descrizione: 'Iveco Daily con cassone ribaltabile',
    tipo: 'autocarro',
    attivo: true,
  },
  {
    id: 'mz-002',
    targa: 'GA817PR',
    descrizione: 'Ford Ranger, mezzo di sopralluogo',
    tipo: 'pickup',
    attivo: true,
  },
  {
    id: 'mz-003',
    targa: 'DV205BX',
    descrizione: 'Piattaforma aerea semovente 18 m',
    tipo: 'piattaforma',
    attivo: true,
  },
  {
    id: 'mz-004',
    targa: 'ZA4471',
    descrizione: 'Cippatrice Pezzolato da 15 cm',
    tipo: 'cippatrice',
    attivo: true,
  },
  {
    id: 'mz-005',
    targa: 'BO994AC',
    descrizione: 'Trattore Landini con trincia argini',
    tipo: 'trattore',
    attivo: true,
  },
  {
    // Venduto a marzo. Resta in anagrafica perché i costi del 2025 lo citano:
    // cancellarlo li lascerebbe con un riferimento che non risolve.
    id: 'mz-006',
    targa: 'CX330HY',
    descrizione: 'Fiat Doblò, venduto',
    tipo: 'altro',
    attivo: false,
  },
];
