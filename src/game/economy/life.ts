// The calendar of a merchant's life: monthly bills, the events of 1925–26, and the day's rumours.
import { RUGS } from '../../data/rugs';
import type { Trait } from '../types';
import { upcomingGrandSales } from '../auction/sessions';
import { SURPRISES } from '../../data/news';
import { SETTLEMENTS } from '../../data/world';

export const dateOfDay = (day: number) => new Date(Date.UTC(1925, 2, 9 + day));
export const isFirstOfMonth = (day: number) => dateOfDay(day).getUTCDate() === 1;
export const monthName = (day: number) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][dateOfDay(day).getUTCMonth()];

// ---------- Monthly bill ----------
const STALL_BILL: Record<string, { rent: number; dues: number; licence: number; watch: number; lamp: number; tax: number; name: string }> = {
  corner: { name: 'borrowed corner', rent: 50, dues: 15, licence: 0, watch: 2, lamp: 10, tax: 0 },
  mat: { name: 'rug mat', rent: 150, dues: 25, licence: 0, watch: 2, lamp: 10, tax: 0 },
  bazaar: { name: 'bazaar stall', rent: 350, dues: 50, licence: 10, watch: 3, lamp: 15, tax: 0 },
  khan: { name: 'shop in Khan el-Khalili', rent: 1200, dues: 0, licence: 25, watch: 5, lamp: 30, tax: 120 },
};
export const stallKey = (up: string[]) => (up.includes('khan') ? 'khan' : up.includes('bazaar') ? 'bazaar' : up.includes('mat') ? 'mat' : 'corner');
const HOUSEHOLD = [150, 220, 300, 450, 600];

export interface BillLine { label: string; amount: number }
/** What falls due on the first of the month. */
export function monthlyBill(up: string[], rankIdx: number, stored: number): BillLine[] {
  const b = STALL_BILL[stallKey(up)];
  const lines: BillLine[] = [
    { label: `Rent (${b.name})`, amount: b.rent },
    { label: 'Market dues', amount: b.dues },
    { label: 'Shop licence', amount: b.licence },
    { label: 'Watchman', amount: b.watch },
    { label: 'Lamp oil', amount: b.lamp },
    { label: 'Building tax on your shop', amount: b.tax },
    { label: 'Household and lodging', amount: HOUSEHOLD[Math.min(HOUSEHOLD.length - 1, rankIdx)] },
    { label: `Storage for ${stored} rug${stored === 1 ? '' : 's'}`, amount: stored * 10 },
    { label: 'Saffron\'s food', amount: 10 },
  ];
  return lines.filter((l) => l.amount > 0);
}
export const billTotal = (lines: BillLine[]) => lines.reduce((s, l) => s + l.amount, 0);

// ---------- Events of 1925–26 ----------
// Researched against the record of 1925. Where only the month is known the dates are marked "about".
export interface GameEvent {
  id: string;
  name: string;
  from: number; // game day
  to: number;
  text: string;
  /** buyer budgets at the Giza stall */
  budget?: number;
  /** what city dealers pay for your rugs, by settlement */
  cityBid?: Record<string, number>;
  /** what rugs cost to buy in a city's own market */
  cityBuy?: Record<string, number>;
  /** a town pays extra for rugs with these traits */
  demand?: { sid: string; traits: Trait[]; mult: number }[];
  /** towns whose markets are shut, and what the shutters say */
  closed?: string[];
  closedNote?: string;
  /** towns where soldiers or gendarmes stop caravans at the gate */
  danger?: string[];
  /** an unannounced incident: it appears in the paper the day it happens, never in advance */
  surprise?: string;
  advice?: string;
  city?: string;
}
export const dayOf = (m: number, d: number, y = 1925) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1925, 2, 9)) / 86400000);

export const EVENTS: GameEvent[] = [
  // Spring 1925
  { id: 'sheikhsaid', name: 'The Sheikh Said rising', from: dayOf(2, 11), to: dayOf(4, 15), text: 'Kurdish tribes in eastern Anatolia have risen against Ankara. Martial law in the east; wool and rugs from Diyarbakır and Elazığ have stopped coming west.', cityBid: { istanbul: 1.08, ankara: 0.9 }, danger: ['ankara'] },
  { id: 'jeddah', name: 'Ibn Saud besieges Jeddah', from: dayOf(2, 10), to: dayOf(12, 23), text: 'The Wahhabi army has King Ali shut inside Jeddah. Few ships run to the Hejaz and the pilgrim trade through Suez has dried up.', cityBid: { suez: 0.85 } },
  { id: 'oil', name: 'The Iraq oil concession', from: dayOf(3, 14), to: dayOf(4, 10), text: 'King Faisal\'s government has signed a 75-year concession with the Turkish Petroleum Company. Oilmen and their wives are furnishing houses in Baghdad.', cityBid: { baghdad: 1.12 } },
  { id: 'parliament', name: 'The new Parliament opens', from: dayOf(3, 18), to: dayOf(3, 23), text: 'Deputies are arriving in Cairo for the opening of the Chamber on the 23rd. Every new deputy wants a good carpet for his reception room.', demand: [{ sid: 'cairo', traits: ['fineWeave', 'restrained', 'ornate'], mult: 1.25 }], budget: 1.05 },
  { id: 'dissolved', name: 'Parliament dissolved', from: dayOf(3, 24), to: dayOf(4, 5), text: 'Zaghlul was elected Speaker on the afternoon of the opening, and King Fuad dissolved the Chamber the same evening. The Wafd is furious and the pashas are keeping their money in their pockets.', budget: 0.92, cityBid: { cairo: 0.95 } },
  { id: 'balfour-strike', name: 'Palestine strikes against Balfour', from: dayOf(3, 25), to: dayOf(3, 25), text: 'Lord Balfour lands in Palestine. Arab shops close in protest and black flags hang in the streets.', closed: ['jerusalem', 'jaffa'], closedNote: 'The Arab shops are shuttered and black flags hang over the doors. A strike against Lord Balfour\'s visit.' },
  { id: 'balfour', name: 'Balfour opens the Hebrew University', from: dayOf(3, 26), to: dayOf(4, 7), text: 'Lord Balfour opens the Hebrew University on Mount Scopus on 1 April. Jerusalem is full of consuls, professors and visiting dignitaries giving receptions.', demand: [{ sid: 'jerusalem', traits: ['story', 'antique', 'fineWeave'], mult: 1.25 }] },
  { id: 'geocongress', name: 'The Geographical Congress', from: dayOf(4, 1), to: dayOf(4, 10), text: 'The International Geographical Congress meets in Cairo under King Fuad. Geographers from thirty countries are touring the Pyramids with money to spend. (Dates about.)', budget: 1.12 },
  { id: 'balfour-damascus', name: 'Balfour stoned in Damascus', from: dayOf(4, 8), to: dayOf(4, 10), text: 'Lord Balfour\'s visit to Damascus has set the city alight. Crowds stone his hotel, the bazaar has shut in protest, and French troops clear the streets. He leaves for Beirut in a hurry.', closed: ['damascus'], closedNote: 'The bazaar is shut in protest against Lord Balfour. French troops are clearing the streets.', danger: ['damascus'] },
  { id: 'ramadan', name: 'Ramadan', from: dayOf(3, 26), to: dayOf(4, 23), text: 'The month of fasting. Buyers come after dark and are shorter of patience by day. In the last ten nights everyone buys for the feast.', budget: 1.05 },
  { id: 'eid', name: 'Eid al-Fitr', from: dayOf(4, 24), to: dayOf(4, 27), text: 'The feast after Ramadan. New clothes, new carpets, open purses.', budget: 1.2 },
  { id: 'paris', name: 'The Paris Exposition', from: dayOf(4, 28), to: dayOf(11, 8), text: 'The Exposition des Arts Décoratifs has opened in Paris, and Europe wants bold geometric rugs and kilims to go with the new furniture. The Alexandria export houses are buying.', demand: [{ sid: 'alexandria', traits: ['bold', 'flatweave'], mult: 1.2 }, { sid: 'beirut', traits: ['bold', 'flatweave'], mult: 1.1 }] },
  { id: 'adana', name: 'Earthquake at Adana', from: dayOf(5, 1), to: dayOf(5, 12), text: 'An earthquake has struck Adana. Relief committees in Aleppo are buying cheap, hard-wearing rugs for the homeless, and the road north is choked with carts.', demand: [{ sid: 'aleppo', traits: ['hardwearing', 'humble'], mult: 1.3 }] },
  // Summer
  { id: 'hajj', name: 'A hajj without the Mahmal', from: dayOf(6, 10), to: dayOf(7, 1), text: 'With Jeddah under siege, the ulema have released Egyptians from the pilgrimage and no Mahmal leaves Cairo this year. The pilgrims who usually buy prayer rugs for the journey are staying home.', cityBid: { suez: 0.8, cairo: 0.95 } },
  { id: 'summer', name: 'The court goes to Alexandria', from: dayOf(6, 15), to: dayOf(9, 30), text: 'The government and the rich move to Alexandria for the summer. Alexandria dealers pay more; Cairo is quiet.', budget: 0.9, cityBid: { alexandria: 1.2, cairo: 0.9 } },
  { id: 'adha', name: 'Eid al-Adha', from: dayOf(7, 1), to: dayOf(7, 4), text: 'The Feast of the Sacrifice. Families gather, sheep are bought, and guest rooms are dressed with the best carpets in the house.', budget: 1.15 },
  { id: 'syria', name: 'The Great Syrian Revolt', from: dayOf(7, 21), to: dayOf(6, 1, 1926), text: 'The Druze rise against the French in the Hauran, and the revolt spreads. French patrols stop every caravan at the gates of Damascus, and Damascus rugs are scarce and dear.', cityBid: { damascus: 1.25, beirut: 1.1 }, danger: ['damascus'] },
  { id: 'isparta', name: 'Earthquake at Isparta', from: dayOf(8, 7), to: dayOf(9, 20), text: 'An earthquake has destroyed two thousand houses in Isparta, the carpet town of Anatolia. The looms have stopped. Turkish carpets are suddenly hard to find.', cityBid: { istanbul: 1.15, konya: 1.1 }, cityBuy: { konya: 1.2, istanbul: 1.1 } },
  { id: 'nile', name: 'Wafaa el-Nil', from: dayOf(8, 14), to: dayOf(8, 16), text: 'The Nile has risen. Cairo celebrates the flood with boats, fireworks and the cutting of the dam. (Dates about.)', budget: 1.05 },
  { id: 'plumer', name: 'Lord Plumer arrives in Jerusalem', from: dayOf(8, 25), to: dayOf(9, 8), text: 'The new High Commissioner, Field Marshal Plumer, has taken up his post. Government House is holding receptions and every official wants his office carpeted.', demand: [{ sid: 'jerusalem', traits: ['restrained', 'fineWeave', 'hardwearing'], mult: 1.2 }] },
  { id: 'cotton', name: 'The cotton harvest', from: dayOf(9, 1), to: dayOf(11, 15), text: 'The cotton is picked and sold at the best prices in years. Delta landowners have cash in hand and Tanta and Alexandria dealers are buying.', cityBid: { tanta: 1.15, alexandria: 1.08 } },
  { id: 'mawlid', name: 'The Prophet\'s Birthday', from: dayOf(9, 24), to: dayOf(9, 30), text: 'The Mawlid al-Nabi. The Sufi orders pitch their tents in Cairo and every tent is floored with carpets. (Dates about.)', cityBid: { cairo: 1.15 }, budget: 1.05 },
  // Autumn
  { id: 'badawi', name: 'The Mawlid of Sayyid al-Badawi', from: dayOf(10, 8), to: dayOf(10, 16), text: 'The great fair at Tanta, after the cotton harvest. Half a million people, fairground tents, and sellers from every village in the Delta. You buy cheaply and sell well. (Dates about.)', cityBid: { tanta: 1.3 }, cityBuy: { tanta: 0.85 } },
  { id: 'bombard', name: 'Damascus bombarded', from: dayOf(10, 18), to: dayOf(10, 26), text: 'French guns shell the old city of Damascus. The souqs are shut and burning.', closed: ['damascus'], closedNote: 'The souqs are shut. French guns are shelling the old city.', danger: ['damascus'] },
  { id: 'republic', name: 'Republic Day in Ankara', from: dayOf(10, 25), to: dayOf(10, 30), text: 'The second anniversary of the Republic. Ankara\'s new ministries and embassies are giving receptions and buying for them.', demand: [{ sid: 'ankara', traits: ['ornate', 'fineWeave', 'bold'], mult: 1.25 }] },
  { id: 'season', name: 'The winter tourist season', from: dayOf(11, 1), to: dayOf(3, 31, 1926), text: 'Thomas Cook steamers bring the winter visitors. Giza is full of foreigners with money.', budget: 1.15 },
  { id: 'hadda', name: 'The Hadda Agreement', from: dayOf(11, 2), to: dayOf(11, 12), text: 'Britain and Ibn Saud have fixed the Najd border with Transjordan, and Ma\'an and Aqaba now belong to Emir Abdullah. The desert road to Amman is safer than it has been for years.', cityBid: { amman: 1.1 } },
  { id: 'tut', name: 'Tutankhamun\'s mummy examined', from: dayOf(11, 11), to: dayOf(11, 30), text: 'Howard Carter\'s team examines the boy king\'s mummy at Luxor. The papers talk of nothing else and tourists flood Giza.', budget: 1.25 },
  { id: 'hatlaw', name: 'The Hat Law', from: dayOf(11, 25), to: dayOf(12, 12), text: 'Turkey has banned the fez. Protests in Erzurum and Rize, gendarmes on the roads, and Istanbul dealers are nervous.', cityBid: { istanbul: 0.92 }, danger: ['ankara', 'istanbul'] },
  { id: 'tekkes', name: 'The dervish lodges closed', from: dayOf(11, 30), to: dayOf(2, 28, 1926), text: 'Ankara has shut every tekke and tomb in Turkey. The lodges of Konya are emptying, and their old prayer rugs and felts are being sold off cheap.', cityBuy: { konya: 0.75, istanbul: 0.9 }, cityBid: { konya: 0.9 } },
  { id: 'mosul', name: 'Mosul goes to Iraq', from: dayOf(12, 16), to: dayOf(1, 31, 1926), text: 'The League of Nations has given Mosul, and its oil, to Iraq. Baghdad is celebrating and the notables are spending.', cityBid: { baghdad: 1.2 } },
  { id: 'jouvenel', name: 'A new High Commissioner in Beirut', from: dayOf(12, 23), to: dayOf(1, 10, 1926), text: 'Henry de Jouvenel, a senator and journalist, replaces General Sarrail and promises to talk to the rebels. Beirut is full of receptions.', demand: [{ sid: 'beirut', traits: ['ornate', 'silk', 'fineWeave'], mult: 1.2 }] },
  { id: 'hejaz', name: 'Jeddah falls', from: dayOf(12, 24), to: dayOf(2, 28, 1926), text: 'King Ali has surrendered Jeddah and Ibn Saud is King of the Hejaz. The ships are running again and next year\'s pilgrims are already buying at Suez.', cityBid: { suez: 1.15 } },
  // 1926
  { id: 'slump', name: 'The cotton slump', from: dayOf(1, 15, 1926), to: dayOf(6, 30, 1926), text: 'The price of cotton has fallen by a third since last year. Delta landowners are cancelling orders, and fewer pashas come to Giza.', budget: 0.9, cityBid: { tanta: 0.85, alexandria: 0.92 } },
];
// ---------- Surprises: small incidents drawn from the seed of the day ----------
const cityName = (id: string) => SETTLEMENTS.find((x) => x.id === id)?.name ?? id;
const sr = (n: number) => Math.abs(Math.sin(n * 78.233 + 12.9898) * 43758.5453) % 1;
function buildSurprises(): GameEvent[] {
  const out: GameEvent[] = [];
  for (let day = 1; day < 480; day++) {
    if (sr(day * 3.7) > 0.3) continue; // roughly two a week
    const month = dateOfDay(day).getUTCMonth() + 1;
    const pool = SURPRISES.filter((x) => !x.months || x.months.includes(month));
    const total = pool.reduce((a, x) => a + x.weight, 0);
    let r = sr(day * 5.1) * total;
    const def = pool.find((x) => (r -= x.weight) <= 0) ?? pool[0];
    const city = def.cities[Math.floor(sr(day * 7.9) * def.cities.length)];
    // not the same kind of incident in the same town while the last one is still on
    if (out.some((e) => e.surprise === def.id && e.city === city && e.to >= day)) continue;
    const len = def.days[0] + Math.floor(sr(day * 9.3) * (def.days[1] - def.days[0] + 1));
    const fill = (t: string) => t.replace(/\{city\}/g, cityName(city));
    const ef = def.effect;
    out.push({
      id: `s${day}-${def.id}`, surprise: def.id, city, name: fill(def.article.headline), text: fill(def.article.body), advice: fill(def.advice),
      from: day, to: day + len - 1,
      budget: ef.budget,
      cityBid: ef.cityBid ? { [city]: ef.cityBid } : undefined,
      cityBuy: ef.cityBuy ? { [city]: ef.cityBuy } : undefined,
      closed: ef.closed ? [city] : undefined,
      closedNote: ef.closed ? fill(def.article.headline) + '.' : undefined,
      danger: ef.danger ? [city] : undefined,
      demand: ef.traits?.length ? [{ sid: city, traits: ef.traits, mult: ef.traitMult ?? 1.2 }] : undefined,
    });
  }
  return out;
}
export const SURPRISE_EVENTS = buildSurprises();
export const ALL_EVENTS: GameEvent[] = [...EVENTS, ...SURPRISE_EVENTS];

export const eventsOn = (day: number) => ALL_EVENTS.filter((e) => day >= e.from && day <= e.to);
export const eventsStarting = (day: number) => ALL_EVENTS.filter((e) => e.from === day);
export const budgetMod = (day: number) => eventsOn(day).reduce((m, e) => m * (e.budget ?? 1), 1);
export const cityBidMod = (day: number, sid: string) => eventsOn(day).reduce((m, e) => m * (e.cityBid?.[sid] ?? 1), 1);
export const cityBuyMod = (day: number, sid: string) => eventsOn(day).reduce((m, e) => m * (e.cityBuy?.[sid] ?? 1), 1);
export const cityClosed = (day: number, sid: string) => eventsOn(day).some((e) => e.closed?.includes(sid));
export const closedNote = (day: number, sid: string) => eventsOn(day).find((e) => e.closed?.includes(sid))?.closedNote ?? 'The souqs are shut today.';
export const dangerAt = (day: number, sid: string) => eventsOn(day).find((e) => e.danger?.includes(sid));
/** Traits a town is paying extra for because of an event today. */
export const eventDemand = (day: number, sid: string) => eventsOn(day).flatMap((e) => (e.demand ?? []).filter((d) => d.sid === sid));

// ---------- Rumours: a new set every day, the same set all day ----------
export interface Rumour { id: string; text: string; sid?: string; trait?: Trait; mult?: number; typeId?: string; until: number; kind: 'demand' | 'glut' | 'buyer' | 'event' }
const h = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
const TOWNS = ['alexandria', 'cairo', 'jaffa', 'jerusalem', 'beirut', 'damascus', 'aleppo', 'istanbul', 'baghdad', 'tanta', 'portsaid', 'amman', 'konya'];
const TOWN_NAME: Record<string, string> = { alexandria: 'Alexandria', cairo: 'Cairo', jaffa: 'Jaffa', jerusalem: 'Jerusalem', beirut: 'Beirut', damascus: 'Damascus', aleppo: 'Aleppo', istanbul: 'Istanbul', baghdad: 'Baghdad', tanta: 'Tanta', portsaid: 'Port Said', amman: 'Amman', konya: 'Konya' };
const TRAIT_WORDS: [Trait, string][] = [['bold', 'bold, bright rugs'], ['restrained', 'quiet, restrained rugs'], ['antique', 'anything old'], ['fineWeave', 'fine weaving'], ['hardwearing', 'hard-wearing rugs'], ['silk', 'silk'], ['story', 'rugs with a story'], ['flatweave', 'kilims and flatweaves'], ['darkField', 'dark-ground rugs'], ['lightField', 'pale-ground rugs']];
const WHO = ['a hotel is refurnishing', 'a wedding is coming', 'a new consul arrived', 'a pasha\'s son is setting up house', 'the Americans are in town', 'a mosque committee is buying'];

/** Rumours that start on a given day; each runs for a few days. */
function rumoursStarting(day: number): Rumour[] {
  const out: Rumour[] = [];
  const a = h(day * 7.1), b = h(day * 3.3 + 1), c = h(day * 5.7 + 2);
  const town = TOWNS[Math.floor(a * TOWNS.length)];
  const [trait, words] = TRAIT_WORDS[Math.floor(b * TRAIT_WORDS.length)];
  out.push({ id: `d${day}`, kind: 'demand', sid: town, trait, mult: 1.3 + Math.round(c * 4) / 10, until: day + 4, text: `${TOWN_NAME[town]} pays well for ${words} this week: ${WHO[Math.floor(c * WHO.length)]}.` });
  if (h(day * 9.9) < 0.5) {
    const glut = TOWNS[Math.floor(h(day * 2.2) * TOWNS.length)];
    if (glut !== town) out.push({ id: `g${day}`, kind: 'glut', sid: glut, mult: 0.75, until: day + 3, text: `A caravan has just unloaded in ${TOWN_NAME[glut]}. Dealers there are full up and pay less.` });
  }
  if (h(day * 4.4) < 0.35) {
    const ids = Object.keys(RUGS).filter((id) => (RUGS[id].tier ?? 1) === 2 || (RUGS[id].tier ?? 1) === 3);
    const id = ids[Math.floor(h(day * 6.6) * ids.length)];
    const city = TOWNS[Math.floor(h(day * 8.8) * TOWNS.length)];
    out.push({ id: `b${day}`, kind: 'buyer', sid: city, typeId: id, mult: 1.5, until: day + 6, text: `A collector in ${TOWN_NAME[city]} is asking for a ${RUGS[id].name}. The dealers there will pay half again for one.` });
  }
  return out;
}
/** Everything the bazaar is saying today. */
export function rumoursOn(day: number): Rumour[] {
  const out: Rumour[] = [];
  for (let d = Math.max(1, day - 6); d <= day; d++) for (const r of rumoursStarting(d)) if (r.until >= day) out.push(r);
  for (const { h, d } of upcomingGrandSales(day)) {
    const town = TOWN_NAME[h.city] ?? h.city;
    out.push({ id: `a-${h.id}-${d}`, kind: 'event', sid: h.city, until: d, text: d === day ? `The ${h.displayName} is selling today in ${town}. Anyone may sit and watch.` : `The ${h.displayName} in ${town} holds a sale on day ${d}. The dealers are already talking.` });
  }
  for (const e of eventsOn(day)) out.push({ id: `e-${e.id}`, kind: 'event', until: e.to, text: `${e.name}: ${e.text}` });
  return out;
}
/** How today's rumours change what a dealer in this town pays for this rug. */
export function rumourBid(day: number, sid: string, typeId: string, traits: Trait[]): number {
  let m = cityBidMod(day, sid);
  for (const d of eventDemand(day, sid)) if (d.traits.some((t) => traits.includes(t))) m *= d.mult;
  for (const r of rumoursOn(day)) {
    if (r.sid !== sid) continue;
    if (r.kind === 'demand' && r.trait && traits.includes(r.trait)) m *= r.mult ?? 1;
    if (r.kind === 'glut') m *= r.mult ?? 1;
    if (r.kind === 'buyer' && r.typeId === typeId) m *= r.mult ?? 1;
  }
  return m;
}

// ---------- The lane: how busy the bazaar is today ----------
export interface LaneDay {
  /** how full the lane sounds: 1 is an ordinary day */
  level: number;
  /** buyers more or fewer than usual */
  extra: number;
  /** nobody shops before the noon prayer */
  late: boolean;
  note: string;
}
const FEASTS = ['eid', 'adha', 'mawlid', 'nile'];
export function laneDay(day: number): LaneDay {
  const feast = eventsOn(day).find((e) => FEASTS.includes(e.id));
  if (feast) return { level: 1.4, extra: 1, late: false, note: `${feast.name}. The lane is crowded and in good spirits.` };
  const wd = dateOfDay(day).getUTCDay();
  if (wd === 5) return { level: 0.6, extra: -1, late: true, note: 'Friday. The lane stays quiet until after the noon prayer.' };
  if (wd === 4) return { level: 1.25, extra: 1, late: false, note: 'Thursday. The lane fills with people shopping before Friday.' };
  if (eventsOn(day).some((e) => e.id === 'ramadan')) return { level: 0.8, extra: 0, late: false, note: 'Ramadan. The lane is slow in the heat of the day.' };
  return { level: 1, extra: 0, late: false, note: '' };
}
