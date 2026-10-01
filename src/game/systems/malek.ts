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
export type LineCtx = 'greetFirst' | 'greet' | 'menu' | 'kofta' | 'grill' | 'cheap' | 'parcel' | 'tea' | 'soldOut' | 'closing' | 'grillCold' | 'full' | 'broke' | 'talk' | 'rugs' | 'bye';
const CATCH = /^(Ha\b|Bah\b|Now what\?)/;
export const MALEK_LINES: Record<LineCtx, string[]> = {
  greetFirst: [
    'Sit anywhere. The stools are all equally bad.',
    'You are new. Everyone is new once. Then they complain.',
  ],
  greet: [
    'Now what?',
    'You again. The food has not changed. Neither have I.',
    'Sit. If the stool wobbles, that is the stool.',
    'Bah. Another customer. Good. Sit down.',
    'Back for more. I knew it. Nobody listens to me, but they come back.',
  ],
  menu: [
    'It is all on the board. Read it slowly; it does not get cheaper if you read it fast.',
    'Kofta, kebab, liver. The pot is whatever the pot is today.',
    'Ha. You want to see the menu. It is four things and some bread.',
  ],
  kofta: [
    'You want it cheaper? I can put the meat back on the sheep.',
    'Kofta. Mince, onion, fire. Nothing clever. Clever food is for hotels.',
  ],
  grill: [
    'Straight off the charcoal. Burn your mouth if you like; I do not give refunds for patience.',
    'Eat it hot. Cold kebab is just an argument.',
  ],
  cheap: [
    'Beans. The cheapest thing in Giza that is not advice.',
    'Soup. It fills you up and it does not argue.',
  ],
  parcel: [
    'It lasts longer than my patience. Take water.',
    'Salted beef. You will want water before Suez. You will want water before the end of the street.',
    'Wrapped twice. If it goes off, that is the road, not me.',
  ],
  tea: [
    'Tea. One glass. Two glasses and you will start talking to me.',
    'Sugar is extra. No, it is not. Bah. Drink it.',
  ],
  soldOut: [
    'Ha. The sheep has finished its shift.',
    'Gone. Come earlier. Everyone who comes late says they will come earlier.',
  ],
  closing: [
    'Coins again. Funny how they never breed overnight.',
    'The grill is cold. I can sell you a parcel. I cannot sell you a fire.',
  ],
  grillCold: [
    'The fire is out. Fire does not come back because you are hungry.',
  ],
  full: [
    'You are full. I can see it from here. Eat it anyway; I already cooked it.',
  ],
  broke: [
    'You have the money or you have the story. I take the money.',
    'Bah. Come back when your purse agrees with your stomach.',
  ],
  talk: [
    'Business is fine. Business is always fine until it is not.',
    'I work alone. Partners eat the profits and then they eat the kofta.',
    'My supplier in Cairo says the bastirma is the best this year. He says that every year.',
    'The tourists ask if it is authentic. I tell them it is lunch.',
  ],
  rugs: [
    'You sell rugs. I might need one. A dark one. Grease does not argue with a dark rug.',
    'I will come by your stall. Do not expect me to like anything.',
  ],
  bye: [
    'Go. Come back hungry.',
    'Mind the step. Everyone trips on the step. I will not fix it.',
  ],
};
/** One line for a context, never one of the last few he said, and a catchphrase only if he has not
 *  just used one. */
export function malekLine(ctx: LineCtx, said: string[], salt: number): string {
  const pool = MALEK_LINES[ctx];
  const recentCatch = said.slice(-3).some((l) => CATCH.test(l));
  // never the line he just said, and no catchphrase straight after one; then prefer lines not said lately
  const allowed = pool.filter((l) => l !== said[said.length - 1] && !(recentCatch && CATCH.test(l)));
  const fresh = allowed.filter((l) => !said.slice(-6).includes(l));
  const options = fresh.length ? fresh : allowed.length ? allowed : pool;
  return options[Math.abs(salt) % options.length];
}

// ---------------- the five-visit story ----------------
export interface MalekStory {
  /** the next stage to play, 1..5; 6 once all are done */
  nextStage: number;
  /** the game day the last stage was completed or skipped */
  lastStoryDay: number | null;
  completed: number[];
  /** a stage opened but not finished: offered again rather than skipped or advanced */
  pending?: number;
}
export interface StoryStage { n: number; title: string; art: string | null; text: string[] }
/**
 * Stages 1-3 have no art yet, so the sequence is off: it must start at stage 1, and an image path
 * that does not exist is never put in a live build. When the art arrives, fill in `art` and the
 * stage plays. Stage 1 also waits until the player has met the buyer it involves.
 */
export const STORY: StoryStage[] = [
  { n: 1, title: 'The Expulsion', art: null, text: ['ART PENDING: the buyer quarrels over a bill and Malek bundles him out of the door, slapstick, nothing graphic. The quarrel is about the bill, never about who he is.'] },
  { n: 2, title: 'A Paid Grudge', art: null, text: ['ART PENDING: in an alley nearby, the same buyer pays three men. You can see Malek\'s shop beyond them.'] },
  { n: 3, title: 'The Back Room Opens', art: null, text: ['ART PENDING: the three men come in; something large comes out of the storeroom and they go out faster than they came. Nobody is hurt beyond their pride. Malek does not get up.'] },
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
/** the buyer the first stage involves; he must have come to your stall at least once (to confirm with the owner) */
export const STORY_BUYER = 'nabil';
/** The sequence plays only when every stage has its art: it cannot start at stage 4. */
export const storyReady = (stages: StoryStage[] = STORY) => stages.every((s) => !!s.art);

/** Which stage, if any, this visit should show. One a day at most, in order, one step at a time. */
export function storyStageFor(story: MalekStory, day: number, o: { buyerMet: boolean; stages?: StoryStage[] }): number | null {
  const stages = o.stages ?? STORY;
  if (!storyReady(stages)) return null;
  if (story.pending != null) return story.pending;
  if (story.nextStage > stages.length) return null;
  if (story.lastStoryDay != null && day <= story.lastStoryDay) return null;
  if (story.nextStage === 1 && !o.buyerMet) return null;
  return story.nextStage;
}
/** Finish (or knowingly skip) a stage: completion, day and next stage move together, exactly once. */
export function storyComplete(story: MalekStory, stage: number, day: number): MalekStory {
  if (stage !== story.nextStage || story.completed.includes(stage)) return { ...story, pending: undefined };
  return { nextStage: stage + 1, lastStoryDay: day, completed: [...story.completed, stage] };
}
export const arthurIntroduced = (story: MalekStory | undefined) => !!story?.completed.includes(5);

export { MALEK_MENU };

/** Malek at your stall: only once you have eaten at his place, every five days or so. */
export function malekDue(m: MalekState | undefined, day: number, roll: number) {
  if (!m || m.visits < 1) return false;
  if (m.stallLastDay != null && day - m.stallLastDay < 5) return false;
  return roll < 0.45;
}
