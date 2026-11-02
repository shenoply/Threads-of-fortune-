// The travel map's decorations (src/game/systems/mapKitDraw.ts) on or off: a tester's switch, for comparing the
// painting with and without them. On unless switched off in the tester sheet (kept on this device) or by
// ?kit=0 in the address (?kit=1 forces them on).
import { useSyncExternalStore } from 'react';

const KEY = 'tof-map-kit';
const subs = new Set<() => void>();
function read(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('kit');
    if (q === '0') return false;
    if (q === '1') return true;
  } catch { /* no location */ }
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}
let on = typeof window === 'undefined' ? true : read();
export const mapKitOn = () => on;
export function setMapKit(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const useMapKit = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, mapKitOn, () => true);
