// Nabil al-Khatib's rules on top of the ordinary haggle (docs/handoff/NABIL_BUYER_FOR_CLAUDE_v2.md).
// Pure functions: the store keeps his memory, negotiation.ts asks these for his ceiling and reasons.
import type { RugItem, RugType } from '../types';
import { CONDITION_FACTOR } from '../../data/rugs';

export interface NabilMemory {
  visits: number;
  /** his own trust in you, 0..100, on the same scale as an encounter's trust */
  trust: number;
  /** rugs he has looked at and turned down, keyed by uid and condition so a changed rug is new */
  seenRugIds: string[];
  /** faults you told him about before he had to find them */
  disclosedFaultIds: string[];
  /** stories he checked and found untrue */
  brokenPromiseIds: string[];
  lastOfferDay?: number;
  /** he left after bluffing: he stays away longer */
  leftAngry?: boolean;
  lastVisitDay?: number;
}
export const NABIL_START: NabilMemory = { visits: 0, trust: 40, seenRugIds: [], disclosedFaultIds: [], brokenPromiseIds: [] };

/** the key he remembers a rug by: the same rug in a changed state is a different proposition */
export const rugKey = (i: RugItem) => `${i.uid}:${i.condition}${i.restored ? ':r' : ''}`;

const RARITY: Record<number, number> = { 1: 0, 2: 2, 3: 4.5, 4: 7 };

/**
 * His ceiling for a rug: market value, lifted by rarity, scaled by condition and evidence, cut hard by a
 * repair you did not mention. Never shown to the player; the reason is.
 */
export function nabilAssessment(t: RugType, item: RugItem, o: { repairDisclosed: boolean; repeatedPitchCount: number; labReport?: boolean }) {
  const marketValue = (t.valueBand[0] + t.valueBand[1]) / 2;
  const rarityPremium = Math.max(0, Math.min(0.28, (RARITY[t.tier ?? 1] ?? 0) * 0.04));
  const conditionFactor = Math.max(0.55, Math.min(1.05, CONDITION_FACTOR[item.condition]));
  const prov = item.provenance === 'Documented' ? 'documented' : item.provenance === 'Likely' ? 'plausible' : 'unknown';
  // Arran's signed report helps a little: it shows what the rug is made of, not where it has been
  const evidenceFactor = (prov === 'documented' ? 1.1 : prov === 'plausible' ? 1 : 0.88) + (o.labReport ? 0.03 : 0);
  const hidden = item.restored;
  const honestyFactor = hidden && !o.repairDisclosed ? 0.78 : hidden && o.repairDisclosed ? 1.03 : 1;
  const ceiling = Math.max(0, Math.round(marketValue * (1 + rarityPremium) * conditionFactor * evidenceFactor * honestyFactor));
  const patienceCost = Math.max(0, o.repeatedPitchCount - 1);
  const reason = hidden && !o.repairDisclosed
    ? 'An undisclosed repair weakens the offer.'
    : prov === 'unknown'
      ? 'The history is uncertain.'
      : item.condition === 'Worn' || item.condition === 'Damaged' || item.condition === 'Dirty'
        ? 'He prices in the wear.'
        : 'He values the quality and the evidence.';
  return { ceiling, patienceCost, reason };
}

/** a "new price" that barely moves is a token change */
export const isTokenChange = (prev: number | undefined, next: number) => !!prev && Math.abs(prev - next) / prev < 0.03;

/**
 * Whether he comes to the stall today: only once your name is worth his hour, not every day, and
 * later if he left after bluffing. Returning after fair dealing is sooner.
 */
export function nabilDue(m: NabilMemory | undefined, day: number, reputation: number, minRep: number, roll: number) {
  if (reputation < minRep) return false;
  const mem = m ?? NABIL_START;
  if (mem.lastVisitDay == null) return roll < 0.5;
  const gap = mem.leftAngry ? 9 : 4;
  return day - mem.lastVisitDay >= gap && roll < 0.55;
}

/** A two-rug package: his offer for both, a little under the sum, with the reason spelled out. */
export function packageOffer(a: number, b: number) {
  return Math.round((a + b) * 0.94 / 5) * 5;
}
