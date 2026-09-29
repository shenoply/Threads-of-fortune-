export type Trait =
  | 'restrained' | 'bold' | 'warm' | 'cool' | 'hardwearing' | 'washable'
  | 'darkField' | 'lightField' | 'fineWeave' | 'antique' | 'silk' | 'wool'
  | 'story' | 'ornate' | 'humble' | 'rare' | 'soft' | 'fragile' | 'flatweave';

export type Provenance = 'Documented' | 'Likely' | 'Uncertain' | 'Disputed';
export type Condition = 'Excellent' | 'Good' | 'Worn' | 'Dirty' | 'Damaged';
export type ColourFamily = 'crimson' | 'indigo' | 'ivory' | 'gold' | 'mixed';

export type RugArt =
  | { kind: 'photo'; src: string }
  | { kind: 'woven'; seed: number; layout: 'medallion' | 'lattice' | 'kilim'; palette: string[] };

export interface RugType {
  id: string;
  name: string;
  origin: string;
  material: string;
  age: string;
  size: string;
  colourFamily: ColourFamily;
  colourWords: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Treasure';
  /** 1 everyday, 2 trade rugs, 3 city carpets, 4 treasures */
  tier?: 1 | 2 | 3 | 4;
  provenance: Provenance;
  dealerCost: number;
  valueBand: [number, number];
  asking: number;
  traits: Trait[];
  history: string;
  storyLine: string;
  craftLine: string;
  durabilityLine: string;
  weave: { knot: string; kpsi: string; foundation: string };
  fringe: string;
  backNote: string;
  art: RugArt;
}

export interface RugItem {
  uid: string;
  typeId: string;
  condition: Condition;
  restored: boolean;
  provenance: Provenance;
  paid: number;
  restoringUntil?: number;
  restoreTo?: Condition;
  stored?: boolean; // left at the Giza stall instead of travelling with the caravan
  notes: string[];
}

export type Stage = 'discovery' | 'qualification' | 'presentation' | 'objection' | 'bargaining' | 'close';

export type Speaker = 'seller' | 'buyer' | 'narrator' | 'saffron' | 'system';

export interface Line {
  speaker: Speaker;
  text: string;
  mood?: 'pleased' | 'skeptical' | 'neutral' | 'leaving' | 'warm';
}

export type ArgKind = 'story' | 'craft' | 'fit' | 'durability';

export interface Priority {
  id: string;
  label: string;
}

export interface ObjectionDef {
  id: string;
  when: (t: RugType, item: RugItem) => boolean;
  text: string;
  honest: string; // buyer reply when seller acknowledges honestly
  facts: string; // reply when seller argues with facts
  factsWorks: boolean;
}

export interface DialoguePool {
  arrival: string[];
  greeting: string[];
  repeat: string[];
  room: string[];
  drawnTo: string[];
  budgetEarly: string[];
  budgetLate: string[];
  decider: string[];
  smallTalk: string[];
  tea: string[];
  earlyPresent: string[];
  rugGood: string[];
  rugNeutral: string[];
  rugBad: string[];
  colour: Record<ColourFamily, string>;
  condition: { dirty: string; worn: string; damaged: string };
  story: { good: string[]; flat: string[] };
  craft: { good: string[]; flat: string[] };
  fit: { good: string[]; flat: string[] };
  durability: { good: string[]; flat: string[] };
  repeatArg: string[];
  embellishBelieved: string[];
  embellishCaught: string[];
  priceLow: string[];
  priceFair: string[];
  priceHigh: string[];
  priceInsult: string[];
  counter: string[];
  holdGive: string[];
  holdRefuse: string[];
  sweetener: string[];
  impatience: string[];
  success: string[];
  badSale: string[];
  walkAway: string[];
  /** a last price named before leaving; the stock lines serve when absent */
  finalOffer?: string[];
  saffron: string[];
  commission: string[];
  commissionDone: string[];
  referral: string[];
  rare: string[];
  embellishLater: string[];
  previousRug: string[];
  concession: string[];
  catPet: string[];
}

export interface BuyerNeed {
  id: string;
  label: string;
  room: string[];
  values: Partial<Record<Trait, number>>;
  colourPref: Partial<Record<ColourFamily, number>>;
  budget: [number, number];
  priorities: Priority[];
}

export interface BuyerDef {
  id: string;
  name: string;
  role: string;
  bio: string;
  budget: [number, number];
  patience: number;
  trust: number;
  interest: number;
  values: Partial<Record<Trait, number>>;
  colourPref: Partial<Record<ColourFamily, number>>;
  args: Record<ArgKind, number>;
  priorities: { room: Priority[]; drawn: Priority[] };
  directBudgetTrust: number;
  pushyTrust: number;
  embellishNotice: number;
  catAffinity: number;
  objections: ObjectionDef[];
  lines: DialoguePool;
  commission?: { traits: string[]; label: string; bonus: number; wants: (t: RugType, i: RugItem) => boolean };
  needs: BuyerNeed[];
  silhouette: 'samira' | 'fez' | 'scarf';
  accent: string;
  roomWord?: string; // what 'Ask about the room' calls their space
  royal?: { venue: string; minRep: number; focusY: number; warrant: string };
}

export interface Relationship {
  visits: number;
  purchases: number;
  spent: number;
  affinity: number;
  lastRug?: string;
  lastPurchaseDay?: number;
  bad: number;
  embellishedSale?: boolean;
  embellishMentioned?: boolean;
  commissionOffered?: boolean;
  commissionDone?: boolean;
  referred?: boolean;
  lastLines: string[];
}

export interface LedgerEntry {
  day: number;
  kind: 'sale' | 'purchase' | 'expense' | 'restoration' | 'debt' | 'upgrade' | 'bonus';
  label: string;
  amount: number; // + income, - spend
  cost?: number;
}

export interface SupplierOffer {
  uid: string;
  typeId: string;
  condition: Condition;
  price: number;
  tag?: 'Rare' | 'Damaged' | 'Limited' | 'Dirty' | 'Worn';
  haggled?: boolean;
  leavesAfterDay?: number;
  /** how many of this rug he has today */
  qty?: number;
}

export interface Goal {
  id: string;
  label: string;
  target: number;
  kind: 'sales' | 'gross' | 'commission' | 'payRashid';
  /** stable value to match progress against, for a goal whose display label carries extra text (a
   *  deadline, say) that the thing being matched does not have. Falls back to label when absent. */
  key?: string;
}
