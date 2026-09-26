// Caravan animals of Egypt and the Levant in the 1920s. Stats are game values; the notes are historical.
export type AnimalKind = 'camel' | 'horse' | 'donkey' | 'mule';

export interface Breed {
  id: string;
  kind: AnimalKind;
  name: string;
  arabic: string;
  origin: string;
  role: string;
  load: number; // loads carried when not ridden
  ride: number; // pace as a mount (1 = walking pace)
  food: number; // rations a day
  price: number;
  coat: [string, string]; // body, shade
  notes: string[];
}

export const BREEDS: Record<string, Breed> = {
  falahi: {
    id: 'falahi', kind: 'camel', name: 'Falahi camel', arabic: 'جمل فلاحي', origin: 'Nile valley and Delta', role: 'Farm and short-haul pack camel',
    load: 7, ride: 1.0, food: 1, price: 1500, coat: ['#b48a57', '#8a6538'],
    notes: [
      'The "peasant" camel of the Nile valley: smaller and heavier-boned than desert breeds.',
      'Turns water-wheels, pulls ploughs and carries cane and clover to market.',
      'Cheap and steady, but slow and poorly suited to long desert crossings.',
    ],
  },
  maghrabi: {
    id: 'maghrabi', kind: 'camel', name: 'Maghrabi camel', arabic: 'جمل مغربي', origin: 'Western Desert and Libya', role: 'Heavy baggage camel',
    load: 10, ride: 1.05, food: 1, price: 2200, coat: ['#c9a36b', '#9b7746'],
    notes: [
      'A large, powerful dromedary bred by the tribes west of the Nile.',
      'The backbone of Egyptian baggage caravans; it carries the heaviest loads of any local breed.',
      'Too heavy and slow to be a good riding camel.',
    ],
  },
  bishari: {
    id: 'bishari', kind: 'camel', name: 'Bishari camel', arabic: 'جمل بشاري', origin: 'Red Sea hills (Bisharin tribes)', role: 'Fast riding camel',
    load: 4, ride: 1.7, food: 1, price: 3500, coat: ['#e0cfa8', '#b59f73'],
    notes: [
      'Bred by the Bisharin of the Red Sea hills; lean, long-legged and famously fast.',
      'Driven north to the camel market at Imbaba, across the river from Cairo.',
      'The preferred mount of the Egyptian Army Camel Corps.',
    ],
  },
  anafi: {
    id: 'anafi', kind: 'camel', name: 'Anafi camel', arabic: 'جمل عنافي', origin: 'Sudan', role: 'Light racing and riding camel',
    load: 3, ride: 1.8, food: 1, price: 4500, coat: ['#eee3c8', '#c7b893'],
    notes: [
      'A light, pale Sudanese riding breed prized for speed.',
      'Delicate compared with baggage camels; not bought to carry cargo.',
    ],
  },
  arabian: {
    id: 'arabian', kind: 'horse', name: 'Arabian horse', arabic: 'حصان عربي أصيل', origin: 'Bred by the Anazeh and Shammar tribes', role: 'Endurance riding horse',
    load: 2, ride: 1.9, food: 2, price: 9000, coat: ['#d9d6cf', '#a7a39a'],
    notes: [
      'Desert-bred and famous for endurance on little water. Strains such as Kuhaylan and Saqlawi are traced through the dam.',
      'Egypt\'s Royal Agricultural Society has kept a stud of pure Arabians since 1908.',
      'Syrian Arabians are traded at the horse markets of Aleppo and Damascus.',
    ],
  },
  baladi_h: {
    id: 'baladi_h', kind: 'horse', name: 'Egyptian Baladi horse', arabic: 'حصان بلدي', origin: 'Nile valley', role: 'Everyday riding and cart horse',
    load: 2, ride: 1.5, food: 2, price: 1800, coat: ['#7a4a2a', '#4e2e1a'],
    notes: [
      'The local horse of Egypt, of mixed Arab and Barb blood.',
      'Small, hardy and cheap. It pulls most of the carriages and carts in Cairo.',
    ],
  },
  barb: {
    id: 'barb', kind: 'horse', name: 'Barb horse', arabic: 'حصان بربري', origin: 'North Africa (the Maghreb)', role: 'Hardy riding horse',
    load: 2, ride: 1.65, food: 2, price: 3500, coat: ['#3a2a22', '#20160f'],
    notes: [
      'The horse of the Berber and Arab horsemen of North Africa.',
      'Less refined than the Arabian, but tough and sure-footed on rock and sand.',
    ],
  },
  baladi_d: {
    id: 'baladi_d', kind: 'donkey', name: 'Egyptian donkey', arabic: 'حمار بلدي', origin: 'Every village in Egypt', role: 'Pack and riding donkey',
    load: 3, ride: 1.1, food: 0.5, price: 300, coat: ['#8d857a', '#5e574e'],
    notes: [
      'The small grey donkey that carries water, clover, vegetables and passengers all over Egypt.',
      'Patient, cheap to feed and to buy. Slow, and stubborn when it has decided to be.',
    ],
  },
  hassawi: {
    id: 'hassawi', kind: 'donkey', name: 'Hassawi donkey', arabic: 'حمار حساوي', origin: 'Al-Hasa, eastern Arabia', role: 'Large white riding donkey',
    load: 2, ride: 1.45, food: 1, price: 2500, coat: ['#efeae0', '#c9c2b4'],
    notes: [
      'A large white donkey bred in the al-Hasa oasis and exported across the Arab world.',
      'Long the mount of Cairo notables, doctors and religious scholars, prized for its smooth, quick gait.',
    ],
  },
  cyprus_mule: {
    id: 'cyprus_mule', kind: 'mule', name: 'Cypriot mule', arabic: 'بغل قبرصي', origin: 'Cyprus', role: 'Pack mule for hill roads',
    load: 5, ride: 1.35, food: 1.5, price: 2000, coat: ['#5a3d28', '#3a2618'],
    notes: [
      'Cyprus bred mules for export, and Cypriot mules and muleteers served the British Army in Salonika and Palestine during the Great War.',
      'Stronger than a donkey and surer-footed than a horse in the Judean and Lebanese hills.',
    ],
  },
};

export const BREED_IDS = Object.keys(BREEDS);

// What each market sells, and at what share of the base price
export const ANIMAL_MARKETS: Record<string, [string, number][]> = {
  giza: [['baladi_d', 1], ['falahi', 1], ['bishari', 0.95], ['maghrabi', 1]], // the Imbaba camel market is across the river
  cairo: [['baladi_h', 1], ['arabian', 1.05], ['hassawi', 1.05], ['baladi_d', 1.1]],
  saqqara: [['baladi_d', 0.9], ['falahi', 0.95]],
  fayoum: [['baladi_d', 0.85], ['falahi', 0.9]],
  tanta: [['baladi_h', 0.95], ['baladi_d', 0.9], ['falahi', 0.95]],
  alexandria: [['barb', 1], ['baladi_h', 1.05]],
  portsaid: [['baladi_d', 1.2]],
  suez: [['falahi', 1], ['maghrabi', 1.05]],
  bedouin: [['arabian', 0.9], ['maghrabi', 0.9], ['bishari', 1.05]],
  jaffa: [['cyprus_mule', 1], ['baladi_d', 1]],
  jerusalem: [['cyprus_mule', 1.05], ['baladi_d', 1.05], ['baladi_h', 1.1]],
  beirut: [['cyprus_mule', 0.95], ['baladi_h', 1.1]],
  damascus: [['arabian', 0.9], ['hassawi', 0.95], ['cyprus_mule', 1]],
  aleppo: [['arabian', 0.85], ['barb', 1.05]],
  konya: [['baladi_h', 0.9], ['cyprus_mule', 1]],
  istanbul: [['arabian', 1.2]],
  baghdad: [['arabian', 0.9], ['hassawi', 0.9], ['maghrabi', 0.95]],
};
