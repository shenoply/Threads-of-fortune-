// Malek's grill: the rules, kept pure so they can be tested without the store.
// Hours, stock, what a meal or a parcel does to the merchant, which visit picture fits, what he
// says, and the five-visit story's state machine. Every number is invented game balance.
import { MALEK_MENU, malekItem, type MalekEffects, type MalekItem, type MalekItemId } from '../../data/malekMenu';
import { CONDITION_START, type Condition1925 } from './fieldwork';

// ---------------- hours and stock ----------------
export const MALEK_HOURS: [number, number] = [7, 21];
export const MORNING_END = 11;
export const GRILL_HOURS: [number, number] = [11, 20];
/** one eat-in meal, sat down and paid for */
export const MEAL_MINUTES = 20;
/** meal energy and morale count once per window; tea's energy once per window */
export const MEAL_WINDOW_H = 4;

export const shopOpen = (hour: number) => hour >= MALEK_HOURS[0] && hour < MALEK_HOURS[1];
/** The pot rotates: beef stew two days in three, and on the third the pot is beans again. */
export const stewToday = (day: number) => day % 3 !== 0;

export interface MalekState {
  /** the day the counts below belong to; a new day restocks */
  stockDay: number;
  sold: Partial<Record<MalekItemId, number>>;
  visits: number;
  lastVisitDay?: number;
  lastScene?: MalekScene;
  /** order tokens already charged: a double tap or a replayed request cannot charge twice */
  orders: string[];
  /** the last few lines he said, so he does not repeat himself */
  said: string[];
  /** his visits to your stall as a customer */
  stallLastDay?: number;
  /** how his last stall visit ended, and whether he has said so at his shop yet */
  stallOutcome?: 'sold' | 'walked';
  stallNoted?: boolean;
  /** the rug you sold him (a rug type id): it lies under his tables */
  rug?: string;
  rugDay?: number;
  /** plates on his account after the rug sale */
  tab?: number;
  /** a rug he will come back to the stall for; `again`: he bought one and wants another of that kind */
  wantsBack?: { uid: string; typeId: string; day: number; again?: boolean };
  /** the day you first came in: the story starts on a later day */
  firstDay?: number;
  story: MalekStory;
}
export const MALEK_START: MalekState = { stockDay: 0, sold: {}, visits: 0, orders: [], said: [], story: { nextStage: 1, lastStoryDay: null, completed: [] } };

/** today's counts (yesterday's sales don't count against today's grill) */
export const soldToday = (m: MalekState | undefined, day: number) => (m && m.stockDay === day ? m.sold : {});
export function stockLeft(item: MalekItem, m: MalekState | undefined, day: number) {
  if (item.dailyStock == null) return Infinity;
  return Math.max(0, item.dailyStock - (soldToday(m, day)[item.id] ?? 0));
}

export type Unavailable = 'closed' | 'morning_only' | 'grill_not_lit' | 'grill_cold' | 'no_stew_today' | 'sold_out';
/** Can he serve it now? */
export function availability(item: MalekItem, hour: number, day: number, m: MalekState | undefined): { ok: true } | { ok: false; why: Unavailable } {
  if (!shopOpen(hour)) return { ok: false, why: 'closed' };
  if (item.availability === 'morning' && hour >= MORNING_END) return { ok: false, why: 'morning_only' };
  if (item.availability === 'grill_hours' && hour < GRILL_HOURS[0]) return { ok: false, why: 'grill_not_lit' };
  if (item.availability === 'grill_hours' && hour >= GRILL_HOURS[1]) return { ok: false, why: 'grill_cold' };
  if (item.availability === 'daily_special' && !stewToday(day)) return { ok: false, why: 'no_stew_today' };
  if (stockLeft(item, m, day) <= 0) return { ok: false, why: 'sold_out' };
  return { ok: true };
}
export const UNAVAILABLE_WORD: Record<Unavailable, string> = {
  closed: 'Shop closed',
  morning_only: 'Mornings only (before 11:00)',
  grill_not_lit: 'Grill lit at 11:00',
  grill_cold: 'Grill is cold after 20:00',
  no_stew_today: 'Not today: the pot is beans',
  sold_out: 'Sold out today',
};

// ---------------- what eating does ----------------
/** fed and water meters: the two new ones; fatigue is the existing one (higher is worse) */
export const FED_START = 40;
export const WATER_START = 70;
/** fed this much at nightfall and your own ration stays in the sack */
export const FED_ENOUGH = 50;
export const fedOf = (c?: Condition1925) => c?.fed ?? FED_START;
export const waterOf = (c?: Condition1925) => c?.water ?? WATER_START;
export const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface Gain { gain: number; wasted: number }
export interface MealReport {
  fed: Gain;
  /** fatigue taken off (positive is good) */
  rest: Gain;
  water: Gain;
  /** "well fed": extra patience at the stall until `until` (absolute game hour) */
  wellFed: { value: number; until: number; note: string };
}

const gainUpTo = (from: number, delta: number): Gain => {
  if (delta >= 0) { const to = clamp100(from + delta); return { gain: to - from, wasted: from + delta - to }; }
  const to = clamp100(from + delta); return { gain: to - from, wasted: 0 };
};
/** the "Well fed" bonus active at absolute hour `now`, as extra buyer patience */
export const wellFedNow = (c: Condition1925 | undefined, now: number) => (c?.wellFed && now < c.wellFed.until ? c.wellFed.value : 0);
/** patience points per morale point the menu lists */
export const MORALE_PATIENCE = 2;

/**
 * Eat one serving. Fed and water always apply up to the cap (the overflow is reported, not kept).
 * Energy and morale do not stack: within one four-hour window only the best meal counts, and a
 * second, smaller meal adds nothing; tea's energy counts once per window of its own. Nothing here
 * heals wounds, cures illness or adds strength.
 */
export function eatServing(c0: Condition1925 | undefined, item: MalekItem, now: number): { c: Condition1925; report: MealReport } {
  const c: Condition1925 = { ...CONDITION_START, ...(c0 ?? {}) };
  const e: MalekEffects = item.effects;
  const fed = gainUpTo(fedOf(c), e.satiety);
  const water = gainUpTo(waterOf(c), e.hydration);
  const tea = item.id === 'malek_tea';
  let energy = 0;
  if (tea) {
    if (c.teaAt == null || now - c.teaAt >= MEAL_WINDOW_H) { energy = e.energy; c.teaAt = now; }
  } else {
    const win = c.mealWindow && now - c.mealWindow.start < MEAL_WINDOW_H ? c.mealWindow : { start: now, energy: 0 };
    energy = Math.max(0, e.energy - win.energy);
    c.mealWindow = { start: win.start, energy: Math.max(win.energy, e.energy) };
  }
  const restTo = clamp100(c.fatigue - energy);
  const rest = { gain: c.fatigue - restTo, wasted: energy - (c.fatigue - restTo) };
  // well fed: the highest within the window, never extended by eating again
  let wellFed = c.wellFed && now < c.wellFed.until ? { ...c.wellFed } : undefined;
  let note: string;
  if (!wellFed) { wellFed = { value: e.morale, until: now + MEAL_WINDOW_H }; note = e.morale ? 'new' : 'none'; }
  else if (e.morale > wellFed.value) { wellFed = { value: e.morale, until: wellFed.until }; note = 'raised'; }
  else note = 'kept';
  return {
    c: { ...c, fed: fedOf(c) + fed.gain, water: waterOf(c) + water.gain, fatigue: restTo, wellFed: wellFed.value ? wellFed : c.wellFed },
    report: { fed, rest, water, wellFed: { value: wellFed.value, until: wellFed.until, note } },
  };
}

/**
 * One night passes for the two new meters. Returns how many of your own rations you skip.
 * Water: in a town you drink what you like (back to at least 60). On the road the caravan's
 * provisions include water: a night costs a little but never takes you below 30, so the old road
 * balance is unchanged and only the day's salted food can leave you thirsty. With the sacks empty a
 * night costs 25. Thirsty at nightfall (below 25) adds fatigue.
 */
export function nightMeters(c0: Condition1925, o: { onRoad: boolean; provisions: boolean }) {
  const c = { ...c0 };
  const fedEnough = fedOf(c) >= FED_ENOUGH;
  c.fed = clamp100(fedOf(c) - 60);
  const w = waterOf(c);
  // in a town you drink before you sleep; thirst is a road thing
  const thirsty = o.onRoad && (o.provisions ? w < 25 : w - 25 < 25);
  c.water = clamp100(!o.onRoad ? Math.max(w, 60) : o.provisions ? Math.max(Math.min(w, 30), w - 5) : w - 25);
  if (thirsty) c.fatigue = clamp100(c.fatigue + 6);
  return { c, skipRation: fedEnough ? 1 : 0, thirsty };
}

// ---------------- parcels ----------------
export interface FoodParcel { uid: string; item: MalekItemId; servings: number; boughtDay: number; spoilsDay: number }
/** game freshness: seven days, five in the hot months (May to September). Not a real storage claim. */
export function parcelDays(item: MalekItem, day: number) {
  const month = new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth();
  return month >= 4 && month <= 8 ? Math.max(1, item.storageDays - 2) : item.storageDays;
}
export const parcelWeight = (p: FoodParcel) => Math.round(p.servings * (malekItem(p.item).weightKg / malekItem(p.item).servings) * 100) / 100;
export const parcelsWeight = (ps: FoodParcel[] | undefined) => Math.round((ps ?? []).reduce((s, p) => s + parcelWeight(p), 0) * 100) / 100;
export const parcelFresh = (p: FoodParcel, day: number) => day <= p.spoilsDay;

// ---------------- visit pictures ----------------
export type MalekScene = 'preparing' | 'grilling' | 'serving' | 'closing';
export const SCENE_ART: Record<MalekScene, string> = {
  preparing: 'art/malek/scene-preparing.webp',
  grilling: 'art/malek/scene-grilling.webp',
  serving: 'art/malek/scene-serving.webp',
  closing: 'art/malek/scene-closing.webp',
};
export const SCENE_TEXT: Record<MalekScene, string> = {
  preparing: 'Malek is at the bench at the back, working mince for kofta with his hands. He does not look up.',
  grilling: 'Smoke off the charcoal. Malek turns a row of skewers at the brazier on the left, one at a time.',
  serving: 'Malek carries a plate between the tables, sets it down, and goes back to the grill without a word.',
  closing: 'The grill is cold. Malek sits at a table under the lamp, counting the day\'s coins into stacks.',
};
/** where he stands in the room for each picture: behind the grill, behind the bench, or sat at a table */
export const SCENE_SPOT: Record<MalekScene, 'grill' | 'bench' | 'table'> = { preparing: 'bench', grilling: 'grill', serving: 'bench', closing: 'table' };
const eligibleScenes = (hour: number): MalekScene[] => {
  if (hour >= GRILL_HOURS[1]) return ['closing'];
  const out: MalekScene[] = [];
  if (hour < 17) out.push('preparing');
  if (hour >= GRILL_HOURS[0]) out.push('grilling');
  if (hour >= 8) out.push('serving');
  return out.length ? out : ['preparing'];
};
/** a picture that fits the hour, never the same as last visit when another one fits */
export function pickScene(hour: number, last: MalekScene | undefined, salt: number): MalekScene {
  const all = eligibleScenes(hour);
  const pool = all.length > 1 ? all.filter((s) => s !== last) : all;
  return pool[Math.abs(salt) % pool.length];
}

// ---------------- what he says ----------------
// Dry, short, pessimistic. "Ha", "Bah" and "Now what?" turn up now and then, never every time.
export type TalkTopic = 'shop' | 'name' | 'storeroom' | 'neighbours' | 'road' | 'rugs' | 'arthur';
export type LineCtx =
  | 'greetFirst' | 'greetMorning' | 'greetMidday' | 'greetEvening' | 'greetRegular' | 'greetAway' | 'greetTired' | 'greetHungry' | 'greetRug' | 'greetNoSale'
  | 'menu' | 'kofta' | 'grill' | 'cheap' | 'parcel' | 'tea' | 'tab' | 'soldOut' | 'closing' | 'grillCold' | 'full' | 'broke' | 'bye'
  | 'rugsWant' | 'rugsHave' | 'storeroomKnown' | Exclude<TalkTopic, 'rugs'>;
const CATCH = /^(Ha\b|Bah\b|Now what\?)/;
export const MALEK_LINES: Record<LineCtx, string[]> = {
  // ---- greetings: picked by malekGreeting from the hour and how you look ----
  greetFirst: [
    'Sit anywhere. The stools are all equally bad.',
    'You are new. Everyone is new once. Then they complain.',
    'Welcome. That is the last nice thing I say today, so remember it.',
    'I am Malek, Al-Mallem. The boss. And there is nobody else here to be boss of.',
  ],
  greetMorning: [
    'Beans are on. The grill is not. Do not ask me about the grill before eleven.',
    'Early. Good. The early ones complain less; they are still asleep.',
    "Morning. The ful is hot and the bread is yesterday's. Today's bread is late. Bread is always late.",
    'I light the charcoal before the sun. I put the beans on.',
  ],
  greetMidday: [
    'Now what?',
    'And by noon everyone wants lunch at the same time. Nobody thinks of me.',
    'Sit, sit. If the stool wobbles, that is the stool.',
    'The grill is hot, the meat is honest, and I am tired. Two out of three is good for Giza.',
  ],
  greetEvening: [
    'Late. The grill is going cold. So am I.',
    'Evening. If you wanted kebab, you should have wanted it at noon.',
    'Bah. A customer at the end of the day. Good. The coins were lonely.',
    'Sit. I am counting. If you talk, I lose count, and then I start again, and then I am angry.',
  ],
  greetRegular: [
    'You again. The food has not changed. Neither have I.',
    'Your stool is free. Nobody else wants it either.',
    'Back for more. I knew it. Nobody listens to me, but they come back.',
    'If you come every day, people will think the food is good. Do not ruin my name.',
  ],
  greetAway: [
    'Ha. Alive. I said you would get lost. I was nearly right.',
    'Where were you? Never mind. Everywhere is worse than here; you know that now.',
    'You look like someone who ate road bread for a week. Sit down before you fall down.',
  ],
  greetTired: [
    'You look terrible. That is not an insult; it is a diagnosis. Tea.',
    'Sit before you fall on my tables. They are older than you and weaker.',
    'Tired? Eat something with meat in it, then go to bed. Two pieces of advice, both free, both ignored.',
  ],
  greetHungry: [
    'I can hear your stomach from the grill. Order something before it frightens the customers.',
    'You are hungry. Do not argue; I have seen hungry before. It looks exactly like you.',
    'Sit. Eat. Then talk. In that order, or not at all.',
  ],
  greetRug: [
    'Your rug is under the tables. A man spilled stew on it this morning. It survived. I am almost impressed.',
    'Look at the floor. Your rug. Grease, boots, tea, one cat. Still alive. Hm.',
    'Customers ask where I bought the rug. I tell them a thief sold it to me. They laugh. I do not.',
  ],
  greetNoSale: [
    'I came to your stall. Everything was too pretty. Pretty does not last here.',
    'Your rugs looked at me like they were too good for my floor. They were right. That is the problem.',
  ],
  // ---- ordering ----
  menu: [
    'It is all on the board. Read it slowly; it does not get cheaper if you read it fast.',
    'Kofta, kebab, liver. The pot is whatever the pot is today.',
    'Ha. You want to see the menu. It is four things and some bread.',
    'The board does not lie. I wrote it. I do not lie either; I only complain.',
    'Kofta is good. Kebab is better and costs more. That is how the world works; do not look surprised.',
  ],
  kofta: [
    'You want it cheaper? I can put the meat back on the sheep.',
    'Kofta. Mince, onion, fire. Nothing clever. Clever food is for hotels.',
    "My father's kofta. He also complained the whole time he made it, so it is authentic.",
    'Is the kofta good? Of course it is good. I make it with my own hands.',
  ],
  grill: [
    'Straight off the charcoal. Burn your mouth if you like; I do not give refunds for patience.',
    'Eat it hot. Cold kebab is just an argument.',
    'Liver. Hot, fast, honest. Like an argument with my supplier.',
    'Lamb. I had four this morning. Now I have fewer. Life is like that.',
  ],
  cheap: [
    'Beans. The cheapest thing in Giza that is not advice.',
    'Soup. It fills you up and it does not argue.',
    'Ful. Cheap, filling, and it will still be with you at sunset.',
  ],
  parcel: [
    'It lasts longer than my patience. Take water.',
    'Salted beef. You will want water before Suez. You will want water before the end of the street.',
    'Wrapped twice. If it goes off, that is the road, not me.',
    'Bastirma from Cairo. My supplier swears by it. He swears by everything. Take water.',
    'For the road? Eat it slowly. The desert is long and my patience is short; one of them will run out.',
  ],
  tea: [
    'Tea. One glass. Two glasses and you will start talking to me.',
    'Sugar is extra. No, it is not. Bah. Drink it.',
    'Tea. The only thing in this shop that is never late.',
  ],
  tab: [
    'On my account. Do not get used to it. I already regret it.',
    'Free. Because of the rug. If the rug dies, you pay double.',
    'Eat. It is paid for. By me. Ha. Do not tell the bean man.',
  ],
  soldOut: [
    'Ha. The sheep has finished its shift.',
    'Gone. Come earlier. Everyone who comes late says they will come earlier.',
    'Finished. Everything good finishes early. Remember that about life.',
  ],
  closing: [
    'Coins again. Funny how they never breed overnight.',
    'The grill is cold. I can sell you a parcel. I cannot sell you a fire.',
    'The fire is out. The coins are counted. They were wrong again. They are always wrong.',
  ],
  grillCold: [
    'The fire is out. Fire does not come back because you are hungry.',
    'Cold grill. Parcels, tea, soup. Or tomorrow. Tomorrow is very popular.',
  ],
  full: [
    'You are full. I can see it from here. Eat it anyway; I already cooked it.',
    'Another plate? You will roll home. I will not carry you.',
  ],
  broke: [
    'You have the money or you have the story. I take the money.',
    'Bah. Come back when your purse agrees with your stomach.',
    'Count your coins. I counted mine. Neither of us is happy.',
  ],
  bye: [
    'Go. Come back hungry.',
    'Mind the step. Everyone trips on the step. I will not fix it.',
    'Close the door. No, leave it, it is too hot. Halfway. Go.',
  ],
  // ---- talk topics ----
  shop: [
    'I work alone. Partners eat the profits and then they eat the kofta.',
    'One grill, four tables, one owner. If I had two grills I would need two of me. One of me is enough trouble.',
    'Business is fine. Business is always fine until it is not.',
    'The tourists ask if it is authentic. I tell them it is lunch.',
    'The charcoal man comes on Tuesdays. Some Tuesdays. He thinks the week is a suggestion.',
  ],
  name: [
    'Al-Mallem means the boss. Everyone calls me that. Even the sheep, I think.',
    'Boo Rayan, because of my son. He is at school learning to argue. He is already better at it than me.',
    'Malek. It means "the owner". I own four tables, one grill and no patience. Sit.',
  ],
  storeroom: [
    'The storeroom? Charcoal, onions, sacks. Nothing else. Why do you ask? Do not ask.',
    'Do not go in the back. It is not dangerous. It is private. There is a difference, mostly.',
    'You heard something in the back? That was the onions. They settle.',
    'I keep the good bastirma in the back. Also other things. Eat your food.',
  ],
  neighbours: [
    'The Englishman with the bottles smells rugs for money. Arran. He eats here and asks what is in the kofta. Meat. It is meat.',
    'Rashid sells you rugs on credit? Brave man. Or stupid. In Giza those are cousins.',
    "Abu Hamid's coffee house tells more stories than the newspaper and half as many lies. Do not quote me.",
    'The bean man across the lane says his ful is better. His ful is wet. I said nothing. I am saying it now.',
  ],
  road: [
    'Going on the road? Take parcels. Take water. Salted meat makes you thirsty; I say it every time and every time they come back dry.',
    'My parcels keep a week. Less in the summer. If it smells wrong, it is wrong; throw it away.',
    'Eat before you sell. A hungry seller gives discounts. A fed seller argues. I argue.',
    'In khamsin season wrap your face and your bread. Sand gets into both.',
  ],
  storeroomKnown: [
    'Yes, he lives in the back. No, he does not have a name. He has an appetite.',
    'He is not a pet. He is staff. Staff eat. Staff do not take orders, which makes him like every other staff.',
    'Nabil al-Khatib has not come back. The kebab price has not come down. Both good.',
    'Do not feed him. I feed him. If two people feed him, he expects it of everyone.',
  ],
  arthur: [
    'Arthur brings animals out from London for the zoo. Once he brought one more than the paperwork. Now it lives with me. Ha.',
    'Arthur eats here when a ship comes in. He pays. He is the only Englishman who pays without asking what is in it.',
    'Arthur says the zoo has a proper house for him. He also says the zoo has rules. My storeroom has kebab. You see the problem.',
  ],
  rugsWant: [
    'I need a rug for under the tables. Dark, thick, forgiving. I will come to your stall and look. Do not expect me to like anything.',
    'Show me ugly and strong and I will pay. Show me pretty and I will laugh.',
    'Grease, boots, tea. That is what the rug must survive. Also my customers. Mostly my customers.',
  ],
  rugsHave: [
    'Your rug is still alive. Grease, boots, stew. Still alive.',
    'If it lasts the winter, I want another by the door. Do not start counting the money.',
    'People sit longer since the rug. Longer is bad; they order tea and stay all afternoon. Hm. It is a good rug.',
  ],
};
/** One line for a context, never one of the last few he said, and a catchphrase only if he has not
 *  just used one. */
export function malekLine(ctx: LineCtx, said: string[], salt: number): string {
  const pool = MALEK_LINES[ctx];
  const recentCatch = said.slice(-3).some((l) => CATCH.test(l));
  // never the line he just said, and no catchphrase straight after one; then prefer lines not said lately
  const allowed = pool.filter((l) => l !== said[said.length - 1] && !(recentCatch && CATCH.test(l)));
  const fresh = allowed.filter((l) => !said.slice(-10).includes(l));
  const options = fresh.length ? fresh : allowed.length ? allowed : pool;
  return options[Math.abs(salt) % options.length];
}
/** a talk topic's line: rugs depends on whether he has bought one of yours */
export const topicCtx = (t: TalkTopic, m: MalekState | undefined): LineCtx =>
  t === 'rugs' ? (m?.rug ? 'rugsHave' : 'rugsWant') : t === 'storeroom' && m?.story.completed.includes(3) ? 'storeroomKnown' : t;
export const TOPIC_LABEL: Record<TalkTopic, string> = { shop: 'The shop', name: 'His name', storeroom: 'The storeroom', neighbours: 'The neighbours', road: 'The road', rugs: 'Rugs', arthur: 'Arthur Bell' };
/** the topics on offer: Arthur only once you have met him (story stage 5) */
export const topicsFor = (m: MalekState | undefined): TalkTopic[] => ['shop', 'name', 'storeroom', 'neighbours', 'road', 'rugs', ...(arthurIntroduced(m?.story) ? ['arthur' as const] : [])];

/** How he greets you, most pressing first: a first visit, how you look, news about the rug, being away, then the hour. */
export function malekGreeting(m: MalekState, o: { day: number; hour: number; fed: number; fatigue: number; salt: number }): { ctx: LineCtx; noted?: 'rug' | 'stall' } {
  if (!m.visits) return { ctx: 'greetFirst' };
  if (o.fed < 20) return { ctx: 'greetHungry' };
  if (o.fatigue >= 45) return { ctx: 'greetTired' };
  if (m.stallOutcome && !m.stallNoted) return m.stallOutcome === 'sold' && m.rug ? { ctx: 'greetRug', noted: 'stall' } : { ctx: 'greetNoSale', noted: 'stall' };
  if (m.lastVisitDay != null && o.day - m.lastVisitDay >= 5) return { ctx: 'greetAway' };
  if (m.rug && o.salt % 5 === 0) return { ctx: 'greetRug' };
  if (m.visits >= 5 && o.salt % 3 === 0) return { ctx: 'greetRegular' };
  return { ctx: o.hour < MORNING_END ? 'greetMorning' : o.hour >= 18 ? 'greetEvening' : 'greetMidday' };
}

// ---------------- his tab ----------------
/** plates on his account when he buys a rug from you */
export const TAB_PLATES = 3;
/** a tab plate is any eat-in dish except the lamb kebab (he is grateful, not that grateful) */
export const tabCovers = (item: MalekItem) => item.consumption === 'eat_in' && item.id !== 'malek_kebab';

// ---------------- the five-visit story ----------------
export interface MalekStory {
  /** the next stage to play, 1..5; 6 once all are done */
  nextStage: number;
  /** the game day the last stage was completed or skipped */
  lastStoryDay: number | null;
  completed: number[];
  /** a stage opened but not finished: offered again rather than skipped or advanced */
  pending?: number;
  /** the shop visit (malek.visits) the last stage was played on: one part of the story per visit */
  lastStoryVisit?: number;
}
export interface StoryStage { n: number; title: string; art: string | null; text: string[] }
/**
 * Stages 1-3 have no art yet, so the sequence is off: it must start at stage 1, and an image path
 * that does not exist is never put in a live build. When the art arrives, fill in `art` and the
 * stage plays. Stage 1 also waits until the player has met the buyer it involves.
 */
export const STORY: StoryStage[] = [
  { n: 1, title: 'The Expulsion', art: 'art/malek/story-1-expulsion.webp', text: [
    "Nabil al-Khatib has eaten two kebab plates, and now disputes the bill. The bread, he says, is yesterday's: he can tell by the crust, as he can tell a repair by its knots. So the bread is free, so the kebab is half price.",
    'Malek hears the whole argument out. Then he takes Nabil by the collar and the seat of his good trousers and walks him through the door. His hat follows a moment later.',
    '"Bread is never free. Come back when you have the money and a better argument."',
  ] },
  { n: 2, title: 'A Paid Grudge', art: 'art/malek/story-2-grudge.webp', text: [
    "Across the lane, in the shade by the steps, Nabil counts coins into the hands of three large men and points at Malek's door. A man who can defend every piastre he spends has decided this one is worth it.",
    'Inside, Malek goes on working mince at the bench. If he has noticed, he does not show it.',
    'The tallest of the three catches your eye and smiles, as if you might be next.',
  ] },
  { n: 3, title: 'The Back Room Opens', art: 'art/malek/story-3-backroom.webp', text: [
    'Nabil leads the three men in, shoulders first. Malek does not leave the grill.',
    'The storeroom curtain moves. An orangutan steps out, very large and in no hurry. A stool goes one way and a man goes the other. In a minute all four are back in the street, nobody hurt but their pride.',
    '"I said the storeroom was private."',
  ] },
  { n: 4, title: 'Staff Meal', art: 'art/malek/story-4-reward.webp', text: [
    'The shop is quiet again. Stools are back on their feet. The storeroom curtain moves.',
    'An orangutan sits on a stool by the grill as if it has always sat there. Malek wraps grilled meat in flatbread and hands it over without ceremony.',
    '"Ha. Do not look at me like that. He worked today. Everyone who works here eats."',
  ] },
  { n: 5, title: 'Arthur Bell, the Keeper', art: 'art/malek/story-5-arthur.webp', text: [
    'A sunburnt Englishman in a pith helmet comes in and shakes Malek\'s hand like an old friend. Behind them, the orangutan leans out of the storeroom doorway and watches him.',
    '"Arthur Bell," he says. "I bring animals out from London for the zoo here. Malek and I go back."',
    '"He brought one too many, once," Malek says. "Now what? Now he eats my kebab. Sit, Arthur. Bah. Both of you sit."',
  ] },
];
/** The customer thrown out in stages 1-3: Nabil al-Khatib (owner's decision). The quarrel is about the
 *  bill, never about who he is. Stage 1 waits until he has come to your stall. */
export const STORY_CUSTOMER = 'nabil';
/** The sequence plays only when every stage has its art: it cannot start at stage 4. */
export const storyReady = (stages: StoryStage[] = STORY) => stages.every((s) => !!s.art);

/** Which stage, if any, this visit should show. One a day at most, in order, one step at a time.
 *  `introduced`: you have been to the shop before, so the first visit is only ever the shop. */
export function storyStageFor(story: MalekStory, visit: number, o: { stages?: StoryStage[] } = {}): number | null {
  const stages = o.stages ?? STORY;
  if (!storyReady(stages)) return null;
  // a part you put off ("Not now") is the one you sit down to next
  if (story.pending != null) return story.pending;
  if (story.nextStage > stages.length) return null;
  // one part per visit: a part already played this visit waits for the next one
  if (story.lastStoryVisit != null && visit <= story.lastStoryVisit) return null;
  return story.nextStage;
}
/** Finish (or knowingly skip) a stage: completion, day, visit and next stage move together, exactly once. */
export function storyComplete(story: MalekStory, stage: number, day: number, visit?: number): MalekStory {
  if (stage !== story.nextStage || story.completed.includes(stage)) return { ...story, pending: undefined };
  return { nextStage: stage + 1, lastStoryDay: day, lastStoryVisit: visit, completed: [...story.completed, stage] };
}
export const arthurIntroduced = (story: MalekStory | undefined) => !!story?.completed.includes(5);

export { MALEK_MENU };

/** Malek at your stall: only once you have eaten at his place, every five days or so. */
export function malekDue(m: MalekState | undefined, day: number, roll: number) {
  if (!m || m.visits < 1) return false;
  // back for a rug he could not make up his mind about, two days or more later
  if (m.wantsBack && day - m.wantsBack.day >= 2) return roll < 0.8;
  if (m.stallLastDay != null && day - m.stallLastDay < 5) return false;
  // keener while his floor is still bare
  return roll < (m.rug ? 0.35 : 0.55);
}
