// Jobs on the map: small errands that send you out into the world. Each one waits in a town;
// arrive there with what it needs and it pays. A few are open at a time; more appear as your name grows.

export interface Job {
  id: string;
  title: string;
  giver: string;
  target: string; // settlement id
  text: string;
  need?: { packedTier?: number; animals?: number; guards?: boolean };
  reward: { cash?: number; rep?: number; rugs?: string[]; sellPacked?: number; fee?: number };
  done: string; // what happens when you complete it
  minRep?: number;
}

export const JOBS: Job[] = [
  {
    id: 'saqqara-camp', title: 'Mats for the diggers', giver: 'A guard at the pyramids', target: 'saqqara',
    text: 'The excavators at Saqqara want rugs for their camp and pay well. Pack any rug for the road and take it south.',
    need: { packedTier: 1 }, reward: { sellPacked: 1.35, rep: 1 },
    done: 'The camp foreman buys your rug on the spot and asks when you can bring another.',
  },
  {
    id: 'tanta-bale', title: 'Rashid\'s bale at Tanta', giver: 'Uncle Rashid', target: 'tanta',
    text: 'A bale of village rugs is waiting for Rashid at the Tanta market. Arrive with at least two animals to carry it, and keep two rugs for your trouble.',
    need: { animals: 2 }, reward: { rugs: ['tanta-courtyard', 'village-kilim-canal'], rep: 1 },
    done: 'The bale is heavier than promised. Two rugs from it are yours.',
  },
  {
    id: 'fayoum-mules', title: 'Pack animals for Fayoum', giver: 'A farmer at the coffee house', target: 'fayoum',
    text: 'A Fayoum farmer needs animals for his harvest. Arrive with at least two animals and he will hire them for the week.',
    need: { animals: 2 }, reward: { cash: 600, rep: 1 },
    done: 'The farmer hires your animals for the harvest week and pays in coin.',
  },
  {
    id: 'cecil-hotel', title: 'A Fine rug for the Cecil Hotel', giver: 'The Cecil Hotel steward', target: 'alexandria',
    text: 'The new Cecil Hotel in Alexandria wants a Fine rug for its lobby. Pack a Fine rug or better and deliver it.',
    need: { packedTier: 2 }, reward: { sellPacked: 1.5, rep: 3 },
    done: 'The steward lays your rug in the lobby. The manager nods, pays well, and remembers your name.',
  },
  {
    id: 'suez-pilgrims', title: 'Guard the pilgrims to Suez', giver: 'A Sufi brother', target: 'suez',
    text: 'Pilgrims walking to Suez want company on the road. Hire at least one guard and meet them there.',
    need: { guards: true }, reward: { cash: 800, rep: 2 },
    done: 'The pilgrims arrive safely. Their elder presses coins into your hand and blesses your stall.',
  },
  {
    id: 'bedouin-camp', title: 'Find the Tarabin camp', giver: 'Abu Hamid', target: 'bedouin',
    text: 'Somewhere in Sinai the Tarabin herders keep camp. Find them. They trade in rugs the Cairo dealers never see.',
    reward: { rep: 3 },
    done: 'Coffee first, business later. The Tarabin will trade with you from now on.',
  },
  {
    id: 'portsaid-officer', title: 'A souvenir for a ship\'s officer', giver: 'Captain Reed', target: 'portsaid',
    text: 'A British officer sails from Port Said next week and wants a rug to take home. Any rug, packed and delivered.',
    need: { packedTier: 1 }, reward: { sellPacked: 1.4, rep: 1 },
    done: 'The officer pays in sterling and asks for a receipt "for the wife".',
  },
  {
    id: 'jerusalem-letter', title: 'Abu Hamid\'s letter', giver: 'Abu Hamid', target: 'jerusalem', minRep: 3,
    text: 'Abu Hamid has a letter for his cousin in Jerusalem, and will not trust the post. Carry it by hand.',
    reward: { cash: 500, rep: 2 },
    done: 'The cousin reads the letter twice, laughs, and pays you for your trouble.',
  },
  {
    id: 'damascus-rose', title: 'A rose from Damascus', giver: 'Farid al-Khatib', target: 'damascus', minRep: 8,
    text: 'A Damascus family is selling a Legendary rose carpet quietly, before the troubles. Bring £60 and buy it before anyone else hears.',
    reward: { rugs: ['damascus-rose'], fee: 6000, rep: 2 },
    done: 'In a courtyard off Straight Street, a widow unrolls the carpet. You pay, and it is yours.',
  },
  {
    id: 'baghdad-palace', title: 'An Exceptional rug for Baghdad', giver: 'A palace steward', target: 'baghdad', minRep: 12,
    text: 'The royal household in Baghdad is furnishing new rooms. Deliver an Exceptional rug or better.',
    need: { packedTier: 3 }, reward: { sellPacked: 1.6, rep: 4 },
    done: 'The steward pays in gold and mentions your name to the King\'s chamberlain.',
  },
];

/** Givers who have a recorded voice: they speak the 'done' line of their job (and quotes in their missions). */
export const GIVER_VOICE: Record<string, string> = {
  'Uncle Rashid': 'rashid',
  'Abu Hamid': 'abuhamid',
  'Captain Reed': 'captainreed',
  'Farid al-Khatib': 'farid',
};

/** The jobs open to you now: up to four at a time, in order, as your reputation allows. */
export function openJobs(done: string[] = [], rep = 0): Job[] {
  return JOBS.filter((j) => !done.includes(j.id) && (j.minRep ?? 0) <= rep).slice(0, 4);
}

// Visiting buyers: someone is in a town for a few days and wants a rug. Get there in time with the right piece.
export interface Visit {
  id: string;
  who: string;
  portrait?: string;
  buyerId?: string;
  city: string;
  until: number; // last day they are there
  tier: number; // lowest tier they will look at
  mult: number; // what they pay against the rug's value
  rep: number;
  text: string;
}

const TIER_WORD = ['', 'rug', 'Fine rug', 'Exceptional rug', 'Legendary rug'];
const COMMON_VISITORS: [string, string, string][] = [
  ['A Greek hotelier', 'alexandria', 'is refitting his rooms on the Corniche'],
  ['A Tanta cotton merchant', 'tanta', 'is marrying off his daughter and wants rugs for the house'],
  ['An English colonel\'s wife', 'cairo', 'is furnishing a villa in Garden City before the season ends'],
  ['An American tourist party', 'cairo', 'wants "real Oriental" rugs to ship home from Shepheard\'s'],
  ['A Suez Canal Company engineer', 'portsaid', 'is decorating his new house by the canal'],
  ['A Fayoum landowner', 'fayoum', 'is paying well after a good harvest'],
  ['The excavators\' camp chief', 'saqqara', 'needs rugs for the dig house'],
];
const FINE_VISITORS: [string, string, string][] = [
  ['A Jaffa orange exporter', 'jaffa', 'is furnishing his new offices by the port'],
  ['A Jerusalem consul', 'jerusalem', 'wants a Fine rug for the residence'],
  ['A Beirut silk banker', 'beirut', 'is buying for his house in Achrafieh'],
  ['An Alexandria cotton broker', 'alexandria', 'wants something better than his rivals have'],
];
const CITY_ID: Record<string, string> = { Cairo: 'cairo', Beirut: 'beirut', Baghdad: 'baghdad', Jerusalem: 'jerusalem', Alexandria: 'alexandria' };

/** A new visitor, chosen by rank. Famous names of 1925 only come to a Khan dealer. */
export function newVisit(day: number, rank: number, rng: () => number, celebs: { id: string; name: string; city: string; tier: number; portrait: string }[]): Visit {
  const stay = 4 + Math.floor(rng() * 3);
  if (rank >= 2 && celebs.length && rng() < 0.55) {
    const c = celebs[Math.floor(rng() * celebs.length)];
    const city = rng() < 0.5 ? CITY_ID[c.city] ?? 'cairo' : ['alexandria', 'cairo', 'jerusalem', 'beirut', 'damascus'][Math.floor(rng() * 5)];
    return { id: `v${day}-${c.id}`, who: c.name, portrait: c.portrait, buyerId: c.id, city, until: day + stay, tier: c.tier, mult: 1.9, rep: 4, text: `${c.name} is staying in town and asking dealers for a ${TIER_WORD[c.tier]}.` };
  }
  const pool = rank >= 1 && rng() < 0.6 ? FINE_VISITORS : COMMON_VISITORS;
  const [who, city, why] = pool[Math.floor(rng() * pool.length)];
  const tier = pool === FINE_VISITORS ? 2 : 1;
  return { id: `v${day}-${city}-${Math.floor(rng() * 1000)}`, who, city, until: day + stay, tier, mult: tier === 2 ? 1.7 : 1.6, rep: tier === 2 ? 3 : 2, text: `${who} ${why}. Bring a ${TIER_WORD[tier]} before they leave.` };
}
