import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Goal, LedgerEntry, Relationship, RugItem, SupplierOffer } from '../types';
import { BUYERS, BUYER_ORDER, BUYER_UNLOCK, BUYER_TIERS, CELEB_IDS, celebUnlock } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { NARRATOR, RASHID } from '../../data/dialogue';
import { EXPENSES, RASHID_PROFILE, RESTORATION, UPGRADES, rashidCredit, rentFor, restoreCost } from '../../data/suppliers';
import { snap, fmt } from '../economy/money';
import { MISSIONS, MAIN_ORDER } from '../../data/missions';
import { HOUSES, type Lot, type Reoffer } from '../auction/sessions';
import { applyAuctionObservation, type MarketIntelRecord } from '../auction/marketIntel';
import { shouldReofferUnsoldLot, reducedReserveForReoffer, totalAuctionCost } from '../auction/auctionSystem';
import { houseOfFortune } from '../economy/progress';
import { laneDay, isFirstOfMonth, monthlyBill, billTotal, monthName, rumourBid, budgetMod, cityClosed, cityBuyMod, dangerAt, eventsStarting } from '../economy/life';
import { rankOf } from '../economy/progress';
import { TITLES, type TitleCtx } from '../../data/titles';
import { progressScore } from '../economy/progress';
import { START_MANNER, SKILLS, levelOf, hasPerk, ATTIRE, HAMMAMS, BOOKS, type SkillId, type Manner } from '../../data/character';
import { PIECES, START_WARDROBE, LEGACY_SETS, heroCharisma, legacyWorn, wardrobeFromLegacy, wornIds, type Outfit, type WardrobeState } from '../../data/wardrobe';
import { dateFor, goalsFor, newUid, rashidStock, startingInventory } from '../economy/economy';
import {
  doAction, petCat, pick, presentRug, startEncounter, tierOf,
  type ActionId, type Ctx, type Effects, type Encounter,
} from '../systems/negotiation';
import { audio, type Channel } from '../audio/engine';
import { NPCS, QUESTS, SETTLEMENTS } from '../../data/world';
import {
  blankFog, revealFog, spawnParties, spawnRoadBands, stepParties, settlementById, seaRoutesFrom, motorRoutesFrom,
  type Party, type Pt,
} from '../systems/world';
import { CONDITION_FACTOR } from '../../data/rugs';
import { perceivedValue } from '../systems/negotiation';
import { TROOPS, MARKETS } from '../../data/caravan';
import { BREEDS, ANIMAL_MARKETS, withArticle } from '../../data/animals';
import { startingParty, dailyFood, wages, strength, scoutBonus, recruitPool, SKILL_MODS, animalCount, type PartyState } from '../systems/caravan';
import { JOBS, openJobs, newVisit, type Visit } from '../../data/jobs';
import { VENUES_1925, venueOpen, QAMAR_SHARE } from '../../data/entertainment';
import { CELEB_INFO } from '../../data/buyers';

export const SAVE_VERSION = 13;
/** The rank a buyer waits for before visiting your stall: Fine households want a Bazaar merchant, collectors a Khan dealer. */
export const rankNeeded = (id: string) => { const t = BUYER_TIERS[id]?.[0] ?? 1; return t >= 3 ? 2 : t === 2 ? 1 : 0; };
export const FAMILY_START = { left: 10000, due: 0, since: 0, paid: 0 };
export const FAMILY_INSTALMENT = 2500;

export type TutorialStep = 'room' | 'rug' | 'inspect' | 'inspect2' | 'argue' | 'price' | 'counter' | 'done';

interface Commission {
  buyerId: string;
  label: string;
  bonus: number;
  done: boolean;
  until?: number;
  expired?: boolean;
}

export interface DaySummary {
  day: number;
  sales: number;
  revenue: number;
  gross: number;
  expenses: number;
  notes: string[];
}

export interface GameState {
  version: number;
  openingSeen: boolean;
  started: boolean;
  day: number;
  cash: number;
  reputation: number;
  inventory: RugItem[];
  relationships: Record<string, Relationship>;
  ledger: LedgerEntry[];
  upgrades: string[];
  supplier: { trust: number; offers: SupplierOffer[]; debt: number; debtDue: number; gone?: string; lastLine: string; haggleLocked: string[] };
  tutorial: { done: boolean; step: TutorialStep; inspected: boolean };
  queue: string[];
  visitIdx: number;
  dayStats: { sales: number; revenue: number; gross: number; expenses: number };
  goals: Goal[];
  commissions: Commission[];
  journal: { day: number; text: string; kind?: string }[];
  whereabouts?: Record<number, string>; // day -> where you were (settlement id or 'road')
  totalSales: number;
  lastSummary?: DaySummary;
  settings: Record<Channel, boolean>;
  guideSeen?: boolean;
  world: WorldState;
  court: { last: Record<string, number>; warrants: string[] };
  /** Every kind of rug that has passed through your hands: the Carpet Register. */
  register: string[];
  /** main missions: active or done */
  missions: Record<string, 'active' | 'done'>;
  /** skills rise by doing; XP per skill */
  skills: Partial<Record<SkillId, number>>;
  /** how the bazaar sees you */
  manner: Manner;
  attire: { owned: string[]; worn: string; clean: number };
  /** the hero's clothes, piece by piece; attire.worn is kept in step as a summary for older code */
  wardrobe: WardrobeState;
  books: string[];
  /** level-ups waiting to be announced */
  levelUps: { skill: SkillId; level: number }[];
  titles: string[];
  stats: { liesOk?: number; liesCaught?: number; auctionsWon?: number; rivalSales?: number };
  /** titles waiting to be announced */
  titleNews: string[];
  merchantSeen?: number;
  tipsSeen: string[];
  /** evenings out: per venue, the last visit, the night a table was paid for, and who was on the bill */
  venues?: Record<string, { lastVisitDay?: number; showDay?: number; onBill?: string }>;
  /** buyers met at a table who promised to call at the stall on a given day */
  appointments?: { buyerId: string; day: number; venue: string }[];
  missionStart?: Record<string, number>;
  lotsSold?: string[];
  /** the hour each of today's customers turns up at the stall */
  arrivals?: number[];
  /** retired: daily errands. Kept so older saves still load; nothing reads them now */
  errands?: unknown[];
  errandsDone?: string[];
  errandNews?: string[];
  /** map jobs finished */
  jobsDone?: string[];
  /** buyers staying in a town for a few days */
  visits?: Visit[];
  /** the stall is shut: nobody comes until you open it again */
  stallShut?: boolean;
  /** a note from a job, shown once */
  jobNote?: string;
  /** days on which you sat in on an auction or walked a city's streets */
  satDay?: number;
  walkedDay?: number;
  /** first-time lessons already given */
  onboard?: { news?: boolean; radio?: boolean; map?: boolean; buyers?: boolean; rashid?: boolean };
  /** buyers whose card you have opened in the Buyers book */
  buyersSeen?: string[];
  /** the last day whose paper you opened */
  paperSeen?: number;
  /** the last day whose radio bulletin you switched on */
  radioHeard?: number;
  /** true once you have opened the gramophone at the stall; a hint shows over it until then */
  gramoSeen?: boolean;
  /** prices you have seen rugs fetch at auction, by rug type */
  intel?: Record<string, MarketIntelRecord>;
  /** unsold lots that will come back cheaper at the same house */
  reoffers?: Reoffer[];
  bills?: { due: number; since: number; warned: number; last?: { label: string; amount: number }[] };
  /** Your father's hundred pounds owed to Rashid: paid in monthly instalments on the first. */
  family?: { left: number; due: number; since: number; paid: number };
  missionNews?: string;
  // transient (not persisted)
  encounter: Encounter | null;
  audienceStash: { encounter: Encounter | null; visitIdx: number } | null;
  /** a sale you stepped away from: the customer waits at the stall until the hour given */
  held?: { encounter: Encounter; until: number } | null;
  dayOver: boolean;
  seed: number;
}

export type QuestState = 'active' | 'ready' | 'done';
export interface WorldState {
  x: number;
  y: number;
  at: string | null;
  fog: string;
  known: string[];
  hour: number;
  parties: Party[];
  quests: Record<string, QuestState>;
  rumours: string[];
  boughtLocal: string[];
  appraised: string[];
  friends: string[];
  party: PartyState;
  hired: Record<string, number>;
  district?: DistrictState;
  /** explored parts of each walkable place (palaces, city streets, sale houses), so a visited street stays open */
  walks?: Record<string, { fog: string; seen: string[] }>;
  /** the last night (keyed by the day it began) on which thieves had their chance at the camp */
  nightRoll?: number;
}

export interface DistrictState { x: number; y: number; fog: string; seen: string[] }

export interface LocalOffer { key: string; typeId: string; condition: RugItem['condition']; price: number; left: number }

interface Actions {
  /** safe: time passes under a roof (a train, a ship, an inn), so no thieves at night */
  travelStep: (pos: Pt, days: number, safe?: boolean) => string[];
  /** The map clock running while you stay put: time passes, parties move, days turn over away from home. */
  worldTick: (days: number) => string[];
  arriveAt: (id: string | null) => void;
  checkJobs: (id: string) => void;
  /** settle a stand-off or a battle on the road */
  ambushOutcome: (partyId: string, o: { cashLoss?: number; cashGain?: number; rugsLost?: number; troopsLost?: Record<string, number>; rep?: number; joiners?: number; delayHours?: number; theyLeave?: boolean; enemyLost?: number; text: string }) => string;
  setStallShut: (shut: boolean) => void;
  setDistrict: (d: DistrictState) => void;
  setWalk: (id: string, fog: string, seen: string[]) => void;
  ferryToCairo: () => string;
  /** the Nile ferry between Giza and Cairo, an hour and a half either way */
  ferry: (to: 'giza' | 'cairo') => string;
  sail: (to: string, mode?: 'sea' | 'motor', from?: string) => string;
  talk: (npcId: string, effects: string[]) => string;
  /** walk into a cabaret or music hall; notes the visit */
  visitVenue: (id: string) => void;
  /** pay for a table on a performance night, once a night; returns a line for the player */
  takeTable: (id: string) => string;
  sellLocal: (uid: string, sid: string) => number;
  buyLocal: (sid: string, key: string) => string;
  partyChoice: (partyId: string, choice: string) => string;
  buyFood: (n: number) => string;
  butcherAnimal: (breed: string) => string;
  trade: (breed: string, delta: number) => string;
  recruit: (troop: string, key: string, n: number) => string;
  dismiss: (troop: string, n: number) => void;
  toggleStored: (uid: string) => void;
  finishOpening: () => void;
  beginDayOne: () => void;
  nextVisit: () => void;
  /** leave the stall mid-sale; the customer waits about an hour */
  stepAway: () => void;
  /** wait at the stall until the next customer turns up */
  waitForCustomer: () => void;
  /** time passing on something other than a sale: reading, walking, bidding */
  passTime: (minutes: number) => void;
  startAudience: (buyerId: string) => string;
  markGuide: () => void;
  endAudience: () => void;
  present: (uid: string) => void;
  act: (id: ActionId, price?: number) => void;
  pet: () => void;
  inspectorOpened: () => void;
  inspectorUsed: () => void;
  inspectorClosed: () => void;
  endDay: () => void;
  clearMissionNews: () => void;
  /** Close a lot: winner 'you', a bidder id, or null when it is bought in. */
  lotResult: (houseId: string, lot: Lot, winner: string | null, price: number, winnerName?: string) => string;
  practise: (skill: SkillId, xp: number) => void;
  popLevelUp: () => void;
  popTitle: () => void;
  markMerchantSeen: () => void;
  seeTip: (id: string) => void;
  buyAttire: (id: string) => string;
  wear: (id: string) => void;
  /** buy pieces of clothing at the current town; returns a line for the player */
  buyPieces: (ids: string[]) => string;
  /** change into an outfit made of pieces you own */
  dressIn: (o: Outfit) => void;
  /** leave the first-sale lesson: everything unlocks, the current customer stays as an ordinary sale */
  skipTutorial: () => void;
  bathe: (sid: string) => string;
  readBook: (id: string) => string;
  buyOffer: (uid: string, credit: boolean) => string;
  haggle: (uid: string) => string;
  payDebt: () => void;
  payFamily: (amount: number) => void;
  restore: (uid: string) => void;
  buyUpgrade: (id: string) => void;
  setSetting: (c: Channel, on: boolean) => void;
  reset: () => void;
}

const rng = () => Math.random();

/** Night on the road: once a night, thieves may creep into an unguarded camp. Guards make it rare and sometimes drive them off. */
function nightThieves(s: GameState, day: number, hour: number): { patch: Partial<GameState>; note: string; night: number } | null {
  if (!(hour >= 20 || hour < 5)) return null;
  const night = hour < 5 ? day - 1 : day;
  if (s.world.nightRoll === night) return null;
  const guards = Object.values(s.world.party.troops ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const tryChance = guards > 0 ? 0.06 : 0.12;
  if (rng() >= tryChance) return { patch: {}, note: '', night };
  const log = (text: string) => [...s.journal, { day, text, kind: 'road' }];
  if (guards > 0 && rng() < 0.7) {
    const text = 'Thieves crept up to the camp in the night. Your guard heard them and drove them off.';
    return { patch: { journal: log(text) }, note: text, night };
  }
  const carried = s.inventory.filter((i) => !i.stored);
  const food = s.world.party.food ?? 0;
  const options: ('cash' | 'rug' | 'food')[] = [];
  if (s.cash >= 20) options.push('cash', 'cash');
  if (carried.length) options.push('rug');
  if (food >= 2) options.push('food');
  if (!options.length) return { patch: {}, note: '', night };
  const what = options[Math.floor(rng() * options.length)];
  if (what === 'cash') {
    const lost = Math.max(10, Math.min(300, Math.round(s.cash * (0.05 + rng() * 0.07))));
    const text = `Thieves came in the night and took ${fmt(lost)} from your purse.`;
    return { patch: { cash: s.cash - lost, journal: log(text), ledger: [...s.ledger, { day, kind: 'expense', label: 'Stolen in the night', amount: -lost }] }, note: text, night };
  }
  if (what === 'rug') {
    const r = carried[Math.floor(rng() * carried.length)];
    const text = `Thieves came in the night and made off with the ${RUGS[r.typeId].name}.`;
    return { patch: { inventory: s.inventory.filter((i) => i.uid !== r.uid), journal: log(text) }, note: text, night };
  }
  const lost = Math.min(food, 2 + Math.floor(rng() * 3));
  const text = `Thieves came in the night and took ${lost} rations of food.`;
  return { patch: { journal: log(text), world: { ...s.world, party: { ...s.world.party, food: food - lost } } }, note: text, night };
}

/** When customer number i turns up today. */
export const arrivalAt = (s: { arrivals?: number[]; day: number }, i: number) => s.arrivals?.[i] ?? ([8, 10.5, 15.5, 17.5, 19][i] ?? 19.5);
export const clock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const emptyRel = (): Relationship => ({ visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] });

function initialWorld(): WorldState {
  const g = settlementById('giza');
  let fog = blankFog();
  fog = revealFog(fog, g, 9);
  fog = revealFog(fog, settlementById('cairo'), 6);
  return { x: g.x, y: g.y, at: 'giza', fog, known: ['giza', 'cairo', 'alexandria', 'portsaid', 'jaffa', 'jerusalem', 'beirut', 'damascus', 'aleppo', 'istanbul', 'baghdad', 'konya', 'amman', 'ankara'], hour: 8, parties: spawnParties(rng), quests: {}, rumours: [], boughtLocal: [], appraised: [], friends: [], party: startingParty(), hired: {} };
}

/** What a settlement's own market has today, before stock is filtered out. Used both to show what is
 *  still buyable and — with stock ignored — to cap what the same dealer will pay back the same day. */
export function localOffersRaw(sid: string, day: number, bought: string[], friends: string[], rep = 0): LocalOffer[] {
  const st = settlementById(sid);
  if (cityClosed(day, sid)) return [];
  return st.sells
    .filter((o, i) => {
      if ((o.minRep ?? 0) > rep) return false;
      if (o.chance === undefined) return true;
      // A treasure is shown to you only on some days, and the same day always gives the same answer.
      return Math.abs(Math.sin((day * 17 + i * 101 + sid.length * 7) * 78.233)) % 1 < o.chance;
    })
    .map((o, i) => {
      const h = Math.abs(Math.sin((day * 31 + i * 7 + sid.length * 13) * 12.9898)) % 1;
      const condition: RugItem['condition'] = h < 0.2 ? 'Dirty' : h < 0.32 ? 'Worn' : 'Good';
      const t = RUGS[o.typeId];
      const disc = friends.includes(sid) ? 0.85 : 1;
      const price = snap(t.dealerCost * o.factor * CONDITION_FACTOR[condition] * disc * cityBuyMod(day, sid));
      const key = `${day}:${sid}:${o.typeId}`;
      // village rugs come in stacks; the finer the rug, the fewer the copies
      const qty = (t.tier ?? 1) === 1 ? 3 : (t.tier ?? 1) === 2 ? 2 : 1;
      return { key, typeId: o.typeId, condition, price, left: qty - bought.filter((b) => b === key).length };
    });
}

/** What a settlement's own market has left to buy today. Deterministic per day, so it cannot be rerolled. */
export function localOffers(sid: string, day: number, bought: string[], friends: string[], rep = 0): LocalOffer[] {
  return localOffersRaw(sid, day, bought, friends, rep).filter((o) => o.left > 0);
}

/** What this settlement would charge TODAY for a rug of this type in a given condition, whether or
 *  not that happens to be the one condition today's single random roll put on the shelf. The buy-back
 *  cap needs this rather than localOffersRaw's one rolled condition: a rug bought here on an earlier
 *  visit (or even earlier the same day, before the stock ran out) keeps its own condition forever, so
 *  matching only today's exact rolled condition let a dealer's own specialty rug be sold back for a
 *  windfall the moment the day's roll happened not to match what you were holding. */
export function localAskPrice(sid: string, day: number, typeId: string, condition: RugItem['condition'], friends: string[], rep = 0): number | undefined {
  const st = settlementById(sid);
  const i = st.sells.findIndex((o) => o.typeId === typeId);
  if (i < 0) return undefined;
  const o = st.sells[i];
  const t = RUGS[typeId];
  const disc = friends.includes(sid) ? 0.85 : 1;
  // Deliberately ignores cityClosed, chance and minRep: those gate what is freshly buyable today,
  // not what this dealer would recognise as the going rate for a type they trade in. The buy-back
  // cap in sellLocal() needs a price that always holds, or a shut market day / an unlucky chance
  // roll / a reputation dip would knock the cap out (askToday undefined) and let the uncapped,
  // much higher localBid() through — reopening the exact buy-low-sell-high loop this cap exists
  // to close, town by town, every time one of those day-to-day gates happens not to line up.
  return snap(t.dealerCost * o.factor * CONDITION_FACTOR[condition] * disc * cityBuyMod(day, sid));
}

/** What the local dealer pays for one of your rugs here. */
/** Price of a breed in a market today, or undefined if it is not sold there. */
export function animalPrice(sid: string | null, breed: string): number | undefined {
  if (!sid) return undefined;
  const e = ANIMAL_MARKETS[sid]?.find(([id]) => id === breed);
  return e ? snap(BREEDS[breed].price * e[1]) : undefined;
}

/** What the restorer charges for this rug: a share of what it is worth. */
export function restorePrice(item: RugItem) {
  const [lo, hi] = RUGS[item.typeId].valueBand;
  return restoreCost((lo + hi) / 2, item.condition);
}

export function localBid(sid: string, item: RugItem, day = 1): number {
  const st = settlementById(sid);
  const t = RUGS[item.typeId];
  let m = rumourBid(day, sid, item.typeId, t.traits);
  for (const tr of t.traits) m += st.demand[tr] ?? 0;
  if (item.provenance === 'Documented' && (st.demand.story ?? 0) > 0) m += 0.1;
  return snap(perceivedValue(t, item) * 0.62 * m);
}

function initial(): Omit<GameState, keyof Actions> {
  return {
    version: SAVE_VERSION,
    openingSeen: false,
    started: false,
    day: 1,
    cash: 120,
    reputation: 0,
    inventory: startingInventory(),
    relationships: Object.fromEntries(BUYER_ORDER.map((b) => [b, emptyRel()])),
    ledger: [],
    upgrades: [],
    supplier: { trust: 20, offers: rashidStock(1, rng), debt: 0, debtDue: 0, lastLine: RASHID.greeting[0], haggleLocked: [] },
    family: { ...FAMILY_START },
    tutorial: { done: false, step: 'room', inspected: false },
    queue: ['samira', 'yusuf', 'mariam'],
    visitIdx: 0,
    dayStats: { sales: 0, revenue: 0, gross: 0, expenses: 0 },
    goals: goalsFor(1, { debt: 0 }),
    commissions: [],
    journal: [{ day: 1, text: 'Opened the borrowed corner in Giza with three rugs, 120 piastres and Saffron.' }],
    totalSales: 0,
    settings: { dialogue: true, music: true, sfx: true, ambience: true },
    world: initialWorld(),
    court: { last: {}, warrants: [] },
    register: ['desert-star', 'cairo-garden', 'fayoum-hearth'],
    missions: {},
    skills: {},
    manner: { ...START_MANNER },
    attire: { owned: ['galabiya'], worn: 'galabiya', clean: 100 },
    wardrobe: { owned: [...START_WARDROBE.owned], outfit: { ...START_WARDROBE.outfit, extras: [] } },
    books: [],
    levelUps: [],
    titles: [],
    stats: {},
    titleNews: [],
    tipsSeen: [],
    encounter: null,
    audienceStash: null,
    dayOver: false,
    seed: 1,
  };
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable */
    }
  },
};

export function stallName(up: string[]) {
  return up.includes('khan') ? 'shop in Khan el-Khalili' : up.includes('bazaar') ? 'bazaar stall' : up.includes('mat') ? 'rug mat' : 'borrowed corner';
}

export function availableRugs(s: Pick<GameState, 'inventory'>) {
  return s.inventory.filter((i) => !i.restoringUntil);
}

function cloneEnc(e: Encounter): Encounter {
  return { ...e, log: [...e.log], asked: [...e.asked], revealed: [...e.revealed], argsUsed: [...e.argsUsed], rugsShown: [...e.rugsShown] };
}

const TUTORIAL_ALLOWED: Partial<Record<TutorialStep, string[]>> = {
  room: ['ask_room'],
  rug: [],
  inspect: [],
  inspect2: [],
  argue: ['story', 'craft', 'fit', 'durability'],
  price: ['name_price'],
  counter: ['accept_offer', 'halfway', 'hold', 'name_price'],
};

export function tutorialAllows(s: GameState, id: string) {
  if (s.tutorial.done || !s.encounter?.tutorial) return true;
  return (TUTORIAL_ALLOWED[s.tutorial.step] ?? []).includes(id);
}

export const useGame = create<GameState & Actions>()(
  persist(
    (set, get) => {
      const ctxFor = (s: GameState, buyerId: string): Ctx => ({
        inventory: s.inventory,
        upgrades: s.upgrades,
        reputation: s.reputation,
        rel: s.relationships[buyerId] ?? emptyRel(),
        rng,
        skills: s.skills,
        manner: s.manner,
        charisma: heroCharisma((s.wardrobe ?? START_WARDROBE).outfit, s.attire?.clean ?? 100),
        eventBudget: s.world.at === 'giza' ? budgetMod(s.day) : 1,
        clean: s.attire?.clean ?? 100,
        attire: s.attire?.worn ?? 'galabiya',
      });

      /** Skill XP and manner from an action, with level-ups queued for the player to see. */
      const growth = (s: GameState, xp?: Partial<Record<SkillId, number>>, manner?: Partial<Manner>): Partial<GameState> => {
        const out: Partial<GameState> = {};
        if (xp) {
          const skills = { ...(s.skills ?? {}) };
          const ups = [...(s.levelUps ?? [])];
          for (const [k, v] of Object.entries(xp) as [SkillId, number][]) {
            const before = levelOf(skills[k] ?? 0);
            skills[k] = (skills[k] ?? 0) + v;
            const after = levelOf(skills[k]!);
            if (after > before) ups.push({ skill: k, level: after });
          }
          out.skills = skills;
          out.levelUps = ups;
        }
        if (manner) {
          const m = { ...(s.manner ?? START_MANNER) };
          for (const [k, v] of Object.entries(manner) as [keyof Manner, number][]) m[k] = Math.max(-100, Math.min(100, m[k] + v));
          out.manner = m;
        }
        return out;
      };

      const playFx = (fx: Effects) => fx.sfx?.forEach((n, i) => setTimeout(() => audio.sfx(n), i * 120));

      /** Apply a finished encounter to the persistent game state. */
      const settle = (s: GameState, enc: Encounter): Partial<GameState> => {
        const b = BUYERS[enc.buyerId];
        const rel = { ...(s.relationships[enc.buyerId] ?? emptyRel()) };
        rel.visits += 1;
        const patch: Partial<GameState> = {};
        const ledger = [...s.ledger];
        const journal = [...s.journal];
        let rep = s.reputation;
        let cash = s.cash;
        const stats = { ...s.dayStats };
        let commissions = s.commissions;
        if (enc.outcome === 'sold' && enc.presented && enc.salePrice) {
          const item = s.inventory.find((i) => i.uid === enc.presented)!;
          const t = RUGS[item.typeId];
          cash += enc.salePrice;
          enc.saleCost = item.paid;
          ledger.push({ day: s.day, kind: 'sale', label: `${t.name} to ${b.name}`, amount: enc.salePrice, cost: item.paid });
          stats.sales += 1;
          stats.revenue += enc.salePrice;
          stats.gross += enc.salePrice - item.paid;
          rel.purchases += 1;
          rel.spent += enc.salePrice;
          rel.lastRug = item.typeId;
          const good = enc.presentedFit >= 65;
          rel.affinity = Math.min(100, rel.affinity + (good ? 15 : enc.presentedFit < 40 ? -5 : 6) + (enc.honestCount ? 5 : 0));
          rep += 1 + (enc.presentedFit >= 80 ? 1 : 0) - (enc.presentedFit < 40 ? 1 : 0) + ((t.tier ?? 1) === 4 ? 3 : (t.tier ?? 1) === 3 ? 1 : 0);
          rel.lastPurchaseDay = s.day;
          if (enc.embellished && !enc.embellishCaught) rel.embellishedSale = true;
          journal.push({ day: s.day, text: `Sold ${t.name} to ${b.name} for ${fmt(enc.salePrice)} (paid ${fmt(item.paid)}).` });
          const comm = s.commissions.find((c) => c.buyerId === enc.buyerId && !c.done);
          if (comm && b.commission?.wants(t, item)) {
            cash += comm.bonus;
            rep += 2;
            ledger.push({ day: s.day, kind: 'bonus', label: `Commission: ${comm.label}`, amount: comm.bonus });
            commissions = s.commissions.map((c) => (c === comm ? { ...c, done: true } : c));
            rel.commissionDone = true;
            journal.push({ day: s.day, text: `Completed commission for ${b.name}: +${fmt(comm.bonus)}.` });
            enc.log.push({ speaker: 'buyer', text: pick(b.lines.commissionDone, rng) || 'Thank you.', mood: 'pleased' });
          }
          patch.inventory = s.inventory.filter((i) => i.uid !== item.uid);
          patch.totalSales = s.totalSales + 1;
          if (s.missions?.rival === 'active' && !enc.venue) patch.stats = { ...(s.stats ?? {}), rivalSales: (s.stats?.rivalSales ?? 0) + 1 };
        } else {
          rel.affinity = Math.max(-100, rel.affinity - (enc.insulted ? 12 : 4));
          if (enc.insulted || enc.embellishCaught) rel.bad += 1;
          journal.push({ day: s.day, text: `${b.name} left without buying.` });
        }
        if (enc.embellishCaught) rep -= 1;
        if (s.relationships[enc.buyerId]?.embellishedSale && !s.relationships[enc.buyerId]?.embellishMentioned && rel.visits > 1) {
          rel.embellishMentioned = true;
          rep -= 2;
          rel.affinity -= 20;
        }
        rel.lastLines = enc.log.filter((l) => l.speaker === 'buyer').map((l) => l.text).slice(-6);
        const goals = s.goals;
        if (b.royal) {
          const court = { last: { ...s.court.last, [enc.buyerId]: s.day }, warrants: s.court.warrants };
          if (enc.outcome === 'sold') {
            rep += 4;
            if (!court.warrants.includes(enc.buyerId)) {
              court.warrants = [...court.warrants, enc.buyerId];
              rep += 3;
              journal.push({ day: s.day, text: `${b.royal.warrant}. Word of it will reach every buyer in the lane.`, kind: 'royal' });
            }
          }
          patch.court = court;
        }
        return {
          ...patch,
          cash,
          reputation: Math.max(0, rep),
          ledger,
          journal,
          dayStats: stats,
          commissions,
          goals,
          relationships: { ...s.relationships, [enc.buyerId]: rel },
        };
      };

      /** Close one day: upkeep, restoration, Rashid's new stock, tomorrow's visitors. */
      const rollover = (s: GameState): { patch: Partial<GameState>; summary: DaySummary } => {
          const notes: string[] = [];
          const ledger = [...s.ledger];
          const journal = [...s.journal];
          // Rent and household are paid monthly, on the first (see below).
          const rent = 0;
          let cash = s.cash;
          // Caravan upkeep: rations, then wages. In a town you can buy bread if the sacks are empty.
          const party: PartyState = { ...s.world.party, troops: { ...s.world.party.troops } };
          const need = dailyFood(party);
          let foodCost = 0;
          if (party.food < need && s.world.at) {
            const price = MARKETS[s.world.at]?.food ?? 2;
            foodCost = Math.ceil((need - party.food) * price);
            party.food = need;
            ledger.push({ day: s.day, kind: 'expense', label: `Bread and dates in ${settlementById(s.world.at).name}`, amount: -foodCost });
            cash -= foodCost;
          }
          let repBill = 0;
          if (party.food >= need) { party.food -= need; party.hungryDays = 0; }
          else {
            party.food = 0;
            party.hungryDays = (party.hungryDays ?? 0) + 1;
            const hd = party.hungryDays;
            const ids = Object.keys(party.troops).filter((k) => party.troops[k] > 0);
            if (ids.length) {
              const id = ids[Math.floor(rng() * ids.length)];
              party.troops[id] -= 1;
              notes.push(`No food. A ${TROOPS[id].name.toLowerCase()} walked off in the night.`);
            }
            // after a couple of lean days, a starving animal can collapse; the risk climbs the longer it goes on
            const animalIds = Object.keys(party.animals).filter((k) => party.animals[k] > 0);
            if (hd >= 2 && animalIds.length && rng() < Math.min(0.6, (hd - 1) * 0.15)) {
              const id = animalIds[Math.floor(rng() * animalIds.length)];
              party.animals = { ...party.animals, [id]: party.animals[id] - 1 };
              notes.push(`No food for days. Your ${BREEDS[id].name} could not go on and had to be left behind.`);
              repBill -= 1;
            }
            if (hd === 1) notes.push('No food left. You are hungry and the caravan is slower.');
            else { notes.push(`${hd} days with no food. The caravan is exhausted and moving badly.`); repBill -= 1; }
          }
          const pay = wages(party);
          if (pay > 0) {
            if (cash >= pay) {
              cash -= pay;
              ledger.push({ day: s.day, kind: 'expense', label: 'Wages for your men', amount: -pay });
            } else {
              const ids = Object.keys(party.troops).filter((k) => party.troops[k] > 0);
              const id = ids[Math.floor(rng() * ids.length)];
              const leave = Math.min(party.troops[id], 2);
              party.troops[id] -= leave;
              notes.push(`You could not pay wages. ${leave} ${TROOPS[id].plural.toLowerCase()} left.`);
            }
          }
          const summary: DaySummary = { day: s.day, ...s.dayStats, expenses: s.dayStats.expenses + rent + foodCost + (cash >= 0 ? pay : 0), notes };
          const day = s.day + 1;
          // The first of the month: rent, dues, household. Unpaid bills grow and cost you your pitch.
          let bills = { ...(s.bills ?? { due: 0, since: 0, warned: 0 }) };
          let upgrades = s.upgrades;
          if (isFirstOfMonth(day)) {
            const lines = monthlyBill(s.upgrades, rankOf(s).idx, s.inventory.filter((i) => i.stored).length);
            const total = billTotal(lines);
            bills = { due: bills.due + total, since: bills.due > 0 ? bills.since : day, warned: bills.due > 0 ? bills.warned : 0, last: lines };
            notes.push(`The first of ${monthName(day)}. The month's bill is ${fmt(total)}.`);
            journal.push({ day, text: `Monthly bill for ${monthName(day)}: ${lines.map((l) => `${l.label} ${fmt(l.amount)}`).join(', ')}.`, kind: 'due' });
          }
          if (bills.due > 0) {
            if (cash >= bills.due) {
              cash -= bills.due;
              ledger.push({ day, kind: 'expense', label: 'Monthly bill: rent, dues and household', amount: -bills.due });
              if (day !== bills.since) notes.push(`You paid the overdue bill of ${fmt(bills.due)}.`);
              bills = { due: 0, since: 0, warned: 0, last: bills.last };
            } else {
              const late = day - bills.since;
              if (late >= 5 && bills.warned < 1) {
                bills = { ...bills, due: Math.round(bills.due * 1.1), warned: 1 };
                repBill -= 3;
                notes.push(`The landlord has added ten per cent to your unpaid bill (${fmt(bills.due)}) and told the whole lane.`);
              } else if (late >= 15 && bills.warned < 2) {
                const top = ['khan', 'bazaar', 'mat'].find((u) => s.upgrades.includes(u));
                if (top) upgrades = s.upgrades.filter((u) => u !== top);
                bills = { ...bills, warned: 2 };
                repBill -= 3;
                notes.push(top ? `You have lost your ${top === 'mat' ? 'rug mat' : top === 'bazaar' ? 'bazaar stall' : 'shop'}. The landlord let it to someone who pays.` : 'The landlord threatens to give your corner to Selim Kassab.');
              } else if (late > 0) notes.push(`You owe ${fmt(bills.due)} for the month. Pay it before the landlord loses patience.`);
            }
          }
          // Father's debt to Rashid: an instalment falls due on the first of every month
          let family = { ...(s.family ?? FAMILY_START) };
          let familyLate = false;
          if (isFirstOfMonth(day) && family.left > 0) {
            const inst = Math.min(FAMILY_INSTALMENT, family.left - family.due);
            if (inst > 0) {
              family = { ...family, due: family.due + inst, since: family.due > 0 ? family.since : day };
              notes.push(`Uncle Rashid expects ${fmt(inst)} today towards your father's debt (${fmt(family.left)} still owed).`);
            }
          }
          if (family.due > 0) {
            if (cash >= family.due) {
              cash -= family.due;
              ledger.push({ day, kind: 'debt', label: "Instalment on father's debt to Rashid", amount: -family.due });
              family = { ...family, left: family.left - family.due, due: 0, since: 0, paid: family.paid + family.due };
              if (family.left <= 0) notes.push("Your father's debt to Uncle Rashid is paid in full.");
            } else if (day - family.since === 4) {
              familyLate = true;
              notes.push(`Rashid is still waiting for ${fmt(family.due)} of your father's debt. His trust in you drops.`);
            }
          }
          // Commissions have deadlines
          const commissionsLeft = s.commissions.map((c) => (!c.done && c.until && day > c.until ? { ...c, done: true, expired: true } : c));
          commissionsLeft.forEach((c, i) => { if (c.expired && !s.commissions[i].expired) notes.push(`${BUYERS[c.buyerId]?.name ?? 'A buyer'} found another dealer for "${c.label}".`); });
          for (const e of eventsStarting(day)) notes.push(`${e.name}. ${e.text}`);
          // Restoration
          const inventory = s.inventory.map((i) => {
            if (i.restoringUntil && day >= i.restoringUntil) {
              const t = RUGS[i.typeId];
              const n = { ...i, condition: i.restoreTo ?? 'Good', restored: i.restored || i.condition !== 'Dirty', restoringUntil: undefined, restoreTo: undefined, notes: [...i.notes] } as RugItem;
              notes.push(`${t.name} is back from restoration.`);
              if (i.provenance === 'Uncertain' && rng() < 0.4) {
                n.provenance = 'Likely';
                n.notes.push('Cleaning revealed a Damascus workshop knot pattern along the edge. Provenance now Likely.');
                notes.push(`Cleaning the ${t.name} revealed a workshop mark. Provenance is now Likely.`);
              } else if (i.condition === 'Damaged' && rng() < 0.3) {
                n.notes.push('The reweave is visible on the back. An expert will notice.');
                notes.push(`The ${t.name} reweave is visible on the back. Experts will notice.`);
              }
              return n;
            }
            return i;
          });
          // Supplier rotation
          const sup = { ...s.supplier, haggleLocked: [] as string[] };
          const leaving = s.supplier.offers.find((o) => o.leavesAfterDay && o.leavesAfterDay < day);
          sup.gone = leaving?.typeId;
          sup.offers = rashidStock(day, rng, s.reputation, s.missions?.alexandria !== 'done');
          sup.lastLine = leaving ? RASHID.gone[0].replace('{rug}', RUGS[leaving.typeId].name) : pick(RASHID.greeting, rng);
          let reputation = s.reputation;
          if (familyLate) {
            sup.trust = Math.max(0, sup.trust - 10);
            sup.lastLine = RASHID.familyLate[0].replace('{amount}', fmt(family.due));
          }
          if (sup.debt > 0 && day > sup.debtDue) {
            sup.trust = Math.max(0, sup.trust - 20);
            sup.debtDue = day + 2;
            reputation = Math.max(0, reputation - 2);
            notes.push('You missed a payment to Uncle Rashid. He has told half the Wikala.');
            sup.lastLine = RASHID.debtDue[0].replace('{amount}', String(sup.debt));
          }
          if (s.upgrades.includes('qamar') && day % 7 === 0) {
            cash += QAMAR_SHARE.dividend;
            ledger.push({ day, kind: 'bonus', label: 'Your share of the Qamar\'s door', amount: QAMAR_SHARE.dividend });
            notes.push(`Nadia sends ${fmt(QAMAR_SHARE.dividend)}: your share of the Qamar's week.`);
          }
          if (cash < 0) notes.push('You ended the day owing the landlord. Sell something tomorrow.');
          journal.push({ day: s.day, text: `Closed the stall. ${s.dayStats.sales} sale(s), gross profit ${fmt(s.dayStats.gross)}.`, kind: 'stall' });
          // Not everyone comes every day. Someone who bought yesterday is usually busy with it.
          // better households only come to a merchant of standing: rank opens the door, reputation brings them in
          const rankIdx = rankOf(s).idx;
          let queue = [...BUYER_ORDER].filter((id) => (BUYER_UNLOCK[id] ?? 0) <= s.reputation && rankIdx >= rankNeeded(id)).filter((id) => {
            const r = s.relationships[id];
            if (r?.lastPurchaseDay === s.day) return rng() < 0.3;
            return rng() < Math.min(0.97, 0.85 + Math.max(0, s.manner?.kindness ?? 0) / 500);
          });
          if (!queue.length) queue = [BUYER_ORDER[Math.floor(rng() * BUYER_ORDER.length)]];
          if (s.missions?.rival === 'active' && queue.length > 1 && rng() < 0.35 + Math.max(0, -(s.manner?.kindness ?? 0)) / 200) {
            const lost = queue.splice(Math.floor(rng() * queue.length), 1)[0];
            notes.push(`${BUYERS[lost].name} stopped at Selim Kassab's stall instead of yours.`);
          }
          // now and then a rich buyer you have not yet earned drops by to look, usually to sneer
          const grand = BUYER_ORDER.filter((id) => (BUYER_UNLOCK[id] ?? 0) > s.reputation && (BUYER_UNLOCK[id] ?? 0) >= 15 && !queue.includes(id));
          if (grand.length && rng() < 0.18) queue.push(grand[Math.floor(rng() * grand.length)]);
          queue.sort(() => rng() - 0.5);
          // someone met at a table last night comes first, as promised
          const due = (s.appointments ?? []).filter((a) => a.day <= day);
          for (const a of due) { queue = [a.buyerId, ...queue.filter((id) => id !== a.buyerId)]; notes.push(`${BUYERS[a.buyerId]?.name ?? 'Your acquaintance'} from ${VENUES_1925[a.venue]?.name ?? 'last night'} is coming to the stall today.`); }
          const appointments = (s.appointments ?? []).filter((a) => a.day > day);
          // a small corner draws three or four buyers a day; a bigger stall draws more
          // Fridays are quiet, Thursdays and feast days busy
          const lane = laneDay(day);
          queue = queue.slice(0, Math.max(1, 3 + (s.upgrades.includes('bazaar') ? 1 : 0) + (s.upgrades.includes('khan') ? 1 : 0) + (rng() < 0.3 ? 1 : 0) + lane.extra));
          if (lane.note) notes.push(lane.note);
          // now and then a famous name of 1925 drops by the stall
          const vips = rankIdx >= 2 ? CELEB_IDS.filter((id) => celebUnlock(id) <= s.reputation + 6 && !queue.includes(id)) : [];
          if (vips.length && rng() < 0.22) {
            const vip = vips[Math.floor(rng() * vips.length)];
            queue.splice(1 + Math.floor(rng() * queue.length), 0, vip);
            notes.push(`Word in the lane: ${BUYERS[vip].name} may pass by your stall today.`);
          }
          const comeNote = queue.length === 1 ? 'Only one of your buyers is likely to come by today.' : `${queue.length} buyers are likely to come by today.`;
          notes.push(comeNote);
          const activeComm = s.commissions.find((c) => !c.done);
          const missions = { ...(s.missions ?? {}) };
          let missionNews = s.missionNews;
          const missionStart = { ...(s.missionStart ?? {}) };
          let stats = s.stats ?? {};
          const nextId = MAIN_ORDER.find((id) => missions[id] !== 'done');
          if (s.tutorial.done && nextId && !missions[nextId] && !MAIN_ORDER.some((id) => missions[id] === 'active')) {
            missions[nextId] = 'active';
            missionNews = nextId;
            missionStart[nextId] = day;
            if (nextId === 'rival') stats = { ...stats, rivalSales: 0 };
            notes.push(`New main mission: ${MISSIONS[nextId].title}.`);
            journal.push({ day, text: `New main mission: ${MISSIONS[nextId].title}.`, kind: 'mission' });
          }
          // visitors: who is in which town this week
          let visits = (s.visits ?? []).filter((v) => v.until >= day);
          if (visits.length < 2 && (visits.length === 0 || day % 2 === 0)) {
            const tierOf = { FINE: 2, EXCEPTIONAL: 3, LEGENDARY: 4 } as const;
            const celebs = CELEB_IDS.filter((id) => celebUnlock(id) <= s.reputation + 6 && !visits.some((v) => v.buyerId === id)).map((id) => ({ id, name: BUYERS[id].name, city: CELEB_INFO[id as keyof typeof CELEB_INFO].city, tier: tierOf[CELEB_INFO[id as keyof typeof CELEB_INFO].prestige], portrait: `art/portraits/${id}.jpg` }));
            const v = newVisit(day, rankIdx, rng, celebs);
            visits = [...visits, v];
            notes.push(`${v.who} is in ${settlementById(v.city).name} until ${dateFor(v.until).short}.`);
          }
          const patch: Partial<GameState> = {
            visits,
            missions,
            missionNews,
            missionStart,
            stats,
            bills,
            family,
            upgrades,
            commissions: commissionsLeft,
            day,
            cash,
            ledger,
            journal,
            inventory,
            supplier: sup,
            reputation: Math.max(0, reputation + repBill),
            queue,
            appointments,
            visitIdx: 0,
            dayStats: { sales: 0, revenue: 0, gross: 0, expenses: 0 },
            goals: goalsFor(day, { commission: activeComm?.label, debt: sup.debt, visitors: queue.length }),
            dayOver: false,
            encounter: null,
            world: { ...s.world, party },
            arrivals: arrivalTimes(queue.length, rng, lane.late),
            errandsDone: [],
          };
          patch.errands = []; // errands are retired; the field stays for old saves
          return { patch, summary };
        };


      /** Customers spread through the day, the first soon after the stall opens. */
      function arrivalTimes(n: number, rnd: () => number, late = false) {
        const out: number[] = [];
        if (late) {
          // Friday: nobody shops before the noon prayer
          let h = 13.5 + rnd() * 0.5;
          for (let i = 0; i < n; i++) { out.push(Math.min(19.5, Math.round(h * 4) / 4)); h += 1.4 + rnd() * 0.8; }
          return out;
        }
        // the lane is busy in the morning and the evening; in the midday heat nobody shops
        const am = Math.ceil(n / 2);
        let h = 8.4 + rnd() * 0.6;
        for (let i = 0; i < am; i++) { out.push(Math.min(11.5, Math.round(h * 4) / 4)); h += 1.2 + rnd() * 0.8; }
        h = 15.5 + rnd() * 0.6;
        for (let i = am; i < n; i++) { out.push(Math.min(19.5, Math.round(h * 4) / 4)); h += 1.3 + rnd() * 0.9; }
        return out;
      }
      /** Anyone whose hour has long passed while you were away gives up and goes elsewhere. */
      const missedPatch = (st: GameState): Partial<GameState> => {
        if (st.held) return {};
        const shut = !!st.stallShut;
        let idx = st.visitIdx;
        const notes: { day: number; text: string }[] = [];
        while (idx < st.queue.length && st.world.hour > arrivalAt(st, idx) + 1) {
          const b = BUYERS[st.queue[idx]];
          void b; void shut; // customers only come while you keep the stall; nobody is 'missed'
          idx++;
        }
        return idx === st.visitIdx ? {} : { visitIdx: idx, journal: [...st.journal, ...notes] };
      };

      return {
        ...initial(),

        travelStep: (pos, days, safe) => {
          let s: GameState = get();
          const notes: string[] = [];
          // rollover notes (hunger, a starving animal left behind, a man walking off in the night) are
          // shown as an on-map toast that the next tick overwrites, so a multi-day trip could lose the
          // reason its food ran out; keep a permanent record in the journal too.
          const roadJournal: { day: number; text: string; kind?: string }[] = [];
          const startDay = s.day, leaving = s.world.at;
          let hour = s.world.hour + days * 24;
          let patch: Partial<GameState> = {};
          while (hour >= 24) {
            hour -= 24;
            const r = rollover({ ...s, ...patch } as GameState);
            patch = { ...patch, ...r.patch, lastSummary: r.summary };
            const roadNotes = r.summary.notes.filter((n) => !/buyers are likely|Only one of your/.test(n));
            notes.push(`Day ${r.summary.day + 1} on the road.`, ...roadNotes);
            roadNotes.forEach((text) => roadJournal.push({ day: r.summary.day, text, kind: 'road' }));
          }
          s = { ...s, ...patch } as GameState;
          const thief = safe ? null : nightThieves(s, s.day, hour);
          if (thief) {
            const tp = thief.patch;
            s = { ...s, ...tp, world: { ...(tp.world ?? s.world), nightRoll: thief.night } } as GameState;
            patch = { ...patch, ...tp, world: s.world };
            if (thief.note) notes.push(thief.note);
          }
          const fog = revealFog(s.world.fog, pos, 7 + scoutBonus(s.world.party));
          const known = [...s.world.known];
          for (const st of SETTLEMENTS) {
            if (!known.includes(st.id) && Math.hypot(st.x - pos.x, st.y - pos.y) < 38) {
              known.push(st.id);
              notes.push(`You found ${st.name}.`);
            }
          }
          const parties = stepParties(s.world.parties, days, rng, pos, strength(s.world.party), s.day);
          const where = { ...(s.whereabouts ?? {}) };
          if (leaving && !where[startDay]) where[startDay] = leaving;
          for (let d = startDay + (leaving ? 1 : 0); d <= s.day; d++) if (!where[d] || d > startDay) where[d] = 'road';
          const journal = [...s.journal, ...(leaving ? [{ day: startDay, text: `Left ${settlementById(leaving).name} for the road.`, kind: 'depart' }] : []), ...roadJournal];
          const mounted = Object.values(s.world.party.animals ?? {}).some((n) => (n ?? 0) > 0);
          const g1 = growth(s, { survival: Math.max(1, Math.round(days * 4)), ...(mounted ? { riding: Math.max(1, Math.round(days * 4)) } : {}) });
          // rounded to a whole point: this is called every ~140ms while travelling, and leaving it as
          // a raw float lets tiny fractions of a day pile up into something like 68.5780000000002 by
          // the time it reaches the screen
          const attire = { ...(s.attire ?? { owned: ['galabiya'], worn: 'galabiya', clean: 100 }), clean: Math.max(0, Math.round((s.attire?.clean ?? 100) - days * 12)) };
          set({ ...patch, ...g1, attire, journal, whereabouts: where, encounter: null, dayOver: false, world: { ...s.world, x: pos.x, y: pos.y, at: null, hour, fog, known, parties } });
          return notes;
        },

        worldTick: (days) => {
          let s: GameState = get();
          if (days <= 0) return [];
          const notes: string[] = [];
          // at home the stall day ends at eight in the evening; the evening close takes it from there
          if (s.world.at === 'giza') {
            const hour = Math.min(20, s.world.hour + days * 24);
            const st = { ...s, world: { ...s.world, hour, parties: stepParties(s.world.parties, days, rng) } } as GameState;
            set({ world: st.world, ...(s.encounter ? {} : missedPatch(st)) });
            return notes;
          }
          let hour = s.world.hour + days * 24;
          let patch: Partial<GameState> = {};
          while (hour >= 24) {
            hour -= 24;
            const r = rollover({ ...s, ...patch } as GameState);
            patch = { ...patch, ...r.patch, lastSummary: r.summary };
            notes.push(...r.summary.notes.filter((n) => !/buyers are likely|Only one of your/.test(n)));
          }
          s = { ...s, ...patch } as GameState;
          const pos = { x: s.world.x, y: s.world.y };
          const parties = stepParties(s.world.parties, days, rng, s.world.at ? undefined : pos, strength(s.world.party), s.day);
          const where = { ...(s.whereabouts ?? {}) };
          where[s.day] = s.world.at ?? 'road';
          set({ ...patch, whereabouts: where, encounter: null, dayOver: false, world: { ...get().world, ...patch.world, at: s.world.at, x: pos.x, y: pos.y, hour, parties } });
          return notes;
        },

        setDistrict: (d) => set({ world: { ...get().world, district: d } }),
        setWalk: (id, fog, seen) => set({ walkedDay: id.startsWith('city-') ? get().day : get().walkedDay, world: { ...get().world, walks: { ...(get().world.walks ?? {}), [id]: { fog, seen } } } }),

        ferry: (to) => {
          if (to === 'cairo') return get().ferryToCairo();
          const s = get();
          if (s.cash < 1) return 'The ferryman wants a piastre.';
          const st = settlementById('giza');
          set({ whereabouts: { ...(s.whereabouts ?? {}), [s.day]: 'giza' }, journal: [...s.journal, { day: s.day, text: 'Took the Nile ferry back to Giza.', kind: 'arrive' }], cash: s.cash - 1, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: 'Nile ferry to Giza', amount: -1 }], world: { ...s.world, at: 'giza', x: st.x, y: st.y, hour: Math.min(s.world.hour + 1.5, 23.5) } });
          audio.sfx('arrive');
          get().checkJobs('giza');
          return 'The ferry drifts back across the river. You step off at Giza with the pyramids behind the palms.';
        },

        ferryToCairo: () => {
          const s = get();
          if (s.cash < 1) return 'The ferryman wants a piastre.';
          const st = settlementById('cairo');
          const hour = s.world.hour + 1.5;
          set({ whereabouts: { ...(s.whereabouts ?? {}), [s.day]: 'cairo' }, journal: [...s.journal, { day: s.day, text: 'Took the Nile ferry to Cairo.', kind: 'arrive' }], cash: s.cash - 1, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: 'Nile ferry to Cairo', amount: -1 }], world: { ...s.world, at: 'cairo', x: st.x, y: st.y, hour: Math.min(hour, 23.5), known: s.world.known.includes('cairo') ? s.world.known : [...s.world.known, 'cairo'] } });
          audio.sfx('arrive');
          get().checkJobs('cairo');
          return 'The ferry noses across the brown river. An hour and a half later you step ashore at Cairo.';
        },

        arriveAt: (id) => {
          const s = get();
          if (id && s.world.at !== id) {
            set({ whereabouts: { ...(s.whereabouts ?? {}), [s.day]: id }, journal: [...s.journal, { day: s.day, text: `Arrived in ${settlementById(id).name}.`, kind: 'arrive' }] });
            // troubled towns: soldiers at the gate search the bales and take their cut
            const ev = dangerAt(s.day, id);
            if (ev) {
              const g2 = get();
              const fee = Math.min(g2.cash, Math.max(50, Math.round(g2.cash * 0.05)));
              if (fee > 0) set({ cash: g2.cash - fee, ledger: [...g2.ledger, { day: g2.day, kind: 'expense', label: `Checkpoint at ${settlementById(id).name}`, amount: -fee }], journal: [...g2.journal, { day: g2.day, text: `${ev.name}: soldiers at the gate of ${settlementById(id).name} searched the bales. The "inspection fee" was ${fmt(fee)}.`, kind: 'arrive' }] });
            }
          }
          const known = id && !s.world.known.includes(id) ? [...s.world.known, id] : s.world.known;
          const st = id ? settlementById(id) : null;
          set({ world: { ...s.world, at: id, known, ...(st ? { x: st.x, y: st.y } : {}) } });
          if (id) audio.sfx('arrive');
          if (id) get().checkJobs(id);
        },

        setStallShut: (shut) => { set({ stallShut: shut }); audio.sfx('tap'); },

        ambushOutcome: (partyId, o) => {
          const s = get();
          let cash = Math.max(0, s.cash - (o.cashLoss ?? 0) + (o.cashGain ?? 0));
          const ledger = [...s.ledger];
          if (o.cashLoss) ledger.push({ day: s.day, kind: 'expense', label: 'Lost on the road', amount: -Math.min(s.cash, o.cashLoss) });
          if (o.cashGain) ledger.push({ day: s.day, kind: 'bonus', label: 'Spoils after a fight on the road', amount: o.cashGain });
          let inventory = s.inventory;
          const taken: string[] = [];
          for (let i = 0; i < (o.rugsLost ?? 0); i++) {
            const carried = inventory.filter((x) => !x.stored).sort((a, b) => (RUGS[b.typeId]?.tier ?? 1) - (RUGS[a.typeId]?.tier ?? 1));
            if (!carried.length) break;
            taken.push(RUGS[carried[0].typeId].name);
            inventory = inventory.filter((x) => x.uid !== carried[0].uid);
          }
          const troops = { ...s.world.party.troops };
          for (const [id, n] of Object.entries(o.troopsLost ?? {})) troops[id] = Math.max(0, (troops[id] ?? 0) - n);
          if (o.joiners) troops.reformed = (troops.reformed ?? 0) + o.joiners;
          const parties = s.world.parties.map((x) => (x.id === partyId ? {
            ...x,
            // a band that has had its answer, in loot or in lead, rides home and leaves this caravan alone
            // for days: it neither hunts nor stops the same merchant twice on one journey
            ...(o.theyLeave || o.cashLoss || o.rugsLost
              ? { x: x.home?.x ?? x.x, y: x.home?.y ?? x.y, path: [{ x: x.home?.x ?? x.x, y: x.home?.y ?? x.y }, { x: x.home?.x ?? x.x, y: x.home?.y ?? x.y }], travelled: 0, cooldownUntil: s.day + (o.enemyLost ? 4 : 3) }
              : { cooldownUntil: s.day + 2 }),
            ...(o.enemyLost ? { size: Math.max(2, (x.size ?? 4) - o.enemyLost), strength: Math.max(4, (x.strength ?? 8) - o.enemyLost * 2) } : {}),
          } : x));
          const hour = s.world.hour + (o.delayHours ?? 0);
          set({ cash, ledger, inventory, reputation: Math.max(0, s.reputation + (o.rep ?? 0)), world: { ...s.world, hour: Math.min(hour, 23.9), party: { ...s.world.party, troops }, parties }, journal: [...s.journal, { day: s.day, text: o.text, kind: 'road' }] });
          return taken.length ? `${o.text} They took the ${taken.join(' and the ')}.` : o.text;
        },

        checkJobs: (id) => {
          const s = get();
          // a visitor in this town first
          const visit = (s.visits ?? []).find((v) => v.city === id && v.until >= s.day);
          if (visit) {
            const tierOfV = (i: RugItem) => RUGS[i.typeId]?.tier ?? 1;
            const rug = s.inventory.filter((i) => !i.stored && tierOfV(i) >= visit.tier).sort((a, b) => tierOfV(a) - tierOfV(b))[0];
            if (!rug) set({ jobNote: `${visit.who} wants a ${['', 'rug', 'Fine rug', 'Exceptional rug', 'Legendary rug'][visit.tier]}. Pack one for the road in your Stock and come back before ${dateFor(visit.until).short}.` });
            else {
              const t = RUGS[rug.typeId];
              const pay = snap(((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[rug.condition] * visit.mult);
              // visit.who reads as a sentence subject ("A Tanta cotton merchant is...") capital and all,
              // but these two lines drop it into the middle of a sentence instead
              const midWho = visit.who.charAt(0).toLowerCase() + visit.who.slice(1);
              set({
                cash: s.cash + pay,
                reputation: s.reputation + visit.rep,
                inventory: s.inventory.filter((i) => i.uid !== rug.uid),
                visits: (s.visits ?? []).filter((v) => v.id !== visit.id),
                ledger: [...s.ledger, { day: s.day, kind: 'sale', label: `Sold ${t.name} to ${midWho}`, amount: pay, cost: rug.paid }],
                journal: [...s.journal, { day: s.day, text: `Sold the ${t.name} to ${midWho} in ${settlementById(id).name} for ${fmt(pay)}.`, kind: 'arrive' }],
                jobNote: `${visit.who} buys your ${t.name} for ${fmt(pay)}.`,
              });
              audio.sfx('coins');
              return;
            }
          }
          const job = openJobs(s.jobsDone, s.reputation).find((j) => j.target === id);
          if (!job) return;
          const tierOf = (i: RugItem) => RUGS[i.typeId]?.tier ?? 1;
          const packed = job.need?.packedTier ? s.inventory.filter((i) => !i.stored && tierOf(i) >= job.need!.packedTier!).sort((a, b) => tierOf(a) - tierOf(b))[0] : undefined;
          const missing =
            job.need?.packedTier && !packed ? `pack a ${['', 'rug', 'Fine rug', 'Exceptional rug', 'Legendary rug'][job.need.packedTier]} for the road (Stock tab)` :
            job.need?.animals && animalCount(s.world.party) < job.need.animals ? `bring at least ${job.need.animals} animals` :
            job.need?.guards && !Object.values(s.world.party.troops ?? {}).some((n) => (n ?? 0) > 0) ? 'hire at least one guard' :
            job.reward.fee && s.cash < job.reward.fee ? `bring ${fmt(job.reward.fee)}` : '';
          if (missing) { set({ jobNote: `${job.title}: you need to ${missing}.` }); return; }
          let cash = s.cash - (job.reward.fee ?? 0) + (job.reward.cash ?? 0);
          let inventory = s.inventory;
          const ledger = [...s.ledger];
          if (job.reward.fee) ledger.push({ day: s.day, kind: 'purchase', label: `${job.title}`, amount: -job.reward.fee });
          if (packed && job.reward.sellPacked) {
            const t = RUGS[packed.typeId];
            const pay = snap(((t.valueBand[0] + t.valueBand[1]) / 2) * CONDITION_FACTOR[packed.condition] * job.reward.sellPacked);
            cash += pay;
            inventory = inventory.filter((i) => i.uid !== packed.uid);
            ledger.push({ day: s.day, kind: 'sale', label: `Sold ${t.name} (${job.title})`, amount: pay, cost: packed.paid });
          }
          if (job.reward.cash) ledger.push({ day: s.day, kind: 'sale', label: job.title, amount: job.reward.cash });
          for (const typeId of job.reward.rugs ?? []) {
            const t = RUGS[typeId];
            inventory = [...inventory, { uid: newUid('r'), typeId, condition: 'Good', restored: false, provenance: t.provenance, paid: job.reward.fee ?? 0, notes: [job.done], stored: false }];
          }
          set({
            cash, inventory, ledger,
            reputation: s.reputation + (job.reward.rep ?? 0),
            register: [...new Set([...(s.register ?? []), ...(job.reward.rugs ?? [])])],
            jobsDone: [...(s.jobsDone ?? []), job.id],
            journal: [...s.journal, { day: s.day, text: `${job.title}: ${job.done}`, kind: 'arrive' }],
            jobNote: `Job done: ${job.title}. ${job.done}`,
          });
          audio.sfx('coins');
        },

        sail: (to, mode = 'sea', fromOverride) => {
          const s = get();
          // the settlement panel already knows which place's harbour it's showing, so it passes that
          // place explicitly; other callers (the map's own travel flow) trigger this right at arrival,
          // when world.at already matches, so the fallback is equivalent for them
          const from = fromOverride ?? s.world.at;
          const r = from ? (mode === 'motor' ? motorRoutesFrom(from) : seaRoutesFrom(from)).find((x) => x.to === to) : undefined;
          if (!r) return mode === 'motor' ? 'No motor service runs there from here.' : 'No ship sails there from here.';
          if (s.cash < r.fare) return 'You cannot afford the fare.';
          set({ cash: s.cash - r.fare, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: mode === 'motor' ? `Nairn desert car to ${settlementById(to).name}` : `Deck passage to ${settlementById(to).name}`, amount: -r.fare }] });
          const dest = settlementById(to);
          const notes = get().travelStep(dest, r.days, true);
          get().arriveAt(to);
          return [mode === 'motor' ? `Two days across the desert in a Nairn Cadillac, sand in everything. You reach ${dest.name}.` : `You sailed ${r.days} day${r.days > 1 ? 's' : ''} to ${dest.name}.`, ...notes].join(' ');
        },

        talk: (npcId, effects) => {
          const s = get();
          const w = { ...s.world, quests: { ...s.world.quests }, known: [...s.world.known], rumours: [...s.world.rumours], appraised: [...s.world.appraised], friends: [...s.world.friends] };
          let cash = s.cash;
          let rep = s.reputation;
          let inventory = s.inventory;
          const ledger = [...s.ledger];
          const journal = [...s.journal];
          let supplier = s.supplier;
          let upgradesOut = s.upgrades;
          const out: string[] = [];
          for (const e of effects) {
            const [kind, a, b] = e.split(':');
            const rest = e.slice(kind.length + 1);
            if (kind === 'reveal' && !w.known.includes(a)) {
              w.known.push(a);
              w.fog = revealFog(w.fog, settlementById(a), 4);
              out.push(`${settlementById(a).name} is now on your map.`);
            } else if (kind === 'rumour' && !w.rumours.includes(rest)) {
              w.rumours.push(rest);
              journal.push({ day: s.day, text: `Heard: ${rest}` });
            } else if (kind === 'rep') {
              rep += Number(a);
              out.push(`Reputation +${a}.`);
            } else if (kind === 'cash') {
              cash += Number(a);
              if (Number(a) < 0) ledger.push({ day: s.day, kind: 'expense', label: `Paid ${NPCS[npcId]?.name ?? ''}`, amount: Number(a) });
            } else if (kind === 'trust' && a === 'rashid') {
              supplier = { ...supplier, trust: Math.min(100, supplier.trust + Number(b)) };
            } else if (kind === 'quest' && !w.quests[a]) {
              w.quests[a] = 'active';
              out.push(`New task: ${QUESTS[a].title}.`);
              journal.push({ day: s.day, text: `Task: ${QUESTS[a].desc}` });
            } else if (kind === 'questready' && w.quests[a] === 'active') {
              w.quests[a] = 'ready';
              out.push('Delivered. Go back for your reward.');
            } else if (kind === 'questclaim' && w.quests[a] !== 'done') {
              const q = QUESTS[a];
              if (a === 'hagop-kashan') {
                const it = inventory.find((i) => i.typeId === 'sapphire-night' && (!i.stored || s.world.at === 'giza'));
                if (!it) { out.push('You do not have the Kashan with you.'); continue; }
                inventory = inventory.filter((i) => i.uid !== it.uid);
                ledger.push({ day: s.day, kind: 'sale', label: 'Sapphire Night to Hagop (Paris client)', amount: q.reward, cost: it.paid });
              } else {
                ledger.push({ day: s.day, kind: 'bonus', label: q.title, amount: q.reward });
              }
              if (a === 'salah-son') w.friends.push('fayoum');
              w.quests[a] = 'done';
              cash += q.reward;
              rep += q.rep;
              out.push(`${q.title}: +${fmt(q.reward)}, reputation +${q.rep}.`);
              journal.push({ day: s.day, text: `Completed: ${q.title} (+${fmt(q.reward)}).` });
            } else if (kind === 'deliver' && w.quests[a] === 'active') {
              // a contracted rug: the cheapest carried piece of the tier asked, paid over its value
              const tier = Number(b) || 2;
              const it = inventory.filter((i) => (RUGS[i.typeId]?.tier ?? 1) >= tier && !i.restoringUntil && (!i.stored || s.world.at === 'giza')).sort((x, y) => x.paid - y.paid)[0];
              if (!it) { out.push('You do not have a rug of that quality with you.'); continue; }
              const q = QUESTS[a];
              const pay = Math.max(q.reward, Math.round(it.paid * (tier >= 3 ? 2 : 1.5)));
              inventory = inventory.filter((i) => i.uid !== it.uid);
              ledger.push({ day: s.day, kind: 'sale', label: `${RUGS[it.typeId].name}: ${q.title}`, amount: pay, cost: it.paid });
              w.quests[a] = 'done';
              cash += pay;
              rep += q.rep;
              out.push(`${q.title}: ${fmt(pay)}, reputation +${q.rep}.`);
              journal.push({ day: s.day, text: `Delivered ${RUGS[it.typeId].name} for ${q.title} (+${fmt(pay)}).`, kind: 'road' });
            } else if (kind === 'invest' && a === 'qamar') {
              if (s.upgrades.includes('qamar')) { out.push('You already hold your share.'); continue; }
              if (rep < QAMAR_SHARE.rep) { out.push(`Nadia wants a partner of standing: reputation ${QAMAR_SHARE.rep} (you have ${rep}).`); continue; }
              if (cash < QAMAR_SHARE.cost) { out.push(`A quarter share is ${fmt(QAMAR_SHARE.cost)}. You have ${fmt(cash)}.`); continue; }
              cash -= QAMAR_SHARE.cost;
              ledger.push({ day: s.day, kind: 'purchase', label: 'A quarter share of the Qamar', amount: -QAMAR_SHARE.cost });
              journal.push({ day: s.day, text: `Bought a quarter share of the Qamar from Nadia Wahba for ${fmt(QAMAR_SHARE.cost)}.`, kind: 'stall' });
              upgradesOut = [...s.upgrades, 'qamar'];
              out.push(`You own a quarter of the Qamar. Nadia pays ${fmt(QAMAR_SHARE.dividend)} a week from the door.`);
            } else if (kind === 'appraise') {
              const it = inventory.find((i) => i.typeId === 'fayoum-hearth' && !w.appraised.includes(i.uid) && !i.stored);
              if (!it) { out.push('Farid has already seen that rug.'); continue; }
              w.appraised.push(it.uid);
              const good = rng() < 0.55;
              inventory = inventory.map((i) => i.uid === it.uid ? { ...i, provenance: good ? 'Documented' : 'Disputed', notes: [...i.notes, good ? 'Farid al-Khatib: the Abu Salem looms at Fayoum, about 1898, the family that signs with a camel. He wrote it on his card.' : 'Farid al-Khatib: Beni Suef market work, about 1915. Honest wool, no family behind it.'] } : i);
              out.push(good ? 'Farid turns it over twice and finds the little camel. "Abu Salem. Your father knew what he was buying." Provenance: Documented.' : 'Farid turns it over once. "Beni Suef. Market work. Do not tell anyone it is a family piece." Provenance: Disputed.');
              journal.push({ day: s.day, text: good ? 'Farid documented your father\'s Fayoum Hearth.' : 'Farid judged the Fayoum Hearth a Beni Suef market piece.' });
            }
          }
          set({ world: w, cash, reputation: Math.max(0, rep), inventory, ledger, journal, supplier, upgrades: upgradesOut });
          return out.join(' ');
        },

        visitVenue: (id) => {
          const s = get();
          const cur = s.venues?.[id] ?? {};
          if (cur.lastVisitDay === s.day) return;
          set({ venues: { ...(s.venues ?? {}), [id]: { ...cur, lastVisitDay: s.day } }, journal: cur.lastVisitDay ? s.journal : [...s.journal, { day: s.day, text: `Went to ${VENUES_1925[id].name} for the first time.`, kind: 'road' }] });
        },

        takeTable: (id) => {
          const s = get();
          const v = VENUES_1925[id];
          if (!v || s.world.at !== v.city) return 'You are not there.';
          if (!venueOpen(v, s.day)) return `${v.name} has not opened yet.`;
          const cur = s.venues?.[id] ?? {};
          if (cur.showDay === s.day) return 'Your table is taken for tonight.';
          if (s.cash < v.ticket) return `A table is ${fmt(v.ticket)}. You have ${fmt(s.cash)}.`;
          // who is on: a name from the bill you have earned, otherwise the house company
          const names = v.performers.filter((p) => BUYERS[p] && (BUYER_UNLOCK[p] ?? 0) <= s.reputation + 10);
          const onBill = names.length && rng() < 0.5 ? BUYERS[names[Math.floor(rng() * names.length)]].name : v.company;
          // the next table: now and then someone with money who will call at the stall tomorrow
          const pool = v.guests.filter((b) => BUYERS[b] && (BUYER_UNLOCK[b] ?? 0) <= s.reputation + 8 && !(s.appointments ?? []).some((a) => a.buyerId === b));
          const meet = pool.length && rng() < (s.upgrades.includes('qamar') && id === 'qamar' ? 0.6 : 0.4) ? pool[Math.floor(rng() * pool.length)] : null;
          const journal = [...s.journal, { day: s.day, text: `An evening at ${v.name}: ${onBill}.`, kind: 'road' }];
          if (meet) journal.push({ day: s.day, text: `Met ${BUYERS[meet].name} at the next table at ${v.name}. They will call at the stall tomorrow.`, kind: 'road' });
          set({
            cash: s.cash - v.ticket,
            ledger: [...s.ledger, { day: s.day, kind: 'expense', label: `A table at ${v.name}`, amount: -v.ticket }],
            venues: { ...(s.venues ?? {}), [id]: { ...cur, lastVisitDay: s.day, showDay: s.day, onBill } },
            appointments: meet ? [...(s.appointments ?? []), { buyerId: meet, day: s.day + 1, venue: id }] : s.appointments,
            world: { ...s.world, hour: Math.min(23.9, Math.max(s.world.hour, 20) + 2) },
            journal,
          });
          const bill = onBill.charAt(0).toUpperCase() + onBill.slice(1);
          return `You take a table. ${bill} tonight.${meet ? ` At the next table sits ${BUYERS[meet].name}, who takes your card and promises to call at the stall tomorrow.` : ''}`;
        },

        sellLocal: (uid, sid) => {
          const s = get();
          const it = s.inventory.find((i) => i.uid === uid);
          if (!it || it.restoringUntil) return 0;
          let bid = localBid(sid, it, s.day);
          // a dealer never pays more for a rug than they are asking for that same type today, in the
          // condition you actually hold it: without this, a type this town both sells and has high
          // local demand for (its own specialty, most often) could be bought and sold straight back for
          // a profit — not only same-day (which also needs the sold-out stock ignored, so this asks
          // for the price directly rather than matching today's one rolled-condition listing) but even
          // across visits, since the rug keeps its condition long after the day it was bought.
          const askToday = localAskPrice(sid, s.day, it.typeId, it.condition, s.world.friends, s.reputation);
          if (askToday !== undefined) bid = Math.min(bid, Math.max(0, askToday - 1));
          set({
            cash: s.cash + bid,
            inventory: s.inventory.filter((i) => i.uid !== uid),
            ledger: [...s.ledger, { day: s.day, kind: 'sale', label: `${RUGS[it.typeId].name} to a dealer in ${settlementById(sid).name}`, amount: bid, cost: it.paid }],
            totalSales: s.totalSales + 1,
          });
          audio.sfx('coins');
          return bid;
        },

        buyLocal: (sid, key) => {
          const s = get();
          const o = localOffers(sid, s.day, s.world.boughtLocal, s.world.friends, s.reputation).find((x) => x.key === key);
          if (!o) return '';
          if (s.cash < o.price) return 'Not enough cash.';
          const t = RUGS[o.typeId];
          const item: RugItem = { uid: newUid('r'), typeId: o.typeId, condition: o.condition, restored: false, provenance: t.provenance, paid: o.price, notes: [`Bought in ${settlementById(sid).name}.`], stored: false };
          set({
            cash: s.cash - o.price,
            inventory: [...s.inventory, item],
            world: { ...s.world, boughtLocal: [...s.world.boughtLocal.slice(-60), key] },
            ...growth(s, { appraisal: 3 + ((t.tier ?? 1) - 1) * 2 }),
            ledger: [...s.ledger, { day: s.day, kind: 'purchase', label: `Bought ${t.name} in ${settlementById(sid).name}`, amount: -o.price, cost: o.price }],
          });
          audio.sfx('coins');
          const m = MISSIONS.alexandria;
          if (sid === m.target && s.missions?.alexandria === 'active') {
            const g2 = get();
            set({
              missions: { ...g2.missions, alexandria: 'done' },
              missionNews: 'alexandria-done',
              cash: g2.cash + m.reward.cash,
              reputation: g2.reputation + m.reward.rep,
              supplier: { ...g2.supplier, trust: Math.min(100, g2.supplier.trust + m.reward.trust), offers: rashidStock(g2.day, rng, g2.reputation + m.reward.rep, false) },
              ledger: [...g2.ledger, { day: g2.day, kind: 'bonus', label: `Mission: ${m.title}`, amount: m.reward.cash }],
              journal: [...g2.journal, { day: g2.day, text: `Mission complete: ${m.title}. Rashid's back room and credit are open.`, kind: 'mission' }],
            });
            audio.sfx('chest');
            return `Bought ${t.name} for ${fmt(o.price)}. Mission complete: ${m.title}.`;
          }
          return `Bought ${t.name} for ${fmt(o.price)}.`;
        },

        partyChoice: (partyId, choice) => {
          const s = get();
          const p = s.world.parties.find((x) => x.id === partyId);
          if (!p) return '';
          const parties = s.world.parties.map((x) => (x.id === partyId ? { ...x, cooldownUntil: s.day + 2 } : x));
          let cash = s.cash;
          let rep = s.reputation;
          const known = [...s.world.known];
          const ledger = [...s.ledger];
          let hour = s.world.hour;
          let msg = '';
          const reveal = () => {
            const hidden = SETTLEMENTS.filter((x) => !known.includes(x.id));
            if (!hidden.length) return '';
            const pick1 = hidden.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
            known.push(pick1.id);
            return ` They tell you the way to ${pick1.name}.`;
          };
          if (choice === 'news') msg = (p.kind === 'caravan' ? '"Wool is dear in Aleppo and cheap in Konya. Silk sells in Beirut."' : p.kind === 'pilgrims' ? '"God bless your trade. The road ahead is quiet."' : '"Water at the next well. Soldiers two days east."') + reveal();
          else if (choice === 'share') {
            cash -= 3;
            rep += 1;
            msg = 'You share bread and water. Word of a generous merchant travels. Reputation +1.';
            ledger.push({ day: s.day, kind: 'expense', label: 'Bread and water for travellers', amount: -3 });
          } else if (choice === 'toll') {
            const toll = Math.max(10, Math.round(cash * 0.1));
            cash -= toll;
            msg = `You pay ${fmt(toll)}. They wave you on, almost friendly.`;
            ledger.push({ day: s.day, kind: 'expense', label: 'Road toll', amount: -toll });
          } else if (choice === 'talk') {
            if (s.world.rumours.some((r) => r.includes('Salim'))) msg = 'You mention Salim ibn Eid. The leader laughs, offers you a date, and rides off.';
            else if (rng() < 0.5) {
              msg = 'You talk about Cairo, cats and camels. They decide you are too poor to rob.';
            } else {
              const toll = Math.max(15, Math.round(cash * 0.18));
              cash -= toll;
              msg = `They listen politely and take ${fmt(toll)} anyway.`;
              ledger.push({ day: s.day, kind: 'expense', label: 'Road toll', amount: -toll });
            }
          } else if (choice === 'turn') {
            hour += 8;
            msg = 'You turn back and lose half a day circling around them.';
          } else if (choice === 'fight' && p.strength) {
            const mine = strength(s.world.party);
            const pWin = mine / (mine + p.strength);
            const party: PartyState = { ...s.world.party, troops: { ...s.world.party.troops } };
            const losses: string[] = [];
            const casualties = (chance: number) => {
              for (const id of Object.keys(party.troops)) {
                let lost = 0;
                for (let i = 0; i < party.troops[id]; i++) if (rng() < chance) lost++;
                if (lost) { party.troops[id] -= lost; losses.push(`${lost} ${lost > 1 ? TROOPS[id].plural.toLowerCase() : TROOPS[id].name.toLowerCase()}`); }
              }
            };
            if (rng() < pWin) {
              casualties(0.08);
              const loot = 8 + Math.floor(rng() * 25);
              cash += loot;
              rep += 1;
              ledger.push({ day: s.day, kind: 'bonus', label: 'Spoils after driving off raiders', amount: loot });
              let join = '';
              if (rng() < 0.4) {
                const n = 1 + Math.floor(rng() * 2);
                party.troops.reformed = (party.troops.reformed ?? 0) + n;
                join = ` ${n} of the beaten raiders ask to ride with you instead. You take them on.`;
              }
              msg = `Your men stand firm and the raiders break and scatter. You pick up ${fmt(loot)} they dropped.${losses.length ? ` Lost: ${losses.join(', ')}.` : ' No one was hurt.'}${join}`;
              const moved = parties.map((x) => (x.id === partyId ? { ...x, x: x.home?.x ?? x.x, y: x.home?.y ?? x.y, cooldownUntil: s.day + 4, size: Math.max(2, (x.size ?? 4) - 2), strength: Math.max(4, (x.strength ?? 8) - 4) } : x));
              set({ world: { ...get().world, party, parties: moved } });
              set({ cash, reputation: rep, ledger });
              return msg;
            }
            casualties(0.3);
            const lostCash = Math.round(cash * 0.3);
            cash -= lostCash;
            let inventory = s.inventory;
            const carriedRugs = inventory.filter((i) => !i.stored);
            let rugMsg = '';
            if (carriedRugs.length) {
              const r = carriedRugs[Math.floor(rng() * carriedRugs.length)];
              inventory = inventory.filter((i) => i.uid !== r.uid);
              rugMsg = ` They take the ${RUGS[r.typeId].name}.`;
            }
            ledger.push({ day: s.day, kind: 'expense', label: 'Robbed by raiders', amount: -lostCash });
            msg = `The fight goes badly. You lose ${fmt(lostCash)}.${rugMsg}${losses.length ? ` Lost: ${losses.join(', ')}.` : ''}`;
            set({ inventory, world: { ...get().world, party, parties } });
            set({ cash, reputation: rep, ledger });
            return msg;
          } else if (choice === 'hire') {
            const price = 400;
            if (cash < price) msg = 'They want £4 up front. You do not have it.';
            else {
              cash -= price;
              ledger.push({ day: s.day, kind: 'expense', label: `Hired ${p.name}`, amount: -price });
              const party: PartyState = { ...s.world.party, troops: { ...s.world.party.troops, guard: (s.world.party.troops.guard ?? 0) + 4 } };
              const rest = parties.filter((x) => x.id !== partyId);
              set({ cash, ledger, world: { ...s.world, party, parties: rest } });
              return 'Four hard men shake your hand and fall in behind your camels. Their wages start tomorrow.';
            }
          } else if (choice === 'trade') {
            const pool = ['village-kilim-canal', 'delta-house', 'date-palm-runner', 'red-medina', 'cedar-caravan', 'anatolian-hearth', 'aleppo-courtyard', 'canal-ferry-rug'];
            const typeId = pool[(partyId.charCodeAt(1) + s.day) % pool.length];
            const t = RUGS[typeId];
            const price = snap(t.dealerCost * 0.85);
            if (cash < price) msg = `They offer a ${t.name} for ${fmt(price)}. You cannot afford it.`;
            else {
              cash -= price;
              ledger.push({ day: s.day, kind: 'purchase', label: `Bought ${t.name} from a caravan`, amount: -price, cost: price });
              const item: RugItem = { uid: newUid('r'), typeId, condition: 'Good', restored: false, provenance: t.provenance === 'Documented' ? 'Likely' : t.provenance, paid: price, notes: ['Bought from a caravan on the road. No papers.'], stored: false };
              set({ inventory: [...get().inventory, item] });
              msg = `You buy a ${t.name} off a camel for ${fmt(price)}.`;
            }
          } else msg = 'You move on.';
          set({ cash, reputation: rep, ledger, world: { ...s.world, parties, known, hour: Math.min(hour, 23.9) } });
          return msg;
        },

        buyFood: (n) => {
          const s = get();
          const sid = s.world.at;
          if (!sid) return '';
          const price = Math.ceil(n * (MARKETS[sid]?.food ?? 2));
          if (s.cash < price) return 'Not enough cash.';
          set({ cash: s.cash - price, world: { ...s.world, party: { ...s.world.party, food: s.world.party.food + n } }, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: `${n} rations in ${settlementById(sid).name}`, amount: -price }] });
          audio.sfx('coin');
          return `Bought ${n} ration${n === 1 ? '' : 's'} of bread and dates for ${fmt(price)}.`;
        },

        /** A last resort on the road with the sacks empty: butcher a pack animal for rations. You lose the animal for good. */
        butcherAnimal: (breed) => {
          const s = get();
          const b = BREEDS[breed];
          const animals = { ...s.world.party.animals };
          if (!b || (animals[breed] ?? 0) <= 0) return '';
          animals[breed] -= 1;
          const rations = 8 + Math.round(b.load / 2);
          set({
            world: { ...s.world, party: { ...s.world.party, animals, food: s.world.party.food + rations, hungryDays: 0 } },
            journal: [...s.journal, { day: s.day, text: `Butchered your ${b.name} for meat. Grim, but it will feed everyone for days.`, kind: 'road' }],
          });
          audio.sfx('step');
          return `You butcher the ${b.name}. Hard, but it buys you ${rations} days of food.`;
        },

        trade: (breed, delta) => {
          const s = get();
          const sid = s.world.at;
          const b = BREEDS[breed];
          if (!b) return '';
          const price = animalPrice(sid, breed);
          const animals = { ...s.world.party.animals };
          if (delta > 0) {
            if (!price) return `Nobody sells the ${b.name} here.`;
            if (s.cash < price) return 'Not enough cash.';
            animals[breed] = (animals[breed] ?? 0) + 1;
            set({ cash: s.cash - price, world: { ...s.world, party: { ...s.world.party, animals } }, ledger: [...s.ledger, { day: s.day, kind: 'purchase', label: `Bought ${withArticle(b.name)}`, amount: -price }] });
            audio.sfx('step');
            return `You buy ${withArticle(b.name)} for ${fmt(price)}.`;
          }
          if ((animals[breed] ?? 0) <= 0) return '';
          const back = Math.round((price ?? b.price) * 0.6);
          animals[breed] -= 1;
          set({ cash: s.cash + back, world: { ...s.world, party: { ...s.world.party, animals } }, ledger: [...s.ledger, { day: s.day, kind: 'sale', label: `Sold ${withArticle(b.name)}`, amount: back }] });
          return `You sell the ${b.name} for ${fmt(back)}.`;
        },

        recruit: (troop, key, n) => {
          const s = get();
          const t = TROOPS[troop];
          const pool = s.world.at ? recruitPool(s.world.at, s.day, s.world.hired).find((r) => r.key === key) : undefined;
          if (!pool) return '';
          const k = Math.min(n, pool.available);
          if (k <= 0) return 'No more volunteers today.';
          const cost = t.cost * k;
          if (s.cash < cost) return 'Not enough cash.';
          const party = { ...s.world.party, troops: { ...s.world.party.troops, [troop]: (s.world.party.troops[troop] ?? 0) + k } };
          set({ cash: s.cash - cost, world: { ...s.world, party, hired: { ...s.world.hired, [key]: (s.world.hired[key] ?? 0) + k } }, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: `Recruited ${k} ${k > 1 ? t.plural.toLowerCase() : t.name.toLowerCase()}`, amount: -cost }] });
          audio.sfx('coins');
          return `${k} ${k > 1 ? t.plural.toLowerCase() : t.name.toLowerCase()} join your caravan. Wages ${fmt(t.wage * k)} a day.`;
        },

        dismiss: (troop, n) => {
          const s = get();
          const have = s.world.party.troops[troop] ?? 0;
          set({ world: { ...s.world, party: { ...s.world.party, troops: { ...s.world.party.troops, [troop]: Math.max(0, have - n) } } } });
        },

        toggleStored: (uid) => {
          const s = get();
          if (s.world.at !== 'giza') return;
          set({ inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, stored: !i.stored } : i)) });
        },

        finishOpening: () => {
          audio.stopMusic();
          audio.stopVoice();
          set({ openingSeen: true });
        },

        beginDayOne: () => {
          audio.stopMusic();
          audio.stopVoice();
          // the first morning opens on the lane: Samira is already on her way up to the stall
          set({ started: true, openingSeen: true, world: { ...get().world, at: 'giza', hour: 7.4 } });
        },

        markGuide: () => set({ guideSeen: true }),
        clearMissionNews: () => set({ missionNews: undefined }),
        lotResult: (houseId, lot, winner, price, winnerName) => {
          const s = get();
          if ((s.lotsSold ?? []).includes(lot.key)) return '';
          const h = HOUSES[houseId];
          const lotsSold = [...(s.lotsSold ?? []), lot.key].slice(-400);
          const title = lot.bundle ? `a bundle of ${lot.typeIds.length} rugs` : RUGS[lot.typeIds[0]].name;
          // every sale you see teaches you what that rug fetches
          const intel = { ...(s.intel ?? {}) };
          if (winner && !lot.bundle) {
            const id = lot.typeIds[0];
            const norm = Math.round(price / CONDITION_FACTOR[lot.conditions[0]]);
            intel[id] = applyAuctionObservation(intel[id] ?? { rugFamily: id, observations: 0, confidence: 0 }, norm);
          }
          let reoffers = (s.reoffers ?? []).filter((r) => !(r.houseId === houseId && lot.reoffered !== undefined && r.typeId === lot.typeIds[0]));
          if (!winner && !lot.bundle && shouldReofferUnsoldLot(Math.random(), h.tier)) {
            const times = (lot.reoffered ?? 0) + 1;
            reoffers = [...reoffers, { houseId, typeId: lot.typeIds[0], condition: lot.conditions[0], provenance: lot.provenance[0], reserve: reducedReserveForReoffer(lot.reserve, times), times }].slice(-12);
          }
          if (winner !== 'you') {
            set({ lotsSold, intel, reoffers, ...growth(s, { appraisal: 2 }) });
            return winner ? `${winnerName ?? 'A bidder'} takes ${title} for ${fmt(price)}.` : `No bid reaches the reserve. ${title} is bought in${reoffers.length > (s.reoffers ?? []).length ? ' and will be offered again, cheaper' : ''}.`;
          }
          const total = totalAuctionCost(price, h.buyerPremiumPct);
          if (s.cash < total) return 'You cannot cover the bid. The auctioneer sells it to the next bidder.';
          const items: RugItem[] = lot.typeIds.map((id, j) => ({ uid: newUid('r'), typeId: id, condition: lot.conditions[j], restored: false, provenance: lot.provenance[j], paid: Math.round(total / lot.typeIds.length), notes: [`Bought at the ${h.displayName}.`], stored: false }));
          set({
            cash: s.cash - total,
            inventory: [...s.inventory, ...items],
            lotsSold, intel, reoffers,
            stats: { ...(s.stats ?? {}), auctionsWon: (s.stats?.auctionsWon ?? 0) + 1 },
            ledger: [...s.ledger, { day: s.day, kind: 'purchase', label: `Auction: ${title}${total > price ? ' (with premium)' : ''}`, amount: -total, cost: total }],
            journal: [...s.journal, { day: s.day, text: `Won ${title} at the ${h.displayName} for ${fmt(total)}.` }],
            ...growth(s, { haggling: 10, appraisal: 6 }),
          });
          audio.sfx('sold');
          return lot.bundle ? `The porters cut the rope: ${items.map((i) => `${RUGS[i.typeId].name} (${i.condition})`).join(', ')}.` : `${title} is yours for ${fmt(total)}${total > price ? `, with the ${Math.round(h.buyerPremiumPct * 100)}% premium` : ''}.`;
        },
        practise: (skill, xp) => set(growth(get(), { [skill]: xp })),
        popLevelUp: () => set({ levelUps: (get().levelUps ?? []).slice(1) }),
        popTitle: () => set({ titleNews: (get().titleNews ?? []).slice(1) }),
        markMerchantSeen: () => set({ merchantSeen: progressScore(get()) }),
        seeTip: (id) => set({ tipsSeen: [...new Set([...(get().tipsSeen ?? []), id])] }),
        buyAttire: (id) => {
          const s = get();
          const a = ATTIRE[id];
          if (!a || s.attire.owned.includes(id)) return '';
          if (s.cash < a.cost) return 'Not enough cash.';
          const w0 = s.wardrobe ?? START_WARDROBE;
          const setPieces = Object.values(LEGACY_SETS[id] ?? {}).filter((v): v is string => typeof v === 'string');
          const outfit = { ...w0.outfit, ...LEGACY_SETS[id], extras: w0.outfit.extras } as Outfit;
          set({ cash: s.cash - a.cost, wardrobe: { owned: [...new Set([...w0.owned, ...setPieces])], outfit }, attire: { owned: [...s.attire.owned, id], worn: legacyWorn(outfit), clean: 100 }, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: a.name, amount: -a.cost }], journal: [...s.journal, { day: s.day, text: `Bought ${a.name.toLowerCase()} from a tailor.` }] });
          audio.sfx('coins');
          return `The tailor brushes the shoulders and steps back. ${a.name}: charisma +${a.charisma}.`;
        },
        wear: (id) => {
          const s = get();
          if (!s.attire.owned.includes(id)) return;
          const w0 = s.wardrobe ?? START_WARDROBE;
          const outfit = id === 'galabiya' ? { ...START_WARDROBE.outfit, extras: [] } : ({ ...w0.outfit, ...LEGACY_SETS[id] } as Outfit);
          set({ wardrobe: { ...w0, outfit }, attire: { ...s.attire, worn: legacyWorn(outfit) } });
        },
        buyPieces: (ids) => {
          const s = get();
          const w0 = s.wardrobe ?? START_WARDROBE;
          const fresh = [...new Set(ids)].filter((id) => PIECES[id] && !w0.owned.includes(id));
          if (!fresh.length) return '';
          const total = fresh.reduce((n, id) => n + PIECES[id].price, 0);
          if (s.cash < total) return `Not enough cash: that comes to ${fmt(total)}.`;
          const PROPER = /^(Albanian|Pasha|Lee-Enfield|Ottoman|Mauser|Webley|Red Fez)/;
          const names = fresh.map((id) => { const n = PIECES[id].name; return PROPER.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1); });
          const said = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
          set({
            cash: s.cash - total,
            wardrobe: { ...w0, owned: [...w0.owned, ...fresh] },
            ledger: [...s.ledger, ...fresh.map((id) => ({ day: s.day, kind: 'expense' as const, label: PIECES[id].name, amount: -PIECES[id].price }))],
            journal: [...s.journal, { day: s.day, text: `Bought ${said}.` }],
          });
          audio.sfx('coins');
          return `Wrapped in brown paper and tied with string: ${said}, ${fmt(total)}.`;
        },
        skipTutorial: () => {
          const s = get();
          if (s.tutorial.done) return;
          set({ tutorial: { done: true, step: 'done', inspected: true }, encounter: s.encounter?.tutorial ? { ...s.encounter, tutorial: false } : s.encounter });
        },
        dressIn: (o) => {
          const s = get();
          const w0 = s.wardrobe ?? START_WARDROBE;
          if (!wornIds(o).every((id) => w0.owned.includes(id))) return;
          set({ wardrobe: { ...w0, outfit: { ...o, extras: [...o.extras] } }, attire: { ...s.attire, worn: legacyWorn(o) } });
        },
        bathe: (sid) => {
          const s = get();
          const h = HAMMAMS[sid];
          if (!h) return '';
          if (s.cash < h.cost) return 'Not enough cash.';
          set({ cash: s.cash - h.cost, attire: { ...s.attire, clean: 100 }, world: { ...s.world, hour: Math.min(23.5, s.world.hour + 1.5) }, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: h.name, amount: -h.cost }] });
          audio.sfx('water');
          return `${h.name}: steam, a scrub and a barber. You walk out a new man, and your clothes are brushed and pressed.`;
        },
        readBook: (id) => {
          const s = get();
          const b = BOOKS[id];
          if (!b || s.books.includes(id)) return '';
          if (s.cash < b.cost) return 'Not enough cash.';
          const xp: Partial<Record<SkillId, number>> = { [b.skill]: b.xp, scholarship: (b.skill === 'scholarship' ? 0 : 15) + (b.skill === 'scholarship' ? b.xp : 0) };
          if (hasPerk(s.skills?.scholarship, 'scholarship', 5) && b.skill !== 'appraisal') xp.appraisal = (xp.appraisal ?? 0) + 15;
          set({ cash: s.cash - b.cost, books: [...s.books, id], world: { ...s.world, hour: Math.min(23.5, s.world.hour + 3) }, ledger: [...s.ledger, { day: s.day, kind: 'expense', label: `Book: ${b.title}`, amount: -b.cost }], journal: [...s.journal, { day: s.day, text: `Read ${b.title} by ${b.author}.` }], ...growth(s, xp) });
          audio.sfx('page');
          return `You spend the afternoon with ${b.title}. ${SKILLS[b.skill].name} rises.`;
        },

        startAudience: (buyerId) => {
          const s = get();
          const b = BUYERS[buyerId];
          if (!b?.royal) return '';
          if (s.reputation < b.royal.minRep) return `The chamberlain regrets that the ${b.name.startsWith('Queen') ? 'Queen' : b.name.includes('President') || b.name.includes('Kemal') ? 'President' : b.name.startsWith('Emir') ? 'Emir' : 'King'} receives merchants of greater standing. Come back with reputation ${b.royal.minRep} (you have ${s.reputation}).`;
          const ch = heroCharisma((s.wardrobe ?? START_WARDROBE).outfit, s.attire?.clean ?? 100);
          if (ch < 6) return (s.attire?.clean ?? 100) < 40 && (s.attire?.worn ?? 'galabiya') !== 'galabiya'
            ? 'The chamberlain looks at the road dust on your coat and does not write your name down. Wash at a hammam first.'
            : 'The chamberlain looks at your work galabiya and politely closes his book. Nobody enters the palace dressed for the bazaar. A tailor can fix that.';
          const last = s.court.last[buyerId];
          if (last !== undefined && s.day - last < 7) return `You were received ${s.day - last === 0 ? 'today' : s.day - last === 1 ? 'yesterday' : `${s.day - last} days ago`}. The court will not see you again before day ${last + 7}.`;
          const enc = startEncounter(buyerId, ctxFor(s, buyerId), [], false);
          enc.venue = b.royal.venue;
          enc.saffronOn = undefined;
          audio.sfx('arrive');
          let patch: Partial<GameState> = { journal: [...s.journal, { day: s.day, text: `Received in audience by ${b.name}.`, kind: 'royal' }], audienceStash: s.audienceStash ?? { encounter: s.encounter, visitIdx: s.visitIdx }, encounter: enc, relationships: s.relationships[buyerId] ? s.relationships : { ...s.relationships, [buyerId]: emptyRel() } };
          // startEncounter can reject the audience on the spot (nothing at the required tier) before
          // any action is ever dispatched through act() — the only place that normally calls settle()
          // when an encounter's outcome is set. Without this, the journal records the audience but the
          // buyer's own record (visits, and anything else settle applies) never learns it happened.
          if (enc.outcome) patch = { ...patch, ...settle({ ...s, ...patch } as GameState, enc) };
          set(patch);
          return '';
        },

        endAudience: () => {
          const s = get();
          const st = s.audienceStash;
          set({ encounter: st ? st.encounter : null, visitIdx: st ? st.visitIdx : s.visitIdx, audienceStash: null });
        },

        waitForCustomer: () => {
          const s = get();
          if (s.encounter || s.dayOver) return;
          if (s.held) { get().nextVisit(); return; }
          if (s.visitIdx >= s.queue.length) { set({ dayOver: true, world: { ...s.world, hour: Math.max(s.world.hour, 19) } }); return; }
          set({ world: { ...s.world, hour: Math.max(s.world.hour, arrivalAt(s, s.visitIdx)) } });
          get().nextVisit();
        },

        passTime: (minutes) => {
          const s = get();
          if (minutes <= 0) return;
          const st = { ...s, world: { ...s.world, hour: Math.min(23.9, s.world.hour + minutes / 60) } } as GameState;
          set({ world: st.world, ...(s.encounter ? {} : missedPatch(st)) });
        },

        stepAway: () => {
          const s = get();
          if (!s.encounter || s.encounter.outcome || s.encounter.tutorial) return;
          set({ held: { encounter: s.encounter, until: s.world.hour + 1 }, encounter: null });
        },

        nextVisit: () => {
          let s = get();
          // back from stepping away: the customer you left is still here, or has given up
          if (s.held && !s.encounter) {
            if (s.world.hour <= s.held.until) { set({ encounter: s.held.encounter, held: null }); return; }
            const b = BUYERS[s.held.encounter.buyerId];
            set({ held: null, visitIdx: s.visitIdx + 1, journal: [...s.journal, { day: s.day, text: `${b?.name ?? 'A customer'} got tired of waiting and left the stall.` }] });
            s = get();
          }
          // a finished sale took time: the talk, the tea, the wrapping
          if (s.encounter && s.encounter.outcome) {
            const mins = 35 + Math.min(55, s.encounter.log.length * 2.5);
            set({ encounter: null, world: { ...s.world, hour: Math.min(23.9, s.world.hour + mins / 60) } });
            s = get();
          }
          // customers who arrived while you were busy with someone else simply wait their turn
          if (s.visitIdx >= s.queue.length || s.world.hour >= 20) {
            set({ encounter: null, dayOver: true });
            return;
          }
          // nobody has come yet, or the first-day tour is still on: the stall waits
          if ((s.world.hour < arrivalAt(s, s.visitIdx) && !(s.day === 1 && !s.tutorial.done))) {
            set({ encounter: null });
            return;
          }
          const buyerId = s.queue[s.visitIdx];
          const tutorial = !s.tutorial.done && buyerId === 'samira' && s.day === 1;
          const displayed = availableRugs(s).slice(0, 3).map((i) => i.uid);
          const enc = startEncounter(buyerId, ctxFor(s, buyerId), displayed, tutorial);
          const rel = s.relationships[buyerId] ?? emptyRel();
          const b = BUYERS[buyerId];
          let commissions = s.commissions;
          let relationships = s.relationships;
          let reputation = s.reputation;
          let goals = s.goals;
          if (!tutorial && rel.purchases >= 1 && b.commission && !rel.commissionOffered && b.lines.commission.length) {
            enc.log.push({ speaker: 'buyer', text: b.lines.commission[0], mood: 'warm' });
            commissions = [...s.commissions, { buyerId, label: b.commission.label, bonus: b.commission.bonus, done: false, until: s.day + 10 }];
            relationships = { ...relationships, [buyerId]: { ...rel, commissionOffered: true } };
            goals = [...goals.filter((g) => g.id !== 'commission'), { id: 'commission', kind: 'commission', label: `${b.commission.label} (by day ${s.day + 10})`, key: b.commission.label, target: 1 }];
          } else if (!tutorial && rel.purchases >= 1 && !rel.referred && b.lines.referral.length && rel.visits >= 1) {
            enc.log.push({ speaker: 'buyer', text: b.lines.referral[0], mood: 'warm' });
            relationships = { ...relationships, [buyerId]: { ...rel, referred: true } };
            reputation += 1;
          }
          audio.sfx('step');
          set({
            encounter: enc,
            dayOver: false,
            commissions,
            relationships,
            reputation,
            goals,
            tutorial: tutorial ? { ...s.tutorial, step: 'room' } : s.tutorial,
          });
        },

        present: (uid) => {
          const s = get();
          if (!s.encounter || s.encounter.outcome) return;
          const tut = s.encounter.tutorial && !s.tutorial.done;
          if (tut) {
            if (s.tutorial.step !== 'rug') return;
            const item = s.inventory.find((i) => i.uid === uid);
            if (item?.typeId !== 'desert-star') {
              const enc = cloneEnc(s.encounter);
              enc.log.push({ speaker: 'narrator', text: 'Not that one yet. She wants quiet taste. Try the Desert Star.' });
              set({ encounter: enc });
              return;
            }
          }
          const enc = cloneEnc(s.encounter);
          const fx = presentRug(enc, ctxFor(s, enc.buyerId), uid);
          playFx(fx);
          let tutorial = s.tutorial;
          if (tut && fx.tutorialAdvance === 'presented') {
            enc.log.push({ speaker: 'narrator', text: NARRATOR.step3 });
            tutorial = { ...tutorial, step: 'inspect' };
          }
          let patch: Partial<GameState> = { encounter: enc, tutorial, ...growth(s, fx.xp, fx.manner) };
          if (enc.outcome) patch = { ...patch, ...settle({ ...s, ...patch } as GameState, enc), visitIdx: enc.venue ? s.visitIdx : s.visitIdx + 1 };
          set(patch);
        },

        act: (id, price) => {
          const s = get();
          if (!s.encounter || s.encounter.outcome) return;
          if (!tutorialAllows(s, id)) return;
          const enc = cloneEnc(s.encounter);
          const fx = doAction(enc, ctxFor(s, enc.buyerId), id, price);
          playFx(fx);
          let tutorial = s.tutorial;
          const tut = enc.tutorial && !s.tutorial.done;
          if (tut) {
            if (fx.tutorialAdvance === 'asked_room' && s.tutorial.step === 'room') {
              enc.log.push({ speaker: 'narrator', text: NARRATOR.step2 });
              tutorial = { ...tutorial, step: 'rug' };
            } else if (fx.tutorialAdvance === 'arg_right' && s.tutorial.step === 'argue') {
              enc.log.push({ speaker: 'narrator', text: NARRATOR.step5 });
              tutorial = { ...tutorial, step: 'price' };
            } else if (fx.tutorialAdvance === 'countered' && (s.tutorial.step === 'price' || s.tutorial.step === 'counter')) {
              if (s.tutorial.step === 'price') enc.log.push({ speaker: 'narrator', text: NARRATOR.step5b });
              tutorial = { ...tutorial, step: 'counter' };
            }
            if (enc.outcome === 'sold') {
              enc.log.push({ speaker: 'narrator', text: NARRATOR.step6 });
              enc.log.push({ speaker: 'narrator', text: NARRATOR.restock });
              tutorial = { done: true, step: 'done', inspected: true };
            }
          }
          let patch: Partial<GameState> = { encounter: enc, tutorial, ...growth(s, fx.xp, fx.manner) };
          if (fx.lie) patch.stats = { ...(s.stats ?? {}), liesOk: (s.stats?.liesOk ?? 0) + (fx.lie === 'ok' ? 1 : 0), liesCaught: (s.stats?.liesCaught ?? 0) + (fx.lie === 'caught' ? 1 : 0) };
          if (fx.cashDelta) {
            patch.cash = s.cash + fx.cashDelta;
            if (fx.ledger) patch.ledger = [...s.ledger, { day: s.day, kind: 'expense', label: fx.ledger.label, amount: fx.ledger.amount }];
            patch.dayStats = { ...s.dayStats, expenses: s.dayStats.expenses - fx.cashDelta };
          }
          if (fx.repDelta) patch.reputation = Math.max(0, s.reputation + fx.repDelta);
          if (enc.outcome) {
            const merged = { ...s, ...patch } as GameState;
            patch = { ...patch, ...settle(merged, enc), visitIdx: enc.venue ? s.visitIdx : s.visitIdx + 1 };
            if (enc.outcome === 'sold') setTimeout(() => audio.sfx('sold'), 200);
          }
          set(patch);
        },

        pet: () => {
          const s = get();
          if (!s.encounter) {
            audio.sfx('meow');
            return;
          }
          const enc = cloneEnc(s.encounter);
          playFx(petCat(enc, ctxFor(s, enc.buyerId)));
          set(growth(get(), { catkeeping: 2 }));
          set({ encounter: enc });
        },

        inspectorOpened: () => {
          set(growth(get(), { appraisal: 1 }));
          const s = get();
          if (s.encounter?.tutorial && s.tutorial.step === 'inspect') {
            const enc = cloneEnc(s.encounter);
            enc.log.push({ speaker: 'narrator', text: NARRATOR.step3b });
            set({ tutorial: { ...s.tutorial, step: 'inspect2' }, encounter: enc });
          }
        },
        inspectorUsed: () => {
          const s = get();
          if (!s.tutorial.inspected) set({ tutorial: { ...s.tutorial, inspected: true } });
        },
        inspectorClosed: () => {
          const s = get();
          if (s.encounter?.tutorial && s.tutorial.step === 'inspect2' && s.tutorial.inspected) {
            const enc = cloneEnc(s.encounter);
            enc.log.push({ speaker: 'narrator', text: NARRATOR.step4 });
            set({ tutorial: { ...s.tutorial, step: 'argue' }, encounter: enc });
          }
        },

        endDay: () => {
          const { patch, summary } = rollover(get());
          set({ ...patch, lastSummary: summary, world: { ...(patch.world ?? get().world), hour: 7 } });
          audio.sfx('pen');
        },

        buyOffer: (uid, credit) => {
          const s = get();
          const o = s.supplier.offers.find((x) => x.uid === uid);
          if (!o) return '';
          const t = RUGS[o.typeId];
          if (credit) {
            if (s.supplier.trust < 20 || s.supplier.debt + o.price > (s.missions?.alexandria === 'done' ? rashidCredit(s.supplier.trust, s.reputation) : 0)) {
              set({ supplier: { ...s.supplier, lastLine: RASHID.creditRefused[0] } });
              return RASHID.creditRefused[0];
            }
          } else if (s.cash < o.price) return 'Not enough cash.';
          const item: RugItem = { uid: newUid('r'), typeId: o.typeId, condition: o.condition, restored: false, provenance: t.provenance, paid: o.price, notes: [], stored: true };
          const line = credit ? RASHID.credit[0] : pick(RASHID.bought, rng);
          set({
            ...growth(s, { appraisal: 2 }),
            cash: credit ? s.cash : s.cash - o.price,
            inventory: [...s.inventory, item],
            supplier: {
              ...s.supplier,
              offers: (o.qty ?? 1) > 1 ? s.supplier.offers.map((x) => (x.uid === uid ? { ...x, qty: (x.qty ?? 1) - 1 } : x)) : s.supplier.offers.filter((x) => x.uid !== uid),
              trust: Math.min(100, s.supplier.trust + 3),
              debt: credit ? s.supplier.debt + o.price : s.supplier.debt,
              debtDue: credit && s.supplier.debt === 0 ? s.day + RASHID_PROFILE.creditDays : s.supplier.debtDue,
              lastLine: line,
            },
            ledger: [...s.ledger, { day: s.day, kind: credit ? 'debt' : 'purchase', label: `Bought ${t.name} (${o.condition}) from Rashid${credit ? ' on credit' : ''}`, amount: credit ? 0 : -o.price, cost: o.price }],
            goals: credit ? goalsFor(s.day, { commission: s.commissions.find((c) => !c.done)?.label, debt: s.supplier.debt + o.price, visitors: s.queue.length }) : s.goals,
          });
          audio.sfx(credit ? 'pen' : 'coins');
          return line;
        },

        haggle: (uid) => {
          const s = get();
          const o = s.supplier.offers.find((x) => x.uid === uid);
          if (!o || o.haggled) return '';
          const win = rng() < 0.35 + s.supplier.trust / 200;
          const line = win ? pick(RASHID.haggleWin, rng) : pick(RASHID.haggleLose, rng);
          set({
            supplier: {
              ...s.supplier,
              trust: win ? s.supplier.trust : Math.max(0, s.supplier.trust - 3),
              offers: s.supplier.offers.map((x) => (x.uid === uid ? { ...x, haggled: true, price: win ? snap(x.price * 0.85) : x.price } : x)),
              lastLine: line,
            },
          });
          audio.sfx(win ? 'coin' : 'tap');
          return line;
        },

        payDebt: () => {
          const s = get();
          const amt = Math.min(s.cash, s.supplier.debt);
          if (amt <= 0) return;
          const debt = s.supplier.debt - amt;
          set({
            cash: s.cash - amt,
            supplier: { ...s.supplier, debt, trust: Math.min(100, s.supplier.trust + (debt === 0 ? 8 : 2)), lastLine: debt === 0 ? RASHID.debtPaid[0] : RASHID.debtDue[0].replace('{amount}', String(debt)) },
            ledger: [...s.ledger, { day: s.day, kind: 'debt', label: 'Paid Uncle Rashid', amount: -amt }],
            goals: debt === 0 ? s.goals.filter((g) => g.kind !== 'payRashid') : s.goals,
          });
          audio.sfx('coins');
        },

        payFamily: (amount) => {
          const s = get();
          const f = s.family ?? FAMILY_START;
          const amt = Math.min(s.cash, amount, f.left);
          if (amt <= 0) return;
          const left = f.left - amt;
          const due = Math.max(0, f.due - amt);
          set({
            cash: s.cash - amt,
            family: { left, due, since: due > 0 ? f.since : 0, paid: f.paid + amt },
            supplier: { ...s.supplier, trust: Math.min(100, s.supplier.trust + (left === 0 ? 10 : 1)), lastLine: left === 0 ? RASHID.familyPaid[0] : RASHID.familyPart[Math.floor(Math.random() * RASHID.familyPart.length)] },
            ledger: [...s.ledger, { day: s.day, kind: 'debt', label: "Paid towards father's debt to Rashid", amount: -amt }],
          });
          audio.sfx('coins');
        },

        restore: (uid) => {
          const s = get();
          const i = s.inventory.find((x) => x.uid === uid);
          if (!i) return;
          const r = RESTORATION[i.condition];
          const cost = Math.round(restorePrice(i) * (1 - Math.min(0.4, levelOf(s.skills?.craft ?? 0) * 0.02)) * (i.condition === 'Dirty' && hasPerk(s.skills?.craft, 'craft', 5) ? 0.7 : 1));
          if (!r || s.cash < cost || i.restoringUntil) return;
          set({
            cash: s.cash - cost,
            inventory: s.inventory.map((x) => (x.uid === uid ? { ...x, restoringUntil: s.day + r.days, restoreTo: r.to } : x)),
            ...growth(s, { craft: 6 }),
            ledger: [...s.ledger, { day: s.day, kind: 'restoration', label: `${r.label}: ${RUGS[i.typeId].name}`, amount: -cost }],
            dayStats: { ...s.dayStats, expenses: s.dayStats.expenses + cost },
          });
          audio.sfx('brush');
        },

        buyUpgrade: (id) => {
          const s = get();
          const u = UPGRADES.find((x) => x.id === id);
          if (!u || s.upgrades.includes(id) || s.cash < u.cost || s.reputation < (u.rep ?? 0) || (u.after && !s.upgrades.includes(u.after))) return;
          set({
            cash: s.cash - u.cost,
            upgrades: [...s.upgrades, id],
            ledger: [...s.ledger, { day: s.day, kind: 'upgrade', label: u.name, amount: -u.cost }],
            journal: [...s.journal, { day: s.day, text: `Bought ${u.name.toLowerCase()} for the stall.` }],
          });
          audio.sfx('chest');
        },

        setSetting: (c, on) => {
          const settings = { ...get().settings, [c]: on };
          audio.setToggles(settings);
          if (c === 'ambience') on && get().started ? audio.startAmbience() : audio.stopAmbience();
          if (c === 'music') {
            if (!on) audio.stopMusic();
            else if (get().started) audio.startMusic('stall');
          }
          set({ settings });
        },

        reset: () => {
          audio.stopAll();
          set({ ...initial() });
        },
      };
    },
    {
      name: 'threads-of-fortune-save',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => {
        const { encounter, dayOver, seed, audienceStash, held, ...rest } = s as GameState & Actions;
        void encounter; void dayOver; void seed; void audienceStash; void held;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') out[k] = v;
        return out as unknown as GameState & Actions;
      },
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        if (version < 13) {
          // clothes are sold piece by piece now; old whole outfits become their pieces
          const a = p.attire ?? { owned: ['galabiya'], worn: 'galabiya', clean: 100 };
          p.wardrobe = wardrobeFromLegacy(a.owned, a.worn);
        }
        if (version < 3) {
          p.world = initialWorld();
        }
        if (version < 6 && p.world?.party) {
          const old = p.world.party as unknown as { camels?: number; horses?: number; animals?: Record<string, number> };
          if (!old.animals) {
            const animals: Record<string, number> = {};
            if (old.camels) animals.falahi = old.camels;
            if (old.horses) animals.baladi_h = old.horses;
            p.world = { ...p.world, party: { ...p.world.party, animals } };
          }
        }
        if (version < 5 && p.world) {
          // the map was redrawn on real geography: keep the caravan, quests and friends, restart position and fog
          const fresh = initialWorld();
          p.world = { ...fresh, party: p.world.party ?? fresh.party, hired: p.world.hired ?? {}, quests: p.world.quests ?? {}, rumours: p.world.rumours ?? [], friends: p.world.friends ?? [], appraised: p.world.appraised ?? [], boughtLocal: p.world.boughtLocal ?? [] };
        }
        if (version < 4 && p.world) {
          p.world = { ...p.world, party: p.world.party ?? startingParty(), hired: p.world.hired ?? {}, parties: spawnParties(rng) };
          p.inventory = (p.inventory ?? []).map((i) => ({ ...i, stored: i.stored ?? true }));
        }
        if (version < 7) {
          p.court = p.court ?? { last: {}, warrants: [] };
          if (p.world) p.world = { ...p.world, known: [...new Set([...(p.world.known ?? []), 'amman', 'ankara'])] };
        }
        if (version < 8) {
          // 1925 prices: the economy moved to real Egyptian money. Keep progress, re-cost the stock.
          const scale = (v?: number) => Math.round((v ?? 0) * 3);
          p.cash = scale(p.cash ?? 120);
          p.inventory = (p.inventory ?? []).filter((i) => RUGS[i.typeId]).map((i) => ({ ...i, paid: snap(RUGS[i.typeId].dealerCost * CONDITION_FACTOR[i.condition]) }));
          if (p.supplier) p.supplier = { ...p.supplier, debt: Math.min(1500, scale(p.supplier.debt)), offers: rashidStock(p.day ?? 1, rng, p.reputation ?? 0) };
          p.register = [...new Set([...(p.register ?? []), 'desert-star', 'cairo-garden', 'fayoum-hearth', ...(p.inventory ?? []).map((i) => i.typeId)])];
          p.goals = goalsFor(p.day ?? 1, { debt: p.supplier?.debt ?? 0, visitors: p.queue?.length ?? 3 });
          if (p.world) {
            // the World map is now the painted travel map: same towns, new positions, fresh fog
            const at = p.world.at && SETTLEMENTS.some((x) => x.id === p.world!.at) ? p.world.at : 'giza';
            const st = settlementById(at);
            let fog = initialWorld().fog;
            fog = revealFog(fog, st, 9);
            p.world = { ...p.world, at, x: st.x, y: st.y, fog, parties: spawnParties(rng) };
          }
          p.journal = [...(p.journal ?? []), { day: p.day ?? 1, text: 'Prices in the book are now kept in piastres and Egyptian pounds, at the rates of 1925.' }];
        }
        if (version < 12 && p.world) {
          // raiders now watch the roads beyond the Nile valley
          p.world = { ...p.world, parties: [...(p.world.parties ?? []).filter((x) => !x.id.startsWith('rb')), ...spawnRoadBands(rng)] };
        }
        if (version < 11) {
          p.relationships = { ...Object.fromEntries(BUYER_ORDER.map((b) => [b, emptyRel()])), ...(p.relationships ?? {}) };
        }
        if (version < 10) {
          p.missions = p.missions ?? {};
          p.skills = p.skills ?? {};
          p.manner = p.manner ?? { ...START_MANNER };
          p.attire = p.attire ?? { owned: ['galabiya'], worn: 'galabiya', clean: 100 };
          p.books = p.books ?? [];
          p.levelUps = [];
          p.titles = p.titles ?? [];
          p.stats = p.stats ?? {};
          p.titleNews = [];
          p.tipsSeen = p.tipsSeen ?? (p.guideSeen ? ['map', 'town', 'road', 'rashid', 'stock'] : []);
        }
        if (version < 9) {
          // the 24-rug pack replaced the catalogue: map retired rugs onto the nearest piece of the same standing
          const MAP: Record<string, string> = { hasira: 'nile-reed', kerdasa: 'village-kilim-canal', 'bedouin-strip': 'village-kilim-canal', wilton: 'canal-ferry-rug', yastik: 'delta-house', baluch: 'jerusalem-stone', kazak: 'anatolian-hearth', qashqai: 'cedar-caravan', ladik: 'konya-prayer-rug', sarouk: 'golden-palm', heriz: 'moroccan-ember', tabriz: 'caucasus-eagle', isfahan: 'sapphire-night', hereke: 'istanbul-tulip', 'kashan-silk': 'damascus-rose', ushak: 'istanbul-tulip', polonaise: 'baghdad-night', mamluk: 'baghdad-night' };
          p.inventory = (p.inventory ?? []).map((i) => {
            const typeId = i.uid === 'start-dr' ? 'fayoum-hearth' : MAP[i.typeId] ?? i.typeId;
            return RUGS[typeId] ? { ...i, typeId, paid: typeId === i.typeId ? i.paid : snap(RUGS[typeId].dealerCost * CONDITION_FACTOR[i.condition]) } : null;
          }).filter(Boolean) as RugItem[];
          p.register = [...new Set([...(p.register ?? []).map((id) => MAP[id] ?? id), 'desert-star', 'cairo-garden', 'fayoum-hearth', ...p.inventory.map((i) => i.typeId)])].filter((id) => RUGS[id]);
          if (p.supplier) p.supplier = { ...p.supplier, offers: rashidStock(p.day ?? 1, rng, p.reputation ?? 0) };
        }
        if (version < 2) {
          // v1 saves had no settings or commissions
          p.settings = p.settings ?? { dialogue: true, music: true, sfx: true, ambience: true };
          p.commissions = p.commissions ?? [];
        }
        return p as GameState & Actions;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A visit in progress is not saved; the same buyer returns on reload.
        if (state.started && !state.tutorial.done) {
          state.tutorial = { done: false, step: 'room', inspected: false };
        }
      },
    },
  ),
);

// Riding and Survival change how the caravan travels.
const syncSkillMods = (s: GameState) => {
  const r = levelOf(s.skills?.riding ?? 0), v = levelOf(s.skills?.survival ?? 0);
  SKILL_MODS.speed = 1 + r * 0.01 + (hasPerk(s.skills?.riding, 'riding', 5) ? 0.05 : 0) + (hasPerk(s.skills?.riding, 'riding', 15) ? 0.08 : 0);
  SKILL_MODS.food = 1 - Math.min(0.3, v * 0.01 + (hasPerk(s.skills?.survival, 'survival', 5) ? 0.1 : 0));
};
syncSkillMods(useGame.getState());
useGame.subscribe(syncSkillMods);

// Main missions finish themselves when their condition is met.
useGame.subscribe((s) => {
  if (!s.started) return;
  const id = MAIN_ORDER.find((m) => s.missions?.[m] === 'active');
  if (!id || id === 'alexandria') return;
  const m = MISSIONS[id];
  const done = id === 'house' ? houseOfFortune(s).done : m.check?.(s as never);
  if (!done) return;
  useGame.setState({
    missions: { ...s.missions, [id]: 'done' },
    missionNews: `${id}-done`,
    cash: s.cash + m.reward.cash,
    reputation: s.reputation + m.reward.rep,
    supplier: { ...s.supplier, trust: Math.min(100, s.supplier.trust + m.reward.trust) },
    journal: [...s.journal, { day: s.day, text: `Mission complete: ${m.title}.`, kind: 'mission' }],
    ledger: m.reward.cash ? [...s.ledger, { day: s.day, kind: 'bonus', label: `Mission: ${m.title}`, amount: m.reward.cash }] : s.ledger,
  });
  audio.sfx('chest');
});

// Titles are checked whenever the state changes, and announced once.
useGame.subscribe((s) => {
  if (!s.started) return;
  const have = s.titles ?? [];
  const fresh = TITLES.filter((t) => !have.includes(t.id) && t.test(s as unknown as TitleCtx)).map((t) => t.id);
  if (!fresh.length) return;
  useGame.setState({ titles: [...have, ...fresh], titleNews: [...(s.titleNews ?? []), ...fresh], journal: [...s.journal, ...fresh.map((id) => ({ day: s.day, text: `Earned the title: ${TITLES.find((t) => t.id === id)!.name}.` }))] });
});

// Every rug that comes into stock is entered in the Carpet Register.
useGame.subscribe((s) => {
  const reg = s.register ?? [];
  const fresh = [...new Set(s.inventory.map((i) => i.typeId).filter((id) => !reg.includes(id)))];
  if (!fresh.length) return;
  useGame.setState({
    register: [...reg, ...fresh],
    journal: [...s.journal, ...fresh.map((id) => ({ day: s.day, text: `Entered the ${RUGS[id].name} in the Carpet Register (${RUGS[id].tier === 4 ? 'a treasure' : `tier ${RUGS[id].tier ?? 1}`}).` }))],
  });
});

export { tierOf, dateFor };
export type { Encounter };
