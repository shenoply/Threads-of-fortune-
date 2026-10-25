// One target a week, set each Monday: clear a sum, sell to new faces, make fine deals, sell better
// rugs. Meet it before Sunday is out and Uncle Rashid sends a purse and a word to the lane. Chosen by
// hashing the week, so it never touches the store's dice; sized to what you have been doing lately.
import { RUGS } from '../../data/rugs';
import { BUYERS } from '../../data/buyers';
import { fmt, snap } from '../economy/money';
import type { GameState } from '../state/store';

export type GoalKind = 'profit' | 'faces' | 'fine' | 'better';
export interface WeekGoal { week: number; kind: GoalKind; target: number; paid?: boolean }

/** the Monday that starts the week a day is in (day 0 was Monday 9 March 1925, as in dateFor) */
export const weekOf = (day: number) => day - (day % 7);

const RUG_BY_NAME = new Map(Object.values(RUGS).map((r) => [r.name, r]));
const NAME_TO_BUYER = new Map(Object.values(BUYERS).map((b) => [b.name, b.id]));
const h = (n: number) => Math.abs(Math.sin(n * 77.7 + 3.3) * 43758.5453) % 1;

type Sale = { day: number; label: string; amount: number; cost?: number; kind: string };
const salesIn = (s: Pick<GameState, 'ledger'>, week: number) => (s.ledger as Sale[]).filter((l) => l.kind === 'sale' && l.amount > 0 && l.day >= week && l.day < week + 7 && !/^Seized/.test(l.label));

/** this week's target, sized to the last fortnight: a stretch, not a wall */
export function goalFor(s: Pick<GameState, 'ledger' | 'day'>, week: number): WeekGoal | null {
  if (week < 7) return null;
  const recent = (s.ledger as Sale[]).filter((l) => l.kind === 'sale' && l.amount > 0 && l.day >= week - 14 && l.day < week);
  const prof = recent.reduce((a, l) => a + Math.max(0, l.amount - (l.cost ?? 0)), 0) / 2;
  const kinds: GoalKind[] = ['profit', 'faces', 'fine', 'better'];
  const kind = kinds[Math.floor(h(week) * kinds.length)];
  const target = kind === 'profit' ? Math.max(500, snap(prof * 1.3)) : kind === 'faces' ? 3 : kind === 'fine' ? 3 : 2;
  return { week, kind, target };
}

/** how far along: a number to set against the target */
export function goalProgress(s: Pick<GameState, 'ledger'>, g: WeekGoal): number {
  const sales = salesIn(s, g.week);
  if (g.kind === 'profit') return sales.reduce((a, l) => a + (l.amount - (l.cost ?? 0)), 0);
  if (g.kind === 'faces') return new Set(sales.map((l) => NAME_TO_BUYER.get(l.label.split(' to ')[1] ?? '') ?? l.label)).size;
  if (g.kind === 'fine') return sales.filter((l) => (l.cost ?? 0) > 0 && (l.amount - (l.cost ?? 0)) / (l.cost ?? 1) >= 0.75).length;
  return sales.filter((l) => (RUG_BY_NAME.get(l.label.split(' to ')[0])?.tier ?? 1) >= 2).length;
}

export function goalLabel(g: WeekGoal) {
  return g.kind === 'profit' ? `Clear ${fmt(g.target)} profit this week`
    : g.kind === 'faces' ? `Sell to ${g.target} different buyers this week`
    : g.kind === 'fine' ? `Make ${g.target} fine deals (★★★) this week`
    : `Sell ${g.target} rugs finer than village work this week`;
}
export const showProgress = (g: WeekGoal, n: number) => (g.kind === 'profit' ? `${fmt(Math.max(0, n))} of ${fmt(g.target)}` : `${Math.min(n, g.target)} of ${g.target}`);

/** Rashid's purse for a week's target met: grows with the target */
export const goalReward = (g: WeekGoal) => (g.kind === 'profit' ? snap(Math.max(150, g.target * 0.25)) : 300);

/** the night step: a new week brings a new target */
export function weekGoalNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started || s.playMode === 'sandbox') return { patch: {}, notes: [] };
  const wk = weekOf(day);
  if (s.weekGoal?.week === wk) return { patch: {}, notes: [] };
  const g = goalFor(s, wk);
  if (!g) return { patch: {}, notes: [] };
  return { patch: { weekGoal: g }, notes: [`Uncle Rashid has a target for you this week: ${goalLabel(g).toLowerCase()}. Meet it and he sends ${fmt(goalReward(g))}.`] };
}
