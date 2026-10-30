// Milestones: a ladder of business goals for the weeks after the opening (about day 7 to day 40).
// They are missions like the main ones (same shape, same `missions` record, finished by the same
// watcher in the store), but they run beside the story, one at a time, from MILESTONE_FROM_DAY. They do
// not count towards rank: only MAIN_ORDER does (missionsDone).
import type { Mission, MissionState } from './missions';
import { netWorth } from '../game/economy/progress';
import { fmt } from '../game/economy/money';

export interface Milestone extends Mission {
  /** the target, in one short line (the ladder on the Progress tab) */
  aim: string;
  /** the reward you can see, in one short line */
  opens: string;
  /** who says reward.text */
  speaker: string;
  /** [have, need], for the bar on the Progress tab */
  progress: (s: MissionState) => [number, number];
}

/** the ladder starts on the morning of this day (the first week has its own goal) */
export const MILESTONE_FROM_DAY = 7;
/** what the Alexandria agent sends every Monday for the other merchants' rugs he shows in your shop, in
 *  piastres (what he sells of yours comes on top: systems/shops.ts) */
export const AGENT_PAY = 250;
/** Cairo dealers' bid, raised once Hagop has introduced you (store.ts localBid) */
export const CAIRO_DEALER_BONUS = 0.1;
export const ABROAD_TARGET = 2500;
export const AGENT_WORTH = 7000;
export const REGISTER_TARGET = 10;

type G = MissionState & {
  cash: number; reputation: number;
  relationships?: Record<string, { purchases?: number }>;
  commissions?: { label: string; done: boolean; expired?: boolean }[];
  cohen?: { ordersDone?: number; order?: { status: string } };
  register?: string[];
  stats?: { abroadSold?: number };
  family?: { left: number; paid: number };
};
const g = (s: MissionState) => s as G;
const CORNER = ['mat', 'display', 'tea'];
const cornerHave = (s: MissionState) => CORNER.filter((u) => s.upgrades.includes(u)).length;
export const regulars = (s: MissionState) => Object.values(g(s).relationships ?? {}).filter((r) => (r?.purchases ?? 0) >= 2).length;
export const ordersDone = (s: MissionState) => (g(s).commissions ?? []).filter((c) => c.done && !c.expired).length + (g(s).cohen?.ordersDone ?? 0);
const registerHave = (s: MissionState) => (g(s).register ?? []).length;
const abroad = (s: MissionState) => g(s).stats?.abroadSold ?? 0;
const worth = (s: MissionState) => netWorth(s as never);
const familyLeft = (s: MissionState) => Math.max(0, g(s).family?.left ?? 10000);
const familyAll = (s: MissionState) => familyLeft(s) + (g(s).family?.paid ?? 0);
const stallBtn = (s: MissionState) => ({ btn: s.world.at === 'giza' ? 'Your stall' : 'To Giza', go: 'district' });

export const MILESTONES: Record<string, Milestone> = {
  'ms-corner': {
    aim: 'Own a mat, a display pole and a tea service', id: 'ms-corner', title: 'A proper corner', giver: 'Uncle Rashid', speaker: 'Uncle Rashid',
    brief: 'A borrowed corner and a cat will not keep buyers for long. Rashid wants to see a mat of your own on the ground, a pole that shows a rug to the whole lane, and glasses for tea.',
    steps: ['A rug mat of your own: £10, from reputation 8', 'A rug display pole: £2.50', 'A tea service: £1.50', 'All three are under Improve, at the stall or in Stock'],
    locks: '',
    reward: { cash: 0, rep: 1, trust: 15, text: '"Your father started on a mat by that same wall. Keep it swept and they will come."' },
    opens: 'Rashid\'s trust +15: more credit for stock',
    hint: (s) => {
      const n = cornerHave(s);
      if (!s.upgrades.includes('mat') && g(s).reputation < 8) return `Fit out your corner: ${n} of 3. The mat needs reputation 8.`;
      return `Fit out your corner (Improve): ${n} of 3.`;
    },
    next: () => ({ btn: 'Improve', go: 'improve' }),
    check: (s) => cornerHave(s) === CORNER.length,
    progress: (s) => [cornerHave(s), CORNER.length],
  },
  'ms-regulars': {
    aim: 'Three buyers who have each bought from you twice', id: 'ms-regulars', title: 'Buyers who come back', giver: 'Bilgin', speaker: 'Bilgin',
    brief: 'One sale is luck. A buyer who comes back is a business. When three of your buyers have each bought from you twice, the lane starts to talk about your corner.',
    steps: ['Sell twice or more to three different buyers', 'The Buyers page on the Progress tab shows who has bought and how often', 'A good fit and an honest word bring people back'],
    locks: '',
    reward: { cash: 0, rep: 2, trust: 0, text: '"Your name came up at my tables twice this week. Both times from people who had bought from you."' },
    opens: 'One more buyer comes to your stall each day',
    hint: (s) => `Regular buyers: ${Math.min(3, regulars(s))} of 3 have bought from you twice.`,
    next: (s) => (s.world.at === 'giza' ? null : stallBtn(s)),
    check: (s) => regulars(s) >= 3,
    progress: (s) => [Math.min(3, regulars(s)), 3],
  },
  'ms-order': {
    aim: 'Deliver one special order on time', id: 'ms-order', title: 'A special order', giver: 'Hagop Boyajian', speaker: 'Hagop Boyajian',
    brief: 'Buyers who like you will ask for something in particular: a quieter rug for a sister, a runner for a hotel corridor. Find what was asked for and have it ready before the day agreed.',
    steps: ['Sell to a buyer and leave them pleased: many will then ask for something special', 'Find a rug that answers the order and offer it when they call, before the deadline', 'An order from Cohen counts too'],
    locks: '',
    reward: { cash: 400, rep: 3, trust: 0, text: '"Anyone can sell what is lying on his mat. A dealer finds what the client asked for."' },
    opens: '£4 and the title Trusted with Orders',
    hint: (s) => {
      const open = (g(s).commissions ?? []).find((c) => !c.done);
      if (open) return `Special order: ${open.label}.`;
      if (g(s).cohen?.order?.status === 'accepted') return 'Special order: Cohen\'s two corridor rugs.';
      return 'Please a buyer: many then ask for a special order.';
    },
    check: (s) => ordersDone(s) >= 1,
    progress: (s) => [Math.min(1, ordersDone(s)), 1],
  },
  'ms-name': {
    aim: 'Ten kinds of carpet in your Register', id: 'ms-name', title: 'A name among Cairo dealers', giver: 'Hagop Boyajian', speaker: 'Hagop Boyajian',
    brief: 'The dealers of the Khan el-Khalili take a young man seriously once he can tell a Konya from a Kayseri. Enter ten kinds of carpet in your Register, and Hagop will give you a seat at the dealers\' table.',
    steps: [`Enter ${REGISTER_TARGET} kinds of carpet in your Carpet Register: every kind you buy is entered`, 'The Register (Progress tab, Collection) says where each kind is sold', 'Rashid, the markets of Alexandria and Tanta, and the Cairo sale rooms all have kinds you lack'],
    locks: '',
    reward: { cash: 0, rep: 3, trust: 0, text: '"Ten kinds, and you know which is which. Come and sit with us on Thursday."' },
    opens: 'Cairo dealers bid a tenth more for your rugs',
    hint: (s) => `Carpet Register: ${Math.min(REGISTER_TARGET, registerHave(s))} of ${REGISTER_TARGET} kinds.`,
    check: (s) => registerHave(s) >= REGISTER_TARGET,
    progress: (s) => [Math.min(REGISTER_TARGET, registerHave(s)), REGISTER_TARGET],
  },
  'ms-abroad': {
    aim: 'Sell £25 worth of rugs outside Egypt', id: 'ms-abroad', title: 'A caravan abroad', giver: 'Farid al-Ajami', speaker: 'Farid al-Ajami',
    brief: 'Rugs that are ordinary in Giza are wanted in Jerusalem, and the other way round. Take stock across the frontier and sell £25 worth outside Egypt: to dealers, visitors, palaces, anyone.',
    steps: ['Pack rugs at your Giza stall: only packed rugs travel', 'A passport from the Passport Office in Cairo saves a fine at every frontier', 'Sell £25 worth of rugs in Palestine, Transjordan, Syria or further'],
    locks: '',
    reward: { cash: 0, rep: 4, trust: 0, text: '"Egypt is one market. Between Jaffa and Aleppo there are twenty."' },
    opens: 'Reputation +4 and the title Known Beyond the Border',
    hint: (s) => `Sold abroad: ${fmt(Math.min(ABROAD_TARGET, abroad(s)))} of ${fmt(ABROAD_TARGET)}.`,
    check: (s) => abroad(s) >= ABROAD_TARGET,
    progress: (s) => [Math.min(ABROAD_TARGET, abroad(s)), ABROAD_TARGET],
  },
  'ms-agent': {
    aim: 'A net worth of £70', id: 'ms-agent', title: 'An agent in Alexandria', giver: 'Uncle Rashid', speaker: 'Uncle Rashid',
    brief: 'A merchant cannot stand in every market at once. Rashid knows a man in the Souq el-Attarin, Ibrahim Nahhas, who shows other people\'s rugs for a share. He will keep a shop in Alexandria for you once your business is worth £70, after your debts.',
    steps: [`Reach a net worth of ${fmt(AGENT_WORTH)}: cash and stock, less everything you owe`, 'Net worth is on the Progress tab, under Collection', `He sends ${fmt(AGENT_PAY)} every Monday for the other merchants\' rugs on the wall, and sells any rugs you leave with him for a tenth`],
    locks: '',
    reward: { cash: 0, rep: 2, trust: 0, text: '"He is honest, mostly. I will keep an eye on him for you."' },
    opens: `A shop in Alexandria, kept by Rashid's man, and ${fmt(AGENT_PAY)} every Monday`,
    hint: (s) => `Net worth ${fmt(Math.max(0, worth(s)))} of ${fmt(AGENT_WORTH)}, for an agent in Alexandria.`,
    check: (s) => worth(s) >= AGENT_WORTH,
    progress: (s) => [Math.max(0, Math.min(AGENT_WORTH, worth(s))), AGENT_WORTH],
  },
  'ms-debt': {
    aim: "Pay off your father's £100 debt to Rashid", id: 'ms-debt', title: 'Your father\'s debt', giver: 'Your father', speaker: 'Your father',
    brief: 'Your father owes Rashid £100 for the stock he left you. Rashid takes £25 on the first of each month, but nothing stops you paying sooner. Clear it, and the stall is yours outright.',
    steps: ['Pay Rashid on his tab: £5 or £20 at a time', 'The instalment on the first of each month counts too', 'Every payment raises his trust a little'],
    locks: '',
    reward: { cash: 0, rep: 5, trust: 0, text: '"Now it is your stall. Not mine, not Rashid\'s. Yours."' },
    opens: 'Reputation +5, no more instalments, and the title Clear of Debt',
    hint: (s) => `Your father's debt: ${fmt(familyLeft(s))} still owed to Rashid.`,
    next: () => ({ btn: 'Rashid', go: 'supplier' }),
    check: (s) => familyLeft(s) <= 0,
    progress: (s) => [familyAll(s) - familyLeft(s), Math.max(1, familyAll(s))],
  },
};
export const MILESTONE_ORDER = ['ms-corner', 'ms-regulars', 'ms-order', 'ms-name', 'ms-abroad', 'ms-agent', 'ms-debt'];
export const activeMilestone = (m?: Record<string, string>) => MILESTONE_ORDER.find((id) => m?.[id] === 'active');
export const milestonesDone = (m?: Record<string, string>) => MILESTONE_ORDER.filter((id) => m?.[id] === 'done').length;
export const msDone = (m: Record<string, string> | undefined, id: string) => m?.[id] === 'done';
