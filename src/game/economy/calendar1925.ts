// The seasons of 1925–26 as a rug merchant felt them: the khamsin, the winter visitors, cotton money,
// the feasts of both faiths, the Nile flood, quarantine at the ports and the shutters of Cairo.
// Pure data and small pure helpers. life.ts adds these events to its calendar; nothing here imports it.
import type { Trait } from '../types';
import type { GameEvent, LaneDay } from './life';
import { RUGS } from '../../data/rugs';

/** stall callers whose visits a season makes likelier or rarer */
export type CallerGroup = 'foreign' | 'coptic' | 'cotton' | 'pious';
export const CALLERS: Record<CallerGroup, string[]> = {
  foreign: ['hollister', 'yusuf', 'levy', 'martel'], // the winter visitors and the hotels and shops that serve them
  coptic: ['antonios', 'wasif'],
  cotton: ['benakis', 'samira'],
  pious: ['salem', 'hassan', 'mariam'],
};
/** prayer rugs in stock: what a feast sends people looking for */
export const PRAYER_RUGS = ['konya-prayer-rug', 'jerusalem-stone'];

/** What a season or feast does beyond the town prices life.ts already knows. All optional. */
export interface SeasonFx {
  /** more or fewer buyers at the Giza stall today */
  footfall?: number;
  /** buyers' patience at the stall, as a multiplier */
  patience?: number;
  /** a line for the morning note about the lane */
  laneNote?: string;
  /** some kinds of buyer come more or less often */
  callers?: Partial<Record<CallerGroup, number>>;
  /** stall buyers pay more for these rugs */
  want?: { typeIds?: string[]; traits?: Trait[]; mult: number; label: string };
  /** a khamsin: the towns the sand blows over (rugs left out get dusty; walking is slow there) */
  dust?: string[];
  /** the Nile in flood: the ferry is slower and the Delta roads are under water */
  flood?: boolean;
  /** quarantine: extra days on any sailing from or to these ports */
  sea?: Record<string, number>;
  /** a fasting month: buyers by day tire sooner */
  fast?: boolean;
  /** told the evening before as well, so a merchant can plan the day */
  eve?: boolean;
  /** calendar mark */
  icon?: string;
  /** weather and accidents: not on the calendar until the day comes */
  unforeseen?: boolean;
  /** frontiers made strict (countries, as currency.ts names them): more loads searched, fewer presents taken */
  frontier?: string[];
}

const d = (m: number, dd: number, y = 1925) => Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(1925, 2, 9)) / 86400000);
const hh = (n: number) => Math.abs(Math.sin(n * 91.345 + 7.123) * 24634.6345) % 1;

const PRAYER = { typeIds: PRAYER_RUGS, mult: 1.2, label: 'prayer rugs' };
const SHOWY: Trait[] = ['ornate', 'bold'];

// ---------- Khamsin: hot sand-laden wind off the desert, spells of one to three days, March to May ----------
const KHAMSIN_TEXT = [
  'A hot wind off the Western Desert has filled the air with sand. The visitors keep to their hotels and the lane is half empty.',
  'The khamsin is blowing. The sky has gone yellow, the sun is a pale disc, and everyone who can stays indoors.',
  'Sand on the wind since dawn. The dragomen have sent the camels home and the shopkeepers are covering their goods.',
];
// Coptic Easter, Sham el-Nessim and Eid al-Fitr in both springs
const FEAST_DAYS = [d(4, 19), d(4, 20), d(4, 24), d(4, 25), d(4, 26), d(4, 27), d(4, 14, 1926), d(4, 15, 1926), d(4, 16, 1926), d(5, 2, 1926), d(5, 3, 1926)];
function khamsins(): GameEvent[] {
  const out: GameEvent[] = [];
  for (const [y, from, to] of [[1925, d(3, 14), d(5, 25)], [1926, d(3, 8, 1926), d(5, 25, 1926)]] as const) {
    let at = from + Math.floor(hh(y) * 8);
    for (let i = 0; at < to; i++) {
      const len = 1 + Math.floor(hh(at * 1.7 + y) * 3);
      // kept off the feast days, so a feast's card is not lost under the weather
      if (FEAST_DAYS.some((f) => f >= at && f < at + len)) { at++; i--; continue; }
      out.push({
        id: `khamsin-${at}`, name: 'Khamsin', from: at, to: at + len - 1, icon: '≋', unforeseen: true,
        text: KHAMSIN_TEXT[i % KHAMSIN_TEXT.length],
        budget: 0.92, footfall: -1, patience: 0.85, dust: ['giza', 'cairo', 'saqqara', 'fayoum'],
        laneNote: 'Khamsin. Sand in the air; few people out.',
      });
      at += len + 10 + Math.floor(hh(at * 3.1 + y) * 12);
    }
  }
  return out;
}

// ---------- Persia, 1925–26: Reza Khan's rise and the change of dynasty ----------
// Reza Khan, Minister of War since 1921 and Prime Minister since October 1923, was given command of all
// the armed forces by the Majlis in February 1925, with Ahmad Shah away in Europe; the Majlis passed his
// conscription law in June 1925. The Majlis deposed the
// Qajar dynasty on 31 October 1925; the Constituent Assembly gave Reza Khan the throne on 12 December, and
// he took the oath as Shah on the 15th (the dates the paper prints, data/world/1925-10_12.json). He was
// crowned in the Golestan Palace on 25 April 1926. The trade effects are the game's: the frontier posts
// strict and Persian dealers holding back while the change is made, then the bazaars selling again.
const PERSIAN_CITIES = ['kermanshah', 'hamadan', 'tehran', 'tabriz', 'kashan', 'isfahan', 'kerman'];
const allPersia = (m: number) => Object.fromEntries(PERSIAN_CITIES.map((c) => [c, m]));
const PERSIA_EVENTS: GameEvent[] = [
  { id: 'reza-khan-25', name: 'Reza Khan\'s army law', from: d(6, 8), to: d(6, 30), icon: '⚐', text: 'In Persia the Majlis has passed Reza Khan\'s law of military service: young men are to serve two years in the new army. Reza Khan, Prime Minister and since February commander of all the armed forces, holds the country while Ahmad Shah stays in Europe. His troops patrol the Kermanshah road and are disarming the tribes.' },
  { id: 'qajar-deposed-25', name: 'The Majlis deposes the Qajars', from: d(10, 31), to: d(12, 11), icon: '⚐', text: 'The Persian Majlis has deposed the absent Ahmad Shah and ended the Qajar dynasty. Reza Khan heads a provisional government until a Constituent Assembly meets. The frontier posts at Qasr-i Shirin and Khanaqin are searching every load, and Persian dealers are holding back their stock until they see what comes.', frontier: ['persia'], cityBuy: allPersia(1.12), cityBid: { baghdad: 1.06 } },
  { id: 'reza-shah-25', name: 'Reza Khan proclaimed Shah', from: d(12, 12), to: d(1, 10, 1926), icon: '♛', text: 'The Persian Constituent Assembly has given the throne to Reza Khan, the first of a new dynasty, Pahlavi; he took the oath on the 15th. The frontier is still strict while the new reign begins, but the bazaars of Tehran and Isfahan are open.', frontier: ['persia'], cityBuy: allPersia(1.05) },
  { id: 'persia-settles-26', name: 'Trade settles in Persia', from: d(1, 11, 1926), to: d(4, 24, 1926), icon: '↓', text: 'With the new Shah on the throne the carpet caravans are moving again on the Kermanshah road. The Persian bazaars are selling, and Tabriz and Kashan carpets are coming west in numbers.', cityBuy: allPersia(0.92), cityBid: { baghdad: 0.97 } },
  { id: 'coronation-26', name: 'Reza Shah crowned', from: d(4, 25, 1926), to: d(4, 30, 1926), icon: '♛', text: 'Reza Shah has been crowned in the Golestan Palace in Tehran. Officials and merchants are dressing their houses for the receptions.', cityBid: { tehran: 1.12 }, demand: [{ sid: 'tehran', traits: ['fineWeave', 'silk', 'ornate'], mult: 1.1 }] },
];

/** Snow on the Persian passes, from December to the middle of March: the caravan crawls over them. */
export const snowOn = (day: number) => {
  const dt = new Date(Date.UTC(1925, 2, 9 + day));
  const m = dt.getUTCMonth() + 1, dd = dt.getUTCDate();
  return m === 12 || m === 1 || m === 2 || (m === 3 && dd <= 15);
};

// ---------- The rest of the year ----------
const FIXED: GameEvent[] = [
  // the tail of the 1924–25 winter season (under way when the game opens, so no morning card)
  { id: 'season-end-25', name: 'The last of the winter season', from: 0, to: d(3, 31), text: 'The last tourist steamers of the winter are on the river. The hotels still want showy pieces for their visitors.', callers: { foreign: 1.25 }, demand: [{ sid: 'cairo', traits: SHOWY, mult: 1.12 }, { sid: 'alexandria', traits: SHOWY, mult: 1.1 }] },
  // Coptic (Julian) Easter 1925 fell on 19 April Gregorian; Sham el-Nessim is the Monday after
  { id: 'copt-easter-25', name: 'Coptic Easter', from: d(4, 19), to: d(4, 19), eve: true, icon: '†', text: 'The Copts break the long Lenten fast. Houses in Shubra and Old Cairo are made ready for guests.', budget: 1.04, callers: { coptic: 1.5 } },
  { id: 'sham-25', name: 'Sham el-Nessim', from: d(4, 20), to: d(4, 20), eve: true, icon: '☘', text: 'The spring holiday. Families spend the day in the gardens and on the river with salted fish, onions and coloured eggs. With Ramadan on, many Muslims keep it quietly this year.', budget: 0.92, footfall: -2, laneNote: 'Sham el-Nessim. Half of Cairo is out picnicking; the lane is nearly empty.' },
  { id: 'hijri-25', name: 'Islamic New Year', from: d(7, 22), to: d(7, 22), eve: true, icon: '☾', text: 'The first of Muharram, 1344. Government offices are shut and families visit one another.', budget: 1.04, callers: { pious: 1.2 } },
  { id: 'quarantine-25', unforeseen: true, name: 'Quarantine at Port Said', from: d(8, 10), to: d(8, 19), icon: '⚑', text: 'A steamer from Bombay has come into Suez with cholera aboard, and her passengers are landed at the El Tor station. Port Said and Alexandria are holding ships for inspection, and Jaffa and Beirut quarantine whatever comes from Egypt.', sea: { portsaid: 2, alexandria: 1 } },
  { id: 'flood-25', name: 'The Nile in flood', from: d(8, 17), to: d(10, 20), icon: '≈', text: 'The river is high. The ferry fights the current, the low roads of the Delta are under water and caravans keep to the dykes. The railway runs on its embankments as usual.', flood: true },
  // Nayrouz, 1 Tut 1642 of the Coptic year = 11 September 1925
  { id: 'nayrouz-25', name: 'Coptic New Year', from: d(9, 11), to: d(9, 11), eve: true, icon: '†', text: 'Nayrouz, the first of Tut. Red dates on every Coptic table, and Coptic families buying for the new year.', budget: 1.03, callers: { coptic: 1.5 } },
  // the cotton break of the 1925 season: a huge American crop and Lancashire buying less
  { id: 'cotton-fall-25', unforeseen: true, name: 'Cotton breaks at Minet el-Bassal', from: d(11, 16), to: d(1, 14, 1926), icon: '↓', text: 'Prices on the Alexandria cotton exchange have broken. America has picked a huge crop and Lancashire is buying less. Delta landowners who held back are counting losses, and new carpets can wait.', budget: 0.94, cityBid: { tanta: 0.9, alexandria: 0.95, cairo: 0.97 }, callers: { cotton: 0.75 } },
  // Cairo politics: the Wafd's Jihad Day, and the deputies who met at the Continental when the Chamber was barred
  { id: 'jihad-day-25', name: 'Jihad Day: Cairo shuts', from: d(11, 13), to: d(11, 13), icon: '⚐', text: 'The anniversary of 13 November 1918, when Zaghlul went to the High Commissioner to ask for independence. The Wafd has asked Cairo to close its shops for the day.', closed: ['cairo'], closedNote: 'Shutters down for Jihad Day. The Wafd asked Cairo to close, and Cairo has closed.' },
  { id: 'continental-25', name: 'The deputies meet at the Continental', from: d(11, 21), to: d(11, 22), icon: '⚐', text: 'The government has barred the doors of the Chamber. The dissolved deputies have met at the Continental Hotel instead, with Zaghlul in the chair. Police on every corner, students in the streets, and the bazaars shut.', closed: ['cairo'], closedNote: 'The bazaars are shut. Police hold the streets around the Chamber and the Continental Hotel.', danger: ['cairo'] },
  { id: 'xmas-25', name: 'Christmas in the European quarters', from: d(12, 18), to: d(12, 25), icon: '✶', text: 'The shops of Kasr el-Nil and Rue Chérif Pacha are dressed for Christmas, and the Europeans of Cairo and Alexandria are buying presents.', callers: { foreign: 1.2 }, demand: [{ sid: 'cairo', traits: ['ornate', 'silk', 'fineWeave'], mult: 1.12 }, { sid: 'alexandria', traits: ['ornate', 'bold', 'silk'], mult: 1.15 }] },
  { id: 'copt-xmas-26', name: 'Coptic Christmas', from: d(1, 7, 1926), to: d(1, 7, 1926), eve: true, icon: '†', text: 'The Copts end the Advent fast with the night mass and a feast. Coptic families are out buying.', budget: 1.05, callers: { coptic: 1.5 } },
  // 1926: Ramadan 1344 began about 15 March; Eid al-Fitr about 14 April; Eid al-Adha about 21 June
  { id: 'ramadan-26', name: 'Ramadan', from: d(3, 15, 1926), to: d(4, 13, 1926), fast: true, icon: '☾', text: 'The month of fasting. Buyers come after dark and are shorter of patience by day.', budget: 1.05 },
  { id: 'eid-26', name: 'Eid al-Fitr', from: d(4, 14, 1926), to: d(4, 16, 1926), eve: true, icon: '☾', text: 'The feast after Ramadan. New clothes, gifts, and prayer rugs for the family.', budget: 1.2, footfall: 1, want: PRAYER, callers: { pious: 1.3 }, laneNote: 'Eid al-Fitr. The lane is crowded and in good spirits.' },
  { id: 'copt-easter-26', name: 'Coptic Easter', from: d(5, 2, 1926), to: d(5, 2, 1926), eve: true, icon: '†', text: 'The Copts break the long Lenten fast. Houses in Shubra and Old Cairo are made ready for guests.', budget: 1.04, callers: { coptic: 1.5 } },
  { id: 'sham-26', name: 'Sham el-Nessim', from: d(5, 3, 1926), to: d(5, 3, 1926), eve: true, icon: '☘', text: 'The spring holiday. Families spend the day in the gardens and on the river with salted fish, onions and coloured eggs.', budget: 0.92, footfall: -2, laneNote: 'Sham el-Nessim. Half of Cairo is out picnicking; the lane is nearly empty.' },
  { id: 'adha-26', name: 'Eid al-Adha', from: d(6, 21, 1926), to: d(6, 24, 1926), eve: true, icon: '☾', text: 'The Feast of the Sacrifice. Guest rooms are dressed with the best carpets in the house.', budget: 1.15, footfall: 1, want: { ...PRAYER, mult: 1.15 }, callers: { pious: 1.3 }, laneNote: 'Eid al-Adha. The lane is crowded and in good spirits.' },
  { id: 'summer-26', name: 'The summer lull', from: d(6, 15, 1926), to: d(9, 30, 1926), icon: '☀', text: 'The visitors have gone home and the rich have moved to Alexandria. Giza is quiet.', budget: 0.95, callers: { foreign: 0.7 } },
  { id: 'quarantine-26', unforeseen: true, name: 'Pilgrims held at El Tor', from: d(7, 3, 1926), to: d(7, 14, 1926), icon: '⚑', text: 'The pilgrim ships are back from the Hejaz and the quarantine station at El Tor is full. Every ship calling at Port Said or Alexandria is held for inspection.', sea: { portsaid: 2, alexandria: 1 }, cityBid: { suez: 0.92 } },
  { id: 'hijri-26', name: 'Islamic New Year', from: d(7, 11, 1926), to: d(7, 11, 1926), eve: true, icon: '☾', text: 'The first of Muharram, 1345. Government offices are shut and families visit one another.', budget: 1.04, callers: { pious: 1.2 } },
  ...PERSIA_EVENTS,
];

/** What the seasons add to events life.ts already has (merged into them at load). */
export const EVENT_EXTRAS: Record<string, Partial<GameEvent>> = {
  ramadan: { icon: '☾' },
  eid: { eve: true, icon: '☾', want: PRAYER, callers: { pious: 1.3 } },
  adha: { eve: true, icon: '☾', want: { ...PRAYER, mult: 1.15 }, callers: { pious: 1.3 } },
  mawlid: { icon: '☾', patience: 0.85, laneNote: 'Drums, chanting and pickpockets: buyers are in a hurry.' },
  season: { icon: '✈', callers: { foreign: 1.3 }, demand: [{ sid: 'cairo', traits: SHOWY, mult: 1.15 }, { sid: 'alexandria', traits: SHOWY, mult: 1.12 }] },
  summer: { icon: '☀', callers: { foreign: 0.7 } },
  cotton: { icon: '✿', budget: 1.08, cityBid: { cairo: 1.06 }, callers: { cotton: 1.3 } },
  slump: { icon: '↓', callers: { cotton: 0.7 } },
};
export function withExtras(e: GameEvent): GameEvent {
  const x = EVENT_EXTRAS[e.id];
  if (!x) return e;
  return Object.assign(e, x, {
    cityBid: x.cityBid ? { ...e.cityBid, ...x.cityBid } : e.cityBid,
    demand: x.demand ? [...(e.demand ?? []), ...x.demand] : e.demand,
  });
}

export const SEASON_EVENTS: GameEvent[] = [...khamsins(), ...FIXED].sort((a, b) => a.from - b.from);

// ---------- Helpers that need only the season list ----------
// cached by day: floodOn is asked per frame on the road and per path point when a route is planned
const onCache = new Map<number, GameEvent[]>();
const on = (day: number) => {
  let r = onCache.get(day);
  if (!r) { if (onCache.size > 64) onCache.clear(); r = SEASON_EVENTS.filter((e) => day >= e.from && day <= e.to); onCache.set(day, r); }
  return r;
};
/** the game day, kept in step by the store, for code that has no state at hand (sea routes) */
export const SEASON_NOW = { day: 1 };
export const setSeasonDay = (day: number) => { SEASON_NOW.day = day; };
/** extra days at sea for a sailing between these ports today (quarantine) */
export const seaDelayOn = (day: number, a: string, b: string) => on(day).reduce((m, e) => Math.max(m, e.sea?.[a] ?? 0, e.sea?.[b] ?? 0), 0);
export const floodOn = (day: number) => on(day).some((e) => e.flood);
/** the Giza–Cairo ferry, in hours: slower against the flood */
export const ferryHours = (day: number) => (floodOn(day) ? 1.75 : 1.5);

/** The lane with the season laid over it: more or fewer buyers, their patience, a word in the morning note. */
export function seasonLane(base: LaneDay, evs: GameEvent[]): LaneDay {
  const foot = evs.reduce((s, e) => s + (e.footfall ?? 0), 0);
  const patience = evs.reduce((m, e) => m * (e.patience ?? 1), 1);
  const fast = base.fast || evs.some((e) => e.fast);
  const notes = evs.map((e) => e.laneNote).filter(Boolean) as string[];
  if (!foot && patience === 1 && fast === !!base.fast && !notes.length) return base;
  let note = base.note;
  if (fast && !base.fast && !note) note = 'Ramadan. The lane is slow in the heat of the day, and busy after the sunset cannon.';
  // a feast already named by the base note keeps its own line; anything else follows it
  const extra = notes.filter((n) => !note.startsWith(n.split('.')[0]));
  note = [note, ...extra].filter(Boolean).join(' ');
  return { ...base, extra: base.extra + foot, level: Math.max(0.4, base.level * (1 + foot * 0.15)), fast, note, ...(patience !== 1 ? { patience } : {}) };
}

/** How much more a stall buyer pays for this rug because of a feast (the encounter carries the want). */
export function wantMult(want: { typeIds?: string[]; traits?: string[]; mult: number } | undefined, typeId: string): number {
  if (!want) return 1;
  const t = RUGS[typeId];
  return want.typeIds?.includes(typeId) || (t && want.traits?.some((x) => (t.traits as string[]).includes(x))) ? want.mult : 1;
}
