// Persia on the travel map. Since save 33 the one painting (art/world/travel-map*.webp) covers Persia as
// well, so its ground (mountains, lakes, the Caspian and the Gulf) is read from the painting with the rest
// of the map (tools/build-map.py) and its roads are in data/terrain.ts. What is left here is which towns
// are Persian, where the frontier runs and the passes where winter snow lies. Nothing here depends on
// other game modules.
import { geo } from './projection';

export interface P { x: number; y: number }

/** settlements in Persia (not the Iraqi frontier town of Khanaqin) */
export const PERSIA_IDS = ['kermanshah', 'hamadan', 'tehran', 'tabriz', 'kashan', 'isfahan', 'kerman'];
export const isPersian = (id: string | null | undefined) => !!id && PERSIA_IDS.includes(id);

/** the passes on the roads where winter snow lies (December to the middle of March) */
export const SNOW_PASSES: (P & { name: string; r: number })[] = [
  { ...geo(46.15, 34.4), name: 'the Paitak pass', r: 14 },
  { ...geo(48.12, 34.78), name: 'the Asadabad pass', r: 12 },
  { ...geo(49.2, 35.6), name: 'the Avaj pass', r: 12 },
  { ...geo(47.7, 37.42), name: 'the Qaflankuh pass', r: 12 },
];

// Persia's frontier in 1925, longitude and latitude: the Aras from Ararat to the Caspian, the shore, the
// Turkmen frontier, the east edge of the map, the Gulf of Oman and the Gulf, then north up the Shatt
// al-Arab and along the Iraqi and Turkish frontiers (Qasr-i Shirin on the Persian side, Khanaqin on the
// Iraqi side). The seas inside it are water, so it may cut across them.
const FRONTIER: [number, number][] = [
  [44.3, 39.8], [45.0, 39.6], [46.0, 39.2], [46.6, 38.9], [47.6, 39.3], [48.3, 39.3], [48.0, 38.9], [48.9, 38.4],
  [50.5, 38.6], [53.9, 37.4], [56.0, 38.1], [57.3, 38.2], [60.0, 37.0], [61.2, 36.6], [70, 36.6], [70, 24],
  [61.6, 24.9], [57.3, 25.6], [56.2, 26.6], [54.8, 26.3], [51.5, 27.5], [50.0, 28.9], [48.9, 29.85], [48.5, 30.0],
  [48.0, 30.45], [47.7, 31.0], [47.6, 31.5], [47.4, 32.3], [46.8, 32.8], [46.2, 33.2], [45.9, 33.6], [45.6, 34.1],
  [45.5, 34.45], [45.7, 34.8], [45.95, 35.2], [46.2, 35.6], [45.7, 36.1], [45.2, 36.6], [44.9, 37.2], [44.6, 37.7],
  [44.3, 38.4], [44.4, 39.0],
];
const FRONTIER_MAP: P[] = FRONTIER.map(([lo, la]) => geo(lo, la));

export function inPoly(p: P, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Persia's side of the frontier: open ground here is shut to a merchant without the way open (see unlocks.ts) */
export const inPersia = (p: P) => inPoly(p, FRONTIER_MAP);
