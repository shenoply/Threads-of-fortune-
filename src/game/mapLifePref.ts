// "Map life" in Settings: the ships, caravans, clouds and birds moving on the travel map. On unless the
// player turns it off (or the device asks for reduced motion and the player has not chosen). Kept on this
// device, like vibration (feel.ts).
import { useSyncExternalStore } from 'react';

const KEY = 'tof-map-life';
const subs = new Set<() => void>();
function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* private mode */ }
  try { return !(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return true; }
}
let on = typeof window === 'undefined' ? true : read();
export const mapLifeOn = () => on;
export function setMapLife(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const useMapLife = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, mapLifeOn, () => true);
