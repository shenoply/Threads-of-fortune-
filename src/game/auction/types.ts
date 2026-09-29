export type AuctionTier = 'small' | 'grand';
export type RugTier = 'COMMON' | 'FINE' | 'EXCEPTIONAL' | 'LEGENDARY' | 'ARTIFACT';

export interface AuctionHouse {
  id: string;
  city: string;
  displayName: string;
  tier: AuctionTier;
  district: string;
  entryFeePt: number;
  cadenceMinDays: number;
  cadenceMaxDays: number;
  lotMin: number;
  lotMax: number;
  buyerPremiumPct: number;
  tierWeights: Partial<Record<RugTier, number>>;
  themes: string[];
  historicalNote: string;
  venueMap: string;
  floorPov: string;
  /** an establishing picture of the room in full session, shown with the catalogue before you take a seat */
  introPov?: string;
  floorPovTemporaryReuse: boolean;
  attendance: 'ALWAYS_ALLOWED';
}

export interface AuctionLot {
  id: string;
  rugId: string;
  estimateMinPt: number;
  estimateMaxPt: number;
  reservePt: number;
  openingBidPt: number;
  currentBidPt: number;
  currentBidderId?: string;
  sold: boolean;
  soldPricePt?: number;
  provenanceConfidence: 'Documented' | 'Likely' | 'Uncertain' | 'Disputed';
  conditionModifier: number;
}

export interface AuctionBidder {
  id: string;
  displayName: string;
  liquidBudgetPt: number;
  aggression: number; // 0..1
  targetTags: string[];
  hardStopMultiplier: number;
}

export interface AuctionSession {
  auctionHouseId: string;
  day: number;
  lots: AuctionLot[];
  currentLotIndex: number;
  playerMode: 'WATCHING' | 'BIDDING';
  playerHasBidThisLot: boolean;
  marketIntelEarned: number;
}
