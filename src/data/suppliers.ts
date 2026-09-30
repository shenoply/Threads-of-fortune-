import type { Condition } from '../game/types';

export interface StockTemplate {
  typeId: string;
  weight: number;
  conditions: { c: Condition; w: number }[];
  /** Rashid keeps his better pieces back until your name is worth something. */
  minRep?: number;
}

export const RASHID_PROFILE = {
  id: 'rashid',
  name: 'Uncle Rashid',
  role: 'Wholesaler, Wikalat el-Ghuri, Cairo',
  bio: 'Loud, old and merciless with his tongue, he roasts you daily, sold to your father for thirty years, and would never admit he loves you.',
  creditLimit: 1500,
  creditDays: 5,
};

/** Credit grows with trust and reputation: fifteen pounds to start, up to two hundred. */
export const rashidCredit = (trust: number, rep: number) =>
  trust < 20 ? 0 : Math.min(20000, Math.round((RASHID_PROFILE.creditLimit * (1 + Math.max(0, trust - 20) / 40) + rep * 150) / 100) * 100);

const good = (g = 3, w = 1, d = 1): { c: Condition; w: number }[] => [{ c: 'Good', w: g }, { c: 'Worn', w }, { c: 'Dirty', w: d }];

export const RASHID_POOL: StockTemplate[] = [
  { typeId: 'nile-reed', weight: 3, conditions: [{ c: 'Good', w: 2 }, { c: 'Dirty', w: 2 }] },
  { typeId: 'village-kilim-canal', weight: 3, conditions: good() },
  { typeId: 'delta-house', weight: 3, conditions: good() },
  { typeId: 'fayoum-hearth', weight: 2, conditions: good(1, 2, 1) },
  { typeId: 'red-medina', weight: 3, conditions: good() },
  { typeId: 'date-palm-runner', weight: 2, conditions: good(3, 1, 0) },
  { typeId: 'tanta-courtyard', weight: 2, conditions: good(2, 0, 2) },
  { typeId: 'canal-ferry-rug', weight: 2, conditions: good() },
  { typeId: 'desert-star', weight: 2, conditions: [{ c: 'Good', w: 2 }, { c: 'Damaged', w: 1 }], minRep: 3 },
  { typeId: 'cairo-garden', weight: 1, conditions: [{ c: 'Good', w: 1 }, { c: 'Dirty', w: 2 }], minRep: 5 },
  { typeId: 'jaffa-citrus', weight: 1, conditions: good(), minRep: 8 },
  { typeId: 'cedar-caravan', weight: 1, conditions: good(1, 2, 0), minRep: 8 },
  { typeId: 'anatolian-hearth', weight: 1, conditions: good(2, 1, 0), minRep: 12 },
  { typeId: 'moroccan-ember', weight: 1, conditions: good(3, 1, 0), minRep: 20 },
  { typeId: 'golden-palm', weight: 1, conditions: good(3, 1, 0), minRep: 25 },
];

export const RESTORATION: Record<Condition, { label: string; cost: number; days: number; to: Condition } | null> = {
  Excellent: null,
  Good: null,
  Worn: { label: 'Re-fringe and re-pile the worn edge', cost: 8, days: 1, to: 'Good' },
  Dirty: { label: 'Wash in the courtyard and dry in the sun', cost: 3, days: 1, to: 'Good' },
  Damaged: { label: 'Reweave the damaged section', cost: 15, days: 2, to: 'Good' },
};

/** Restorers charge by the value of the piece: cost above is a percentage of the rug's market value. */
export function restoreCost(value: number, c: Condition) {
  const r = RESTORATION[c];
  if (!r) return 0;
  const raw = (value * r.cost) / 100;
  return raw < 100 ? Math.max(2, Math.round(raw)) : Math.round(raw / 25) * 25;
}

export interface Upgrade { id: string; name: string; cost: number; effect: string; rep?: number; after?: string; stall?: boolean }
export const UPGRADES: Upgrade[] = [
  { id: 'tea', name: 'Tea service', cost: 150, effect: 'Offer tea: +15 patience once per buyer' },
  { id: 'ledgerbook', name: 'Proper ledger book', cost: 100, effect: 'Tighter market estimates in the inspector and price dial' },
  { id: 'display', name: 'Rug display pole', cost: 250, effect: 'Better first impression: +8 interest when a rug is presented' },
  { id: 'mat', name: 'A rug mat of your own', cost: 1000, rep: 8, stall: true, effect: 'No longer a borrowed corner. Buyers arrive with more trust (+6). Rent £0.05 a day.' },
  { id: 'bazaar', name: 'Bazaar stall with canopy', cost: 5000, rep: 20, after: 'mat', stall: true, effect: 'Shade and a proper counter. +10 patience, budgets 8% higher. Rent £0.12 a day.' },
  { id: 'khan', name: 'A shop in Khan el-Khalili', cost: 60000, rep: 60, after: 'bazaar', stall: true, effect: 'Your own shop in the great bazaar of Cairo. Richer buyers, budgets 25% higher, +15 patience. Rent £0.40 a day.' },
];

/** Daily rent by stall: a borrowed corner, a mat, a canopied stall, a shop in the Khan. */
export const rentFor = (up: string[]) => (up.includes('khan') ? 40 : up.includes('bazaar') ? 12 : up.includes('mat') ? 5 : 2);

export const EXPENSES = { rent: 2, food: 1 };
