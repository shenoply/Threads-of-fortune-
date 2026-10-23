import { stallFigure } from '../components/StallEncounter/stallArt';
import { useGame } from './state/store';
import { BOOT_ART, BOOT_LATER, COLD_TITLES } from './bootArt';
import { CITY_WALKS } from '../data/cityWalks';
import { RUGS } from '../data/rugs';
import { rugThumb } from '../components/RugViewer/rugArt';
import { warmPaintedMap } from './systems/mapRender';
import { stallLayersSeen } from './feel';
import { START_WARDROBE, stallSrc } from '../data/wardrobe';
import { lookUps, sceneLayers } from './stallScenes';
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
export const buyerArt = (id: string) => [...new Set([stallFigure(id).src, `art/portraits/small/${id}.webp`, `art/portraits/${id}.jpg`])];
// (the small round face beside the buyer's name under the stall picture is the small/ copy: BuyerFace)

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
// (the first of them are the ones the loading screen waits for: src/game/bootArt.ts)
export const STALL_ART = [BOOT_ART[0], ...BOOT_LATER, ...BOOT_ART.slice(1), 'art/radio-stall-small.webp', 'art/newspaper-stall.webp', prop('prop-gramophone')];
// The rest, once the line is clear: the shelf dressing (a different pick each day). The paper held
// up to read and the stall seen from above wait for the first sale to be over.
const STALL_LATER = [...STALL_PROPS, 'art/radio-stall.webp']; // (the big wireless is for its own sheet, Radio.tsx)
const STALL_AFTER_SALE = ['art/newspaper-pov.jpg', 'art/opt/stall-top-1024.webp'];
export const CITY_ART = ['alexandria', 'jerusalem', 'damascus', 'amman', 'baghdad', 'istanbul'].map((c) => `art/world/city-${c}.jpg`);

// ---------- what the stall, the map and the towns show next ----------
// Started once from main.tsx. Each is a guess at the next screen, fetched in a quiet moment so it is
// there (and kept on the phone for the next visit) when the player gets to it.

/** The painting at the top of a town's menu (the same choice Settlement.tsx makes). */
export function townArt(id: string): string | null {
  if (id === 'giza') return 'art/world/giza-district.jpg';
  const walk = CITY_WALKS[id]?.map;
  if (walk) return walk;
  return CITY_ART.find((s) => s.endsWith(`/city-${id}.jpg`)) ?? null;
}
const swControlled = () => typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;

/** The title pictures known to be kept on the phone, so a later visit opens on one of them (vite.config's
 *  start-up script reads the same list) rather than on one that still has to come down the line. */
const TITLES_KEY = 'tof-titles-kept';
export function keepTitle(src: string) {
  try {
    const k: string[] = JSON.parse(localStorage.getItem(TITLES_KEY) || '[]');
    if (!k.includes(src)) localStorage.setItem(TITLES_KEY, JSON.stringify([...k, src].slice(-8)));
  } catch { /* private mode */ }
}
const keptTitles = (): string[] => { try { return JSON.parse(localStorage.getItem(TITLES_KEY) || '[]'); } catch { return []; } };

// ---------- the stall unpacked ahead ----------
// The stall is a dozen full-size layers; unpacking them all when the buyer walks up takes a phone a second
// or more (feel.ts holds the scene back until they are ready). So while the player is on the lane, they are
// unpacked one by one in quiet moments and held here, and the scene opens on pictures ready to paint.
// Which layers: the room, counter, merchant, wireless, paper and gramophone, the next buyer, and whatever
// else the stall was made of last time it was shown (feel.ts stallLayersSeen: the shelf as dressed).
const held = new Map<string, HTMLImageElement>();
let decoding = false;
const toDecode: string[] = [];
function decodeNext() {
  if (decoding) return;
  const src = toDecode.shift();
  if (!src) return;
  decoding = true;
  const im = new Image();
  im.decoding = 'async';
  held.set(src, im);
  const done = () => { decoding = false; idle(decodeNext); };
  im.onload = () => { (im.decode?.() ?? Promise.resolve()).catch(() => {}).finally(done); };
  im.onerror = () => { held.delete(src); done(); };
  im.src = src;
}
export function predecodeStall(buyerId?: string) {
  if (typeof Image === 'undefined') return;
  const worn = (useGame.getState().wardrobe ?? START_WARDROBE).worn;
  const fig = buyerId ? stallFigure(buyerId).src : '';
  // (people only as the next buyer: whoever stood at the counter last time is not coming back now)
  const person = (u: string) => /art\/portraits\//.test(u) && u !== fig;
  const want = [...new Set([...sceneLayers(lookUps(useGame.getState())), stallSrc(worn),
    ...(fig ? [fig] : []), 'art/radio-stall-small.webp', 'art/newspaper-stall.webp', prop('prop-gramophone'), ...stallLayersSeen()])]
    .filter((u) => !person(u) && !held.has(u) && !toDecode.includes(u));
  // a buyer who has been and gone is let go
  for (const [u] of held) if (person(u)) held.delete(u);
  toDecode.push(...want);
  idle(decodeNext);
}
/** Let go of the unpacked stall (away from Giza): the phone can have the memory back. */
function releaseStall() { held.clear(); toDecode.length = 0; }

let lookOn = false;
export function installLookahead() {
  if (lookOn || typeof window === 'undefined') return;
  lookOn = true;
  let at = '', dest = '', inv: unknown = null, nextBuyer: string | undefined = '-';
  const look = () => {
    const s = useGame.getState();
    if (!s.started) return;
    // on the lane at Giza: the stall and the next buyer unpacked ahead
    const nb = s.world?.at === 'giza' ? s.queue[s.visitIdx] ?? undefined : '-';
    if (nb !== nextBuyer) {
      nextBuyer = nb;
      if (nb === '-') releaseStall(); else window.setTimeout(() => predecodeStall(nb), 1500);
    }
    // the rugs on the shelf: their small pictures stand in the strip under the buyer
    if (s.inventory !== inv) {
      inv = s.inventory;
      preload(s.inventory.map((i) => RUGS[i.typeId]).filter(Boolean).map(rugThumb).filter((u) => u.startsWith('art/')), true);
    }
    // the town you are in, and the one you are bound for: its menu opens on its painting
    const here = s.world?.at ?? '';
    const to = s.journey?.dest ?? '';
    if (here !== at || to !== dest) {
      at = here; dest = to;
      preload([townArt(to), townArt(here)].filter((x): x is string => !!x), !!to);
    }
  };
  useGame.subscribe(look);
  look();
  // the world map: its small painting as soon as the stall is up (95 KB), so the map never opens on an
  // empty frame; the sharp one after the first sale, or at once when it is already kept on the phone
  // (and the stall seen from above, which the map shows in its round window over Giza)
  window.setTimeout(() => idle(() => { warmPaintedMap(swControlled()); preload(['art/opt/stall-top-1024.webp']); }), 4000);
  afterFirstSale(() => idle(() => {
    warmPaintedMap(true);
    // one more title picture for next time, the lightest ones first
    const have = keptTitles();
    const more = COLD_TITLES.find((t) => !have.includes(t));
    if (more) { const im = new Image(); im.onload = () => keepTitle(more); im.src = more; }
  }));
}
