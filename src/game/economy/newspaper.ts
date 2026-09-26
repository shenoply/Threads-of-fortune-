// The Giza Courier: one paper a day, put together from what happens in the world that morning.
import { EVENTS, eventsOn, eventsStarting, dateOfDay, rumoursOn, type GameEvent } from './life';
import { EVENT_NEWS, FILLER, ADS, WEATHER, KHAMSIN, SHIPPING, SHIPS, PORTS, type Story } from '../../data/news';
import { upcomingGrandSales } from '../auction/sessions';
import { wiresOn } from '../../data/daily1925';

export interface Article extends Story { kind: 'event' | 'surprise' | 'filler' | 'wire'; eg?: boolean; advice?: string; id: string; img?: string; caption?: string }
export interface Paper {
  day: number;
  number: number;
  date: string;
  lead: Article;
  more: Article[];
  still: { name: string; advice: string }[];
  comingUp: { when: string; text: string }[];
  trade: string[];
  glance: { icon: string; text: string; tone: 'good' | 'bad' | 'info' }[];
  weather: string;
  shipping: string;
  ad: { title: string; body: string };
  ad2: { title: string; body: string };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const r = (n: number) => Math.abs(Math.sin(n * 12.9898 + 4.1414) * 43758.5453) % 1;
const pick = <T,>(a: T[], seed: number) => a[Math.floor(r(seed) * a.length)];

/** Events the whole town knew were coming: feasts, seasons, announced visits and fairs. */
const FORESEEN = new Set(['parliament', 'ramadan', 'eid', 'balfour', 'geocongress', 'paris', 'summer', 'adha', 'nile', 'plumer', 'cotton', 'mawlid', 'badawi', 'republic', 'season', 'tut', 'jouvenel', 'mosul']);

// ---------- pictures: the paper's engravings come from the game's own art ----------
const CITY_IMG: Record<string, string> = {
  alexandria: 'art/world/city-alexandria.jpg', amman: 'art/world/city-amman.jpg', baghdad: 'art/world/city-baghdad.jpg', damascus: 'art/world/city-damascus.jpg',
  istanbul: 'art/world/city-istanbul.jpg', jerusalem: 'art/world/city-jerusalem.jpg', giza: 'art/world/giza-district.jpg', cairo: 'art/cities/cairo-1925-map.webp',
  beirut: 'art/world/city-damascus.jpg', jaffa: 'art/world/city-jerusalem.jpg', konya: 'art/world/city-istanbul.jpg', ankara: 'art/world/city-istanbul.jpg', aleppo: 'art/world/city-damascus.jpg',
  tanta: 'art/world/giza-district.jpg', portsaid: 'art/world/city-alexandria.jpg', suez: 'art/world/travel-map.jpg', sinai: 'art/world/travel-map.jpg', bedouin: 'art/world/travel-map.jpg',
};
const CITY_NAME: Record<string, string> = { portsaid: 'Port Said', bedouin: 'the Tarabin camp', sinai: 'Sinai' };
const EVENT_IMG: Record<string, [string, string]> = {
  parliament: ['art/royal/abdeen-exterior.jpg', 'The Chamber meets near Abdeen.'], dissolved: ['art/royal/abdeen-exterior.jpg', 'Abdeen, where the decree was signed.'],
  geocongress: ['art/world/giza-district.jpg', 'Delegates at the Pyramids.'], ramadan: ['art/world/giza-district.jpg', 'Lanterns along the Pyramids Road.'], eid: ['art/world/giza-district.jpg', 'Giza keeps the feast.'],
  adha: ['art/world/giza-district.jpg', 'The feast at Giza.'], mawlid: ['art/cities/cairo-1925-map.webp', 'Cairo on the Prophet\'s Birthday.'], badawi: ['art/world/giza-district.jpg', 'The road to the Tanta fair.'],
  nile: ['art/cities/cairo-1925-map.webp', 'The river at Cairo.'], cotton: ['art/world/city-alexandria.jpg', 'The cotton port at Alexandria.'], slump: ['art/world/city-alexandria.jpg', 'Quiet days at the cotton exchange.'],
  season: ['art/world/giza-district.jpg', 'Winter visitors at Giza.'], tut: ['art/world/giza-district.jpg', 'Egyptomania reaches Giza.'], summer: ['art/world/city-alexandria.jpg', 'The court\'s summer city.'],
  paris: ['art/rugs/village-kilim-canal.jpg', 'The kind of kilim Paris wants.'], jeddah: ['art/world/travel-map.jpg', 'The road to the Hejaz.'], hajj: ['art/world/travel-map.jpg', 'The pilgrim road.'], hejaz: ['art/world/travel-map.jpg', 'Shipping lanes to Jeddah.'],
  hadda: ['art/world/city-amman.jpg', 'Amman.'], jouvenel: ['art/world/city-damascus.jpg', 'The Levant under the Mandate.'], republic: ['art/world/city-istanbul.jpg', 'The Republic\'s old capital.'],
};
function imageFor(e: GameEvent): { img?: string; caption?: string } {
  if (EVENT_IMG[e.id]) return { img: EVENT_IMG[e.id][0], caption: EVENT_IMG[e.id][1] };
  const city = e.city ?? e.closed?.[0] ?? e.danger?.[0] ?? Object.keys(e.cityBid ?? {})[0] ?? Object.keys(e.cityBuy ?? {})[0] ?? e.demand?.[0]?.sid;
  if (city && CITY_IMG[city]) return { img: CITY_IMG[city], caption: `Our artist's view of ${CITY_NAME[city] ?? city.charAt(0).toUpperCase() + city.slice(1)}.` };
  return {};
}
const FILLER_IMG = ['art/rugs/red-medina.jpg', 'art/world/giza-district.jpg', 'art/rugs/cairo-garden.jpg', 'art/cities/cairo-1925-map.webp', 'art/rugs/desert-star.jpg'];

const article = (e: GameEvent): Article => {
  const n = EVENT_NEWS[e.id];
  const pic = imageFor(e);
  if (e.surprise) return { id: e.id, kind: 'surprise', headline: e.name, body: e.text, advice: e.advice, ...pic };
  return n ? { id: e.id, kind: 'event', ...n.article, advice: n.advice, ...pic } : { id: e.id, kind: 'event', headline: e.name, body: e.text, ...pic };
};
const weight = (e: GameEvent) => (e.surprise ? 1 : 2) + (e.closed ? 1 : 0) + (e.danger ? 0.5 : 0);

export function dateLine(day: number) {
  const d = dateOfDay(day);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** What the trade needs to know today: the effects of everything on, in plain words. */
function tradeNotes(day: number): string[] {
  const on = eventsOn(day);
  const notes: string[] = [];
  const b = on.reduce((m, e) => m * (e.budget ?? 1), 1);
  if (b > 1.04) notes.push(`At the stall: buyers are spending more than usual (${on.filter((e) => (e.budget ?? 1) > 1).map((e) => e.name).join(', ')}).`);
  else if (b < 0.96) notes.push(`At the stall: purses are tight (${on.filter((e) => (e.budget ?? 1) < 1).map((e) => e.name).join(', ')}).`);
  const shut = on.flatMap((e) => (e.closed ?? []).map((c) => [c, e.name]));
  for (const [c, n] of shut) notes.push(`Markets shut: ${cap(c)} (${n}).`);
  const danger = [...new Set(on.flatMap((e) => e.danger ?? []))];
  if (danger.length) notes.push(`Soldiers at the gates: ${danger.map(cap).join(', ')}. Expect an inspection fee.`);
  const cheap = on.flatMap((e) => Object.entries(e.cityBuy ?? {}).filter(([, v]) => v < 1).map(([c]) => c));
  if (cheap.length) notes.push(`Cheap buying: ${[...new Set(cheap)].map(cap).join(', ')}.`);
  const dear = on.flatMap((e) => Object.entries(e.cityBid ?? {}).filter(([, v]) => v > 1.05).map(([c]) => c));
  if (dear.length) notes.push(`Dealers paying well: ${[...new Set(dear)].map(cap).join(', ')}.`);
  return notes;
}
/** The day at a glance: short chips a player can read in two seconds. */
function glanceFor(day: number, next?: { when: string; text: string }): Paper['glance'] {
  const on = eventsOn(day);
  const out: Paper['glance'] = [];
  const b = on.reduce((m, e) => m * (e.budget ?? 1), 1);
  if (Math.abs(b - 1) > 0.03) out.push({ icon: b > 1 ? 'up' : 'down', text: `Stall buyers ${b > 1 ? '+' : '−'}${Math.round(Math.abs(b - 1) * 100)}%`, tone: b > 1 ? 'good' : 'bad' });
  const dear = [...new Set(on.flatMap((e) => Object.entries(e.cityBid ?? {}).filter(([, v]) => v > 1.05).map(([c]) => c)))];
  if (dear.length) out.push({ icon: 'coin', text: `Sell in ${dear.slice(0, 2).map(cap).join(', ')}`, tone: 'good' });
  const cheap = [...new Set(on.flatMap((e) => Object.entries(e.cityBuy ?? {}).filter(([, v]) => v < 1).map(([c]) => c)))];
  if (cheap.length) out.push({ icon: 'tag', text: `Buy cheap in ${cheap.slice(0, 2).map(cap).join(', ')}`, tone: 'good' });
  const shut = [...new Set(on.flatMap((e) => e.closed ?? []))];
  if (shut.length) out.push({ icon: 'lock', text: `Shut: ${shut.map(cap).join(', ')}`, tone: 'bad' });
  const danger = [...new Set(on.flatMap((e) => e.danger ?? []))];
  if (danger.length) out.push({ icon: 'sword', text: `Soldiers: ${danger.slice(0, 2).map(cap).join(', ')}`, tone: 'bad' });
  if (next) out.push({ icon: 'calendar', text: `${next.when}: ${next.text.split(/[:.,]/)[0].slice(0, 46)}`, tone: 'info' });
  return out.slice(0, 5);
}
const NAMES: Record<string, string> = { portsaid: 'Port Said', giza: 'Giza' };
const cap = (id: string) => NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);

export function paperFor(day: number, extras: { bills?: boolean; commissions?: { label: string; until?: number }[] } = {}): Paper {
  const starting = eventsStarting(day).sort((a, b) => weight(b) - weight(a));
  const ongoing = eventsOn(day).filter((e) => e.from < day).sort((a, b) => b.from - a.from);
  // the day's real news from the wires: Egypt first, then the world
  const wires: Article[] = wiresOn(dateOfDay(day)).map((w2, i) => ({ id: `w${day}-${i}`, kind: 'wire' as const, headline: w2.head, body: w2.body, eg: w2.eg }));
  const realStart = starting.filter((e) => !e.surprise);
  const lead: Article = realStart[0] ? article(realStart[0]) : wires.length ? { ...wires[0], ...(wires[0].eg ? { img: pick(FILLER_IMG, day * 9.1) } : {}) } : starting[0] ? article(starting[0]) : ongoing.find((e) => day - e.from <= 2) ? { ...article(ongoing.find((e) => day - e.from <= 2)!), headline: `${article(ongoing.find((e) => day - e.from <= 2)!).headline}: The Latest` } : { id: `f${day}`, kind: 'filler' as const, ...pick(FILLER, day * 1.3), img: pick(FILLER_IMG, day * 9.1) };
  const more: Article[] = [...wires.filter((x) => x.id !== lead.id), ...starting.filter((e) => e.id !== lead.id).map(article)].slice(0, 5);
  // only when the wires are silent: two short items to fill the page, never the lead again
  for (let i = 0; !wires.length && more.length < 3 && i < 6; i++) {
    const f = pick(FILLER, day * 2.7 + i * 5.3);
    if (f.headline !== lead.headline && !more.some((m) => m.headline === f.headline)) more.push({ id: `f${day}-${i}`, kind: 'filler', ...f });
  }
  // long-running stories get a line of what they mean for the trade
  const still = ongoing.filter((e) => e.id !== lead.id).slice(0, 4).map((e) => ({ name: e.name, advice: (e.surprise ? e.advice : EVENT_NEWS[e.id]?.advice) ?? e.text }));
  // the fixtures of the coming fortnight
  const comingUp: Paper['comingUp'] = [];
  for (const e of EVENTS) {
    const inDays = e.from - day;
    if (inDays > 0 && inDays <= 14 && FORESEEN.has(e.id)) comingUp.push({ when: inDays === 1 ? 'Tomorrow' : `In ${inDays} days`, text: EVENT_NEWS[e.id]?.comingUp ?? e.name });
  }
  for (const { h, d } of upcomingGrandSales(day, 7)) if (d > day) comingUp.push({ when: d - day === 1 ? 'Tomorrow' : `In ${d - day} days`, text: `${h.displayName} holds a sale in ${cap(h.city)}.` });
  if (extras.bills) comingUp.push({ when: 'On the 1st', text: 'The month\'s rent, dues and household bill fall due.' });
  for (const c of extras.commissions ?? []) if (c.until && c.until >= day) comingUp.push({ when: c.until === day ? 'Today' : `By day ${c.until}`, text: `Commission: ${c.label}.` });
  comingUp.sort((a, b) => num(a.when) - num(b.when));
  const trade = tradeNotes(day);
  for (const ru of rumoursOn(day).filter((x) => x.kind !== 'event').slice(0, 3)) trade.push(ru.text);
  const month = dateOfDay(day).getUTCMonth() + 1;
  const sand = eventsOn(day).some((e) => e.surprise === 'khamsin');
  const weather = sand ? pick(KHAMSIN, day) : pick(WEATHER[month] ?? WEATHER[1], day * 3.1);
  const shipping = pick(SHIPPING, day * 4.3).replace('{ship}', pick(SHIPS, day * 5.7)).replace('{from}', pick(PORTS, day * 6.1));
  const ad = pick(ADS, day * 7.7);
  let ad2 = pick(ADS, day * 8.9);
  if (ad2.title === ad.title) ad2 = ADS[(ADS.indexOf(ad) + 1) % ADS.length];
  return { day, number: 1850 + day, date: dateLine(day), lead, more, still, comingUp: comingUp.slice(0, 6), trade: trade.slice(0, 6), glance: glanceFor(day, comingUp[0]), weather, shipping, ad, ad2 };
}
const num = (w: string) => (w === 'Today' ? 0 : w === 'Tomorrow' ? 1 : w.startsWith('In ') ? parseInt(w.slice(3)) : w.startsWith('By day') ? 50 : 40);
