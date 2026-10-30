// Keeping the books small over the years: the journal keeps its last few hundred entries in full and
// folds the older ones into one entry a month; the whereabouts keep the last two months, and the first
// day at each place (what the titles and the Book read from them). Pure functions.
import { dateOfDay, monthName } from '../economy/life';

type Entry = { day: number; text: string; kind?: string };

/** entries kept in full */
export const JOURNAL_KEEP = 300;
/** fold only once this many have piled up, so it happens now and then, not every night */
const FOLD_AT = JOURNAL_KEEP + 60;
export const BRIEF = 'In brief, ';

const monthKey = (day: number) => { const d = dateOfDay(day); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const monthLabel = (day: number) => `${monthName(day)} ${dateOfDay(day).getUTCFullYear()}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function brief(month: Entry[]): Entry {
  const first = month[0].day;
  const missions = month.filter((e) => e.kind === 'mission' && /^(Mission complete|Goal reached|New main mission)/.test(e.text)).map((e) => e.text.replace(/\.$/, ''));
  const towns = [...new Set(month.map((e) => /^Arrived in (.+)\.$/.exec(e.text)?.[1]).filter(Boolean) as string[])];
  const sales = month.reduce((n, e) => n + Number(/^Closed the stall\. (\d+) sale/.exec(e.text)?.[1] ?? 0), 0);
  // the times (era.ts): the shifts in the trade that month, by name
  const times = month.filter((e) => e.kind === 'times' && e.text.startsWith('The times: ')).map((e) => e.text.slice(11).split('.')[0]);
  const parts: string[] = [];
  if (missions.length) parts.push(`${missions.slice(0, 4).join('. ')}.`);
  if (times.length) parts.push(`The times: ${list(times.slice(0, 3))}.`);
  if (towns.length) parts.push(`Went to ${list(towns.slice(0, 8))}${towns.length > 8 ? ' and other towns' : ''}.`);
  if (sales) parts.push(`${sales} sale${sales === 1 ? '' : 's'} at the stall.`);
  const rest = month.length - missions.length - times.length;
  parts.push(rest > 0 ? `${rest} ${missions.length ? 'other ' : ''}entr${rest === 1 ? 'y' : 'ies'} for the month are no longer kept in full.` : '');
  return { day: first, text: `${BRIEF}${monthLabel(first)}: ${parts.filter(Boolean).join(' ')}`, kind: 'quiet' };
}

/** The journal with its older entries folded into monthly summaries (the same array when nothing is due). */
export function foldJournal<T extends Entry>(journal: T[]): T[] {
  if (journal.length <= FOLD_AT) return journal;
  let cut = journal.length - JOURNAL_KEEP;
  // whole months only: the month of the oldest entry kept stays in full
  const keepMonth = monthKey(journal[cut].day);
  while (cut > 0 && monthKey(journal[cut - 1].day) === keepMonth) cut--;
  const old = journal.slice(0, cut);
  const out: Entry[] = [];
  let group: Entry[] = [];
  const flush = () => { if (group.length) out.push(brief(group)); group = []; };
  for (const e of old) {
    if (e.text.startsWith(BRIEF)) { flush(); out.push(e); continue; }
    if (group.length && monthKey(group[0].day) !== monthKey(e.day)) flush();
    group.push(e);
  }
  flush();
  return [...out, ...journal.slice(cut)] as T[];
}

/** Whereabouts: the last 60 days, plus the first day at every place, plus any day asked to be kept. */
export function trimWhereabouts(where: Record<number, string> | undefined, day: number, keep: number[] = []): Record<number, string> | undefined {
  if (!where) return where;
  const days = Object.keys(where).map(Number);
  if (days.length <= 75) return where;
  const firsts = new Map<string, number>();
  for (const d of days.sort((a, b) => a - b)) if (!firsts.has(where[d])) firsts.set(where[d], d);
  const hold = new Set([...firsts.values(), ...keep]);
  const out: Record<number, string> = {};
  for (const d of days) if (d > day - 60 || hold.has(d)) out[d] = where[d];
  return out;
}

/** the last day before `before` the merchant was at this place, by the whereabouts (undefined if none) */
export function lastAt(where: Record<number, string> | undefined, id: string, before: number): number | undefined {
  let best: number | undefined;
  for (const k in where ?? {}) { const d = +k; if (d < before && where![d] === id && (best === undefined || d > best)) best = d; }
  return best;
}
