import { stallFigure } from '../components/StallEncounter/stallArt';
import { useGame } from './state/store';
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

// pictures wanted only after the first screens are in: queued once everything asked for "now" has
// loaded, so on a slow phone they never compete with the stall and the first buyer
const later: string[] = [];

// pictures that are only needed once the first sale is over (the paper held up to read, the stall
// from above): held back until the first buyer has been served, or 20 s have passed, so on a slow
// phone line they do not share it with the buyer's pictures
const afterSale: string[] = [];
let saleDone = false;
const saleWaiters: (() => void)[] = [];
let saleWatch = false;
function watchSale() {
  if (saleWatch || typeof window === 'undefined') return;
  saleWatch = true;
  const served = () => { const s = useGame.getState(); return s.day > 1 || s.visitIdx > 0; };
  const release = () => {
    if (saleDone) return;
    saleDone = true;
    unsub(); clearTimeout(timer);
    saleWaiters.splice(0).forEach((f) => f());
    idle(next);
  };
  const unsub = useGame.subscribe(() => { if (served()) release(); });
  const timer = window.setTimeout(release, 20000);
  if (served()) release();
}
/** Runs `fn` once the first buyer of the game has been served (or 20 s after asking), at once if that is past. */
export function afterFirstSale(fn: () => void) {
  if (saleDone) return fn();
  saleWaiters.push(fn);
  watchSale();
}

function next() {
  if (busy) return;
  if (!queue.length && saleDone && afterSale.length) later.push(...afterSale.splice(0));
  if (!queue.length && later.length) queue.push(...later.splice(0).filter((s) => !seen.has(s) && (seen.add(s), true)));
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
  // the stall's first screens are asked for: the rest of the stall's pictures follow when the line is clear
  if (srcs.includes(STALL_ART[0])) {
    later.push(...STALL_LATER.filter((s) => !seen.has(s) && !later.includes(s)));
    afterSale.push(...STALL_AFTER_SALE.filter((s) => !seen.has(s) && !afterSale.includes(s)));
    watchSale();
  }
  const fresh = srcs.filter((s) => !seen.has(s));
  fresh.forEach((s) => seen.add(s));
  if (soon) queue.unshift(...fresh); else queue.push(...fresh);
  idle(next);
}

/** A buyer's pictures, at the exact addresses the stall scene asks for: the figure at the counter
 *  (stallFigure picks one of -stall2 / -stall / the framed portrait) and the round face, which the
 *  stall and the district both draw from the .jpg. */
export const buyerArt = (id: string) => [...new Set([stallFigure(id).src, `art/portraits/${id}.jpg`])];

const prop = (p: string) => `art/stall2/props/${p}.webp`;
const STALL_PROPS = [
  'prop-clock', 'prop-lamp', 'prop-vase', 'prop-photo', 'prop-astrolabe', 'prop-incense',
  'prop-telephone', 'prop-camera', 'prop-tawla', 'prop-books', 'prop-cashbox',
  'prop-hookah', 'prop-copper', 'prop-swords', 'prop-calligraphy', 'prop-prayerrug', 'prop-birdcage',
  'prop-herbs', 'prop-lanterns', 'cat-doorway', 'cat-counter', 'cat-topshelf', 'cat-radio',
].map(prop);

// What the first stall screens show, fetched now: the district (its small copy first) and the idle stall (the two full
// screens the player bounces between), then the stall scene the first buyer walks into: stage,
// counter, the merchant, the wireless, the paper and the gramophone that is always on the shelf.
// The first buyer's own pictures come from buyerArt.
export const STALL_ART = ['art/world/giza-district-small.webp', 'art/world/giza-district.jpg', 'art/stall-empty.webp', 'art/stall2/stall-empty-patched.webp', 'art/counter-stall.webp', 'art/hero/outfits/classic-stall-stall.webp', 'art/radio-stall.webp', 'art/newspaper-stall.webp', prop('prop-gramophone')];
// The rest, once the line is clear: the shelf dressing (a different pick each day). The paper held
// up to read and the stall seen from above wait for the first sale to be over.
const STALL_LATER = STALL_PROPS;
const STALL_AFTER_SALE = ['art/newspaper-pov.jpg', 'art/world/stall-top.jpg'];
export const CITY_ART = ['alexandria', 'jerusalem', 'damascus', 'amman', 'baghdad', 'istanbul'].map((c) => `art/world/city-${c}.jpg`);
