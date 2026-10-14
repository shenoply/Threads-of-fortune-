// The stall's daily dressing: which prop stands on each shelf, and where Saffron sits today.
// One item per shelf/wall spot, each cut as a full 1536x1024 canvas already positioned in place,
// so a spot's chosen prop just layers as a full-bleed overlay on the stage. One is picked per spot,
// per day, deterministically (see dayPick) so the shelves look freshly dressed but stay put all day.
export const PROP_SPOTS: Record<string, string[]> = {
  'top-left': ['prop-clock', 'prop-lamp'],
  'top-mid': ['prop-vase', 'prop-photo'],
  'top-right': ['prop-astrolabe', 'prop-incense'],
  'mid-mid': ['prop-camera', 'prop-tawla', 'prop-telephone'],
  'bottom-left': ['prop-books', 'prop-cashbox'],
  'bottom-right': ['prop-hookah', 'prop-copper'],
  'above-shelves': ['prop-swords', 'prop-calligraphy', 'prop-prayerrug', 'prop-birdcage', 'prop-herbs'],
  hooks: ['prop-lanterns'],
};
export const CAT_VARIANTS: Record<string, { hideWhileRugOnCounter?: boolean; replaces?: string }> = {
  'cat-doorway': {},
  'cat-counter': { hideWhileRugOnCounter: true },
  'cat-topshelf': { replaces: 'top-right' },
  'cat-radio': { replaces: 'mid-mid' },
};
export const CAT_REPLACES: Record<string, string | undefined> = Object.fromEntries(Object.entries(CAT_VARIANTS).map(([k, v]) => [k, v.replaces]));

/** Deterministic day-seeded pick, so the shelf dressing changes daily but doesn't flicker mid-day. */
export function dayPick<T>(day: number, salt: string, options: T[]): T {
  let h = day * 2654435761;
  for (let i = 0; i < salt.length; i++) h = (h * 33 + salt.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

/** Today's shelf dressing and cat, as picture paths: fetched as soon as a game opens so the stall is
 *  fully dressed the moment it is seen, rather than filling in prop by prop. */
export function stallDressing(day: number): string[] {
  const cat = dayPick(day, 'cat', Object.keys(CAT_VARIANTS));
  const props = Object.entries(PROP_SPOTS).filter(([spot]) => spot !== CAT_REPLACES[cat]).map(([spot, o]) => dayPick(day, spot, o));
  return [...props, cat, 'prop-gramophone'].map((x) => `art/stall2/props/${x}.webp`);
}
