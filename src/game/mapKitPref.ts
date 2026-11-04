// The travel map's decorations (src/game/systems/mapKitDraw.ts) on or off: a tester's switch, for comparing the
// painting with and without them. Off since 2026-11-04: the repainted map has its own mountains, palms and trees
// everywhere, and the stickers on top of them would double them. On only when switched on in the tester sheet (kept on
// this device, under a new key, so an old 'on' does not come back) or by ?kit=1 in the address (?kit=0 forces them off).
import { useSyncExternalStore } from 'react';

const KEY = 'tof-map-kit2';
const subs = new Set<() => void>();
function read(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('kit');
    if (q === '0') return false;
    if (q === '1') return true;
  } catch { /* no location */ }
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
let on = typeof window === 'undefined' ? false : read();
export const mapKitOn = () => on;
export function setMapKit(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const useMapKit = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, mapKitOn, () => false);
// for the review and performance scripts (tests/mapkit-shots.mjs, tests/mapkit-perf.mjs): the same switch the tester sheet uses
if (typeof window !== 'undefined') (window as unknown as { __setMapKit?: typeof setMapKit }).__setMapKit = setMapKit;
