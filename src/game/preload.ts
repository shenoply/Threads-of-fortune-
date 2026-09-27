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
export const buyerArt = (id: string) => [`art/portraits/${id}.jpg`, `art/portraits/${id}-stall.webp`];

export const STALL_ART = ['art/stall-seller.jpg', 'art/stall-samira-v2.jpg', 'art/saffron-stall.webp', 'art/radio-stall.webp', 'art/newspaper-pov.jpg', 'art/world/giza-district.jpg', 'art/world/stall-top.jpg'];
export const CITY_ART = ['alexandria', 'jerusalem', 'damascus', 'amman', 'baghdad', 'istanbul'].map((c) => `art/world/city-${c}.jpg`);
