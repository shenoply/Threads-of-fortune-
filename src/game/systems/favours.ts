// Favours: what the world's people ask of a merchant they have come to like. Each is a small job with a
// real payoff (money, their regard, sometimes your name) and a real cost if you take it and let them down.
// Kinds: carry a letter to someone in another town; find them a rug of a quality; lend them money, repaid
// with interest after some weeks; rid their road of a band's leader. Pure: the store keeps the state.
import { world, type Person } from './population';
import { RUGS } from '../../data/rugs';
import { SETTLEMENTS } from '../../data/world';
import type { RugItem } from '../types';
import { fmt } from '../economy/money';

export type FavourKind = 'letter' | 'rug' | 'loan' | 'band';
export interface Favour {
  id: string;
  giver: string;
  kind: FavourKind;
  /** the day you took it on, and the day it must be done by */
  day: number; due: number;
  /** a letter: who it is for */
  to?: string;
  /** a rug: the least tier that will do */
  tier?: number;
  /** a loan: what you lent, and what comes back */
  lent?: number; back?: number;
  /** a band: whose band (party id) and its leader */
  band?: string; leader?: string;
  /** what you are paid when it is done (letters and bands; rugs are paid for, loans repaid) */
  pay: number;
  text: string;
  /** a loan already put off once */
  delayed?: boolean;
}
export interface FavourState { active: Favour[]; done: number; failed: number; /** the last day each person gave or settled a favour */ last: Record<string, number> }
export const FAVOURS_START: FavourState = { active: [], done: 0, failed: 0, last: {} };

/** how well you must stand with someone before they ask */
export const FAVOUR_REL = 10;
/** days between one person's favours */
export const FAVOUR_GAP = 12;

const town = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name.split(',')[0] ?? id;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const RANK_MULT = { humble: 0.7, trade: 1, notable: 1.6, grand: 2.4 } as const;

/** the roads each town's people worry about: towns within reach of each band (combat.ts BAND_ROAD) */
export const BAND_TOWNS: Record<string, string[]> = {
  rb0: ['cairo', 'giza', 'suez', 'saqqara'], rb1: ['suez', 'sinai'], rb2: ['jaffa', 'jerusalem'], rb3: ['jerusalem', 'amman', 'damascus'],
  rb4: ['damascus', 'baghdad'], rb5: ['aleppo', 'konya'], r0: ['sinai', 'bedouin', 'suez'], r1: ['damascus', 'aleppo', 'baghdad'],
};

export interface OfferCtx { day: number; rel: number; last?: number; busy: boolean; bands: { id: string; leader: string; free: boolean }[] }

/** What this person would ask of you today, or null: they must like you, not have asked lately, and you
 *  must not already be doing something for them. */
export function favourFor(p: Person, c: OfferCtx): Favour | null {
  if (p.role === 'kin' || c.busy || c.rel < FAVOUR_REL) return null;
  if (c.last !== undefined && c.day - c.last < FAVOUR_GAP) return null;
  const w = world();
  const h = p.house ? w.houses[p.house] : undefined;
  const mult = RANK_MULT[h?.rank ?? 'trade'];
  const seed = hash(`${p.id}:${Math.floor(c.day / FAVOUR_GAP)}`);
  const band = c.bands.find((b) => b.free && BAND_TOWNS[b.id]?.includes(p.home));
  const kinds: FavourKind[] = ['letter', 'letter', 'rug', 'loan', ...(band && c.rel >= 25 ? ['band' as const] : []), ...(p.role === 'souq' || p.role === 'dealer' || p.role === 'craft' ? ['rug' as const] : [])];
  const kind = kinds[seed % kinds.length];
  const base = { id: `fav-${p.id}-${c.day}`, giver: p.id, day: c.day };
  if (kind === 'letter') {
    // someone of standing in another town: a dealer, a souq master, a merchant, someone of their own people first
    const away = Object.values(w.people).filter((x) => x.home !== p.home && x.role !== 'kin' && x.role !== 'character' && !x.npc);
    const own = away.filter((x) => x.culture === p.culture);
    const pool = own.length > 3 ? own : away;
    const to = pool[seed % pool.length];
    const pay = Math.round((60 + (seed % 60)) * mult / 5) * 5;
    return { ...base, kind, to: to.id, due: c.day + 40, pay, text: `"Would you carry a letter for me to ${to.name} in ${town(to.home)}? Put it in no hands but ${to.sex === 'f' ? 'hers' : 'his'}." ${fmt(pay)} when it is delivered.` };
  }
  if (kind === 'rug') {
    const tier = Math.min(4, 1 + (seed % 2) + (mult >= 1.6 ? 1 : 0));
    const word = ['', 'a decent village rug', 'a good workshop piece', 'a fine rug, the best you can find', 'a rug fit for a palace'][tier];
    return { ...base, kind, tier, due: c.day + 35, pay: 0, text: `"I need ${word} for my house. Bring me one and I will pay what it is worth, and more for the trouble."` };
  }
  if (kind === 'loan') {
    const lent = Math.round((150 + (seed % 250)) * mult / 10) * 10;
    const back = Math.round(lent * 1.25 / 10) * 10;
    return { ...base, kind, lent, back, due: c.day + 21, pay: 0, text: `"A bad month. Could you lend me ${fmt(lent)}? In three weeks you will have ${fmt(back)} back, on my honour."` };
  }
  const pay = Math.round((300 + (seed % 200)) * mult / 10) * 10;
  return { ...base, kind: 'band', band: band!.id, leader: band!.leader, due: c.day + 60, pay, text: `"${band!.leader} has made the road a misery for all of us. See him taken alive and handed to the police, and there is ${fmt(pay)} in it for you."` };
}

/** whether a favour can be settled now, and how */
export function canSettle(f: Favour, at: { talkingTo: string; inventory: RugItem[]; leaderJailed: (band: string) => boolean; day: number }): { ok: boolean; why: string; rug?: RugItem } {
  if (f.kind === 'letter') return at.talkingTo === f.to ? { ok: true, why: '' } : { ok: false, why: 'The letter is for someone else.' };
  if (at.talkingTo !== f.giver) return { ok: false, why: '' };
  if (f.kind === 'rug') {
    const rug = [...at.inventory].filter((i) => !i.stored && (RUGS[i.typeId]?.tier ?? 0) >= (f.tier ?? 1)).sort((a, b) => (RUGS[a.typeId]?.tier ?? 0) - (RUGS[b.typeId]?.tier ?? 0))[0];
    return rug ? { ok: true, why: '', rug } : { ok: false, why: `You carry nothing good enough yet: a rug of quality ${f.tier} or better.` };
  }
  if (f.kind === 'loan') return at.day >= f.due ? { ok: true, why: '' } : { ok: false, why: `Not due until ${f.due - at.day} days from now.` };
  return f.band && at.leaderJailed(f.band) ? { ok: true, why: '' } : { ok: false, why: `${f.leader} is still free.` };
}

/** a rug handed over for a favour: its worth and a quarter more */
export const rugPrice = (r: RugItem) => Math.round((RUGS[r.typeId]?.valueBand[1] ?? 100) * 1.25);

export const KIND_WORD: Record<FavourKind, string> = { letter: 'A letter to carry', rug: 'A rug to find', loan: 'A loan', band: 'A band to end' };
export const favourLine = (f: Favour) => {
  const g = world().people[f.giver], to = f.to ? world().people[f.to] : undefined;
  return f.kind === 'letter' ? `Carry ${g?.short}'s letter to ${to?.name} in ${town(to?.home ?? '')}`
    : f.kind === 'rug' ? `Find ${g?.short} a rug of quality ${f.tier} or better`
    : f.kind === 'loan' ? `${g?.short} owes you ${fmt(f.back ?? 0)} (due day ${f.due})`
    : `See ${f.leader} jailed, for ${g?.short}`;
};
