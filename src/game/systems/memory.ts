// Buyers who remember you. Each regular keeps a short memory of how you dealt with them: a fair price, a
// rug that cost them too much, a tall story caught, a kindness, a gift, a promise you did not keep. It
// changes how they come back (warmer and more trusting, or wary and short), and they say so in one line
// when they arrive. A buyer well treated now and then sends a friend, by name; one treated badly is easy
// for a rival house to win (houses.ts courts them first). Regulars who come back after a long while bring
// their news: a wedding, a move, a death in the family, a promotion.
// Pure logic: the store and the negotiation call it; no store import.
import { BUYERS, BUYER_ORDER, BUYER_UNLOCK } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import type { Relationship } from '../types';
import { LIFE_NEWS, LIFE_ANY, type LifeNews } from '../../data/buyerLife';

export type MemKind = 'fair' | 'dear' | 'lie' | 'honest' | 'kind' | 'gift' | 'promise' | 'insult' | 'story' | 'slight';
export interface Mem {
  k: MemKind;
  day: number;
  /** the rug it was about */
  rug?: string;
  /** a line of its own (a story's memory) */
  note?: string;
  /** how strongly it weighs, when not the kind's own */
  w?: number;
}

/** how each kind of memory weighs when they come back: warm above nothing, cold below */
export const MEM_WEIGHT: Record<MemKind, number> = { fair: 1, honest: 1.5, kind: 1, gift: 1.5, story: 2, dear: -1, lie: -2.5, promise: -2, insult: -1.5, slight: -2 };
/** memories kept per buyer */
export const MEM_KEEP = 6;
/** a memory fades to half after a year, and is gone after three */
const fade = (age: number) => (age > 1095 ? 0 : age > 365 ? 0.5 : 1);

/** Women among the buyers, for the lines that need he or she. */
const SHE = new Set(['samira', 'mariam', 'whitcombe', 'levy', 'shivakiar', 'nazli', 'ataturk', 'nawal-badri', 'amina-hilmi', 'maha-qadri', 'salwa-nassar', 'muna-sayegh', 'dalia-barakat', 'lamia-shafiq', 'margaret-hensley']);
export const isShe = (id: string) => SHE.has(id);
const her = (id: string) => (isShe(id) ? 'her' : 'him');
const first = (id: string) => {
  const n = BUYERS[id]?.name ?? 'They';
  return /^(Mr|Mrs|Miss|Madame|Dr|Father|Sheikh|the)\b/i.test(n) ? n : n.split(' ')[0];
};

/** Add a memory, keeping one of each kind (the newest) and the last few in all. */
export function remember(rel: Relationship, m: Mem): Relationship {
  const keep = (rel.mem ?? []).filter((x) => !(x.k === m.k && (m.k !== 'story' || x.note === m.note)));
  return { ...rel, mem: [...keep, m].slice(-MEM_KEEP) };
}
/** Forget the kinds given (a gift makes up for a slight). */
export function forget(rel: Relationship, kinds: MemKind[]): Relationship {
  return { ...rel, mem: (rel.mem ?? []).filter((x) => !kinds.includes(x.k)) };
}

/** how warmly they think of you now: positive warm, negative cold */
export function warmth(rel: Relationship | undefined, day: number): number {
  return (rel?.mem ?? []).reduce((a, m) => a + (m.w ?? MEM_WEIGHT[m.k]) * fade(day - m.day), 0);
}
/** cold enough that a rival could win them */
export const SOUR = -2;
export const sour = (rel: Relationship | undefined, day: number) => warmth(rel, day) <= SOUR;

const rugName = (id?: string) => (id && RUGS[id] ? RUGS[id].name : 'rug');
/** what a memory says, in a few words: it reads after "Remembers", and on the buyer's card */
export function memLine(m: Mem, id: string): string {
  const r = rugName(m.rug);
  switch (m.k) {
    case 'fair': return `the ${r} you sold ${her(id)} at a fair price`;
    case 'dear': return `paying too much for the ${r}`;
    case 'lie': return 'the tall story you told';
    case 'honest': return `the truth you told ${her(id)} about a fault`;
    case 'kind': return 'your kindness at the counter';
    case 'gift': return 'the gift you sent';
    case 'promise': return 'the promise you did not keep';
    case 'insult': return `the price that insulted ${her(id)}`;
    case 'story': case 'slight': { const n = m.note ?? (m.k === 'story' ? 'a good turn you did' : 'a slight'); return n.charAt(0).toLowerCase() + n.slice(1); }
  }
}
/** the same, as a line of its own */
export const memNote = (m: Mem, id: string) => { const t = memLine(m, id); return t.charAt(0).toUpperCase() + t.slice(1); };

const hx = (id: string, day: number, k: string) => {
  let h = 2166136261 ^ Math.imul(day + 1, 2654435761);
  for (const c of `${id}:${k}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

/** a regular who has been away this long comes back with news */
export const LIFE_GAP = 45;
/** and not more often than this */
export const LIFE_EVERY = 150;

export function lifeNewsFor(id: string, rel: Relationship | undefined, day: number): LifeNews | undefined {
  if (!rel || (rel.purchases ?? 0) < 2 || BUYERS[id]?.royal || ['cohen', 'nabil', 'malek'].includes(id)) return undefined;
  const last = rel.seen ?? rel.lastPurchaseDay ?? rel.memo?.day;
  if (last === undefined || day - last < LIFE_GAP) return undefined;
  if (rel.lifeDay !== undefined && day - rel.lifeDay < LIFE_EVERY) return undefined;
  const told = new Set(rel.life ?? []);
  const own = (LIFE_NEWS[id] ?? []).filter((n) => !told.has(n.k));
  if (own.length) return own[0];
  const any = LIFE_ANY.filter((n) => !told.has(n.k));
  if (!any.length) return undefined;
  const n = any[Math.floor(hx(id, 0, 'life') * any.length)];
  const she = isShe(id);
  return { ...n, line: she ? n.she ?? n.line : n.line };
}

export interface Arrival {
  /** one line, said by the narrator as they walk up */
  line?: string;
  /** their news, in their own words */
  news?: LifeNews;
  trust: number;
  patience: number;
  interest: number;
}
/** How a buyer comes back to you: what they remember, in one line, and how it sets them. */
export function arrival(id: string, rel: Relationship | undefined, day: number): Arrival {
  const out: Arrival = { trust: 0, patience: 0, interest: 0 };
  if (!rel) return out;
  const w = warmth(rel, day);
  out.trust = Math.max(-12, Math.min(10, Math.round(w * 3)));
  out.patience = Math.max(-8, Math.min(6, Math.round(w * 2)));
  if (w > 0) out.interest = Math.min(5, Math.round(w * 2));
  const who = first(id);
  if ((rel.visits ?? 0) === 0 && rel.friendOf) {
    out.line = `${who} was sent by ${first(rel.friendOf)}, who told ${her(id)} your prices are fair.`;
    out.trust += 6;
  } else {
    // the memory that weighs most, newest first among equals
    const live = (rel.mem ?? []).filter((m) => fade(day - m.day) > 0);
    const top = live.slice().sort((a, b) => Math.abs(b.w ?? MEM_WEIGHT[b.k]) - Math.abs(a.w ?? MEM_WEIGHT[a.k]) || b.day - a.day)[0];
    if (top && (rel.visits ?? 0) > 0) {
      const cold = (top.w ?? MEM_WEIGHT[top.k]) < 0;
      out.line = `${cold ? 'Wary. ' : ''}Remembers ${memLine(top, id)}.`;
    }
  }
  out.news = lifeNewsFor(id, rel, day);
  return out;
}

/** What a visit leaves behind in their memory. */
export interface VisitFacts {
  sold: boolean;
  rug?: string;
  /** what they paid against the rug's worth */
  fair?: number;
  honest: boolean;
  kind: boolean;
  liedCaught: boolean;
  insulted: boolean;
  newsTold?: string;
}
export function afterVisit(rel: Relationship, f: VisitFacts, day: number): Relationship {
  let r: Relationship = { ...rel, seen: day };
  if (f.newsTold) r = { ...r, life: [...new Set([...(r.life ?? []), f.newsTold])], lifeDay: day };
  if (f.sold && f.fair !== undefined) {
    if (f.fair > 1.35) r = remember(r, { k: 'dear', day, rug: f.rug });
    else if (f.fair <= 1.12) r = remember(forget(r, ['dear']), { k: 'fair', day, rug: f.rug });
  }
  if (f.honest) r = remember(r, { k: 'honest', day, rug: f.rug });
  if (f.kind) r = remember(r, { k: 'kind', day });
  if (f.liedCaught) r = remember(r, { k: 'lie', day, rug: f.rug });
  if (f.insulted) r = remember(r, { k: 'insult', day });
  return r;
}

/** a well-pleased regular may send a friend */
export const FRIEND_CHANCE = 0.3;
export const FRIEND_GAP = 60;
/** Who a pleased buyer could send: someone you have not met yet, whose purse your name already reaches. */
export function friendFor(id: string, rels: Record<string, Relationship>, rep: number, day: number, roll: number): string | undefined {
  const rel = rels[id];
  if (!rel || (rel.purchases ?? 0) < 2 || warmth(rel, day) < 2) return undefined;
  if (rel.sentDay !== undefined && day - rel.sentDay < FRIEND_GAP) return undefined;
  if (roll >= FRIEND_CHANCE) return undefined;
  const pool = BUYER_ORDER.filter((b) => b !== id && (rels[b]?.visits ?? 0) === 0 && !rels[b]?.friendOf && (BUYER_UNLOCK[b] ?? 0) <= rep + 5 && !BUYERS[b]?.royal);
  if (!pool.length) return undefined;
  return pool[Math.floor(hx(id, day, 'friend') * pool.length)];
}
