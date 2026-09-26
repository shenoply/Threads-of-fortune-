import type { PersonSpec } from '../components/People/Person';

// How each buyer and townsperson looks. Dress follows 1920s Egypt and the Levant:
// the tarboosh (fez) for effendis and officials, the turban and galabiya for sheikhs and villagers,
// the tarha headscarf and black melaya for women, the kufiya and 'iqal for Bedouin.
export const PEOPLE: Record<string, PersonSpec> = {
  // Buyers
  samira: { skin: '#c99a74', hair: '#1e120a', age: 26, female: true, head: 'tarha', headColor: '#9b2f2a', headColor2: '#d8b25a', clothes: 'dress', cloth: '#8a2a22', cloth2: '#d8b25a', earrings: true, kohl: true, face: 'long', smile: 0.4 },
  yusuf: { skin: '#b3845d', hair: '#8a8a86', age: 58, head: 'fez', headColor: '#8e1f18', clothes: 'suit', cloth: '#3a3328', cloth2: '#6a1c1c', moustache: 'thick', glasses: true, face: 'round', smile: -0.1, brow: 0.3 },
  mariam: { skin: '#b98a63', hair: '#20140c', age: 21, female: true, head: 'tarha', headColor: '#c07a2c', headColor2: '#7a3a1a', clothes: 'dress', cloth: '#5b6b3a', cloth2: '#e0c070', kohl: true, earrings: true, face: 'round', smile: 0.5, brow: 0.2 },

  // Townsfolk
  hassan: { skin: '#9c6a44', hair: '#8a8580', age: 55, head: 'kufi', headColor: '#ece2cc', clothes: 'galabiya', cloth: '#6a4a2a', moustache: 'thick', beard: 'stubble', face: 'round', smile: 0.8 },
  whitcombe: { skin: '#e8c8b0', hair: '#6a4a2a', age: 35, female: true, head: 'hat', headColor: '#d8c890', clothes: 'dress', cloth: '#d8d0c0', cloth2: '#6a6a70', glasses: true, face: 'long', smile: 0.2 },
  kasparian: { skin: '#d0a888', hair: '#7a7470', age: 50, head: 'fez', headColor: '#8e1f18', clothes: 'suit', cloth: '#2a2a30', cloth2: '#20202a', moustache: 'thin', face: 'long', smile: 0.1, brow: 0.4 },
  benakis: { skin: '#caa07c', hair: '#141010', age: 45, head: 'bare', headColor: '#d8c890', clothes: 'suit', cloth: '#e0d6bc', cloth2: '#8a6a2a', face: 'round', smile: 0.6 },
  kassab: { skin: '#b3845d', hair: '#120c08', age: 38, head: 'fez', headColor: '#8e1f18', clothes: 'suit', cloth: '#6a5a2a', cloth2: '#d8b22a', moustache: 'thin', face: 'long', smile: 0.7 },
  abuhamid: { skin: '#a8764f', hair: '#2a1d14', age: 62, head: 'turban', headColor: '#ece2cc', clothes: 'galabiya', cloth: '#6b4a2a', moustache: 'thick', beard: 'short', face: 'round', smile: 0.6 },
  mansour: { skin: '#8e5f3c', hair: '#221710', age: 58, head: 'turban', headColor: '#e6dcc4', clothes: 'galabiya', cloth: '#7a6a52', beard: 'full', moustache: 'thick', face: 'long', smile: 0 },
  ummsalah: { skin: '#a77650', hair: '#1a100a', age: 55, female: true, head: 'cowl', headColor: '#1c1714', headColor2: '#6f7a3c', clothes: 'melaya', cloth: '#1c1714', cloth2: '#6f7a3c', face: 'round', smile: 0.2 },
  rashid: { skin: '#b07e57', hair: '#221810', age: 60, head: 'fez', headColor: '#7e2418', clothes: 'vest', cloth: '#5b4a2e', cloth2: '#e6dcc8', moustache: 'thick', beard: 'stubble', face: 'square', smile: 0.3 },
  hagop: { skin: '#c9a07c', hair: '#1a1410', age: 48, head: 'hat', headColor: '#2a2622', clothes: 'suit', cloth: '#3a3f5a', cloth2: '#20304a', moustache: 'thin', face: 'long', smile: 0.1, brow: 0.4 },
  sheikhomar: { skin: '#946440', hair: '#1c1510', age: 66, head: 'turban', headColor: '#f0e6d0', headColor2: '#3a6a3a', clothes: 'robe', cloth: '#6b3a22', beard: 'full', moustache: 'thick', face: 'long', smile: 0.2 },
  pericles: { skin: '#d2a882', hair: '#2a2018', age: 44, head: 'hat', headColor: '#e2d8c0', headColor2: '#2c3b6b', clothes: 'suit', cloth: '#d8ceb6', cloth2: '#2c3b6b', moustache: 'thick', face: 'square', smile: 0.4 },
  captainreed: { skin: '#e2b494', hair: '#8a7a6a', age: 63, head: 'hat', headColor: '#f2eee4', headColor2: '#1a1a1a', clothes: 'uniform', cloth: '#1e2a3a', moustache: 'thick', face: 'square', smile: 0.1 },
  anastasios: { skin: '#caa07e', hair: '#3a3028', age: 70, head: 'cowl', headColor: '#1a1a1a', clothes: 'robe', cloth: '#1a1a1a', beard: 'full', moustache: 'thick', face: 'long', smile: 0.1 },
  abuyusef: { skin: '#b4835a', hair: '#231811', age: 50, head: 'fez', headColor: '#9a2a1a', clothes: 'vest', cloth: '#8a5a1c', cloth2: '#ece2cc', moustache: 'thick', face: 'round', smile: 0.7 },
  boulos: { skin: '#c49a76', hair: '#1a1412', age: 57, head: 'cowl', headColor: '#221a24', clothes: 'robe', cloth: '#3a2a3a', beard: 'full', moustache: 'thick', face: 'long', smile: 0 },
  farid: { skin: '#c09470', hair: '#18120e', age: 46, head: 'fez', headColor: '#7a1c16', clothes: 'suit', cloth: '#2e2a22', cloth2: '#8a6a2a', moustache: 'thin', glasses: false, face: 'long', smile: 0.2, brow: 0.5 },
  kevork: { skin: '#c69d78', hair: '#2a1c14', age: 52, head: 'hat', headColor: '#3a3a2a', clothes: 'suit', cloth: '#3a3a2a', cloth2: '#5a2020', moustache: 'thick', glasses: true, face: 'round', smile: 0 },
  ayse: { skin: '#d0a484', hair: '#2a1a10', age: 40, female: true, head: 'tarha', headColor: '#e8e0d0', headColor2: '#8a2a1c', clothes: 'dress', cloth: '#8a2a1c', cloth2: '#d8b25a', face: 'square', smile: 0.3 },
  selim: { skin: '#caa27e', hair: '#bdb5aa', age: 68, head: 'fez', headColor: '#6a1812', clothes: 'suit', cloth: '#1e2a4a', cloth2: '#c9974a', moustache: 'thick', face: 'long', smile: -0.1, brow: 0.3 },
  haji: { skin: '#b88c66', hair: '#2a2420', age: 59, head: 'turban', headColor: '#2a3a4a', clothes: 'robe', cloth: '#4a3a2a', cloth2: '#2a3a4a', beard: 'full', moustache: 'thick', face: 'long', smile: 0.1 },
  salim: { skin: '#8a5a38', hair: '#140e0a', age: 38, head: 'keffiyeh', headColor: '#ece6d8', headColor2: '#9a2a1c', clothes: 'abaya', cloth: '#5a4028', cloth2: '#e6dcc8', beard: 'short', moustache: 'thick', face: 'long', smile: 0 },
};

const LOOK_DEFAULT: Record<string, PersonSpec> = {
  fez: PEOPLE.farid,
  turban: PEOPLE.abuhamid,
  scarf: PEOPLE.ayse,
  hat: PEOPLE.hagop,
  keffiyeh: PEOPLE.salim,
  cowl: PEOPLE.anastasios,
  bare: { skin: '#b07e57', hair: '#1c140e', age: 30, head: 'bare', clothes: 'galabiya', cloth: '#7a6a52', moustache: 'thin' },
};

export function personFor(id: string, look?: string, accent?: string): PersonSpec {
  if (PEOPLE[id]) return PEOPLE[id];
  const base = LOOK_DEFAULT[look ?? 'bare'] ?? LOOK_DEFAULT.bare;
  return { ...base, cloth: accent ?? base.cloth };
}
