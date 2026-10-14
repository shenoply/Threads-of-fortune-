// Counting knots on the back of a rug, as every dealer did with a one-inch brass window: so many knots
// across, so many down, and the two multiplied give the knots to the square inch. Each rug has its own
// true count, near what its kind should have, fixed by a hash of the rug (or the dealer's offer), so a
// rug always counts the same. A count within 5% tells you what the rug really is; a wrong count tells you
// something a little wrong.
import { RUGS } from '../data/rugs';
import type { ColourFamily, RugItem, RugType } from './types';

function hash01(s: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** what the rug's kind should have to the square inch (null for a flatweave: there are no knots to count) */
export function kindKpsi(t: RugType | undefined): number | null {
  if (!t) return null;
  const m = t.weave.kpsi.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
export const countable = (typeId: string) => kindKpsi(RUGS[typeId]) != null;

export interface Patch {
  /** knots across one inch (a row), and rows down one inch (a column) */
  across: number;
  down: number;
  kpsi: number;
  /** how this rug compares with others of its kind */
  grade: 'coarse' | 'usual' | 'fine';
}

/** the rug's true count: within about a tenth of its kind either way */
export function patchFor(key: string, typeId: string): Patch | null {
  const base = kindKpsi(RUGS[typeId]);
  if (base == null) return null;
  const f = 0.88 + hash01(key, 7) * 0.26;
  const k = base * f;
  // rows are a little closer than knots in a row on most rugs (the weft packs them down)
  const across = Math.max(5, Math.round(Math.sqrt(k) * (0.92 + hash01(key, 13) * 0.08)));
  const down = Math.max(5, Math.round(k / across));
  const kpsi = across * down;
  const r = kpsi / base;
  return { across, down, kpsi, grade: r < 0.94 ? 'coarse' : r > 1.06 ? 'fine' : 'usual' };
}

/** within 5% of the true count */
export const closeEnough = (counted: number, truth: number) => truth > 0 && Math.abs(counted - truth) / truth <= 0.05;

export interface KnotResult { counted: number; truth: number; ok: boolean; day: number }

/** the line in the inspector: what you counted, and what you make of it (wrong if the count was wrong) */
export function knotVerdict(r: KnotResult, typeId: string, item?: Pick<RugItem, 'fakeAge'>): string {
  const t = RUGS[typeId];
  const base = kindKpsi(t) ?? r.counted;
  const ratio = r.counted / base;
  const kind = ratio < 0.94 ? 'coarser than most of its kind' : ratio > 1.06 ? 'finer than most of its kind' : 'as its kind should be';
  const age = r.ok && item?.fakeAge ? ' The knots are crisp and square and the wool at the roots is unworn: new work, whatever age it is sold as.' : '';
  return `About ${r.counted} knots to the square inch: ${kind}.${age}`;
}

/** colours for the back of the rug, from its colour family (the back shows the pile colours flat) */
export const BACK_PALETTE: Record<ColourFamily, string[]> = {
  crimson: ['#8e2a1e', '#b0432a', '#2c2a4a', '#e2d2b0', '#6b3a1e'],
  indigo: ['#22325e', '#3a4f86', '#9a2c22', '#e6d8b8', '#2a2018'],
  ivory: ['#e7dcc2', '#c9b48a', '#7a2e22', '#3d4a6a', '#8a6a3a'],
  gold: ['#c08a2e', '#9a6a1e', '#7a2a1c', '#2e3a56', '#e8d6a8'],
  mixed: ['#9a3424', '#2c3e6a', '#c8a050', '#e4d4b0', '#4a5a34'],
};
export function paletteFor(typeId: string): string[] {
  const t = RUGS[typeId];
  if (t?.art.kind === 'woven' && t.art.palette.length >= 3) return t.art.palette;
  return BACK_PALETTE[t?.colourFamily ?? 'mixed'];
}
