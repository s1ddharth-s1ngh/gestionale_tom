/**
 * Le specie che si incontrano davvero nei cantieri di Tom, in Emilia-Romagna:
 * alberate stradali, parchi comunali, giardini condominiali, filari agricoli.
 *
 * Serve all'autocomplete del rilievo. È un AIUTO, non un vincolo: il campo
 * `specie` resta una stringa libera, perché il giorno che arriva un ibrido di
 * cui nessuno ha mai sentito parlare il rilievo si deve poter compilare lo
 * stesso. Un elenco chiuso qui vorrebbe dire un rilievo bloccato in cantiere.
 *
 * Il nome scientifico c'è perché sui documenti per il Comune si scrive quello,
 * e cercarlo ogni volta è tempo perso.
 */
export interface SpecieAlbero {
  nome: string;
  nomeScientifico: string;
  /** Sempreverde o caduca: decide la stagione in cui si pota. */
  fogliame: 'caduca' | 'sempreverde';
}

export const specieAlberiMock: SpecieAlbero[] = [
  // ── Conifere ──────────────────────────────────────────────────────────────
  { nome: "Cedro dell'Atlante", nomeScientifico: 'Cedrus atlantica', fogliame: 'sempreverde' },
  { nome: 'Cedro del Libano', nomeScientifico: 'Cedrus libani', fogliame: 'sempreverde' },
  { nome: 'Cedro deodara', nomeScientifico: 'Cedrus deodara', fogliame: 'sempreverde' },
  { nome: 'Pino domestico', nomeScientifico: 'Pinus pinea', fogliame: 'sempreverde' },
  { nome: "Pino d'Aleppo", nomeScientifico: 'Pinus halepensis', fogliame: 'sempreverde' },
  { nome: 'Cipresso comune', nomeScientifico: 'Cupressus sempervirens', fogliame: 'sempreverde' },
  { nome: 'Abete rosso', nomeScientifico: 'Picea abies', fogliame: 'sempreverde' },
  { nome: 'Tasso', nomeScientifico: 'Taxus baccata', fogliame: 'sempreverde' },

  // ── Latifoglie da alberata ────────────────────────────────────────────────
  { nome: 'Platano', nomeScientifico: 'Platanus × acerifolia', fogliame: 'caduca' },
  { nome: 'Tiglio', nomeScientifico: 'Tilia cordata', fogliame: 'caduca' },
  { nome: 'Ippocastano', nomeScientifico: 'Aesculus hippocastanum', fogliame: 'caduca' },
  { nome: 'Bagolaro', nomeScientifico: 'Celtis australis', fogliame: 'caduca' },
  { nome: 'Frassino', nomeScientifico: 'Fraxinus excelsior', fogliame: 'caduca' },
  { nome: 'Acero campestre', nomeScientifico: 'Acer campestre', fogliame: 'caduca' },
  { nome: 'Acero riccio', nomeScientifico: 'Acer platanoides', fogliame: 'caduca' },
  { nome: 'Carpino bianco', nomeScientifico: 'Carpinus betulus', fogliame: 'caduca' },
  { nome: 'Betulla', nomeScientifico: 'Betula pendula', fogliame: 'caduca' },
  { nome: 'Liquidambar', nomeScientifico: 'Liquidambar styraciflua', fogliame: 'caduca' },

  // ── Querce e grandi latifoglie ────────────────────────────────────────────
  { nome: 'Quercia farnia', nomeScientifico: 'Quercus robur', fogliame: 'caduca' },
  { nome: 'Roverella', nomeScientifico: 'Quercus pubescens', fogliame: 'caduca' },
  { nome: 'Leccio', nomeScientifico: 'Quercus ilex', fogliame: 'sempreverde' },
  { nome: 'Faggio', nomeScientifico: 'Fagus sylvatica', fogliame: 'caduca' },

  // ── Specie di ripa e infestanti ───────────────────────────────────────────
  { nome: 'Salice piangente', nomeScientifico: 'Salix babylonica', fogliame: 'caduca' },
  { nome: 'Pioppo cipressino', nomeScientifico: 'Populus nigra "Italica"', fogliame: 'caduca' },
  { nome: 'Pioppo bianco', nomeScientifico: 'Populus alba', fogliame: 'caduca' },
  { nome: 'Robinia', nomeScientifico: 'Robinia pseudoacacia', fogliame: 'caduca' },
  { nome: 'Ailanto', nomeScientifico: 'Ailanthus altissima', fogliame: 'caduca' },
  { nome: 'Ontano nero', nomeScientifico: 'Alnus glutinosa', fogliame: 'caduca' },

  // ── Giardino e siepi ──────────────────────────────────────────────────────
  { nome: 'Magnolia', nomeScientifico: 'Magnolia grandiflora', fogliame: 'sempreverde' },
  { nome: 'Lauroceraso', nomeScientifico: 'Prunus laurocerasus', fogliame: 'sempreverde' },
  { nome: 'Alloro', nomeScientifico: 'Laurus nobilis', fogliame: 'sempreverde' },
  { nome: 'Olivo', nomeScientifico: 'Olea europaea', fogliame: 'sempreverde' },
  { nome: 'Ciliegio da fiore', nomeScientifico: 'Prunus serrulata', fogliame: 'caduca' },
  { nome: 'Nocciolo', nomeScientifico: 'Corylus avellana', fogliame: 'caduca' },
];

/** I soli nomi comuni, per il `<datalist>` del rilievo. */
export const nomiSpecie: string[] = specieAlberiMock.map((s) => s.nome);
