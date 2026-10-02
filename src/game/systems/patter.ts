// The merchant's patter: lies about a rug and compliments to a buyer.
//
// Balance, in short:
// - A lie is believed or caught. Believed, it buys interest and a share on the price (capped at +20% in
//   all); caught, it costs a lot of trust, a point of reputation, and spoils every lie told before it.
// - How likely a lie is caught: the buyer's own suspicion (embellishNotice) x how checkable the lie is
//   (silk can be felt, a dead pasha cannot) x how far it is from the truth about this rug (calling a
//   19th-century rug "a hundred years old" is nearly true; calling a 1920 Delta rug Persian is not)
//   x how many lies you have already told this buyer (each one makes the next riskier). Speech skill
//   and its perks bring it down.
// - A compliment lands or not by the buyer's taste for charm and by what they like to hear: every buyer
//   has one kind of praise they love and one they cannot stand. Two compliments are fine, the second
//   worth half; a third is too much and costs trust.
// - Each sale offers a different three lies and three compliments, drawn by the sale itself, so the
//   choices (and the words) change from sale to sale.
import { LIES, PRAISE, REPLY, type LieKind, type PraiseKind } from '../../data/patter';
import type { BuyerDef, RugItem, RugType } from '../types';

export const LIE_KINDS = Object.keys(LIES) as LieKind[];
export const PRAISE_KINDS = Object.keys(PRAISE) as PraiseKind[];
export const MAX_LIES = 3;
export const MAX_PRAISE = 3;
export const LIE_PAY_CAP = 0.2;

const hash = (s: string) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
/** a small seeded generator: the same sale always offers the same choices */
export function seeded(seed: string) {
  let x = hash(seed) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
function shuffle<T>(arr: T[], rnd: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fill = (line: string, rug: string, buyer: string) => line.replace(/\{rug\}/g, rug).replace(/\{buyer\}/g, buyer);

/** How far a lie of this kind is from the truth about this rug: below 1 it is nearly true, above 1 a stretch. */
export function stretch(kind: LieKind, t: RugType): number {
  const tierCheap = (t.tier ?? 2) === 1 ? 1.3 : (t.tier ?? 2) >= 4 ? 0.8 : 1;
  switch (kind) {
    case 'age': return /18th|19th/.test(t.age) ? 0.4 : /189|1900–19[12]0|c\.1900/.test(t.age) ? 1 : 1.5;
    case 'material': return /silk/i.test(t.material) ? 0.5 : /coarse|durable|flatweave/i.test(t.material) ? 1.6 : /fine/i.test(t.material) ? 1 : 1.2;
    case 'origin': return (/Persia/i.test(t.origin) ? 0.6 : /Anatolia|Caucasia|Ottoman/i.test(t.origin) ? 0.9 : /Egypt|Delta|Cairo|Fayoum|Tanta|Canal|Port Said|Nile/i.test(t.origin) ? 1.4 : 1.1) * tierCheap;
    case 'rarity': return (t.tier ?? 2) >= 4 ? 0.6 : (t.tier ?? 2) === 1 ? 1.4 : 1;
    case 'provenance': return tierCheap;
    default: return 1;
  }
}

/** Every buyer loves one kind of praise and cannot stand another (the same buyer, every visit). */
export function praiseTaste(buyerId: string): { loves: PraiseKind; hates: PraiseKind } {
  const h = hash(buyerId);
  const loves = PRAISE_KINDS[h % PRAISE_KINDS.length];
  let hates = PRAISE_KINDS[(h >>> 7) % PRAISE_KINDS.length];
  if (hates === loves) hates = PRAISE_KINDS[(PRAISE_KINDS.indexOf(loves) + 3) % PRAISE_KINDS.length];
  return { loves, hates };
}

export interface PatterOption<K> { kind: K; line: string }

/** The three lies this sale offers now: kinds not told yet, each with the words he would use. */
export function lieOptions(encId: string, told: LieKind[], rug: string, buyer: string, said: string[]): PatterOption<LieKind>[] {
  const rnd = seeded(`${encId}|lie|${told.length}`);
  return shuffle(LIE_KINDS.filter((k) => !told.includes(k)), rnd).slice(0, 3).map((kind) => ({ kind, line: pickLine(LIES[kind].lines, rnd, rug, buyer, said) }));
}
/** The three compliments this sale offers now. */
export function praiseOptions(encId: string, used: PraiseKind[], rug: string, buyer: string, said: string[]): PatterOption<PraiseKind>[] {
  const rnd = seeded(`${encId}|praise|${used.length}`);
  return shuffle(PRAISE_KINDS.filter((k) => !used.includes(k)), rnd).slice(0, 3).map((kind) => ({ kind, line: pickLine(PRAISE[kind].lines, rnd, rug, buyer, said) }));
}
function pickLine(lines: string[], rnd: () => number, rug: string, buyer: string, said: string[]) {
  const fresh = lines.map((l) => fill(l, rug, buyer)).filter((l) => !said.includes(l));
  const pool = fresh.length ? fresh : lines.map((l) => fill(l, rug, buyer));
  return pool[Math.floor(rnd() * pool.length)];
}

export interface LieRoll { caught: boolean; notice: number; interest: number; pay: number; patience: number; trust: number; reply: string }
/** Tell a lie: is it caught, and what it does. `skill` is speech level, `perk` the speech-10 perk, `honesty` the merchant's manner. */
export function rollLie(kind: LieKind, b: BuyerDef, t: RugType, told: number, skill: number, perk: boolean, honesty: number, rnd: () => number, own?: { caught?: string[]; believed?: string[] }): LieRoll {
  const d = LIES[kind];
  const hands = (kind === 'material' || kind === 'origin' || kind === 'age') && b.args.craft >= 1.5 ? 1.25 : 1;
  const notice = Math.max(0.03, Math.min(0.95,
    b.embellishNotice * d.risk * stretch(kind, t) * hands * (1 + 0.45 * told) * (1 - skill * 0.025) * (perk ? 0.7 : 1) * (1 + Math.max(0, -honesty) / 200)));
  const caught = rnd() < notice;
  // a buyer's own lines were written for the famous-owner story; other lies get the general answers
  const ownLine = (l?: string[]) => (kind === 'provenance' && l?.length && rnd() < 0.5 ? l[Math.floor(rnd() * l.length)] : undefined);
  if (caught) {
    const pool = REPLY.caught[kind];
    return { caught, notice, interest: -15, pay: 0, patience: -10, trust: kind === 'material' ? -38 : -30, reply: ownLine(own?.caught) ?? pool[Math.floor(rnd() * pool.length)] };
  }
  const lean = kind === 'provenance' ? 1 + 0.4 * Math.max(0, b.args.story) : kind === 'material' || kind === 'origin' ? 1 + 0.3 * Math.max(0, b.args.craft) : 1;
  return {
    caught, notice,
    interest: Math.round(d.gain * lean),
    pay: d.pay,
    patience: d.patience ?? -3,
    trust: 0,
    reply: ownLine(own?.believed) ?? REPLY.believed[Math.floor(rnd() * REPLY.believed.length)],
  };
}

export interface PraiseRoll { result: 'pleased' | 'flat' | 'annoyed' | 'tooMuch'; trust: number; interest: number; patience: number; reply: string }
/** Pay a compliment. `charm` is the buyer's taste for charm (-1, 0 or 1), `count` how many already paid. */
export function rollPraise(kind: PraiseKind, buyerId: string, charm: number, count: number, skill: number, rnd: () => number): PraiseRoll {
  const pickOf = (a: string[]) => a[Math.floor(rnd() * a.length)];
  if (count >= 2) return { result: 'tooMuch', trust: -6, interest: -2, patience: -6, reply: pickOf(REPLY.tooMuch) };
  const { loves, hates } = praiseTaste(buyerId);
  const score = charm + (kind === loves ? 1.5 : 0) - (kind === hates ? 1.5 : 0) + skill / 10;
  const half = count === 1 ? 0.5 : 1;
  if (score >= 1) return { result: 'pleased', trust: Math.round((8 + skill / 3) * half), interest: 3, patience: 3, reply: pickOf(REPLY.pleased) };
  if (score > -0.5) return { result: 'flat', trust: Math.round(2 * half), interest: 0, patience: -3, reply: pickOf(REPLY.flat) };
  return { result: 'annoyed', trust: -6, interest: -2, patience: -5, reply: pickOf(REPLY.annoyed) };
}

export const lieLabel = (k: LieKind) => LIES[k].label;
export const praiseLabel = (k: PraiseKind) => PRAISE[k].label;
export type { LieKind, PraiseKind, RugItem };
