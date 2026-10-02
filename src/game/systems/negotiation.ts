import { labArgBonus } from './arranShop';
import { nabilAssessment, isTokenChange, packageOffer, rugKey, type NabilMemory } from './nabil';
import type { LabService } from './arranLab';
import type { ArgKind, BuyerDef, Line, ObjectionDef, Relationship, RugItem, RugType, Stage } from '../types';
import { snap, snapDown, fmt } from '../economy/money';
import { BUYERS, BUYER_TIERS } from '../../data/buyers';
import { RUGS, CONDITION_FACTOR } from '../../data/rugs';
import { SELLER, NARRATOR, STAGE } from '../../data/dialogue';
import { levelOf, hasPerk, type SkillId, type Manner } from '../../data/character';
import { BUYER_MANNER, SELLER_MANNER, type MannerKind } from '../../data/manners';
import { MALEK_UNSURE, MALEK_PURSE, type MalekPurse } from '../../data/malekBuyer';
import { ARABIC_BY_ID, arabicLead } from '../../data/malekArabic';
import { GROOMING } from '../../data/grooming';
import { newUid, dateFor } from '../economy/economy';
import { cohenChecks, dueFor, manualRub, matches, passes, ORDER_PRICE_PER, type CohenState } from './cohen';
import type { LabFinding } from './arranLab';

export type ActionId =
  | 'ask_room' | 'ask_drawn' | 'ask_budget' | 'ask_decider' | 'small_talk' | 'tea'
  | 'story' | 'craft' | 'fit' | 'durability'
  | 'story_true' | 'story_embellish' | 'saffron_move' | 'saffron_stay'
  | 'obj_honest' | 'obj_facts' | 'obj_concede' | 'obj_another'
  | 'name_price' | 'hold' | 'halfway' | 'sweetener' | 'accept_offer' | 'quick_sale'
  | 'm_charm' | 'm_kind' | 'm_firm'
  | 'nabil_package'
  | 'c_measure' | 'c_deadline' | 'c_accept' | 'c_decline' | 'c_more' | 'c_rub' | 'c_keep' | 'c_deliver' | 'c_leave';

export interface ActionView {
  id: ActionId;
  label: string;
  sub: string;
  icon: string;
  disabled?: boolean;
}

export interface Encounter {
  /** Malek: the price was agreed but he was not convinced, so he did not buy */
  malekUnsure?: boolean;
  /** Malek came back for this rug (uid): he has thought about it, and is easier to convince */
  malekReturn?: string;
  /** the trust Malek needs today before he will buy anything */
  malekBar?: number;
  /** what Malek has in his pocket today: he can spend a lot, or very little */
  malekPurse?: MalekPurse;
  // Stamped once at creation and never touched again: the only thing the dialogue playback UI can
  // key a "is this the same conversation as before" reset on. visitIdx moves the moment a sale
  // closes (before the player has even seen the result screen or clicked "Next customer"), so
  // keying the reset on it replayed the whole log — including the buyer's opening line — right
  // under the "Sold" banner.
  id: string;
  buyerId: string;
  stage: Stage;
  interest: number;
  patience: number;
  trust: number;
  revealed: string[];
  asked: string[];
  budgetKnown?: [number, number];
  presented?: string; // rug uid
  finalOffered?: boolean; // the buyer has named a last price before leaving
  /** Nabil: a fault told him before he found it; bluffs and token moves counted; a second rug in a package */
  nabilDisclosed?: boolean;
  nabilPitches?: number;
  nabilAngry?: boolean;
  packageUid?: string;
  /** Cohen: what you asked, the order you promised in this visit, rugs set aside, your own rub results */
  cohenAsked?: string[];
  cohenAccepted?: { dueDay: number; pricePer: number };
  cohenOk?: string[];
  cohenManual?: Record<string, 'fast' | 'runs'>;
  cohenDelivered?: boolean;
  /** Cohen: his price per rug on this order (raised once if you earned it), and how often you pushed for more */
  cohenPrice?: number;
  cohenPushed?: number;
  presentedFit: number;
  rugsShown: string[];
  argsUsed: string[];
  objection?: ObjectionDef;
  objectionDone: boolean;
  concession: boolean;
  sweetened: boolean;
  teaUsed: boolean;
  catPetted: boolean;
  embellished: boolean;
  embellishCaught: boolean;
  honestCount: number;
  askPrice?: number;
  buyerOffer?: number;
  rounds: number;
  prompt?: { kind: 'story' | 'saffron' | 'manner'; rugUid: string };
  saffronOn?: string;
  venue?: string; // set for a royal audience, away from the stall
  log: Line[];
  outcome?: 'sold' | 'walked';
  /** the buyer remarked on the merchant's smell or clothes */
  groomed?: 'smell' | 'ragged';
  /** the buyer found nothing at their level and left mocking */
  mocked?: boolean;
  /** you thanked them and let them go: no sale, no offence taken */
  letGo?: boolean;
  salePrice?: number;
  saleCost?: number;
  mood: 'neutral' | 'pleased' | 'skeptical' | 'leaving' | 'warm';
  tutorial: boolean;
  tier: number;
  insulted: boolean;
  lastDelta: number;
  turn: number;
  needIdx: number;
  bazaar?: boolean;
  /** merchant's edge from Haggling and manner: raises what buyers will pay and where they start */
  edge?: { pay: number; open: number; budget: number };
}

export interface Ctx {
  inventory: RugItem[];
  upgrades: string[];
  reputation: number;
  rel: Relationship;
  rng: () => number;
  /** skill XP, manner and charisma of the merchant */
  skills?: Partial<Record<SkillId, number>>;
  manner?: Manner;
  charisma?: number;
  /** events like Eid or the tourist season raise or lower budgets */
  eventBudget?: number;
  /** how the merchant looks and smells: attire cleanliness 0..100 and what he is wearing */
  clean?: number;
  attire?: string;
  /** Arran's instruments you own (the loupe) */
  tools?: string[];
  /** what Nabil al-Khatib remembers of you */
  nabil?: NabilMemory;
  /** Cohen's standing orders and trust; the lab results he can rely on; today */
  cohen?: CohenState;
  findings?: LabFinding[];
  day?: number;
}

const lvl = (ctx: Ctx, s: SkillId) => levelOf(ctx.skills?.[s] ?? 0);
const perk = (ctx: Ctx, s: SkillId, level: number) => hasPerk(ctx.skills?.[s], s, level);
const gain = (fx: Effects, s: SkillId, n: number) => { fx.xp = { ...(fx.xp ?? {}), [s]: (fx.xp?.[s] ?? 0) + n }; };
const lean = (fx: Effects, m: Partial<Manner>) => { const o = { ...(fx.manner ?? {}) } as Partial<Manner>; for (const [k, v] of Object.entries(m)) o[k as keyof Manner] = (o[k as keyof Manner] ?? 0) + (v ?? 0); fx.manner = o; };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const round5 = snap;

export function pick<T>(arr: T[], rng: () => number, avoid: string[] = []): T {
  if (!arr.length) return '' as unknown as T;
  const fresh = arr.filter((a) => !avoid.includes(String(a)));
  const pool = fresh.length ? fresh : arr;
  return pool[Math.floor(rng() * pool.length)];
}

export function tierOf(rel: Relationship): { idx: number; name: 'New' | 'Familiar' | 'Regular' | 'Patron' } {
  if (rel.purchases >= 4 && rel.affinity >= 40) return { idx: 3, name: 'Patron' };
  if (rel.purchases >= 2) return { idx: 2, name: 'Regular' };
  if (rel.purchases >= 1 || rel.visits >= 3) return { idx: 1, name: 'Familiar' };
  return { idx: 0, name: 'New' };
}

export interface Prefs {
  values: BuyerDef['values'];
  colourPref: BuyerDef['colourPref'];
  budget: [number, number];
  room: string[];
  roomPriorities: { id: string; label: string }[];
  needLabel: string;
}

/** What this buyer wants on this visit: their first need, or a later one once they have bought from you. */
export function prefsFor(enc: Pick<Encounter, 'buyerId' | 'needIdx'>): Prefs {
  const b = BUYERS[enc.buyerId];
  const n = enc.needIdx > 0 ? b.needs[enc.needIdx - 1] : undefined;
  return n
    ? { values: n.values, colourPref: n.colourPref, budget: n.budget, room: n.room, roomPriorities: n.priorities, needLabel: n.label }
    : { values: b.values, colourPref: b.colourPref, budget: b.budget, room: b.lines.room, roomPriorities: b.priorities.room, needLabel: b.role };
}

export function fitScore(b: Pick<Prefs, 'values' | 'colourPref'>, t: RugType, item?: RugItem): number {
  let sum = 0;
  for (const tr of t.traits) sum += b.values[tr] ?? 0;
  if (item?.restored && (b.values.antique ?? 0) > 0) sum -= 1;
  const colour = b.colourPref[t.colourFamily] ?? 0;
  let s = 50 + sum * 6 + colour * 5;
  if (item && (item.condition === 'Dirty' || item.condition === 'Damaged')) s -= 8;
  return clamp(Math.round(s), 5, 98);
}

const PROV_FACTOR = { Documented: 1.08, Likely: 1, Uncertain: 0.92, Disputed: 0.8 } as const;

export function perceivedValue(t: RugType, item: RugItem) {
  const mid = (t.valueBand[0] + t.valueBand[1]) / 2;
  return mid * CONDITION_FACTOR[item.condition] * PROV_FACTOR[item.provenance];
}

export function wtp(enc: Encounter, item: RugItem): number {
  const b = BUYERS[enc.buyerId];
  const t = RUGS[item.typeId];
  const cap = prefsFor(enc).budget[1] * (1 + enc.tier * 0.06) * (enc.bazaar ? 1.08 : 1) * (enc.edge?.budget ?? 1) * (enc.edge?.pay ?? 1);
  if (enc.buyerId === 'nabil') {
    // his figure follows the rug's value, rarity, condition and evidence; never above his ceiling
    const a = nabilAssessment(t, item, { repairDisclosed: !!enc.nabilDisclosed, repeatedPitchCount: enc.nabilPitches ?? 0, labReport: !!item.labReports?.length });
    const f = 0.82 + 0.12 * (enc.interest / 100) + 0.1 * ((enc.trust - 50) / 50);
    return Math.round(Math.min(cap, a.ceiling, a.ceiling * f));
  }
  const factor = 0.72 + 0.45 * (enc.interest / 100) + 0.15 * ((enc.trust - 50) / 50);
  let v = perceivedValue(t, item) * factor;
  if (enc.embellished && !enc.embellishCaught) v *= 1.12;
  if (enc.sweetened) v *= 1.08;
  // Malek on a good week will pay well over the odds; on a bad one, under them
  if (enc.malekPurse) v *= MALEK_PURSE[enc.malekPurse].value;
  v *= enc.edge?.pay ?? 1;
  return Math.round(Math.min(cap, v));
}

/** A Common rug sold without the haggling: a fair price, a little under what patience would win. */
export function quickPrice(enc: Encounter, item: RugItem) {
  return Math.max(5, snapDown(Math.max(wtp(enc, item) * 0.85, enc.buyerOffer ?? 0)));
}
/** Whether a quick sale is on offer now. */
export function canQuickSell(enc: Encounter | null | undefined, item: RugItem | undefined) {
  // Cohen buys on his order's terms only, never at a quick-sale price
  if (!enc || !item || enc.outcome || enc.tutorial || enc.prompt || enc.buyerId === 'cohen') return false;
  return RUGS[item.typeId]?.tier === 1 && ['presentation', 'objection', 'bargaining'].includes(enc.stage);
}

export function suggestedAsk(item: RugItem, concession: boolean) {
  const t = RUGS[item.typeId];
  const base = t.asking * CONDITION_FACTOR[item.condition] * (item.provenance === 'Likely' || item.provenance === 'Documented' ? 1 : 0.95);
  return round5(concession ? base * 0.9 : base);
}

export function startEncounter(buyerId: string, ctx: Ctx, displayed: string[], tutorial: boolean): Encounter {
  const b = BUYERS[buyerId];
  const tier = tierOf(ctx.rel);
  const enc: Encounter = {
    id: newUid('enc'),
    buyerId,
    stage: 'discovery',
    interest: clamp(b.interest + Math.min(10, Math.floor(ctx.reputation / 2)), 0, 100),
    patience: b.patience + 8 + tier.idx * 6 + (ctx.upgrades.includes('bazaar') ? 10 : 0),
    trust: buyerId === 'cohen' && ctx.cohen ? clamp(ctx.cohen.trust - (ctx.cohen.complaint ? 15 : 0), 0, 100) : buyerId === 'nabil' && ctx.nabil ? clamp(ctx.nabil.trust, 0, 100) : clamp(b.trust + tier.idx * 8 + Math.round(ctx.rel.affinity / 5) + (ctx.upgrades.includes('mat') ? 6 : 0), 0, 100),
    revealed: [],
    asked: [],
    presentedFit: 0,
    rugsShown: [],
    argsUsed: [],
    objectionDone: false,
    concession: false,
    sweetened: false,
    teaUsed: false,
    catPetted: false,
    embellished: false,
    embellishCaught: false,
    honestCount: 0,
    rounds: 0,
    log: [],
    mood: 'neutral',
    tutorial,
    tier: tier.idx,
    insulted: false,
    lastDelta: 0,
    turn: 0,
    needIdx: tutorial ? 0 : ctx.rel.purchases % (b.needs.length + 1),
    bazaar: ctx.upgrades.includes('bazaar'),
  };
  // who you are follows you into every conversation
  const m = ctx.manner;
  if (m) {
    enc.trust = clamp(enc.trust + Math.round(clamp(m.honesty, -80, 80) / 10), 0, 100);
    enc.patience += Math.round(Math.max(0, m.kindness) / 12) - (m.firmness > 40 ? 3 : 0);
  }
  enc.trust = clamp(enc.trust + Math.round((ctx.charisma ?? 0) / 2) + (perk(ctx, 'speech', 15) ? 6 : 0) + (perk(ctx, 'catkeeping', 10) && b.catAffinity > 0 ? 4 : 0), 0, 100);
  if (b.royal && perk(ctx, 'speech', 20)) enc.patience += 15;
  if (ctx.upgrades.includes('khan')) enc.patience += 15;
  const hl = lvl(ctx, 'haggling');
  enc.edge = {
    pay: 1 + hl * 0.004 + (perk(ctx, 'haggling', 15) ? 0.03 : 0) + (perk(ctx, 'appraisal', 20) && b.royal ? 0.05 : 0),
    open: (perk(ctx, 'haggling', 5) ? 0.04 : 0) + Math.max(0, (m?.firmness ?? 0)) / 1000,
    budget: (ctx.upgrades.includes('khan') ? 1.25 : 1) * (ctx.eventBudget ?? 1),
  };
  const rel = ctx.rel;
  const L = b.lines;
  enc.log.push({ speaker: 'system', text: pick(L.arrival, ctx.rng) });
  if (rel.visits > 0) {
    if (rel.embellishedSale && !rel.embellishMentioned && L.embellishLater.length) {
      enc.log.push({ speaker: 'buyer', text: pick(L.embellishLater, ctx.rng), mood: 'skeptical' });
      enc.trust = clamp(enc.trust - 20, 0, 100);
      enc.mood = 'skeptical';
    } else if (rel.lastRug && rel.purchases > 0) {
      enc.log.push({ speaker: 'buyer', text: pick(L.previousRug, ctx.rng).replace('{rug}', RUGS[rel.lastRug]?.name ?? 'rug'), mood: 'warm' });
      enc.mood = 'warm';
    } else {
      enc.log.push({ speaker: 'buyer', text: pick(L.repeat, ctx.rng) });
    }
  } else {
    enc.log.push({ speaker: 'buyer', text: pick(L.greeting, ctx.rng) });
  }
  // a returning buyer does not forget being insulted or lied to: they arrive colder and thinner-skinned
  if (rel.visits > 0 && rel.bad > 0) {
    enc.trust = clamp(enc.trust - Math.min(30, rel.bad * 10), 0, 100);
    enc.patience = Math.max(10, enc.patience - Math.min(24, rel.bad * 8));
    if (enc.mood === 'neutral') enc.mood = 'skeptical';
  }
  if (!tutorial) {
    const gr = GROOMING[buyerId];
    const minTier = b.royal ? 3 : (BUYER_TIERS[buyerId]?.[0] ?? 1);
    // first impressions: the nose, then the coat
    if (gr && (ctx.clean ?? 100) < 35) {
      enc.log.push({ speaker: 'buyer', text: pick(gr.smell, ctx.rng), mood: 'skeptical' });
      enc.trust = clamp(enc.trust - 8, 0, 100);
      enc.patience -= 8;
      enc.mood = 'skeptical';
      enc.groomed = 'smell';
    } else if (gr && (ctx.attire ?? 'galabiya') === 'galabiya' && minTier >= 2 && ctx.rng() < 0.7) {
      enc.log.push({ speaker: 'buyer', text: pick(gr.ragged, ctx.rng), mood: 'skeptical' });
      enc.trust = clamp(enc.trust - 5, 0, 100);
      enc.groomed = 'ragged';
    }
    // a rich buyer who finds nothing at their level says so, and leaves
    const best = Math.max(0, ...ctx.inventory.filter((i) => !i.restoringUntil).map((i) => RUGS[i.typeId]?.tier ?? 1));
    if (minTier >= 2 && best < minTier) {
      // every buyer above the village trade leaves politely if nothing is at their level (a buyer
      // without lines of their own says it plainly), so the stall is never stuck with them
      enc.log.push({ speaker: 'buyer', text: gr ? pick(gr.mockStock, ctx.rng) : 'I have looked. There is nothing here of the quality I buy.', mood: 'skeptical' });
      enc.log.push({ speaker: 'buyer', text: gr ? pick(gr.mockLeave, ctx.rng) : 'When you have something finer, I will come back.', mood: 'leaving' });
      enc.outcome = 'walked';
      enc.stage = 'close';
      enc.mood = 'leaving';
      enc.mocked = true;
      return enc;
    }
  }
  if (tutorial) {
    enc.log.push({ speaker: 'narrator', text: NARRATOR.step1 });
    enc.patience = 99;
  } else if (displayed.length && ctx.rng() < 0.35) {
    enc.saffronOn = displayed[Math.floor(ctx.rng() * displayed.length)];
  }
  // Cohen says so at once if a rug you passed on your own rub lost colour under the corridor's boots
  if (buyerId === 'cohen' && ctx.cohen?.complaint) enc.log.push({ speaker: 'buyer', text: `The ${ctx.cohen.complaint} came off red on the porters' boots within a week. You rubbed it yourself, I know. Next time, ask Arran.`, mood: 'skeptical' });
  // Malek's stubbornness today: how much trust it takes to convince him (48 on a good day, 61 on a bad one)
  if (buyerId === 'malek') {
    enc.malekBar = 48 + Math.floor(ctx.rng() * 14);
    // and his purse: one day he counts every piastre, another he could buy the stall
    const r = ctx.rng();
    const purse: MalekPurse = r < MALEK_PURSE.tight.odds ? 'tight' : r < MALEK_PURSE.tight.odds + MALEK_PURSE.usual.odds ? 'usual' : 'flush';
    enc.malekPurse = purse;
    if (enc.edge) enc.edge.budget *= MALEK_PURSE[purse].mult;
    // you do not always see it coming
    if (MALEK_PURSE[purse].hint.length && ctx.rng() < 0.7) enc.log.push({ speaker: 'system', text: pick(MALEK_PURSE[purse].hint, ctx.rng) });
  }
  return enc;
}

const Q = { cost: 6, arg: 8, present: 5, bargain: 10 };

/** The two opening questions this buyer actually wants, from who they are: the room if fit weighs with
 *  them, what draws them if story or craft does, the budget if they do not mind money talk, who else
 *  decides if a household or client stands behind them. The same buyer wants the same two every visit,
 *  so learning your customers pays; asking the other two costs patience. */
export function keenQuestions(buyerId: string): ('room' | 'drawn' | 'budget' | 'decider')[] {
  const b = BUYERS[buyerId];
  if (!b) return ['room', 'drawn'];
  // someone else holds the purse or the final word: the decider question matters to them
  const shared = !/^(I decide|I choose|The choice is mine)/i.test(b.lines.decider[0] ?? '');
  const score = {
    room: b.args.fit ?? 0,
    drawn: Math.max(b.args.story ?? 0, b.args.craft ?? 0),
    budget: 1.2 + (b.directBudgetTrust ?? 0) * 0.25,
    decider: shared ? 2.2 : 0,
  };
  return (Object.keys(score) as (keyof typeof score)[]).sort((x, y) => score[y] - score[x]).slice(0, 2);
}
/** What a buyer says when naming a last price, unless they have their own way of putting it. */
const FINAL_OFFER = [
  'My last word: {price}. Take it, or I go.',
  'I will not stand here all day. {price}, and that is final.',
  '{price}. That is the end of it from my side. Yes or no?',
  'Enough. {price}, and I take it with me now, or I leave it.',
];

function say(enc: Encounter, speaker: Line['speaker'], text: string, mood?: Line['mood']) {
  enc.log.push({ speaker, text, mood });
  if (enc.log.length > 40) enc.log.splice(0, enc.log.length - 40);
}

function buyerSay(enc: Encounter, text: string, mood?: Line['mood']) {
  // Malek, once the haggling is under way, now and then opens with "Ha?" or "Bah!" in Arabic
  const ar = enc.buyerId === 'malek' ? malekInterjection(enc, text, mood) : undefined;
  if (ar) {
    const p = ARABIC_BY_ID[ar];
    enc.log.push({ speaker: 'buyer', text: `${arabicLead(p)} ${text}`, mood, ar });
    if (enc.log.length > 40) enc.log.splice(0, enc.log.length - 40);
  } else say(enc, 'buyer', text, mood);
  if (mood) enc.mood = mood;
}
/** an Arabic opener: ها؟ when he is weighing it up, با! / مين قال؟ / طع! when he is not having it; about one line in four, never two running */
function malekInterjection(enc: Encounter, text: string, mood?: Line['mood']): string | undefined {
  if (enc.stage === 'discovery' || /^(ha|bah?)\b/i.test(text)) return undefined;
  const prev = enc.log.filter((l) => l.speaker === 'buyer').pop();
  if (prev?.ar) return undefined;
  if ((enc.turn * 7 + enc.log.length) % 2 !== 0) return undefined;
  // not having it: "Bah!", "Who said so?", "Pfft!"; weighing it up: "Ha?"
  // which one follows from the line itself, so the same line always gets the same opener
  const h = [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = (ids: string[]) => ids[h % ids.length];
  return mood === 'skeptical' || mood === 'leaving' ? pick(['ba', 'meen-aal', 'taa']) : 'ha';
}

function recentBuyerTexts(enc: Encounter) {
  return enc.log.filter((l) => l.speaker === 'buyer').map((l) => l.text).slice(-8);
}

function adjust(enc: Encounter, d: { interest?: number; patience?: number; trust?: number }) {
  if (d.interest) enc.interest = clamp(enc.interest + d.interest, 0, 100);
  if (d.patience) enc.patience = clamp(enc.patience + d.patience, 0, 120);
  if (d.trust) enc.trust = clamp(enc.trust + d.trust, 0, 100);
  enc.lastDelta = d.interest ?? 0;
}

export function presentedItem(enc: Encounter, ctx: Ctx) {
  return ctx.inventory.find((i) => i.uid === enc.presented);
}

export function getActions(enc: Encounter, ctx: Ctx): ActionView[] {
  if (enc.outcome) return [];
  const b = BUYERS[enc.buyerId];
  if (enc.prompt?.kind === 'story') {
    return [
      { id: 'story_true', label: 'Tell it straight', sub: 'No papers, only the rug', icon: 'scroll' },
      { id: 'story_embellish', label: 'Add a pasha\'s house', sub: 'Better story. Is it true?', icon: 'crown' },
    ];
  }
  if (enc.prompt?.kind === 'manner') {
    return [
      { id: 'm_charm', label: 'Pay a compliment', sub: 'Charm', icon: 'crown' },
      { id: 'm_kind', label: 'Ask after the family', sub: 'Kindness', icon: 'tea' },
      { id: 'm_firm', label: 'Get down to business', sub: 'Firmness', icon: 'shield' },
    ];
  }
  if (enc.prompt?.kind === 'saffron') {
    return [
      { id: 'saffron_move', label: 'Lift Saffron off', sub: 'Show the rug properly', icon: 'paw' },
      { id: 'saffron_stay', label: 'Let her stay', sub: 'She is part of the display', icon: 'cat' },
    ];
  }
  if (enc.buyerId === 'cohen') return cohenActions(enc, ctx);
  const out: ActionView[] = [];
  const has = (a: string) => enc.asked.includes(a);
  switch (enc.stage) {
    case 'discovery':
    case 'qualification': {
      // the tutorial keeps its own wording; elsewhere each question says whether this buyer wants it
      const keen = enc.tutorial ? null : keenQuestions(enc.buyerId);
      const hint = (q: 'room' | 'drawn' | 'budget' | 'decider', plain: string) => (!keen ? plain : keen.includes(q) ? 'They\'d like to talk about this' : 'They\'d rather get on with it');
      if (!has('room')) out.push({ id: 'ask_room', label: `Ask about the ${b.roomWord ?? (enc.buyerId === 'yusuf' ? 'hotel' : 'room')}`, sub: hint('room', 'Learn what matters to them'), icon: 'room' });
      if (!has('drawn')) out.push({ id: 'ask_drawn', label: 'Ask what draws them', sub: hint('drawn', 'What they look for'), icon: 'eye' });
      if (!has('budget')) out.push({ id: 'ask_budget', label: 'Ask for the budget', sub: hint('budget', enc.stage === 'discovery' ? 'Be direct' : 'Now that you know them'), icon: 'purse' });
      if (ctx.upgrades.includes('tea') && !enc.teaUsed && !enc.venue) out.push({ id: 'tea', label: 'Offer tea', sub: '+ patience', icon: 'tea' });
      if (!has('decider') && enc.stage === 'qualification') out.push({ id: 'ask_decider', label: 'Who else decides?', sub: hint('decider', 'Understand the household'), icon: 'people' });
      if (!has('small')) out.push({ id: 'small_talk', label: 'Choose your manner', sub: 'Charm, kindness or plain business', icon: 'chat' });
      break;
    }
    case 'presentation': {
      const used = (a: string) => enc.argsUsed.includes(a);
      const base: Record<ArgKind, { label: string; sub: string; icon: ActionView['icon'] }> = {
        story: { label: 'Tell its story', sub: used('story') ? 'Already told' : 'Share the rug\'s history', icon: 'scroll' },
        craft: { label: 'Explain craftsmanship', sub: used('craft') ? 'Already explained' : 'Knots, dyes, weave', icon: 'needle' },
        fit: { label: 'Speak to their room', sub: used('fit') ? 'Already said' : 'Tie it to what they told you', icon: 'room' },
        durability: { label: 'Point out durability', sub: used('durability') ? 'Already said' : 'How long it lasts', icon: 'shield' },
      };
      // Every buyer weighs an angle differently (b.args). Read on them, don't print the number:
      // their strongest angle leads the menu, and a flat one is flagged before you waste a turn on it.
      const hint = (kind: ArgKind) => {
        const w = b.args[kind];
        if (w >= 1.4) return 'They light up for this';
        if (w <= 0) return 'Leaves them cold';
        if (w < 0.6) return 'Not what they came for';
        return undefined;
      };
      const makeArg = (kind: ArgKind): ActionView => {
        const d = base[kind];
        const h = !used(kind) ? hint(kind) : undefined;
        return { id: kind, label: d.label, sub: h ?? d.sub, icon: d.icon };
      };
      const available: ArgKind[] = ['story', 'craft', has('room') ? 'fit' : 'durability'];
      available.sort((x, y) => b.args[y] - b.args[x]);
      const args: ActionView[] = available.map(makeArg);
      if (enc.argsUsed.length === 0) {
        args.push(has('room') ? makeArg('durability') : { id: 'ask_room', label: 'Ask about the room', sub: 'You skipped this', icon: 'room' });
      } else {
        args.push({ id: 'name_price', label: 'Name your price', sub: 'Open the bargaining', icon: 'coin' });
      }
      out.push(...args);
      break;
    }
    case 'objection':
      out.push(
        { id: 'obj_honest', label: 'Acknowledge it', sub: 'Honest answer', icon: 'hand' },
        { id: 'obj_facts', label: 'Answer with facts', sub: 'Defend the rug', icon: 'needle' },
        { id: 'obj_concede', label: 'Offer a concession', sub: 'Lower your opening price', icon: 'coin' },
        { id: 'obj_another', label: 'Show another rug', sub: 'Change the subject', icon: 'swap' },
      );
      break;
    case 'bargaining': {
      // once they have named their last price, every other road leads out of the stall
      const last = !!enc.finalOffered;
      if (enc.buyerOffer) {
        // Quick sale (a separate, always-on button for a Common rug) is a guaranteed floor price
        // that can sit above what the buyer has offered so far in the haggling — without saying so,
        // Accept Offer just looks like the worse of two numbers for no reason.
        const item = presentedItem(enc, ctx);
        const qp = item && canQuickSell(enc, item) ? quickPrice(enc, item) : undefined;
        const quickIsMore = qp !== undefined && qp > enc.buyerOffer;
        out.push({ id: 'accept_offer', label: last ? `Take the final offer · ${fmt(enc.buyerOffer)}` : `Accept ${fmt(enc.buyerOffer)}`, sub: quickIsMore ? `Quick sale pays more: ${fmt(qp!)}` : last ? 'Or they walk away' : 'Close the sale', icon: 'check' });
      }
      if (enc.askPrice && enc.buyerOffer && enc.askPrice - enc.buyerOffer >= 10 && !last)
        out.push({ id: 'halfway', label: `Meet at ${fmt(round5((enc.askPrice + enc.buyerOffer) / 2))}`, sub: 'Split the difference — they may take it on the spot', icon: 'scale' });
      if (enc.askPrice) out.push({ id: 'hold', label: `Hold at ${fmt(enc.askPrice)}`, sub: last ? 'They will leave' : 'Be firm — they may still take it', icon: 'shield' });
      out.push({ id: 'name_price', label: 'Name a new price', sub: last ? 'They leave unless it is theirs' : 'Adjust your ask — a low one may close the sale', icon: 'coin' });
      const pkg = nabilPackage(enc, ctx);
      if (pkg) out.splice(1, 0, { id: 'nabil_package', label: `Sell both · ${fmt(pkg.price)}`, sub: `This and the ${RUGS[pkg.other.typeId]?.name}, cash today`, icon: 'swap' });
      if (!enc.sweetened && out.length < 4) out.push({ id: 'sweetener', label: 'Add delivery', sub: 'Costs you £0.05', icon: 'cart' });
      break;
    }
    default:
      break;
  }
  void b;
  return out.slice(0, 4);
}

function reveal(enc: Encounter, list: { id: string }[]) {
  for (const p of list) if (!enc.revealed.includes(p.id)) enc.revealed.push(p.id);
}

function checkWalk(enc: Encounter, ctx: Ctx, justPresented = false) {
  const b = BUYERS[enc.buyerId];
  if (enc.outcome) return;
  if (enc.tutorial) {
    enc.patience = Math.max(enc.patience, 20);
    return;
  }
  // A bad first look does not end the visit; losing interest afterwards does.
  const bored = !justPresented && enc.stage !== 'bargaining' && enc.presented && enc.interest <= 12;
  // A buyer out of patience who still wants the rug does not just go: they name their last price,
  // once. Refuse that, or dawdle, and they leave.
  // (an insult on the first price ends it; one that comes after offers have been traded does not)
  const item = (enc.patience <= 0 || enc.trust <= 5) && !bored && !enc.finalOffered && (!enc.insulted || enc.buyerOffer) ? presentedItem(enc, ctx) : undefined;
  if (item) {
    const w = wtp(enc, item);
    const prev = enc.buyerOffer ?? 0;
    // a real step up from their last figure, as far as they will go
    const last = Math.min(snapDown(w * 0.97), Math.max(snapDown(w * (enc.stage === 'bargaining' ? 0.9 : 0.82)), snap(prev * 1.06)));
    enc.finalOffered = true;
    enc.buyerOffer = Math.max(last, prev);
    enc.stage = 'bargaining';
    enc.patience = 12;
    buyerSay(enc, pick(b.lines.finalOffer ?? FINAL_OFFER, ctx.rng).replace('{price}', fmt(enc.buyerOffer)), 'skeptical');
    return;
  }
  if (enc.patience <= 0 || bored || enc.trust <= 5) {
    enc.outcome = 'walked';
    enc.stage = 'close';
    buyerSay(enc, pick(b.lines.walkAway, ctx.rng), 'leaving');
  } else if (enc.patience <= 18 && enc.patience > 0 && ctx.rng() < 0.6) {
    buyerSay(enc, pick(b.lines.impatience, ctx.rng, recentBuyerTexts(enc)), 'skeptical');
  }
}

export interface Effects {
  lie?: 'ok' | 'caught';
  xp?: Partial<Record<SkillId, number>>;
  manner?: Partial<Manner>;
  cashDelta?: number;
  repDelta?: number;
  sfx?: string[];
  tutorialAdvance?: string;
  ledger?: { label: string; amount: number; kind: 'expense' };
}

/** Present a rug. Returns effects. */
export function presentRug(enc: Encounter, ctx: Ctx, uid: string): Effects {
  const b = BUYERS[enc.buyerId];
  const item = ctx.inventory.find((i) => i.uid === uid);
  if (!item || enc.outcome) return {};
  const t = RUGS[item.typeId];
  enc.turn++;
  if (enc.saffronOn === uid && !enc.prompt) {
    enc.prompt = { kind: 'saffron', rugUid: uid };
    say(enc, 'saffron', STAGE.saffronOnRug.replace('{rug}', t.name));
    return { sfx: ['meow'] };
  }
  const first = !enc.presented;
  const early = first && enc.asked.length === 0;
  enc.presented = uid;
  enc.prompt = undefined;
  if (!enc.rugsShown.includes(uid)) enc.rugsShown.push(uid);
  enc.stage = 'presentation';
  enc.askPrice = undefined;
  enc.buyerOffer = undefined;
  say(enc, 'seller', pick(SELLER.present, ctx.rng).replace('{rug}', t.name));
  // Courts are not furnished with village mats: royals only consider city carpets and treasures.
  // Each buyer shops in a band of tiers: below it a rug barely interests them.
  const minTier = b.royal ? 3 : (BUYER_TIERS[b.id]?.[0] ?? 1);
  const fit = (t.tier ?? 1) < minTier ? Math.min(25, fitScore(prefsFor(enc), t, item)) : fitScore(prefsFor(enc), t, item);
  enc.presentedFit = fit;
  const before = enc.interest;
  enc.interest = Math.round(first ? enc.interest * 0.4 + fit * 0.6 : enc.interest * 0.5 + fit * 0.5);
  if (ctx.upgrades.includes('display')) enc.interest = clamp(enc.interest + 8, 0, 100);
  if (early && !enc.tutorial) {
    adjust(enc, { interest: -8, trust: -4 });
    buyerSay(enc, pick(b.lines.earlyPresent, ctx.rng), 'skeptical');
  }
  adjust(enc, { patience: first ? -Q.present : -Q.present - 4 });
  enc.lastDelta = enc.interest - before;
  const L = b.lines;
  const reaction = fit >= 65 ? pick(L.rugGood, ctx.rng) : fit >= 40 ? pick(L.rugNeutral, ctx.rng) : pick(L.rugBad, ctx.rng);
  const colour = L.colour[t.colourFamily];
  const cond = item.condition === 'Dirty' ? L.condition.dirty : item.condition === 'Worn' ? L.condition.worn : item.condition === 'Damaged' ? L.condition.damaged : '';
  const mood = fit >= 65 ? 'pleased' : fit >= 40 ? 'neutral' : 'skeptical';
  buyerSay(enc, reaction, mood);
  buyerSay(enc, colour, mood);
  if (cond) buyerSay(enc, cond, mood);
  if ((t.rarity === 'Rare' || t.rarity === 'Treasure') && L.rare.length && ctx.rng() < 0.5) say(enc, 'buyer', pick(L.rare, ctx.rng));
  if (enc.buyerId === 'nabil' && ctx.nabil?.seenRugIds.includes(rugKey(item))) {
    buyerSay(enc, 'I have seen this piece before, in the same state. Has anything changed, or only the day?', 'skeptical');
    adjust(enc, { interest: -6 });
  }
  // A badly matched rug provokes the objection immediately.
  // Nabil finds a repair, a thin history or wear on first inspection, from the rug's real record
  if (enc.buyerId === 'cohen') {
    const c = cohenChecks(item, ctx.findings, enc.cohenManual?.[item.uid]);
    say(enc, 'narrator', `Cohen checks: ${c.map((x) => `${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'} ${x.text}`).join(' ')}`);
    const bad = c.find((x) => x.ok === false);
    if (bad) buyerSay(enc, bad.id === 'edges' ? 'The edges have gone here. In a corridor that becomes a hole by winter.' : bad.id === 'size' ? 'The size is wrong for the corridor. Measure twice, as my mother said.' : bad.id === 'wool' ? 'It is not made for boots all day.' : 'The colour runs. The hotel washes its rugs every spring.', 'skeptical');
    else if (c.some((x) => x.ok === null)) buyerSay(enc, 'Sound so far. Does the colour hold? I would want to know before it goes on a hotel floor.', 'neutral');
    else buyerSay(enc, 'This one passes. Good.', 'pleased');
    return { sfx: ['unfold'] };
  }
  const nabilSees = enc.buyerId === 'nabil' && (item.restored || item.provenance === 'Uncertain' || item.provenance === 'Disputed' || ['Worn', 'Damaged', 'Dirty'].includes(item.condition));
  if (!enc.tutorial && !enc.objectionDone && (fit < 40 || nabilSees)) raiseObjection(enc, ctx, item, t);
  checkWalk(enc, ctx, true);
  return { sfx: ['unfold'], tutorialAdvance: enc.tutorial ? 'presented' : undefined };
}

function raiseObjection(enc: Encounter, ctx: Ctx, item: RugItem, t: RugType) {
  const b = BUYERS[enc.buyerId];
  const specific = b.objections.find((o) => o.id !== 'price' && o.id !== 'cost' && o.id !== 'money' && o.when(t, item));
  const obj = specific ?? b.objections[b.objections.length - 1];
  enc.objection = obj;
  enc.stage = 'objection';
  buyerSay(enc, obj.text, 'skeptical');
  if (ctx.rel.visits === 0 && ctx.rel.purchases === 0 && !enc.tutorial && enc.buyerId === 'yusuf') {
    say(enc, 'narrator', NARRATOR.objection);
  }
}

export function doAction(enc: Encounter, ctx: Ctx, id: ActionId, price?: number): Effects {
  const b = BUYERS[enc.buyerId];
  const L = b.lines;
  const fx: Effects = { sfx: [] };
  if (enc.outcome) return fx;
  enc.turn++;
  const item = presentedItem(enc, ctx);
  const t = item ? RUGS[item.typeId] : undefined;
  const avoid = recentBuyerTexts(enc);

  // a question they wanted builds trust; one they did not wears on their patience
  const qOf: Partial<Record<ActionId, 'room' | 'drawn' | 'budget' | 'decider'>> = { ask_room: 'room', ask_drawn: 'drawn', ask_budget: 'budget', ask_decider: 'decider' };
  const q = qOf[id];
  if (q && !enc.tutorial) {
    if (keenQuestions(enc.buyerId).includes(q)) adjust(enc, { trust: 3, interest: 2 });
    else adjust(enc, { patience: -5 });
  }
  switch (id) {
    case 'ask_room':
      say(enc, 'seller', pick(SELLER.askRoom, ctx.rng));
      enc.asked.push('room');
      reveal(enc, prefsFor(enc).roomPriorities);
      buyerSay(enc, pick(prefsFor(enc).room, ctx.rng, avoid), 'neutral');
      adjust(enc, { patience: -Q.cost + 2, trust: 4, interest: 4 });
      if (enc.stage === 'discovery') enc.stage = 'qualification';
      if (enc.tutorial) fx.tutorialAdvance = 'asked_room';
      break;
    case 'ask_drawn':
      say(enc, 'seller', pick(SELLER.askDrawn, ctx.rng));
      enc.asked.push('drawn');
      reveal(enc, b.priorities.drawn);
      buyerSay(enc, pick(L.drawnTo, ctx.rng, avoid));
      adjust(enc, { patience: -Q.cost, trust: 3, interest: 2 });
      if (enc.stage === 'discovery') enc.stage = 'qualification';
      break;
    case 'ask_budget': {
      const early = !enc.asked.includes('room') && !enc.asked.includes('drawn') && !enc.presented;
      say(enc, 'seller', pick(early ? SELLER.askBudgetEarly : SELLER.askBudgetLate, ctx.rng));
      enc.asked.push('budget');
      if (early) {
        buyerSay(enc, pick(L.budgetEarly, ctx.rng), b.directBudgetTrust < 0 ? 'skeptical' : 'neutral');
        adjust(enc, { trust: b.directBudgetTrust, patience: -Q.cost });
      } else {
        buyerSay(enc, pick(L.budgetLate, ctx.rng));
        adjust(enc, { patience: -Q.cost + 1 });
      }
      const pb = prefsFor(enc).budget;
      const cap = Math.round(pb[1] * (1 + enc.tier * 0.06));
      enc.budgetKnown = [round5(pb[0]), round5(cap * (early && b.directBudgetTrust < 0 ? 1.05 : 1))];
      if (enc.stage === 'discovery') enc.stage = 'qualification';
      break;
    }
    case 'ask_decider':
      say(enc, 'seller', pick(SELLER.askDecider, ctx.rng));
      enc.asked.push('decider');
      buyerSay(enc, pick(L.decider, ctx.rng));
      adjust(enc, { patience: -Q.cost + 2, trust: 2 });
      break;
    case 'small_talk':
      enc.asked.push('small');
      enc.prompt = { kind: 'manner', rugUid: '' };
      say(enc, 'system', 'How do you want to come across?');
      return fx;
    case 'm_charm':
    case 'm_kind':
    case 'm_firm': {
      enc.prompt = undefined;
      const kind: MannerKind = id === 'm_charm' ? 'charm' : id === 'm_kind' ? 'kind' : 'firm';
      say(enc, 'seller', pick(SELLER_MANNER[kind], ctx.rng));
      const r = BUYER_MANNER[enc.buyerId]?.[kind];
      const like = r?.like ?? 0;
      const skill = lvl(ctx, 'speech');
      if (r) buyerSay(enc, like >= 0 ? r.good : r.bad, like > 0 ? 'warm' : like < 0 ? 'skeptical' : 'neutral');
      else buyerSay(enc, pick(L.smallTalk, ctx.rng));
      if (like > 0) adjust(enc, { trust: 8 + Math.round(skill / 3), interest: 4, patience: kind === 'kind' ? 8 : 0 });
      else if (like === 0) adjust(enc, { trust: 2 + Math.round(skill / 5), patience: -3 });
      else adjust(enc, { trust: -6 + Math.round(skill / 5), patience: -6 });
      lean(fx, kind === 'charm' ? { charm: 3 } : kind === 'kind' ? { kindness: 3 } : { firmness: 3 });
      gain(fx, 'speech', 3);
      break;
    }
    case 'tea':
      say(enc, 'seller', SELLER.tea[0]);
      enc.teaUsed = true;
      buyerSay(enc, pick(L.tea, ctx.rng), 'warm');
      adjust(enc, { patience: 15, trust: 3 });
      fx.sfx!.push('tea');
      break;

    case 'story':
    case 'craft':
    case 'fit':
    case 'durability': {
      if (!item || !t) break;
      if (id === 'story' && (item.provenance === 'Uncertain' || item.provenance === 'Disputed') && !enc.argsUsed.includes('story') && !enc.tutorial) {
        enc.prompt = { kind: 'story', rugUid: item.uid };
        say(enc, 'system', 'You have no papers for this rug. How do you tell it?');
        return fx;
      }
      argue(enc, ctx, id, item, t, fx);
      break;
    }
    case 'story_true':
      if (!item || !t) break;
      enc.prompt = undefined;
      argue(enc, ctx, 'story', item, t, fx);
      adjust(enc, { trust: 4 });
      lean(fx, { honesty: 3 });
      break;
    case 'story_embellish': {
      if (!item || !t) break;
      enc.prompt = undefined;
      enc.argsUsed.push('story');
      say(enc, 'seller', SELLER.embellish);
      enc.embellished = true;
      // a practised liar is caught less often; a known fox is watched more closely
      const notice = b.embellishNotice * (1 - lvl(ctx, 'speech') * 0.025) * (perk(ctx, 'speech', 10) ? 0.7 : 1) * (1 + Math.max(0, -(ctx.manner?.honesty ?? 0)) / 200);
      gain(fx, 'speech', 4);
      if (ctx.rng() < notice) {
        enc.embellishCaught = true;
        buyerSay(enc, pick(L.embellishCaught, ctx.rng), 'skeptical');
        adjust(enc, { trust: -30, interest: -15, patience: -10 });
        fx.repDelta = -1;
        fx.lie = 'caught';
        lean(fx, { honesty: -8 });
      } else {
        buyerSay(enc, pick(L.embellishBelieved, ctx.rng), 'pleased');
        adjust(enc, { interest: 12 + Math.round(8 * Math.max(0, b.args.story)), patience: -Q.arg });
        lean(fx, { honesty: -3 });
        fx.lie = 'ok';
      }
      afterArgument(enc, ctx, item, t);
      break;
    }
    case 'saffron_move': {
      const uid = enc.prompt?.rugUid;
      say(enc, 'seller', SELLER.saffronMove[0]);
      say(enc, 'saffron', 'Saffron stretches, gives you a look, and relocates to the cushions.');
      enc.saffronOn = undefined;
      enc.prompt = undefined;
      adjust(enc, { patience: -3 });
      fx.sfx!.push('meow');
      if (uid) return { ...presentRug(enc, ctx, uid), sfx: ['meow', 'unfold'] };
      break;
    }
    case 'saffron_stay': {
      const uid = enc.prompt?.rugUid;
      say(enc, 'seller', SELLER.saffronStay[0]);
      enc.saffronOn = '__stay__' + uid;
      enc.prompt = undefined;
      buyerSay(enc, pick(L.saffron, ctx.rng), b.catAffinity > 0 ? 'warm' : 'skeptical');
      adjust(enc, { interest: b.catAffinity * 5, trust: b.catAffinity * 3 });
      gain(fx, 'catkeeping', 3);
      if (uid) {
        const r = presentRug(enc, ctx, uid);
        return { ...r, sfx: ['purr', 'unfold'] };
      }
      break;
    }

    case 'obj_honest': {
      const o = enc.objection;
      if (!o) break;
      say(enc, 'seller', pick(SELLER.honest, ctx.rng));
      buyerSay(enc, o.honest, 'warm');
      enc.honestCount++;
      if (enc.buyerId === 'nabil') { enc.nabilDisclosed = true; adjust(enc, { trust: 4 }); }
      adjust(enc, { trust: 10, interest: o.factsWorks ? 3 : -3, patience: -4 });
      lean(fx, { honesty: 3 });
      gain(fx, 'speech', 2);
      resolveObjection(enc);
      break;
    }
    case 'obj_facts': {
      const o = enc.objection;
      if (!o || !t) break;
      say(enc, 'seller', o.id === 'dirty' || o.id === 'cost' || o.id === 'light' ? t.durabilityLine : t.craftLine);
      gain(fx, 'speech', 2);
      if (o.factsWorks) {
        buyerSay(enc, o.facts, 'pleased');
        adjust(enc, { interest: 8, patience: -6 });
      } else {
        buyerSay(enc, o.facts, 'skeptical');
        adjust(enc, { interest: -6, trust: -4, patience: -8 });
        if (enc.buyerId === 'nabil') nabilBluff(enc, ctx);
      }
      resolveObjection(enc);
      break;
    }
    case 'obj_concede':
      say(enc, 'seller', pick(SELLER.concession, ctx.rng));
      enc.concession = true;
      adjust(enc, { interest: 6, trust: 2, patience: -4 });
      lean(fx, { firmness: -2, kindness: 1 });
      buyerSay(enc, pick(L.concession, ctx.rng), 'neutral');
      resolveObjection(enc);
      break;
    case 'obj_another':
      say(enc, 'seller', SELLER.another[0]);
      enc.objectionDone = true;
      enc.objection = undefined;
      enc.presented = undefined;
      enc.stage = 'qualification';
      adjust(enc, { patience: -5 });
      say(enc, 'system', 'Tap another rug to present it.');
      break;

    case 'c_measure': case 'c_deadline': case 'c_accept': case 'c_decline': case 'c_more': case 'c_rub': case 'c_keep': case 'c_deliver': case 'c_leave':
      cohenAction(enc, ctx, id, fx);
      break;
    case 'nabil_package': {
      const pkg = nabilPackage(enc, ctx);
      if (!pkg) break;
      say(enc, 'seller', `Both, then: the ${t?.name} and the ${RUGS[pkg.other.typeId]?.name}.`);
      buyerSay(enc, `Two pieces, one figure: ${fmt(pkg.price)}, paid today. Each a little under what I would pay alone, because I carry the risk of both.`, 'pleased');
      enc.packageUid = pkg.other.uid;
      closeSale(enc, ctx, pkg.price);
      break;
    }
    case 'name_price': {
      if (!item || !t || !price) break;
      bargainPrice(enc, ctx, item, price, 'name', fx);
      break;
    }
    case 'hold': {
      if (!item || !enc.askPrice) break;
      bargainPrice(enc, ctx, item, enc.askPrice, 'hold', fx);
      lean(fx, { firmness: 2 });
      if (perk(ctx, 'haggling', 10)) adjust(enc, { patience: 6 });
      break;
    }
    case 'halfway': {
      if (!item || !enc.askPrice || !enc.buyerOffer) break;
      bargainPrice(enc, ctx, item, round5((enc.askPrice + enc.buyerOffer) / 2), 'halfway', fx);
      lean(fx, { firmness: -1 });
      break;
    }
    case 'sweetener':
      say(enc, 'seller', SELLER.sweetener[0]);
      enc.sweetened = true;
      buyerSay(enc, pick(L.sweetener, ctx.rng), 'pleased');
      adjust(enc, { interest: 6, patience: 4 });
      lean(fx, { kindness: 2 });
      fx.ledger = { label: 'Delivery and fringe wash', amount: -5, kind: 'expense' };
      fx.cashDelta = -5;
      if (item && enc.buyerOffer) {
        const w = wtp(enc, item);
        enc.buyerOffer = Math.min(snapDown(w * 0.95), snap(enc.buyerOffer * 1.08));
        say(enc, 'buyer', pick(L.counter, ctx.rng).replace('{price}', fmt(enc.buyerOffer)));
      }
      break;
    case 'quick_sale': {
      if (!item || !t || t.tier !== 1) break;
      const q = quickPrice(enc, item);
      say(enc, 'seller', `For you, ${fmt(q)}, and no haggling.`);
      closeSale(enc, ctx, q);
      fx.sfx!.push('coins');
      break;
    }
    case 'accept_offer':
      if (!item || !enc.buyerOffer) break;
      say(enc, 'seller', pick(SELLER.accept, ctx.rng).replace('{price}', fmt(enc.buyerOffer)));
      closeSale(enc, ctx, enc.buyerOffer);
      if (enc.rounds <= 1) lean(fx, { firmness: -1 });
      fx.sfx!.push('coins');
      if (enc.tutorial) fx.tutorialAdvance = 'sold';
      break;
  }
  if (enc.outcome === 'sold') {
    gain(fx, 'haggling', 6 + ((t?.tier ?? 1) - 1) * 4);
    if (enc.tutorial) fx.tutorialAdvance = 'sold';
  }
  checkWalk(enc, ctx);
  return fx;
}

function argue(enc: Encounter, ctx: Ctx, kind: ArgKind, item: RugItem, t: RugType, fx: Effects) {
  const b = BUYERS[enc.buyerId];
  const L = b.lines;
  const line =
    kind === 'story' ? t.storyLine : kind === 'craft' ? t.craftLine : kind === 'durability' ? t.durabilityLine : (SELLER.fit[enc.buyerId] ?? '').replace('{rug}', t.name);
  say(enc, 'seller', line);
  if (enc.argsUsed.includes(kind)) {
    buyerSay(enc, pick(L.repeatArg, ctx.rng), 'skeptical');
    adjust(enc, { patience: -10, interest: -2 });
    if (enc.buyerId === 'nabil') nabilBluff(enc, ctx);
    return;
  }
  enc.argsUsed.push(kind);
  let relevance = 0.4;
  if (kind === 'story') relevance = t.traits.includes('story') ? 1 : 0.35;
  if (kind === 'story' && item.provenance === 'Documented') relevance += 0.2;
  if (kind === 'craft') relevance = t.traits.includes('fineWeave') ? 1 : t.traits.includes('hardwearing') ? 0.6 : 0.4;
  if (kind === 'durability') relevance = t.traits.includes('fragile') ? -1 : t.traits.includes('hardwearing') || t.traits.includes('washable') ? 1 : 0.3;
  // Arran's signed report on the rug, or his loupe in your hand, backs the argument with evidence
  const labBonus = labArgBonus(kind, item.labReports as LabService[] | undefined, ctx.tools, t.traits) + (kind === 'durability' && item.mothproof ? 0.15 : 0);
  if (labBonus && relevance >= 0) relevance += labBonus;
  if (kind === 'fit') relevance = enc.presentedFit >= 60 ? 1 : enc.presentedFit >= 40 ? 0.3 : -0.6;
  const weight = b.args[kind];
  const sp = lvl(ctx, 'speech');
  const delta = Math.round(10 * weight * relevance + (ctx.rng() * 4 - 2) + (relevance > 0 ? sp * 0.3 + (perk(ctx, 'speech', 5) ? 2 : 0) + (kind === 'story' && item.provenance === 'Documented' && perk(ctx, 'scholarship', 10) ? 3 : 0) : 0));
  gain(fx, 'speech', 2);
  const good = delta >= 6;
  const pool = L[kind];
  buyerSay(enc, pick(good ? pool.good : pool.flat, ctx.rng, recentBuyerTexts(enc)), good ? 'pleased' : delta < 0 ? 'skeptical' : 'neutral');
  adjust(enc, { interest: delta, patience: weight < 0 ? -Q.arg - 6 : -Q.arg, trust: (good ? 2 : 0) + (labBonus && good ? 1 : 0) });
  if (enc.tutorial) {
    fx.tutorialAdvance = kind === 'story' || kind === 'fit' ? 'arg_right' : 'arg_wrong';
    if (fx.tutorialAdvance === 'arg_wrong') say(enc, 'narrator', NARRATOR.step4wrong);
  }
  afterArgument(enc, ctx, item, t);
}

function afterArgument(enc: Encounter, ctx: Ctx, item: RugItem, t: RugType) {
  if (!enc.tutorial && !enc.objectionDone && enc.stage !== 'objection' && enc.argsUsed.length >= 1 && !enc.outcome) {
    raiseObjection(enc, ctx, item, t);
  }
}

function resolveObjection(enc: Encounter) {
  enc.objectionDone = true;
  enc.objection = undefined;
  enc.stage = enc.askPrice ? 'bargaining' : 'presentation';
}

function bargainPrice(enc: Encounter, ctx: Ctx, item: RugItem, price: number, mode: 'name' | 'hold' | 'halfway', fx: Effects) {
  const b = BUYERS[enc.buyerId];
  const L = b.lines;
  enc.stage = 'bargaining';
  enc.rounds++;
  gain(fx, 'haggling', 2);
  const prevAsk = enc.askPrice;
  const w = wtp(enc, item);
  const lineSet = mode === 'hold' ? SELLER.hold : mode === 'halfway' ? SELLER.halfway : SELLER.price;
  say(enc, 'seller', pick(lineSet, ctx.rng).replace('{price}', fmt(price)));
  enc.askPrice = price;
  if (mode === 'hold') adjust(enc, { trust: b.pushyTrust });
  // Nabil allows one serious revision; a price nudged by a few piastres is not one
  if (enc.buyerId === 'nabil' && mode === 'name' && enc.buyerOffer && isTokenChange(prevAsk, price)) {
    buyerSay(enc, 'That is not a new price. It is the old one, wearing a different hat.', 'skeptical');
    nabilBluff(enc, ctx);
    if (enc.outcome) return;
  }

  if (enc.buyerOffer && price <= enc.buyerOffer) {
    buyerSay(enc, pick(L.priceLow, ctx.rng), 'pleased');
    closeSale(enc, ctx, price);
    return;
  }
  const acceptLine = price <= w * 0.85 ? L.priceLow : L.priceFair;
  if (price <= w * 0.93 || (mode !== 'name' && price <= w && ctx.rng() < 0.55 + enc.trust / 200) || (enc.rounds >= 3 && price <= w)) {
    buyerSay(enc, pick(acceptLine, ctx.rng), 'pleased');
    if (mode === 'hold' && enc.buyerOffer) say(enc, 'buyer', pick(L.holdGive, ctx.rng).replace('{price}', fmt(price)));
    closeSale(enc, ctx, price);
    return;
  }
  // Counter-offer logic
  const floorOffer = snapDown(w * Math.min(0.85, 0.6 + ctx.rng() * 0.08 + (enc.edge?.open ?? 0)));
  const prev = enc.buyerOffer ?? floorOffer;
  let next: number;
  if (price <= w) {
    next = snapDown(Math.min(w, (prev + price) / 2));
    adjust(enc, { patience: -6 });
    buyerSay(enc, pick(L.counter, ctx.rng, recentBuyerTexts(enc)).replace('{price}', fmt(next)), 'neutral');
  } else if (price <= w * 1.25) {
    next = snapDown(Math.min(w * 0.97, prev + (w - prev) * 0.4));
    adjust(enc, { patience: mode === 'hold' ? -16 : -12, interest: -2 });
    buyerSay(enc, pick(mode === 'hold' ? L.holdRefuse : L.priceHigh, ctx.rng), 'skeptical');
    buyerSay(enc, pick(L.counter, ctx.rng).replace('{price}', fmt(next)), 'skeptical');
  } else {
    next = prev;
    enc.insulted = true;
    adjust(enc, { patience: -24, trust: -8, interest: -4 });
    buyerSay(enc, pick(L.priceInsult, ctx.rng), 'skeptical');
    if (enc.buyerOffer) say(enc, 'buyer', pick(L.counter, ctx.rng).replace('{price}', fmt(next)));
  }
  enc.buyerOffer = Math.max(next, enc.buyerOffer ?? 0);
  if (enc.buyerId === 'nabil') {
    const t = RUGS[item.typeId];
    say(enc, 'narrator', `Nabil's reason: ${nabilAssessment(t, item, { repairDisclosed: !!enc.nabilDisclosed, repeatedPitchCount: enc.nabilPitches ?? 0, labReport: !!item.labReports?.length }).reason}`);
  }
  if (enc.tutorial) fx.tutorialAdvance = 'countered';
}

/** Malek buys only when he is fully convinced: interested, trusting enough for his mood today, and the
 *  rug right for his floor. A rug he came back for needs less (he has already argued with himself). */
export const malekConvinced = (enc: Encounter) =>
  enc.malekReturn && enc.malekReturn === enc.presented
    ? enc.interest >= 50 && enc.trust >= 40 && enc.presentedFit >= 55
    : enc.interest >= 72 && enc.trust >= (enc.malekBar ?? 55) && enc.presentedFit >= 65;

function closeSale(enc: Encounter, ctx: Ctx, price: number) {
  const b = BUYERS[enc.buyerId];
  if (enc.buyerId === 'malek' && !malekConvinced(enc)) {
    // the figure is agreed, the man is not: he leaves to think about it, and may come back for it
    enc.outcome = 'walked';
    enc.stage = 'close';
    enc.malekUnsure = true;
    buyerSay(enc, pick(MALEK_UNSURE, ctx.rng), 'leaving');
    return;
  }
  enc.outcome = 'sold';
  enc.salePrice = price;
  enc.stage = 'close';
  const bad = enc.presentedFit < 40;
  buyerSay(enc, pick(bad ? b.lines.badSale : b.lines.success, ctx.rng), bad ? 'neutral' : 'pleased');
}

// Short enough that all six fit in one row on a phone without CSS ellipsis chopping them into
// unreadable fragments ("Disc...", "Obje..."); the stage id, not this label, drives game logic.
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'discovery', label: 'Meet' },
  { id: 'qualification', label: 'Ask' },
  { id: 'presentation', label: 'Show' },
  { id: 'objection', label: 'Doubt' },
  { id: 'bargaining', label: 'Haggle' },
  { id: 'close', label: 'Close' },
];

export function petCat(enc: Encounter, ctx: Ctx): Effects {
  const b = BUYERS[enc.buyerId];
  if (enc.catPetted || enc.outcome) return { sfx: ['meow'] };
  enc.catPetted = true;
  if (b.catAffinity > 0) {
    say(enc, 'saffron', 'Saffron rolls over and shows her belly to the customer.');
    buyerSay(enc, pick(b.lines.catPet, ctx.rng), 'warm');
    adjust(enc, { trust: 3 * b.catAffinity, patience: 2 });
  } else {
    say(enc, 'saffron', 'Saffron jumps onto the counter and sniffs the customer\'s sleeve.');
    buyerSay(enc, pick(b.lines.catPet, ctx.rng), 'skeptical');
    adjust(enc, { patience: -4 });
  }
  return { sfx: ['meow'] };
}

/** A bluff, a repeated pitch or a token price move. The third one and he leaves, politely. */
function nabilBluff(enc: Encounter, ctx: Ctx) {
  enc.nabilPitches = (enc.nabilPitches ?? 0) + 1;
  adjust(enc, { patience: -10, trust: -3 });
  if (enc.nabilPitches >= 3 && !enc.outcome) {
    enc.nabilAngry = true;
    enc.outcome = 'walked';
    enc.stage = 'close';
    buyerSay(enc, pick(BUYERS.nabil.lines.walkAway, ctx.rng), 'leaving');
  }
}

/**
 * Nabil's two-rug package: offered once he has named a figure for this rug and trusts you enough,
 * for another good rug on hand. A little under the two figures together.
 */
export function nabilPackage(enc: Encounter, ctx: Ctx): { other: RugItem; price: number } | null {
  if (enc.buyerId !== 'nabil' || !enc.buyerOffer || enc.finalOffered || enc.trust < 45 || enc.outcome) return null;
  const others = ctx.inventory
    .filter((i) => i.uid !== enc.presented && !(i.restoringUntil && i.restoringUntil > 0) && (RUGS[i.typeId]?.tier ?? 1) >= 2)
    .sort((x, y) => wtp(enc, y) - wtp(enc, x));
  const other = others[0];
  if (!other) return null;
  return { other, price: packageOffer(enc.buyerOffer, Math.round(wtp(enc, other) * 0.9)) };
}

// ---------- Cohen: an order, not a haggle ----------
const openOrder = (ctx: Ctx) => ctx.cohen?.order?.status === 'accepted' ? ctx.cohen.order : undefined;

function cohenActions(enc: Encounter, ctx: Ctx): ActionView[] {
  const order = openOrder(ctx) ?? (enc.cohenAccepted ? { dueDay: enc.cohenAccepted.dueDay } : undefined);
  const asked = enc.cohenAsked ?? [];
  const day = ctx.day ?? 1;
  if (!order) {
    const due = dueFor(day, (d) => dateFor(d).weekday);
    const out: ActionView[] = [];
    if (!asked.includes('measure')) out.push({ id: 'c_measure', label: 'Ask the measurements', sub: 'What size the corridor needs', icon: 'room' });
    if (!asked.includes('deadline')) out.push({ id: 'c_deadline', label: 'Ask about the deadline', sub: 'When he needs them', icon: 'calendar' });
    const per = enc.cohenPrice ?? ORDER_PRICE_PER;
    out.push({ id: 'c_accept', label: `Promise two rugs by ${dateFor(due).short}`, sub: `${fmt(per)} a rug, paid on delivery`, icon: 'check' });
    if (asked.includes('measure') && (enc.cohenPushed ?? 0) < 2 && enc.cohenPrice == null) out.push({ id: 'c_more', label: 'Ask more a rug', sub: (enc.cohenPushed ?? 0) ? 'Push again: he may walk' : 'He watches his margin', icon: 'purse' });
    out.push({ id: 'c_decline', label: 'Not this time', sub: 'No harm done', icon: 'hand' });
    return out.slice(0, 4);
  }
  const item = presentedItem(enc, ctx);
  const ok = enc.cohenOk ?? [];
  if (!item) return [{ id: 'c_leave', label: 'Not ready yet', sub: `Due ${dateFor(order.dueDay).short}`, icon: 'hand' }];
  const checks = cohenChecks(item, ctx.findings, enc.cohenManual?.[item.uid]);
  const out: ActionView[] = [];
  const colourUnknown = checks.find((c) => c.id === 'colour')?.ok === null;
  if (colourUnknown) out.push({ id: 'c_rub', label: 'Rub-test the colour yourself', sub: 'A damp cloth; less sure than Arran', icon: 'hand' });
  if (passes(checks)) {
    const first = ok.find((u) => u !== item.uid);
    const firstItem = first ? ctx.inventory.find((i) => i.uid === first) : undefined;
    if (firstItem) {
      const total = 2 * (openOrder(ctx)?.pricePer ?? enc.cohenAccepted?.pricePer ?? ORDER_PRICE_PER);
      out.push({ id: 'c_deliver', label: `Hand over the pair · ${fmt(total)}`, sub: matches(firstItem, item) ? 'They match' : 'Check they match', icon: 'check' });
    } else if (!ok.includes(item.uid)) out.push({ id: 'c_keep', label: 'Set this one aside for him', sub: 'Then show its brother', icon: 'check' });
  }
  out.push({ id: 'c_leave', label: ok.length ? 'Bring the second by the day' : 'Not ready yet', sub: `Due ${dateFor(order.dueDay).short}`, icon: 'hand' });
  return out.slice(0, 4);
}

function cohenAction(enc: Encounter, ctx: Ctx, id: ActionId, fx: Effects) {
  const day = ctx.day ?? 1;
  enc.cohenAsked = enc.cohenAsked ?? [];
  const item = presentedItem(enc, ctx);
  switch (id) {
    case 'c_measure':
      enc.cohenAsked.push('measure');
      say(enc, 'seller', 'What size does the corridor need?');
      buyerSay(enc, 'Two rugs. Same dimensions, same colour. Can you manage that? Each between one metre seventy and two metres forty long, at least a metre wide. Hard-wearing wool, sound edges.', 'neutral');
      break;
    case 'c_deadline': {
      enc.cohenAsked.push('deadline');
      const due = dueFor(day, (d) => dateFor(d).weekday);
      say(enc, 'seller', 'When do you need them?');
      buyerSay(enc, `Seven days: ${dateFor(due).long}. ${fmt(enc.cohenPrice ?? ORDER_PRICE_PER)} a rug, paid when both are delivered. I do not trade on Saturday until evening, so if the day falls on a Saturday I come on the Sunday.`, 'neutral');
      break;
    }
    case 'c_accept': {
      const due = dueFor(day, (d) => dateFor(d).weekday);
      enc.cohenAccepted = { dueDay: due, pricePer: enc.cohenPrice ?? ORDER_PRICE_PER };
      say(enc, 'seller', `Two rugs by ${dateFor(due).short}. You have my word.`);
      buyerSay(enc, "We have an agreement. Don't mistake it for friendship. Show me what you have now, or bring them by the day.", 'neutral');
      enc.stage = 'presentation';
      gain(fx, 'haggling', 2);
      break;
    }
    case 'c_more': {
      // he is rich, and that changes what he can order, not what he will pay: only a seller who has
      // already delivered to him, and whom he trusts in business, gets a little more a rug
      const pushed = (enc.cohenPushed = (enc.cohenPushed ?? 0) + 1);
      const c = ctx.cohen;
      say(enc, 'seller', pushed === 1 ? `${fmt(ORDER_PRICE_PER)} is thin for two sound corridor rugs. Make it more.` : 'I still need more than that.');
      if (pushed === 1 && c && c.ordersDone >= 1 && enc.trust >= 60) {
        enc.cohenPrice = ORDER_PRICE_PER + 25;
        buyerSay(enc, `A single sale is pleasant. A repeat order is a business. ${fmt(enc.cohenPrice)} a rug, because you delivered last time. Not because I like you.`, 'neutral');
      } else if (pushed === 1) {
        adjust(enc, { patience: -10 });
        buyerSay(enc, 'At that price, you earn twice and I earn nothing. Try again.', 'skeptical');
      } else {
        adjust(enc, { trust: -5 });
        buyerSay(enc, "The margin is too thin. I'll leave it.", 'leaving');
        enc.outcome = 'walked';
        enc.stage = 'close';
      }
      break;
    }
    case 'c_decline':
      say(enc, 'seller', 'Not this time. I do not have the stock.');
      buyerSay(enc, 'Then you have wasted neither of our afternoons. Another time.', 'neutral');
      enc.outcome = 'walked';
      enc.stage = 'close';
      break;
    case 'c_rub': {
      if (!item) break;
      const r = manualRub(item);
      enc.cohenManual = { ...(enc.cohenManual ?? {}), [item.uid]: r };
      say(enc, 'narrator', r === 'runs' ? 'You press a damp cloth to the back. It comes away pink.' : 'You press a damp cloth to the back. It looks clean, as far as you can tell.');
      buyerSay(enc, r === 'runs' ? 'Then it is not for a hotel. Thank you for showing me.' : 'Your own rub, then. I will take your word; I will also remember it.', r === 'runs' ? 'skeptical' : 'neutral');
      break;
    }
    case 'c_keep': {
      if (!item) break;
      enc.cohenOk = [...(enc.cohenOk ?? []), item.uid];
      const report = (ctx.findings ?? []).some((f) => f.id === `${item.uid}:fastness`);
      say(enc, 'seller', 'Set this one aside.');
      buyerSay(enc, report ? "Arran's test is useful. Now tell me whether the second rug will match the first." : 'Good. That one I will take. Now its brother.', 'pleased');
      enc.presented = undefined;
      say(enc, 'system', 'Tap another rug to show him the second.');
      break;
    }
    case 'c_deliver': {
      if (!item) break;
      const first = (enc.cohenOk ?? []).find((u) => u !== item.uid);
      const a = first ? ctx.inventory.find((i) => i.uid === first) : undefined;
      if (!a) break;
      if (!matches(a, item)) {
        say(enc, 'seller', 'These two.');
        buyerSay(enc, `They will not look like brothers in one corridor: the ${RUGS[a.typeId].name} is ${RUGS[a.typeId].colourFamily}, this one ${RUGS[item.typeId].colourFamily}. Show me another.`, 'skeptical');
        break;
      }
      // the contract price, as agreed when you promised: no haggle at the door
      const total = 2 * (openOrder(ctx)?.pricePer ?? enc.cohenAccepted?.pricePer ?? ORDER_PRICE_PER);
      say(enc, 'seller', `The ${RUGS[a.typeId].name} and the ${RUGS[item.typeId].name}, as promised.`);
      enc.packageUid = a.uid;
      enc.cohenDelivered = true;
      closeSale(enc, ctx, total);
      break;
    }
    case 'c_leave':
      say(enc, 'seller', 'I will have them for you by the day.');
      buyerSay(enc, 'Good. I will come back.', 'neutral');
      enc.outcome = 'walked';
      enc.stage = 'close';
      break;
  }
}
