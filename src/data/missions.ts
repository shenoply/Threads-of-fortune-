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
  /** done? (the Alexandria errand is completed by the purchase itself) */
  check?: (s: MissionState) => boolean;
}

export const RIVAL_SALES = 8;
import { TROOPS } from './caravan';
const strengthOf = (troops: Record<string, number>) => 2 + Object.entries(troops ?? {}).reduce((a, [id, n]) => a + (TROOPS[id]?.strength ?? 0) * (n ?? 0), 0);

export const MISSIONS: Record<string, Mission> = {
  alexandria: {
    id: 'alexandria', title: 'Rashid\'s errand in Alexandria', giver: 'Uncle Rashid',
    brief: 'Rashid will not sell you more than village rugs, or give you a piastre of credit, until you prove you can buy for yourself. "Go to Alexandria. Walk the Souq el-Attarin. Bring me back one rug you chose with your own eyes, and tell me what you paid."',
    steps: ['Open the World map', 'Travel to Alexandria (the train from Cairo takes about a day)', 'Walk the streets and find the Souq el-Attarin, or open the Market tab', 'Buy any rug in the Alexandria market'],
    target: 'alexandria',
    locks: 'Until then Rashid sells only Common rugs, gives no credit, and your rank cannot rise.',
    reward: { cash: 200, rep: 3, trust: 15, text: 'Rashid reads your receipt twice. "Not bad. Not good, but not bad." He pays you £2 for the errand, opens his back room and his credit book.' },
    hint: (s) => (s.world.at === 'alexandria' ? 'You are in Alexandria: buy a rug in the market.' : 'Travel to Alexandria and buy a rug there.'),
  },
  beasts: {
    id: 'beasts', title: 'Beasts of burden', giver: 'Uncle Rashid',
    brief: 'Rashid has a bale of village rugs waiting at the Tanta market and no one to fetch it. "A merchant who carries everything on his own back is a porter, not a merchant. Buy a donkey or a camel, go to Tanta, bring my bale. Keep two rugs for your trouble."',
    steps: ['Buy a pack animal at the animal market in Giza (tap the Animals place in the lane)', 'Travel to Tanta with at least two animals', 'Collect the bale at the market (it is a job on the map)'],
    target: 'tanta',
    locks: 'Your rank cannot rise past Bazaar merchant until you can carry stock of your own.',
    reward: { cash: 300, rep: 3, trust: 10, text: 'Rashid counts the bale twice and pays you £3. "You look almost like a merchant now. Almost. The donkey looks more like one than you."' },
    hint: (s) => ((s as unknown as { world: { party: { animals: Record<string, number> } } }).world.party ? 'Buy a pack animal, then fetch Rashid\'s bale from Tanta.' : 'Fetch Rashid\'s bale from Tanta.'),
    check: (s) => ((s as unknown as { jobsDone?: string[] }).jobsDone ?? []).includes('tanta-bale'),
  },
  farid: {
    id: 'farid', title: 'Your father\'s rug', giver: 'Uncle Rashid',
    brief: 'Rashid lets something slip: your father paid far too much for that old Fayoum rug, the last thing he bought before his back gave out, and he still will not say why. "Farid al-Khatib in Damascus knows every loom from Aleppo to Kayseri. Take it to him. Pack it for the road. And do not let him see you are nervous."',
    steps: ['Pack the Fayoum Hearth for the road in your Stock', 'Hire guards: raiders ride the roads through Palestine and Syria', 'Travel to Damascus: by sea to Beirut then the railway, or by road through Jerusalem', 'Find Farid al-Khatib in the Souq al-Hamidiyya and ask him to look at it'],
    target: 'damascus',
    locks: 'Your rank cannot rise past Bazaar merchant until you know what your father bought.',
    reward: { cash: 0, rep: 4, trust: 5, text: 'Whatever Farid said, the story travels back to Giza before you do. For the first time, merchants in the Khan say your father\'s name with respect, and yours with curiosity.' },
    hint: (s) => (s.world.at === 'damascus' ? 'You are in Damascus: talk to Farid al-Khatib in the Souq al-Hamidiyya.' : 'Take the Fayoum Hearth to Farid al-Khatib in Damascus.'),
    check: (s) => s.world.appraised.length > 0 || (s.world.at === 'damascus' && !s.inventory.some((i) => i.typeId === 'fayoum-hearth')),
  },
  rival: {
    id: 'rival', title: 'The stall next door', giver: 'Selim Kassab',
    brief: 'A new stall has opened beside your corner. Selim Kassab: oiled hair, a yellow silk tie, a gold tooth and a lot of cheap rugs. He calls your buyers over before they reach you, and tells them your father sold fakes. The lane will decide which of you stays.',
    steps: [`Make ${RIVAL_SALES} sales at your own stall while Selim is there`, 'Every day he may lure one of your buyers away', 'Kindness, a good name and the right rug keep buyers loyal'],
    locks: 'Your rank cannot rise past Khan dealer while Selim Kassab takes your buyers.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'One morning Selim\'s stall is bare. The coffee-house boy says he owed money to half of Cairo and left on the night train to Port Said. The lane is yours again, and everyone saw how you held it.' },
    hint: (s) => `Sell at your stall: ${Math.min(RIVAL_SALES, s.stats?.rivalSales ?? 0)} of ${RIVAL_SALES} sales since Selim arrived.`,
    check: (s) => (s.stats?.rivalSales ?? 0) >= RIVAL_SALES,
  },
  ambush: {
    id: 'ambush', title: 'Selim\'s cousins', giver: 'Abu Hamid',
    brief: 'Abu Hamid lowers his voice. Selim Kassab left owing half of Cairo, and he blames you. "His cousins are waiting on the Suez road for your next caravan. Do not go alone. Hire men who have fought before, and show them your caravan is not worth the trouble."',
    steps: ['Hire guards until your caravan\'s strength is 10 or more (Giza watchmen, Cairo sentinels, a Bedouin captain or an Arnaut)', 'Travel to Suez', 'Arrive with your guards still with you'],
    target: 'suez',
    locks: 'Your rank cannot rise past Khan dealer while Selim\'s cousins hunt your caravans.',
    reward: { cash: 500, rep: 5, trust: 5, text: 'Selim\'s cousins see your guards from the ridge and ride away. In Suez the coffee-house men already know. Nobody in the lane will cross you now.' },
    hint: (s) => (s.world.at === 'suez' ? 'You made it to Suez.' : 'Hire guards (strength 10) and travel to Suez.'),
    check: (s) => s.world.at === 'suez' && ((s as unknown as { world: { party: { troops: Record<string, number> } } }).world.party ? strengthOf((s as unknown as { world: { party: { troops: Record<string, number> } } }).world.party.troops) >= 10 : false),
  },
  auction: {
    id: 'auction', title: 'Under the hammer', giver: 'Hagop Boyajian',
    brief: 'Hagop sends a note from the Khan: the great Ottoman houses on the Bosphorus are selling up, and their carpets are going under the hammer. "Real dealers are made at auctions. Sit in the sale rooms, watch what things fetch, and win a lot. Do not bid with your heart."',
    steps: ['Find an auction house: Cairo, Alexandria, Jerusalem, Damascus, Amman, Baghdad and Istanbul each have two', 'Go on a sale day and take a seat', 'Inspect the lots, then bid, and win at least one'],
    locks: 'Your rank cannot rise past Merchant of the Levant until you have won at auction.',
    reward: { cash: 0, rep: 5, trust: 5, text: 'The auctioneer writes your name in his book, and the next sale\'s catalogue arrives at your stall addressed to "the merchant of Giza".' },
    hint: () => 'Win a lot at auction. The Khan el-Khalili Dealer Room in Cairo sells every few days.',
    check: (s) => (s.stats?.auctionsWon ?? 0) >= 1,
  },
  warrant: {
    id: 'warrant', title: 'By royal appointment', giver: 'Your own ambition',
    brief: 'Kings, queens and emirs buy carpets too. A royal warrant would put your name above every dealer in the lane. Dress for court, bring your finest pieces, and win a royal sale.',
    steps: ['Earn the reputation a court asks for', 'Buy court dress from a tailor and keep it clean', 'Bring an Exceptional or Legendary rug to a palace and make the sale'],
    locks: 'Your rank cannot rise to Purveyor to Kings without a royal warrant.',
    reward: { cash: 0, rep: 5, trust: 10, text: 'The warrant hangs above your stall in a gilt frame. Buyers read it before they read your prices.' },
    hint: () => 'Win a royal sale at any palace.',
    check: (s) => s.court.warrants.length >= 1,
  },
  house: {
    id: 'house', title: 'The House of Fortune', giver: 'Your father',
    brief: 'A shop of your own in Khan el-Khalili, all five royal warrants, every rug in the Register, and a fortune of five thousand pounds. The life\'s work of a carpet merchant.',
    steps: ['See the Collection page on the Merchant tab for all four conditions'],
    locks: 'This is the last chapter.',
    reward: { cash: 0, rep: 10, trust: 0, text: 'Your name is painted over a door in Khan el-Khalili. Your father comes to see it on his stick, and laughs until he has to sit down.' },
    hint: () => 'Complete the House of Fortune (Merchant tab, Collection).',
  },
};
export const MAIN_ORDER = ['alexandria', 'beasts', 'farid', 'rival', 'ambush', 'auction', 'warrant', 'house'];
export const missionsDone = (m?: Record<string, string>) => MAIN_ORDER.filter((id) => m?.[id] === 'done').length;
