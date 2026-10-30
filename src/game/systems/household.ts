// The household: a match made through families, the mahr and the wedding feast, a wife at home in Giza,
// children growing up over the years, and in the end an heir who takes the trading house on.
// In 1925 a young merchant of standing did not court a girl himself: an uncle, a dealer friend or a
// family the trade knew carried word between houses. He called on her father, sent presents to the
// house, and was weighed on his name, his dress and his honesty. The marriage contract (katb al-kitab)
// fixed the mahr, paid to the bride; the wedding feast followed in her family's town.
//
// Pure logic: no store import (the store imports this file).
import type { GameState } from '../state/store';
import type { LedgerEntry, RugItem } from '../types';
import { post } from './post';
import { heroCharisma, START_WARDROBE } from '../../data/wardrobe';
import { levelOf } from '../../data/character';
import { fmt } from '../economy/money';
import { dateFor } from '../economy/economy';
import { standing as tableStanding, tableOf, ordinal, type RanksState } from './ranks';
import { RIVAL } from '../../data/rivals';

export type BrideId = string;
/** where her family stands: a lane family, a trading house, a notable house, a great house */
export type Rank = 'humble' | 'trade' | 'notable' | 'grand';
/** how you come to know of her: through Rashid, at your stall, on your travels, or through a buyer you have earned */
export type Meet = 'rashid' | 'stall' | 'city' | 'friend';
export type SpouseRole = 'home' | 'stall' | 'books' | 'rugs';
export type ChildPath = 'school' | 'shop' | 'weaving';
export type ChildRole = 'home' | 'apprentice' | 'shop';

export interface Bride {
  id: BrideId;
  name: string;
  short: string;
  father: string;
  city: string;
  cityName: string;
  /** who carries word between the houses */
  introducer: string;
  intro: string;
  /** what she brings to the trading house */
  brings: string;
  mahr: number;
  feast: number;
  feastRep: number;
  gift: { label: string; cost: number };
  /** what her family weighs most: your dress, your honesty, or your knowledge of carpets */
  likes: 'dress' | 'honesty' | 'craft' | 'learning';
  rank?: Rank;
  meet?: Meet;
  /** the buyer whose family she is (meet: friend): known once you have sold to him three times */
  via?: string;
  /** the morning note when you first hear of her */
  met?: string;
  /** the name her family needs before her father will hear a proposal */
  minRep?: number;
  role: SpouseRole;
  /** towns whose dealers treat you as a friend once the families are joined */
  friends: string[];
  /** her father's trading house, one of the named houses on the season's tables (data/rivals) */
  house?: string;
  /** the place you must hold in her city's table (this season or the last) before he gives his consent */
  place?: number;
  /** a daughter of one of the world's families (systems/population): her person, her picture, her children's look */
  folk?: string; art?: string; look?: 'egypt' | 'levant' | 'desert';
}

export const BRIDES: Record<string, Bride> = {
  layla: {
    id: 'layla', name: 'Layla al-Shami', short: 'Layla', city: 'damascus', cityName: 'Damascus', house: 'rival-shami', place: 5,
    father: 'Abu Nadim al-Shami, the old carpet dealer of the Souq al-Hamidiyya',
    introducer: 'Farid al-Ajami',
    intro: 'Farid al-Ajami says Abu Nadim al-Shami, the first house of Damascus, has a daughter of age. A Damascus family would open the Levant to you.',
    brings: 'Her father\'s friends in Damascus and Aleppo: dealers there sell to you as to one of their own.',
    mahr: 6000, feast: 3000, feastRep: 6,
    gift: { label: 'a bolt of fine Egyptian cotton for the house', cost: 400 },
    likes: 'dress', role: 'home', friends: ['damascus', 'aleppo'],
  },
  nadia: {
    id: 'nadia', name: 'Nadia Abd al-Latif', short: 'Nadia', city: 'cairo', cityName: 'Cairo',
    father: 'Ustaz Fahmi Abd al-Latif, who teaches at a government school in Sayyida Zeinab',
    introducer: 'Uncle Rashid',
    intro: 'Uncle Rashid has spoken to a schoolteacher in Cairo. His daughter reads and writes, and keeps her father\'s accounts.',
    brings: 'She keeps the books: money short in the tin, or in an agent\'s takings, does not go unseen.',
    mahr: 3500, feast: 2000, feastRep: 5,
    gift: { label: 'books from the Cairo booksellers for her father', cost: 250 },
    likes: 'honesty', role: 'books', friends: ['cairo'],
  },
  amira: {
    id: 'amira', name: 'Amira Abu Salem', short: 'Amira', city: 'fayoum', cityName: 'the Fayoum',
    father: 'Hajj Mansur Abu Salem, of the Fayoum looms that sign with a camel',
    introducer: 'the Abu Salem weavers',
    intro: 'The Abu Salem looms in the Fayoum wove your father\'s rug. Hajj Mansur\'s eldest daughter knows a carpet from the back.',
    brings: 'She judges rugs and mends them at home, and in time she will keep a small workshop of her own.',
    mahr: 2500, feast: 1200, feastRep: 4,
    gift: { label: 'good wool and madder for the family looms', cost: 200 },
    likes: 'craft', role: 'rugs', friends: ['fayoum'],
  },
};

// More families, across the classes and the cities: some you hear of through a buyer who trusts you,
// some come to your stall, some you meet on the road. Each is known only once met.
Object.assign(BRIDES, {
  zeinab: {
    id: 'zeinab', name: 'Zeinab Hasan', short: 'Zeinab', city: 'giza', cityName: 'Giza', rank: 'humble', meet: 'friend', via: 'hassan',
    father: 'Hasan, who keeps the Nile Star coffee house on the Pyramids Road',
    introducer: 'Hasan himself, over a game of tawla',
    intro: 'Hasan of the Nile Star has a daughter who runs his tables better than he does.',
    met: 'Hasan of the Nile Star, losing at tawla, says his daughter Zeinab could run a stall better than you. He seems to mean it as an offer.',
    brings: 'She knows every face in the lane: minding the stall, she sells as well as you do.',
    mahr: 1500, feast: 800, feastRep: 3, gift: { label: 'a new set of brass coffee pots for the Nile Star', cost: 150 },
    likes: 'honesty', role: 'stall', friends: ['giza'],
  },
  salma: {
    id: 'salma', name: 'Salma Ibrahim', short: 'Salma', city: 'cairo', cityName: 'Cairo', rank: 'humble', meet: 'friend', via: 'mariam',
    father: 'Ibrahim the tram conductor, of Shubra',
    introducer: 'Mariam and her aunt Hoda',
    intro: 'Mariam\'s cousin Salma is quiet, clever with a needle, and in no hurry to marry anyone loud.',
    met: 'Mariam says her cousin Salma asked about the gentle carpet man. Mariam is very pleased with herself.',
    brings: 'She mends fringes and pile with a needle as fine as the restorer\'s, for nothing.',
    mahr: 1400, feast: 700, feastRep: 3, gift: { label: 'a sewing box with good steel needles', cost: 120 },
    likes: 'honesty', role: 'rugs', friends: ['cairo'],
  },
  aziza: {
    id: 'aziza', name: 'Aziza Mansour', short: 'Aziza', city: 'giza', cityName: 'Giza', rank: 'trade', meet: 'stall',
    father: 'the late Hajj Mansour, father of Shukri across the lane',
    introducer: 'her mother, over your counter',
    intro: 'Shukri\'s sister. She buys from you to annoy him, and says so.',
    met: 'A young woman comes to the stall with her mother and buys a small rug at your price without haggling. She is Shukri Mansour\'s sister, Aziza. She says she wanted to see what the fuss was about.',
    brings: 'Marry her and the feud across the lane is over: Shukri will never take another of your buyers.',
    mahr: 3000, feast: 1800, feastRep: 5, gift: { label: 'a silk scarf from Khan el-Khalili', cost: 250 },
    likes: 'craft', role: 'rugs', friends: ['giza'],
  },
  yasmin: {
    id: 'yasmin', name: 'Yasmin Tannous', short: 'Yasmin', city: 'cairo', cityName: 'Cairo', rank: 'trade', meet: 'city', house: 'rival-selim', place: 6,
    father: 'Selim Tannous, the Cairo dealer who never stops counting',
    introducer: 'Selim Tannous\'s clerk',
    intro: 'Selim Tannous\'s daughter keeps his ledgers and corrects his sums.',
    met: 'In Cairo, Selim Tannous\'s clerk mentions that his master\'s daughter Yasmin keeps the ledgers, and that Tannous wants a son-in-law who can count. He looks at you as he says it.',
    brings: 'She keeps the books: no agent cheats a house where Yasmin reads the ledger.',
    mahr: 3500, feast: 2000, feastRep: 5, gift: { label: 'a fountain pen and a ledger bound in leather', cost: 300 },
    likes: 'dress', role: 'books', friends: ['tanta'],
  },
  amal: {
    id: 'amal', name: 'Amal Shalaby', short: 'Amal', city: 'portsaid', cityName: 'Port Said', rank: 'trade', meet: 'city', house: 'rival-shalaby', place: 8,
    father: 'Abdel-Rahim Shalaby, who sells carpets to the ships on the Port Said quay',
    introducer: 'a porter on the quay',
    intro: 'Shalaby\'s daughter speaks French and English to the ships\' officers, and sells them his carpets.',
    met: 'On the Port Said quay a porter tells you Abdel-Rahim Shalaby\'s daughter Amal sold a ship\'s captain two rugs in French this morning. Her father is said to want a partner, not a rival.',
    brings: 'She writes your letters in French and English: foreign buyers trust a house that answers them properly.',
    mahr: 1800, feast: 1000, feastRep: 3, gift: { label: 'a French novel and a box of Turkish delight', cost: 140 },
    likes: 'learning', role: 'books', friends: ['portsaid'],
  },
  dalia: {
    id: 'dalia', name: 'Dalia Fikry', short: 'Dalia', city: 'alexandria', cityName: 'Alexandria', rank: 'notable', meet: 'city', minRep: 35, house: 'rival-fikry', place: 5,
    father: 'Ahmed Fikry Bey, an Alexandria dealer with a villa in Ramleh',
    introducer: 'a dealer at the Alexandria auction rooms',
    intro: 'Fikry Bey\'s daughter plays the piano, sells to the cotton families, and has opinions about Paris.',
    met: 'At the Alexandria auction rooms a dealer says Ahmed Fikry\'s daughter Dalia admired a carpet you bid on against her father, and asked who you were.',
    brings: 'The Alexandria cotton families buy through you: her father\'s friends pay well.',
    mahr: 8000, feast: 4500, feastRep: 8, gift: { label: 'sheet music from Paris and a bouquet from Ramleh', cost: 600 },
    likes: 'dress', role: 'home', friends: ['alexandria'],
  },
  mona: {
    id: 'mona', name: 'Mona al-Masri', short: 'Mona', city: 'cairo', cityName: 'Cairo', rank: 'notable', meet: 'friend', via: 'fuad', minRep: 40,
    father: 'Samir al-Masri, carpet agent to the household at Abdeen',
    introducer: 'Samir al-Masri himself',
    intro: 'The palace carpet agent\'s daughter. She has walked on the best carpets in Egypt since she could walk.',
    met: 'Samir al-Masri of Abdeen, who rarely says anything kind, says his daughter Mona has been reading the carpets you sold him. He would not object if you called.',
    brings: 'She judges a carpet as well as her father does, and the palace households know her name.',
    mahr: 7000, feast: 4000, feastRep: 8, gift: { label: 'a small silk prayer rug for her mother', cost: 700 },
    likes: 'craft', role: 'rugs', friends: ['cairo'],
  },
  farida: {
    id: 'farida', name: 'Farida Nashif', short: 'Farida', city: 'jerusalem', cityName: 'Jerusalem', rank: 'notable', meet: 'city', minRep: 30,
    father: 'Ustaz Khalil Nashif, a schoolmaster near the Damascus Gate',
    introducer: 'a bookseller near the Damascus Gate',
    intro: 'A Jerusalem schoolmaster\'s daughter who teaches girls to read and argues with the newspapers.',
    met: 'In Jerusalem a bookseller near the Damascus Gate says Ustaz Nashif\'s daughter Farida teaches half the girls of the quarter to read, and that her father wants a man who reads too.',
    brings: 'She teaches the children herself, and keeps the house\'s letters and accounts.',
    mahr: 4500, feast: 2500, feastRep: 6, gift: { label: 'a set of books from the Cairo booksellers', cost: 300 },
    likes: 'learning', role: 'books', friends: ['jerusalem', 'jaffa'],
  },
  nour: {
    id: 'nour', name: 'Nour Rizk', short: 'Nour', city: 'jaffa', cityName: 'Jaffa', rank: 'trade', meet: 'city',
    house: 'rival-sahyoun', place: 8,
    father: 'Hajj Ahmad Rizk, a carpet dealer of Jaffa who also grows oranges',
    introducer: 'an orange packer at the Jaffa docks',
    intro: 'An orange grower\'s daughter, practical, quick to laugh, and not impressed by a fine coat.',
    met: 'At the Jaffa docks an orange packer tells you Hajj Rizk\'s daughter Nour runs the packing sheds when her father is ill. He seems to think you should meet her.',
    brings: 'She minds the stall as if it were her father\'s packing shed: nothing wasted, nobody idle.',
    mahr: 2800, feast: 1500, feastRep: 4, gift: { label: 'a crate of the best Egyptian dates for the house', cost: 180 },
    likes: 'honesty', role: 'stall', friends: ['jaffa'],
  },
  hayat: {
    id: 'hayat', name: 'Hayat Kassab', short: 'Hayat', city: 'aleppo', cityName: 'Aleppo', rank: 'trade', meet: 'city', minRep: 30, house: 'rival-kassab', place: 5,
    father: 'Hajj Omar Kassab, a carpet dealer in the Aleppo souq',
    introducer: 'Hajj Omar himself, after a long bargain',
    intro: 'A rival dealer\'s daughter. She mends carpets in her father\'s back room and knows his prices better than he does.',
    met: 'In Aleppo, after an hour of bargaining, Hajj Omar Kassab says his daughter Hayat would have beaten you down further. He says it with some pride.',
    brings: 'Aleppo opens to you: her father\'s friends in the souq sell to you as family.',
    mahr: 4000, feast: 2200, feastRep: 5, gift: { label: 'Egyptian cotton and a brass tray for the house', cost: 300 },
    likes: 'craft', role: 'rugs', friends: ['aleppo'],
  },
  suad: {
    id: 'suad', name: 'Suad al-Najjar', short: 'Suad', city: 'baghdad', cityName: 'Baghdad', rank: 'grand', meet: 'city', minRep: 45, house: 'rival-najjar', place: 3,
    father: 'Hajj Jawad al-Najjar, the great carpet dealer of Baghdad',
    introducer: 'a Persian merchant in the Baghdad souq',
    intro: 'The daughter of the greatest carpet house in Baghdad. Persian carpets have been her family\'s life for a century.',
    met: 'In Baghdad a Persian merchant tells you Hajj Jawad al-Najjar has asked about you twice. His daughter Suad, he says, chooses her father\'s Persian stock.',
    brings: 'Her family\'s name in Baghdad and on the road to Persia: dealers from Baghdad to Khanaqin treat you as one of theirs.',
    mahr: 12000, feast: 7000, feastRep: 10, gift: { label: 'a fine Egyptian silk and gold-thread embroidery', cost: 1000 },
    likes: 'craft', role: 'rugs', friends: ['baghdad', 'khanaqin'],
  },
  emine: {
    id: 'emine', name: 'Emine Halıcızade', short: 'Emine', city: 'istanbul', cityName: 'Constantinople', rank: 'grand', meet: 'city', minRep: 50, house: 'rival-tezcan', place: 3,
    father: 'Hüsnü Bey Halıcızade, a carpet merchant of the Grand Bazaar',
    introducer: 'an old porter at the Grand Bazaar',
    intro: 'A Constantinople merchant\'s daughter, educated at the American college, who speaks four languages.',
    met: 'At the Grand Bazaar an old porter says Hüsnü Bey\'s daughter Emine read your name in a dealer\'s letter from Cairo, and asked her father who you were.',
    brings: 'The Turkish trade: her father\'s friends from Constantinople to Konya deal with you as family.',
    mahr: 14000, feast: 8000, feastRep: 10, gift: { label: 'a silver-bound Quran and Egyptian perfume', cost: 1100 },
    likes: 'dress', role: 'books', friends: ['istanbul', 'konya'],
  },
  nura: {
    id: 'nura', name: 'Nura bint Salem', short: 'Nura', city: 'bedouin', cityName: 'the Tarabin camp', rank: 'humble', meet: 'friend', via: 'salem',
    father: 'Sheikh Salem of the Tarabin, who sells camels at Imbaba',
    introducer: 'Sheikh Salem, over coffee in his tent',
    intro: 'A Tarabin sheikh\'s daughter who rides better than his sons and can read the desert like a page.',
    met: 'Sheikh Salem says that any man who bargains with him three times and is still standing should come to his tent and meet his daughter Nura.',
    brings: 'The Tarabin count you family: their camps and the Sinai towns trade with you as one of their own.',
    mahr: 2000, feast: 1500, feastRep: 4, gift: { label: 'a fine saddle blanket and a sack of coffee', cost: 200 },
    likes: 'honesty', role: 'home', friends: ['bedouin', 'sinai', 'suez'],
  },
} as Record<string, Bride>);
Object.assign(BRIDES.nadia, { rank: 'trade', meet: 'rashid' });
Object.assign(BRIDES.amira, { rank: 'trade', meet: 'rashid' });
Object.assign(BRIDES.layla, { rank: 'notable', meet: 'rashid' });
export const RANK_WORD: Record<Rank, string> = { humble: 'A lane family', trade: 'A trading house', notable: 'A notable house', grand: 'A great house' };

/** the families you could court now: Rashid's three once you have asked him, and everyone you have met */
export function availableBrides(h: HouseholdState): BrideId[] {
  const wed = new Set([...wivesOf(h).map((w) => w.id), ...(h.chosen ? [h.chosen] : [])]);
  return [...new Set([...(h.stage === 'offered' || h.offered !== undefined ? BRIDE_ORDER : []), ...(h.known ?? [])])].filter((id) => BRIDES[id] && !wed.has(id));
}

export const BRIDE_ORDER: BrideId[] = ['nadia', 'amira', 'layla'];
export const brideArt = (id: BrideId) => BRIDES[id]?.art ?? `art/family/bride-${id}.jpg`;
/** a child takes after the mother's family: Egypt, the Levant and Constantinople, or the desert and Baghdad */
const LOOK: Record<string, 'egypt' | 'levant' | 'desert'> = { layla: 'levant', farida: 'levant', nour: 'levant', hayat: 'levant', emine: 'levant', suad: 'desert', nura: 'desert' };
export const childLook = (mother?: BrideId) => (mother && (LOOK[mother] ?? BRIDES[mother]?.look)) || 'egypt';
/** the child's portrait, and the plain one for that look to fall back on while the other faces are not yet drawn */
export const childArt = (c: Child, firstWife?: BrideId): [string, string] => {
  if (ageOf(c) < 1) return [`art/family/child-baby-${c.sex}.jpg`, `art/family/child-baby-${c.sex}.jpg`];
  const base = `art/family/child-${childLook(c.mother ?? firstWife)}-${c.sex}-${ageOf(c) >= 18 ? 18 : ageOf(c) >= 12 ? 12 : 5}`;
  const v = c.look ?? 0;
  return [v ? `${base}-${v + 1}.jpg` : `${base}.jpg`, `${base}.jpg`];
};

/** standing needed before families will listen: reputation and a canopy stall or better */
export const MATCH_REP = 25;
export const MATCH_STALLS = ['bazaar', 'khan'];
/** favour her father must have of you before you may ask for her hand */
export const ASK_AT = 70;
/** days between the contract and the feast, for the families to prepare */
export const FEAST_AFTER = 7;
export const VISIT_HOURS = 3;
export const GIFT_EVERY = 7;
/** a present for your wife, and how often it means something */
export const PRESENT = { cost: 80, every: 5, lift: 8 };
export const EVENING = { hours: 3, lift: 6 };
/** first child some 300 to 400 days after the wedding, the next ones 600 to 1,000 days apart */
export const FIRST_CHILD: [number, number] = [300, 400];
export const NEXT_CHILD: [number, number] = [600, 1000];
/** children a wife may bear; twins and the odd set of triplets come by chance */
export const MAX_CHILDREN = 8;
export const TWINS = 0.06, TRIPLETS = 0.008;
/** up to four wives, as the law of the day allowed: each later wife needs a bigger name and her own rooms */
export const MAX_WIVES = 4;
export const WIFE_REP_STEP = 15;
export const ROOMS_COST = [0, 1500, 2500, 4000];
/** what a new wife costs the others' contentment */
export const JEALOUSY = 12;
/** how fast years pass at home against the trading days */
export const PACES = [1, 4, 12] as const;
export const AMIRA_WORKSHOP_AFTER = 365;
/** an heir keeps this share of his father's name */
export const HEIR_REP = 0.6;
export const PATH_AGE = 6;
export const GROWN = 18;

export const SON_NAMES = ['Ahmad', 'Mustafa', 'Hussein', 'Taha', 'Zaki', 'Anwar', 'Mahmoud', 'Ibrahim', 'Yusuf', 'Omar', 'Karim', 'Salah', 'Hamdi', 'Fathi', 'Adel', 'Sami', 'Rashid', 'Tawfiq'];
export const DAUGHTER_NAMES = ['Fatma', 'Zeinab', 'Aisha', 'Huda', 'Safiya', 'Nabila', 'Amina', 'Khadija', 'Samira', 'Layla', 'Nawal', 'Souad', 'Ihsan', 'Laila', 'Thuraya', 'Hind', 'Basma', 'Rabab'];

export interface Suitor { favour: number; visits: number; gifts: number; lastVisit?: number; lastGift?: number }
export interface Spouse {
  id: BrideId;
  married: number;
  content: number;
  role: SpouseRole;
  /** the last night you slept at home in Giza */
  lastHome: number;
  lastPresent?: number;
  lastEvening?: number;
  lastLetter?: number;
  lastMend?: number;
  workshop?: boolean;
  /** a later wife's own count to her next child (the first wife's is the house's birthIn) */
  birthIn?: number;
}
export interface Child {
  id: string;
  sex: 'son' | 'daughter';
  name?: string;
  born: number;
  /** days of home life lived (a night adds the household pace) */
  ageDays: number;
  path?: ChildPath;
  traits: { learning: number; trade: number; craft: number };
  role?: ChildRole;
  shopAt?: string;
  /** her mother; unset means the first wife */
  mother?: BrideId;
  /** which of the portraits for the child's family look, age and sex (0 to 2): brothers do not all share one face */
  look?: number;
  /** an identical twin: the first-born of the pair */
  twinOf?: string;
}
export interface HouseholdState {
  stage: 'none' | 'offered' | 'betrothed' | 'married';
  /** families met on your own: through a buyer, at the stall, on the road */
  known?: BrideId[];
  offered?: number;
  suitors: Partial<Record<BrideId, Suitor>>;
  /** the family you are joined to, from the contract on */
  chosen?: BrideId;
  contract?: number;
  spouse?: Spouse;
  /** later wives, after the first */
  wives?: Spouse[];
  children: Child[];
  /** home days until the next birth */
  birthIn?: number;
  pace: number;
  /** the merchant now at the head of the house, once an heir has taken over */
  merchant?: { name: string; since: number; gen: number; father: string };
  /** a widowed mother at home, after the house has passed on */
  mother?: BrideId;
}
export const HOUSEHOLD_START: HouseholdState = { stage: 'none', suitors: {}, children: [], pace: 1 };
export const hh = (s: Pick<GameState, 'household'>): HouseholdState => s.household ?? HOUSEHOLD_START;
/** every wife, the first one first */
export const wivesOf = (h: HouseholdState): Spouse[] => (h.spouse ? [h.spouse, ...(h.wives ?? [])] : []);
/** put one wife back in her place */
export const setWife = (h: HouseholdState, sp: Spouse): HouseholdState => (h.spouse?.id === sp.id ? { ...h, spouse: sp } : { ...h, wives: (h.wives ?? []).map((w) => (w.id === sp.id ? sp : w)) });
/** the name a family wants before giving a daughter to a man who already has wives */
export const wifeRep = (h: HouseholdState) => MATCH_REP + WIFE_REP_STEP * wivesOf(h).length;
/** room in the house for another wife, and no wedding already in hand */
export const canCourt = (h: HouseholdState) => !h.merchant && !h.chosen && wivesOf(h).length < MAX_WIVES;
const motherOf = (h: HouseholdState, c: Child) => c.mother ?? h.spouse?.id;

export type HouseholdAct =
  | { kind: 'seek' }
  | { kind: 'visit'; bride: BrideId }
  | { kind: 'gift'; bride: BrideId }
  | { kind: 'ask'; bride: BrideId }
  | { kind: 'feast' }
  | { kind: 'role'; role: SpouseRole; wife?: BrideId }
  | { kind: 'present'; wife?: BrideId }
  | { kind: 'evening'; wife?: BrideId }
  | { kind: 'name'; child: string; name: string }
  | { kind: 'path'; child: string; path: ChildPath }
  | { kind: 'childRole'; child: string; role: ChildRole; shop?: string }
  | { kind: 'pace'; pace: number }
  | { kind: 'inherit' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const ageOf = (c: Child) => Math.floor(c.ageDays / 365);
export const childName = (c: Child) => c.name ?? (c.sex === 'son' ? 'your son' : 'your daughter');
export const contentWord = (v: number) => (v >= 75 ? 'Content' : v >= 50 ? 'Settled' : v >= 25 ? 'Lonely' : 'Unhappy');
export const merchantName = (s: Pick<GameState, 'household'>, fallback = 'Hassan') => hh(s).merchant?.name ?? fallback;
export const PATH_WORD: Record<ChildPath, string> = { school: 'at school', shop: 'learning the trade at the stall', weaving: 'at the loom' };
export const ROLE_WORD: Record<SpouseRole, string> = { home: 'Keeps the house', stall: 'Minds the Giza stall', books: 'Keeps the books', rugs: 'Judges and mends rugs' };

/** Can families be approached yet? */
export const standing = (s: Pick<GameState, 'reputation' | 'upgrades'>) => s.reputation >= MATCH_REP && s.upgrades.some((u) => MATCH_STALLS.includes(u));

/** What one call on her family adds to their opinion of you: your name, your dress (and whether it is
 *  clean), your honesty in the bazaar, and what her family cares for most. */
export function visitGain(s: Pick<GameState, 'reputation' | 'wardrobe' | 'attire' | 'manner' | 'skills' | 'stats'>, id: BrideId): { gain: number; why: string } {
  const b = BRIDES[id];
  const ch = heroCharisma(s.wardrobe ?? START_WARDROBE, s.attire?.clean ?? 100);
  const m = s.manner ?? { honesty: 0, firmness: 0, kindness: 0, charm: 0 };
  const clean = s.attire?.clean ?? 100;
  let g = 10 + Math.min(5, Math.floor(s.reputation / 10)) + Math.round(ch / 4) + clamp(Math.round(m.honesty / 20), -5, 5);
  let why = '';
  if (b.likes === 'dress') { g += Math.round(ch / 4); why = ch >= 8 ? 'Her father looks at your coat before your face, and he is satisfied.' : 'Her father looks at your clothes a moment too long.'; }
  if (b.likes === 'honesty') {
    g += clamp(Math.round(m.honesty / 10), -10, 5) + Math.min(3, Math.floor(levelOf(s.skills?.scholarship ?? 0) / 3));
    const fa = id === 'nadia' ? 'The teacher' : b.father.split(',')[0];
    why = m.honesty >= 10 ? `${fa} has asked about you in the bazaar, and heard you deal straight.` : m.honesty <= -10 ? `${fa} has heard you tell a good story in the bazaar. He is not sure he likes it.` : `${fa} asks how you trade, and listens to the answer.`;
  }
  if (b.likes === 'craft') {
    const eye = Math.min(6, Math.floor((levelOf(s.skills?.appraisal ?? 0) + levelOf(s.skills?.craft ?? 0)) / 3));
    g += eye + clamp(Math.round(m.kindness / 25), -2, 3);
    const fa = id === 'amira' ? 'Hajj Mansur' : b.father.split(',')[0];
    why = eye >= 3 ? `${fa} turns a rug over and you read the back together. A nod.` : `${fa} shows you the family's carpets. You do not know what to say about them.`;
  }
  if (b.likes === 'learning') {
    const lv = levelOf(s.skills?.scholarship ?? 0);
    g += Math.min(8, Math.floor(lv / 2));
    why = lv >= 6 ? `You talk of books with ${b.father.split(',')[0]} until the coffee is cold.` : `${b.father.split(',')[0]} asks what you have read lately. You change the subject.`;
  }
  if (clean < 35) { g -= 4; why += ' You came in the dust of the road.'; }
  if (id === 'aziza' && (s as { selimShamed?: boolean }).selimShamed) { g -= 6; why += ' Her mother has not forgotten the business with Selim\'s dyes.'; }
  g -= Math.min(6, (s.stats?.liesCaught ?? 0) * 2);
  return { gain: Math.max(2, Math.round(g)), why: why.trim() };
}

type Act = Pick<GameState, 'ranks' | 'household' | 'day' | 'cash' | 'reputation' | 'world' | 'ledger' | 'journal' | 'wardrobe' | 'attire' | 'manner' | 'skills' | 'stats' | 'ended'>;
export interface ActResult { patch: Partial<GameState>; msg: string; ok: boolean }
const no = (msg: string): ActResult => ({ patch: {}, msg, ok: false });

/** The heir: the eldest child who is grown. */
export function heirOf(h: HouseholdState): Child | undefined {
  return h.children.filter((c) => ageOf(c) >= GROWN && c.name).sort((a, b) => a.born - b.born || b.ageDays - a.ageDays)[0];
}

/** A grown child left to keep a shop: the shop record carries `childAgent`, read with childAgentOf. */
export function childAgentOf(s: unknown, shopKey: string): Child | undefined {
  const shops = (s as { shops?: Record<string, { childAgent?: { id: string } } | undefined> }).shops;
  const id = shops?.[shopKey]?.childAgent?.id;
  return id ? hh(s as GameState).children.find((c) => c.id === id) : undefined;
}
/** how much an agent can skim unseen: halved while someone at home keeps the books */
export function skimFactor(s: Pick<GameState, 'household'>) {
  const ws = wivesOf(hh(s)).filter((w) => w.role === 'books' && w.content >= 25);
  return ws.length ? (ws.some((w) => w.id === 'nadia') ? 0.25 : 0.5) : 1;
}
/** your wife minding the Giza stall while you are away (no boy hired, and she is willing): her name */
export function spouseMinds(s: Pick<GameState, 'household' | 'shopBoy'>): string | null {
  const sp = wivesOf(hh(s)).find((w) => w.role === 'stall' && w.content >= 25);
  return sp && !s.shopBoy?.hired ? BRIDES[sp.id].short : null;
}
/** a grown son travelling with you as your apprentice */
export const apprentice = (s: Pick<GameState, 'household'>) => hh(s).children.find((c) => c.role === 'apprentice');

/** her father's house: where you must stand in his city's table before he gives his daughter to you */
export function houseNeed(r: RanksState | undefined, b: Bride): string | null {
  if (!b.house || !b.place) return null;
  const t = tableOf(b.city) ?? b.city;
  const at = tableStanding(r, t);
  if (at <= b.place) return null;
  const fa = b.father.split(',')[0];
  return `${fa} keeps his own place on the ${b.cityName} table. He gives his daughter to a house among the first ${b.place} there, this season or the last${at < 99 ? `; you stand ${ordinal(at)}` : '; you have not sold there yet'}.`;
}
/** the houses you are married into */
export const inLawHouses = (h: HouseholdState | undefined): string[] => (h ? wivesOf(h).map((w) => BRIDES[w.id]?.house).filter((x): x is string => !!x) : []);
export const HOUSE_PERK = 'Her father\'s house stops competing against you, and sends you a customer\'s order now and then.';
export const houseName = (b: Bride) => (b.house ? RIVAL[b.house]?.name : undefined);

/** whether this family will receive you now */
const courting = (h: HouseholdState, id: BrideId) => !!BRIDES[id] && canCourt(h) && h.stage !== 'betrothed' && availableBrides(h).includes(id);
/** courting keeps a married man's stage as it is */
const courtStage = (h: HouseholdState): HouseholdState['stage'] => (h.spouse ? 'married' : 'offered');

export function applyHousehold(s: Act, a: HouseholdAct, rng: () => number = Math.random): ActResult {
  const h = hh(s);
  const at = s.world.at;
  const day = s.day;
  const hour = s.world.hour;
  const pay = (amount: number, label: string): Pick<GameState, 'cash' | 'ledger'> => ({ cash: s.cash - amount, ledger: [...s.ledger, { day, kind: 'expense', label, amount: -amount } as LedgerEntry] });
  const jot = (text: string) => [...s.journal, { day, text, kind: 'home' }];
  const kid = (id: string) => h.children.find((c) => c.id === id);
  const setKid = (c: Child): HouseholdState => ({ ...h, children: h.children.map((x) => (x.id === c.id ? c : x)) });
  const pick = (id?: BrideId) => (id ? wivesOf(h).find((w) => w.id === id) : h.spouse);

  switch (a.kind) {
    // marriage is never forced on the merchant: he asks Rashid to look for a match only if he wants one
    case 'seek': {
      if (h.offered !== undefined || h.stage === 'offered' || !canCourt(h) || h.stage === 'betrothed') return no(wivesOf(h).length >= MAX_WIVES ? 'You have four wives. The law allows no more.' : 'That is already in hand.');
      if (h.spouse && s.reputation < wifeRep(h)) return no(`Rashid strokes his beard: "Another wife? A family gives a daughter to a man with a house already full only if his name is big enough (reputation ${wifeRep(h)})."`);
      if (!standing(s as never)) return no(`Rashid laughs: "On what? Families want a name (reputation ${MATCH_REP}) and a stall with a canopy before they open the door to you."`);
      return { ok: true, msg: OFFER_NOTE, patch: { household: { ...h, stage: courtStage(h), offered: day }, journal: jot(h.spouse ? 'Asked Uncle Rashid to look for another wife.' : 'Asked Uncle Rashid to look for a match.') } };
    }
    case 'visit': {
      const b = BRIDES[a.bride];
      if (!courting(h, a.bride)) return no('There is no family to call on.');
      if (at !== b.city) return no(`${b.short}'s family lives in ${b.cityName}. Call on them when you are there.`);
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.lastVisit === day) return no('You called on them today. Calling twice in a day is pressing.');
      if (hour + VISIT_HOURS > 20) return no('It is too late in the day to call on a family. Go in the morning.');
      const { gain, why } = visitGain(s, a.bride);
      const favour = clamp(su.favour + gain, 0, 100);
      const ready = favour >= ASK_AT;
      const msg = `You sit with ${b.father.split(',')[0]} for coffee and talk of the trade. ${why} ${ready ? 'He would hear a proposal now.' : 'He will think about you.'}`.replace(/\s+/g, ' ');
      return { ok: true, msg, patch: {
        household: { ...h, stage: courtStage(h), offered: h.offered ?? day, suitors: { ...h.suitors, [a.bride]: { ...su, favour, visits: su.visits + 1, lastVisit: day } } },
        world: { ...s.world, hour: Math.min(23.9, hour + VISIT_HOURS) },
        journal: jot(`Called on ${b.father.split(',')[0]} in ${b.cityName}.`),
      } };
    }
    case 'gift': {
      const b = BRIDES[a.bride];
      if (!courting(h, a.bride)) return no('There is no family to send a present to.');
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.lastGift !== undefined && day - su.lastGift < GIFT_EVERY) return no('Your last present has hardly arrived. Another so soon looks like buying favour.');
      if (s.cash < b.gift.cost) return no(`A fitting present costs ${fmt(b.gift.cost)}. You do not have it.`);
      const lift = su.visits ? 8 : 4;
      return { ok: true, msg: `You send ${b.gift.label} to the house in ${b.cityName}${su.visits ? '' : '. A present from a man they have not met counts for less'}.`, patch: {
        ...pay(b.gift.cost, `A present for the ${b.name.split(' ').slice(1).join(' ')} family`),
        household: { ...h, stage: courtStage(h), offered: h.offered ?? day, suitors: { ...h.suitors, [a.bride]: { ...su, favour: clamp(su.favour + lift, 0, 100), gifts: su.gifts + 1, lastGift: day } } },
      } };
    }
    case 'ask': {
      const b = BRIDES[a.bride];
      if (!courting(h, a.bride)) return no('You are not courting.');
      if (h.spouse && s.reputation < wifeRep(h)) return no(`${b.father.split(',')[0]} knows you have a wife at home. For his daughter to join your house he wants a name of ${wifeRep(h)}.`);
      if (h.spouse && b.rank === 'grand') return no(`${b.father.split(',')[0]} is courteous and very clear: a daughter of his house is no man's second wife.`);
      const need = houseNeed(s.ranks, b);
      if (need) return no(need);
      if (b.minRep && s.reputation < b.minRep) return no(`${b.father.split(',')[0]} is polite, but his house looks higher: he wants a name of ${b.minRep} before he will hear you.`);
      if (at !== b.city) return no(`You ask in person, at her father's house in ${b.cityName}.`);
      const su = h.suitors[a.bride] ?? { favour: 0, visits: 0, gifts: 0 };
      if (su.favour < ASK_AT) {
        return { ok: false, msg: 'Her father says it is too soon; the families hardly know each other. Call again, and send word to the house.', patch: { household: { ...h, suitors: { ...h.suitors, [a.bride]: { ...su, favour: clamp(su.favour - 5, 0, 100) } } } } };
      }
      if (a.bride === 'nadia' && (s.manner?.honesty ?? 0) < -25) return no('The teacher has heard too many stories about your stories. He will not give his daughter to a fox.');
      if (s.cash < b.mahr) return no(`The mahr agreed between the families is ${fmt(b.mahr)}, paid when the contract is written. You have ${fmt(s.cash)}.`);
      return { ok: true, msg: `Her father gives his consent. The contract is written before the ma'zun, and the mahr of ${fmt(b.mahr)} is paid. The wedding feast in ${b.cityName} can be held from ${dateFor(day + FEAST_AFTER).short}.`, patch: {
        ...pay(b.mahr, `Mahr for ${b.name} (the marriage contract)`),
        household: { ...h, stage: h.spouse ? 'married' : 'betrothed', chosen: a.bride, contract: day },
        journal: jot(`The marriage contract with ${b.name} is written in ${b.cityName}. Mahr ${fmt(b.mahr)}.`),
      } };
    }
    case 'feast': {
      if (!h.chosen || (h.stage !== 'betrothed' && !h.spouse)) return no('There is no wedding to hold.');
      const b = BRIDES[h.chosen];
      if (at !== b.city) return no(`The feast is held in ${b.cityName}, at her family's house.`);
      const from = (h.contract ?? day) + FEAST_AFTER;
      if (day < from) return no(`Her family is still preparing. The feast can be held from ${dateFor(from).short}.`);
      const n = wivesOf(h).length;
      const rooms = ROOMS_COST[n] ?? 0;
      if (s.cash < b.feast + rooms) return no(`The feast costs ${fmt(b.feast)}: the cooks, the singers, the lamps and the cart for her things.${rooms ? ` Her own rooms in the house cost ${fmt(rooms)} more.` : ''} You have ${fmt(s.cash)}.`);
      const friends = [...new Set([...s.world.friends, ...b.friends])];
      const birth = FIRST_CHILD[0] + Math.floor(rng() * (FIRST_CHILD[1] - FIRST_CHILD[0]));
      if (n) {
        const others = wivesOf(h).map((w) => ({ ...w, content: clamp(w.content - JEALOUSY, 0, 100) }));
        const nw: Spouse = { id: b.id, married: day, content: 65, role: 'home', lastHome: day, birthIn: birth };
        const [first, ...rest] = others;
        const names = others.map((w) => BRIDES[w.id].short).join(' and ');
        return { ok: true, msg: `The wedding feast is held at her father's house in ${b.cityName}. ${b.short} comes to Giza, to rooms of her own. ${names} receive${others.length === 1 ? 's' : ''} her politely, and coolly. Reputation +${b.feastRep}.`, patch: {
          ...pay(b.feast, `Wedding feast in ${b.cityName}`),
          ledger: [...s.ledger, { day, kind: 'expense', label: `Wedding feast in ${b.cityName}`, amount: -b.feast } as LedgerEntry, { day, kind: 'expense', label: `Rooms for ${b.short} in the house`, amount: -rooms } as LedgerEntry],
          cash: s.cash - b.feast - rooms,
          reputation: s.reputation + b.feastRep,
          world: { ...s.world, friends, hour: Math.min(23.9, hour + 4) },
          household: { ...h, stage: 'married', spouse: first, wives: [...rest, nw], chosen: undefined, contract: undefined, suitors: {} },
          journal: jot(`Married ${b.name} in ${b.cityName}, my ${['', 'second', 'third', 'fourth'][n]} wife.`),
        } };
      }
      const spouse: Spouse = { id: b.id, married: day, content: 70, role: b.role, lastHome: day };
      return { ok: true, msg: `The wedding feast is held at her father's house in ${b.cityName}. Half the quarter comes. ${b.short} goes ahead to your house in Giza with her things. Reputation +${b.feastRep}.`, patch: {
        ...pay(b.feast, `Wedding feast in ${b.cityName}`),
        reputation: s.reputation + b.feastRep,
        world: { ...s.world, friends, hour: Math.min(23.9, hour + 4) },
        household: { ...h, stage: 'married', spouse, chosen: undefined, contract: undefined, suitors: {}, birthIn: birth },
        journal: jot(`Married ${b.name} in ${b.cityName}. The dealers of ${b.friends.map((f) => f[0].toUpperCase() + f.slice(1)).join(' and ')} now count you a friend of the family.`),
      } };
    }
    case 'role': {
      const sp = pick(a.wife);
      if (!sp) return no('You are not married.');
      if (!ROLE_WORD[a.role]) return no('');
      return { ok: true, msg: `${BRIDES[sp.id].short}: ${ROLE_WORD[a.role].toLowerCase()}.`, patch: { household: setWife(h, { ...sp, role: a.role }) } };
    }
    case 'present': {
      const sp = pick(a.wife);
      if (!sp) return no('You are not married.');
      if (sp.lastPresent !== undefined && day - sp.lastPresent < PRESENT.every) return no('You brought her something only the other day.');
      if (s.cash < PRESENT.cost) return no(`A good present costs ${fmt(PRESENT.cost)}.`);
      const home = at === 'giza';
      const lift = home ? PRESENT.lift : PRESENT.lift - 3;
      const where = home ? 'You bring' : `You send from ${at ? at[0].toUpperCase() + at.slice(1) : 'the road'}`;
      return { ok: true, msg: `${where} ${BRIDES[sp.id].short} a length of silk and a box of sweets.`, patch: {
        ...pay(PRESENT.cost, `A present for ${BRIDES[sp.id].short}`),
        household: setWife(h, { ...sp, content: clamp(sp.content + lift, 0, 100), lastPresent: day }),
      } };
    }
    case 'evening': {
      const sp = pick(a.wife);
      if (!sp) return no('You are not married.');
      if (at !== 'giza') return no('You are not at home.');
      if (wivesOf(h).some((w) => w.lastEvening === day)) return no('You are at home tonight already.');
      const kids = h.children.filter((c) => c.name && motherOf(h, c) === sp.id).length;
      // the evening is hers; the others notice, a little
      const h2 = wivesOf(h).length > 1 ? wivesOf(h).reduce((acc, w) => (w.id === sp.id ? acc : setWife(acc, { ...w, content: clamp(w.content - 1, 0, 100), lastHome: day })), h) : h;
      return { ok: true, msg: `You go home early and eat with ${BRIDES[sp.id].short}${kids ? ' and the children' : ''}. The stall can wait.`, patch: {
        household: setWife(h2, { ...sp, content: clamp(sp.content + EVENING.lift, 0, 100), lastEvening: day, lastHome: day }),
        world: { ...s.world, hour: Math.min(23.9, Math.max(hour, 18) + EVENING.hours) },
      } };
    }
    case 'name': {
      const c = kid(a.child);
      if (!c) return no('');
      if (c.name) return no(`${c.name} has a name.`);
      const list = c.sex === 'son' ? SON_NAMES : DAUGHTER_NAMES;
      if (!list.includes(a.name)) return no('');
      return { ok: true, msg: `${a.name} it is.`, patch: { household: setKid({ ...c, name: a.name }), journal: jot(`Named our ${c.sex} ${a.name}.`) } };
    }
    case 'path': {
      const c = kid(a.child);
      if (!c) return no('');
      if (ageOf(c) < PATH_AGE) return no(`${childName(c)} is too young.`);
      if (ageOf(c) >= GROWN) return no(`${childName(c)} is grown.`);
      return { ok: true, msg: `${childName(c)} will be ${PATH_WORD[a.path]}.`, patch: { household: setKid({ ...c, path: a.path }) } };
    }
    case 'childRole': {
      const c = kid(a.child);
      if (!c) return no('');
      if (ageOf(c) < GROWN) return no(`${childName(c)} is not yet grown.`);
      const shops = (s as unknown as { shops?: Record<string, Record<string, unknown> | undefined> }).shops;
      let nextShops = shops;
      // leaving a shop: its record no longer names the child
      if (c.shopAt && shops?.[c.shopAt]) { const { childAgent: _drop, ...rest } = shops[c.shopAt] as Record<string, unknown>; void _drop; nextShops = { ...shops, [c.shopAt]: rest }; }
      if (a.role === 'apprentice') {
        if (c.sex !== 'son') return no('A daughter does not travel the caravan roads with her father. She can keep a shop.');
        const others = h.children.map((x) => (x.role === 'apprentice' && x.id !== c.id ? { ...x, role: 'home' as const } : x));
        return { ok: true, msg: `${c.name} travels with you now, to learn the roads and the dealers.`, patch: { household: { ...h, children: others.map((x) => (x.id === c.id ? { ...c, role: 'apprentice', shopAt: undefined } : x)) }, ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}) } };
      }
      if (a.role === 'shop') {
        const key = a.shop ?? '';
        if (!nextShops?.[key]) return no('There is no shop of yours there to keep.');
        const agent = { id: c.id, name: c.name ?? childName(c), since: day };
        return { ok: true, msg: `${c.name} will keep the shop.`, patch: { household: setKid({ ...c, role: 'shop', shopAt: key }), shops: { ...nextShops, [key]: { ...nextShops[key], childAgent: agent } } } as unknown as Partial<GameState> };
      }
      return { ok: true, msg: `${c.name} stays at home.`, patch: { household: setKid({ ...c, role: 'home', shopAt: undefined }), ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}) } };
    }
    case 'pace': {
      if (!(PACES as readonly number[]).includes(a.pace)) return no('');
      return { ok: true, msg: a.pace === 1 ? 'The years at home pass as the days do.' : `Each day of trade counts for ${a.pace} at home.`, patch: { household: { ...h, pace: a.pace } } };
    }
    case 'inherit': {
      const heir = heirOf(h);
      if (!heir?.name) return no('There is no grown child to take on the house.');
      const prev = h.merchant?.name ?? 'Hassan';
      const why = s.ended?.cause === 'death' ? `${prev} is buried in the family tomb.` : s.ended ? `${prev} gives up the trade.` : `${prev} hands the keys of the house to ${heir.name} and sits at home with his pipe.`;
      const rep = Math.round(s.reputation * HEIR_REP);
      const shops = (s as unknown as { shops?: Record<string, Record<string, unknown> | undefined> }).shops;
      let nextShops = shops;
      if (heir.shopAt && shops?.[heir.shopAt]) { const { childAgent: _d, ...rest } = shops[heir.shopAt] as Record<string, unknown>; void _d; nextShops = { ...shops, [heir.shopAt]: rest }; }
      const next: HouseholdState = {
        ...h,
        stage: 'none', suitors: {}, chosen: undefined, contract: undefined, spouse: undefined, wives: undefined, birthIn: undefined, offered: undefined,
        mother: (heir.mother ?? h.spouse?.id) ?? h.mother,
        children: h.children.filter((c) => c.id !== heir.id).map((c) => (c.role === 'apprentice' ? { ...c, role: 'home' as const } : c)),
        merchant: { name: heir.name, since: day, gen: (h.merchant?.gen ?? 1) + 1, father: prev },
      };
      return { ok: true, msg: `${why} ${heir.name} takes on the trading house, its shops and stock, and something of the family name (reputation ${rep}).`, patch: {
        household: next, reputation: rep, ended: undefined,
        ...(nextShops !== shops ? { shops: nextShops } as Partial<GameState> : {}),
        journal: jot(`${why} ${heir.name} now heads the house.`),
      } };
    }
  }
  return no('');
}

const OFFER_NOTE = 'Uncle Rashid is pleased: "At last." He has spoken to a schoolteacher in Cairo; Farid al-Ajami writes of Abu Nadim al-Shami\'s daughter in Damascus; the Abu Salem weavers in the Fayoum have a daughter of age. The families would receive you, but they will want to know you first: call on them, send presents, and keep your name clean.';

/** letters from home, by her mood */
function letterBody(h: HouseholdState, sp: Spouse, away: number, rng: () => number): { title: string; body: string } {
  const named = h.children.filter((c) => c.name);
  const kid = named.length ? named[Math.floor(rng() * named.length)] : undefined;
  const kidLine = !kid ? '' : ageOf(kid) < 6 ? ` ${kid.name} asks every evening when Baba is coming home.` : kid.path === 'school' ? ` ${kid.name} has a good report from the school.` : kid.path === 'weaving' ? ` ${kid.name} finished a strip on the loom and wants you to see it.` : kid.path === 'shop' ? ` ${kid.name} sat at the stall with Hajj Mahmoud's boy and sold nothing, but talked a great deal.` : '';
  if (sp.content >= 60) {
    const warm = ['The house is well. The neighbours ask after you, and I tell them the trade goes well with you.', 'Everything is in order at home. Your mother\'s cousin came to visit and stayed for lunch.', 'The weather has turned and I have aired the winter bedding. All is well here.'];
    return { title: 'All is well at home', body: `${warm[Math.floor(rng() * warm.length)]}${kidLine} Come home safely.` };
  }
  if (sp.content >= 30) return { title: 'News from home', body: `It is ${away} days now. The house is quiet without you.${kidLine} Write when you can, and tell me when you will be back.` };
  return { title: 'When are you coming home?', body: `It has been ${away} days. I hear more of you from the neighbours than from you.${kidLine} A house needs its master.` };
}

/** The household at night: families who will listen, your wife's contentment and her letters, her help
 *  with the stall and the books, births and children growing. `s` is the state the night began with,
 *  `patch` what the rollover changed; lines for the morning go into `notes`. Returns fields to add. */
export function householdNight(s: GameState, patch: Partial<GameState>, notes: string[], day: number, rng: () => number): Partial<GameState> {
  const h0 = s.household;
  const rep = patch.reputation ?? s.reputation;
  const upgrades = patch.upgrades ?? s.upgrades;
  let h: HouseholdState = h0 ?? HOUSEHOLD_START;
  const out: Partial<GameState> = {};
  const at = (patch.world ?? s.world).at;
  const home = at === 'giza';

  // families are approached only when the merchant asks Rashid to look for a match ('seek'), or he
  // comes to know of one himself: a buyer who trusts him speaks of a daughter, a young woman comes to
  // the stall, a family on the road asks who he is. One at a time, and only once his name can carry it.
  if (canCourt(h) && h.stage !== 'betrothed' && rep >= wifeRep(h) && upgrades.some((u) => MATCH_STALLS.includes(u))) {
    const known = new Set(h.known ?? []);
    const hash = (salt: string) => { let x = day * 2654435761; for (let i = 0; i < salt.length; i++) x = Math.imul(x ^ salt.charCodeAt(i), 0x01000193) >>> 0; return (x % 10000) / 10000; };
    const fresh = Object.values(BRIDES).find((b) => {
      if (!b.meet || b.meet === 'rashid' || known.has(b.id)) return false;
      if (b.meet === 'friend') return (s.relationships[b.via ?? '']?.purchases ?? 0) >= 3;
      if (b.meet === 'city') return at === b.city && hash(b.id) < 0.35;
      if (b.meet === 'stall') return home && hash('stall-' + b.id) < 1 / 10;
      return false;
    });
    if (fresh) {
      h = { ...h, known: [...known, fresh.id] };
      out.household = h;
      notes.push(`${fresh.met ?? fresh.intro} (Her family would receive you: see Household.)`);
    }
  }

  let tinDone = false;
  for (const sp0 of wivesOf(h)) {
    const first = sp0.id === h.spouse?.id;
    const b = BRIDES[sp0.id];
    let sp: Spouse = { ...sp0 };
    const kids = h.children.filter((c) => motherOf(h, c) === sp0.id).length;
    const away = day - sp.lastHome;
    if (home) sp = { ...sp, lastHome: day, content: sp.content + 1.5 + 0.3 * kids };
    else if (away > 10) sp = { ...sp, content: sp.content - (away > 30 ? 2 : 1) };
    sp.content = clamp(Math.round(sp.content * 10) / 10, 0, 100);
    if (sp0.content >= 25 && sp.content < 25) notes.push(`${b.short} is unhappy: you are hardly ever at home.${sp.role === 'stall' || sp.role === 'books' ? ' She has stopped helping with the trade.' : ''}`);

    // a letter every eight days or so while you are away
    if (!home && away >= 6 && day - (sp.lastLetter ?? sp.married) >= 8) {
      const { title, body } = letterBody(h, sp, away, rng);
      out.post = post(out.post ?? patch.post ?? s.post, { day, sent: day - 2, kind: 'letter', from: `${b.short}, at home in Giza`, title, body });
      sp.lastLetter = day;
      notes.push(`Post: a letter from ${b.short} in Giza, "${title}". Read it under Progress, Post.`);
    }

    const willing = sp.content >= 25;
    const cash0 = out.cash ?? patch.cash ?? s.cash;
    let cash = cash0;
    let ledger: LedgerEntry[] | undefined;
    const addLedger = (e: LedgerEntry) => { ledger = [...(ledger ?? out.ledger ?? patch.ledger ?? s.ledger), e]; };
    // the books: money short in the boy's tin is found and put back
    if (willing && sp.role === 'books' && !tinDone) {
      const short = (patch.ledger ?? s.ledger).filter((e) => e.day === s.day && e.label.startsWith('Short in')).reduce((n, e) => n - e.amount, 0);
      if (short > 0 && (sp.id === 'nadia' || rng() < 0.5)) {
        cash += short;
        tinDone = true;
        addLedger({ day: s.day, kind: 'bonus', label: `${b.short} found the money short in the tin`, amount: short });
        notes.push(`${b.short} counted the tin against the day's sales. The boy turned out his pockets: ${fmt(short)} put back.`);
      }
    }
    // rugs: a dirty rug at the stall washed at home; Amira mends worn ones too
    const inv = out.inventory ?? patch.inventory ?? s.inventory;
    if (willing && sp.role === 'rugs' && day - (sp.lastMend ?? sp.married) >= (sp.id === 'amira' ? 6 : 10)) {
      const can = (i: RugItem) => i.stored && !i.restoringUntil && (i.condition === 'Dirty' || (sp.id === 'amira' && i.condition === 'Worn'));
      const r = inv.find(can);
      if (r) {
        const worn = r.condition === 'Worn';
        out.inventory = inv.map((i) => (i.uid === r.uid ? { ...i, condition: 'Good', restored: i.restored || worn, notes: [...(i.notes ?? []), worn ? `Mended at home by ${b.short}.` : `Washed at home by ${b.short}.`] } : i));
        sp.lastMend = day;
        notes.push(`${b.short} ${worn ? 'mended' : 'washed'} a ${r.condition.toLowerCase()} rug from the stall at home. It is in good order now.`);
      }
    }
    // Amira's workshop: a loom or two in the courtyard, and weavers' girls from the quarter
    if (sp.id === 'amira' && !sp.workshop && day - sp.married >= AMIRA_WORKSHOP_AFTER && willing) {
      sp.workshop = true;
      notes.push('Amira has set up two looms in the courtyard and taken on two girls from the quarter. Her small workshop will bring in a little each week.');
    }
    if (sp.workshop && willing && day % 7 === 0) {
      const weavers = h.children.filter((c) => c.path === 'weaving' && ageOf(c) >= 12).length;
      const inc = 40 + 15 * weavers;
      cash += inc;
      addLedger({ day: s.day, kind: 'sale', label: `${b.short}'s workshop: the week's weaving`, amount: inc });
    }
    if (cash !== cash0) out.cash = cash;
    if (ledger) out.ledger = ledger;
    h = setWife(h, sp);

    // births
    let children = h.children;
    let birthIn = first ? h.birthIn : sp.birthIn;
    if (kids < MAX_CHILDREN && birthIn !== undefined) {
      birthIn -= h.pace;
      if (birthIn <= 0) {
        // one baby as a rule; twins now and then, very rarely three. Each is a son or a daughter by chance,
        // except that a third of twins are identical, and so the same
        const roll = rng();
        const many = Math.min(roll < TRIPLETS ? 3 : roll < TRIPLETS + TWINS ? 2 : 1, Math.max(1, MAX_CHILDREN - kids));
        const sexes: Child['sex'][] = [];
        const same = many > 1 && rng() < 1 / 3;
        for (let i = 0; i < many; i++) sexes.push(same && i ? sexes[0] : rng() < 0.5 ? 'son' : 'daughter');
        const born = sexes.map((sex, i): Child => ({ id: `c${day}-${children.length + i}`, sex, born: day, ageDays: 0, look: Math.floor(rng() * 3), ...(same ? { twinOf: `c${day}-${children.length}` } : {}), traits: { learning: 5 + Math.floor(rng() * 10), trade: 5 + Math.floor(rng() * 10), craft: 5 + Math.floor(rng() * 10) }, ...(first ? {} : { mother: sp.id }) }));
        if (same) born.forEach((c) => (c.look = born[0].look));
        children = [...children, ...born];
        birthIn = NEXT_CHILD[0] + Math.floor(rng() * (NEXT_CHILD[1] - NEXT_CHILD[0]));
        sp.content = clamp(sp.content + 10 * many, 0, 100);
        const sons = sexes.filter((x) => x === 'son').length, daus = many - sons;
        const what = many === 1 ? `a ${sexes[0]}` : `${many === 2 ? 'twins' : 'triplets'}: ${[sons ? `${sons === 1 ? 'a son' : sons === 2 ? 'two sons' : 'three sons'}` : '', daus ? `${daus === 1 ? 'a daughter' : daus === 2 ? 'two daughters' : 'three daughters'}` : ''].filter(Boolean).join(' and ')}`;
        const well = many === 1 ? 'Mother and child are well' : 'Mother and children are well';
        notes.push(home ? `${b.short} has had ${what} in the night. ${well}, God be praised. Choose ${many === 1 ? 'a name' : 'names'} (Me, Household).` : `A telegram from Giza: ${b.short} has had ${what}. ${well}. Choose ${many === 1 ? 'a name' : 'names'} (Me, Household).`);
      }
    }
    h = first ? { ...setWife(h, sp), children, birthIn } : { ...setWife(h, { ...sp, birthIn }), children };
  }
  // the years at home: the children grow whether or not their father is alive to see it
  if (h.children.length) {
    const children = h.children.map((c) => {
      const before = ageOf(c);
      const n: Child = { ...c, ageDays: c.ageDays + h.pace };
      const after = ageOf(n);
      if (after > before) {
        const t = { ...n.traits };
        if (n.path === 'school') t.learning += 6; else if (n.path === 'shop') t.trade += 6; else if (n.path === 'weaving') t.craft += 6;
        if (after >= 6) { t.learning += 1; t.trade += 1; t.craft += 1; }
        n.traits = { learning: Math.min(100, t.learning), trade: Math.min(100, t.trade), craft: Math.min(100, t.craft) };
        if (after === PATH_AGE && !n.path) notes.push(`${childName(n)} is six: time to choose school, the stall or the loom (Me, Household).`);
        if (after === GROWN) notes.push(`${childName(n)} is grown, and can travel with you or keep a shop (Me, Household).`);
      }
      // an apprentice on the road learns the trade faster
      if (n.role === 'apprentice' && !home) n.traits = { ...n.traits, trade: Math.min(100, Math.round((n.traits.trade + 0.2) * 10) / 10) };
      return n;
    });
    h = { ...h, children };
  }
  if (h !== h0) out.household = h;
  return out;
}
