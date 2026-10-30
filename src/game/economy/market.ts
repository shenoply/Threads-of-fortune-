// The market's mood, day by day: one kind of rug the town is after, one it has too much of. A buyer
// pays more for what is wanted; Rashid charges less for what is piling up in his back room. Buy the
// glut, sell the fashion. Hashed from the day, so it never touches the game's dice and every player
// sees the same Cairo on the same day.
import { RUGS } from '../../data/rugs';
import type { RugType } from '../types';
import { eraSellMult, eraBuyMult } from './era';

export interface Family { id: string; label: string; test: (t: RugType) => boolean; up: string[]; down: string[] }

const has = (t: RugType, x: string) => (t.traits as string[] | undefined)?.includes(x) ?? false;

export const FAMILIES: Family[] = [
  { id: 'village', label: 'Village rugs', test: (t) => has(t, 'humble') || has(t, 'hardwearing'),
    up: ['A new hotel in Heliopolis is furnishing forty rooms', 'The railway is fitting out its waiting rooms'],
    down: ['Three carts of village rugs came in from Fayoum', 'The Delta weavers sent more than anyone ordered'] },
  { id: 'fine', label: 'Fine weaves', test: (t) => has(t, 'fineWeave'),
    up: ['The Garden City season has begun', 'A pasha\'s daughter is to be married next month'],
    down: ['An importer is clearing his stock of fine pieces', 'Half of Zamalek has gone to Europe for the summer'] },
  { id: 'bold', label: 'Bold patterns', test: (t) => has(t, 'bold'),
    up: ['The cabarets on Emad el-Din are redecorating', 'A French magazine says bold is the fashion'],
    down: ['The fashion has turned quiet this month', 'A Greek dealer is selling off loud carpets cheaply'] },
  { id: 'quiet', label: 'Quiet rugs', test: (t) => has(t, 'restrained'),
    up: ['The ministries are refitting their offices', 'The English families want something restrained'],
    down: ['Everyone has a quiet rug this year', 'A widow in Shubra is selling her late husband\'s stock'] },
  { id: 'old', label: 'Old and rare pieces', test: (t) => has(t, 'antique') || has(t, 'rare'),
    up: ['American collectors are in town for the winter', 'The museum has bought, and prices have followed'],
    down: ['A house in Alexandria has sold everything at auction', 'Too many fakes about: buyers are wary of old pieces'] },
  { id: 'warm', label: 'Warm reds and golds', test: (t) => has(t, 'warm'),
    up: ['Winter is coming on and people want warm colours', 'The wedding season has started'],
    down: ['The summer heat has everyone wanting cool colours', 'The dyers made too much madder red this year'] },
];

export interface MarketDay { up: Family; down: Family; upBy: number; downBy: number; why: string; whyDown: string }

const r = (n: number) => Math.abs(Math.sin(n * 91.345 + 7.77) * 43758.5453) % 1;

/** the market on a day. The first days of the game are steady, so the opening lessons read true. */
export function marketOn(day: number): MarketDay | null {
  if (day < 4) return null;
  const a = Math.floor(r(day) * FAMILIES.length);
  let b = Math.floor(r(day + 0.5) * (FAMILIES.length - 1));
  if (b >= a) b++;
  const up = FAMILIES[a], down = FAMILIES[b];
  return {
    up, down,
    upBy: 0.15 + Math.round(r(day + 0.25) * 3) * 0.05,
    downBy: 0.1 + Math.round(r(day + 0.75) * 2) * 0.05,
    why: up.up[Math.floor(r(day * 3) * up.up.length)],
    whyDown: down.down[Math.floor(r(day * 5) * down.down.length)],
  };
}

/** what a buyer pays for this rug today, against an ordinary day */
export function demandFor(typeId: string, day?: number): number {
  if (day === undefined) return 1;
  const m = marketOn(day), t = RUGS[typeId];
  if (!m || !t) return 1;
  // the times (era.ts): American buyers, the slump, a tariff
  let k = eraSellMult(day, typeId, 'giza');
  if (m.up.test(t)) k *= 1 + m.upBy;
  if (m.down.test(t)) k *= 1 - m.downBy * 0.6;
  return k;
}

/** what Rashid charges for this rug today: the glut is cheap, the fashion a little dearer */
export function supplyFor(typeId: string, day: number): number {
  const m = marketOn(day), t = RUGS[typeId];
  if (!m || !t) return 1;
  let k = eraBuyMult(day, typeId, 'giza');
  if (m.down.test(t)) k *= 1 - m.downBy;
  if (m.up.test(t)) k *= 1 + m.upBy * 0.4;
  return k;
}

/** ▲ wanted today, ▼ too many about, or nothing */
export function trendOf(typeId: string, day: number): 'up' | 'down' | null {
  const m = marketOn(day), t = RUGS[typeId];
  if (!m || !t) return null;
  if (m.up.test(t)) return 'up';
  if (m.down.test(t)) return 'down';
  return null;
}
