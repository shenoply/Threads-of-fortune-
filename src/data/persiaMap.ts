// Persia, east of the painted travel map. The painting (art/world/travel-map.webp) stops just past Baghdad,
// at x = 885 in map units, so the map is carried on eastward in code: the same parchment and ink, drawn
// by game/systems/persiaArt.ts, with its ground (mountains, desert, the seas and the roads) set out here
// for the pathfinder in game/systems/world.ts. Nothing here depends on other game modules.
//
// Placing: the painting is not to scale, so the east is laid out from Baghdad (823.9, 266.2) by longitude
// and latitude, at about the scale of the Damascus-Baghdad stretch of the painting (36 map units to a
// degree of longitude, 29 to a degree of latitude), drawn closer together past 51.4 E so Kerman still fits.

export interface P { x: number; y: number }

/** where the painting ends, in map units (the travel map is 1536 px wide, shown 885 units across) */
export const PAINT_W = 885;
/** the map with Persia added: 253 cells of 5 units */
export const EAST_W = 1265;

/** longitude and latitude to map units, east of Baghdad */
export function east(lon: number, lat: number): P {
  const d = lon - 44.4;
  return { x: Math.round((823.9 + 36 * Math.min(d, 7) + 26 * Math.max(0, d - 7)) * 10) / 10, y: Math.round((266.2 - 29 * (lat - 33.3)) * 10) / 10 };
}

/** settlements in Persia (not the Iraqi frontier town of Khanaqin) */
export const PERSIA_IDS = ['kermanshah', 'hamadan', 'tehran', 'tabriz', 'kashan', 'isfahan', 'kerman'];
export const isPersian = (id: string | null | undefined) => !!id && PERSIA_IDS.includes(id);

// the towns on the way (positions only: the settlements themselves are in data/world.ts)
const BAGHDAD: P = { x: 823.9, y: 266.2 };
const KHANAQIN = east(45.43, 34.35); // the Iraqi frontier town and railhead
const KERMANSHAH = east(47.07, 34.31);
const HAMADAN = east(48.51, 34.8);
const TEHRAN = east(51.39, 35.69);
const TABRIZ = east(46.29, 38.08);
const KASHAN = east(51.44, 33.98);
const ISFAHAN = east(51.67, 32.65);
const KERMAN = east(57.08, 30.28);
export const PERSIA_AT: Record<string, P> = { khanaqin: KHANAQIN, kermanshah: KERMANSHAH, hamadan: HAMADAN, tehran: TEHRAN, tabriz: TABRIZ, kashan: KASHAN, isfahan: ISFAHAN, kerman: KERMAN };

/** The roads, town to town, by the places they pass through. */
export const PERSIA_ROADS: { a: string; b: string; pts: P[] }[] = [
  // the Khanaqin road: Baqubah, then up the Diyala to the railhead
  { a: 'baghdad', b: 'khanaqin', pts: [BAGHDAD, east(44.65, 33.75), east(45.0, 34.1), KHANAQIN] },
  // over the frontier at Qasr-i Shirin, up the Paitak pass to Karand and Kermanshah
  { a: 'khanaqin', b: 'kermanshah', pts: [KHANAQIN, east(45.58, 34.52), east(45.86, 34.46), east(46.15, 34.4), east(46.24, 34.27), east(46.6, 34.25), KERMANSHAH] },
  // Bisitun, Kangavar and the Asadabad pass
  { a: 'kermanshah', b: 'hamadan', pts: [KERMANSHAH, east(47.43, 34.38), east(47.96, 34.5), east(48.12, 34.78), HAMADAN] },
  // the Avaj pass to Qazvin, then east along the foot of the Alborz
  { a: 'hamadan', b: 'tehran', pts: [HAMADAN, east(48.95, 35.2), east(49.2, 35.6), east(50.0, 36.27), east(50.7, 35.95), TEHRAN] },
  // north: Hamadan by Zanjan and Mianeh to Tabriz
  { a: 'hamadan', b: 'tabriz', pts: [HAMADAN, east(48.6, 35.5), east(48.48, 36.67), east(47.7, 37.42), east(47.0, 37.9), TABRIZ] },
  // and Tehran by Qazvin and Zanjan
  { a: 'tehran', b: 'tabriz', pts: [TEHRAN, east(50.7, 35.95), east(50.0, 36.27), east(49.2, 36.55), east(48.48, 36.67), east(47.7, 37.42), east(47.0, 37.9), TABRIZ] },
  // south: Qom, Kashan, Natanz, Isfahan
  { a: 'tehran', b: 'kashan', pts: [TEHRAN, east(51.2, 35.2), east(50.88, 34.64), KASHAN] },
  { a: 'kashan', b: 'isfahan', pts: [KASHAN, east(51.65, 33.5), east(51.55, 33.1), ISFAHAN] },
  // Nain, Yazd, Rafsanjan, Kerman
  { a: 'isfahan', b: 'kerman', pts: [ISFAHAN, east(53.08, 32.86), east(54.36, 31.9), east(56.0, 30.4), KERMAN] },
];

/** the passes on the roads where winter snow lies (December to the middle of March) */
export const SNOW_PASSES: (P & { name: string; r: number })[] = [
  { ...east(46.15, 34.4), name: 'the Paitak pass', r: 14 },
  { ...east(48.12, 34.78), name: 'the Asadabad pass', r: 12 },
  { ...east(49.2, 35.6), name: 'the Avaj pass', r: 12 },
  { ...east(47.7, 37.42), name: 'the Qaflankuh pass', r: 12 },
];

// ---- the ground, for the pathfinder and the drawing ----
/** the Zagros, north-west to south-east: a belt of closed mountains with hills along both sides */
export const ZAGROS: P[] = [{ x: 868, y: 140 }, { x: 880, y: 192 }, { x: 893, y: 228 }, { x: 912, y: 262 }, { x: 950, y: 300 }, { x: 992, y: 336 }, { x: 1042, y: 370 }, { x: 1100, y: 400 }, { x: 1160, y: 424 }, { x: 1240, y: 440 }];
export const ZAGROS_HW = 15;
/** the Alborz, along the south shore of the Caspian */
export const ALBORZ: P[] = [{ x: 930, y: 128 }, { x: 975, y: 150 }, { x: 1010, y: 166 }, { x: 1050, y: 176 }, { x: 1092, y: 182 }, { x: 1130, y: 178 }, { x: 1170, y: 172 }, { x: 1210, y: 176 }];
export const ALBORZ_HW = 8;
/** the hills of Azerbaijan round Tabriz and the ranges of the south-east */
export const HILLS: (P & { rx: number; ry: number })[] = [
  { x: 905, y: 110, rx: 40, ry: 40 }, { x: 1180, y: 300, rx: 30, ry: 50 }, { x: 1250, y: 400, rx: 30, ry: 40 },
];
/** the Caspian, the head of the Gulf and the sea beyond it */
export const CASPIAN: P[] = [{ x: 1000, y: 0 }, { x: 1020, y: 52 }, { x: 1008, y: 86 }, { x: 986, y: 116 }, { x: 994, y: 136 }, { x: 1010, y: 148 }, { x: 1050, y: 156 }, { x: 1100, y: 166 }, { x: 1150, y: 162 }, { x: 1156, y: 138 }, { x: 1128, y: 108 }, { x: 1114, y: 74 }, { x: 1126, y: 40 }, { x: 1112, y: 0 }];
export const GULF: P[] = [{ x: 860, y: 392 }, { x: 900, y: 390 }, { x: 950, y: 398 }, { x: 1005, y: 410 }, { x: 1062, y: 428 }, { x: 1120, y: 452 }, { x: 1180, y: 474 }, { x: 1230, y: 484 }, { x: 1265, y: 488 }, { x: 1265, y: 590 }, { x: 990, y: 590 }, { x: 960, y: 540 }, { x: 925, y: 498 }, { x: 860, y: 470 }];
/** the salt deserts: the Dasht-i Kavir and the Dasht-i Lut */
export const DESERTS: (P & { rx: number; ry: number; name: string })[] = [
  { ...east(53.6, 34.6), rx: 48, ry: 20, name: 'Dasht-i Kavir' },
  { ...east(58.0, 31.4), rx: 22, ry: 34, name: 'Dasht-i Lut' },
];

export function inPoly(p: P, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function distToLine(p: P, line: P[]) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}
const inEllipse = (p: P, e: P & { rx: number; ry: number }) => ((p.x - e.x) / e.rx) ** 2 + ((p.y - e.y) / e.ry) ** 2 <= 1;

/** The ground at a point east of the painting: 'w' water, 'm' mountains (closed), 'h' hills,
 *  'd' desert and the open plateau, 'f' the gardens and fields round a town. Roads are laid over this
 *  by the pathfinder. */
export function eastGround(p: P): 'w' | 'm' | 'h' | 'd' | 'f' {
  if (inPoly(p, CASPIAN) || inPoly(p, GULF)) return 'w';
  for (const id of Object.keys(PERSIA_AT)) if (Math.hypot(p.x - PERSIA_AT[id].x, p.y - PERSIA_AT[id].y) < 9) return 'f';
  // the Caspian shore is a strip of rice fields and forest below the mountains
  if (p.y < 175 && p.x > 990 && p.x < 1160 && distToLine(p, ALBORZ) > ALBORZ_HW && p.y < 168) return 'f';
  if (distToLine(p, ZAGROS) < ZAGROS_HW || distToLine(p, ALBORZ) < ALBORZ_HW) return 'm';
  if (distToLine(p, ZAGROS) < ZAGROS_HW + 12 || distToLine(p, ALBORZ) < ALBORZ_HW + 8 || HILLS.some((h) => inEllipse(p, h))) return 'h';
  return 'd';
}

/** Persia's side of the frontier: open ground here is shut to a merchant without the way open (see unlocks.ts) */
export const inPersia = (p: P) => p.x > PAINT_W - 4 || (p.x > 864 && p.y < 245 && p.y > 200);
