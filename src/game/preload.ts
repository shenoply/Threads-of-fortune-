// Warm the browser cache for paintings the player is about to see: one at a time, in idle moments,
// so a scene opens with its picture already there instead of popping in.
const seen = new Set<string>();
const queue: string[] = [];
let busy = false;

const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 150);
};

function next() {
  if (busy) return;
  const src = queue.shift();
  if (!src) return;
  busy = true;
  const im = new Image();
  im.decoding = 'async';
  const done = () => { busy = false; idle(next); };
  im.onload = done;
  im.onerror = done;
  im.src = src;
}

/** Queue pictures to fetch ahead of time; `soon` puts them at the front. */
export function preload(srcs: string[], soon = false) {
  const fresh = srcs.filter((s) => !seen.has(s));
  fresh.forEach((s) => seen.add(s));
  if (soon) queue.unshift(...fresh); else queue.push(...fresh);
  idle(next);
}

/** A buyer's pictures, at the exact addresses the stall scene asks for. */
export const buyerArt = (id: string) => [`art/portraits/${id}.jpg`, `art/portraits/${id}-stall.webp`, `art/portraits/${id}-stall2.webp`];

const STALL_PROPS = [
  'prop-clock', 'prop-lamp', 'prop-vase', 'prop-photo', 'prop-astrolabe', 'prop-incense',
  'prop-gramophone', 'prop-telephone', 'prop-camera', 'prop-tawla', 'prop-books', 'prop-cashbox',
  'prop-hookah', 'prop-copper', 'prop-swords', 'prop-calligraphy', 'prop-prayerrug', 'prop-birdcage',
  'prop-herbs', 'prop-lanterns', 'cat-doorway', 'cat-counter', 'cat-topshelf', 'cat-radio',
].map((p) => `art/stall2/props/${p}.webp`);

// the map and the stall-idle bottom sheet are the two full screens the player bounces between
// most, so their backgrounds go first — otherwise they're the ones caught mid-fetch when you
// jump straight to them
export const STALL_ART = ['art/world/giza-district.jpg', 'art/stall-empty.webp', 'art/stall2/stall-empty-patched.webp', 'art/counter-stall.webp', 'art/hero/hero-base-stall.webp', 'art/portraits/samira-stall2.webp', 'art/radio-stall.webp', 'art/newspaper-pov.jpg', 'art/world/stall-top.jpg', ...STALL_PROPS];
export const CITY_ART = ['alexandria', 'jerusalem', 'damascus', 'amman', 'baghdad', 'istanbul'].map((c) => `art/world/city-${c}.jpg`);
