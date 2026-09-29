// Caravan: people, animals, food and cargo. Bannerlord-style party management for a rug merchant.

export interface TroopType {
  id: string;
  name: string;
  plural: string;
  strength: number;
  wage: number; // pt per day
  cost: number; // recruitment price
  scout?: number; // extra fog reveal radius (cells)
  mounted?: boolean; // brings their own mount
  blurb: string;
}

export const TROOPS: Record<string, TroopType> = {
  fellah: { id: 'fellah', name: 'Village lad', plural: 'Village lads', strength: 1, wage: 3, cost: 10, blurb: 'Farm boys with sticks and good eyesight. Cheap, loyal, not brave.' },
  bedouin: { id: 'bedouin', name: 'Bedouin rider', plural: 'Bedouin riders', strength: 3, wage: 10, cost: 50, scout: 3, mounted: true, blurb: 'Know every well and every shortcut. They ride their own horses and see trouble first.' },
  guard: { id: 'guard', name: 'Caravan guard', plural: 'Caravan guards', strength: 4, wage: 8, cost: 40, blurb: 'Former gendarmes with old Martini rifles. They have done this road before.' },
  veteran: { id: 'veteran', name: 'Veteran', plural: 'Veterans', strength: 6, wage: 15, cost: 100, blurb: 'Men who fought in the Great War. Expensive, steady, and nobody on the road wants to test them.' },
  // the guard pack: men of the towns, each with a face
  watchman: { id: 'watchman', name: 'Giza watchman', plural: 'Giza watchmen', strength: 2, wage: 10, cost: 30, blurb: 'A village guard with a staff and a lamp. Cheap protection for short hauls and bazaar quarrels.' },
  sentinel: { id: 'sentinel', name: 'Cairo sentinel', plural: 'Cairo sentinels', strength: 4, wage: 18, cost: 60, blurb: 'A city watchman who knows the warehouses and the thieves who visit them. Solid on any Egyptian road.' },
  harbour: { id: 'harbour', name: 'Harbour watchman', plural: 'Harbour watchmen', strength: 4, wage: 22, cost: 70, scout: 1, blurb: 'Alexandria dock guard. Knows customs men, sailors and every trick played on imported cargo.' },
  desertcaptain: { id: 'desertcaptain', name: 'Bedouin caravan captain', plural: 'Bedouin caravan captains', strength: 6, wage: 28, cost: 90, scout: 3, mounted: true, blurb: 'Knows every well from Suez to Amman. Raiders think twice when they see whose camels these are.' },
  arnaut: { id: 'arnaut', name: 'Arnaut captain', plural: 'Arnaut captains', strength: 9, wage: 40, cost: 150, mounted: true, blurb: 'Albanian, scarred and feared. Expensive, but nobody robs a caravan he rides with. For legendary cargo and dangerous rivals.' },
  reformed: { id: 'reformed', name: 'Reformed raider', plural: 'Reformed raiders', strength: 3, wage: 5, cost: 0, mounted: true, blurb: 'Rode against you last week. Rides with you this week.' },
};

export const ANIMALS = {
  camel: { id: 'camel', name: 'Camel', plural: 'Camels', load: 8, price: 60, blurb: 'Carries eight loads. Steady, slow, and does not care for your opinion.' },
  horse: { id: 'horse', name: 'Horse', plural: 'Horses', load: 2, price: 90, blurb: 'Carries a rider and a little cargo. Mounted parties travel much faster.' },
} as const;
export type AnimalId = keyof typeof ANIMALS;

export const FOOD_PER_LOAD = 10; // ten days of bread and dates for one person fill one load
export const WALKER_LOAD = 2; // what you carry yourself
export const BASE_SPEED = 24; // map px per day on foot, about 40 km
export const FOOD_PRICE_BASE = 1; // piastres per ration: a day of bread, dates and beans

export interface Market {
  food: number; // pt per ration
  camel?: number;
  horse?: number;
  recruits: { troop: string; min: number; max: number }[];
}

// Who you can recruit and what animals are sold, by settlement
export const MARKETS: Record<string, Market> = {
  giza: { food: 1, camel: 50, recruits: [{ troop: 'watchman', min: 1, max: 3 }, { troop: 'fellah', min: 1, max: 3 }] },
  saqqara: { food: 1, recruits: [{ troop: 'fellah', min: 2, max: 4 }] },
  fayoum: { food: 1, camel: 55, recruits: [{ troop: 'fellah', min: 2, max: 5 }] },
  cairo: { food: 1.5, camel: 55, horse: 95, recruits: [{ troop: 'sentinel', min: 1, max: 3 }, { troop: 'guard', min: 0, max: 2 }, { troop: 'veteran', min: 0, max: 1 }, { troop: 'arnaut', min: 0, max: 1 }] },
  tanta: { food: 1, camel: 60, horse: 90, recruits: [{ troop: 'fellah', min: 2, max: 4 }, { troop: 'guard', min: 0, max: 2 }] },
  alexandria: { food: 1.5, horse: 100, recruits: [{ troop: 'harbour', min: 1, max: 3 }, { troop: 'guard', min: 0, max: 2 }, { troop: 'arnaut', min: 0, max: 1 }] },
  portsaid: { food: 1.5, recruits: [{ troop: 'harbour', min: 1, max: 2 }] },
  suez: { food: 1.5, camel: 55, recruits: [{ troop: 'desertcaptain', min: 0, max: 1 }, { troop: 'guard', min: 0, max: 2 }] },
  sinai: { food: 2, recruits: [] },
  bedouin: { food: 1, camel: 45, horse: 85, recruits: [{ troop: 'desertcaptain', min: 1, max: 2 }, { troop: 'bedouin', min: 1, max: 4 }] },
  jaffa: { food: 1, horse: 95, recruits: [{ troop: 'guard', min: 0, max: 2 }] },
  jerusalem: { food: 1.5, horse: 100, recruits: [{ troop: 'guard', min: 1, max: 2 }, { troop: 'arnaut', min: 0, max: 1 }] },
  beirut: { food: 1.5, horse: 100, recruits: [{ troop: 'guard', min: 0, max: 2 }] },
  damascus: { food: 1, camel: 55, horse: 80, recruits: [{ troop: 'guard', min: 1, max: 3 }, { troop: 'bedouin', min: 0, max: 2 }, { troop: 'arnaut', min: 0, max: 1 }] },
  aleppo: { food: 1, camel: 50, horse: 85, recruits: [{ troop: 'guard', min: 1, max: 2 }, { troop: 'veteran', min: 0, max: 2 }] },
  amman: { food: 1.2, camel: 55, horse: 90, recruits: [{ troop: 'guard', min: 1, max: 2 }, { troop: 'bedouin', min: 0, max: 2 }] },
  konya: { food: 1, horse: 75, recruits: [{ troop: 'fellah', min: 1, max: 3 }, { troop: 'veteran', min: 0, max: 2 }] },
  istanbul: { food: 2, horse: 110, recruits: [{ troop: 'veteran', min: 1, max: 3 }] },
  baghdad: { food: 1, camel: 45, horse: 90, recruits: [{ troop: 'bedouin', min: 1, max: 3 }, { troop: 'guard', min: 0, max: 2 }] },
};

// Old caravan roads, drawn on the map.
/** The guard yard picture shown in each town's Guards tab. */
export const YARD_ART: Record<string, string> = { giza: 'yard-giza', saqqara: 'yard-giza', fayoum: 'yard-giza', cairo: 'yard-cairo', tanta: 'yard-cairo', alexandria: 'yard-alexandria', portsaid: 'yard-alexandria', suez: 'yard-caravanserai', bedouin: 'yard-caravanserai', damascus: 'yard-caravanserai', baghdad: 'yard-caravanserai', jerusalem: 'yard-caravanserai', aleppo: 'yard-caravanserai', amman: 'yard-caravanserai' };

export const ROADS: [string, string][] = [
  ['giza', 'cairo'], ['giza', 'saqqara'], ['saqqara', 'fayoum'], ['cairo', 'tanta'], ['tanta', 'alexandria'],
  ['cairo', 'suez'], ['cairo', 'portsaid'], ['suez', 'sinai'], ['sinai', 'bedouin'], ['portsaid', 'jaffa'],
  ['jaffa', 'jerusalem'], ['jerusalem', 'damascus'], ['beirut', 'damascus'], ['damascus', 'aleppo'],
  ['damascus', 'baghdad'], ['aleppo', 'konya'], ['konya', 'istanbul'], ['bedouin', 'jerusalem'],
];
