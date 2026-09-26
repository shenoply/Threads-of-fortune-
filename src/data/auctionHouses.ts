import type { AuctionHouse } from '../game/auction/types';

export const AUCTION_HOUSES: AuctionHouse[] = [
  {
    "id": "cairo-khan",
    "city": "cairo",
    "displayName": "Khan el-Khalili Dealer Room",
    "tier": "small",
    "district": "Khan el-Khalili",
    "entryFeePt": 0,
    "cadenceMinDays": 2,
    "cadenceMaxDays": 4,
    "lotMin": 5,
    "lotMax": 8,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.55,
      "FINE": 0.35,
      "EXCEPTIONAL": 0.1,
      "LEGENDARY": 0.0
    },
    "themes": [
      "estate leftovers",
      "dealer consignments",
      "damaged rugs",
      "bundle lots"
    ],
    "historicalNote": "Fictional auction venue grounded in the real Khan el-Khalili trading environment.",
    "venueMap": "/art/auction/venues/cairo-small-map.webp",
    "floorPov": "/art/auction/pov/cairo-small-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "cairo-garden-city",
    "city": "cairo",
    "displayName": "Garden City Pasha Estate Sale",
    "tier": "grand",
    "district": "Garden City",
    "entryFeePt": 0,
    "cadenceMinDays": 7,
    "cadenceMaxDays": 14,
    "lotMin": 8,
    "lotMax": 14,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.4,
      "EXCEPTIONAL": 0.45,
      "LEGENDARY": 0.14,
      "ARTIFACT": 0.01
    },
    "themes": [
      "aristocratic estates",
      "salon furnishings",
      "documented provenance",
      "royal-adjacent collections"
    ],
    "historicalNote": "Fictional estate-auction venue using a period-appropriate Garden City mansion setting.",
    "venueMap": "/art/auction/venues/cairo-grand-map.webp",
    "floorPov": "/art/auction/pov/cairo-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "alexandria-attarine",
    "city": "alexandria",
    "displayName": "Attarine Warehouse Auction",
    "tier": "small",
    "district": "Attarine / port trade",
    "entryFeePt": 0,
    "cadenceMinDays": 2,
    "cadenceMaxDays": 4,
    "lotMin": 5,
    "lotMax": 9,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.45,
      "FINE": 0.45,
      "EXCEPTIONAL": 0.1,
      "LEGENDARY": 0.0
    },
    "themes": [
      "port consignments",
      "shipping damage",
      "mixed bales",
      "hotel clearances"
    ],
    "historicalNote": "Fictional venue inspired by Alexandria's cosmopolitan port and market economy.",
    "venueMap": "/art/auction/venues/alexandria-small-map.webp",
    "floorPov": "/art/auction/pov/alexandria-small-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "alexandria-ramleh",
    "city": "alexandria",
    "displayName": "Ramleh Villa Estate Sale",
    "tier": "grand",
    "district": "Ramleh",
    "entryFeePt": 0,
    "cadenceMinDays": 8,
    "cadenceMaxDays": 14,
    "lotMin": 8,
    "lotMax": 14,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.45,
      "EXCEPTIONAL": 0.45,
      "LEGENDARY": 0.1
    },
    "themes": [
      "Greek-Levantine estates",
      "hotel collections",
      "European collectors",
      "imported carpets"
    ],
    "historicalNote": "Fictional elite sale located in a period-appropriate Alexandrian villa setting.",
    "venueMap": "/art/auction/venues/alexandria-grand-map.webp",
    "floorPov": "/art/auction/pov/alexandria-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "jerusalem-jaffa-gate",
    "city": "jerusalem",
    "displayName": "Jaffa Gate Merchant Room",
    "tier": "small",
    "district": "Jaffa Gate / Old City",
    "entryFeePt": 0,
    "cadenceMinDays": 3,
    "cadenceMaxDays": 5,
    "lotMin": 5,
    "lotMax": 8,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.4,
      "FINE": 0.45,
      "EXCEPTIONAL": 0.15,
      "LEGENDARY": 0.0
    },
    "themes": [
      "household estates",
      "merchant consignments",
      "institutional disposals",
      "Levantine rugs"
    ],
    "historicalNote": "Fictional auction room grounded in the Old City's merchant environment.",
    "venueMap": "/art/auction/venues/jerusalem-small-map.webp",
    "floorPov": "/art/auction/pov/jerusalem-small-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "jerusalem-talbiya",
    "city": "jerusalem",
    "displayName": "Talbiya Villa Auction",
    "tier": "grand",
    "district": "Talbiya",
    "entryFeePt": 0,
    "cadenceMinDays": 8,
    "cadenceMaxDays": 15,
    "lotMin": 8,
    "lotMax": 13,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.35,
      "EXCEPTIONAL": 0.5,
      "LEGENDARY": 0.15
    },
    "themes": [
      "wealthy household collections",
      "foreign collectors",
      "institutional buyers",
      "documented pieces"
    ],
    "historicalNote": "Fictional elite estate sale in an affluent Jerusalem villa context.",
    "venueMap": "/art/auction/venues/jerusalem-grand-map.webp",
    "floorPov": "/art/auction/pov/jerusalem-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "damascus-khan",
    "city": "damascus",
    "displayName": "Old City Khan Auction",
    "tier": "small",
    "district": "Old City",
    "entryFeePt": 0,
    "cadenceMinDays": 2,
    "cadenceMaxDays": 4,
    "lotMin": 5,
    "lotMax": 9,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.35,
      "FINE": 0.5,
      "EXCEPTIONAL": 0.15,
      "LEGENDARY": 0.0
    },
    "themes": [
      "caravan stock",
      "trade rugs",
      "textiles",
      "antique fragments"
    ],
    "historicalNote": "Fictional dealer auction in a traditional khan/caravanserai setting.",
    "venueMap": "/art/auction/venues/damascus-small-map.webp",
    "floorPov": "/art/auction/pov/damascus-small-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "damascus-courtyard",
    "city": "damascus",
    "displayName": "Merchant Courtyard Estate",
    "tier": "grand",
    "district": "Old residential quarter",
    "entryFeePt": 0,
    "cadenceMinDays": 7,
    "cadenceMaxDays": 14,
    "lotMin": 8,
    "lotMax": 14,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.35,
      "EXCEPTIONAL": 0.5,
      "LEGENDARY": 0.15
    },
    "themes": [
      "old merchant families",
      "fine textiles",
      "documented antiques",
      "collector pieces"
    ],
    "historicalNote": "Fictional Damascene mansion sale; intentionally not tied to a specific historic palace.",
    "venueMap": "/art/auction/venues/damascus-grand-map.webp",
    "floorPov": "/art/auction/pov/damascus-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "amman-caravan-yard",
    "city": "amman",
    "displayName": "Downtown Caravan Yard Auction",
    "tier": "small",
    "district": "Downtown / caravan trade",
    "entryFeePt": 0,
    "cadenceMinDays": 3,
    "cadenceMaxDays": 5,
    "lotMin": 4,
    "lotMax": 8,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.6,
      "FINE": 0.35,
      "EXCEPTIONAL": 0.05,
      "LEGENDARY": 0.0
    },
    "themes": [
      "practical rugs",
      "household lots",
      "caravan gear",
      "occasional overlooked piece"
    ],
    "historicalNote": "Fictional auction yard grounded in Amman's caravan-market character.",
    "venueMap": "/art/auction/venues/amman-small-map.webp",
    "floorPov": "/art/auction/pov/amman-small-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "amman-notable-estate",
    "city": "amman",
    "displayName": "Court-Notable Estate Auction",
    "tier": "grand",
    "district": "Hill residence",
    "entryFeePt": 0,
    "cadenceMinDays": 9,
    "cadenceMaxDays": 16,
    "lotMin": 7,
    "lotMax": 12,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.45,
      "EXCEPTIONAL": 0.45,
      "LEGENDARY": 0.1
    },
    "themes": [
      "notable households",
      "diplomatic gifts",
      "Levantine collections",
      "prestige furnishings"
    ],
    "historicalNote": "Fictional elite household sale; not represented as an actual named royal auction house.",
    "venueMap": "/art/auction/venues/amman-grand-map.webp",
    "floorPov": "/art/auction/pov/amman-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "baghdad-suq",
    "city": "baghdad",
    "displayName": "Suq Merchant Auction",
    "tier": "small",
    "district": "Commercial suq",
    "entryFeePt": 0,
    "cadenceMinDays": 2,
    "cadenceMaxDays": 4,
    "lotMin": 5,
    "lotMax": 9,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.25,
      "FINE": 0.55,
      "EXCEPTIONAL": 0.2,
      "LEGENDARY": 0.0
    },
    "themes": [
      "Persian imports",
      "wholesale bales",
      "trade consignments",
      "river cargo"
    ],
    "historicalNote": "Fictional merchant auction grounded in Baghdad's regional trade role.",
    "venueMap": "/art/auction/venues/baghdad-small-map.webp",
    "floorPov": "/art/auction/pov/baghdad-small-pov.webp",
    "floorPovTemporaryReuse": true,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "baghdad-tigris",
    "city": "baghdad",
    "displayName": "Tigris Mansion Sale",
    "tier": "grand",
    "district": "Tigris riverfront",
    "entryFeePt": 0,
    "cadenceMinDays": 8,
    "cadenceMaxDays": 15,
    "lotMin": 8,
    "lotMax": 14,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.3,
      "EXCEPTIONAL": 0.5,
      "LEGENDARY": 0.19,
      "ARTIFACT": 0.01
    },
    "themes": [
      "Persian masterpieces",
      "court-connected collections",
      "elite estates",
      "rare provenance"
    ],
    "historicalNote": "Fictional high-end estate sale in a period-appropriate riverside mansion.",
    "venueMap": "/art/auction/venues/baghdad-grand-map.webp",
    "floorPov": "/art/auction/pov/baghdad-grand-pov.webp",
    "floorPovTemporaryReuse": true,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "istanbul-grand-bazaar",
    "city": "istanbul",
    "displayName": "Grand Bazaar Dealer Auction",
    "tier": "small",
    "district": "Grand Bazaar",
    "entryFeePt": 0,
    "cadenceMinDays": 2,
    "cadenceMaxDays": 4,
    "lotMin": 6,
    "lotMax": 10,
    "buyerPremiumPct": 0.0,
    "tierWeights": {
      "COMMON": 0.2,
      "FINE": 0.55,
      "EXCEPTIONAL": 0.25,
      "LEGENDARY": 0.0
    },
    "themes": [
      "dealer stock",
      "Anatolian rugs",
      "Caucasian imports",
      "competitive merchant bidding"
    ],
    "historicalNote": "Fictional dealer-auction format situated in the real Grand Bazaar trading context.",
    "venueMap": "/art/auction/venues/istanbul-small-map.webp",
    "floorPov": "/art/auction/pov/istanbul-small-pov.webp",
    "floorPovTemporaryReuse": true,
    "attendance": "ALWAYS_ALLOWED"
  },
  {
    "id": "istanbul-yali",
    "city": "istanbul",
    "displayName": "Bosphorus Yalı Estate Auction",
    "tier": "grand",
    "district": "Bosphorus waterfront",
    "entryFeePt": 0,
    "cadenceMinDays": 10,
    "cadenceMaxDays": 18,
    "lotMin": 9,
    "lotMax": 16,
    "buyerPremiumPct": 0.05,
    "tierWeights": {
      "COMMON": 0.0,
      "FINE": 0.25,
      "EXCEPTIONAL": 0.5,
      "LEGENDARY": 0.24,
      "ARTIFACT": 0.01
    },
    "themes": [
      "Ottoman estates",
      "Persian court carpets",
      "foreign collectors",
      "museum agents"
    ],
    "historicalNote": "Fictional estate sale in a historically plausible Bosphorus yalı setting.",
    "venueMap": "/art/auction/venues/istanbul-grand-map.webp",
    "floorPov": "/art/auction/pov/istanbul-grand-pov.webp",
    "floorPovTemporaryReuse": false,
    "attendance": "ALWAYS_ALLOWED"
  }
] as AuctionHouse[];
