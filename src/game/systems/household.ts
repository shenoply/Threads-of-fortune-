// The household: a match made through families, the mahr and the wedding feast, a wife at home in Giza,
// children growing up over the years, and in the end an heir who takes the trading house on.
// In 1925 a young merchant of standing did not court a girl himself: an uncle, a dealer friend or a
// family the trade knew carried word between houses. He called on her father, sent presents to the
// house, and was weighed on his name, his dress and his honesty. The marriage contract (katb al-kitab)
// fixed the mahr, paid to the bride; the wedding feast followed in her family's town.
//
// Pure logic: no store import (the store imports this file).
import type { GameState } from '../state/store';
import type { LedgerEntry, RugItem } from '../types';
import { post } from './post';
import { heroCharisma, START_WARDROBE } from '../../data/wardrobe';
import { levelOf } from '../../data/character';
import { fmt } from '../economy/money';
import { dateFor } from '../economy/economy';

export type BrideId = 'layla' | 'nadia' | 'amira';
export type SpouseRole = 'home' | 'stall' | 'books' | 'rugs';
export type ChildPath = 'school' | 'shop' | 'weaving';
export type ChildRole = 'home' | 'apprentice' | 'shop';

export interface Bride {
  id: BrideId;
  name: string;
  short: string;
  father: string;
  city: string;
  cityName: string;
  /** who carries word between the houses */
  introducer: string;
  intro: string;
  /** what she brings to the trading house */
  brings: string;
  mahr: number;
  feast: number;
  feastRep: number;
  gift: { label: string; cost: number };
  /** what her family weighs most: your dress, your honesty, or your knowledge of carpets */
  likes: 'dress' | 'honesty' | 'craft';
  role: SpouseRole;
  /** towns whose dealers treat you as a friend once the families are joined */
  friends: string[];
}

export const BRIDES: Record<BrideId, Bride> = {
  layla: {
    id: 'layla', name: 'Layla al-Sabbagh', short: 'Layla', city: 'damascus', cityName: 'Damascus',
    father: 'Tawfiq al-Sabbagh, a silk merchant in the Souq al-Hamidiyya',
    introducer: 'Farid al-Khatib',
    intro: 'Farid al-Khatib knows a silk merchant in the Souq al-Hamidiyya with a daughter of age. A Damascus family would open the Levant to you.',
    brings: 'Her father\'s friends in Damascus and Aleppo: dealers there sell to you as to one of their own.',
    mahr: 6000, feast: 3000, feastRep: 6,
    gift: { label: 'a bolt of fine Egyptian cotton for the house', cost: 400 },
    likes: 'dress', role: 'home', friends: ['damascus', 'aleppo'],
  },
  nadia: {
    id: 'nadia', name: 'Nadia Abd al-Latif', short: 'Nadia', city: 'cairo', cityName: 'Cairo',
    father: 'Ustaz Fahmi Abd al-Latif, who teaches at a government school in Sayyida Zeinab',
    introducer: 'Uncle Rashid',
    intro: 'Uncle Rashid has spoken to a schoolteacher in Cairo. His daughter reads and writes, and keeps her father\'s accounts.',
    brings: 'She keeps the books: money short in the tin, or in an agent\'s takings, does not go unseen.',
    mahr: 3500, feast: 2000, feastRep: 5,
    gift: { label: 'books from the Cairo booksellers for her father', cost: 250 },
    likes: 'honesty', role: 'books', friends: ['cairo'],
  },
  amira: {
    id: 'amira', name: 'Amira Abu Salem', short: 'Amira', city: 'fayoum', cityName: 'the Fayoum',
    father: 'Hajj Mansur Abu Salem, of the Fayoum looms that sign with a camel',
    introducer: 'the Abu Salem weavers',
    intro: 'The Abu Salem looms in the Fayoum wove your father\'s rug. Hajj Mansur\'s eldest daughter knows a carpet from the back.',
    brings: 'She judges rugs and mends them at home, and in time she will keep a small workshop of her own.',
    mahr: 2500, feast: 1200, feastRep: 4,
    gift: { label: 'good wool and madder for the family looms', cost: 200 },
    likes: 'craft', role: 'rugs', friends: ['fayoum'],
  },
};
export const BRIDE_ORDER: BrideId[] = ['nadia', 'amira', 'layla'];
export const brideArt = (id: BrideId) => `art/family/bride-${id}.jpg`;
export const childArt = (c: Child) => `art/family/child-${c.sex}-${ageOf(c) >= 18 ? 18 : ageOf(c) >= 12 ? 12 : 5}.jpg`;

/** standing needed before families will listen: reputation and a canopy stall or better */
export const MATCH_REP = 25;
export const MATCH_STALLS = ['bazaar', 'khan'];
/** favour her father must have of you before you may ask for her hand */
export const ASK_AT = 70;
/** days between the contract and the feast, for the families to prepare */
export const FEAST_AFTER = 7;
export const VISIT_HOURS = 3;
export const GIFT_EVERY = 7;
/** a present for your wife, and how often it means something */
export const PRESENT = { cost: 80, every: 5, lift: 8 };
export const EVENING = { hours: 3, lift: 6 };
/** first child some 300 to 400 days after the wedding, the next ones 600 to 1,000 days apart */
export const FIRST_CHILD: [number, number] = [300, 400];
export const NEXT_CHILD: [number, number] = [600, 1000];
export const MAX_CHILDREN = 5;
/** how fast years pass at home against the trading days */
export const PACES = [1, 4, 12] as const;
export const AMIRA_WORKSHOP_AFTER = 365;
/** an heir keeps this share of his father's name */
export const HEIR_REP = 0.6;
export const PATH_AGE = 6;
export const GROWN = 18;

export const SON_NAMES = ['Ahmad', 'Mustafa', 'Hussein', 'Taha', 'Zaki', 'Anwar'];
export const DAUGHTER_NAMES = ['Fatma', 'Zeinab', 'Aisha', 'Huda', 'Safiya', 'Nabila'];

export interface Suitor { favour: number; visits: number; gifts: number; lastVisit?: number; lastGift?: number }
export interface Spouse {
  id: BrideId;
  married: number;
  content: number;
  role: SpouseRole;
  /** the last night you slept at home in Giza */
  lastHome: number;
  lastPresent?: number;
  lastEvening?: number;
  lastLetter?: number;
  lastMend?: number;
  workshop?: boolean;
}
export interface Child {
  id: string;
  sex: 'son' | 'daughter';
  name?: string;
  born: number;
  /** days of home life lived (a night adds the household pace) */
  ageDays: number;
  path?: ChildPath;
  traits: { learning: number; trade: number; craft: number };
  role?: ChildRole;
  shopAt?: string;
}
export interface HouseholdState {
  stage: 'none' | 'offered' | 'betrothed' | 'married';
  offered?: number;
  suitors: Partial<Record<BrideId, Suitor>>;
  /** the family you are joined to, from the contract on */
  chosen?: BrideId;
  contract?: number;
  spouse?: Spouse;
  children: Child[];
  /** home days until the next birth */
  birthIn?: number;
  pace: number;
  /** the merchant now at the head of the house, once an heir has taken over */
  merchant?: { name: string; since: number; gen: number; father: string };
  /** a widowed mother at home, after the house has passed on */
  mother?: BrideId;
}
export const HOUSEHOLD_START: HouseholdState = { stage: 'none', suitors: {}, children: [], pace: 1 };
export const hh = (s: Pick<GameState, 'household'>): HouseholdState => s.household ?? HOUSEHOLD_START;

export type HouseholdAct =
  | { kind: 'seek' }
  | { kind: 'visit'; bride: BrideId }
  | { kind: 'gift'; bride: BrideId }
  | { kind: 'ask'; bride: BrideId }
  | { kind: 'feast' }
  | { kind: 'role'; role: SpouseRole }
  | { kind: 'present' }
  | { kind: 'evening' }
  | { kind: 'name'; child: string; name: string }
  | { kind: 'path'; child: string; path: ChildPath }
  | { kind: 'childRole'; child: string; role: ChildRole; shop?: string }
  | { kind: 'pace'; pace: number }
  | { kind: 'inherit' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const ageOf = (c: Child) => Math.floor(c.ageDays / 365);
export const childName = (c: Child) => c.name ?? (c.sex === 'son' ? 'your son' : 'your daughter');
export const contentWord = (v: number) => (v >= 75 ? 'Content' : v >= 50 ? 'Settled' : v >= 25 ? 'Lonely' : 'Unhappy');
export const merchantName = (s: Pick<GameState, 'household'>, fallback = 'Hassan') => hh(s).merchant?.name ?? fallback;
export const PATH_WORD: Record<ChildPath, string> = { school: 'at school', shop: 'learning the trade at the stall', weaving: 'at the loom' };
export const ROLE_WORD: Record<SpouseRole, string> = { home: 'Keeps the house', stall: 'Minds the Giza stall', books: 'Keeps the books', rugs: 'Judges and mends rugs' };

/** Can families be approached yet? */
export const standing = (s: Pick<GameState, 'reputation' | 'upgrades'>) => s.reputation >= MATCH_REP && s.upgrades.some((u) => MATCH_STALLS.includes(u));

/** What one call on her family adds to their opinion of you: your name, your dress (and whether it is
 *  clean), your honesty in the bazaar, and what her family cares for most. */
export function visitGain(s: Pick<GameState, 'reputation' | 'wardrobe' | 'attire' | 'manner' | 'skills' | 'stats'>, id: BrideId): { gain: number; why: string } {
  const b = BRIDES[id];
  const ch = heroCharisma(s.wardrobe ?? START_WARDROBE, s.attire?.clean ?? 100);
  const m = s.manner ?? { honesty: 0, firmness: 0, kindness: 0, charm: 0 };
  const clean = s.attire?.clean ?? 100;
  let g = 10 + Math.min(5, Math.floor(s.reputation / 10)) + Math.round(ch / 4) + clamp(Math.round(m.honesty / 20), -5, 5);
  let why = '';
  if (b.likes === 'dress') { g += Math.round(ch / 4); why = ch >= 8 ? 'Her father looks at your coat before your face, and he is satisfied.' : 'Her father looks at your clothes a moment too long.'; }
  if (b.likes === 'honesty') {
    g += clamp(Math.round(m.honesty / 10), -10, 5) + Math.min(3, Math.floor(levelOf(s.skills?.scholarship ?? 0) / 3));
    why = m.honesty >= 10 ? 'The teacher has asked about you in the bazaar, and heard you deal straight.' : m.honesty <= -10 ? 'The teacher has heard you tell a good story in the bazaar. He is not sure he likes it.' : 'The teacher asks what you read, and listens to the answer.';
  }
  if (b.likes === 'craft') {
    const eye = Math.min(6, Math.floor((levelOf(s.skills?.appraisal ?? 0) + levelOf(s.skills?.craft ?? 0)) / 3));
    g += eye + clamp(Math.round(m.kindness / 25), -2, 3);
    why = eye >= 3 ? 'Hajj Mansur turns a rug over and you read the back with him. He nods.' : 'Hajj Mansur shows you the looms. You do not know what to say about them.';
  }
  if (clean < 35) { g -= 4; why += ' You came in the dust of the road.'; }
  g -= Math.min(6, (s.stats?.liesCaught ?? 0) * 2);
  return { gain: Math.max(2, Math.round(g)), why: why.trim() };
}

type Act = Pick<GameState, 'household' | 'day' | 'cash' | 'reputation' | 'world' | 'ledger' | 'journal' | 'wardrobe' | 'attire' | 'manner' | 'skills' | 'stats' | 'ended'>;
export interface ActResult { patch: Partial<GameState>; msg: string; ok: boolean }
const no = (msg: string): ActResult => ({ patch: {}, msg, ok: false });

/** The heir: the eldest child who is grown. */
export function heirOf(h: HouseholdState): Child | undefined {
  return h.children.filter((c) => ageOf(c) >= GROWN && c.name).sort((a, b) => a.born - b.born || b.ageDays - a.ageDays)[0];
}

/** A grown child left to keep a shop: the shop record carries `childAgent`, read with childAgentOf. */
export function childAgentOf(s: unknown, shopKey: string): Child | undefined {
  const shops = (s as { shops?: Record<string, { childAgent?: { id: string } } | undefined> }).shops;
  const id = shops?.[shopKey]?.childAgent?.id;
  return id ? hh(s as GameState).children.find((c) => c.id === id) : undefined;
}
/** how much an agent can skim unseen: halved while someone at home keeps the books */
export function skimFactor(s: Pick<GameState, 'household'>) {
  const sp = hh(s).spouse;
  return sp && sp.role === 'books' && sp.content >= 25 ? (sp.id === 'nadia' ? 0.25 : 0.5) : 1;
}
/** your wife minding the Giza stall while you are away (no boy hired, and she is willing): her name */
export function spouseMinds(s: Pick<GameState, 'household' | 'shopBoy'>): string | null {
  const sp = hh(s).spouse;
  return sp && sp.role === 'stall' && sp.content >= 25 && !s.shopBoy?.hired ? BRIDES[sp.id].short : null;
}
/** a grown son travelling with you as your apprentice */
export const apprentice = (s: Pick<GameState, 'household'>) => hh(s).children.find((c) => c.role === 'apprentice');

export function applyHousehold(s: Act, a: HouseholdAct, rng: () => number = Math.random): ActResult {
  const h = hh(s);
  const at = s.world.at;
  const day = s.day;
  const hour = s.world.hour;
  const pay = (amount: number, label: string): Pick<GameState, 'cash' | 'ledger'> => ({ cash: s.cash - amount, ledger: [...s.ledger, { day, kind: 'expense', label, amount: -amount } as LedgerEntry] });
  const jot = (text: string) => [...s.journal, { day, text, kind: 'home' }];
  const kid = (id: string) => h.children.find((c) => c.id === id);
  const setKid = (c: Child): HouseholdState => ({ ...h, children: h.children.map((x) => (x.id === c.id ? c : x)) });

  switch (a.kind) {
    // marriage is never forced on the merchant: he asks Rashid to look for a match only if he wants one
    case 'seek': {
      if (h.stage !== 'none' || h.spouse || h.merchant) return no('That is already in hand.');
      if (!standing(s as never)) return no(`Rashid laughs: "On what? Families want a name (reputation ${MATCH_REP}) and a stall with a canopy before they open the door to you."`);
      return { ok: true, msg: OFFER_NOTE, patch: { household: { ...h, stage: 'offered', offered: day }, journal: jot('Asked Uncle Rashid to look for a match.') } };
    }
    case 'visit': {
      if (h.stage !== 'offered') return no('There is no family to call on.');
      const b = BRIDES[a.bride];
      if (at !== b.city) return no(`${b.short}'s family lives in ${b.cityName}. Call on them when you are there.`);
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.lastVisit === day) return no('You called on them today. Calling twice in a day is pressing.');
      if (hour + VISIT_HOURS > 20) return no('It is too late in the day to call on a family. Go in the morning.');
      const { gain, why } = visitGain(s, a.bride);
      const favour = clamp(su.favour + gain, 0, 100);
      const ready = favour >= ASK_AT;
      const msg = `You sit with ${b.father.split(',')[0]} for coffee and talk of the trade. ${why} ${ready ? 'He would hear a proposal now.' : 'He will think about you.'}`.replace(/\s+/g, ' ');
      return { ok: true, msg, patch: {
        household: { ...h, suitors: { ...h.suitors, [a.bride]: { ...su, favour, visits: su.visits + 1, lastVisit: day } } },
        world: { ...s.world, hour: Math.min(23.9, hour + VISIT_HOURS) },
        journal: jot(`Called on ${b.father.split(',')[0]} in ${b.cityName}.`),
      } };
    }
    case 'gift': {
      if (h.stage !== 'offered') return no('There is no family to send a present to.');
      const b = BRIDES[a.bride];
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.lastGift !== undefined && day - su.lastGift < GIFT_EVERY) return no('Your last present has hardly arrived. Another so soon looks like buying favour.');
      if (s.cash < b.gift.cost) return no(`A fitting present costs ${fmt(b.gift.cost)}. You do not have it.`);
      const lift = su.visits ? 8 : 4;
      return { ok: true, msg: `You send ${b.gift.label} to the house in ${b.cityName}${su.visits ? '' : '. A present from a man they have not met counts for less'}.`, patch: {
        ...pay(b.gift.cost, `A present for the ${b.name.split(' ').slice(1).join(' ')} family`),
        household: { ...h, suitors: { ...h.suitors, [a.bride]: { ...su, favour: clamp(su.favour + lift, 0, 100), gifts: su.gifts + 1, lastGift: day } } },
      } };
    }
    case 'ask': {
      if (h.stage !== 'offered') return no('You are not courting.');
      const b = BRIDES[a.bride];
      if (at !== b.city) return no(`You ask in person, at her father's house in ${b.cityName}.`);
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.favour < ASK_AT) {
        return { ok: false, msg: 'Her father says it is too soon; the families hardly know each other. Call again, and send word to the house.', patch: { household: { ...h, suitors: { ...h.suitors, [a.bride]: { ...su, favour: clamp(su.favour - 5, 0, 100) } } } } };
      }
      if (a.bride === 'nadia' && (s.manner?.honesty ?? 0) < -25) return no('The teacher has heard too many stories about your stories. He will not give his daughter to a fox.');
      if (s.cash < b.mahr) return no(`The mahr agreed between the families is ${fmt(b.mahr)}, paid when the contract is written. You have ${fmt(s.cash)}.`);
      return { ok: true, msg: `Her father gives his consent. The contract is written before the ma'zun, and the mahr of ${fmt(b.mahr)} is paid. The wedding feast in ${b.cityName} can be held from ${dateFor(day + FEAST_AFTER).short}.`, patch: {
        ...pay(b.mahr, `Mahr for ${b.name} (the marriage contract)`),
        household: { ...h, stage: 'betrothed', chosen: a.bride, contract: day },
        journal: jot(`The marriage contract with ${b.name} is written in ${b.cityName}. Mahr ${fmt(b.mahr)}.`),
      } };
    }
    case 'feast': {
      if (h.stage !== 'betrothed' || !h.chosen) return no('There is no wedding to hold.');
      const b = BRIDES[h.chosen];
      if (at !== b.city) return no(`The feast is held in ${b.cityName}, at her family's house.`);
      const from = (h.contract ?? day) + FEAST_AFTER;
      if (day < from) return no(`Her family is still preparing. The feast can be held from ${dateFor(from).short}.`);
      if (s.cash < b.feast) return no(`The feast costs ${fmt(b.feast)}: the cooks, the singers, the lamps and the cart for her things. You have ${fmt(s.cash)}.`);
      const friends = [...new Set([...s.world.friends, ...b.friends])];
      const spouse: Spouse = { id: b.id, married: day, content: 70, role: b.role, lastHome: day };
      return { ok: true, msg: `The wedding feast is held at her father's house in ${b.cityName}. Half the quarter comes. ${b.short} goes ahead to your house in Giza with her things. Reputation +${b.feastRep}.`, patch: {
        ...pay(b.feast, `Wedding feast in ${b.cityName}`),
        reputation: s.reputation + b.feastRep,
        world: { ...s.world, friends, hour: Math.min(23.9, hour + 4) },
        household: { ...h, stage: 'married', spouse, suitors: {}, birthIn: FIRST_CHILD[0] + Math.floor(rng() * (FIRST_CHILD[1] - FIRST_CHILD[0])) },
        journal: jot(`Married ${b.name} in ${b.cityName}. The dealers of ${b.friends.map((f) => f[0].toUpperCase() + f.slice(1)).join(' and ')} now count you a friend of the family.`),
      } };
    }
    case 'role': {
      const sp = h.spouse;
      if (!sp) return no('You are not married.');
      if (!ROLE_WORD[a.role]) return no('');
      return { ok: true, msg: `${BRIDES[sp.id].short}: ${ROLE_WORD[a.role].toLowerCase()}.`, patch: { household: { ...h, spouse: { ...sp, role: a.role } } } };
    }
    case 'present': {
      const sp = h.spouse;
      if (!sp) return no('You are not married.');
      if (sp.lastPresent !== undefined && day - sp.lastPresent < PRESENT.every) return no('You brought her something only the other day.');
      if (s.cash < PRESENT.cost) return no(`A good present costs ${fmt(PRESENT.cost)}.`);
      const home = at === 'giza';
      const lift = home ? PRESENT.lift : PRESENT.lift - 3;
      const where = home ? 'You bring' : `You send from ${at ? at[0].toUpperCase() + at.slice(1) : 'the road'}`;
      return { ok: true, msg: `${where} ${BRIDES[sp.id].short} a length of silk and a box of sweets.`, patch: {
        ...pay(PRESENT.cost, `A present for ${BRIDES[sp.id].short}`),
        household: { ...h, spouse: { ...sp, content: clamp(sp.content + lift, 0, 100), lastPresent: day } },
      } };
    }
    case 'evening': {
      const sp = h.spouse;
      if (!sp) return no('You are not married.');
      if (at !== 'giza') return no('You are not at home.');
      if (sp.lastEvening === day) return no('You are at home tonight already.');
      const kids = h.children.filter((c) => c.name).length;
      return { ok: true, msg: `You go home early and eat with ${BRIDES[sp.id].short}${kids ? ' and the children' : ''}. The stall can wait.`, patch: {
        household: { ...h, spouse: { ...sp, content: clamp(sp.content + EVENING.lift, 0, 100), lastEvening: day, lastHome: day } },
        world: { ...s.world, hour: Math.min(23.9, Math.max(hour, 18) + EVENING.hours) },
      } };
    }
    case 'name': {
      const c = kid(a.child);
      if (!c) return no('');
      if (c.name) return no(`${c.name} has a name.`);
      const list = c.sex === 'son' ? SON_NAMES : DAUGHTER_NAMES;
      if (!list.includes(a.name)) return no('');
      return { ok: true, msg: `${a.name} it is.`, patch: { household: setKid({ ...c, name: a.name }), journal: jot(`Named our ${c.sex} ${a.name}.`) } };
    }
    case 'path': {
      const c = kid(a.child);
      if (!c) return no('');
      if (ageOf(c) < PATH_AGE) return no(`${childName(c)} is too young.`);
      if (ageOf(c) >= GROWN) return no(`${childName(c)} is grown.`);
      return { ok: true, msg: `${childName(c)} will be ${PATH_WORD[a.path]}.`, patch: { household: setKid({ ...c, path: a.path }) } };
    }
    case 'childRole': {
      const c = kid(a.child);
      if (!c) return no('');
      if (ageOf(c) < GROWN) return no(`${childName(c)} is not yet grown.`);
      const shops = (s as unknown as { shops?: Record<string, Record<string, unknown> | undefined> }).shops;
      let nextShops = shops;
      // leaving a shop: its record no longer names the child
      if (c.shopAt && shops?.[c.shopAt]) { const { childAgent: _drop, ...rest } = shops[c.shopAt] as Record<string, unknown>; void _drop; nextShops = { ...shops, [c.shopAt]: rest }; }
      if (a.role === 'apprentice') {
        if (c.sex !== 'son') return no('A daughter does not travel the caravan roads with her father. She can keep a shop.');
        const others = h.children.map((x) => (x.role === 'apprentice' && x.id !== c.id ? { ...x, role: 'home' as const } : x));
        return { ok: true, msg: `${c.name} travels with you now, to learn the roads and the dealers.`, patch: { household: { ...h, children: others.map((x) => (x.id === c.id ? { ...c, role: 'apprentice', shopAt: undefined } : x)) }, ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}) } };
      }
      if (a.role === 'shop') {
        const key = a.shop ?? '';
        if (!nextShops?.[key]) return no('There is no shop of yours there to keep.');
        const agent = { id: c.id, name: c.name ?? childName(c), since: day };
        return { ok: true, msg: `${c.name} will keep the shop.`, patch: { household: setKid({ ...c, role: 'shop', shopAt: key }), shops: { ...nextShops, [key]: { ...nextShops[key], childAgent: agent } } } as unknown as Partial<GameState> };
      }
      return { ok: true, msg: `${c.name} stays at home.`, patch: { household: setKid({ ...c, role: 'home', shopAt: undefined }), ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}) } };
    }
    case 'pace': {
      if (!(PACES as readonly number[]).includes(a.pace)) return no('');
      return { ok: true, msg: a.pace === 1 ? 'The years at home pass as the days do.' : `Each day of trade counts for ${a.pace} at home.`, patch: { household: { ...h, pace: a.pace } } };
    }
    case 'inherit': {
      const heir = heirOf(h);
      if (!heir?.name) return no('There is no grown child to take on the house.');
      const prev = h.merchant?.name ?? 'Hassan';
      const why = s.ended?.cause === 'death' ? `${prev} is buried in the family tomb.` : s.ended ? `${prev} gives up the trade.` : `${prev} hands the keys of the house to ${heir.name} and sits at home with his pipe.`;
      const rep = Math.round(s.reputation * HEIR_REP);
      const shops = (s as unknown as { shops?: Record<string, Record<string, unknown> | undefined> }).shops;
      let nextShops = shops;
      if (heir.shopAt && shops?.[heir.shopAt]) { const { childAgent: _d, ...rest } = shops[heir.shopAt] as Record<string, unknown>; void _d; nextShops = { ...shops, [heir.shopAt]: rest }; }
      const next: HouseholdState = {
        ...h,
        stage: 'none', suitors: {}, chosen: undefined, contract: undefined, spouse: undefined, birthIn: undefined,
        mother: h.spouse?.id ?? h.mother,
        children: h.children.filter((c) => c.id !== heir.id).map((c) => (c.role === 'apprentice' ? { ...c, role: 'home' as const } : c)),
        merchant: { name: heir.name, since: day, gen: (h.merchant?.gen ?? 1) + 1, father: prev },
      };
      return { ok: true, msg: `${why} ${heir.name} takes on the trading house, its shops and stock, and something of the family name (reputation ${rep}).`, patch: {
        household: next, reputation: rep, ended: undefined,
        ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}),
        journal: jot(`${why} ${heir.name} now heads the house.`),
      } };
    }
  }
  return no('');
}

const OFFER_NOTE = 'Uncle Rashid is pleased: "At last." He has spoken to a schoolteacher in Cairo; Farid al-Khatib writes of a silk merchant\'s daughter in Damascus; the Abu Salem weavers in the Fayoum have a daughter of age. The families would receive you, but they will want to know you first: call on them, send presents, and keep your name clean.';

/** letters from home, by her mood */
function letterBody(h: HouseholdState, sp: Spouse, away: number, rng: () => number): { title: string; body: string } {
  const named = h.children.filter((c) => c.name);
  const kid = named.length ? named[Math.floor(rng() * named.length)] : undefined;
  const kidLine = !kid ? '' : ageOf(kid) < 6 ? ` ${kid.name} asks every evening when Baba is coming home.` : kid.path === 'school' ? ` ${kid.name} has a good report from the school.` : kid.path === 'weaving' ? ` ${kid.name} finished a strip on the loom and wants you to see it.` : kid.path === 'shop' ? ` ${kid.name} sat at the stall with Haj Mahmoud's boy and sold nothing, but talked a great deal.` : '';
  if (sp.content >= 60) {
    const warm = ['The house is well. The neighbours ask after you, and I tell them the trade goes well with you.', 'Everything is in order at home. Your mother\'s cousin came to visit and stayed for lunch.', 'The weather has turned and I have aired the winter bedding. All is well here.'];
    return { title: 'All is well at home', body: `${warm[Math.floor(rng() * warm.length)]}${kidLine} Come home safely.` };
  }
  if (sp.content >= 30) return { title: 'News from home', body: `It is ${away} days now. The house is quiet without you.${kidLine} Write when you can, and tell me when you will be back.` };
  return { title: 'When are you coming home?', body: `It has been ${away} days. I hear more of you from the neighbours than from you.${kidLine} A house needs its master.` };
}

/** The household at night: families who will listen, your wife's contentment and her letters, her help
 *  with the stall and the books, births and children growing. `s` is the state the night began with,
 *  `patch` what the rollover changed; lines for the morning go into `notes`. Returns fields to add. */
export function householdNight(s: GameState, patch: Partial<GameState>, notes: string[], day: number, rng: () => number): Partial<GameState> {
  const h0 = s.household;
  const rep = patch.reputation ?? s.reputation;
  const upgrades = patch.upgrades ?? s.upgrades;
  let h: HouseholdState = h0 ?? HOUSEHOLD_START;
  const out: Partial<GameState> = {};
  const at = (patch.world ?? s.world).at;
  const home = at === 'giza';

  // families are approached only when the merchant asks Rashid to look for a match ('seek')

  const sp0 = h.spouse;
  if (sp0) {
    const b = BRIDES[sp0.id];
    let sp: Spouse = { ...sp0 };
    const kids = h.children.length;
    const away = day - sp.lastHome;
    if (home) sp = { ...sp, lastHome: day, content: sp.content + 1.5 + 0.3 * kids };
    else if (away > 10) sp = { ...sp, content: sp.content - (away > 30 ? 2 : 1) };
    sp.content = clamp(Math.round(sp.content * 10) / 10, 0, 100);
    if (sp0.content >= 25 && sp.content < 25) notes.push(`${b.short} is unhappy: you are hardly ever at home.${sp.role === 'stall' || sp.role === 'books' ? ' She has stopped helping with the trade.' : ''}`);

    // a letter every eight days or so while you are away
    if (!home && away >= 6 && day - (sp.lastLetter ?? sp.married) >= 8) {
      const { title, body } = letterBody(h, sp, away, rng);
      out.post = post(patch.post ?? s.post, { day, sent: day - 2, kind: 'letter', from: `${b.short}, at home in Giza`, title, body });
      sp.lastLetter = day;
      notes.push(`Post: a letter from ${b.short} in Giza, "${title}". Read it under Progress, Post.`);
    }

    const willing = sp.content >= 25;
    let cash = patch.cash ?? s.cash;
    let ledger: LedgerEntry[] | undefined;
    const addLedger = (e: LedgerEntry) => { ledger = [...(ledger ?? patch.ledger ?? s.ledger), e]; };
    // the books: money short in the boy's tin is found and put back
    if (willing && sp.role === 'books') {
      const short = (patch.ledger ?? s.ledger).filter((e) => e.day === s.day && e.label.startsWith('Short in')).reduce((n, e) => n - e.amount, 0);
      if (short > 0 && (sp.id === 'nadia' || rng() < 0.5)) {
        cash += short;
        addLedger({ day: s.day, kind: 'bonus', label: `${b.short} found the money short in the tin`, amount: short });
        notes.push(`${b.short} counted the tin against the day's sales. The boy turned out his pockets: ${fmt(short)} put back.`);
      }
    }
    // rugs: a dirty rug at the stall washed at home; Amira mends worn ones too
    const inv = patch.inventory ?? s.inventory;
    if (willing && sp.role === 'rugs' && day - (sp.lastMend ?? sp.married) >= (sp.id === 'amira' ? 6 : 10)) {
      const can = (i: RugItem) => i.stored && !i.restoringUntil && (i.condition === 'Dirty' || (sp.id === 'amira' && i.condition === 'Worn'));
      const r = inv.find(can);
      if (r) {
        const worn = r.condition === 'Worn';
        out.inventory = inv.map((i) => (i.uid === r.uid ? { ...i, condition: 'Good', restored: i.restored || worn, notes: [...(i.notes ?? []), worn ? `Mended at home by ${b.short}.` : `Washed at home by ${b.short}.`] } : i));
        sp.lastMend = day;
        notes.push(`${b.short} ${worn ? 'mended' : 'washed'} a ${r.condition.toLowerCase()} rug from the stall at home. It is in good order now.`);
      }
    }
    // Amira's workshop: a loom or two in the courtyard, and weavers' girls from the quarter
    if (sp.id === 'amira' && !sp.workshop && day - sp.married >= AMIRA_WORKSHOP_AFTER && willing) {
      sp.workshop = true;
      notes.push('Amira has set up two looms in the courtyard and taken on two girls from the quarter. Her small workshop will bring in a little each week.');
    }
    if (sp.workshop && willing && day % 7 === 0) {
      const weavers = h.children.filter((c) => c.path === 'weaving' && ageOf(c) >= 12).length;
      const inc = 40 + 15 * weavers;
      cash += inc;
      addLedger({ day: s.day, kind: 'sale', label: `${b.short}'s workshop: the week's weaving`, amount: inc });
    }
    if (cash !== (patch.cash ?? s.cash)) out.cash = cash;
    if (ledger) out.ledger = ledger;
    h = { ...h, spouse: sp };

    // births
    let children = h.children;
    let birthIn = h.birthIn;
    if (children.length < MAX_CHILDREN && birthIn !== undefined) {
      birthIn -= h.pace;
      if (birthIn <= 0) {
        const sex: Child['sex'] = rng() < 0.5 ? 'son' : 'daughter';
        children = [...children, { id: `c${day}-${children.length}`, sex, born: day, ageDays: 0, traits: { learning: 5 + Math.floor(rng() * 10), trade: 5 + Math.floor(rng() * 10), craft: 5 + Math.floor(rng() * 10) } }];
        birthIn = NEXT_CHILD[0] + Math.floor(rng() * (NEXT_CHILD[1] - NEXT_CHILD[0]));
        sp.content = clamp(sp.content + 10, 0, 100);
        notes.push(home ? `${b.short} has had a ${sex} in the night. Mother and child are well, God be praised. Choose a name (Me, Household).` : `A telegram from Giza: ${b.short} has had a ${sex}. Mother and child are well. Choose a name (Me, Household).`);
      }
    }
    h = { ...h, spouse: sp, children, birthIn };
  }
  // the years at home: the children grow whether or not their father is alive to see it
  if (h.children.length) {
    const children = h.children.map((c) => {
      const before = ageOf(c);
      const n: Child = { ...c, ageDays: c.ageDays + h.pace };
      const after = ageOf(n);
      if (after > before) {
        const t = { ...n.traits };
        if (n.path === 'school') t.learning += 6; else if (n.path === 'shop') t.trade += 6; else if (n.path === 'weaving') t.craft += 6;
        if (after >= 6) { t.learning += 1; t.trade += 1; t.craft += 1; }
        n.traits = { learning: Math.min(100, t.learning), trade: Math.min(100, t.trade), craft: Math.min(100, t.craft) };
        if (after === PATH_AGE && !n.path) notes.push(`${childName(n)} is six: time to choose school, the stall or the loom (Me, Household).`);
        if (after === GROWN) notes.push(`${childName(n)} is grown, and can travel with you or keep a shop (Me, Household).`);
      }
      // an apprentice on the road learns the trade faster
      if (n.role === 'apprentice' && !home) n.traits = { ...n.traits, trade: Math.min(100, Math.round((n.traits.trade + 0.2) * 10) / 10) };
      return n;
    });
    h = { ...h, children };
  }
  if (h !== h0) out.household = h;
  return out;
}
