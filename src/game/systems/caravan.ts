import { LIVESTOCK_BY_ID, flockOf } from '../../data/livestock';
import { TROOPS, FOOD_PER_LOAD, WALKER_LOAD, BASE_SPEED, MARKETS } from '../../data/caravan';
import { BREEDS } from '../../data/animals';
import type { RugItem } from '../types';

export interface PartyState {
  animals: Record<string, number>; // breed id -> count
  /** sheep, goats and hens driven along for food (data/livestock.ts) */
  flock?: Record<string, number>;
  food: number; // rations: one feeds one person for a day
  troops: Record<string, number>;
  /** a personal weapon with a permit (Arran's cabinet): counts toward strength everywhere */
  arms?: number;
  hungryDays?: number; // consecutive rollovers with no food left; resets the day rations cover the party again
  /** how much more a hungry or unpaid night your men will tolerate before one actually walks, 0-100 */
  morale?: number;
  /** the day you last sat down with your men (a talk lifts them once a day) */
  talkedDay?: number;
  /** the day you last went down on the road (worn out or starving); a few days must pass before it can happen again */
  lastCollapse?: number;
  /** after going down on the road the caravan goes at half pace until the end of this day */
  weakUntil?: number;
}

export const MORALE_START = 70;
/** How many men you can lead: a caravan master's name brings more men who will follow him */
export const troopCap = (reputation: number) => Math.min(24, 6 + Math.floor(Math.max(0, reputation) / 10));
export const MORALE_DESERT_AT = 25;
export const morale = (p: PartyState) => p.morale ?? MORALE_START;

export const startingParty = (): PartyState => ({ animals: {}, food: 6, troops: {} }); // you start on foot: carrying more means buying an animal

const herd = (p: PartyState) => Object.entries(p.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id]);
export const animalCount = (p: PartyState, kind?: string) => herd(p).reduce((s, [id, n]) => s + (!kind || BREEDS[id].kind === kind ? n : 0), 0);

/** how many beasts the party can lead: two for each person (you and every man) */
export const animalCap = (p: PartyState) => 2 * (1 + Object.values(p.troops).reduce((s, n) => s + n, 0));
export const troopCount = (p: PartyState) => Object.values(p.troops).reduce((s, n) => s + n, 0);
export const partySize = (p: PartyState) => 1 + troopCount(p);
export const strength = (p: PartyState) => 2 + (p.arms ?? 0) + Object.entries(p.troops).reduce((s, [id, n]) => s + (TROOPS[id]?.strength ?? 1) * n, 0);
export const wages = (p: PartyState) => Object.entries(p.troops).reduce((s, [id, n]) => s + (TROOPS[id]?.wage ?? 1) * n, 0);
/** Skill effects on the caravan, kept in step with the merchant's Riding and Survival by the store. */
export const SKILL_MODS = { speed: 1, food: 1 };
export const dailyFood = (p: PartyState) => Math.max(1, Math.round((partySize(p) + Math.ceil(herd(p).reduce((s, [id, n]) => s + BREEDS[id].food * n, 0))) * SKILL_MODS.food));
export const scoutBonus = (p: PartyState) => Math.max(0, ...Object.entries(p.troops).filter(([, n]) => n > 0).map(([id]) => TROOPS[id]?.scout ?? 0));

/** Who rides what. People take the fastest animals; the rest carry cargo. */
function assign(p: PartyState) {
  const mountedTroops = Object.entries(p.troops).reduce((s, [id, n]) => s + (TROOPS[id]?.mounted ? n : 0), 0);
  let riders = partySize(p) - mountedTroops;
  const list: { id: string; ridden: boolean }[] = [];
  const all = herd(p).flatMap(([id, n]) => Array.from({ length: n }, () => id)).sort((a, b) => BREEDS[b].ride - BREEDS[a].ride);
  for (const id of all) {
    if (riders > 0 && BREEDS[id].ride > 1) { list.push({ id, ridden: true }); riders--; }
    else list.push({ id, ridden: false });
  }
  return { list, walkers: riders, mountedTroops };
}

/** set by the store from the merchant's illnesses and injuries: travel speed % and carrying % (both 0 or negative) */
export const healthMods = { speed: 0, carry: 0 };
export const setHealthMods = (m: { speed: number; carry: number }) => { healthMods.speed = m.speed; healthMods.carry = m.carry; };
/** set by the store from the merchant's tiredness: a worn-out man sets a slower pace, and a day after
 *  going down on the road he can only manage half */
export const conditionMods = { fatigue: 0, weak: false };
export const setConditionMods = (m: { fatigue: number; weak: boolean }) => { conditionMods.fatigue = m.fatigue; conditionMods.weak = m.weak; };
/** pace multiplier from tiredness: none below 75, down to 0.65 at 100; halved again on a weak day */
export const fatiguePace = () => (conditionMods.fatigue >= 75 ? Math.max(0.65, 1 - (conditionMods.fatigue - 75) * 0.014) : 1) * (conditionMods.weak ? 0.5 : 1);

export const capacity = (p: PartyState) => {
  const { list } = assign(p);
  return Math.round((WALKER_LOAD + troopCount(p) + list.reduce((s, a) => s + BREEDS[a.id].load * (a.ridden ? 0.4 : 1), 0)) * (1 + healthMods.carry / 100) * 10) / 10;
};
export const carried = (inv: RugItem[]) => inv.filter((i) => !i.stored);
export const load = (p: PartyState, inv: RugItem[]) => carried(inv).length + p.food / FOOD_PER_LOAD + flockOf(p).reduce((a, [id, n]) => a + (LIVESTOCK_BY_ID[id]?.load ?? 0) * n, 0);

/** A caravan moves at the pace of its slowest member: walkers, riders and loaded pack animals. */
export function speedInfo(p: PartyState, inv: RugItem[]) {
  const { list, walkers, mountedTroops } = assign(p);
  const paces = [
    ...(walkers > 0 ? [1] : []),
    ...list.map((a) => (a.ridden ? BREEDS[a.id].ride : Math.max(1, BREEDS[a.id].ride * 0.85))),
    ...(mountedTroops ? [1.7] : []),
  ];
  // a flock sets its own pace: sheep will not be hurried
  const flockPace = flockOf(p).reduce((a, [id]) => Math.min(a, LIVESTOCK_BY_ID[id]?.pace ?? 1), 1);
  const pace = (paces.length ? Math.min(...paces) : 1) * flockPace;
  const size = partySize(p);
  const mounted = (size - walkers) / size;
  const cap = capacity(p);
  const l = load(p, inv);
  const over = l > cap ? Math.max(0.35, cap / l) : 1;
  // the pace worsens the longer the caravan goes hungry, down to a crawl, rather than a flat penalty forever
  const hungry = p.food <= 0 ? Math.max(0.4, 0.75 - (p.hungryDays ?? 0) * 0.05) : 1;
  const tired = fatiguePace();
  const mult = pace * over * hungry * tired * SKILL_MODS.speed * Math.max(0.2, 1 + healthMods.speed / 100);
  const slowest = flockPace < 0.99 && flockPace <= (paces.length ? Math.min(...paces) : 1) ? 'the sheep' : walkers > 0 ? 'people on foot' : list.length ? BREEDS[list.reduce((a, b) => ((a.ridden ? BREEDS[a.id].ride : BREEDS[a.id].ride * 0.85) <= (b.ridden ? BREEDS[b.id].ride : BREEDS[b.id].ride * 0.85) ? a : b)).id].name : 'nobody';
  return { pxPerDay: BASE_SPEED * mult, mult, mounted, over: l > cap, hungry: p.food <= 0, tired: tired < 1, cap, load: l, slowest };
}

export const foodDaysLeft = (p: PartyState) => Math.floor(p.food / Math.max(1, dailyFood(p)));

function h(n: number) {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

/** Volunteers available in a settlement today (deterministic per day, minus those already hired). */
export function recruitPool(sid: string, day: number, hired: Record<string, number>) {
  const m = MARKETS[sid];
  if (!m) return [];
  return m.recruits
    .map((r, i) => {
      const n = r.min + Math.floor(h(day * 17 + i * 5 + sid.length * 3 + sid.charCodeAt(0)) * (r.max - r.min + 1));
      const key = `${day}:${sid}:${r.troop}`;
      return { troop: r.troop, key, available: Math.max(0, n - (hired[key] ?? 0)) };
    })
    .filter((r) => r.available > 0 || true);
}
