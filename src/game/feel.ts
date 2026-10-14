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
/** Marks each picture when it arrives (or fails), so feel.css can fade it in. Installed once. */
export function installImageFade() {
  if (!hasWindow) return;
  const mark = (e: Event) => { const t = e.target as HTMLElement | null; if (t && t.tagName === 'IMG') t.classList.add('ff-ok'); };
  window.addEventListener('load', mark, true);
  window.addEventListener('error', mark, true);
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
