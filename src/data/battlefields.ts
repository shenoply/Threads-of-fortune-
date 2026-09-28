// Which battlefield a fight is played on, from where on the world map it happens.
// Pictures: public/art/battle/<id>.jpg (prompts in BATTLE_ART_PROMPTS.md).

export type BattlefieldId = 'road' | 'dunes' | 'oasis' | 'pass' | 'nile' | 'ford' | 'hills' | 'basalt' | 'ruins' | 'mountain';

export interface Battlefield {
  id: BattlefieldId;
  name: string;
  /** what the ground does in a fight */
  cover: string;
  /** where on the map it is used */
  where: string;
}

export const BATTLEFIELDS: Record<BattlefieldId, Battlefield> = {
  road: { id: 'road', name: 'Desert road', cover: 'Open ground; a ruined wall and a ditch are the only cover. Riders are strong here.', where: 'Cairo to Suez, the Western Desert edge, the Iraq steppe' },
  dunes: { id: 'dunes', name: 'Sand dunes', cover: 'Dune crests hide whole squads; sand slows everyone, horses most.', where: 'North Sinai, the Negev, the Western Desert' },
  oasis: { id: 'oasis', name: 'Oasis', cover: 'Palms and a walled garden; the well is worth holding.', where: 'Fayoum edges, Sinai wells, desert halts' },
  pass: { id: 'pass', name: 'Granite wadi', cover: 'Boulders and cliffs; ambushers wait on the sides.', where: 'South Sinai (St Catherine), Edom and Moab' },
  nile: { id: 'nile', name: 'Nile farmland', cover: 'Tall cane hides men; the canal can only be crossed at the bridge.', where: 'Giza, Saqqara, Fayoum, the Delta, Tanta' },
  ford: { id: 'ford', name: 'River ford', cover: 'Reeds on both banks; men in the water are slow and exposed.', where: 'The Jordan crossing, the Euphrates, the Orontes' },
  hills: { id: 'hills', name: 'Olive hills', cover: 'Terrace walls and olive trees; the high side of the valley wins.', where: 'Jaffa to Jerusalem, Judean and Lebanese foothills' },
  basalt: { id: 'basalt', name: 'Basalt plateau', cover: 'Black boulders and a ruined village; rebel country.', where: 'The Hawran and Jebel Druze, south of Damascus' },
  ruins: { id: 'ruins', name: 'Desert ruins', cover: 'Fallen columns everywhere; good for riflemen, bad for riders.', where: 'The Syrian Desert, Palmyra, Damascus to Baghdad' },
  mountain: { id: 'mountain', name: 'Mountain pass', cover: 'Cliffs, pines and one narrow road; a few men can hold it.', where: 'The Taurus (Aleppo to Konya), Mount Lebanon, the Anti-Lebanon' },
};

/** Areas in real longitude/latitude, checked in order; the first that contains the fight wins. */
const AREAS: { id: BattlefieldId; lon: [number, number]; lat: [number, number] }[] = [
  { id: 'mountain', lon: [32.0, 39.5], lat: [36.6, 38.3] },   // Taurus
  { id: 'mountain', lon: [35.6, 36.8], lat: [33.3, 34.7] },   // Lebanon and Anti-Lebanon
  { id: 'basalt', lon: [35.9, 37.2], lat: [32.3, 33.3] },     // Hawran, Jebel Druze
  { id: 'ford', lon: [35.45, 35.7], lat: [31.7, 32.8] },      // Jordan valley
  { id: 'ford', lon: [38.0, 42.0], lat: [34.0, 36.7] },       // along the Euphrates
  { id: 'hills', lon: [34.85, 35.4], lat: [31.3, 32.6] },     // Judean hills, Jaffa to Jerusalem
  { id: 'pass', lon: [33.3, 34.4], lat: [28.0, 29.2] },       // Sinai massif
  { id: 'pass', lon: [35.3, 35.9], lat: [29.2, 31.4] },       // Edom and Moab
  { id: 'ruins', lon: [37.0, 40.5], lat: [33.2, 35.0] },      // Syrian Desert, Palmyra
  { id: 'dunes', lon: [32.4, 34.8], lat: [30.2, 31.3] },      // North Sinai
  { id: 'dunes', lon: [34.3, 35.2], lat: [30.0, 31.2] },      // Negev
  { id: 'nile', lon: [30.2, 32.0], lat: [29.0, 31.6] },       // Nile valley, Fayoum, Delta
  { id: 'oasis', lon: [29.0, 30.2], lat: [28.5, 30.0] },      // desert edge west of the Nile
];

/** Battlefield for a fight at a point given in longitude/latitude; the desert road when nowhere else fits. */
export function battlefieldAt(lon: number, lat: number): BattlefieldId {
  return AREAS.find((a) => lon >= a.lon[0] && lon <= a.lon[1] && lat >= a.lat[0] && lat <= a.lat[1])?.id ?? 'road';
}

/** The six roads that have a standing bandit band, and the ground each fight is on. */
export const ROAD_BAND_GROUND: Record<string, BattlefieldId> = {
  'cairo-suez': 'road',
  'suez-sinai': 'pass',
  'jaffa-jerusalem': 'hills',
  'jerusalem-damascus': 'basalt',
  'damascus-baghdad': 'ruins',
  'aleppo-konya': 'mountain',
};
