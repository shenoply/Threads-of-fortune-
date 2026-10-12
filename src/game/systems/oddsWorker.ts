// The odds of a road fight, worked out off the main thread (see odds.ts): 60 whole simulated fights would
// otherwise hold the screen still for a second on a phone.
import { winChance, type Battle, type Style } from './tactics';

const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };
ctx.onmessage = (e: MessageEvent<{ id: number; b: Battle; style: Style; runs: number }>) => {
  const { id, b, style, runs } = e.data;
  let p = -1;
  try { p = winChance(b, style, runs); } catch { /* the page falls back to working it out itself */ }
  ctx.postMessage({ id, p });
};
