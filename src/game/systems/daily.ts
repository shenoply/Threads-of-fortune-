// Coming back: a gift at the stall for each real day you play (it grows over a week of days in a row,
// and a missed day starts the week again), and three small errands for each day in the game, each
// paying something when done (one day missed is forgiven; a clock put back gets nothing). Nothing here opens by itself: the chest in the top bar glows, and the
// player opens it when he likes.
import type { LedgerEntry } from '../types';
import { RUGS } from '../../data/rugs';
import { DRESSING } from '../../data/shops';

export interface DailyState {
  /** the real day (YYYY-MM-DD, local) the last gift was opened */
  last?: string;
  /** days in a row, counting the last one opened */
  streak: number;
  best: number;
  /** errands paid for, as `${gameDay}:${id}` (only today's are kept) */
  paid?: string[];
}

export const realDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = (key: string) => { const [y, m, d] = key.split('-').map(Number); return realDay(new Date(y, m - 1, d - 1)); };

/** Today's gift: whether it is still there, and which day of the week of days it is. */
export function giftToday(d: DailyState | undefined, now = new Date()) {
  const today = realDay(now);
  // a clock put back to before the last gift opens nothing (the dates compare as text)
  const open = !d?.last || d.last < today;
  // one day missed is forgiven: the run goes on from yesterday or the day before
  const keeps = !!d?.last && (d.last === dayBefore(today) || d.last === dayBefore(dayBefore(today)));
  // the day of the run this gift counts as (1..): a run kept up goes on, else it starts again
  const run = !open ? d!.streak : keeps ? d!.streak + 1 : 1;
  return { today, open, run, lost: !open ? false : !!d?.last && !keeps && (d?.streak ?? 0) > 1 };
}

export type Gift =
  | { kind: 'cash'; amount: number; text: string }
  | { kind: 'rep'; amount: number; text: string }
  | { kind: 'rug'; typeId: string; text: string }
  | { kind: 'piece'; id: string; text: string };

/** What the gift of the nth day in a row is (the week goes round; each week round pays a little more). */
export function giftFor(run: number, rankIdx: number, owned: string[]): Gift {
  const week = Math.floor((run - 1) / 7), day = ((run - 1) % 7) + 1;
  const k = (1 + rankIdx * 0.5) * (1 + Math.min(week, 4) * 0.25);
  const cash = (pt: number) => Math.round((pt * k) / 10) * 10;
  switch (day) {
    case 1: return { kind: 'cash', amount: cash(100), text: 'A purse of coins left at the stall' };
    case 2: return { kind: 'cash', amount: cash(150), text: 'An old debt repaid by a neighbour' };
    case 3: {
      const pool = Object.values(RUGS).filter((r) => (r.tier ?? 1) <= Math.min(3, 1 + Math.floor(rankIdx / 2)) && r.id !== 'start-cg');
      const r = pool[(run * 7 + rankIdx * 3) % Math.max(1, pool.length)] ?? Object.values(RUGS)[0];
      return { kind: 'rug', typeId: r.id, text: `A rug from Uncle Rashid: ${r.name}` };
    }
    case 4: return { kind: 'cash', amount: cash(250), text: 'A tip from a grateful buyer' };
    case 5: return { kind: 'rep', amount: 3, text: 'The lane speaks well of you' };
    case 6: return { kind: 'cash', amount: cash(400), text: 'A merchant\'s commission paid in advance' };
    default: {
      const piece = DRESSING.filter((p) => !p.father && !owned.includes(p.id) && p.art).sort((a, b) => a.cost - b.cost)[0];
      return piece ? { kind: 'piece', id: piece.id, text: `For the stall: ${piece.name.replace(/^An? /, 'a ').replace(/^a /, 'A ')}` } : { kind: 'cash', amount: cash(1500), text: 'A purse from the guild for a week of trade' };
    }
  }
}

// ---- the day's three errands, worked out from the ledger: nothing else needs to tell them ----

export interface Errand { id: string; text: string; done: boolean; progress: string; reward: number }

/** three errands for this game day (they change each day), and how far each one has got */
export function errandsFor(day: number, ledger: LedgerEntry[], rankIdx: number): Errand[] {
  const sales = ledger.filter((l) => l.day === day && l.kind === 'sale' && !l.label.startsWith('Seized'));
  const taken = sales.reduce((s, l) => s + l.amount, 0);
  const n = sales.length;
  const best = sales.reduce((m, l) => Math.max(m, l.cost ? (l.amount - l.cost) / Math.max(1, l.cost) : 0), 0);
  const big = sales.reduce((m, l) => Math.max(m, l.amount), 0);
  const scale = 1 + rankIdx * 0.6;
  const target = Math.round((600 * scale) / 100) * 100;
  const bigOne = Math.round((400 * scale) / 100) * 100;
  const pay = (pt: number) => Math.round((pt * scale) / 10) * 10;
  const pound = (pt: number) => `£${(pt / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  const all: Errand[] = [
    { id: 'sales2', text: 'Make two sales', done: n >= 2, progress: `${Math.min(n, 2)}/2`, reward: pay(80) },
    { id: 'sales3', text: 'Make three sales', done: n >= 3, progress: `${Math.min(n, 3)}/3`, reward: pay(120) },
    { id: 'take', text: `Take ${pound(target)} at the stall`, done: taken >= target, progress: `${pound(Math.min(taken, target))}/${pound(target)}`, reward: pay(100) },
    { id: 'margin', text: 'Sell a rug for half as much again as it cost you', done: best >= 0.5, progress: best >= 0.5 ? 'done' : best > 0 ? `best so far ${Math.round(best * 100)}% over` : 'not yet', reward: pay(120) },
    { id: 'big', text: `Sell one rug for ${pound(bigOne)} or more`, done: big >= bigOne, progress: big >= bigOne ? 'done' : big ? `best ${pound(big)}` : 'not yet', reward: pay(120) },
  ];
  // two sales or three, then two of the others, by the day
  const first = all[day % 3 === 0 ? 1 : 0];
  const rest = all.slice(2);
  const a = rest[day % rest.length], b = rest[(day + 1) % rest.length];
  return [first, a, b];
}
/** the purse for doing all three */
export const ALL_THREE = (rankIdx: number) => Math.round((150 * (1 + rankIdx * 0.6)) / 10) * 10;
