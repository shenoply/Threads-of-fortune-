// UI contract for the auction screen.
// Important: the player may attend while too poor to buy anything.

export const AUCTION_UI_RULES = {
  noVerticalScrollDuringActiveBidding: true,
  showCurrentCashAtAllTimes: true,
  showEstimateBand: true,
  showCurrentBid: true,
  showNextBidCost: true,
  showAffordabilityWithoutHidingLot: true,
  allowWatchNextBid: true,
  allowDropOut: true,
  allowInspectBeforeBidding: true,
  unaffordableCopy: 'You may keep watching this lot.',
} as const;

/*
Recommended active-auction viewport:

TOP:
city / venue / lot # / cash

SCENE (largest area):
floor POV artwork
+ current rug held/displayed at front
+ auctioneer
+ visible bidder reactions

LOT STRIP:
rug name / origin / provenance / condition / estimate

BOTTOM ACTIONS:
[Inspect] [Bid +X] [Hold] [Watch next bid]

If player cannot afford Bid +X:
- disable only the bid action
- NEVER kick player out
- NEVER hide the lot
- Watch next bid remains active
*/
