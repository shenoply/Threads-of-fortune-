// What a dominoes regular tells you over the last glass of tea: the bazaar's real talk of prices in the
// towns he hears from (the same rumours that move the dealers' bids, economy/life.ts), word of trouble
// on a road, or one of his own stories about the dealers and the roads.
import { REGULARS } from '../../data/dominoRegulars';
import { rumoursOn, eventsOn } from '../economy/life';

/** the n-th thing he tells you (n counts what he has told you before), skipping what you have heard */
export function regularTalk(regId: string, day: number, n: number, heard: string[]): string {
  const r = REGULARS[regId];
  if (!r) return '';
  const fresh = (x: string) => !heard.includes(x);
  const prices = rumoursOn(day).filter((x) => x.kind !== 'event' && x.sid && r.hears.includes(x.sid)).map((x) => x.text).filter(fresh);
  const trouble = eventsOn(day).filter((e) => e.danger?.some((d) => r.hears.includes(d))).map((e) => `${e.name}. ${e.text}`).filter(fresh);
  const own = r.talk.filter(fresh);
  // a road in trouble first, then prices and his own stories by turns
  const order = trouble.length ? [trouble, prices, own] : n % 2 === 0 ? [prices, own] : [own, prices];
  for (const list of order) if (list.length) return list[0];
  // he has told you everything: the stories come round again
  return r.talk[n % r.talk.length];
}

/** how well he knows you, in a word */
export const friendWord = (f: number) => (f >= 6 ? 'a friend' : f >= 3 ? 'knows you' : f >= 1 ? 'has played you' : 'a stranger');
/** a friend tells you what he knows even when he wins */
export const FRIEND_TALKS = 6;
