// Your own motor car: the roads it can use, who and what fits in it, what a drive costs, and what
// can go wrong on the way. Pure functions; the store's buyCar/sellCar/driveCar/carArrived use them.
import { CARS, CAR_BY_ID, CAR_ROADS, DESERT_PAPERS, type CarModel, type CarRoad } from '../../data/cars';
import { BREEDS } from '../../data/animals';
import { rollFor } from './fieldwork';
import { roadToll } from './combat';

export interface OwnCar { model: string; at: string; bought: number; trips: number }

const monthOf = (day: number) => new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth();
/** December to March: snow on the passes, mud in the desert */
export const carWinter = (day: number) => { const m = monthOf(day); return m === 11 || m <= 2; };
/** hours the winter mud adds to the desert crossing */
export const DESERT_MUD_HOURS = 6;
/** a winter day's chance that snow shuts a pass */
export const SNOW_SHUT = 0.12;
export const PASS_NAME: Record<NonNullable<CarRoad['pass']>, string> = { lebanon: 'the road over the Lebanon', persia: 'the Persian passes' };

/** Snow has shut this pass for the day: the same answer all day, whoever asks. */
export const passShut = (day: number, pass: NonNullable<CarRoad['pass']>, seed = 1) => carWinter(day) && rollFor(`snow:${pass}:${day}`, seed) < SNOW_SHUT;

/** A road's hours for the light tourer on this day (the desert is slower in the winter mud). */
export const roadHours = (r: CarRoad, day: number) => r.hours + (r.desert && carWinter(day) ? DESERT_MUD_HOURS : 0);

export interface CarRoute {
  stops: string[];
  /** hours at this model's pace */
  hours: number;
  /** desert crossings on the way (papers for each) */
  desert: number;
}
export interface CarRouteResult { route?: CarRoute; why?: string }

function shortest(from: string, to: string, roads: CarRoad[], day: number): string[] | null {
  const edges = new Map<string, { to: string; h: number }[]>();
  for (const r of roads) {
    const h = roadHours(r, day);
    edges.set(r.a, [...(edges.get(r.a) ?? []), { to: r.b, h }]);
    edges.set(r.b, [...(edges.get(r.b) ?? []), { to: r.a, h }]);
  }
  if (!edges.has(from) || !edges.has(to)) return null;
  const best = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([from]);
  while (open.size) {
    let cur = '', cd = Infinity;
    for (const n of open) if ((best.get(n) ?? Infinity) < cd) { cd = best.get(n)!; cur = n; }
    open.delete(cur);
    if (cur === to) break;
    for (const e of edges.get(cur) ?? []) {
      const nd = cd + e.h;
      if (nd < (best.get(e.to) ?? Infinity)) { best.set(e.to, nd); prev.set(e.to, cur); open.add(e.to); }
    }
  }
  if (!best.has(to)) return null;
  const stops = [to];
  while (stops[0] !== from) stops.unshift(prev.get(stops[0])!);
  return stops;
}
const roadOf = (a: string, b: string) => CAR_ROADS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))!;

/** The quickest way by car between two towns for this model on this day, or why there is none. */
export function carRoute(from: string, to: string, modelId: string, day: number, seed = 1): CarRouteResult {
  const m = CAR_BY_ID[modelId];
  if (!m || from === to) return {};
  const allowed = CAR_ROADS.filter((r) => !r.desert || m.desert);
  const open = allowed.filter((r) => !r.pass || !passShut(day, r.pass, seed));
  const stops = shortest(from, to, open, day);
  if (!stops) {
    const fair = shortest(from, to, allowed, day);
    if (fair) {
      const shut = fair.slice(1).map((b, i) => roadOf(fair[i], b).pass).find((p) => p && passShut(day, p, seed));
      return { why: `Snow has shut ${PASS_NAME[shut ?? 'persia']} today. Try again tomorrow.` };
    }
    if (m.desert === false && shortest(from, to, CAR_ROADS, day)) return { why: `Only a desert car is allowed across the Syrian desert.` };
    return {};
  }
  let hours = 0, desert = 0;
  for (let i = 1; i < stops.length; i++) {
    const r = roadOf(stops[i - 1], stops[i]);
    hours += roadHours(r, day);
    if (r.desert) desert++;
  }
  return { route: { stops, hours: Math.round((hours / m.speed) * 2) / 2, desert } };
}

/** Every town this car can reach from where it stands (any day, snow aside). */
export const carReach = (from: string, modelId: string) => {
  const m = CAR_BY_ID[modelId];
  if (!m) return [];
  const roads = CAR_ROADS.filter((r) => !r.desert || m.desert);
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    for (const r of roads) { const n = r.a === c ? r.b : r.b === c ? r.a : null; if (n && !seen.has(n)) { seen.add(n); q.push(n); } }
  }
  seen.delete(from);
  return [...seen];
};

export interface FitParty { people: number; animals: Record<string, number>; flock?: Record<string, number> }
const plural: Record<string, string> = { camel: 'camels', horse: 'horses', mule: 'mules', donkey: 'donkeys' };
/** Will the party and its rugs fit? `why` is the line shown on the greyed button. */
export function carFit(m: CarModel, party: FitParty, rugs: number): { ok: boolean; why?: string } {
  const kinds = [...new Set(Object.entries(party.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id]).map(([id]) => BREEDS[id].kind))];
  const flock = Object.values(party.flock ?? {}).some((n) => n > 0);
  if (kinds.length || flock) {
    const names = [...kinds.map((k) => plural[k] ?? `${k}s`), ...(flock ? ['flock'] : [])];
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    return { ok: false, why: `Your ${list} cannot ride: leave them or walk` };
  }
  if (party.people > m.seats) return { ok: false, why: `Seats for ${m.seats}: you are ${party.people}` };
  if (rugs > m.luggage) return { ok: false, why: `Room for ${m.luggage} rug${m.luggage === 1 ? '' : 's'}: you carry ${rugs}` };
  return { ok: true };
}

/** Petrol and running for the hours, and desert papers for each crossing. */
export const carCost = (m: CarModel, route: CarRoute) => Math.round(route.hours * m.perHour) + route.desert * DESERT_PAPERS;

export interface TripRoll {
  /** hours lost to a breakdown (0 if none) */
  delay: number;
  /** what the mechanic or the roadside smith charged */
  repair: number;
  /** what raiders took in the desert (0 if none) */
  toll: number;
  lines: string[];
}
/** a breakdown's chance: worse the longer the drive and the less reliable the car */
export const breakdownChance = (m: CarModel, hours: number) => Math.min(0.6, (1 - m.reliability) * (hours / 8));
export const DESERT_RAID = 0.06;

/** What befalls the car on the way, decided as it sets off. */
export function rollTrip(m: CarModel, route: CarRoute, cash: number, rng: () => number): TripRoll {
  const out: TripRoll = { delay: 0, repair: 0, toll: 0, lines: [] };
  if (rng() < breakdownChance(m, route.hours)) {
    out.delay = 2 + Math.round(rng() * 4);
    out.repair = Math.round((50 + rng() * 250) / 5) * 5;
    const what = ['a broken spring', 'a cracked fan belt', 'two punctures', 'a boiling radiator', 'a fouled carburettor'][Math.floor(rng() * 5)];
    out.lines.push(`The car broke down on the way with ${what}: ${out.delay} hours lost and a repair bill.`);
  }
  if (route.desert && rng() < DESERT_RAID) {
    out.toll = Math.min(Math.max(0, cash), roadToll('iraq-border-smuggler-brigands', 4 + Math.floor(rng() * 6), cash));
    if (out.toll > 0) out.lines.push('Riders stopped the car out past Rutba and took the price of the road.');
  }
  return out;
}

export const carName = (id?: string) => CAR_BY_ID[id ?? '']?.name ?? 'motor car';
export { CARS };
