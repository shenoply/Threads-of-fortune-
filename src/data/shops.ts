// Shops in other cities (the empire's spending ladder), and the pieces that dress the Giza stall.
// Cairo's shop is the Khan el-Khalili upgrade (data/suppliers.ts 'khan'): owning it is owning Cairo.
// Every other city's shop is bought in that city's town menu, kept by an agent you hire there, and
// sells what you leave with him, a week at a time.
import { fmt } from '../game/economy/money';

export interface ShopCity {
  /** settlement id (data/world.ts) */
  id: string;
  /** the lease and the fitting out, in piastres */
  cost: number;
  /** reputation the landlords want to see */
  rep: number;
  /** where the shop stands, in a few words */
  place: string;
  /** how many buyers pass: about 0.8 (a small town) to 1.3 (Constantinople) */
  trade: number;
}

export const SHOP_CITIES: Record<string, ShopCity> = {
  cairo: { id: 'cairo', cost: 60000, rep: 60, place: 'in the Khan el-Khalili', trade: 1.25 },
  alexandria: { id: 'alexandria', cost: 80000, rep: 45, place: 'off the Souq el-Attarin', trade: 1.15 },
  portsaid: { id: 'portsaid', cost: 40000, rep: 30, place: 'on the Rue du Commerce, where the liners put in', trade: 0.95 },
  jaffa: { id: 'jaffa', cost: 35000, rep: 25, place: 'by the clock tower', trade: 0.9 },
  jerusalem: { id: 'jerusalem', cost: 60000, rep: 40, place: 'inside the Jaffa Gate', trade: 1.05 },
  beirut: { id: 'beirut', cost: 60000, rep: 40, place: 'in the Souq Tawileh', trade: 1.05 },
  damascus: { id: 'damascus', cost: 70000, rep: 45, place: 'in the Souq al-Hamidiyya', trade: 1.1 },
  aleppo: { id: 'aleppo', cost: 60000, rep: 40, place: 'in the covered souq', trade: 1.05 },
  amman: { id: 'amman', cost: 30000, rep: 25, place: 'below the citadel', trade: 0.8 },
  baghdad: { id: 'baghdad', cost: 90000, rep: 50, place: 'in the Souq al-Saray', trade: 1.15 },
  istanbul: { id: 'istanbul', cost: 150000, rep: 70, place: 'in the Grand Bazaar', trade: 1.3 },
  ankara: { id: 'ankara', cost: 50000, rep: 35, place: 'near the new Assembly', trade: 0.9 },
};
export const SHOP_IDS = Object.keys(SHOP_CITIES);

export interface AgentOffer {
  id: string;
  name: string;
  /** 0..1: how much of the takings reaches you (hidden; the souq's word on him is shown) */
  honesty: number;
  /** 0..1: how well he sells */
  skill: number;
  /** a week's wage, in piastres */
  wage: number;
  /** a share of what he sells, kept by him instead of a wage (Rashid's man in Alexandria) */
  share?: number;
}

/** The men who would keep a shop for you, two or three in each city. */
export const AGENTS: Record<string, AgentOffer[]> = {
  alexandria: [
    { id: 'shawqi', name: 'Mahmoud Shawqi', honesty: 0.9, skill: 0.5, wage: 120 },
    { id: 'lambrinos', name: 'Costa Lambrinos', honesty: 0.5, skill: 0.8, wage: 200 },
    { id: 'salama', name: 'Yacoub Salama', honesty: 0.95, skill: 0.35, wage: 80 },
  ],
  portsaid: [
    { id: 'fahmy', name: 'Ali Fahmy', honesty: 0.85, skill: 0.5, wage: 100 },
    { id: 'kalogeras', name: 'Spiro Kalogeras', honesty: 0.45, skill: 0.75, wage: 160 },
    { id: 'ghali', name: 'Abdu Ghali', honesty: 0.95, skill: 0.35, wage: 70 },
  ],
  jaffa: [
    { id: 'haddad', name: 'Elias Haddad', honesty: 0.8, skill: 0.6, wage: 110 },
    { id: 'abulaban', name: 'Musa Abu Laban', honesty: 0.95, skill: 0.45, wage: 80 },
    { id: 'levy', name: 'Nissim Levy', honesty: 0.5, skill: 0.8, wage: 170 },
  ],
  jerusalem: [
    { id: 'kalaydjian', name: 'Garabed Kalaydjian', honesty: 0.85, skill: 0.8, wage: 220 },
    { id: 'halabi', name: 'Yusuf Halabi', honesty: 0.9, skill: 0.5, wage: 120 },
    { id: 'sabbagh', name: 'Antoun Sabbagh', honesty: 0.55, skill: 0.7, wage: 150 },
  ],
  beirut: [
    { id: 'khoury', name: 'Habib Khoury', honesty: 0.8, skill: 0.7, wage: 170 },
    { id: 'saad', name: 'Fouad Saad', honesty: 0.6, skill: 0.55, wage: 120 },
    { id: 'arslanian', name: 'Boghos Arslanian', honesty: 0.5, skill: 0.85, wage: 220 },
  ],
  damascus: [
    { id: 'qabbani', name: 'Abu Shaker Qabbani', honesty: 0.85, skill: 0.75, wage: 170 },
    { id: 'hamwi', name: 'Rida Hamwi', honesty: 0.95, skill: 0.5, wage: 100 },
    { id: 'shami', name: 'Salim Shami', honesty: 0.45, skill: 0.85, wage: 200 },
  ],
  aleppo: [
    { id: 'kouyoumdjian', name: 'Hagop Kouyoumdjian', honesty: 0.85, skill: 0.8, wage: 180 },
    { id: 'jabiri', name: 'Omar Jabiri', honesty: 0.6, skill: 0.5, wage: 110 },
    { id: 'antaki', name: 'Nasrallah Antaki', honesty: 0.9, skill: 0.6, wage: 130 },
  ],
  amman: [
    { id: 'twal', name: 'Odeh Twal', honesty: 0.9, skill: 0.4, wage: 70 },
    { id: 'mufti', name: 'Said Mufti', honesty: 0.6, skill: 0.6, wage: 100 },
  ],
  baghdad: [
    { id: 'shamash', name: 'Ezra Shamash', honesty: 0.85, skill: 0.85, wage: 220 },
    { id: 'haidari', name: 'Jasim Haidari', honesty: 0.9, skill: 0.55, wage: 130 },
    { id: 'kubba', name: 'Karim Kubba', honesty: 0.5, skill: 0.7, wage: 170 },
  ],
  istanbul: [
    { id: 'balian', name: 'Hrant Balian', honesty: 0.85, skill: 0.9, wage: 300 },
    { id: 'necip', name: 'Necip Bey', honesty: 0.6, skill: 0.65, wage: 200 },
    { id: 'ralli', name: 'Dimitri Ralli', honesty: 0.45, skill: 0.75, wage: 240 },
  ],
  ankara: [
    { id: 'ahmetusta', name: 'Ahmet Usta', honesty: 0.9, skill: 0.5, wage: 100 },
    { id: 'riza', name: 'Rıza Efendi', honesty: 0.6, skill: 0.7, wage: 140 },
  ],
};

/** Rashid's man in the Souq el-Attarin: he keeps the Alexandria shop that the 'An agent in Alexandria'
 *  goal opens, for a tenth of what he sells instead of a wage. */
export const RASHIDS_MAN: AgentOffer = { id: 'nahhas', name: 'Ibrahim Nahhas', honesty: 0.8, skill: 0.5, wage: 0, share: 0.1 };

/** what the souq says about a man (honesty is never shown as a number) */
export const honestyWord = (h: number) => (h >= 0.8 ? 'well spoken of in the souq' : h >= 0.6 ? 'nobody says much about him either way' : 'a sharp one, they say');
export const skillWord = (k: number) => (k >= 0.75 ? 'knows rugs well' : k >= 0.5 ? 'knows rugs fairly' : 'new to rugs');
export const wageWord = (a: AgentOffer) => (a.share ? `keeps ${Math.round(a.share * 100)} per cent of what he sells` : `${fmt(a.wage)} a week`);

/** Sending a rug kept at the Giza stall to one of your shops by rail and steamer, from a telegraph office. */
export const RAIL_FEE = { egypt: 50, abroad: 150 } as const;
export const RAIL_DAYS = { egypt: 2, abroad: 5 } as const;

// ---- Dress your stall --------------------------------------------------------------------------
// One system for everything on the Giza stall's shelves, walls and floor. Every spot (game/stallDressing.ts
// SPOTS) holds one piece at a time; a piece belongs to one spot. A few of your father's things are
// there from the first day (father: true); everything else is bought, and stays where you put it.
export interface DressingPiece {
  id: string;
  name: string;
  /** piastres (0 for your father's things, which are not for sale) */
  cost: number;
  /** the spot it stands in (game/stallDressing.ts SPOTS) */
  spot: string;
  /** what it does, in one short line */
  effect: string;
  /** an icon (components/Icon.tsx) shown until the piece's picture exists */
  icon: string;
  /** the full-canvas cut-out, when it is not art/stall2/dressing/stall-<id>.webp */
  art?: string;
  /** one of your father's things: on the stall from the start, never sold */
  father?: boolean;
  /** encounter effects: added at the start of every sale (rich: only buyers of the Fine trade and up) */
  patience?: number;
  interest?: number;
  trust?: number;
  richTrust?: number;
  richInterest?: number;
  /** one more buyer in an ordinary week */
  buyerWeek?: boolean;
}

const PROP = (id: string) => `art/stall2/props/${id}.webp`;
export const DRESSING: DressingPiece[] = [
  // the shelves: top
  { id: 'prop-clock', name: "Your father's clock", cost: 0, spot: 'top-left', icon: 'hourglass', art: PROP('prop-clock'), father: true, effect: 'It was always on this shelf' },
  { id: 'prop-lamp', name: 'An oil lamp', cost: 300, spot: 'top-left', icon: 'sun', art: PROP('prop-lamp'), patience: 2, effect: 'A light on the shelf: +2 patience' },
  { id: 'prop-photo', name: "Your father's photograph of Cairo", cost: 0, spot: 'top-mid', icon: 'eye', art: PROP('prop-photo'), father: true, effect: 'He took it the year you were born' },
  { id: 'prop-vase', name: 'An Iznik vase', cost: 1200, spot: 'top-mid', icon: 'star', art: PROP('prop-vase'), trust: 2, effect: 'Old blue-and-red ware: +2 trust' },
  { id: 'prop-birdcage', name: 'A canary in a cage', cost: 600, spot: 'top-mid', icon: 'star', art: PROP('prop-birdcage'), patience: 3, effect: 'Birdsong over the stall: +3 patience' },
  { id: 'prop-astrolabe', name: 'A brass astrolabe', cost: 2500, spot: 'top-right', icon: 'search', art: PROP('prop-astrolabe'), richInterest: 4, effect: 'Collectors stop to look: rich buyers +4 interest' },
  { id: 'prop-incense', name: 'An incense burner', cost: 200, spot: 'top-right', icon: 'sun', art: PROP('prop-incense'), patience: 2, effect: 'Sweet smoke: +2 patience' },
  // the middle shelf (the gramophone keeps its place at the left end)
  { id: 'prop-camera', name: 'A plate camera', cost: 1800, spot: 'mid-mid', icon: 'eye', art: PROP('prop-camera'), interest: 2, effect: 'Visitors ask about it: +2 interest' },
  { id: 'prop-tawla', name: 'A tawla board', cost: 500, spot: 'mid-mid', icon: 'users', art: PROP('prop-tawla'), patience: 2, effect: 'A game to hand: +2 patience' },
  // the bottom shelf
  { id: 'prop-books', name: "Your father's books", cost: 0, spot: 'bottom-left', icon: 'book', art: PROP('prop-books'), father: true, effect: 'His ledgers, and the rug books he learned from' },
  { id: 'prop-cashbox', name: 'An inlaid cashbox', cost: 700, spot: 'bottom-left', icon: 'coin', art: PROP('prop-cashbox'), trust: 2, effect: 'Takings kept properly: +2 trust' },
  { id: 'prop-hookah', name: 'A water pipe', cost: 900, spot: 'bottom-right', icon: 'tea', art: PROP('prop-hookah'), patience: 3, effect: 'A pipe for a long talk: +3 patience' },
  { id: 'copper', name: 'Copper ware on the shelf', cost: 1400, spot: 'bottom-right', icon: 'coin', art: PROP('prop-copper'), interest: 3, effect: 'The shelf catches the eye: +3 interest' },
  // the wall above the shelves, and the hooks under the beam
  { id: 'prop-herbs', name: 'Bunches of dried herbs', cost: 100, spot: 'above-shelves', icon: 'star', art: PROP('prop-herbs'), patience: 1, effect: 'The stall smells fresh: +1 patience' },
  { id: 'prop-calligraphy', name: 'A framed calligraphy', cost: 1500, spot: 'above-shelves', icon: 'scroll', art: PROP('prop-calligraphy'), trust: 2, effect: 'A blessing over the door: +2 trust' },
  { id: 'prop-prayerrug', name: 'A silk prayer rug on the wall', cost: 3000, spot: 'above-shelves', icon: 'room', art: PROP('prop-prayerrug'), interest: 3, effect: 'Your best piece on show: +3 interest' },
  { id: 'prop-swords', name: 'Crossed swords', cost: 2800, spot: 'above-shelves', icon: 'sword', art: PROP('prop-swords'), richTrust: 3, effect: 'Old Damascus blades: rich buyers +3 trust' },
  { id: 'lamps', name: 'Brass lamps', cost: 800, spot: 'hooks', icon: 'sun', art: PROP('prop-lanterns'), patience: 4, effect: 'The stall stays bright after dark: buyers linger (+4 patience)' },
  // the floor, the brass table, the seat, the opening
  { id: 'kilims', name: 'Kilims on the ground', cost: 1000, spot: 'floor', icon: 'room', interest: 4, effect: 'A buyer steps onto colour: +4 interest from the start' },
  { id: 'tray', name: 'A brass tray and glasses', cost: 600, spot: 'table', icon: 'tea', trust: 3, effect: 'Tea served properly: +3 trust' },
  { id: 'scale', name: 'A brass scale', cost: 2200, spot: 'table', icon: 'scale', trust: 4, effect: 'Honest weights on show: +4 trust' },
  { id: 'flowers', name: 'Flowers in a jar', cost: 500, spot: 'table', icon: 'star', trust: 2, effect: 'A kept stall: +2 trust' },
  { id: 'bench', name: 'A bench for buyers', cost: 900, spot: 'seat', icon: 'users', patience: 6, effect: 'Somewhere to sit: +6 patience' },
  { id: 'cushions', name: 'Cushions', cost: 500, spot: 'seat', icon: 'hand', patience: 3, effect: 'A softer seat: +3 patience' },
  { id: 'glasscase', name: 'A glass case', cost: 3500, spot: 'wall', icon: 'eye', richTrust: 6, effect: 'Small pieces under glass: rich buyers start with +6 trust' },
  { id: 'mirror', name: 'A gilt mirror', cost: 1800, spot: 'wall', icon: 'search', richInterest: 4, effect: 'Rich buyers like what they see: +4 interest' },
  { id: 'curtain', name: 'A curtain against the sun', cost: 700, spot: 'curtain', icon: 'moon', patience: 3, effect: 'Shade in the afternoon: +3 patience' },
  { id: 'sign', name: 'A painted sign board', cost: 1200, spot: 'sign', icon: 'scroll', buyerWeek: true, effect: 'Your name over the stall: one more buyer a week' },
];
export const DRESSING_BY_ID: Record<string, DressingPiece> = Object.fromEntries(DRESSING.map((d) => [d.id, d]));
/** the full-canvas overlay for a piece (aligned with the stall canvas, like the shelf props) */
export const dressingArt = (id: string) => DRESSING_BY_ID[id]?.art ?? `art/stall2/dressing/stall-${id}.webp`;

/** the sum of the effects of these pieces (the ones standing in the stall) at the start of a sale */
export function dressingFx(placed: string[] | undefined, rich: boolean) {
  const fx = { patience: 0, interest: 0, trust: 0 };
  for (const id of placed ?? []) {
    const d = DRESSING_BY_ID[id];
    if (!d) continue;
    fx.patience += d.patience ?? 0;
    fx.interest += (d.interest ?? 0) + (rich ? d.richInterest ?? 0 : 0);
    fx.trust += (d.trust ?? 0) + (rich ? d.richTrust ?? 0 : 0);
  }
  return fx;
}
