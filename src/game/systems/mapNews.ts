// Today's news as it shows on the travel map: small badges at the towns it touches, and the khamsin's sand haze.
import { eventsOn, cityBidMod, cityBuyMod } from '../economy/life';
import { SETTLEMENTS } from '../../data/world';
import { dist, terrainAt, type Party, type Pt } from './world';
import { floodOn, snowOn } from '../economy/calendar1925';
import { SNOW_PASSES } from '../../data/persiaMap';

export type NewsMark = 'closed' | 'danger' | 'bid' | 'buy';
export const NEWS_ICON: Record<NewsMark, string> = { closed: 'lock', danger: 'sword', bid: 'up', buy: 'tag' };
export const NEWS_TIP: Record<NewsMark, string> = { closed: 'Market shut', danger: 'Soldiers at the gate', bid: 'Dealers pay well', buy: 'Cheap to buy' };

const markCache = new Map<number, Record<string, NewsMark[]>>();
/** Which towns today's events touch, and how. */
export function newsMarks(day: number): Record<string, NewsMark[]> {
  const hit = markCache.get(day);
  if (hit) return hit;
  const evs = eventsOn(day);
  const out: Record<string, NewsMark[]> = {};
  for (const st of SETTLEMENTS) {
    const m: NewsMark[] = [];
    if (evs.some((e) => e.closed?.includes(st.id))) m.push('closed');
    if (evs.some((e) => e.danger?.includes(st.id))) m.push('danger');
    if (cityBidMod(day, st.id) > 1.02 || evs.some((e) => e.demand?.some((d) => d.sid === st.id))) m.push('bid');
    if (cityBuyMod(day, st.id) < 0.98) m.push('buy');
    if (m.length) out[st.id] = m;
  }
  if (markCache.size > 8) markCache.clear();
  markCache.set(day, out);
  return out;
}

/** How far the khamsin's sand reaches around the town it blows over, in map px. */
export const KHAMSIN_R = 42;
const zoneCache = new Map<number, Pt[]>();
/** Centres of the sandstorms blowing today. */
export function khamsinZones(day: number): Pt[] {
  const hit = zoneCache.get(day);
  if (hit) return hit;
  const out: Pt[] = [];
  for (const e of eventsOn(day)) {
    // a khamsin of the seasons blows over several towns at once; an older surprise over one
    for (const id of e.dust ?? (e.surprise === 'khamsin' && e.city ? [e.city] : [])) {
      const st = SETTLEMENTS.find((x) => x.id === id);
      if (st) out.push({ x: st.x, y: st.y });
    }
  }
  if (zoneCache.size > 8) zoneCache.clear();
  zoneCache.set(day, out);
  return out;
}
export const inKhamsin = (day: number, p: Pt) => khamsinZones(day).some((z) => dist(z, p) < KHAMSIN_R);
/** walking pace inside a khamsin's sand */
export const KHAMSIN_PACE = 0.8;
/** The Nile in flood (August to October): the Delta's low roads and the valley fields are under
 *  water and caravans keep to the dykes. Walking pace there, else 1. */
export function floodPace(day: number, p: Pt): number {
  if (!floodOn(day)) return 1;
  const delta = p.y > 335 && p.y < 420 && p.x > 75 && p.x < 335;
  const valley = p.y >= 420 && p.y < 520 && p.x > 120 && p.x < 235 && terrainAt(p) === 'fertile';
  return delta || valley ? 0.85 : 1;
}
/** Snow on the Persian passes (December to mid-March): the pass the caravan is on, if any. */
export const snowPass = (day: number, p: Pt) => (snowOn(day) ? SNOW_PASSES.find((s) => dist(s, p) < s.r) : undefined);
/** walking pace over a snowbound pass */
export const SNOW_PACE = 0.5;
export const snowPace = (day: number, p: Pt) => (snowPass(day, p) ? SNOW_PACE : 1);
/** How much longer a walk along this path takes today for sand, flood and snow (1 = no change). */
export function seasonPathMult(day: number, path: Pt[] | null): number {
  if (!path || path.length < 2) return 1;
  const sand = khamsinZones(day).length > 0, flood = floodOn(day), snow = snowOn(day);
  if (!sand && !flood && !snow) return 1;
  if (!snow) {
    let sum = 0;
    for (const p of path) sum += 1 / ((sand && inKhamsin(day, p) ? KHAMSIN_PACE : 1) * floodPace(day, p));
    return sum / path.length;
  }
  // in the snow months, weighed by distance (a pass is a short stretch of a long road): a long straight stretch counts for its length, not as one point
  let sum = 0, len = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], d = dist(a, b), n = Math.max(1, Math.ceil(d / 4));
    for (let k = 0; k < n; k++) {
      const p = { x: a.x + ((b.x - a.x) * (k + 0.5)) / n, y: a.y + ((b.y - a.y) * (k + 0.5)) / n };
      sum += (d / n) / ((sand && inKhamsin(day, p) ? KHAMSIN_PACE : 1) * floodPace(day, p) * (snow ? snowPace(day, p) : 1));
      len += d / n;
    }
  }
  return len ? sum / len : 1;
}

/** What a travelling party carries, for the small label beside it on the map. Raiders and hired men carry nothing to sell. */
export function partyGoods(p: Party): { label: string; icon: string; note: string } | null {
  if (p.kind === 'caravan') {
    if (/wool/i.test(p.name)) return { label: 'wool', icon: 'bag', note: 'Bales of Aleppo wool, bound south for the Cairo dyers.' };
    if (/carpet|rug/i.test(p.name)) return { label: 'carpets', icon: 'scroll', note: 'Persian carpets rolled in sacking, on the Baghdad road.' };
    if (/salt/i.test(p.name)) return { label: 'salt', icon: 'bag', note: 'Blocks of oasis salt, and dates from the Fayoum.' };
    return { label: 'goods', icon: 'bag', note: 'Mixed bales and baskets.' };
  }
  if (p.kind === 'bedouin') return { label: 'goats', icon: 'paw', note: 'Goats, ghee and goat-hair cloth.' };
  return null;
}
