import type { AuctionBidder, AuctionHouse, AuctionLot, AuctionSession } from './types';

export const PIASTRES_PER_EGYPTIAN_POUND = 100;

export function formatAuctionMoney(pt: number): string {
  if (Math.abs(pt) < 100) return `${pt} pt`;
  const pounds = pt / 100;
  return `£E${Number.isInteger(pounds) ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

export function canAttendAuction(_house: AuctionHouse, _cashPt: number): boolean {
  // Core design rule: wealth NEVER blocks entry.
  return true;
}

export function canAffordBid(cashPt: number, bidPt: number, buyerPremiumPct: number): boolean {
  const total = Math.ceil(bidPt * (1 + buyerPremiumPct));
  return cashPt >= total;
}

export function totalAuctionCost(bidPt: number, buyerPremiumPct: number): number {
  return Math.ceil(bidPt * (1 + buyerPremiumPct));
}

export function suggestedIncrement(currentBidPt: number, tier: 'small' | 'grand'): number {
  const pct = tier === 'small' ? 0.05 : 0.025;
  const raw = Math.max(5, currentBidPt * pct);
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

export function bidderCeiling(
  bidder: AuctionBidder,
  lot: AuctionLot,
  targetMatch: boolean
): number {
  const midpoint = (lot.estimateMinPt + lot.estimateMaxPt) / 2;
  const interest = targetMatch ? 1 + bidder.aggression * 0.22 : 0.72 + bidder.aggression * 0.12;
  return Math.round(Math.min(
    bidder.liquidBudgetPt,
    midpoint * bidder.hardStopMultiplier * interest
  ));
}

export function npcWillRaise(
  bidder: AuctionBidder,
  lot: AuctionLot,
  nextBidPt: number,
  targetMatch: boolean,
  random01: number
): boolean {
  const ceiling = bidderCeiling(bidder, lot, targetMatch);
  if (nextBidPt > ceiling) return false;
  const urgency = targetMatch ? 0.45 + bidder.aggression * 0.45 : 0.20 + bidder.aggression * 0.30;
  return random01 < urgency;
}

export function recordObservedSale(
  session: AuctionSession,
  lot: AuctionLot,
  salePricePt: number
): AuctionSession {
  // Watching is gameplay: every observed sale improves market intelligence.
  const rarityBonus =
    salePricePt >= 14000 ? 3 :
    salePricePt >= 2200 ? 2 : 1;

  return {
    ...session,
    marketIntelEarned: session.marketIntelEarned + rarityBonus,
  };
}

export function settlePlayerWin(
  cashPt: number,
  bidPt: number,
  buyerPremiumPct: number
): { cashAfterPt: number; totalPaidPt: number } {
  const totalPaidPt = totalAuctionCost(bidPt, buyerPremiumPct);
  if (cashPt < totalPaidPt) throw new Error('Player cannot afford settlement.');
  return { cashAfterPt: cashPt - totalPaidPt, totalPaidPt };
}

export function shouldReofferUnsoldLot(random01: number, houseTier: 'small' | 'grand'): boolean {
  // Unsold lots can become future opportunities.
  return random01 < (houseTier === 'small' ? 0.55 : 0.35);
}

export function reducedReserveForReoffer(oldReservePt: number, timesUnsold: number): number {
  const reduction = Math.min(0.30, 0.08 * Math.max(1, timesUnsold));
  return Math.max(5, Math.round(oldReservePt * (1 - reduction) / 5) * 5);
}
