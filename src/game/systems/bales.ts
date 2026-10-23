// Sealed bales from the customs sheds at Port Said: goods nobody came to claim, sold off still
// corded and under the customs' lead seal. Uncle Rashid's man brings one to the warehouse each day.
// You pay before you see inside. Most hold a rug or two of everyday stock, a little dusty from the
// shed; some hold a good trade rug, a few a city carpet, and once in a long while a treasure. Over
// many bales they come out at a little under what they cost (and there is the time to clean and sell what is in
// them): a game of chance played the way a merchant would, with goods, not cards.
import { RUGS, RUG_IDS } from '../../data/rugs';
import type { Condition, RugType } from '../types';

export const BALE_PRICE = 1200;
export interface BaleState { lastDay?: number; opened: number; /** bales since the last treasure */ dry: number; treasures: number }
export type BaleLot = { typeId: string; condition: Condition };
export interface BaleResult { lots: BaleLot[]; grade: 'everyday' | 'trade' | 'city' | 'treasure' }

/** the chance a bale holds a treasure: one in two hundred, a little more after a very long dry run */
export const treasureChance = (dry: number) => Math.min(0.05, 0.005 + Math.max(0, dry - 120) * 0.004);

const pool = (tier: number) => RUG_IDS.map((id) => RUGS[id]).filter((t): t is RugType => !!t && (t.tier ?? 1) === tier && !t.own && t.id !== 'start-cg');

export function openBale(state: BaleState | undefined, rnd: () => number = Math.random): BaleResult {
  const dry = state?.dry ?? 0;
  const roll = rnd();
  const pick = (tier: number) => { const p = pool(tier); return p[Math.floor(rnd() * p.length)]?.id ?? RUG_IDS[0]; };
  // what the shed did to it: most come out dusty, some worn, a few as good as when they were packed
  const cond = (): Condition => { const r = rnd(); return r < 0.5 ? 'Dirty' : r < 0.75 ? 'Worn' : 'Good'; };
  const t = treasureChance(dry);
  if (roll < t) return { grade: 'treasure', lots: [{ typeId: pick(4), condition: rnd() < 0.5 ? 'Good' : 'Dirty' }] };
  if (roll < t + 0.07) return { grade: 'city', lots: [{ typeId: pick(3), condition: cond() }] };
  if (roll < t + 0.32) return { grade: 'trade', lots: [{ typeId: pick(2), condition: cond() }] };
  return { grade: 'everyday', lots: [{ typeId: pick(1), condition: cond() }, { typeId: pick(1), condition: cond() }] };
}
