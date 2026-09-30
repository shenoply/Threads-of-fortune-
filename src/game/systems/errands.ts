// How far an errand is, and whether the caravan can make it: the same numbers the map uses (the
// walking path at your current speed, the railway where there is one), so a book request, the
// notebook and Arran's provisions assessment all agree with what the journey will actually take.
import type { RugItem } from '../types';
import { dailyFood, speedInfo, type PartyState } from './caravan';
import { findPath, pathLength, railJourney, settlementById } from './world';
import { MARKETS } from '../../data/caravan';

export interface Journey { walkDays: number | null; rail?: { days: number; fare: number }; ferry: boolean }

/** Walking days (at the caravan's pace now) and any train, from one town to another. */
export function journey(from: string | null | undefined, to: string, party: PartyState, inv: RugItem[]): Journey {
  if (!from || from === to) return { walkDays: 0, ferry: false };
  if ((from === 'giza' && to === 'cairo') || (from === 'cairo' && to === 'giza')) return { walkDays: 0.1, ferry: true };
  const a = settlementById(from), b = settlementById(to);
  const path = findPath(a, b);
  const sp = speedInfo(party, inv);
  const walkDays = path ? Math.max(0.5, Math.round((pathLength(path) / sp.pxPerDay) * 2) / 2) : null;
  const r = railJourney(from, to);
  return { walkDays, rail: r ? { days: r.days, fare: r.fare } : undefined, ferry: false };
}

export interface FoodCheck { have: number; perDay: number; daysCovered: number; needRound: number; short: number; price: number | null; overload: boolean; cap: number }
/** Food for the round trip on foot, and what topping up would cost here (null if nothing is sold here). */
export function foodFor(days: number, party: PartyState, at: string | null | undefined, inv: RugItem[] = []): FoodCheck {
  const perDay = dailyFood(party);
  const needRound = Math.ceil(days * 2 * perDay);
  const short = Math.max(0, needRound - party.food);
  const m = at ? MARKETS[at] : undefined;
  // that much food has to be carried: on foot, without an animal, it can slow you down more than it saves
  const after = speedInfo({ ...party, food: party.food + short }, inv);
  return { have: party.food, perDay, daysCovered: Math.floor(party.food / perDay), needRound, short, price: m ? Math.ceil(short * m.food) : null, overload: after.over, cap: after.cap };
}

export const daysWord = (d: number) => (d < 0.5 ? 'a few hours' : `${d} day${d === 1 ? '' : 's'}`);
