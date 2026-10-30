// Titles: small honours for the way you play. Earned once, shown on your Merchant page.
import { levelOf } from './character';
import { RUGS } from './rugs';
import { RANK_CITIES } from './rivals';

export interface TitleCtx {
  totalSales: number;
  manner: { honesty: number; firmness: number; kindness: number; charm: number };
  skills: Record<string, number | undefined>;
  court: { warrants: string[] };
  register: string[];
  inventory: { typeId: string }[];
  books: string[];
  whereabouts?: Record<number, string>;
  stats?: { liesOk?: number; liesCaught?: number; auctionsWon?: number };
  missions?: Record<string, string>;
  /** cities where a season ended with you first among the dealers (systems/ranks.ts) */
  ranks?: { firsts?: string[] };
  dreams?: { seen: number; best: number };
  /** Rashid's first instalment (game/firstWeek.ts): how it was settled */
  family?: { first?: { how?: string } };
}

export interface TitleDef { id: string; name: string; how: string; secret?: boolean; /** listed only once earned */ quiet?: boolean; test: (s: TitleCtx) => boolean }

const visited = (s: TitleCtx) => new Set(Object.values(s.whereabouts ?? {}).filter((w) => w && w !== 'road'));

export const TITLES: TitleDef[] = [
  { id: 'first', name: 'First Piastre', how: 'Make your first sale.', test: (s) => s.totalSales >= 1 },
  { id: 'firstpaid', name: 'Paid on the Nail', how: 'Pay Uncle Rashid the first instalment of your father\'s debt.', test: (s) => ['early', 'onTime', 'late'].includes(s.family?.first?.how ?? '') },
  { id: 'hundred', name: 'Fifty Carpets', how: 'Sell fifty rugs.', test: (s) => s.totalSales >= 50 },
  { id: 'honest', name: 'A Man of His Word', how: 'Be known as honest (Honesty 50).', test: (s) => s.manner.honesty >= 50 },
  { id: 'fox', name: 'The Fox of Giza', how: 'Get away with ten embellished stories.', test: (s) => (s.stats?.liesOk ?? 0) >= 10 },
  { id: 'rock', name: 'The Rock', how: 'Be known as firm (Firmness 50).', test: (s) => s.manner.firmness >= 50 },
  { id: 'generous', name: 'Open Hand', how: 'Be known as kind (Kindness 50).', test: (s) => s.manner.kindness >= 50 },
  { id: 'charmer', name: 'Honey Tongue', how: 'Be known as charming (Charm 50).', test: (s) => s.manner.charm >= 50 },
  { id: 'saffron', name: 'Friend of Saffron', how: 'Reach Cat-keeping 5.', test: (s) => levelOf(s.skills.catkeeping ?? 0) >= 5 },
  { id: 'haggler', name: 'Master of the Bargain', how: 'Reach Haggling 10.', test: (s) => levelOf(s.skills.haggling ?? 0) >= 10 },
  { id: 'eye', name: 'The Eye', how: 'Reach Appraisal 10.', test: (s) => levelOf(s.skills.appraisal ?? 0) >= 10 },
  { id: 'letters', name: 'Man of Letters', how: 'Read three books.', test: (s) => s.books.length >= 3 },
  { id: 'alexandria', name: 'Errand Boy No More', how: 'Finish Rashid\'s errand in Alexandria.', test: (s) => s.missions?.alexandria === 'done' },
  { id: 'traveller', name: 'Traveller of the Levant', how: 'Stay in eight different towns.', test: (s) => visited(s).size >= 8 },
  { id: 'desert', name: 'Across the Desert', how: 'Reach Baghdad.', test: (s) => visited(s).has('baghdad') },
  { id: 'warrant', name: 'By Royal Appointment', how: 'Earn your first royal warrant.', test: (s) => s.court.warrants.length >= 1 },
  { id: 'collector', name: 'Collector', how: 'Enter twelve rugs in the Register.', test: (s) => s.register.length >= 12 },
  { id: 'legend', name: 'Keeper of Legends', how: 'Own a Legendary carpet.', test: (s) => s.inventory.some((i) => RUGS[i.typeId]?.tier === 4) },
  { id: 'hammer', name: 'The Hammer Falls', how: 'Win an estate auction.', test: (s) => (s.stats?.auctionsWon ?? 0) >= 1 },
  { id: 'rival', name: 'Rival Undone', how: 'Finish the story of Selim Kassab.', test: (s) => s.missions?.rival === 'done' },
  { id: 'orders', name: 'Trusted with Orders', how: 'Deliver a special order on time.', test: (s) => s.missions?.['ms-order'] === 'done' },
  { id: 'border', name: 'Known Beyond the Border', how: 'Sell £25 worth of rugs outside Egypt.', test: (s) => s.missions?.['ms-abroad'] === 'done' },
  { id: 'nodebt', name: 'Clear of Debt', how: 'Pay off your father\'s debt to Rashid.', test: (s) => s.missions?.['ms-debt'] === 'done' },
  { id: 'dreamer', name: 'The Dreamer', how: 'Fly over Giza on a carpet, if only in a dream.', secret: true, test: (s) => (s.dreams?.seen ?? 0) >= 1 },
  { id: 'caught', name: 'Caught Red-Handed', how: 'Be caught lying three times.', secret: true, test: (s) => (s.stats?.liesCaught ?? 0) >= 3 },
  // a season ended with you first among a city's dealers (systems/ranks.ts): kept for good
  ...RANK_CITIES.map((c): TitleDef => ({ id: `first-${c.id}`, name: `First Merchant of ${c.name}`, how: `End a season first among the rug dealers of ${c.name}.`, quiet: c.id !== 'cairo', test: (s) => !!s.ranks?.firsts?.includes(c.id) })),
];
