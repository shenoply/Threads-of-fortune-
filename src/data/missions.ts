// Main missions: the story spine, one at a time. Each finished mission lets your rank rise one step further.

export interface MissionState {
  day: number;
  world: { at: string | null; appraised: string[] };
  inventory: { uid: string; typeId: string }[];
  stats?: { auctionsWon?: number; rivalSales?: number };
  court: { warrants: string[] };
  upgrades: string[];
  missionStart?: Record<string, number>;
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
  /** done? (the Alexandria errand is completed by the purchase itself) */
  check?: (s: MissionState) => boolean;
}

export const RIVAL_SALES = 6;
import { strength as partyStrength, type PartyState } from '../game/systems/caravan';
import { heroCharisma, START_WARDROBE, type WardrobeState } from './wardrobe';
import { housesIn, nextSale, saleOn } from '../game/auction/sessions';
import { RUGS } from './rugs';
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
/** Queen Nazli at Ras el-Tin, Alexandria, is the court that receives a merchant first (data/royals.ts) */
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

export const MISSIONS: Record<string, Mission> = {
  alexandria: {
    id: 'alexandria', title: 'Rashid\'s errand in Alexandria', giver: 'Uncle Rashid',
    brief: 'Rashid will not sell you more than village rugs, or give you a piastre of credit, until you prove you can buy for yourself. "Go to Alexandria. Walk the Souq el-Attarin, or find its dealers on the Market tab. Choose one rug with your own eyes and pay for it. The seller will send me the receipt, and that is proof enough."',
    steps: ['Take the train to Alexandria: about four hours from Giza, by Cairo and Tanta', 'Find the Souq el-Attarin in the streets, or open the Market tab', 'Buy any rug there. A rug you already bought in Alexandria counts too'],
    target: 'alexandria',
    locks: 'Until then Rashid sells only Common rugs, gives no credit, and your rank cannot rise past Stall keeper.',
    reward: { cash: 200, rep: 3, trust: 15, text: 'Rashid reads your receipt twice. "Not bad. Not good, but not bad." He pays you £2 for the errand, opens his back room and his credit book.' },
    hint: (s) => (s.world.at === 'alexandria' ? 'Buy one rug in the market here.' : 'Alexandria, 4 hours by train: buy one rug.'),
  },
  beasts: {
    id: 'beasts', title: 'Beasts of burden', giver: 'Uncle Rashid',
    brief: 'Rashid has a bale of village rugs waiting at the Tanta market and no one to fetch it. "A merchant who carries everything on his own back is a porter, not a merchant. Buy two donkeys, go to Tanta, bring my bale. Keep two rugs for your trouble." The animal market in Giza sells Egyptian donkeys at about £2.50 a head, and the Tanta market a little cheaper.',
    steps: ['Buy two donkeys: at the Giza animal market or at Tanta (Animals, in the town menu)', 'Go to Tanta with both animals: an hour and a half by train', 'The bale is yours the moment you are in Tanta with two animals', 'Worth knowing: only rugs packed in Stock go on the road with you. Pack them at your Giza stall before you leave'],
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
  },
  farid: {
    id: 'farid', title: 'Your father\'s rug', giver: 'Uncle Rashid',
    brief: 'Rashid lets something slip: your father paid far too much for that old Fayoum rug, the last thing he bought before his back gave out, and he still will not say why. "Farid al-Khatib in Damascus knows every loom from Aleppo to Kayseri. Take it to him. And do not let him see you are nervous." The rug goes with you: Rashid has rolled it in a sack himself.',
    steps: ['Your father\'s rug travels with you. Nothing to pack, and it is not for sale until Farid has seen it', 'Go to Damascus: about a day and a half by train from Giza, by Port Said and Jaffa', 'In Damascus, talk to Farid al-Khatib (People, in the town menu) and show him the rug. His opinion costs nothing', 'Guards are wise on the roads through Palestine and Syria, but not required'],
    target: 'damascus',
    locks: 'Your rank cannot rise past Khan dealer until you know what your father bought.',
    reward: { cash: 0, rep: 4, trust: 5, text: 'Whatever Farid said, the story travels back to Giza before you do. For the first time, merchants in the Khan say your father\'s name with respect, and yours with curiosity.' },
    hint: (s) => {
      if (!hasHearth(s)) return s.world.at === 'damascus' ? 'Tell Farid what became of the rug.' : 'Rug lost: go and tell Farid in Damascus.';
      return s.world.at === 'damascus' ? 'Show Farid al-Khatib the rug (People).' : 'Show Farid the rug: Damascus, 1½ days.';
    },
    // lost for good (Rashid already bought it back once): telling Farid in Damascus is the end of it
    check: (s) => s.world.appraised.length > 0 || (s.world.at === 'damascus' && !hasHearth(s) && !!(s as unknown as { faridRecovered?: boolean }).faridRecovered),
  },
  rival: {
    id: 'rival', title: 'The stall next door', giver: 'Selim Kassab',
    brief: 'A new stall has opened beside your corner. Selim Kassab: oiled hair, a yellow silk tie, a gold tooth and a lot of cheap rugs. He calls your buyers over before they reach you, and tells them your father sold fakes. The lane will decide which of you stays.',
    steps: [`Make ${RIVAL_SALES} sales at your own stall in Giza. Sales anywhere else do not count`, 'Each day he may lure one of your buyers away', 'Kindness, a good name and the right rug keep buyers loyal'],
    target: 'giza',
    locks: 'Your rank cannot rise past Merchant of the Levant while Selim Kassab takes your buyers.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'One morning Selim\'s stall is bare. The coffee-house boy says he owed money to half of Cairo and left on the night train to Port Said. The lane is yours again, and everyone saw how you held it.' },
    hint: (s) => `Sell at your Giza stall: ${Math.min(RIVAL_SALES, s.stats?.rivalSales ?? 0)} of ${RIVAL_SALES}.`,
    next: (s) => ({ btn: s.world.at === 'giza' ? 'Your stall' : 'To Giza', go: 'district' }),
    check: (s) => (s.stats?.rivalSales ?? 0) >= RIVAL_SALES,
  },
  ambush: {
    id: 'ambush', title: 'Selim\'s cousins', giver: 'Bilgin',
    brief: 'Bilgin lowers his voice. Selim Kassab left owing half of Cairo, and he blames you. "His cousins are waiting on the Suez road for your next caravan. Do not go alone. Hire men who have fought before, and show them your caravan is not worth the trouble."',
    steps: [`Hire guards until your caravan's strength is ${AMBUSH_STRENGTH} or more: four Giza watchmen will do (each adds 2 to your own 2), at £0.30 each`, 'Go to Suez: about four and a half hours by train from Giza', 'Arrive with your guards still with you (pay their wages)'],
    target: 'suez',
    locks: 'Bilgin will not send you further until Selim\'s cousins are dealt with.',
    reward: { cash: 500, rep: 5, trust: 5, text: 'Selim\'s cousins see your guards from the ridge and ride away. In Suez the coffee-house men already know. Nobody in the lane will cross you now.' },
    hint: (s) => {
      const have = strengthOf(s);
      if (have < AMBUSH_STRENGTH) return `Hire guards: strength ${have} of ${AMBUSH_STRENGTH}.`;
      return s.world.at === 'suez' ? 'You made it to Suez.' : `Strength ${have}. Now go to Suez.`;
    },
    next: (s) => (strengthOf(s) < AMBUSH_STRENGTH && s.world.at ? { btn: 'Hire guards', go: 'guards' } : null),
    check: (s) => s.world.at === 'suez' && !!(s as unknown as Party).world.party && strengthOf(s) >= AMBUSH_STRENGTH,
  },
  auction: {
    id: 'auction', title: 'Under the hammer', giver: 'Hagop Boyajian',
    brief: 'Hagop sends a note from the Khan: the great Ottoman houses on the Bosphorus are selling up, and their carpets are going under the hammer. "Real dealers are made at auctions. Sit in the sale rooms, watch what things fetch, and win a lot. Do not bid with your heart."',
    steps: ['The nearest sale rooms are in Cairo. Alexandria, Jerusalem, Damascus, Amman, Baghdad and Constantinople have them too', 'Each house sells on certain days: the objective line says when the next Cairo sale is', 'Take a seat, inspect the lots and win any one of them. A cheap lot counts the same'],
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
  warrant: {
    id: 'warrant', title: 'By royal appointment', giver: 'Your own ambition',
    brief: 'Kings, queens and emirs buy carpets too. A royal warrant would put your name above every dealer in the lane. Dress for court, bring an Exceptional rug, and win a royal sale. Queen Nazli at Ras el-Tin palace in Alexandria receives merchants first, from reputation 15.',
    steps: [`Reach reputation ${FIRST_COURT_REP}: Queen Nazli at Ras el-Tin, Alexandria. Other courts ask 20 to 35`, 'Buy court dress from a tailor in Cairo or Alexandria, and keep it clean', 'Pack an Exceptional rug or better, in good condition, and sell it at the palace for a fair price. Courts do not look at Common or Fine rugs'],
    target: 'alexandria',
    locks: 'Purveyor to Kings asks for three royal warrants. This is the first.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'The warrant hangs above your stall in a gilt frame. Buyers read it before they read your prices.' },
    hint: (s) => {
      const rep = (s as unknown as { reputation?: number }).reputation ?? 0;
      if (rep < FIRST_COURT_REP) return `Reach reputation ${FIRST_COURT_REP} (you have ${rep}).`;
      if (charismaOf(s) < 6) return 'Buy court dress (Cairo or Alexandria).';
      if (!courtRug(s)) return 'Pack an Exceptional rug for the palace.';
      return s.world.at === 'alexandria' ? 'Sell to Queen Nazli at Ras el-Tin.' : 'Sell to Queen Nazli in Alexandria.';
    },
    // only packed rugs reach a palace, and packing is done at the Giza stall
    next: (s) => (!courtRug(s) && ((s as unknown as { reputation?: number }).reputation ?? 0) >= FIRST_COURT_REP && charismaOf(s) >= 6 ? { btn: s.world.at === 'giza' ? 'Stock' : 'To Giza', go: s.world.at === 'giza' ? 'stock' : 'district' } : null),
    check: (s) => s.court.warrants.length >= 1,
  },
  canopy: {
    id: 'canopy', title: 'A stall with a roof', giver: 'Uncle Rashid',
    brief: 'Rashid stands under your borrowed corner in the noon sun and fans himself with his hat. "A merchant with a royal warrant, sitting on the ground like a melon seller. Put down a mat of your own, then take a proper stall with a canopy. The lane respects shade."',
    steps: ['Buy a rug mat of your own: Improve, at your Giza stall (£10)', 'Reach reputation 20, then buy the bazaar stall with canopy (£50)', 'Both raise the monthly rent. They also bring buyers who stay longer and spend more'],
    target: 'giza',
    locks: 'The Khan el-Khalili shop is let only to a merchant who already keeps a proper stall.',
    reward: { cash: 500, rep: 3, trust: 10, text: 'Rashid walks the length of your new counter, taps the canopy pole twice and nods. "Now you look like your father did." He leaves £5 on the counter for the first month\'s lamp oil.' },
    hint: (s) => {
      if (!s.upgrades.includes('mat')) return 'Buy a rug mat of your own (Improve, at the stall): £10.';
      if (repOf(s) < 20) return `Reach reputation 20 for the bazaar stall (you have ${repOf(s)}).`;
      return 'Buy the bazaar stall with canopy (Improve, at the stall): £50.';
    },
    next: (s) => ({ btn: s.world.at === 'giza' ? 'Your stall' : 'To Giza', go: 'district' }),
    check: (s) => s.upgrades.includes('bazaar'),
  },
  warrant2: {
    id: 'warrant2', title: 'A second court', giver: 'Your own ambition',
    brief: 'One warrant hangs above your stall. The great dealers of the Levant hold several. King Fuad at Abdeen palace in Cairo receives merchants from reputation 25, and the Emir Abdullah at Raghadan in Amman from 20. Each court wants an Exceptional rug, at a fair price.',
    steps: ['Reach reputation 20 for the Emir in Amman, or 25 for King Fuad in Cairo', 'Keep your court dress clean', 'Pack an Exceptional rug in good condition and sell it to a court that has not yet given you a warrant'],
    target: 'cairo',
    locks: 'Purveyor to Kings asks for three royal warrants. This is the second.',
    reward: { cash: 0, rep: 5, trust: 5, text: 'A second warrant goes up beside the first. Hagop writes from the Khan: "Two courts. Now they will start to ask you for things."' },
    hint: (s) => {
      const rep = repOf(s);
      if (rep < 20) return `Reach reputation 20: the Emir in Amman (you have ${rep}).`;
      if (charismaOf(s) < 6) return 'Court dress first (Cairo or Alexandria).';
      if (!courtRug(s)) return 'Pack an Exceptional rug for a second court.';
      return rep >= 25 ? 'Sell to King Fuad (Cairo) or the Emir (Amman).' : 'Sell to the Emir Abdullah in Amman.';
    },
    next: (s) => (!courtRug(s) && charismaOf(s) >= 6 && repOf(s) >= 20 ? { btn: s.world.at === 'giza' ? 'Stock' : 'To Giza', go: s.world.at === 'giza' ? 'stock' : 'district' } : null),
    check: (s) => s.court.warrants.length >= 2,
  },
  house: {
    id: 'house', title: 'The House of Fortune', giver: 'Your father',
    brief: 'A shop of your own in Khan el-Khalili, all five royal warrants, every rug in the Register, and a fortune of five thousand pounds. The life\'s work of a carpet merchant.',
    steps: ['Buy the Khan el-Khalili shop', 'Hold all five royal warrants', 'Complete the Carpet Register', 'Reach a net worth of £5,000', 'The Collection page on the Progress tab keeps the count'],
    locks: 'This is the last chapter.',
    reward: { cash: 0, rep: 10, trust: 0, text: 'Your name is painted over a door in Khan el-Khalili. Your father comes to see it on his stick, and laughs until he has to sit down.' },
    hint: () => 'Finish the House of Fortune (Progress tab).',
  },
};
export const MAIN_ORDER = ['alexandria', 'beasts', 'farid', 'rival', 'ambush', 'auction', 'warrant', 'canopy', 'warrant2', 'house'];
export const missionsDone = (m?: Record<string, string>) => MAIN_ORDER.filter((id) => m?.[id] === 'done').length;
