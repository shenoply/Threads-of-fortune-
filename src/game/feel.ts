// How the game feels in the hand: a short buzz on the important moments (Android only, and only if the
// player wants it), numbers that roll to their new value, pictures that fade in once they have arrived,
// and the next screens fetched quietly while the player looks at the map.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fmt } from './economy/money';

const VIB_KEY = 'tof-vibrate';
const hasWindow = typeof window !== 'undefined';
export const reducedMotion = () => hasWindow && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------- vibration ----------
let vibOn = (() => { try { return !hasWindow || localStorage.getItem(VIB_KEY) !== '0'; } catch { return true; } })();
const vibSubs = new Set<() => void>();
export const vibrationOn = () => vibOn;
export function setVibration(on: boolean) {
  vibOn = on;
  try { localStorage.setItem(VIB_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  vibSubs.forEach((f) => f());
  if (on) buzz(15);
}
export const useVibration = () => useSyncExternalStore((f) => { vibSubs.add(f); return () => { vibSubs.delete(f); }; }, vibrationOn, () => true);
export const canVibrate = () => hasWindow && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let lastBuzz = 0;
/** A short buzz, if the phone can and the player has not switched it off. Close repeats are dropped. */
export function buzz(ms = 18) {
  if (!vibOn || !canVibrate()) return;
  const now = Date.now();
  if (now - lastBuzz < 150) return;
  lastBuzz = now;
  try { navigator.vibrate(ms); } catch { /* not allowed before a tap */ }
}
// the sounds that mark an important moment: a sale or a purchase (coins), a mission or upgrade (chest), the hammer
const SFX_BUZZ: Record<string, number> = { sold: 25, soldBig: 35, stamp: 20, coins: 15, coin: 12, chest: 22, gavel: 20, volley: 30, melee: 35, shot: 15 };
export const buzzFor = (sfx: string) => { const ms = SFX_BUZZ[sfx]; if (ms) buzz(ms); };

// ---------- rolling numbers ----------
/** Rolls a shown number to its new value over `ms`; `dir` is 1 while it rises, -1 while it falls. */
export function useTween(value: number, ms = 400) {
  const [shown, setShown] = useState(value);
  const [dir, setDir] = useState(0);
  const from = useRef(value);
  const cur = useRef(value);
  useEffect(() => {
    if (value === cur.current) return;
    const start = cur.current;
    from.current = start;
    setDir(value > start ? 1 : -1);
    const done = window.setTimeout(() => setDir(0), ms + 450);
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      cur.current = value; setShown(value);
      return () => window.clearTimeout(done);
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const v = k >= 1 ? value : Math.round(start + (value - start) * e);
      cur.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(done); cur.current = value; setShown(value); };
  }, [value, ms]);
  return { shown, dir };
}

// ---------- screen entrances ----------
/** A short fade-and-rise on the element's children when `key` changes (the bottom tabs). */
export function useEnterAnimation(ref: { current: HTMLElement | null }, key: unknown) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = ref.current;
    if (!el || reducedMotion() || typeof el.animate !== 'function') return;
    for (const c of Array.from(el.children) as HTMLElement[]) {
      const cs = getComputedStyle(c);
      if (cs.position === 'fixed' || cs.display === 'none') continue;
      // a screen holding a fixed panel only fades: a transform would make the panel move with it
      const lift = !c.querySelector('.overlay, [role=dialog], .stall-sheet');
      c.animate(
        lift ? [{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }] : [{ opacity: 0 }, { opacity: 1 }],
        { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)' },
      );
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------- pictures ----------
/** Marks each picture once it has arrived and been decoded (or failed), so feel.css can fade it in.
 *  Installed once. The listener sits on the document: a picture's load event never reaches the window
 *  (so before, every faded picture waited for feel.css's 1.6 s fallback however quick its download).
 *  Waiting for decode() as well starts the fade on a picture ready to paint, not on one the phone is
 *  still unpacking (a blank frame, then a pop). */
export function installImageFade() {
  if (!hasWindow) return;
  const ok = (t: HTMLImageElement) => t.classList.add('ff-ok');
  document.addEventListener('load', (e) => {
    const t = e.target as HTMLImageElement | null;
    if (!t || t.tagName !== 'IMG' || t.classList.contains('ff-ok')) return;
    if (typeof t.decode !== 'function') return ok(t);
    t.decode().catch(() => {}).finally(() => ok(t));
  }, true);
  document.addEventListener('error', (e) => { const t = e.target as HTMLImageElement | null; if (t && t.tagName === 'IMG') ok(t); }, true);
  installCompose();
}

/** A canvas about to be redrawn with a better copy of its picture (a painted map whose sharp copy has
 *  just come in): what it shows now is laid over it as a still and faded out, so the change is a short
 *  dissolve, not a blink. Cheap: one copy of the canvas and a CSS fade, the map itself is drawn once. */
export function crossfadeCanvas(c: HTMLCanvasElement, ms = 420) {
  if (!hasWindow || reducedMotion() || !c.isConnected || !c.parentElement || !c.width || !c.height) return;
  const o = document.createElement('canvas');
  o.width = c.width; o.height = c.height;
  const x = o.getContext('2d');
  if (!x) return;
  try { x.drawImage(c, 0, 0); } catch { return; }
  const cs = getComputedStyle(c);
  Object.assign(o.style, {
    position: 'absolute', left: `${c.offsetLeft}px`, top: `${c.offsetTop}px`, width: `${c.offsetWidth}px`, height: `${c.offsetHeight}px`,
    transform: cs.transform === 'none' ? '' : cs.transform, transformOrigin: cs.transformOrigin, zIndex: cs.zIndex === 'auto' ? '' : cs.zIndex,
    pointerEvents: 'none', transition: `opacity ${ms}ms ease-out`,
  });
  o.setAttribute('aria-hidden', 'true');
  c.after(o);
  requestAnimationFrame(() => requestAnimationFrame(() => { o.style.opacity = '0'; }));
  window.setTimeout(() => o.remove(), ms + 120);
}

// ---------- scenes shown whole ----------
// A painted scene built from layers (the stall: the room, the shelf props, the merchant, the buyer, the
// counter, the wireless, the paper, the cat) is held back until every layer present when it opens is
// downloaded and decoded, then shown in one short fade, instead of each layer popping in on its own.
// Meanwhile a tiny blurred copy of the room stands in (feel.css), so the frame is never empty and nothing
// jumps. A layer still not in after MAX_WAIT (a very slow line) does not hold the rest back: the scene
// shows and that layer fades in by itself when it comes (installImageFade).
// It works on the page as drawn, so the scenes need no change: a scene is found by its selector.
const COMPOSE = ['.scene.stall > .stage'];
const LAYERS_KEY = 'tof-stall-layers';
/** The pictures the stall was last made of (its shelf, the merchant, the counter...), as last shown. */
export function stallLayersSeen(): string[] { try { return JSON.parse(localStorage.getItem(LAYERS_KEY) || '[]'); } catch { return []; } }
const MAX_WAIT = 2600;
const ready = (im: HTMLImageElement): Promise<void> => {
  const dec = () => (typeof im.decode === 'function' ? im.decode().catch(() => {}) : Promise.resolve());
  if (im.complete) return im.naturalWidth ? dec() : Promise.resolve();
  return new Promise<void>((res) => {
    const done = () => { im.removeEventListener('load', done); im.removeEventListener('error', done); res(); };
    im.addEventListener('load', done); im.addEventListener('error', done);
  }).then(dec);
};
function compose(el: HTMLElement) {
  if (el.dataset.cmp) return;
  el.dataset.cmp = 'wait';
  const t0 = performance.now();
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    el.querySelectorAll('img').forEach((im) => { if (im.complete) im.classList.add('ff-ok'); });
    // all of it already on the phone and unpacked at once: no fade (it would only slow a scene that is there)
    el.dataset.cmp = performance.now() - t0 < 120 ? 'now' : 'ready';
    el.dataset.cmpMs = String(Math.round(performance.now() - t0));
    // what it was made of, so the next time can be unpacked ahead (preload.ts predecodeStall)
    try { localStorage.setItem(LAYERS_KEY, JSON.stringify([...new Set([...el.querySelectorAll('img')].map((im) => im.getAttribute('src') || '').filter((u) => u.startsWith('art/')))].slice(0, 40))); } catch { /* private mode */ }
  };
  // the layers present now and any added in the same moment (the buyer, the props of the day)
  requestAnimationFrame(() => {
    Promise.all([...el.querySelectorAll('img')].map(ready)).then(show);
    window.setTimeout(show, MAX_WAIT);
  });
}
let composeOn = false;
function installCompose() {
  if (composeOn || typeof MutationObserver === 'undefined') return;
  composeOn = true;
  const sel = COMPOSE.join(',');
  const scan = (n: Node) => {
    if (n.nodeType !== 1) return;
    const e = n as HTMLElement;
    if (e.matches(sel)) compose(e);
    e.querySelectorAll<HTMLElement>(sel).forEach(compose);
  };
  new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(scan); }).observe(document.documentElement, { childList: true, subtree: true });
}

// ---------- prefetch ----------
// the screens a player in a town opens next; the same import() calls the lazy screens use, so the
// chunks land in the cache and open at once
const NEXT_SCREENS: (() => Promise<unknown>)[] = [
  () => import('../components/Malek/MalekShop'),
  () => import('../components/Cafe/CafeTable'),
  () => import('../components/World/TelegraphOffice'),
  () => import('../components/Calendar/Calendar'),
];
let prefetched = false;
export function prefetchNextScreens() {
  if (prefetched || !hasWindow) return;
  prefetched = true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const idle = (f: () => void) => { const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }; if (w.requestIdleCallback) w.requestIdleCallback(f, { timeout: 4000 }); else window.setTimeout(f, 1500); };
  // one at a time, each in a quiet moment
  const next = (i: number) => { if (i >= NEXT_SCREENS.length) return; idle(() => { NEXT_SCREENS[i]().catch(() => {}).finally(() => next(i + 1)); }); };
  window.setTimeout(() => next(0), 2500);
}

// ---------- small rewards ----------
// A sale floats its price up from where the player last tapped, a goal reached gets an ink seal pressed
// onto its line, and a rise in reputation ticks a star on the chip. All drawn in one fixed layer above
// the game that never takes a tap (feel.css .ff-layer), gone in under two seconds, and never waiting on
// the player. The store watcher that calls them is src/game/rewards.ts.

/** a sale of this much (in piastres) or more gets the counter bell and the brass label */
export const BIG_SALE = 500;

let lastTap = { x: 0, y: 0, t: 0 };
let tapTracked = false;
export function trackTaps() {
  if (tapTracked || !hasWindow) return;
  tapTracked = true;
  window.addEventListener('pointerdown', (e) => { lastTap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { capture: true, passive: true });
}

function layer(): HTMLElement | null {
  if (!hasWindow || !document.body) return null;
  let el = document.getElementById('ff-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ff-layer';
    el.className = 'ff-layer';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}
const visibleRect = (el: Element | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** puts a short-lived element in the layer at (x, y), its centre; it removes itself after `ms` */
function drop(el: HTMLElement, x: number, y: number, ms: number) {
  const host = layer();
  if (!host) return;
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  host.appendChild(el);
  window.setTimeout(() => el.remove(), ms);
}

/** The price of a sale rising from near the tap that made it (or from under the purse), counting up as
 *  it goes. `won` is a lot won at auction: the price in ink, no count. */
export function floatSale(amount: number, kind: 'sale' | 'won' = 'sale') {
  if (!hasWindow || amount <= 0) return;
  trackTaps();
  const big = kind === 'sale' && amount >= BIG_SALE;
  const el = document.createElement('div');
  el.className = `ff-sale ${big ? 'ff-big' : ''} ${kind === 'won' ? 'ff-won' : ''}`;
  el.dataset.testid = 'ff-sale';
  const text = (v: number) => (kind === 'won' ? `Won · ${fmt(v)}` : `+${fmt(v)}`);
  el.textContent = text(kind === 'won' || reducedMotion() ? amount : 0);
  el.dataset.amount = String(amount);
  const W = window.innerWidth;
  const purse = visibleRect(document.querySelector('[data-testid="hud-cash"]'));
  const fresh = Date.now() - lastTap.t < 4000 && lastTap.y > 70;
  const x = fresh ? clamp(lastTap.x, 60, W - 60) : purse ? clamp(purse.left + purse.width / 2, 60, W - 60) : W / 2;
  const y = fresh ? clamp(lastTap.y - 34, 90, window.innerHeight - 40) : purse ? purse.bottom + 26 : 90;
  drop(el, x, y, 1800);
  if (kind === 'won' || reducedMotion() || typeof requestAnimationFrame !== 'function') return;
  const t0 = performance.now(), dur = big ? 700 : 520;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / dur);
    // whole piastres on the way, the true sum at the end
    el.textContent = text(k >= 1 ? amount : Math.round(amount * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** An ink seal pressed onto an objective line or notice for about a second. `target` is the first of the
 *  selectors that is on screen; with none, the seal goes under the top bar. Calls `onPress` as it lands. */
export function stampOn(targets: string[], word: string, onPress?: () => void, tone: 'ink' | 'brass' = 'ink') {
  if (!hasWindow) return;
  let r: DOMRect | null = null;
  for (const sel of targets) { r = visibleRect(document.querySelector(sel)); if (r) break; }
  const el = document.createElement('div');
  el.className = `ff-stamp ff-${tone}`;
  el.dataset.testid = 'ff-stamp';
  const span = document.createElement('span');
  span.textContent = word;
  el.appendChild(span);
  const W = window.innerWidth;
  const x = r ? clamp(r.right - 34, 40, W - 40) : W / 2;
  const y = r ? clamp(r.top + Math.min(r.height, 80) / 2, 40, window.innerHeight - 40) : 96;
  drop(el, x, y, 1300);
  window.setTimeout(() => onPress?.(), reducedMotion() ? 0 : 150);
}

/** A small star rising off the reputation chip. */
export function starTick(delta = 1, sel = '[data-testid="hud-rep"]') {
  if (!hasWindow) return;
  const chip = document.querySelector<HTMLElement>(sel);
  const r = visibleRect(chip);
  if (!chip || !r) return;
  const el = document.createElement('div');
  el.className = 'ff-star';
  el.dataset.testid = 'ff-star';
  el.textContent = `★${delta > 1 ? ` +${delta}` : ''}`;
  drop(el, r.right - 4, r.top + r.height / 2 + 2, 1200);
  if (!reducedMotion()) {
    chip.classList.remove('ff-tick');
    void chip.offsetWidth; // start the little pulse again on a second rise
    chip.classList.add('ff-tick');
    window.setTimeout(() => chip.classList.remove('ff-tick'), 600);
  }
}

/** The moment of a sale, over the stall picture for about two seconds: a brass ribbon with the price
 *  and what it means (a record, the profit on cost), and a handful of coins flying from it into the
 *  purse in the top bar. It takes no tap and covers nothing for long. `note` is a line under the price. */
export function saleMoment(amount: number, note: string, grand: boolean, stars = 0, loss = false) {
  if (!hasWindow || amount <= 0) return;
  const scene = visibleRect(document.querySelector('.stall > .scene, [data-testid="scene"]'));
  const W = window.innerWidth;
  const x = scene ? scene.left + scene.width / 2 : W / 2;
  const y = scene ? scene.top + Math.min(scene.height * 0.38, 150) : 160;
  const el = document.createElement('div');
  el.className = `ff-ribbon ${grand ? 'ff-grand' : ''}${loss ? ' ff-loss' : ''}`;
  el.dataset.testid = 'sale-moment';
  const b = document.createElement('b');
  b.textContent = `Sold · ${fmt(amount)}`;
  el.appendChild(b);
  if (stars) { const st = document.createElement('i'); st.className = `ff-stars s${stars}`; st.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); el.appendChild(st); }
  if (note) { const s = document.createElement('span'); s.textContent = note; el.appendChild(s); }
  drop(el, x, y, grand ? 2150 : 1900);
  // the stall picture can be wider than the screen: keep the whole ribbon on it
  const half = el.offsetWidth / 2 + 8;
  el.style.left = `${Math.round(Math.min(Math.max(x, half), W - half))}px`;
  // a loss sends no coins flying: only the few it fetched, slowly
  if (reducedMotion()) return;
  const purse = visibleRect(document.querySelector('[data-testid="hud-cash"]'));
  if (!purse) return;
  const tx = purse.left + 14, ty = purse.top + purse.height / 2;
  const n = loss ? 2 : grand ? 12 : 7;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'ff-coin';
    const sx = x + (Math.random() - 0.5) * 120, sy = y + (Math.random() - 0.3) * 30;
    c.style.setProperty('--dx', `${Math.round(tx - sx)}px`);
    c.style.setProperty('--dy', `${Math.round(ty - sy)}px`);
    c.style.animationDelay = `${(loss ? 900 : 350) + i * 55}ms`;
    drop(c, sx, sy, 1500 + i * 55);
  }
}

/** A thing done for the first time, or a mark passed: a small brass plate under the top bar for a
 *  couple of seconds. */
export function feat(title: string, line: string) {
  if (!hasWindow) return;
  const el = document.createElement('div');
  el.className = 'ff-feat';
  el.dataset.testid = 'feat';
  const b = document.createElement('b');
  b.textContent = title;
  const s = document.createElement('span');
  s.textContent = line;
  el.append(b, s);
  const hud = visibleRect(document.querySelector('.hud'));
  drop(el, window.innerWidth / 2, (hud ? hud.bottom : 50) + 34, 3200);
}

/** A fortune: a warm gold light sweeps in from the edges of the screen and the purse swells. */
export function goldRush() {
  if (!hasWindow || reducedMotion()) return;
  const el = document.createElement('div');
  el.className = 'ff-goldrush';
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 1700);
  const purse = document.querySelector('[data-testid="hud-cash"]');
  purse?.classList.add('ff-swell');
  window.setTimeout(() => purse?.classList.remove('ff-swell'), 1600);
}
