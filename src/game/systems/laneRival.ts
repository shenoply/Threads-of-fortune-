// Shukri Mansour keeps the stall across the lane in Giza. He started the same spring you did, with a
// borrowed corner and an uncle's debts, and he wants what you want: the mat, the canopy, the shop in
// the Khan. He saves every night and buys the next stall the day he can. While his stall is better
// than yours the lane's buyers drift to his canopy, and now and then he calls one of yours over
// before they reach you. Your regulars, the ones you have sold to three times, do not go. Outsell him
// in a week and the lane says so, and he loses face and money chasing you. Randomness is hashed from
// the day, so it never disturbs the store's dice.
import { UPGRADES } from '../../data/suppliers';
import { BUYERS } from '../../data/buyers';
import type { GameState } from '../state/store';
import { wivesOf } from './household';
import { eventsOn } from '../economy/life';

export const RIVAL_NAME = 'Shukri Mansour';
export const RIVAL_FIRST = 'Shukri';
/** the stall upgrades in order (data/suppliers.ts) */
export const STALL_STEPS = ['mat', 'bazaar', 'khan'] as const;
/** what he takes in on an ordinary day at each stall: a corner, a mat, a canopy, a shop */
const INCOME = [70, 190, 520, 1600];

export interface LaneRival {
  /** what he has saved, in piastres */
  purse: number;
  /** his stall: 0 a corner, 1 a mat, 2 a canopy, 3 a shop in the Khan */
  stall: number;
  /** his last move, for the line on the stall screen */
  last?: { day: number; text: string; kind: 'poach' | 'tried' | 'bought' | 'beaten' | 'quiet' | 'spent' };
  /** the last week counted (day of the Monday) */
  week?: number;
  /** a second shop, in the Muski, kept by his cousin */
  second?: boolean;
  /** married, with a wedding Giza talked about */
  wed?: boolean;
  /** the year he last paid for the Ramadan tables in the lane */
  charity?: number;
}
/** what he will keep in his purse at most: past this he spends */
export const RIVAL_PURSE_CAP = 60000;
const SECOND_SHOP = 35000, WEDDING = 20000;

export const freshRival = (): LaneRival => ({ purse: 0, stall: 0 });
export const rivalOf = (s: Pick<GameState, 'lane'>) => s.lane ?? freshRival();
export const yourStall = (up: string[]) => (up.includes('khan') ? 3 : up.includes('bazaar') ? 2 : up.includes('mat') ? 1 : 0);
export const nextCost = (stall: number) => (stall >= 3 ? null : UPGRADES.find((u) => u.id === STALL_STEPS[stall])!.cost);

const h = (day: number, salt: string) => {
  let x = day * 2654435761;
  for (let i = 0; i < salt.length; i++) x = Math.imul(x ^ salt.charCodeAt(i), 0x01000193) >>> 0;
  return (x % 10000) / 10000;
};

/** The night across the lane: he takes the day's money, may buy his next stall, may call one of your
 *  buyers over in the morning, and on Mondays the lane weighs your week against his. */
export function rivalNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started || day < 3 || s.playMode === 'sandbox') return { patch: {}, notes: [] };
  const r: LaneRival = { ...rivalOf(s) };
  const notes: string[] = [];
  const patch: Partial<GameState> = {};
  const you = yourStall(s.upgrades);
  // the day's takings: a steady man with good days and bad
  r.purse += Math.round(INCOME[r.stall] * (r.second ? 1.5 : 1) * (0.6 + h(day, 'take') * 0.8));
  let moved = false;
  // a man with his shop spends what he makes: a second shop, his wedding, the lane's Ramadan tables, stock
  const ramadanStarts = eventsOn(day).some((e) => e.fast && e.from === day);
  const year = new Date(Date.UTC(1925, 2, 9 + day)).getUTCFullYear();
  if (ramadanStarts && r.stall >= 2 && r.purse > 3000 && r.charity !== year) {
    const gift = Math.round(r.purse * 0.1);
    r.purse -= gift; r.charity = year; moved = true;
    r.last = { day, kind: 'spent', text: `${RIVAL_FIRST} is paying for the Ramadan tables in the lane this year: lentil soup and bread for anyone at the sunset cannon.` };
  } else if (r.stall >= 3 && !r.second && r.purse >= SECOND_SHOP + 5000) {
    r.purse -= SECOND_SHOP; r.second = true; moved = true;
    r.last = { day, kind: 'spent', text: `${RIVAL_FIRST} has taken a second shop, in the Muski. His cousin keeps it for him.` };
    notes.push(`${RIVAL_NAME} has taken a second shop, in the Muski.`);
  } else if (r.stall >= 3 && !r.wed && r.purse >= WEDDING + 5000 && h(day, 'wed') < 0.03) {
    r.purse -= WEDDING; r.wed = true; moved = true;
    r.last = { day, kind: 'spent', text: `${RIVAL_FIRST} has married. Three nights of singers, and the whole lane fed. He will be paying for it for a while.` };
    notes.push(`${RIVAL_NAME} has married, with a wedding the whole of Giza heard.`);
  } else if (r.stall >= 3 && r.purse >= 30000 && h(day, 'stock') < 1 / 30) {
    const spend = Math.round(r.purse * (0.3 + h(day, 'much') * 0.2));
    r.purse -= spend; moved = true;
    r.last = { day, kind: 'spent', text: `${RIVAL_FIRST} has bought a whole caravan's load of Persian carpets for his shop. The lane says he paid too much.` };
  }
  r.purse = Math.min(r.purse, RIVAL_PURSE_CAP);
  const cost = nextCost(r.stall);
  if (cost !== null && r.purse >= cost) {
    r.purse -= cost;
    r.stall += 1;
    const what = UPGRADES.find((u) => u.id === STALL_STEPS[r.stall - 1])!.name.toLowerCase();
    const ahead = r.stall > you;
    r.last = { day, kind: 'bought', text: ahead ? `${RIVAL_FIRST} has bought ${what}. The lane's buyers stop at his stall first now.` : `${RIVAL_FIRST} has bought ${what} at last. He is still behind you.` };
    if (ahead) notes.push(`Across the lane, ${RIVAL_NAME} has bought ${what}. Until your stall is as good, some of your buyers will go to him.`);
    moved = true;
  }
  // the morning: a buyer called over. How often depends on whose stall is better.
  // married to his sister, he is family: he would not take a buyer from you
  const odds = (s.household ? wivesOf(s.household) : []).some((w) => w.id === 'aziza') ? 0 : r.stall > you ? 0.35 : r.stall === you ? 0.18 : 0.05;
  if (!moved && s.world.at === 'giza' && (s.queue?.length ?? 0) > 1 && h(day, 'poach') < odds) {
    const keep = new Set(['cohen', 'malek', 'nabil', ...(s.appointments ?? []).map((a) => a.buyerId)]);
    const q = [...s.queue];
    const i = q.findIndex((id, k) => k > 0 && !keep.has(id) && !BUYERS[id]?.royal);
    if (i > 0) {
      const id = q[i], name = BUYERS[id]?.name ?? 'a buyer';
      const loyal = (s.relationships[id]?.purchases ?? 0) >= 3;
      if (loyal) r.last = { day, kind: 'tried', text: `${RIVAL_FIRST} tried to call ${name} over this morning. ${name} came to you anyway.` };
      else {
        q.splice(i, 1);
        patch.queue = q;
        if (s.arrivals) patch.arrivals = s.arrivals.slice(0, q.length);
        r.last = { day, kind: 'poach', text: `${RIVAL_FIRST} called ${name} over to his stall before they reached yours. Sell to someone three times and they stay yours.` };
      }
      moved = true;
    }
  }
  // Mondays: the lane compares the week
  const wk = day - (day % 7);
  if (r.week !== wk && day % 7 === 0) {
    r.week = wk;
    const yourWeek = s.ledger.filter((l) => l.kind === 'sale' && l.day > day - 8 && l.day < day).reduce((a, l) => a + l.amount, 0);
    const hisWeek = Math.round(INCOME[r.stall] * 7 * 1.4);
    if (yourWeek > hisWeek && yourWeek > 0) {
      r.purse = Math.round(r.purse * 0.8);
      patch.reputation = s.reputation + 1;
      r.last = { day, kind: 'beaten', text: `The lane says you outsold ${RIVAL_FIRST} last week. He spent money he did not have trying to catch up.` };
      notes.push(`Word in the lane: you outsold ${RIVAL_NAME} last week. Reputation +1.`);
    }
  }
  if (!r.last || r.last.day < day - 2) r.last = { day, kind: 'quiet', text: `${RIVAL_FIRST} is saving for ${r.stall >= 3 ? 'nothing now: he has his shop' : UPGRADES.find((u) => u.id === STALL_STEPS[r.stall])!.name.toLowerCase()}.` };
  patch.lane = r;
  return { patch, notes };
}

/** how far he is to his next stall, 0..1 */
export function rivalProgress(r: LaneRival) {
  const c = nextCost(r.stall);
  return c === null ? 1 : Math.min(1, r.purse / c);
}
