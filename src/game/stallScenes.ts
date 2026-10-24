// The stall's own painting: one per stall (the borrowed corner, the rug mat and the canopied stall at
// Giza; the shop in the Khan once you own it), and one per city shop (shown on that shop's page). Each
// is a 1536x1024 painting (art/stalls/<id>.webp) with a matching foreground (<id>-fg.webp): the same
// painting from the counter's back edge down, laid over the people so the counter hides where their
// pictures end. Everything placed on a painting is given in % of that canvas.

export interface Anchor {
  /** centre, in % of the canvas width */
  x: number;
  /** where the piece stands (its painted bottom), in % of the canvas height; with top, where it hangs from */
  y: number;
  /** its size against the old Giza shelf it was painted for (1 = as painted) */
  s: number;
  top?: boolean;
  /** stands on the counter, in front of the people */
  front?: boolean;
}

export interface StallScene {
  id: string;
  label: string;
  /** the counter's back edge, where hands rest, in % of the canvas height from the top */
  contact: number;
  /** top of the foreground layer (a few px above the edge, feathered), in % */
  fgTop: number;
  /** the painted blank board for the name over the stall: [left, top, right, bottom] in % */
  sign: [number, number, number, number];
  /** a lighter board takes dark lettering */
  signDark?: boolean;
  /** lantern flames, as fractions of the canvas (Atmosphere flickers them) */
  lamps?: string;
  /** an open-air stall: the hour and the weather tint the sky and the view (masks art/stalls/<id>-sky|land|open.png) */
  sky?: boolean;
  /** where each dressing spot's piece stands in this painting; a spot not listed has no place here */
  spots: Record<string, Anchor>;
  /** the fixed things: the gramophone, the radio, the morning paper */
  gramophone?: Anchor;
  radio: Anchor;
  paper: Anchor;
  /** Saffron's places in this painting, by pose */
  cat: Record<string, Anchor>;
}

const px = (y: number) => Math.round((1024 * y) / 100) - 3;
const fg = (c: number) => (px(c) / 1024) * 100;

/** pieces on the counter top: they stand a little in front of the back edge */
function onCounter(c: number, x: number, s = 1.15): Anchor { return { x, y: c + 2.2, s, front: true }; }

function scene(id: string, label: string, contact: number, sign: StallScene['sign'], rest: Partial<StallScene> = {}): StallScene {
  return {
    id, label, contact, fgTop: fg(contact), sign,
    spots: {},
    radio: { x: 37, y: contact + 2.4, s: 1, front: true },
    paper: { x: 50, y: contact + 6.5, s: 1, front: true },
    cat: COUNTER_CAT(contact),
    ...rest,
  };
}

/** Saffron on the counter, her tail over its front */
const COUNTER_CAT = (c: number): Record<string, Anchor> => ({ 'cat-counter': { x: 51.8, y: c + 10, s: 1, front: true } });

const B = 64.6, M = 62.3, Z = 62.0, K = 57.8;

export const STALL_SCENES: Record<string, StallScene> = {
  // the three Giza stalls, poorest first
  'giza-borrowed': scene('giza-borrowed', 'Giza · a borrowed corner', B, [38.5, 5.2, 60.6, 14.6], {
    sky: true,
    // a poor pitch: what he has stands on the crates, on the sand behind them and on the plank rack
    spots: {
      hooks: { x: 31, y: 8, s: 0.75, top: true },
      'above-shelves': { x: 88, y: 19, s: 0.55, top: true },
      'top-left': onCounter(B, 31.5, 1.05),
      'top-mid': onCounter(B, 66.5, 0.95),
      'top-right': { x: 91, y: 47.6, s: 0.8 },
      'mid-mid': { x: 91, y: 57.5, s: 0.8 },
      'bottom-left': onCounter(B, 43, 0.95),
      'bottom-right': { x: 35.5, y: 62.5, s: 0.8 },
    },
    gramophone: onCounter(B, 61, 1.05),
    cat: { ...COUNTER_CAT(B), 'cat-doorway': { x: 56, y: 61, s: 0.8 } },
  }),
  'giza-mat': scene('giza-mat', 'Giza · the rug mat', M, [42.8, 2.6, 57.5, 18.6], {
    sky: true, signDark: true,
    spots: {
      hooks: { x: 33, y: 6.5, s: 0.7, top: true },
      'above-shelves': { x: 66, y: 6, s: 0.55, top: true },
      'bottom-right': { x: 40.5, y: 61, s: 0.8 },
      'top-mid': { x: 49.5, y: 48.8, s: 0.8 },
      'top-right': { x: 70, y: 45.3, s: 0.85 },
      'mid-mid': { x: 57, y: 48.8, s: 0.75 },
      'top-left': onCounter(M, 31.5, 1.05),
      'bottom-left': onCounter(M, 43, 0.95),
    },
    gramophone: onCounter(M, 61, 1.05),
    cat: { ...COUNTER_CAT(M), 'cat-doorway': { x: 47, y: 60, s: 0.8 } },
  }),
  'giza-bazaar': scene('giza-bazaar', 'Giza · the bazaar stall', Z, [36.5, 6.6, 63.8, 16.6], {
    sky: true, lamps: '0.035,0.15;0.935,0.15',
    spots: {
      hooks: { x: 57, y: 17.5, s: 0.6, top: true },
      'above-shelves': { x: 30.5, y: 26, s: 0.55 },
      'top-left': onCounter(Z, 31.5, 1.05),
      'top-mid': { x: 66.6, y: 28.5, s: 0.62 },
      'top-right': { x: 66.6, y: 38, s: 0.62 },
      'mid-mid': { x: 66.6, y: 47, s: 0.62 },
      'bottom-left': onCounter(Z, 43, 0.95),
      'bottom-right': { x: 66.6, y: 57.2, s: 0.62 },
    },
    gramophone: onCounter(Z, 61, 1.05),
    cat: { ...COUNTER_CAT(Z), 'cat-doorway': { x: 47, y: 59, s: 0.62 } },
  }),
  // the shop in the Khan el-Khalili (the 'khan' stall), and the shops in other cities
  cairo: scene('cairo', 'Cairo · Khan el-Khalili', K, [40.8, 8.6, 60.2, 13.3], {
    lamps: '0.118,0.13;0.258,0.15;0.5,0.04;0.87,0.1;0.733,0.17',
    spots: {
      'above-shelves': { x: 50, y: 27, s: 0.5 },
      'top-mid': { x: 39, y: 44.5, s: 0.55 },
      'mid-mid': { x: 44.5, y: 46.5, s: 0.55 },
      'top-right': { x: 61, y: 45, s: 0.55 },
      'bottom-right': { x: 56, y: 47.5, s: 0.55 },
      'top-left': onCounter(K, 31.5, 1.05),
      'bottom-left': onCounter(K, 43, 0.95),
    },
    gramophone: onCounter(K, 61, 1.05),
    cat: { ...COUNTER_CAT(K), 'cat-doorway': { x: 50, y: 55.5, s: 0.6 } },
  }),
  alexandria: scene('alexandria', 'Alexandria · Souq el-Attarin', 60.5, [34.3, 2, 62, 9.6]),
  portsaid: scene('portsaid', 'Port Said · Rue du Commerce', 63.9, [38.8, 2.5, 60.6, 11.6], { signDark: true }),
  jaffa: scene('jaffa', 'Jaffa · the clock tower', 62.0, [42.5, 1.6, 65, 9.6], { signDark: true }),
  jerusalem: scene('jerusalem', 'Jerusalem · Jaffa Gate', 62.3, [40.5, 2.4, 60.7, 16.8]),
  beirut: scene('beirut', 'Beirut · Souq Tawileh', 63.2, [39.8, 2.6, 60.4, 11.2], { signDark: true }),
  damascus: scene('damascus', 'Damascus · Souq al-Hamidiyya', 61.2, [37.6, 1.2, 62.4, 11.4], { signDark: true }),
  aleppo: scene('aleppo', 'Aleppo · the covered souq', 60.6, [41.5, 7.2, 58.5, 15.4], { signDark: true }),
  amman: scene('amman', 'Amman · below the citadel', 64.0, [40.8, 6.2, 59.7, 16.4]),
  baghdad: scene('baghdad', 'Baghdad · Souq al-Saray', 62.0, [39.6, 1.2, 57.6, 13.6], { signDark: true }),
  istanbul: scene('istanbul', 'Constantinople · the Grand Bazaar', 64.5, [38.6, 3, 61.6, 11.5], { signDark: true }),
  ankara: scene('ankara', 'Ankara · the Assembly quarter', 58.3, [35.6, 6.8, 64.4, 14.8]),
};

/** the painting you trade in: the stall you hold now */
export const sceneIdFor = (upgrades: string[]) =>
  upgrades.includes('khan') ? 'cairo' : upgrades.includes('bazaar') ? 'giza-bazaar' : upgrades.includes('mat') ? 'giza-mat' : 'giza-borrowed';
export const stallSceneFor = (upgrades: string[]) => STALL_SCENES[sceneIdFor(upgrades)];
/** the stalls you can show your goods in: every one you have had, the old ones too */
export const LOOKS: { id: string; ups: string[]; name: string; needs?: string }[] = [
  { id: 'giza-borrowed', ups: [], name: 'The borrowed corner' },
  { id: 'giza-mat', ups: ['mat'], name: 'A rug mat of your own', needs: 'mat' },
  { id: 'giza-bazaar', ups: ['mat', 'bazaar'], name: 'The bazaar stall', needs: 'bazaar' },
  { id: 'cairo', ups: ['mat', 'bazaar', 'khan'], name: 'The Khan shop', needs: 'khan' },
];
/** the upgrades the stall looks like it has: the one you chose to show, or the newest you own */
export const lookUps = (s: { upgrades?: string[]; stallLook?: string }): string[] => {
  const up = s.upgrades ?? [];
  const l = LOOKS.find((x) => x.id === s.stallLook);
  return l && (!l.needs || up.includes(l.needs)) ? l.ups : up;
};

export const sceneImg = (id: string) => `art/stalls/${id}.webp`;
export const sceneSmall = (id: string) => `art/stalls/${id}-768.webp`;
export const sceneFg = (id: string) => `art/stalls/${id}-fg.webp`;
/** the two pictures the stall needs before anyone can stand at it */
export const sceneLayers = (upgrades: string[]) => { const id = sceneIdFor(upgrades); return [sceneImg(id), sceneFg(id)]; };

/** The painted extent of each full-canvas cut-out (art/stall2/props), in % of the canvas, measured from
 *  its alpha: [left, top, right, bottom]. */
export const PROP_BOX: Record<string, [number, number, number, number]> = {
  'cat-counter': [45.12, 53.42, 58.53, 87.4],
  'cat-doorway': [51.5, 62.21, 63.48, 68.85],
  'cat-radio': [40.43, 23.05, 46.94, 34.18],
  'cat-topshelf': [41.93, 10.35, 50.91, 21.19],
  'prop-astrolabe': [45.05, 7.81, 51.24, 20.31],
  'prop-birdcage': [36.91, 8.3, 43.29, 24.02],
  'prop-books': [27.73, 35.84, 39.13, 46.78],
  'prop-calligraphy': [29.43, 7.42, 48.11, 20.12],
  'prop-camera': [35.42, 24.8, 43.23, 33.79],
  'prop-cashbox': [25.2, 40.62, 33.01, 46.78],
  'prop-clock': [27.34, 10.35, 32.1, 21.48],
  'prop-copper': [39.32, 38.96, 52.15, 46.78],
  'prop-gramophone': [26.43, 23.05, 35.48, 33.79],
  // the level, low record player from the Blender pack (on the base painting's upper shelf)
  'prop-turntable': [25.2, 10.35, 51.17, 20.02],
  'prop-herbs': [33.07, 4.1, 47.01, 20.31],
  'prop-hookah': [43.62, 33.89, 51.43, 47.27],
  'prop-incense': [45.44, 13.38, 49.74, 20.7],
  'prop-lamp': [26.37, 8.98, 32.49, 21.78],
  'prop-lanterns': [28.26, 8.3, 50.07, 17.77],
  'prop-photo': [35.35, 11.13, 42.9, 20.7],
  'prop-prayerrug': [35.87, 7.71, 42.9, 19.24],
  'prop-swords': [30.21, 6.93, 47.59, 20.7],
  'prop-tawla': [36.98, 24.32, 43.03, 33.89],
  'prop-telephone': [27.28, 22.85, 33.33, 33.59],
  'prop-vase': [34.96, 7.81, 39.06, 20.41],
};

/** the cut-out's name from its picture's path (art/stall2/props/<name>.webp) */
export const propKey = (src: string) => src.replace(/^.*\//, '').replace(/\.webp$/, '');

/** Where a full-canvas cut-out goes so its painted part stands at this anchor: the whole canvas,
 *  scaled by the anchor's size and shifted, as left/top/width/height in % of the stage. Null when the
 *  cut-out's extent is not known (a piece without a measured picture is not drawn). */
export function placeStyle(src: string, a: Anchor): { left: string; top: string; width: string; height: string } | null {
  const b = PROP_BOX[propKey(src)];
  if (!b) return null;
  const [l, t, r, bt] = b;
  const cx = (l + r) / 2;
  const left = a.x - cx * a.s;
  const top = a.top ? a.y - t * a.s : a.y - bt * a.s;
  return { left: `${left}%`, top: `${top}%`, width: `${100 * a.s}%`, height: `${100 * a.s}%` };
}

/** where an anchored piece takes up room on the canvas: [left, top, right, bottom] in % (for tap targets) */
export function placedRect(src: string, a: Anchor): [number, number, number, number] | null {
  const b = PROP_BOX[propKey(src)];
  if (!b) return null;
  const [l, t, r, bt] = b;
  const w = (r - l) * a.s, h = (bt - t) * a.s;
  const top = a.top ? a.y : a.y - h;
  return [a.x - w / 2, top, a.x + w / 2, top + h];
}

/** Spots whose pieces have no picture yet (the kilims, the tray, the bench...) and the sign, which is
 *  painted on every stall's board: every stall has them. Where the Dress your stall screen marks them. */
const UNPAINTED: Record<string, (sc: StallScene) => [number, number]> = {
  sign: (sc) => [(sc.sign[0] + sc.sign[2]) / 2, (sc.sign[1] + sc.sign[3]) / 2],
  floor: (sc) => [50, sc.contact - 4],
  table: (sc) => [42, sc.contact - 9],
  seat: (sc) => [58, sc.contact - 7],
  wall: (sc) => [14, 40],
  curtain: (sc) => [84, 30],
};
export const unpaintedSpot = (id: string) => !!UNPAINTED[id];
export const markAt = (sc: StallScene, id: string): [number, number] | null => UNPAINTED[id]?.(sc) ?? null;

/** Saffron's place for a pose in this painting: her own place for it, or (on the top shelf, by the
 *  radio) where the piece she takes the place of would stand; none, and she sits on the counter */
export function catAt(sc: StallScene, pose: string): { pose: string; at: Anchor } {
  const own = sc.cat[pose] ?? (pose === 'cat-topshelf' ? sc.spots['top-right'] : pose === 'cat-radio' ? sc.spots['mid-mid'] : undefined);
  return own ? { pose, at: own } : { pose: 'cat-counter', at: sc.cat['cat-counter'] };
}
