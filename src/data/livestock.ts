// Animals driven along for the pot, 1925: a caravan on a long road took a few sheep or goats and a
// crate of hens rather than carry all its food. They walk (the hens ride in their crate), graze as
// they go, give milk or eggs, and when the sacks run out one is slaughtered. Sheep set a slower pace.
import { SETTLEMENTS } from './world';

export interface Livestock {
  id: string; name: string; plural: string; line: string;
  /** price in piastres at a town of ordinary prices */
  price: number;
  /** rations when slaughtered */
  meat: number;
  /** rations a day of milk or eggs */
  daily: number;
  /** the caravan's pace with this animal in it (1 = no slower) */
  pace: number;
  /** loads it takes up (only the hens' crate rides on a pack animal) */
  load: number;
  where: string[];
}

export const LIVESTOCK: Livestock[] = [
  { id: 'sheep_barki', name: 'Barki sheep', plural: 'Barki sheep', line: 'A small fat-tailed sheep of the western desert. Hardy, and quicker on its feet than the big Syrian breed.', price: 30, meat: 16, daily: 0, pace: 0.95, load: 0, where: ['Egypt', 'Sinai'] },
  { id: 'sheep_awassi', name: 'Awassi sheep', plural: 'Awassi sheep', line: 'The big fat-tailed sheep of Syria and Iraq. A great deal of meat, but it will not be hurried.', price: 45, meat: 26, daily: 0, pace: 0.9, load: 0, where: ['Syria', 'Lebanon', 'Palestine', 'Transjordan', 'Iraq'] },
  { id: 'goat_bedouin', name: 'Black Bedouin goat', plural: 'black Bedouin goats', line: 'Lean and black, eats anything, keeps up with a camel. A little milk every day.', price: 24, meat: 9, daily: 0.5, pace: 1, load: 0, where: ['Sinai', 'Transjordan', 'Egypt', 'Iraq', 'Persia'] },
  { id: 'goat_shami', name: 'Shami goat', plural: 'Shami goats', line: 'The tall red Damascus goat with the long ears. Milk for one man a day.', price: 48, meat: 13, daily: 1, pace: 0.97, load: 0, where: ['Syria', 'Lebanon', 'Palestine'] },
  { id: 'hens_crate', name: 'Crate of hens', plural: 'crates of hens', line: 'Five village hens in a palm-rib crate on a pack saddle. Eggs most mornings.', price: 22, meat: 8, daily: 1, pace: 1, load: 0.5, where: ['Egypt', 'Palestine', 'Syria', 'Lebanon', 'Iraq', 'Persia', 'Anatolia'] },
];
export const LIVESTOCK_BY_ID: Record<string, Livestock> = Object.fromEntries(LIVESTOCK.map((l) => [l.id, l]));

const regionOf = (sid: string) => SETTLEMENTS.find((s) => s.id === sid)?.region;
export function livestockAt(sid: string): Livestock[] {
  const reg = regionOf(sid);
  return LIVESTOCK.filter((l) => l.where.includes(sid) || (!!reg && l.where.includes(reg)));
}
/** price here: a town's food prices move it */
export const livestockPrice = (l: Livestock, food: number) => Math.round(l.price * Math.max(0.7, Math.min(1.6, food)));
export const flockOf = (p: { flock?: Record<string, number> }) => Object.entries(p.flock ?? {}).filter(([, n]) => n > 0) as [string, number][];
export const flockCount = (p: { flock?: Record<string, number> }) => flockOf(p).reduce((a, [, n]) => a + n, 0);
