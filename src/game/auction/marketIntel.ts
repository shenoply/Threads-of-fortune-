export interface MarketIntelRecord {
  rugFamily: string;
  observations: number;
  confidence: number; // 0..1
  lastObservedPricePt?: number;
  movingAveragePt?: number;
}

export function applyAuctionObservation(
  record: MarketIntelRecord,
  salePricePt: number
): MarketIntelRecord {
  const observations = record.observations + 1;
  const previousAvg = record.movingAveragePt ?? salePricePt;
  const movingAveragePt = Math.round(
    previousAvg + (salePricePt - previousAvg) / Math.min(observations, 6)
  );

  return {
    ...record,
    observations,
    confidence: Math.min(1, record.confidence + 0.08),
    lastObservedPricePt: salePricePt,
    movingAveragePt,
  };
}
