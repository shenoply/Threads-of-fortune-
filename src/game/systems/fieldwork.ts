// Arran's field work beyond the rug bench (docs/handoff/ARRAN_BOOK_ROUTES_FOR_CLAUDE.md,
// docs/handoff/ARRAN_LAB_VISITS_FOR_CLAUDE.md): fatigue and the road diet, the Sinai pass, cargo of
// every class with its paperwork, patrols that inspect it, and a stimulant with a price.
//
// Editorial rules kept here on purpose: explosives, poisons and controlled drugs are abstract cargo
// with provenance, paperwork and consequences only. No ingredients, quantities, preparation, use or
// dosing appear anywhere in the game. An opioid is never a boost. Every roll is made once from a seed
// and stored, so reloading never rerolls an outcome.

// ---------------- the traveller's condition ----------------
export interface Condition1925 {
  /** 0 rested .. 100 exhausted */
  fatigue: number;
  /** a stimulant taken today: alert now, a crash tomorrow */
  alertDay?: number;
  crashDay?: number;
  /** repeated use within a week builds dependence; it fades with time */
  dependence: number;
  lastTonicDay?: number;
  /** the road diet Arran recommends, in effect until this day */
  dietUntil?: number;
}
export const CONDITION_START: Condition1925 = { fatigue: 10, dependence: 0 };

/** how tired the merchant is shows at the stall: shorter patience, less trust, as numbers the haggle uses */
export function fatigueEffect(c: Condition1925 | undefined, day: number) {
  const f = c?.fatigue ?? 0;
  const crash = c?.crashDay === day;
  const alert = c?.alertDay === day;
  const dep = (c?.dependence ?? 0) >= 3;
  return {
    patience: alert ? 6 : -Math.round(f / 5) - (crash ? 8 : 0) - (dep ? 6 : 0),
    trust: alert ? 0 : -Math.round(f / 12) - (crash || dep ? 4 : 0),
    label: alert ? 'Alert (the tonic)' : crash ? 'Crashing after the tonic' : f >= 70 ? 'Exhausted' : f >= 45 ? 'Tired' : f >= 20 ? 'A little tired' : 'Rested',
  };
}

/** One day passes: rest in a town, march on the road. Food and the road diet act slowly. */
export function dayCondition(c: Condition1925 | undefined, o: { day: number; onRoad: boolean; hungry: boolean }): Condition1925 {
  const s = { ...(c ?? CONDITION_START) };
  const diet = (s.dietUntil ?? 0) >= o.day;
  if (o.onRoad) s.fatigue += 12 - (diet ? 4 : 0);
  else s.fatigue -= 22 + (diet ? 6 : 0);
  if (o.hungry) s.fatigue += 15;
  if (s.crashDay === o.day) s.fatigue += 40;
  if (s.lastTonicDay != null && o.day - s.lastTonicDay > 10) s.dependence = Math.max(0, s.dependence - 1);
  s.fatigue = Math.max(0, Math.min(100, Math.round(s.fatigue)));
  return s;
}

// ---------------- a stimulant tonic, and why it is not free ----------------
export const TONIC = {
  name: 'Coca wine',
  price: 75,
  blurb: 'A French tonic wine with coca leaf, sold by chemists as a pick-me-up. The chemist sells it over the counter; nobody in the Muski is sure what the new drugs law of March makes of it.',
  effect: 'Takes the fatigue away for the rest of today. Tomorrow you crash, worse than before. Used often, it gets a hold on you.',
};
export function takeTonic(c: Condition1925 | undefined, day: number): Condition1925 {
  const s = { ...(c ?? CONDITION_START) };
  const recent = s.lastTonicDay != null && day - s.lastTonicDay <= 7;
  return { ...s, alertDay: day, crashDay: day + 1, lastTonicDay: day, dependence: s.dependence + (recent ? 1 : 0) + (s.dependence === 0 ? 1 : 0), fatigue: s.fatigue };
}

// ---------------- provisions: what Arran tells you ----------------
export interface ProvisionReport { days: number; perDay: number; fatigue: number; lines: string[]; routes: { to: string; days: number; ok: boolean }[] }
export function provisionReport(o: { food: number; perDay: number; fatigue: number; hungryDays: number; dietActive: boolean; routes: { to: string; days: number }[] }): ProvisionReport {
  const days = o.perDay > 0 ? Math.floor(o.food / o.perDay) : 0;
  const lines = [
    `Your stores cover ${days} day${days === 1 ? '' : 's'} on the road at ${o.perDay} ration${o.perDay === 1 ? '' : 's'} a day for the whole party and the animals.`,
    days < 3 ? 'That is not enough for any real journey. Buy bread, dates and lentils before you leave.' : days < 8 ? 'Enough for a short road. Not for Sinai or Syria.' : 'Enough for a long road, if nothing goes wrong.',
    o.hungryDays > 0 ? `Your party has gone ${o.hungryDays} day${o.hungryDays === 1 ? '' : 's'} hungry. Weakness comes slowly and goes slowly.` : '',
    o.fatigue >= 45 ? 'You are tired. A day or two of rest in a town does more than anything I can sell you.' : '',
    o.dietActive ? 'The road diet is doing its work: tiredness builds more slowly and mends faster.' : 'Add lentils, onions and dried milk to the bread and dates: it will not show today, but in a week your men will march better and rest better.',
  ].filter(Boolean);
  return { days, perDay: o.perDay, fatigue: o.fatigue, lines, routes: o.routes.map((r) => ({ ...r, ok: days >= Math.ceil(r.days) })) };
}
export const DIET = { price: 150, days: 30, label: 'The road diet for a month (lentils, onions, dried milk)' };

// ---------------- the Sinai pass ----------------
export type PassChoice = 'escort' | 'guide' | 'long_road' | 'proceed' | 'blast';
export const PASS_CHOICES: Record<PassChoice, { label: string; sub: string; extraDays: number; cost: number; mitigation: number }> = {
  escort: { label: 'Wait for an escort', sub: 'A Tarabin party is going through in two days', extraDays: 2, cost: 0, mitigation: 26 },
  guide: { label: 'Hire a Bedouin guide', sub: 'He knows the wells and the people', extraDays: 0, cost: 300, mitigation: 12 },
  long_road: { label: 'Take the longer road by the wadis', sub: 'Slower, lower, easier going', extraDays: 3, cost: 0, mitigation: 20 },
  proceed: { label: 'Press on through the pass', sub: 'Fastest; you take the risk', extraDays: 0, cost: 0, mitigation: 0 },
  blast: { label: 'Clear the old short road', sub: 'Your licensed shot-firer clears the 1911 rockfall; nobody else goes near it', extraDays: 0, cost: 0, mitigation: 30 },
};
export type CargoClass = 'ordinary' | 'duty_goods' | 'medical_controlled' | 'restricted_material';
export interface RouteContext { danger: number; weather: number; fatigue: number; guards: number; cargo: CargoClass[] }
/** Relative risk 0..100 (not a probability): the pass, the season, how tired you are, your guards, your cargo. */
export function routeExposure(c: RouteContext, choice: PassChoice) {
  const cargoRisk = c.cargo.includes('restricted_material') ? 12 : c.cargo.includes('medical_controlled') ? 6 : 0;
  const guide = choice === 'guide' ? 6 : 0;
  return Math.max(0, Math.min(100, Math.round(c.danger + c.weather + Math.floor(c.fatigue / 5) + cargoRisk - c.guards * 5 - guide - PASS_CHOICES[choice].mitigation)));
}
/** how dangerous the Sinai passes are before season, fatigue, guards and cargo */
export const PASS_DANGER = 40;
export const riskWord = (r: number) => (r >= 55 ? 'High' : r >= 35 ? 'Real' : r >= 18 ? 'Some' : 'Low');
/** the season in the passes: summer heat and spring khamsin make the road harder */
export function passWeather(month: number) {
  return month >= 5 && month <= 8 ? { add: 12, text: 'Summer heat in the passes: water is everything.' } : month === 2 || month === 3 ? { add: 8, text: 'Khamsin season: sandstorms from the south.' } : month >= 11 || month <= 1 ? { add: 6, text: 'Cold nights in the mountains.' } : { add: 0, text: 'Fair weather in the passes.' };
}
export interface PassOutcome { kind: 'quiet' | 'hard' | 'raiders_driven_off' | 'raiders_robbed'; text: string; fatigue: number; foodLost: number; cashLost: number; cargoLost: boolean; extraDays: number }
/** Resolve the crossing once from a stored roll in [0,1): never at render time. */
export function resolvePass(risk: number, roll: number, strength: number, cash: number, food: number): PassOutcome {
  const p = risk / 100;
  if (roll >= p) return { kind: roll < p + 0.25 ? 'hard' : 'quiet', text: roll < p + 0.25 ? 'A hard crossing: loose rock, a lame camel, a cold night without a fire. You come through.' : 'The pass is quiet. You see riders on a ridge once, far off, and they do not come down.', fatigue: roll < p + 0.25 ? 18 : 10, foodLost: roll < p + 0.25 ? 2 : 0, cashLost: 0, cargoLost: false, extraDays: 0 };
  // raiders: your strength against theirs
  const theirs = 4 + Math.round(risk / 10);
  if (strength >= theirs) return { kind: 'raiders_driven_off', text: `Raiders come down at the narrows, about ${theirs} strong. Your men hold, and they ride off. Nobody is badly hurt.`, fatigue: 22, foodLost: 1, cashLost: 0, cargoLost: false, extraDays: 0 };
  return { kind: 'raiders_robbed', text: `Raiders come down at the narrows, about ${theirs} strong, more than you can hold. They take a share of your money and whatever cargo they can carry, and leave you your camels.`, fatigue: 28, foodLost: Math.min(food, 3), cashLost: Math.round(cash * 0.2), cargoLost: true, extraDays: 1 };
}

// ---------------- cargo and the law of 1925 ----------------
export interface CargoJob {
  id: string; label: string; kind: 'powder' | 'poison' | 'cocaine' | 'opium' | 'spirits' | 'lamp_oil';
  cls: CargoClass; from: string; to: string; fee: number; licenceFee: number;
  who: string; blurb: string; hazard: string; specialist: string;
}
export const CARGO_JOBS: CargoJob[] = [
  { id: 'lamp_oil', label: 'Lamp oil for the monastery', kind: 'lamp_oil', cls: 'ordinary', from: 'giza', to: 'sinai', fee: 360, licenceFee: 0, who: 'Brother Anastasios, by letter', blurb: 'Four tins of paraffin for the monastery lamps.', hazard: 'Flammable. Keep it away from the cooking fire and upright on the camel.', specialist: 'None needed.' },
  { id: 'arak', label: 'Arak for a Jaffa hotel', kind: 'spirits', cls: 'duty_goods', from: 'cairo', to: 'jaffa', fee: 540, licenceFee: 90, who: 'A hotel steward in Jaffa', blurb: 'Two cases of arak. Legal to carry; the customs want their duty.', hazard: 'None beyond breakage. The duty stamp is what matters.', specialist: 'A customs agent stamps the duty.' },
  { id: 'powder', label: 'Blasting powder for the Sinai road works', kind: 'powder', cls: 'restricted_material', from: 'suez', to: 'sinai', fee: 1200, licenceFee: 180, who: 'A road engineer at Suez', blurb: 'Sealed cases of quarrying powder for the monastery road. The works has a permit; the carrier needs one too.', hazard: 'Explosive. Sealed cases, kept apart from fire and from the lamp oil, never opened on the road.', specialist: 'A licensed shot-firer receives it; nobody else handles it.' },
  { id: 'sheep_dip', label: 'Sheep-dip for the Tarabin camp', kind: 'poison', cls: 'restricted_material', from: 'giza', to: 'bedouin', fee: 450, licenceFee: 60, who: 'The Tarabin sheikh\'s son', blurb: 'An arsenical sheep-dip from a registered dealer, for the flocks.', hazard: 'Poison. Sealed and labelled, never near food or water skins.', specialist: 'A registered dealer\'s label and signed poisons book go with it.' },
  { id: 'cocaine', label: 'A chemist\'s order to Jaffa', kind: 'cocaine', cls: 'medical_controlled', from: 'portsaid', to: 'jaffa', fee: 2100, licenceFee: 240, who: 'A Port Said wholesale chemist', blurb: 'A sealed box of cocaine hydrochloride for a pharmacy in Jaffa. With the chemist\'s authority it is medicine; without it, it is contraband.', hazard: 'A controlled drug. Sealed, counted, and never opened.', specialist: 'A pharmacist signs for it at each end.' },
  { id: 'laudanum', label: 'Laudanum for a hotel physician', kind: 'opium', cls: 'medical_controlled', from: 'cairo', to: 'alexandria', fee: 900, licenceFee: 120, who: 'A physician at an Alexandria hotel', blurb: 'A case of tincture of opium for a doctor\'s surgery.', hazard: 'A controlled opiate preparation. It is not a pick-me-up; it is a sedative and a poison in the wrong hands.', specialist: 'The physician signs for it.' },
];
export interface CargoItem { id: string; jobId: string; label: string; cls: CargoClass; to: string; paperwork: 'none' | 'receipt' | 'licence'; fee: number; takenDay: number }

/** Egypt's decree-law on narcotics is dated 21 March 1925 (game day 12). Earlier, the game does not claim a rule. */
export const EGYPT_NARCOTICS_FROM_DAY = 12;
export type LegalStatus = 'ordinary' | 'documented' | 'restricted' | 'unverified';
/** Where a town sits, for the purposes of the cargo law (provisional; see LEGAL_NOTES) */
export const JURISDICTION: Record<string, string> = { giza: 'egypt', cairo: 'egypt', alexandria: 'egypt', portsaid: 'egypt', suez: 'egypt', tanta: 'egypt', fayoum: 'egypt', saqqara: 'egypt', sinai: 'egypt', bedouin: 'egypt', jaffa: 'palestine', jerusalem: 'palestine' };
export function classify(item: CargoItem, place: string, day: number): LegalStatus {
  if (item.cls === 'ordinary') return 'ordinary';
  if (item.cls === 'duty_goods') return item.paperwork === 'licence' ? 'documented' : 'restricted';
  if (item.paperwork === 'licence') return 'documented';
  if (item.cls === 'medical_controlled' && JURISDICTION[place] === 'egypt' && day < EGYPT_NARCOTICS_FROM_DAY) return 'unverified';
  // Palestine: the same authority is asked for (provisional; see docs/handoff/ARRAN_EXPANSION_STATUS.md)
  return 'restricted';
}
export interface PatrolOutcome { kind: 'clear' | 'question' | 'seize' | 'detain'; note: string; reason?: string; fix?: string }
/** What paper each class of cargo needs, in the patrol's own words. */
export const PAPER_FOR: Record<CargoClass, string> = {
  ordinary: 'a receipt',
  duty_goods: 'the customs duty stamp',
  restricted_material: 'the permit and the name of the licensed man who receives it',
  medical_controlled: 'a chemist\'s or doctor\'s signed authority',
};
/** A patrol at a port or checkpoint: roll supplied from the stored seed, in [0,1). Says why, and what paper would have changed it. */
export function resolvePatrol(status: LegalStatus, attention: number, roll: number, cls: CargoClass = 'restricted_material'): PatrolOutcome {
  const paper = PAPER_FOR[cls];
  if (status === 'ordinary') return { kind: 'clear', note: 'The patrol looks over your load and waves you on.', reason: 'Ordinary goods with a receipt.' };
  if (status === 'unverified') return { kind: 'question', note: 'The patrol opens the ledger, writes down what you carry and where it came from, and lets you go.', reason: 'Controlled medicine, but the new drugs law is not yet in force here, so they only record it.', fix: `From 21 March, carry ${paper}.` };
  if (status === 'documented') return { kind: 'question', note: 'The papers are examined, stamped and handed back. You lose an hour.', reason: `Your papers are in order: ${paper}.` };
  const threshold = Math.min(0.8, 0.18 + Math.max(0, Math.min(100, attention)) * 0.004);
  const reason = `No papers for ${cls === 'duty_goods' ? 'dutiable goods' : cls === 'medical_controlled' ? 'controlled medicine' : 'restricted goods'}${attention >= 30 ? ', and they already know your name' : ''}.`;
  const fix = `${paper[0].toUpperCase()}${paper.slice(1)} would have cleared it.`;
  if (roll >= threshold) return { kind: 'question', note: 'The patrol notes the cases and your name, and lets you go. They will remember.', reason, fix };
  return roll < threshold * 0.25
    ? { kind: 'detain', note: 'The patrol holds you overnight for inquiry. The cargo is confiscated and you are fined.', reason, fix }
    : { kind: 'seize', note: 'The cargo is confiscated. It will not come back.', reason, fix };
}
/** How closely patrols watch you, in words */
export const attentionWord = (a: number) => (a >= 60 ? 'They know your name at every post' : a >= 30 ? 'Your name is in their books' : a >= 10 ? 'You have been noticed' : 'Nobody is watching you');

/** What a player needs to know about cargo and the law, in 1925's terms. */
export const PATROL_GUIDE: { title: string; text: string }[] = [
  { title: 'What Arran can examine', text: 'The labels, seals, packing and papers of a crate. He tells you what it is, how it must travel and who must receive it. He never opens a sealed case.' },
  { title: 'What a patrol will ask for', text: 'Spirits: the duty stamp. Blasting powder and fireworks: the permit and the licensed man\'s name. Poisons such as sheep-dip: a registered dealer\'s label. Cocaine, opium and laudanum: a chemist\'s or doctor\'s authority. In Egypt the new drugs law of 21 March 1925 makes that last one strict.' },
  { title: 'With papers', text: 'They are read, stamped and handed back. You lose an hour.' },
  { title: 'Without papers', text: 'Sometimes they take your name and let you go, and watch you more closely afterwards. Sometimes they confiscate the cargo, and you lose standing. At worst they hold you overnight and fine you. The more they already know your name, the worse your odds.' },
];
/** towns where a patrol or customs post checks what comes in */
/** a label in the middle of a sentence: lower-case the first letter only, keeping place names */
export const midSentence = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);
export const CHECKPOINTS = ['alexandria', 'portsaid', 'suez', 'jaffa', 'sinai'];

/** seeded roll in [0,1) from a key: the same trip always gives the same answer */
export function rollFor(key: string, seed: number) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

export const LEGAL_NOTES: { title: string; text: string; status: 'verified date' | 'provisional' | 'context' }[] = [
  { title: 'Egypt, narcotics (21 March 1925)', status: 'verified date', text: 'A decree-law on the trade and use of narcotics is dated 21 March 1925 (game day 12). The game treats cocaine, opium and their preparations as needing a pharmacist\'s or physician\'s authority from that day. The exact schedules and penalties have not been checked against the full decree; no specific offence or sentence is stated in the game.' },
  { title: 'Before 21 March 1925', status: 'provisional', text: 'The game does not claim the earlier days were unregulated: customs, local authority and other rules could still apply. A patrol before that date only questions and records.' },
  { title: 'Britain, Dangerous Drugs Act 1920', status: 'context', text: 'Already named cocaine and morphine, among others. Arran is English and knows it; it is why he refuses to handle them.' },
  { title: 'Explosives and poisons', status: 'provisional', text: 'The game expects a works permit and a named handler for blasting powder, and a registered dealer\'s label for arsenical sheep-dip. The specific 1925 regulations have not been checked; the game states no penalty.' },
  { title: 'Spirits', status: 'context', text: 'Arak and other spirits were legal to carry and sell; customs duty was what mattered. The game asks for a duty stamp.' },
  { title: 'Palestine (Jaffa, Jerusalem)', status: 'provisional', text: 'Under the British Mandate. The game asks for the same authority for drugs and does not state a local rule it has not verified.' },
];
export const LEGAL_SOURCES = [
  'Egyptian Court of Cassation, heritage entry for the decree-law of 21 March 1925: https://cc.gov.eg/heritage/documents/3659',
  'U.S. Office of the Historian, FRUS 1928 vol. II, document 745 (confirms the Egyptian law of 21 March 1925): https://history.state.gov/historicaldocuments/frus1928v02/d745',
  'UK Dangerous Drugs Act 1920: https://www.legislation.gov.uk/ukpga/Geo5/10-11/46/pdfs/ukpga_19200046_en.pdf',
];
