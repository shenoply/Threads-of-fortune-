// Today's news as it shows on the travel map: small badges at the towns it touches, and the khamsin's sand haze.
import { eventsOn, cityBidMod, cityBuyMod } from '../economy/life';
import { SETTLEMENTS } from '../../data/world';
import { dist, type Party, type Pt } from './world';

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
    if (e.surprise !== 'khamsin' || !e.city) continue;
    const st = SETTLEMENTS.find((x) => x.id === e.city);
    if (st) out.push({ x: st.x, y: st.y });
  }
  if (zoneCache.size > 8) zoneCache.clear();
  zoneCache.set(day, out);
  return out;
}
export const inKhamsin = (day: number, p: Pt) => khamsinZones(day).some((z) => dist(z, p) < KHAMSIN_R);

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
