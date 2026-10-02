// Radio Giza: a morning bulletin read in English or Arabic, built from recorded pieces.
// Every piece has a key; the same keys are used to render the recordings, so text and audio always match.
import { EVENT_NEWS, SURPRISES, FILLER, WEATHER, KHAMSIN } from '../../data/news';
import { SETTLEMENTS } from '../../data/world';
import { EVENTS, eventsOn, eventsStarting, dateOfDay, type GameEvent } from '../economy/life';
import { wiresOn } from '../../data/daily1925';
import type * as ArabicData from '../../data/radioArabic';

// The Arabic texts load on demand (loadArabic) the first time the Arabic channel is tuned: they are
// most of the radio's weight and an English listener never needs them.
let CITY_AR = {} as typeof ArabicData.CITY_AR;
let AR_EVENTS = {} as typeof ArabicData.AR_EVENTS;
let AR_WEATHER = {} as typeof ArabicData.AR_WEATHER;
let AR_KHAMSIN = [] as unknown as typeof ArabicData.AR_KHAMSIN;
let AR_FIXED = {} as typeof ArabicData.AR_FIXED;
let AR_SURPRISES = {} as typeof ArabicData.AR_SURPRISES;
let AR_FILLER = [] as unknown as typeof ArabicData.AR_FILLER;
let AR_WIRES: Record<string, string> = {};
let arabic: Promise<void> | null = null;
let arabicLoaded = false;
/** fetch the Arabic texts (once); resolves when bulletin(day, 'ar') can be read */
export function loadArabic(): Promise<void> {
  arabic ??= import('../../data/radioArabic').then((m) => {
    ({ CITY_AR, AR_EVENTS, AR_WEATHER, AR_KHAMSIN, AR_FIXED, AR_SURPRISES, AR_FILLER, AR_WIRES } = m);
    arabicLoaded = true;
  });
  return arabic;
}
export const arabicReady = () => arabicLoaded;
const GAME_FIRST = Date.UTC(1925, 2, 10), GAME_LAST = Date.UTC(1926, 2, 31);
/** The real lead story of a date, as one recorded piece; grouped by month so a bulletin loads one small file. */
function wirePiece(d: Date, lang: Lang): Segment | null {
  const k = d.toISOString().slice(0, 10);
  const w = wiresOn(d)[0];
  if (!w) return null;
  const text = lang === 'ar' ? AR_WIRES[k] : `${w.head}. ${w.body}`;
  return text ? { key: `wi-${k}`, group: `w-${k.slice(0, 7)}`, text } : null;
}

export type Lang = 'en' | 'ar';
export type Group = string;
export interface Segment { key: string; group: Group; text: string }

const EN_FIXED = {
  intro: [
    'Good morning. This is Radio Giza, calling from the Pyramids Road.',
    'Radio Giza, good morning to you all. Here is the news.',
    'Hello, hello. Radio Giza calling. Ladies and gentlemen, good morning.',
    'This is Radio Giza. Good morning, merchants of Cairo.',
  ],
  outro: [
    'That is the news for today. Radio Giza wishes you good trade.',
    'This was Radio Giza. Until tomorrow, good morning.',
    'And that is all. Keep your purse close and your rugs clean. Radio Giza, signing off.',
    'Radio Giza, closing. Good day, and good bargains.',
  ],
  weekday: ['Today is Sunday,', 'Today is Monday,', 'Today is Tuesday,', 'Today is Wednesday,', 'Today is Thursday,', 'Today is Friday,', 'Today is Saturday,'],
  ordinal: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth', 'thirty-first'].map((o) => `the ${o} of`),
  month: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  year1925: 'nineteen twenty-five.',
  year1926: 'nineteen twenty-six.',
  headlines: 'Here is the news.',
  forTrade: 'And for the trade:',
  comingUp: 'In the days ahead:',
  weather: 'And now, the weather.',
  still: 'Still in the news:',
};

/** Events the town knew were coming, so the radio can mention them ahead. */
const FORESEEN = new Set(['parliament', 'ramadan', 'eid', 'balfour', 'geocongress', 'paris', 'summer', 'adha', 'nile', 'plumer', 'cotton', 'mawlid', 'badawi', 'republic', 'season', 'tut', 'jouvenel', 'mosul']);
const cityEn = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
const r = (n: number) => Math.abs(Math.sin(n * 12.9898 + 7.7) * 43758.5453) % 1;

/** A text with {city} becomes pieces: text, city, text... Each piece has its own recording. */
function split(base: string, group: Group, text: string, city: string | undefined, lang: Lang): Segment[] {
  const parts = text.split('{city}');
  const out: Segment[] = [];
  parts.forEach((p, i) => {
    const t = p.trim().replace(/^[,.]\s*/, '');
    if (t) out.push({ key: `${base}-${i}`, group, text: t });
    if (i < parts.length - 1 && city) out.push({ key: `city-${city}`, group: 'core', text: lang === 'ar' ? CITY_AR[city] ?? city : cityEn(city) });
  });
  return out;
}

const fixed = (lang: Lang) => (lang === 'ar' ? AR_FIXED : EN_FIXED);

/** Every recordable piece, for the build script. */
export function allSegments(lang: Lang): Segment[] {
  const F = fixed(lang);
  const out: Segment[] = [];
  const core = (key: string, text: string) => out.push({ key, group: 'core', text });
  F.intro.forEach((t, i) => core(`intro-${i}`, t));
  F.outro.forEach((t, i) => core(`outro-${i}`, t));
  F.weekday.forEach((t, i) => core(`wd-${i}`, t));
  F.ordinal.forEach((t, i) => core(`ord-${i}`, t));
  F.month.forEach((t, i) => core(`mon-${i}`, t));
  core('y1925', F.year1925); core('y1926', F.year1926);
  core('headlines', F.headlines); core('forTrade', F.forTrade); core('comingUp', F.comingUp); core('weather', F.weather); core('still', F.still);
  for (const s of SETTLEMENTS) core(`city-${s.id}`, lang === 'ar' ? CITY_AR[s.id] ?? s.name : s.name);
  const W = lang === 'ar' ? AR_WEATHER : WEATHER, K = lang === 'ar' ? AR_KHAMSIN : KHAMSIN;
  for (const m of Object.keys(W)) W[+m].forEach((t, i) => core(`wx-${m}-${i}`, t));
  K.forEach((t, i) => core(`kh-${i}`, t));
  for (const id of Object.keys(EVENT_NEWS)) {
    const n = EVENT_NEWS[id], a = AR_EVENTS[id];
    out.push({ key: `ev-${id}-head`, group: 'events', text: lang === 'ar' ? `${a.head}. ${a.body}` : `${n.article.headline}. ${n.article.body}` });
    out.push({ key: `ev-${id}-adv`, group: 'events', text: lang === 'ar' ? a.advice : n.advice });
    out.push({ key: `ev-${id}-cu`, group: 'events', text: lang === 'ar' ? a.comingUp : n.comingUp });
  }
  for (const s of SURPRISES) {
    const a = AR_SURPRISES[s.id];
    const head = lang === 'ar' ? `${a.head}. ${a.body}` : `${s.article.headline}. ${s.article.body}`;
    split(`su-${s.id}-head`, 'surprises', head, undefined, lang).forEach((x) => out.push(x));
    split(`su-${s.id}-adv`, 'surprises', lang === 'ar' ? a.advice : s.advice, undefined, lang).forEach((x) => out.push(x));
  }
  for (let t = GAME_FIRST; t <= GAME_LAST; t += 864e5) { const w = wirePiece(new Date(t), lang); if (w) out.push(w); }
  FILLER.forEach((f, i) => out.push({ key: `fi-${i}`, group: 'filler', text: lang === 'ar' ? `${AR_FILLER[i].head}. ${AR_FILLER[i].body}` : `${f.headline}. ${f.body}` }));
  // de-duplicate by key
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)));
}

function eventPieces(e: GameEvent, lang: Lang, part: 'head' | 'adv' | 'cu'): Segment[] {
  if (e.surprise) {
    const def = SURPRISES.find((s) => s.id === e.surprise)!;
    const a = AR_SURPRISES[def.id];
    if (part === 'cu') return [];
    const text = part === 'head' ? (lang === 'ar' ? `${a.head}. ${a.body}` : `${def.article.headline}. ${def.article.body}`) : lang === 'ar' ? a.advice : def.advice;
    return split(`su-${def.id}-${part}`, 'surprises', text, e.city, lang);
  }
  if (!EVENT_NEWS[e.id]) return [];
  const n = EVENT_NEWS[e.id], a = AR_EVENTS[e.id];
  const text = part === 'head' ? (lang === 'ar' ? `${a.head}. ${a.body}` : `${n.article.headline}. ${n.article.body}`) : part === 'adv' ? (lang === 'ar' ? a.advice : n.advice) : lang === 'ar' ? a.comingUp : n.comingUp;
  return [{ key: `ev-${e.id}-${part}`, group: 'events', text }];
}

/** Where the news itself starts: straight after "Here are the headlines" (the greeting and the date come first). */
export const newsStart = (segs: Segment[]) => { const i = segs.findIndex((s) => s.key === 'headlines'); return i < 0 ? 0 : i + 1; };

/** Today's bulletin, in order. */
export function bulletin(day: number, lang: Lang): Segment[] {
  if (lang === 'ar' && !arabicLoaded) return [];
  const F = fixed(lang);
  const out: Segment[] = [];
  const core = (key: string, text: string) => out.push({ key, group: 'core', text });
  const d = dateOfDay(day);
  const ii = Math.floor(r(day) * 4);
  core(`intro-${ii}`, F.intro[ii]);
  core(`wd-${d.getUTCDay()}`, F.weekday[d.getUTCDay()]);
  core(`ord-${d.getUTCDate() - 1}`, F.ordinal[d.getUTCDate() - 1]);
  core(`mon-${d.getUTCMonth()}`, F.month[d.getUTCMonth()]);
  if (d.getUTCFullYear() === 1925) core('y1925', F.year1925); else core('y1926', F.year1926);
  core('headlines', F.headlines);
  // the real news first: the day's lead from the wires, Egypt before the world
  const wire = wirePiece(d, lang);
  if (wire) out.push(wire);
  const starting = eventsStarting(day).filter((e) => (e.surprise || EVENT_NEWS[e.id])).slice(0, 2);
  if (starting.length) {
    for (const e of starting) {
      // a real event gets its full story; market talk only its word for the trade
      if (!e.surprise) out.push(...eventPieces(e, lang, 'head'));
      const adv = eventPieces(e, lang, 'adv');
      if (adv.length) { core('forTrade', F.forTrade); out.push(...adv); }
    }
  } else if (!wire) {
    const i = Math.floor(r(day * 2.3) * FILLER.length);
    out.push({ key: `fi-${i}`, group: 'filler', text: lang === 'ar' ? `${AR_FILLER[i].head}. ${AR_FILLER[i].body}` : `${FILLER[i].headline}. ${FILLER[i].body}` });
  }
  const ongoing = eventsOn(day).filter((e) => e.from < day && (e.surprise || EVENT_NEWS[e.id])).sort((a, b) => b.from - a.from).slice(0, 2);
  if (ongoing.length) {
    core('still', F.still);
    for (const e of ongoing) out.push(...eventPieces(e, lang, 'adv'));
  }
  const soon = EVENTS.filter((e) => FORESEEN.has(e.id) && e.from > day && e.from - day <= 10).slice(0, 2);
  if (soon.length) {
    core('comingUp', F.comingUp);
    for (const e of soon) out.push(...eventPieces(e, lang, 'cu'));
  }
  core('weather', F.weather);
  const month = d.getUTCMonth() + 1;
  if (eventsOn(day).some((e) => e.surprise === 'khamsin')) { const k = Math.floor(r(day * 3) * 3); core(`kh-${k}`, (lang === 'ar' ? AR_KHAMSIN : KHAMSIN)[k]); }
  else { const w = Math.floor(r(day * 5) * 3); core(`wx-${month}-${w}`, (lang === 'ar' ? AR_WEATHER : WEATHER)[month][w]); }
  const oo = Math.floor(r(day * 7) * 4);
  core(`outro-${oo}`, F.outro[oo]);
  return out;
}
