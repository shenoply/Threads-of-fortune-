// Aniline dyes and faked age, as the trade knew them in 1925. Coal-tar (aniline) colours had been sold
// since 1856 and chrome dyes since about 1900; Persian law had banned anilines in the 1900s and dealers
// still warned of German reds that ran or faded within a year. New rugs were also "aged" for the
// Western market: washed in tea or a chlorine or acid bath, left out in the sun, and rubbed with
// pumice to wear the pile down evenly, then sold as old work.
//
// A rug's faults are hidden fields on the item (dye, fakeAge), fixed when it is bought and decided by
// a hash of the offer, so the same dealer's rug always has the same answer. A trained eye (appraisal,
// Arran's books, the loupe) gets a hint; Arran's tests (systems/arranLab.ts) prove it; a buyer who
// was not told may find out on his own and come back for his money.
import type { RugItem, RugType } from '../types';
import type { GameState } from '../state/store';
import type { Encounter } from './negotiation';
import type { LabFinding, LabService } from './arranLab';
import { dyeKind } from './arranLab';
import { RUGS } from '../../data/rugs';
import { BUYERS } from '../../data/buyers';
import { levelOf, type SkillId } from '../../data/character';
import { fmt } from '../economy/money';

export type FlawKind = 'dye' | 'age';
/** where a rug was bought: city dealers cheat most, the grand auction houses least, Rashid hardly ever */
export type FlawSource = 'dealer' | 'auction-small' | 'auction-grand' | 'rashid';
/** chance that an eligible rug from each source has each fault */
export const FLAW_RATES: Record<FlawSource, Record<FlawKind, number>> = {
  dealer: { dye: 0.12, age: 0.1 },
  'auction-small': { dye: 0.09, age: 0.07 },
  'auction-grand': { dye: 0.04, age: 0.03 },
  rashid: { dye: 0.03, age: 0.01 },
};

function hash01(s: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** a rug sold as natural-dyed (a type Arran's cards give natural or mostly natural colours) */
export const canAniline = (typeId: string) => { const d = dyeKind(typeId); return d === 'natural' || d === 'mixed'; };
/** a rug sold as old work: the 19th century, or a span that ends well before 1925. The court
 *  carpets woven "after an old design" are sold as new work, honestly, and cannot be faked old. */
export function canFakeAge(t: RugType) {
  if ((t.tier ?? 1) >= 4 || /after an/i.test(t.age)) return false;
  if (/18th|19th/i.test(t.age)) return true;
  const yrs = (t.age.match(/1[89]\d\d/g) ?? []).map(Number);
  return yrs.length > 0 && Math.min(...yrs) <= 1905 && Math.max(...yrs) < 1925;
}

/** The hidden faults of one rug on offer, from a stable seed (the offer's key). */
export function flawFor(seed: string, source: FlawSource, typeId: string): Pick<RugItem, 'dye' | 'fakeAge'> {
  const t = RUGS[typeId];
  if (!t) return {};
  const r = FLAW_RATES[source];
  const out: Pick<RugItem, 'dye' | 'fakeAge'> = {};
  if (canAniline(typeId) && hash01(seed, 11) < r.dye) out.dye = 'aniline';
  if (canFakeAge(t) && hash01(seed, 29) < r.age) out.fakeAge = true;
  return out;
}

export const flawsOf = (i: Pick<RugItem, 'dye' | 'fakeAge'>): FlawKind[] => [...(i.dye === 'aniline' ? ['dye' as const] : []), ...(i.fakeAge ? ['age' as const] : [])];
export const hasFlaw = (i: Pick<RugItem, 'dye' | 'fakeAge'>) => flawsOf(i).length > 0;

/** what one fault takes off the rug's worth once a buyer knows: a fake old rug is only a new rug, and a
 *  fine 19th-century piece loses most; a running aniline loses a quarter */
export function flawFactorFor(item: Pick<RugItem, 'typeId'>, kind: FlawKind) {
  if (kind === 'dye') return 0.75;
  return (RUGS[item.typeId]?.tier ?? 1) >= 3 ? 0.4 : 0.6;
}
/** the rug's real worth against what it is sold as */
export const flawFactor = (item: RugItem) => flawsOf(item).reduce((m, k) => m * flawFactorFor(item, k), 1);

// ---- what the merchant knows ----
/** knots: the rugs (uids, or dealers' offers) whose knots you counted right (game/knots.ts) */
export interface Eye { skills?: Partial<Record<SkillId, number>>; labUnlocked?: string[]; tools?: string[]; findings?: LabFinding[]; knots?: string[] }
export const eyeOf = (s: Pick<GameState, 'skills' | 'labUnlocked' | 'arranTools' | 'arranFindings'> & Partial<Pick<GameState, 'knotCounts'>>): Eye =>
  ({ skills: s.skills, labUnlocked: s.labUnlocked as string[] | undefined, tools: s.arranTools, findings: s.arranFindings, knots: Object.entries(s.knotCounts ?? {}).filter(([, r]) => r.ok).map(([k]) => k) });
/** 'proven': Arran's test or a buyer showed it; 'hint': a trained eye suspects it; null: nothing seen */
export type Know = 'proven' | 'hint' | null;
const PROVES: Record<FlawKind, LabService[]> = { dye: ['dye', 'fastness', 'wash'], age: ['fibre', 'wash', 'fastness', 'dye'] };
/** appraisal level, plus Arran's book on the matching test, plus the loupe */
export function eyeScore(eye: Eye, kind: FlawKind) {
  return levelOf(eye.skills?.appraisal ?? 0) + ((eye.labUnlocked ?? []).includes(kind === 'dye' ? 'dye' : 'fibre') ? 6 : 0) + ((eye.tools ?? []).includes('loupe') ? 3 : 0);
}
export const EYE_NEEDS: Record<FlawKind, number> = { dye: 8, age: 10 };

export function knowFlaw(item: RugItem, kind: FlawKind, eye: Eye): Know {
  if (!flawsOf(item).includes(kind)) return null;
  if (item.flawKnown) return 'proven';
  if ((eye.findings ?? []).some((f) => f.subjectId === item.uid && PROVES[kind].includes(f.service) && f.verdict === 'inconsistent')) return 'proven';
  // a right knot count shows new work for what it is: crisp square knots, unworn wool at the roots
  if (kind === 'age' && (eye.knots ?? []).includes(item.uid)) return 'hint';
  return eyeScore(eye, kind) >= EYE_NEEDS[kind] ? 'hint' : null;
}

const LINES: Record<FlawKind, Record<'proven' | 'hint', string>> = {
  dye: { proven: 'Colours run when wet: aniline dyes', hint: 'Colours too bright and even for madder. Aniline?' },
  age: { proven: 'New work, washed to look old', hint: 'Sold as old: is it? The wear is too even' },
};
/** the short lines shown on a rug in Stock and the inspector */
export function flawNotes(item: RugItem, eye: Eye): { kind: FlawKind; know: 'proven' | 'hint'; text: string }[] {
  const out: { kind: FlawKind; know: 'proven' | 'hint'; text: string }[] = [];
  for (const k of flawsOf(item)) { const n = knowFlaw(item, k, eye); if (n) out.push({ kind: k, know: n, text: LINES[k][n] }); }
  return out;
}
/** the longer clue in the inspector's Condition tab, for an eye that has caught something */
export const FLAW_CLUES: Record<FlawKind, string> = {
  dye: 'The reds are as bright at the tips as at the knot roots, and a damp thumb comes away faintly pink. Madder mellows; this has not.',
  age: 'The wear is even all over, with no path where feet went. The back is as faded as the front, and the fringe smells faintly of tea.',
};

// ---- at the stall: telling the buyer what it is ----
/** the faults you know of (or suspect) that you have not told this buyer */
export function untold(enc: Pick<Encounter, 'disclosed'>, item: RugItem, eye: Eye): FlawKind[] {
  return flawsOf(item).filter((k) => knowFlaw(item, k, eye) && !(enc.disclosed ?? []).includes(`${item.uid}:${k}`));
}
export function discloseLabel(kinds: FlawKind[]) {
  return kinds.includes('age')
    ? { label: 'Tell them it is new', sub: '"Washed to look old." Price it as new work' }
    : { label: 'Tell them about the dyes', sub: '"Aniline colours: keep it dry." Price it so' };
}
export function discloseLine(kinds: FlawKind[]) {
  const age = kinds.includes('age'), dye = kinds.includes('dye');
  if (age && dye) return 'I will be straight with you: it is new work, washed to look old, and the colours are aniline. Keep it off a wet floor. I will price it as what it is.';
  if (age) return 'I will be straight with you: it is new work, washed and sunned to look old. A good rug, but not an old one, and I will price it so.';
  return 'I will be straight with you: these are aniline colours, not madder. Keep it dry and out of strong sun, and I will price it so.';
}
/** what the buyer will pay against the rug's full worth, after what you told them */
export function disclosedFactor(enc: Pick<Encounter, 'disclosed'>, item: RugItem) {
  return flawsOf(item).filter((k) => (enc.disclosed ?? []).includes(`${item.uid}:${k}`)).reduce((m, k) => m * flawFactorFor(item, k), 1);
}

// ---- after the sale: the buyer finds out ----
export interface FlawSale {
  uid: string; typeId: string; buyerId: string; price: number; day: number;
  /** the morning they come back (the first morning you open in Giza after it) */
  due: number;
  kinds: FlawKind[];
  /** you knew or suspected, and did not say */
  knew: boolean;
  item: RugItem;
}
/** chance a buyer finds each fault out for himself: the first wash runs an aniline, a dealer friend or a
 *  wash shows a faked age */
export const FIND_OUT: Record<FlawKind, number> = { dye: 0.45, age: 0.5 };

/** A rug with a fault you did not tell of has just been sold: will the buyer find out, and when? */
export function flawSalePatch(s: GameState, enc: Encounter, rnd: () => number = Math.random): Partial<GameState> {
  const item = s.inventory.find((i) => i.uid === enc.presented);
  if (!item || enc.outcome !== 'sold' || !hasFlaw(item)) return {};
  const eye = eyeOf(s);
  const kinds = flawsOf(item).filter((k) => !(enc.disclosed ?? []).includes(`${item.uid}:${k}`));
  if (!kinds.length) return {};
  const found = kinds.filter((k) => rnd() < FIND_OUT[k]);
  if (!found.length) return {};
  const sale: FlawSale = {
    uid: item.uid, typeId: item.typeId, buyerId: enc.buyerId, price: enc.salePrice ?? 0, day: s.day,
    due: s.day + 3 + Math.floor(rnd() * 15), kinds: found, knew: found.some((k) => !!knowFlaw(item, k, eye)), item,
  };
  return { fakeSales: [...(s.fakeSales ?? []), sale].slice(-20) };
}

const COMPLAINT: Record<FlawKind, string> = {
  age: 'My brother-in-law had it washed. The water ran brown as tea and the old colour went with it. It is new work, and you sold it to me as old.',
  dye: 'One wash and the reds ran into the ivory. These are aniline colours, not madder, whatever you told me.',
};

/** Mornings at the Giza stall: anyone who has found out comes back for his money, with the rug. */
export function resolveReturns(s: GameState, day: number): { patch: Partial<GameState>; notes: string[] } {
  const due = (s.fakeSales ?? []).filter((f) => f.due <= day);
  if (!due.length || s.world.at !== 'giza') return { patch: {}, notes: [] };
  let cash = s.cash, rep = s.reputation;
  const notes: string[] = [];
  const journal = [...s.journal], ledger = [...s.ledger], inventory = [...s.inventory];
  const relationships = { ...s.relationships };
  let caught = 0, honesty = 0;
  for (const f of due) {
    const name = BUYERS[f.buyerId]?.name ?? 'A buyer';
    const rug = RUGS[f.typeId]?.name ?? 'rug';
    const refund = Math.min(f.price, Math.max(0, cash));
    const short = f.price - refund;
    cash -= refund;
    const loss = (f.knew ? 6 : 3) + (short > 0 ? 2 : 0);
    rep = Math.max(0, rep - loss);
    if (f.knew) { caught++; honesty -= 6; }
    const r = relationships[f.buyerId];
    if (r) relationships[f.buyerId] = { ...r, bad: r.bad + (f.knew ? 2 : 1), affinity: r.affinity - 15 };
    inventory.push({ ...f.item, flawKnown: true, reservedFor: undefined, reservedUntil: undefined, notes: [...f.item.notes, `${name} brought it back: ${f.kinds.includes('age') ? 'new work, aged by hand' : 'aniline colours that run'}.`] });
    if (refund) ledger.push({ day, kind: 'expense', label: `Refund to ${name}: ${rug}`, amount: -refund });
    const said = `"${COMPLAINT[f.kinds.includes('age') ? 'age' : 'dye']}"`;
    const paid = short > 0 ? `You had only ${fmt(refund)} to give back; ${name} says the lane will hear about the rest.` : `You gave back ${fmt(f.price)} and took the rug.`;
    const blame = f.knew ? 'You knew, or should have said, and the lane knows it now.' : 'You did not know yourself. The lane talks all the same.';
    notes.push(`${name} came back angry with the ${rug}. ${said} ${paid} Reputation −${loss}.`);
    journal.push({ day, text: `${name} brought back the ${rug} sold on ${f.day === day - 1 ? 'yesterday' : `day ${f.day}`}. ${said} ${paid} ${blame}`, kind: 'stall' });
  }
  const patch: Partial<GameState> = {
    cash, reputation: rep, journal, ledger, inventory, relationships,
    fakeSales: (s.fakeSales ?? []).filter((f) => f.due > day),
  };
  if (caught) patch.stats = { ...(s.stats ?? {}), liesCaught: (s.stats?.liesCaught ?? 0) + caught };
  if (honesty && s.manner) patch.manner = { ...s.manner, honesty: Math.max(-100, s.manner.honesty + honesty) };
  return { patch, notes };
}
