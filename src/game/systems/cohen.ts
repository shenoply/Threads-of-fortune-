// Cohen's orders (docs/handoff/COHEN_TRADER_CLAUDE_HANDOFF.md). A wholesaler who buys reliable rugs
// for hotel corridors and steamship cabins: medium size, hard-wearing wool, colour that holds, sound
// edges, a matching pair, delivered on the promised day. The order is a contract, not a haggle:
// promise it, bring two rugs that pass, and he pays his quoted price. Miss the day and his trust
// drops and that order closes; he comes back later with another. His faith is his own business and
// never touches the numbers.
import type { RugItem, RugType } from '../types';
import { RUGS, CONDITION_FACTOR } from '../../data/rugs';
import { rubTruth } from './arranLab';
import type { LabFinding } from './arranLab';

export interface CohenOrder {
  id: string;
  placedDay: number;
  dueDay: number;
  /** his price for each rug that passes */
  pricePer: number;
  status: 'accepted' | 'done' | 'missed';
}
export interface CohenState {
  visits: number;
  trust: number; // 0..100
  lastVisitDay?: number;
  order?: CohenOrder;
  ordersDone: number;
  ordersMissed: number;
  /** a rug passed on a hand rub whose colour later ran: he says so next time */
  complaint?: string;
}
export const COHEN_START: CohenState = { visits: 0, trust: 50, ordersDone: 0, ordersMissed: 0 };
export const COHEN_MIN_SALES = 3;
export const ORDER_DAYS = 7;

/** Saturday daylight is his Sabbath: he does not trade (dateFor gives 1925 weekdays; day 1 = Tue 10 Mar) */
export const isSaturday = (weekday: string) => weekday === 'Saturday';

/** a due date that falls on his Sabbath moves to the Sunday */
export function dueFor(day: number, weekdayOf: (d: number) => string) {
  let due = day + ORDER_DAYS;
  if (isSaturday(weekdayOf(due))) due += 1;
  return due;
}

const dims = (t: RugType) => (t.size.match(/\d+/g) ?? []).map(Number);

export type CheckId = 'size' | 'wool' | 'edges' | 'colour';
export interface Check { id: CheckId; ok: boolean | null; text: string }

/** The practical checks for one rug. `null` means not known yet (colour not tested). */
export function cohenChecks(item: RugItem, findings: LabFinding[] | undefined, manual?: 'fast' | 'runs'): Check[] {
  const t = RUGS[item.typeId];
  if (!t) return [];
  const [a = 0, b = 0] = dims(t);
  const long = Math.max(a, b), short = Math.min(a, b);
  const size = long >= 170 && long <= 240 && short >= 100;
  const wool = /wool/i.test(t.material) && t.traits.includes('hardwearing');
  const edges = item.condition === 'Excellent' || item.condition === 'Good';
  const rub = (findings ?? []).find((f) => f.id === `${item.uid}:fastness`);
  const truth = rubTruth(item.typeId);
  const colour: Check = rub
    ? { id: 'colour', ok: truth !== 'transfers', text: truth === 'transfers' ? "Arran's rub test: colour came off on the cloth." : "Arran's rub test: no colour came off on the cloth." }
    : manual
      ? { id: 'colour', ok: manual === 'fast', text: manual === 'fast' ? 'Your own rub: the cloth looks clean. Not certain.' : 'Your own rub: colour came off on the cloth.' }
      : { id: 'colour', ok: null, text: 'Colour not tested yet.' };
  return [
    { id: 'size', ok: size, text: size ? `${t.size}: fits a corridor.` : `${t.size}: ${long > 240 ? 'too long' : short < 100 ? 'too narrow' : 'too small'} for the corridor.` },
    { id: 'wool', ok: wool, text: wool ? 'Hard-wearing wool.' : /wool/i.test(t.material) ? 'Wool, but not made for heavy feet.' : 'Not wool.' },
    { id: 'edges', ok: edges, text: edges ? 'Edges sound.' : `Edges ${item.condition.toLowerCase()}.` },
    colour,
  ];
}
export const passes = (c: Check[]) => c.length > 0 && c.every((x) => x.ok === true);

/** A hand rub is less reliable than Arran's: colour that comes off is noticed about six times in ten. Fixed per rug. */
export function manualRub(item: RugItem): 'fast' | 'runs' {
  if (rubTruth(item.typeId) !== 'transfers') return 'fast';
  let h = 0;
  for (const c of item.uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 10 < 6 ? 'runs' : 'fast';
}

/** his quote per rug: a fair wholesale price for a sound medium rug of this kind */
export function cohenPrice(t: RugType, item: RugItem) {
  return Math.round(((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[item.condition] / 5) * 5;
}
/** his contract price per rug, fixed when you promise the order and paid exactly on delivery */
export const ORDER_PRICE_PER = 300;

/** Two rugs that could hang side by side in one corridor. */
export const matches = (a: RugItem, b: RugItem) => RUGS[a.typeId]?.colourFamily === RUGS[b.typeId]?.colourFamily;

/** Whether he comes today. Never on his Sabbath; first after a few sales; with an open order he checks in. */
export function cohenDue(c: CohenState | undefined, day: number, weekday: string, totalSales: number, roll: number) {
  if (isSaturday(weekday) || totalSales < COHEN_MIN_SALES) return false;
  const s = c ?? COHEN_START;
  if (s.lastVisitDay == null) return roll < 0.6;
  if (s.lastVisitDay === day) return false;
  if (s.order?.status === 'accepted') return day >= s.order.dueDay || (day - s.lastVisitDay >= 2 && roll < 0.5);
  const gap = s.order?.status === 'missed' ? 10 : 6;
  return day - s.lastVisitDay >= gap && roll < 0.5;
}
