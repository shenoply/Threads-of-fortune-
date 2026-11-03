// The painted pieces that sit on the travel map (the artist's brief, "Threads of Fortune: map art brief", with its positions.csv), each
// under its code. A piece is drawn from public/art/map/<code>-<name>.webp (or .png) once that file is in
// the folder; until then the map draws a plain ink placeholder in its place. Nothing here needs changing
// when the paintings arrive: the build lists the folder (vite.config.ts, virtual:map-art-files) and
// setArtFiles() hands that list to the map.
// Positions are the brief's, in per cent of the map's width and height from the top-left corner.
import { MAP_W, MAP_H } from '../game/systems/world';

export type ArtKind = 'landmark' | 'ship' | 'wake' | 'caravan' | 'compass' | 'cartouche' | 'scale' | 'weather' | 'frame' | 'marker';
export type ShipKind = 'steamer' | 'cargo' | 'felucca' | 'dhow' | 'schooner' | 'small-steamer';
export type WeatherKind = 'cloud' | 'sandstorm' | 'birds';

export interface ArtItem {
  /** the brief's code: 01..33, S1..S10, C1..C5, K-compass-base, T, B, W1..W4, F-corner, M-city ... */
  code: string;
  /** the name part of the file the brief asks for (<code>-<name>.png) */
  name: string;
  kind: ArtKind;
  /** where it sits, in map units (absent for the frame corner and the markers) */
  x?: number;
  y?: number;
  /** the town (or road well) a landmark belongs to */
  town?: string;
  ship?: ShipKind;
  weather?: WeatherKind;
  /** camels in a caravan (for the placeholder) */
  camels?: number;
  /** the painting's size in pixels, as the brief asks */
  px: [number, number];
}

const P = (xp: number, yp: number) => ({ x: Math.round((xp / 100) * MAP_W * 10) / 10, y: Math.round((yp / 100) * MAP_H * 10) / 10 });

const L = (n: number, name: string, town: string, xp: number, yp: number): ArtItem =>
  ({ code: String(n).padStart(2, '0'), name, kind: 'landmark', town, px: [512, 512], ...P(xp, yp) });

export const LANDMARKS: ArtItem[] = [
  L(1, 'giza', 'giza', 21.1, 49.0),
  L(2, 'saqqara', 'saqqara', 21.0, 50.2),
  L(3, 'fayoum', 'fayoum', 20.6, 54.2),
  L(4, 'cairo', 'cairo', 21.9, 48.5),
  L(5, 'tanta', 'tanta', 20.8, 46.4),
  L(6, 'alexandria', 'alexandria', 17.7, 46.1),
  L(7, 'port-said', 'portsaid', 25.7, 46.1),
  L(8, 'suez', 'suez', 26.3, 50.4),
  L(9, 'st-catherine', 'sinai', 30.4, 55.7),
  L(10, 'tarabin', 'bedouin', 30.4, 46.8),
  L(11, 'jaffa', 'jaffa', 32.0, 42.9),
  L(12, 'jerusalem', 'jerusalem', 33.3, 43.4),
  L(13, 'beirut', 'beirut', 34.0, 36.3),
  L(14, 'damascus', 'damascus', 36.8, 37.9),
  L(15, 'amman', 'amman', 35.7, 42.8),
  L(16, 'aleppo', 'aleppo', 39.1, 26.5),
  L(17, 'konya', 'konya', 27.9, 18.3),
  L(18, 'constantinople', 'istanbul', 18.6, 5.1),
  L(19, 'angora', 'ankara', 28.7, 10.0),
  L(20, 'baghdad', 'baghdad', 54.2, 37.1),
  L(21, 'khanaqin', 'khanaqin', 56.8, 32.4),
  L(22, 'kermanshah', 'kermanshah', 60.4, 32.7),
  L(23, 'hamadan', 'hamadan', 63.0, 31.6),
  L(24, 'tehran', 'tehran', 68.8, 28.0),
  L(25, 'tabriz', 'tabriz', 59.6, 17.9),
  L(26, 'kashan', 'kashan', 69.1, 34.3),
  L(27, 'isfahan', 'isfahan', 69.8, 39.3),
  L(28, 'kerman', 'kerman', 82.5, 49.1),
  L(29, 'ajrud', 'well-ajrud', 25.9, 50.0),
  L(30, 'ayun-musa', 'well-ayun', 26.7, 51.0),
  L(31, 'wadi-feiran', 'well-feiran', 29.6, 55.3),
  L(32, 'bir-el-abd', 'well-abd', 28.2, 46.7),
  L(33, 'rutba', 'well-rutba', 46.2, 38.2),
];

const S = (n: number, name: string, ship: ShipKind, xp: number, yp: number): ArtItem =>
  ({ code: `S${n}`, name, kind: 'ship', ship, px: [768, 768], ...P(xp, yp) });
export const SHIPS: ArtItem[] = [
  S(1, 'steamer', 'steamer', 16.5, 36.2),
  S(2, 'cargo', 'cargo', 26.0, 40.4),
  S(3, 'felucca', 'felucca', 26.1, 71.0),
  S(4, 'dhow', 'dhow', 33.0, 65.1),
  S(5, 'dhow', 'dhow', 64.5, 53.5),
  S(6, 'schooner', 'schooner', 9.0, 17.7),
  S(7, 'cargo', 'cargo', 37.0, 76.6),
  S(8, 'dhow', 'dhow', 86.5, 74.1),
  S(9, 'steamer', 'small-steamer', 70.0, 14.0),
  S(10, 'steamer', 'steamer', 5.5, 34.6),
];
export const WAKE: ArtItem = { code: 'S-wake', name: '', kind: 'wake', px: [768, 768] };

const C = (n: number, camels: number, xp: number, yp: number): ArtItem =>
  ({ code: `C${n}`, name: 'caravan', kind: 'caravan', camels, px: [1024, 1024], ...P(xp, yp) });
export const CARAVANS: ArtItem[] = [C(1, 7, 45.0, 39.5), C(2, 4, 29.5, 49.0), C(3, 6, 41.0, 62.6), C(4, 5, 76.5, 46.1), C(5, 3, 14.5, 62.6)];

const K = P(10.0, 87.3);
export const COMPASS = {
  base: { code: 'K-compass-base', name: '', kind: 'compass', px: [1024, 1024], ...K } as ArtItem,
  needle: { code: 'K-compass-needle', name: '', kind: 'compass', px: [1024, 1024], ...K } as ArtItem,
  rim: { code: 'K-compass-rim', name: '', kind: 'compass', px: [1024, 1024], ...K } as ArtItem,
};
export const CARTOUCHE: ArtItem = { code: 'T', name: 'cartouche', kind: 'cartouche', px: [1536, 768], ...P(52.5, 89.0) };
export const SCALE_BAR: ArtItem = { code: 'B', name: 'scale', kind: 'scale', px: [1536, 256], ...P(52.5, 96.0) };

const W = (n: number, name: string, weather: WeatherKind, xp: number, yp: number): ArtItem =>
  ({ code: `W${n}`, name, kind: 'weather', weather, px: [1024, 1024], ...P(xp, yp) });
export const WEATHER: ArtItem[] = [W(1, 'cloud', 'cloud', 19.0, 17.7), W(2, 'cloud', 'cloud', 65.5, 24.7), W(3, 'sandstorm', 'sandstorm', 48.0, 70.8), W(4, 'seabirds', 'birds', 15.0, 41.6)];

export const FRAME_CORNER: ArtItem = { code: 'F-corner', name: '', kind: 'frame', px: [768, 768] };
export const MARKERS: ArtItem[] = (['city', 'port', 'camp', 'locked'] as const).map((m) => ({ code: `M-${m}`, name: '', kind: 'marker', px: [512, 512] }));

/** The sea, river and region names, written by the game in its own lettering at the brief's white-text spots. */
export interface MapLabel { text: string; x: number; y: number; kind: 'region' | 'sea' | 'river' | 'minor'; size?: number; rot?: number }
const T = (text: string, kind: MapLabel['kind'], xp: number, yp: number, size?: number, rot?: number): MapLabel => ({ text, kind, ...P(xp, yp), size, rot });
export const MAP_LABELS: MapLabel[] = [
  T('Mediterranean Sea', 'sea', 13.0, 32.5, 1.15),
  T('Aegean Sea', 'sea', 8.8, 21.8, 0.8),
  T('Black Sea', 'sea', 31.0, 1.2, 0.9),
  T('Sea of Marmara', 'sea', 16.5, 6.2, 0.6),
  T('Red Sea', 'sea', 39.5, 79.1, 0.95, 58),
  T('Gulf of Suez', 'sea', 25.0, 55.0, 0.55, 62),
  T('Gulf of Aqaba', 'sea', 32.0, 56.8, 0.55, 68),
  T('Dead Sea', 'sea', 35.0, 46.1, 0.5),
  T('Persian Gulf', 'sea', 68.0, 57.7, 0.95, 38),
  T('Gulf of Oman', 'sea', 88.0, 72.5, 0.8, 20),
  T('Caspian Sea', 'sea', 70.0, 11.5, 0.9),
  T('Lake Van', 'sea', 52.5, 13.6, 0.55),
  T('Lake Urmia', 'sea', 56.8, 20.6, 0.55),
  T('Nile', 'river', 23.5, 74.1, 1, 72),
  T('Euphrates', 'river', 46.5, 31.3, 1, 28),
  T('Tigris', 'river', 53.0, 32.9, 1, 48),
  T('EGYPT', 'region', 12.0, 67.5, 1.25),
  T('SINAI', 'region', 29.5, 54.4, 0.75),
  T('PALESTINE', 'region', 32.0, 39.5, 0.55, -58),
  T('SYRIA', 'region', 42.0, 33.8, 1),
  T('TRANSJORDAN', 'region', 38.0, 47.8, 0.7),
  T('ARABIA', 'region', 52.0, 67.5, 1.25),
  T('IRAQ', 'region', 54.0, 44.5, 1.1),
  T('PERSIA', 'region', 78.0, 34.6, 1.25),
  T('ANATOLIA', 'region', 23.5, 13.2, 1.1),
];

/** Every piece the brief asks for, in its order. */
export const MAP_ART: ArtItem[] = [...LANDMARKS, ...SHIPS, WAKE, ...CARAVANS, COMPASS.base, COMPASS.needle, COMPASS.rim, CARTOUCHE, SCALE_BAR, ...WEATHER, FRAME_CORNER, ...MARKERS];

/** The file the brief asks the artist for (the .png; a .webp of the same name is used first). */
export const expectedFile = (it: ArtItem) => `art/map/${it.name ? `${it.code}-${it.name}` : it.code}.png`;

// ---------- which paintings are in ----------
let files: string[] = [];
const subs = new Set<() => void>();
/** The file names found in public/art/map (from the build's listing). */
export function setArtFiles(list: readonly string[]) {
  files = [...list];
  subs.forEach((f) => f());
}
export const onArtFiles = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** every file the build found in public/art/map (with its subfolder: "ships/dhow.webp", "kit/01-palms.json") */
export const artFiles = (): readonly string[] => files;
/** The painting for a piece, if it is in the folder: its own name first, else any file under its code
 *  ("S3-felucca.png", "S3.png", "S3-nile-boat.webp"), WebP before PNG. */
export function artFile(code: string, name = ''): string | undefined {
  // only the paintings at the top of the folder (the ships/ sheets are found by shipSheet)
  const top = files.filter((f) => !f.includes('/'));
  const lc = top.map((f) => f.toLowerCase());
  const pick = (stem: string) => {
    for (const ext of ['.webp', '.png']) { const i = lc.indexOf(`${stem}${ext}`.toLowerCase()); if (i >= 0) return top[i]; }
    return undefined;
  };
  const own = (name && pick(`${code}-${name}`)) || pick(code);
  if (own) return `art/map/${own}`;
  const pre = `${code}-`.toLowerCase();
  // the compass parts are whole codes: "K-compass-base" must not take "K-compass-base-old"; others take any name
  const byCode = code.startsWith('K-') ? undefined : top.find((f, i) => lc[i].startsWith(pre) && /\.(webp|png)$/.test(lc[i]) && !/^k-/.test(lc[i]));
  return byCode ? `art/map/${byCode}` : undefined;
}
export const itemFile = (it: ArtItem) => artFile(it.code, it.name);

// ---------- the Blender ships: one sprite sheet per type, 16 headings ----------
// public/art/map/ships/<type>.webp (tools/blender-ships.py, then tools/ships-sheet.py): 16 square frames
// side by side, frame i the ship sailing i x 22.5 degrees clockwise from east on the ground (0 east,
// 4 south, 8 west, 12 north), seen from the south 48 degrees above the horizon with the sun in the
// north-west. The waterline centre of the ship sits at SHEET_ANCHOR of the frame.
export const SHIP_SHEET: Record<ShipKind, string> = {
  steamer: 'steamer', cargo: 'cargo', felucca: 'felucca', dhow: 'dhow', schooner: 'schooner', 'small-steamer': 'caspian',
};
export const SHEET_FRAMES = 16;
/** where the ship's waterline centre sits in a frame, as fractions of its width and height */
export const SHEET_ANCHOR = { x: 0.5, y: 0.594 } as const;
/** how far the ground is foreshortened in the sheets (the sine of the camera's 48 degrees) */
export const SHEET_TILT = Math.sin((48 * Math.PI) / 180);
/** The sprite sheet for a ship, if it is in the folder (WebP before PNG). */
export function shipSheet(it: ArtItem): string | undefined {
  if (!it.ship) return undefined;
  const t = SHIP_SHEET[it.ship];
  for (const ext of ['.webp', '.png']) { const f = files.find((n) => n.toLowerCase() === `ships/${t}${ext}`); if (f) return `art/map/${f}`; }
  return undefined;
}

// ---------- the painted ships (the artist's single pictures, one per type, facing right) ----------
// public/art/map/S<n>-<name>.webp (tools/map-overlays.py): the type's painting is shared by every ship of that type
// (S1 for S10, S2 for S7, S4 for S5 and S8). It is drawn facing its heading, mirrored for a westward leg, never
// turned more than a few degrees, so masts stay upright and the steamers' smoke trails astern.
export const SHIP_PAINT: Record<ShipKind, string> = { steamer: 'S1', cargo: 'S2', felucca: 'S3', dhow: 'S4', schooner: 'S6', 'small-steamer': 'S9' };
/** The painted ship for a type, if it is in the folder. */
export const shipPainting = (it: ArtItem) => (it.ship ? artFile(SHIP_PAINT[it.ship]) : undefined);
/** where the waterline centre sits in a painted ship, as fractions of its width and height */
export const PAINT_ANCHOR = { x: 0.5, y: 0.86 } as const;

// ---------- people near the towns (close in only) ----------
// public/art/map/people/<art>.webp: small painted groups standing beside a town or a road. Where each stands is
// worked out from what must stay clear (systems/mapOverlays.ts placePeople): never on water, a road or railway,
// a pin or a name, a landmark, or another group. `near` is a town (or road well); `road` puts the group beside
// the road from `near` to `to`, `at` of the way along.
export type PeopleArt = 'market-sellers' | 'town-walkers' | 'grain-merchants' | 'fishermen' | 'porters' | 'farmers' | 'plough' | 'soldiers' | 'guards' | 'camel-guide' | 'donkey-traveller' | 'horse-riders';
export interface PeopleSpot { art: PeopleArt; near: string; to?: string; at?: number; /** fishermen stand at the water's edge */ shore?: boolean }
export const PEOPLE: PeopleSpot[] = [
  { art: 'market-sellers', near: 'cairo' },
  { art: 'market-sellers', near: 'damascus' },
  { art: 'market-sellers', near: 'baghdad' },
  { art: 'market-sellers', near: 'isfahan' },
  { art: 'town-walkers', near: 'jerusalem' },
  { art: 'town-walkers', near: 'tehran' },
  { art: 'town-walkers', near: 'aleppo' },
  { art: 'grain-merchants', near: 'tanta' },
  { art: 'grain-merchants', near: 'hamadan' },
  { art: 'fishermen', near: 'alexandria', shore: true },
  { art: 'fishermen', near: 'beirut', shore: true },
  { art: 'porters', near: 'portsaid' },
  { art: 'porters', near: 'suez' },
  { art: 'farmers', near: 'fayoum' },
  { art: 'plough', near: 'tanta', to: 'cairo', at: 0.5 },
  { art: 'farmers', near: 'baghdad', to: 'khanaqin', at: 0.3 },
  { art: 'soldiers', near: 'khanaqin' },
  { art: 'guards', near: 'well-rutba' },
  { art: 'camel-guide', near: 'portsaid', to: 'bedouin', at: 0.55 },
  { art: 'camel-guide', near: 'damascus', to: 'baghdad', at: 0.62 },
  { art: 'donkey-traveller', near: 'jerusalem', to: 'amman', at: 0.4 },
  { art: 'horse-riders', near: 'ankara', to: 'konya', at: 0.3 },
  { art: 'horse-riders', near: 'aleppo', to: 'damascus', at: 0.3 },
];
