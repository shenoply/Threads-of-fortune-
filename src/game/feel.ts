// How the game feels in the hand: a short buzz on the important moments (Android only, and only if the
// player wants it), numbers that roll to their new value, pictures that fade in once they have arrived,
// and the next screens fetched quietly while the player looks at the map.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

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
const SFX_BUZZ: Record<string, number> = { sold: 25, coins: 15, coin: 12, chest: 22, gavel: 20 };
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
