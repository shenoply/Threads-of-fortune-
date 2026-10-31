// Main missions: the story spine, one at a time. Each finished mission lets your rank rise one step further.

export interface MissionState {
  day: number;
  world: { at: string | null; appraised: string[] };
  inventory: { uid: string; typeId: string }[];
  stats?: { auctionsWon?: number; rivalSales?: number };
  court: { warrants: string[] };
  upgrades: string[];
  missionStart?: Record<string, number>;
  /** passport and visas from the Passport Office in Cairo (systems/customs.ts) */
  passport?: { day: number };
}

export interface Mission {
  id: string;
  title: string;
  giver: string;
  brief: string;
  steps: string[];
  target?: string; // settlement pinned on the map
  locks: string;
  reward: { cash: number; rep: number; trust: number; text: string };
  /** what the banner says, given where you are */
  hint: (s: MissionState) => string;
  /** the objective button, when the next thing to do is not the trip to the target: 'stock', 'guards',
   *  'animals', 'district' or a town id (see App's chapterGo); null keeps the plain Map / Go button */
  next?: (s: MissionState) => { btn: string; go: string } | null;
  /** true while the mission waits only on reputation to grow: the objective bar shows the current
   *  milestone (data/milestones.ts) instead, which is what grows it */
  waits?: (s: MissionState) => boolean;
  /** done? (the Alexandria errand is completed by the purchase itself) */
  check?: (s: MissionState) => boolean;
  /** what is left to do, as bars: each a label and a count against what it needs */
  goals?: (s: MissionState) => { label: string; have: number; need: number }[];
  /** the payoff: a scene with a choice, shown when the mission's condition is met; the reward and the
   *  chosen outcome are paid together (store: sceneChoose) */
  scene?: MissionScene;
}

export interface SceneChoice {
  id: string; label: string; note: string;
  /** what this choice does: a patch for the store and the line that says what happened */
  apply: (s: GameState) => { patch: Partial<GameState>; text: string };
  /** offered only when this is true */
  when?: (s: GameState) => boolean;
}
export interface MissionScene { art?: string; who: string; title: string; text: (s: GameState) => string; choices: SceneChoice[] }

export const RIVAL_SALES = 6;
import { strength as partyStrength, type PartyState } from '../game/systems/caravan';
import { heroCharisma, START_WARDROBE, type WardrobeState } from './wardrobe';
import { housesIn, nextSale, saleOn } from '../game/auction/sessions';
import { RUGS } from './rugs';
import { countryOf } from '../game/economy/currency';
import type { GameState } from '../game/state/store';
import type { RugItem } from '../game/types';
type Party = { world: { party?: PartyState } };
/** the caravan's fighting strength, counted the same way the road counts it */
export const strengthOf = (s: MissionState) => { const p = (s as unknown as Party).world.party; return p ? partyStrength(p) : 2; };
export const AMBUSH_STRENGTH = 10;
const animalsOf = (s: MissionState) => Object.values((s as unknown as Party).world.party?.animals ?? {}).reduce((a, n) => a + (n ?? 0), 0);
/** your father's rug is in your stock but still left at the stall. While Farid has still to see it the
 *  rug travels with you on its own (game/missionRules.ts), so this is only ever true for a moment. */
export const hearthUnpacked = (s: MissionState) => {
  const fh = s.inventory.filter((i) => i.typeId === 'fayoum-hearth') as { stored?: boolean }[];
  return fh.length > 0 && fh.every((i) => i.stored);
};
const hasHearth = (s: MissionState) => s.inventory.some((i) => i.typeId === 'fayoum-hearth');
const packedCount = (s: MissionState) => (s.inventory as { stored?: boolean }[]).filter((i) => !i.stored).length;
const when = (n: number) => (n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);
/** the soonest sale in a town with sale rooms: [house, first day] */
const soonestSale = (city: string, day: number): [string, number] | null => {
  const hs = housesIn(city);
  if (!hs.length) return null;
  return hs.map((h) => [h.id, saleOn(h.id, day) ? day : nextSale(h.id, day)] as [string, number]).sort((a, b) => a[1] - b[1])[0];
};
/** Ras el-Tin, Alexandria (Laila Haddad), is the court that receives a merchant first (data/royals.ts) */
export const FIRST_COURT_REP = 15;
const charismaOf = (s: MissionState) => {
  const x = s as unknown as { wardrobe?: WardrobeState; attire?: { clean?: number } };
  return heroCharisma(x.wardrobe ?? START_WARDROBE, x.attire?.clean ?? 100);
};
/** an Exceptional rug or better, in good order, packed for the road: what a palace will look at (the
 *  courts consider nothing below Exceptional, and a warrant needs one) */
const courtRug = (s: MissionState) => (s.inventory as { typeId: string; stored?: boolean; condition?: string }[])
  .some((i) => !i.stored && (RUGS[i.typeId]?.tier ?? 1) >= 3 && !['Worn', 'Dirty', 'Damaged'].includes(i.condition ?? ''));
const repOf = (s: MissionState) => (s as unknown as { reputation?: number }).reputation ?? 0;
const fineRug = (s: { inventory: RugItem[] }) => s.inventory.filter((i) => !i.stored && !i.framed && (RUGS[i.typeId]?.tier ?? 1) >= 2 && !['Worn', 'Dirty', 'Damaged'].includes(i.condition)).sort((a, b) => (RUGS[a.typeId]?.valueBand[1] ?? 0) - (RUGS[b.typeId]?.valueBand[1] ?? 0))[0];
const worth = (i: RugItem) => { const t = RUGS[i.typeId]; return t ? Math.round((t.valueBand[0] + t.valueBand[1]) / 2) : 0; };
const bump = (s: GameState, k: 'honesty' | 'firmness' | 'kindness' | 'charm', n: number) => ({ manner: { ...s.manner, [k]: Math.max(-100, Math.min(100, (s.manner?.[k] ?? 0) + n)) } });
const pay = (s: GameState, amount: number, label: string) => ({ cash: s.cash + amount, ledger: [...s.ledger, { day: s.day, kind: amount >= 0 ? 'sale' : 'expense', label, amount } as GameState['ledger'][number]] });
/** the band on the Cairo to Suez road and the man leading it, as the cudgel mission names him */
const cudgelMan = (s: MissionState) => (s as unknown as { combat?: { leaders?: Record<string, { name: string; status: string }> } }).combat?.leaders?.rb0;

export const MISSIONS: Record<string, Mission> = {
  alexandria: {
    id: 'alexandria', title: 'Rashid\'s errand in Alexandria', giver: 'Uncle Rashid',
    brief: '"Prove you can buy with your own eyes. Go to Alexandria and bring me a receipt."',
    steps: ['A guard for the road, from the guard yard', 'The ferry to Cairo, then the train to Alexandria: 3½ hours', 'Buy any rug in its market (the Market tab)'],
    target: 'alexandria',
    locks: 'Until then Rashid sells only village rugs, gives no credit, and your rank cannot rise past Stall keeper.',
    reward: { cash: 200, rep: 3, trust: 15, text: 'Rashid reads your receipt twice. "Not bad. Not good, but not bad." He pays you £2 for the errand, opens his back room and his credit book.' },
    // said from where you stand: 3½ hours is the train from Cairo, not from Damascus
    hint: (s) => (s.world.at === 'alexandria' ? 'Buy one rug in the market here.'
      : !s.world.at || s.world.at === 'giza' || s.world.at === 'cairo' ? 'Alexandria, 3½ hours by train: buy one rug.'
      : countryOf(s.world.at) === 'egypt' ? 'Alexandria, by train or road: buy one rug.'
      : 'Back in Egypt, go to Alexandria and buy one rug for Rashid.'),
  },
  beasts: {
    id: 'beasts', title: 'Beasts of burden', giver: 'Uncle Rashid',
    brief: '"A merchant who carries everything on his own back is a porter." Rashid\'s bale waits in Tanta. Two donkeys to carry it; keep two rugs for your trouble.',
    steps: ['Two donkeys: about £2.50 each, at Giza or Tanta (Animals)', 'Tanta with both: the bale is yours on arrival', 'Only rugs packed in Stock travel with you'],
    target: 'tanta',
    locks: 'Your rank cannot rise past Bazaar merchant until you can carry stock of your own.',
    reward: { cash: 300, rep: 3, trust: 10, text: 'The Tanta dealer loads Rashid\'s bale onto your donkeys and wires Giza. Rashid\'s answer comes back with £3: "You look almost like a merchant now. Almost. The donkey looks more like one than you."' },
    hint: (s) => {
      const n = animalsOf(s);
      if (n >= 2) return s.world.at === 'tanta' ? 'Collect Rashid\'s bale here in Tanta.' : s.world.at === 'giza' && packedCount(s) === 0 ? 'Pack rugs to sell, then go to Tanta.' : 'Take your two animals to Tanta for the bale.';
      const want = n === 1 ? 'one more donkey' : 'two donkeys';
      return s.world.at === 'tanta' ? `Buy ${want} at the Tanta animal market.` : `Buy ${want}, then go to Tanta.`;
    },
    next: (s) => (animalsOf(s) < 2 && (s.world.at === 'giza' || s.world.at === 'tanta') ? { btn: 'Animals', go: 'animals' } : s.world.at === 'giza' && packedCount(s) === 0 ? { btn: 'Stock', go: 'stock' } : null),
    check: (s) => ((s as unknown as { jobsDone?: string[] }).jobsDone ?? []).includes('tanta-bale'),
    goals: (s) => [{ label: 'Donkeys', have: Math.min(2, animalsOf(s)), need: 2 }, { label: 'In Tanta', have: s.world.at === 'tanta' ? 1 : 0, need: 1 }],
  },
  farid: {
    id: 'farid', title: 'Your father\'s rug', giver: 'Uncle Rashid',
    brief: 'Your father paid far too much for that old Fayoum rug, and never said why. "Farid al-Ajami in Damascus knows every loom from Aleppo to Kayseri. Show him." The rug travels with you.',
    steps: ['A passport from the Cairo Passport Office (£1) saves a fine at every frontier', 'Damascus: a day and a half by train', 'Show Farid the rug (People, in the town menu)'],
    target: 'damascus',
    locks: 'Your rank cannot rise past Khan dealer until you know what your father bought.',
    reward: { cash: 0, rep: 4, trust: 5, text: 'The story travels back to Giza before you do. Merchants in the Khan say your father\'s name with respect now, and yours with curiosity.' },
    scene: {
      art: 'art/portraits/farid.webp', who: 'Farid al-Ajami, Damascus', title: 'Farid\'s verdict',
      text: () => 'Farid turns the rug over and runs his thumb along the back, then laughs. "The camel in the corner: the Abu Salem looms of the Fayoum, and old Umm Salah\'s own hand. Your father did not overpay. He paid what it is worth, which nobody in Cairo knew." He names a price: £25.',
      choices: [
        { id: 'sell', label: 'Sell it to Farid', note: '£25 now', apply: (s) => ({ patch: { ...pay(s, 2500, 'Your father\'s rug, to Farid al-Ajami'), inventory: s.inventory.filter((i) => !(i.typeId === 'fayoum-hearth' && (i.uid === 'start-fh' || !i.paid || i.notes?.some((n) => /father/i.test(n))))) }, text: 'Farid counts out the money in gold. "Your father would have done the same, and then regretted it."' }) },
        { id: 'keep', label: 'Keep it, and hang it at the stall', note: 'framed, with Farid\'s card: reputation +3', apply: (s) => { const room = s.inventory.filter((i) => i.framed).length < 2; return { patch: { reputation: s.reputation + 3, inventory: s.inventory.map((i) => (i.typeId === 'fayoum-hearth' && (i.uid === 'start-fh' || !i.paid || i.notes?.some((n) => /father/i.test(n))) ? { ...i, provenance: 'Documented' as const, framed: room || i.framed, stored: false, notes: [...(i.notes ?? []), 'Farid al-Ajami\'s card: Abu Salem looms, Umm Salah\'s own hand.'] } : i)) }, text: room ? 'It goes up behind your counter with Farid\'s card pinned beside it. Buyers stop to read it.' : 'You keep it, with Farid\'s card. When there is wall room at the stall, it goes up.' }; } },
        { id: 'ask', label: 'Ask him about the camel mark', note: 'reputation +1; the Fayoum looms will remember you', apply: (s) => ({ patch: { reputation: s.reputation + 1, weaverLead: true } as Partial<GameState>, text: 'Farid draws the mark on the back of a bill. "Go to the Fayoum and ask for Umm Salah. Tell her whose son you are."' }) },
      ],
    },
    hint: (s) => {
      if (!hasHearth(s)) return s.world.at === 'damascus' ? 'Tell Farid what became of the rug.' : 'Rug lost: go and tell Farid in Damascus.';
      if (s.world.at === 'damascus') return 'Show Farid al-Ajami the rug (People).';
      // Rashid's reminder: the frontier wants papers, and the office is in Cairo
      return s.passport || countryOf(s.world.at) !== 'egypt' ? 'Show Farid the rug: Damascus, 1½ days.' : 'Papers first: the Passport Office in Cairo, £1. Then Damascus, 1½ days.';
    },
    // lost for good (Rashid already bought it back once): telling Farid in Damascus is the end of it
    check: (s) => s.world.appraised.length > 0 || (s.world.at === 'damascus' && !hasHearth(s) && !!(s as unknown as { faridRecovered?: boolean }).faridRecovered),
  },
  rival: {
    id: 'rival', title: 'The stall next door', giver: 'Selim Kassab',
    brief: 'Selim Kassab has opened beside your corner: oiled hair, a gold tooth and cheap rugs. He calls your buyers over and tells them your father sold fakes. The lane will decide.',
    steps: [`${RIVAL_SALES} sales at your Giza stall`, 'He may lure a buyer away each day'],
    target: 'giza',
    locks: 'Your rank cannot rise past Merchant of the Levant while Selim Kassab takes your buyers.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'Next morning Selim\'s stall is bare. He owed half of Cairo and left on the night train to Port Said. The lane is yours, and everyone saw how you held it.' },
    goals: (s) => [{ label: 'Sales at your stall', have: Math.min(RIVAL_SALES, s.stats?.rivalSales ?? 0), need: RIVAL_SALES }],
    scene: {
      art: 'art/portraits/kassab.webp', who: 'Selim Kassab, across the lane', title: 'Selim\'s last throw',
      text: () => 'An English colonel stops between your two stalls, and Selim is out from behind his counter at once. "Effendi! The boy\'s father sold fakes. Mine are guaranteed." The whole lane goes quiet to listen. The colonel looks at you.',
      choices: [
        { id: 'truth', label: 'Show him your best rug and tell the truth', note: 'honesty, and the lane hears it: reputation +4', apply: (s) => ({ patch: { reputation: s.reputation + 4, ...bump(s, 'honesty', 6) }, text: 'You turn your best rug over and show him the knots, and say what it is and what it is not. The colonel buys it at your price, and tells Selim he talks too much.' }) },
        { id: 'expose', label: 'Rub a wet thumb on his "antique" red', note: 'the dye runs: reputation +3, but his family will remember', apply: (s) => ({ patch: { reputation: s.reputation + 3, ...bump(s, 'firmness', 6), selimShamed: true } as Partial<GameState>, text: 'Your thumb comes away pink. The colonel laughs out loud. Selim does not, and neither does his sister, watching from the doorway.' }) },
        { id: 'gracious', label: 'Send the colonel to Selim', note: 'kindness: Rashid hears of it (trust +10), reputation +2', apply: (s) => ({ patch: { reputation: s.reputation + 2, ...bump(s, 'kindness', 6), supplier: { ...s.supplier, trust: Math.min(100, s.supplier.trust + 10) } }, text: '"Buy from him, effendi. He needs it more." The colonel buys nothing from either of you, but the lane talks of nothing else for a week, and Selim cannot meet your eye.' }) },
      ],
    },
    hint: (s) => `Sell at your Giza stall: ${Math.min(RIVAL_SALES, s.stats?.rivalSales ?? 0)} of ${RIVAL_SALES}.`,
    next: (s) => ({ btn: s.world.at === 'giza' ? 'Your stall' : 'To Giza', go: 'district' }),
    check: (s) => (s.stats?.rivalSales ?? 0) >= RIVAL_SALES,
  },
  ambush: {
    id: 'ambush', title: 'Selim\'s cousins', giver: 'Bilgin',
    brief: 'Bilgin lowers his voice. "Selim blames you for his debts. His cousins will be waiting on the Suez road, and Mahmoud Kassab leads them. Do not go alone."',
    steps: [`Hire guards: strength ${AMBUSH_STRENGTH} or more (Giza watchmen, £0.30 each)`, 'Set off for Suez. They will be waiting', 'Beat them, buy them off or talk your way past'],
    target: 'suez',
    locks: 'Bilgin will not send you further until Selim\'s cousins are dealt with.',
    reward: { cash: 500, rep: 5, trust: 5, text: 'In Suez the coffee-house men already know what happened on the road. Nobody in the lane will cross you now.' },
    hint: (s) => {
      const have = strengthOf(s);
      if (have < AMBUSH_STRENGTH) return `Hire guards: strength ${have} of ${AMBUSH_STRENGTH}.`;
      return `Strength ${have}. Set off for Suez: they are waiting.`;
    },
    next: (s) => (strengthOf(s) < AMBUSH_STRENGTH && s.world.at ? { btn: 'Hire guards', go: 'guards' } : null),
    goals: (s) => [{ label: 'Caravan strength', have: Math.min(AMBUSH_STRENGTH, strengthOf(s)), need: AMBUSH_STRENGTH }],
    // done when the cousins have been met on the road, however it went (WorldMap stops you on the way)
    check: (s) => !!(s as unknown as { cousins?: string }).cousins,
  },
  cudgel: {
    id: 'cudgel', title: 'The man with the cudgel', giver: 'The police post at Cairo',
    brief: 'The Cairo police have a poster up: the leader of the band on the Cairo to Suez road, wanted for robbing pilgrims. "Bring him in alive, effendi. Dead men tell us nothing."',
    steps: ['Find his band on the Cairo to Suez road', 'Win the fight, and take him: call him out, or offer quarter when they break', 'Hand him to the police on the spot'],
    target: 'cairo',
    locks: '',
    reward: { cash: 400, rep: 5, trust: 0, text: 'The police captain shakes your hand in front of the whole post. The pilgrims\' road is quiet, and the coffee houses of Cairo know who quieted it.' },
    hint: (s) => { const m = cudgelMan(s); return `Take ${m?.name ?? 'the band\'s leader'} alive, on the Cairo to Suez road.`; },
    goals: (s) => [{ label: 'Their leader taken', have: ['held', 'jailed'].includes(cudgelMan(s)?.status ?? '') ? 1 : 0, need: 1 }],
    check: (s) => ['held', 'jailed'].includes(cudgelMan(s)?.status ?? '') && ((s as unknown as { combat?: { leaderDay?: Record<string, number> } }).combat?.leaderDay?.rb0 ?? -1) >= (s.missionStart?.cudgel ?? 0),
  },
  auction: {
    id: 'auction', title: 'Under the hammer', giver: 'Hagop Boyajian',
    brief: 'Hagop sends a note from the Khan. "Real dealers are made at auctions. Sit in a sale room and win a lot. Do not bid with your heart."',
    steps: ['Sale rooms: Cairo, and most big cities. Each sells on certain days', 'Win any lot. A cheap one counts the same'],
    target: 'cairo',
    locks: 'Hagop has nothing more to teach you until you have won at auction.',
    reward: { cash: 0, rep: 5, trust: 5, text: 'The auctioneer writes your name in his book, and the next sale\'s catalogue arrives at your stall addressed to "the merchant of Giza".' },
    hint: (s) => {
      const here = s.world.at ? soonestSale(s.world.at, s.day) : null;
      if (here && here[1] === s.day) return 'Sale on here today: win any lot.';
      const c = soonestSale('cairo', s.day);
      if (!c) return 'Win one lot at any auction.';
      return `Next Cairo sale: ${when(c[1] - s.day)}. Win any lot.`;
    },
    next: (s) => (s.world.at && s.world.at !== 'cairo' && housesIn(s.world.at).length ? { btn: 'Sale rooms', go: s.world.at } : null),
    check: (s) => (s.stats?.auctionsWon ?? 0) >= 1,
  },
  shepheards: {
    id: 'shepheards', title: 'An order from Shepheard\'s', giver: 'The manager of Shepheard\'s Hotel',
    brief: 'A note on hotel paper: an American lady in the best suite at Shepheard\'s wants "a real Oriental carpet, not tourist rubbish". The manager will have her see you.',
    steps: ['A Fine rug or better, in good order, packed for the road', 'Take it to Shepheard\'s, in Cairo'],
    target: 'cairo',
    locks: '',
    reward: { cash: 0, rep: 3, trust: 0, text: 'The hotel puts your name on the card it gives guests who ask where to buy carpets.' },
    hint: (s) => (!fineRug(s as unknown as GameState) ? 'Pack a Fine rug in good order for the lady at Shepheard\'s.' : s.world.at === 'cairo' ? 'Show the lady your rug at Shepheard\'s.' : 'Take your Fine rug to Shepheard\'s, in Cairo.'),
    next: (s) => (!fineRug(s as unknown as GameState) ? { btn: s.world.at === 'giza' ? 'Stock' : 'To Giza', go: s.world.at === 'giza' ? 'stock' : 'district' } : null),
    goals: (s) => [{ label: 'A Fine rug packed', have: fineRug(s as unknown as GameState) ? 1 : 0, need: 1 }, { label: 'In Cairo', have: s.world.at === 'cairo' ? 1 : 0, need: 1 }],
    check: (s) => s.world.at === 'cairo' && !!fineRug(s as unknown as GameState),
    scene: {
      art: 'art/portraits/mrs-hartley.webp', who: 'Mrs Eleanor Hartley of Philadelphia', title: 'The lady in the best suite',
      text: (s) => { const i = fineRug(s); return `She walks round your ${i ? RUGS[i.typeId].name : 'rug'} twice, kneels in her silk to look at the back, and asks what it is worth. Its worth in the trade is about ${i ? `£${(worth(i) / 100).toFixed(2)}` : 'what you say'}.`; },
      choices: [
        { id: 'fair', label: 'Name a fair price', note: 'its worth and a little more; she will come back', apply: (s) => { const i = fineRug(s); if (!i) return { patch: {}, text: '' }; const p = Math.round(worth(i) * 1.15); return { patch: { ...pay(s, p, `${RUGS[i.typeId].name} to Mrs Hartley at Shepheard's`), inventory: s.inventory.filter((x) => x.uid !== i.uid), reputation: s.reputation + 2, ...bump(s, 'honesty', 3) }, text: `She pays £${(p / 100).toFixed(2)} without a word of argument, and asks for your card.` }; } },
        { id: 'double', label: 'Ask double', note: 'she can afford it; she may not like it', apply: (s) => { const i = fineRug(s); if (!i) return { patch: {}, text: '' }; const ok = Math.random() < 0.55; const p = Math.round(worth(i) * (ok ? 2 : 1.05)); return { patch: { ...pay(s, p, `${RUGS[i.typeId].name} to Mrs Hartley at Shepheard's`), inventory: s.inventory.filter((x) => x.uid !== i.uid), ...(ok ? {} : { reputation: Math.max(0, s.reputation - 1) }) }, text: ok ? `She pays £${(p / 100).toFixed(2)} and thanks you for "not haggling like the others".` : `Her secretary makes a telephone call to the Khan. She pays £${(p / 100).toFixed(2)}, and the manager does not smile at you on the way out.` }; } },
      ],
    },
  },
  warrant: {
    id: 'warrant', title: 'By royal appointment', giver: 'Your own ambition',
    brief: 'A royal warrant would put your name above every dealer in the lane. Laila Haddad buys for Ras el-Tin palace in Alexandria, and receives merchants first.',
    steps: [`Reputation ${FIRST_COURT_REP}`, 'Court dress, kept clean (Cairo or Alexandria tailors)', 'An Exceptional rug in good order, sold at the palace at a fair price'],
    target: 'alexandria',
    locks: 'Purveyor to Kings asks for three royal warrants. This is the first.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'The warrant hangs above your stall in a gilt frame. Buyers read it before they read your prices.' },
    hint: (s) => {
      const rep = (s as unknown as { reputation?: number }).reputation ?? 0;
      if (rep < FIRST_COURT_REP) return `Reach reputation ${FIRST_COURT_REP} (you have ${rep}).`;
      if (charismaOf(s) < 6) return 'Buy court dress (Cairo or Alexandria).';
      if (!courtRug(s)) return 'Pack an Exceptional rug for the palace.';
      return s.world.at === 'alexandria' ? 'Sell to Laila Haddad at Ras el-Tin.' : 'Sell to Laila Haddad in Alexandria.';
    },
    // only packed rugs reach a palace, and packing is done at the Giza stall
    next: (s) => (!courtRug(s) && ((s as unknown as { reputation?: number }).reputation ?? 0) >= FIRST_COURT_REP && charismaOf(s) >= 6 ? { btn: s.world.at === 'giza' ? 'Stock' : 'To Giza', go: s.world.at === 'giza' ? 'stock' : 'district' } : null),
    waits: (s) => repOf(s) < FIRST_COURT_REP,
    goals: (s) => [{ label: 'Reputation', have: Math.min(FIRST_COURT_REP, repOf(s)), need: FIRST_COURT_REP }, { label: 'Court dress', have: charismaOf(s) >= 6 ? 1 : 0, need: 1 }, { label: 'An Exceptional rug packed', have: courtRug(s) ? 1 : 0, need: 1 }],
    check: (s) => s.court.warrants.length >= 1,
  },
  canopy: {
    id: 'canopy', title: 'A stall with a roof', giver: 'Uncle Rashid',
    brief: '"A merchant with a royal warrant, sitting on the ground like a melon seller." Rashid wants you under a proper canopy.',
    steps: ['A rug mat of your own (Improve, £10)', 'Reputation 20, then the bazaar stall with canopy (£50)'],
    target: 'giza',
    locks: 'The Khan el-Khalili shop is let only to a merchant who already keeps a proper stall.',
    reward: { cash: 500, rep: 3, trust: 10, text: 'Rashid walks the length of your new counter, taps the canopy pole twice and nods. "Now you look like your father did." He leaves £5 on the counter for the first month\'s lamp oil.' },
    hint: (s) => {
      if (!s.upgrades.includes('mat')) return 'Buy a rug mat of your own (Improve, at the stall): £10.';
      if (repOf(s) < 20) return `Reach reputation 20 for the bazaar stall (you have ${repOf(s)}).`;
      return 'Buy the bazaar stall with canopy (Improve, at the stall): £50.';
    },
    next: (s) => ({ btn: s.world.at === 'giza' ? 'Your stall' : 'To Giza', go: 'district' }),
    waits: (s) => s.upgrades.includes('mat') && repOf(s) < 20,
    goals: (s) => [{ label: 'Your own mat', have: s.upgrades.includes('mat') ? 1 : 0, need: 1 }, { label: 'Reputation', have: Math.min(20, repOf(s)), need: 20 }, { label: 'The canopy stall', have: s.upgrades.includes('bazaar') ? 1 : 0, need: 1 }],
    check: (s) => s.upgrades.includes('bazaar'),
  },
  weaver: {
    id: 'weaver', title: 'The camel mark', giver: 'Your father\'s rug',
    brief: 'The camel in the corner of your father\'s rug is the mark of the Abu Salem looms in the Fayoum, and old Umm Salah still weaves there.',
    steps: ['Go to Medinet el-Fayoum: a few hours by train', 'Ask for Umm Salah'],
    target: 'fayoum',
    locks: '',
    reward: { cash: 0, rep: 3, trust: 0, text: 'On the train back you find yourself looking at every rug in the carriage for a camel in the corner.' },
    hint: (s) => (s.world.at === 'fayoum' ? 'Find Umm Salah at the looms.' : 'Go to the Fayoum and ask for Umm Salah.'),
    goals: (s) => [{ label: 'In the Fayoum', have: s.world.at === 'fayoum' ? 1 : 0, need: 1 }],
    check: (s) => s.world.at === 'fayoum',
    scene: {
      art: 'art/portraits/ummsalah.webp', who: 'Umm Salah, at the Abu Salem looms', title: 'Umm Salah',
      text: (s) => `She knows you before you speak. "You have his nose. Your father sat where you are sitting, and argued for an hour, and paid me double." ${(s as unknown as { weaverLead?: boolean }).weaverLead ? 'Farid sent word that you would come. ' : ''}She has one old piece left from those years, rolled under the loom.`,
      choices: [
        { id: 'buy', label: 'Buy her old piece', note: 'a Golden Palm in excellent order, documented: £20', when: (s) => s.cash >= 2000, apply: (s) => ({ patch: { ...pay(s, -2000, 'Umm Salah\'s old piece'), inventory: [...s.inventory, { uid: `ws${s.day}`, typeId: 'golden-palm', condition: 'Excellent', restored: false, provenance: 'Documented', paid: 2000, stored: false, notes: ['From Umm Salah\'s own loom, kept under it for twenty years.'] } as RugItem] }, text: 'She will not haggle with you, and charges you less than she should. The rug is worth half as much again in Cairo, and you both know it.' }) },
        { id: 'family', label: 'Ask about your father', note: 'reputation +3; her family takes to you', apply: (s) => { const h = (s as unknown as { household?: { known?: string[]; suitors?: Record<string, { favour: number; visits: number; gifts: number }> } }).household; const known = [...new Set([...(h?.known ?? []), 'amira'])]; const su = h?.suitors ?? {}; const am = su.amira ?? { favour: 0, visits: 0, gifts: 0 }; return { patch: { reputation: s.reputation + 3, ...(h ? { household: { ...h, known, suitors: { ...su, amira: { ...am, favour: Math.min(100, am.favour + 25) } } } } : {}) } as Partial<GameState>, text: 'She talks until the lamps are lit. Her granddaughter Amira brings the tea and listens to every word, and corrects her grandmother twice.' }; } },
      ],
    },
  },
  warrant2: {
    id: 'warrant2', title: 'A second court', giver: 'Your own ambition',
    brief: 'One warrant hangs above your stall; the great dealers hold several. Raghadan in Amman receives you from reputation 20, Abdeen in Cairo from 25.',
    steps: ['Reputation 20 (Amman) or 25 (Cairo)', 'Clean court dress', 'An Exceptional rug, sold at a court that has not yet given you a warrant'],
    target: 'cairo',
    locks: 'Purveyor to Kings asks for three royal warrants. This is the second.',
    reward: { cash: 0, rep: 5, trust: 5, text: 'A second warrant goes up beside the first. Hagop writes from the Khan: "Two courts. Now they will start to ask you for things."' },
    hint: (s) => {
      const rep = repOf(s);
      if (rep < 20) return `Reach reputation 20: Raghadan in Amman (you have ${rep}).`;
      if (charismaOf(s) < 6) return 'Court dress first (Cairo or Alexandria).';
      if (!courtRug(s)) return 'Pack an Exceptional rug for a second court.';
      return rep >= 25 ? 'Sell to Samir al-Masri (Cairo) or Nadir al-Khatib (Amman).' : 'Sell to Nadir al-Khatib in Amman.';
    },
    next: (s) => (!courtRug(s) && charismaOf(s) >= 6 && repOf(s) >= 20 ? { btn: s.world.at === 'giza' ? 'Stock' : 'To Giza', go: s.world.at === 'giza' ? 'stock' : 'district' } : null),
    waits: (s) => repOf(s) < 20,
    check: (s) => s.court.warrants.length >= 2,
  },
  house: {
    id: 'house', title: 'The House of Fortune', giver: 'Your father',
    brief: 'A shop of your own in Khan el-Khalili, all five royal warrants, every rug in the Register, and a fortune of five thousand pounds. The life\'s work of a carpet merchant.',
    steps: ['Buy the Khan el-Khalili shop', 'Hold all five royal warrants', 'Complete the Carpet Register', 'Reach a net worth of £5,000', 'The Collection page in Progress (under Me) keeps the count'],
    locks: 'This is the last chapter.',
    reward: { cash: 0, rep: 10, trust: 0, text: 'Your name is painted over a door in Khan el-Khalili. Your father comes to see it on his stick, and laughs until he has to sit down.' },
    hint: () => 'Finish the House of Fortune (Me, then Progress).',
  },
};
export const MAIN_ORDER = ['alexandria', 'beasts', 'farid', 'rival', 'ambush', 'cudgel', 'auction', 'shepheards', 'warrant', 'canopy', 'weaver', 'warrant2', 'house'];
export const missionsDone = (m?: Record<string, string>) => MAIN_ORDER.filter((id) => m?.[id] === 'done').length;
