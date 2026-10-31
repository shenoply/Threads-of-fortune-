// Stories: five longer tales that run over weeks, each told in a few beats through the ways news already
// reaches you (a letter, the Courier, someone at your stall, a place on a town's menu). Every beat asks you
// to choose, the choice has effects that last (money, your name, an epithet, a rival's temper, a buyer's
// memory of you, a carpet, a new acquaintance), and later beats remember what you chose. One or two run
// at a time; they open by date and by your name in the trade. The tales themselves are in data/stories.ts.
// Pure logic: no store import (the store imports this file).
import type { GameState } from '../state/store';
import type { Manner } from '../../data/character';
import type { RugItem, Provenance, Condition } from '../types';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { fmt } from '../economy/money';
import { dateFor } from '../economy/economy';
import { post } from './post';
import { SETTLEMENTS } from '../../data/world';
import { HOUSE, housesOf, freshHouses, COURT_DAYS, TRUCE_DAYS } from './houses';
import { remember, forget, type Mem } from './memory';
import { ARCS, type Arc, type Beat, type Ctx } from '../../data/stories';

export type Via = 'letter' | 'courier' | 'stall' | 'town';
export interface StoryPick { beat: string; choice: string; label: string; day: number; text: string }
export interface ArcRun {
  beat: string;
  /** the day the beat reaches you */
  at: number;
  /** the day it did */
  shown?: number;
  started: number;
  status: 'on' | 'done';
  ended?: number;
  /** how it ended, in a line */
  end?: string;
  picks: StoryPick[];
  flags: Record<string, string | number | boolean>;
}
export interface StoriesState {
  runs: Record<string, ArcRun>;
  /** the day the last tale began */
  lastStart: number;
  /** the Courier's items, newest last */
  news: { day: number; text: string; arc: string }[];
  /** what the bazaar will remember of your stories (epithets read these) */
  marks: string[];
  /** things that outlast one tale: a Coastguard patrol on the Canal road, a friend at the museum */
  flags: Record<string, string | number | boolean>;
}
export const freshStories = (day = 1): StoriesState => ({ runs: {}, lastStart: day, news: [], marks: [], flags: {} });
export const storiesOf = (s: Pick<GameState, 'stories' | 'day'>): StoriesState => s.stories ?? freshStories(s.day);

/** tales running at once, at most */
export const MAX_ON = 2;
/** quiet days between one tale beginning and the next */
export const START_GAP = 12;

// ---------- the effects a choice can have ----------
export type Fx =
  | { cash: number; label: string }
  | { rep: number }
  | { manner: Partial<Manner> }
  | { house: string; mood?: number; rep?: number; purse?: number; stock?: number; truce?: boolean }
  | { mem: string; m: Omit<Mem, 'day'>; forget?: Mem['k'][] }
  | { rug: { typeId: string; note: string; provenance?: Provenance; condition?: Condition; paid: number; fakeAge?: boolean; key?: string } }
  | { loseRug: string }
  | { mark: string }
  | { appoint: string; inDays: number; friendOf?: string }
  | { court: string; by: string }
  | { lie: true }
  | { global: string; v: string | number | boolean }
  | { journal: string };

export interface Outcome {
  /** what happened, told plainly: kept with the choice */
  text: string;
  fx?: Fx[];
  /** the next beat, and in how many days it comes (0: the same day) */
  next?: string;
  wait?: number;
  /** the tale is over: how it ended */
  end?: string;
  flags?: Record<string, string | number | boolean>;
}

const hx = (seed: number, day: number, k: string) => {
  let h = 2166136261 ^ Math.imul(day + 7, 2654435761) ^ seed;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
/** a roll that is the same however often the page is opened: the seed, the tale and the day */
export const storyRoll = (s: Pick<GameState, 'worldSeed'>, arc: string, day: number, k: string) => hx(s.worldSeed ?? 0, day, `${arc}:${k}`);

const emptyRel = () => ({ visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] as string[] });
let uidN = 0;
const storyRug = (r: Extract<Fx, { rug: unknown }>['rug'], day: number): RugItem => ({
  uid: `st${day}x${Date.now().toString(36)}${uidN++}`, typeId: r.typeId, condition: r.condition ?? 'Good', restored: false,
  provenance: r.provenance ?? RUGS[r.typeId]?.provenance ?? 'Uncertain', paid: r.paid, notes: [r.note], stored: true,
  ...(r.fakeAge ? { fakeAge: true } : {}), ...(r.key ? { story: r.key } : {}),
});

/** Apply a choice's effects to the state. Returns the fields changed. */
export function applyFx(s: GameState, fx: Fx[], day: number): Partial<GameState> {
  const w: GameState = { ...s };
  const out: Partial<GameState> = {};
  const put = <K extends keyof GameState>(k: K, v: GameState[K]) => { w[k] = v; out[k] = v; };
  for (const f of fx) {
    if ('house' in f) {
      const H0 = w.houses ?? freshHouses(day);
      const st = H0.list[f.house];
      if (!st || st.status === 'gone') continue;
      const me = { ...st };
      if (f.mood) me.mood = Math.max(-5, Math.min(5, me.mood + f.mood));
      if (f.rep) me.rep = Math.max(5, Math.min(95, me.rep + f.rep));
      if (f.purse) me.purse += f.purse;
      if (f.stock) me.stock = Math.max(0, me.stock + f.stock);
      if (f.truce) me.truce = day + TRUCE_DAYS;
      put('houses', { ...H0, list: { ...H0.list, [f.house]: me } });
    } else if ('cash' in f) {
      put('cash', w.cash + f.cash);
      put('ledger', [...w.ledger, { day, kind: f.cash >= 0 ? 'bonus' : 'expense', label: f.label, amount: f.cash }]);
    } else if ('rep' in f) put('reputation', Math.max(0, w.reputation + f.rep));
    else if ('manner' in f) {
      const m = { ...w.manner };
      for (const [k, v] of Object.entries(f.manner) as [keyof Manner, number][]) m[k] = Math.max(-100, Math.min(100, m[k] + v));
      put('manner', m);
    } else if ('mem' in f) {
      const rel0 = w.relationships[f.mem] ?? emptyRel();
      const rel = remember(f.forget ? forget(rel0, f.forget) : rel0, { ...f.m, day });
      put('relationships', { ...w.relationships, [f.mem]: rel });
    } else if ('rug' in f) put('inventory', [...w.inventory, storyRug(f.rug, day)]);
    else if ('loseRug' in f) {
      const i = w.inventory.findIndex((r) => r.story === f.loseRug || r.uid === f.loseRug);
      if (i >= 0) put('inventory', w.inventory.filter((_, k) => k !== i));
    } else if ('mark' in f) {
      const st = storiesOf(w);
      if (!st.marks.includes(f.mark)) put('stories', { ...st, marks: [...st.marks, f.mark] });
    } else if ('appoint' in f) {
      put('appointments', [...(w.appointments ?? []), { buyerId: f.appoint, day: day + f.inDays, venue: f.friendOf ? 'friend' : 'story' }]);
      if (f.friendOf) put('relationships', { ...w.relationships, [f.appoint]: { ...(w.relationships[f.appoint] ?? emptyRel()), friendOf: f.friendOf } });
    } else if ('court' in f) {
      const H0 = w.houses ?? freshHouses(day);
      if (!BUYERS[f.court] || H0.courted.some((c) => c.buyer === f.court) || H0.defected[f.court] || H0.list[f.by]?.status !== 'trading') continue;
      put('houses', { ...H0, courted: [...H0.courted, { buyer: f.court, by: f.by, day, until: day + COURT_DAYS }],
        log: [...H0.log, { day, by: f.by, text: `${HOUSE[f.by] ? housesName(f.by) : 'A rival'} has been calling on ${BUYERS[f.court].name}.` }].slice(-40) });
    } else if ('lie' in f) put('stats', { ...(w.stats ?? {}), liesCaught: (w.stats?.liesCaught ?? 0) + 1 });
    else if ('global' in f) {
      const st = storiesOf(w);
      put('stories', { ...st, flags: { ...st.flags, [f.global]: f.v } });
    } else if ('journal' in f) put('journal', [...w.journal, { day, text: f.journal, kind: 'stall' }]);
  }
  return out;
}
const housesName = (id: string) => HOUSE[id]?.short ?? id;

// ---------- reading where a tale stands ----------
export const arcOf = (id: string): Arc | undefined => ARCS.find((a) => a.id === id);
export const ctxOf = (s: GameState, arc: Arc, run: ArcRun, day = s.day): Ctx => ({ s, run, day, f: run.flags, g: storiesOf(s).flags, marks: storiesOf(s).marks, roll: (k) => storyRoll(s, arc.id, run.shown ?? day, k) });
export const beatOf = (arc: Arc, run: ArcRun): Beat | undefined => arc.beats[run.beat];
export const townOf = (b: Beat, c: Ctx) => (typeof b.town === 'function' ? b.town(c) : b.town);

/** a beat waiting for your answer */
export interface Pending { arc: Arc; run: ArcRun; beat: Beat; c: Ctx }
export function pendingAll(s: GameState): Pending[] {
  const st = storiesOf(s);
  const out: Pending[] = [];
  for (const arc of ARCS) {
    const run = st.runs[arc.id];
    if (!run || run.status !== 'on' || run.shown === undefined) continue;
    const beat = beatOf(arc, run);
    if (beat) out.push({ arc, run, beat, c: ctxOf(s, arc, run) });
  }
  return out;
}
/** beats waiting at the stall, or on a town's menu */
export const pendingAt = (s: GameState, via: Via, town?: string) => pendingAll(s).filter((p) => p.beat.via === via && (via !== 'town' || townOf(p.beat, p.c) === town));

export interface ChoiceView { id: string; label: string; cost?: number; blocked?: string }
export function choicesOf(p: Pending): ChoiceView[] {
  return p.beat.choices.filter((ch) => !ch.hidden?.(p.c)).map((ch) => {
    const cost = typeof ch.cost === 'function' ? ch.cost(p.c) : ch.cost;
    const need = ch.need?.(p.c) ?? (cost && p.c.s.cash < cost ? `You need ${fmt(cost)}.` : undefined);
    return { id: ch.id, label: ch.label, cost, blocked: need };
  });
}
export const beatText = (p: Pending) => p.beat.text(p.c);
export const beatTitle = (p: Pending) => (typeof p.beat.title === 'function' ? p.beat.title(p.c) : p.beat.title);
export const beatWho = (p: Pending) => (typeof p.beat.who === 'function' ? p.beat.who(p.c) : p.beat.who);

// ---------- moving a tale on ----------
/** Deliver a beat: a letter in the post, an item in the Courier, a word that someone waits at the stall or in a town. */
function deliver(s: GameState, st: StoriesState, arc: Arc, run: ArcRun, day: number, notes: string[]): { st: StoriesState; post?: GameState['post']; journal: GameState['journal'] } {
  const r: ArcRun = { ...run, shown: day };
  const beat = arc.beats[r.beat];
  let next: StoriesState = { ...st, runs: { ...st.runs, [arc.id]: r } };
  const journal: GameState['journal'] = [];
  if (!beat) return { st: next, journal };
  const c = ctxOf(s, arc, r, day);
  const title = typeof beat.title === 'function' ? beat.title(c) : beat.title;
  const who = typeof beat.who === 'function' ? beat.who(c) : beat.who;
  let pst: GameState['post'] | undefined;
  if (beat.via === 'letter') {
    pst = post(s.post, { day, sent: day - 1, kind: 'letter', from: who ?? 'A letter', title, body: beat.text(c), story: { arc: arc.id, beat: r.beat } });
    notes.push(`Post: a letter from ${who ?? 'someone'}, "${title}". It asks for an answer: read it under Progress, Post.`);
  } else if (beat.via === 'courier') {
    next = { ...next, news: [...next.news, { day, text: `${stop(title)} ${beat.text(c)}`, arc: arc.id }].slice(-20) };
    notes.push(`In the Courier: ${stop(title)} Answer it under Progress, Stories.`);
  } else if (beat.via === 'stall') {
    notes.push(`${who ?? 'Someone'} is waiting to speak to you at your stall in Giza. (${arc.title})`);
  } else {
    const town = townOf(beat, c);
    notes.push(`${title}: it waits for you in ${townName(town)}, on the town's menu. (${arc.title})`);
  }
  journal.push({ day, text: `${arc.title}: ${stop(title)}`, kind: 'stall' });
  return { st: next, post: pst, journal };
}
export const stop = (t: string) => (/[.?!]$/.test(t) ? t : `${t}.`);
export const townName = (id?: string) => SETTLEMENTS.find((x) => x.id === id)?.name ?? 'town';

/** Your choice at a beat. */
export function storyChoose(s: GameState, arcId: string, choiceId: string): { patch: Partial<GameState>; msg: string } {
  const arc = arcOf(arcId);
  const st = storiesOf(s);
  const run = st.runs[arcId];
  if (!arc || !run || run.status !== 'on' || run.shown === undefined) return { patch: {}, msg: '' };
  const beat = arc.beats[run.beat];
  const ch = beat?.choices.find((x) => x.id === choiceId);
  if (!beat || !ch) return { patch: {}, msg: '' };
  const p: Pending = { arc, run, beat, c: ctxOf(s, arc, run) };
  const view = choicesOf(p).find((x) => x.id === choiceId);
  if (!view) return { patch: {}, msg: '' };
  if (view.blocked) return { patch: {}, msg: view.blocked };
  const o = ch.go(p.c);
  return settleChoice(s, arc, run, beat.id, ch.label, choiceId, o, view.cost);
}

function settleChoice(s: GameState, arc: Arc, run: ArcRun, beatId: string, label: string, choiceId: string, o: Outcome, cost?: number): { patch: Partial<GameState>; msg: string } {
  const day = s.day;
  const fx: Fx[] = [...(cost ? [{ cash: -cost, label: `${arc.title}: ${label}` } as Fx] : []), ...(o.fx ?? [])];
  const patch = applyFx(s, fx, day);
  const st0 = (patch.stories as StoriesState | undefined) ?? storiesOf(s);
  const r: ArcRun = { ...st0.runs[arc.id] ?? run, flags: { ...run.flags, ...(o.flags ?? {}) }, picks: [...run.picks, { beat: beatId, choice: choiceId, label, day, text: o.text }] };
  if (o.end !== undefined || !o.next) { r.status = 'done'; r.ended = day; r.end = o.end ?? o.text; r.shown = undefined; }
  else { r.beat = o.next; r.at = day + (o.wait ?? 0); r.shown = undefined; }
  let st: StoriesState = { ...st0, runs: { ...st0.runs, [arc.id]: r } };
  const journal = [...(patch.journal ?? s.journal), { day, text: `${arc.title}: ${o.text}`, kind: 'stall' }];
  let post0 = s.post;
  // a beat due today comes at once, so the next step is not lost in the night
  if (r.status === 'on' && r.at <= day) {
    const notes: string[] = [];
    const d = deliver({ ...s, ...patch } as GameState, st, arc, r, day, notes);
    st = d.st; if (d.post) post0 = d.post; journal.push(...d.journal);
  }
  return { patch: { ...patch, stories: st, journal, ...(post0 !== s.post ? { post: post0 } : {}) }, msg: o.text };
}

/** The night for the stories: beats come due, answers not given in time are given for you, deadlines pass,
 *  a partnership pays, and a new tale may begin. `s` has the rest of the night applied; `day` is the new day. */
export function storiesNight(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  if (!s.started || s.playMode === 'sandbox' || !s.tutorial?.done) return { patch: {}, notes: [] };
  let st = storiesOf(s);
  const notes: string[] = [];
  const patch: Partial<GameState> = {};
  const cur = () => ({ ...s, ...patch, stories: st } as GameState);
  const addJournal = (j: GameState['journal']) => { if (j.length) patch.journal = [...cur().journal, ...j]; };
  for (const arc of ARCS) {
    let run = st.runs[arc.id];
    if (!run || run.status !== 'on') continue;
    // money that comes in week by week (a partnership), on Mondays
    const weekly = Number(run.flags.weekly ?? 0), until = Number(run.flags.weeklyUntil ?? 0);
    if (weekly > 0 && day <= until && dateFor(day).weekday === 'Monday') {
      Object.assign(patch, applyFx(cur(), [{ cash: weekly, label: `${arc.title}: your share of the week` }], day));
      notes.push(`${arc.title}: your share of the week, ${fmt(weekly)}.`);
    }
    // a deadline passed: the tale turns to its late beat
    const late = arc.late?.(ctxOf(cur(), arc, run, day));
    if (late && late !== run.beat) {
      run = { ...run, beat: late, at: day, shown: undefined };
      st = { ...st, runs: { ...st.runs, [arc.id]: run } };
    }
    const beat = arc.beats[run.beat];
    if (run.shown === undefined && run.at <= day) {
      const d = deliver(cur(), st, arc, run, day, notes);
      st = d.st; if (d.post) patch.post = d.post; addJournal(d.journal);
    } else if (run.shown !== undefined && beat?.expires !== undefined && day > run.shown + beat.expires) {
      // not answered in time: the lapse choice is taken for you, or the tale fades
      const ch = beat.choices.find((x) => x.id === beat.lapse);
      if (ch) {
        const r = settleChoice(cur(), arc, run, beat.id, `${ch.label} (you did not answer)`, ch.id, ch.go(ctxOf(cur(), arc, run, day)));
        const { stories: nst, ...rest } = r.patch;
        Object.assign(patch, rest); st = nst as StoriesState;
        notes.push(`${arc.title}: you did not answer in time. ${r.msg}`);
      } else {
        st = { ...st, runs: { ...st.runs, [arc.id]: { ...run, status: 'done', ended: day, end: 'You let it go, and it went on without you.', shown: undefined } } };
        notes.push(`${arc.title}: you let it go.`);
      }
    }
  }
  // a new tale
  const on = ARCS.filter((a) => st.runs[a.id]?.status === 'on').length;
  if (on < MAX_ON && day - st.lastStart >= START_GAP) {
    const next = ARCS.find((a) => !st.runs[a.id] && a.unlock(cur(), day));
    if (next) {
      st = startRun(st, next.id, day);
      const d = deliver(cur(), st, next, st.runs[next.id], day, notes);
      st = d.st; if (d.post) patch.post = d.post; addJournal(d.journal);
    }
  }
  if (st !== storiesOf(s)) patch.stories = st;
  return { patch, notes };
}

function startRun(st: StoriesState, id: string, day: number): StoriesState {
  const arc = arcOf(id)!;
  return { ...st, lastStart: day, runs: { ...st.runs, [id]: { beat: arc.first, at: day, started: day, status: 'on', picks: [], flags: {} } } };
}

/** For the tester's sheet and the tests: begin a tale now, or bring its next beat now. */
export function forceStory(s: GameState, id: string, what: 'start' | 'advance' | 'reset'): { patch: Partial<GameState>; text: string } {
  const arc = arcOf(id);
  if (!arc) return { patch: {}, text: 'No such story.' };
  let st = storiesOf(s);
  if (what === 'reset') {
    const { [id]: _gone, ...runs } = st.runs; void _gone;
    return { patch: { stories: { ...st, runs } }, text: `${arc.title} is forgotten, and can begin again.` };
  }
  const run = st.runs[id];
  if (what === 'start' || !run || run.status === 'done') st = startRun(st, id, s.day);
  else if (run.shown !== undefined) return { patch: {}, text: `${arc.title} is waiting for your answer.` };
  else st = { ...st, runs: { ...st.runs, [id]: { ...run, at: s.day } } };
  const notes: string[] = [];
  const d = deliver(s, st, arc, st.runs[id], s.day, notes);
  return { patch: { stories: d.st, ...(d.post ? { post: d.post } : {}), journal: [...s.journal, ...d.journal] }, text: notes[0] ?? arc.title };
}

/** the Courier's items from the stories, for a day's paper */
export const storyNews = (s: Pick<GameState, 'stories'>, day: number) => (s.stories?.news ?? []).filter((n) => n.day === day).map((n) => n.text);

/** the Stories list: each tale begun, where it stands, what you chose */
export function storyList(s: GameState) {
  const st = storiesOf(s);
  return ARCS.filter((a) => st.runs[a.id]).map((arc) => {
    const run = st.runs[arc.id];
    const beat = arc.beats[run.beat];
    const c = ctxOf(s, arc, run);
    let where: string;
    if (run.status === 'done') where = run.end ?? 'Over.';
    else if (run.shown === undefined) where = beat?.soon ? beat.soon(c) : 'Something will come of it soon.';
    else if (beat?.via === 'stall') where = `${(typeof beat.who === 'function' ? beat.who(c) : beat.who) ?? 'Someone'} is waiting at your stall in Giza.`;
    else if (beat?.via === 'town') where = `It waits for you in ${townName(townOf(beat, c))}: look on the town's menu.`;
    else if (beat?.via === 'letter') where = 'A letter waits for your answer.';
    else where = 'The Courier has it. What will you do?';
    return { arc, run, where, pending: run.status === 'on' && run.shown !== undefined };
  });
}
