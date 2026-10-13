// Letters and telegrams. In 1925 news of trade came by post: a letter from Cairo or Alexandria to a
// Giza stall took a day or two, from the Levant longer. Cohen writes before he calls to place an
// order; a visitor staying in a town is heard of when his letter comes; a new job is written about.
// Telegrams went from any town with a State Telegraphs office and were answered within hours.
//
// Pure logic: no store import (the store imports this file).
import type { GameState } from '../state/store';
import type { Visit } from '../../data/jobs';
import { openJobs } from '../../data/jobs';
import { dateFor } from '../economy/economy';
import { settlementById } from './world';

export interface Letter {
  id: string;
  /** the day it reaches you */
  day: number;
  sent: number;
  kind: 'letter' | 'telegram';
  from: string;
  title: string;
  body: string;
  read?: boolean;
}
export interface PostState {
  letters: Letter[];
  /** the day Cohen wrote he would call at the stall to place an order */
  cohenCall?: number;
  /** jobs you have already been told of */
  jobsKnown?: string[];
}
export const POST_START: PostState = { letters: [] };
/** letters kept in the post list */
export const POST_KEEP = 30;

/** Towns with an office of the Egyptian State Telegraphs, or a telegraph office of their own country. */
export const TELEGRAPH_TOWNS = ['cairo', 'alexandria', 'portsaid', 'jerusalem', 'damascus', 'beirut', 'baghdad', 'istanbul'];
const EGYPT = ['giza', 'cairo', 'alexandria', 'portsaid'];
/** A short telegram (a dozen words): 3 piastres inside Egypt, 5 to or from Palestine, Syria, Iraq or
 *  Turkey. Asking a price is sent reply paid, so the answer costs the same again. */
export const TELEGRAM = { inland: 3, abroad: 5 } as const;
export const telegramFee = (from: string, to: string) => (EGYPT.includes(from) && EGYPT.includes(to) ? TELEGRAM.inland : TELEGRAM.abroad);

export const unread = (p: PostState | undefined, day: number) => (p?.letters ?? []).filter((l) => l.day <= day && !l.read).length;
export const arrived = (p: PostState | undefined, day: number) => (p?.letters ?? []).filter((l) => l.day <= day).slice().reverse();

let n = 0;
export const letterId = (day: number) => `l${day}-${Date.now().toString(36)}-${(n++).toString(36)}`;
export function post(p: PostState | undefined, l: Omit<Letter, 'id'>): PostState {
  const base = p ?? POST_START;
  return { ...base, letters: [...base.letters, { ...l, id: letterId(l.sent) }].slice(-POST_KEEP) };
}

/** a day that is not his Sabbath */
const notSaturday = (d: number) => (dateFor(d).weekday === 'Saturday' ? d + 1 : d);
/** a letter's days on the road: a day or two from Cairo, two or three from further off */
const delay = (city: string, rng: () => number) => (EGYPT.includes(city) ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 2));

type Night = Pick<GameState, 'post' | 'visits' | 'cohen' | 'queue' | 'arrivals' | 'jobsDone' | 'reputation' | 'day'>;

/** The night's post, after the day's rollover has been worked out. `s` is the state the night began
 *  with, `patch` what the rollover changed (visits, the queue, Cohen), `day` the new day. Lines for the
 *  morning go into `notes`. Returns the fields to add to the patch. */
export function postNight(s: Night, patch: Partial<GameState>, notes: string[], day: number, rng: () => number): Partial<GameState> {
  let p: PostState = s.post ?? POST_START;
  const out: Partial<GameState> = {};

  // a visitor in a town: his letter comes in a day or three, and he stays as long after it arrives
  const before = new Set((s.visits ?? []).map((v) => v.id));
  if (patch.visits) {
    const visits: Visit[] = patch.visits.map((v) => {
      if (before.has(v.id) || v.heard !== undefined) return v;
      const d = delay(v.city, rng);
      const i = notes.findIndex((x) => x.startsWith(`${v.who} is in `));
      if (i >= 0) notes.splice(i, 1);
      p = post(p, { day: day + d, sent: day, kind: 'letter', from: v.who, title: `A buyer in ${settlementById(v.city).name}`, body: `${v.text} Staying until ${dateFor(v.until + d).short}.` });
      return { ...v, heard: day + d, until: v.until + d };
    });
    out.visits = visits;
  }

  // Cohen writes before he calls to place an order; with an order open he just comes
  const cohen = patch.cohen ?? s.cohen;
  const open = cohen?.order?.status === 'accepted';
  let queue = patch.queue ?? s.queue;
  if (!open) {
    if (p.cohenCall !== undefined && p.cohenCall < day) p = { ...p, cohenCall: undefined };
    if (p.cohenCall === day) {
      if (!queue.includes('cohen')) {
        queue = [...queue, 'cohen'];
        const arr = [...(patch.arrivals ?? s.arrivals ?? [])];
        arr.push(Math.min(19.5, Math.max(10, (arr[arr.length - 1] ?? 9) + 1)));
        out.arrivals = arr;
      }
      notes.push('Cohen is calling at the stall today, as his letter said.');
    } else if (queue.includes('cohen')) {
      queue = queue.filter((id) => id !== 'cohen');
      if (p.cohenCall === undefined) {
        const comes = day + 1 + Math.floor(rng() * 2);
        const call = notSaturday(comes + 1);
        p = { ...post(p, { day: comes, sent: day, kind: 'letter', from: 'Cohen, textile wholesaler, Cairo', title: (cohen?.visits ?? 0) > 0 ? 'Another order for the hotels' : 'An order for the hotels', body: `${(cohen?.visits ?? 0) > 0 ? 'I have another order to place with you.' : 'I am told you keep honest rugs at your stall in Giza.'} Two corridor rugs, medium size, hard-wearing wool, a matching pair. I will call at your stall on ${dateFor(call).long.replace(/ \d{4}$/, '')}.` }), cohenCall: call };
      }
    }
    if (queue !== (patch.queue ?? s.queue)) out.queue = queue;
  }

  // a new job on the map is written about once
  const jobs = openJobs(s.jobsDone, patch.reputation ?? s.reputation).map((j) => j.id);
  if (!p.jobsKnown) p = { ...p, jobsKnown: jobs };
  else for (const j of openJobs(s.jobsDone, patch.reputation ?? s.reputation)) {
    if (p.jobsKnown!.includes(j.id)) continue;
    const d = delay(j.target, rng);
    p = { ...post(p, { day: day + d, sent: day, kind: 'letter', from: j.giver, title: j.title, body: j.text }), jobsKnown: [...p.jobsKnown!, j.id] };
  }

  // what came this morning
  for (const l of p.letters) if (l.day === day && l.kind === 'letter') notes.push(`Post: a letter from ${l.from}, "${l.title}". Read it under Progress, Post.`);
  if (p !== s.post) out.post = p;
  return out;
}
