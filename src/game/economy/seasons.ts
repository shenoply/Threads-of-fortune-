// The seasons at work in the game: who comes to the stall, how long they haggle, what a feast sends
// them looking for, and the sand a khamsin leaves in the stock. The dates are in calendar1925.ts.
import { eventsOn, laneDay } from './life';
import { CALLERS, type CallerGroup } from './calendar1925';
import { RUGS } from '../../data/rugs';
import type { Condition, RugItem } from '../types';

/** How much likelier (or rarer) this buyer is to come by the stall today. */
export function seasonCallers(day: number, buyerId: string): number {
  let m = 1;
  for (const e of eventsOn(day)) for (const [g, k] of Object.entries(e.callers ?? {}) as [CallerGroup, number][]) if (CALLERS[g]?.includes(buyerId)) m *= k;
  return m;
}

/** What a feast has stall buyers looking for, if anything. */
export function stallWant(day: number) {
  return eventsOn(day).find((e) => e.want)?.want;
}

type EncLike = { patience: number; log: { push: (l: { speaker: 'system'; text: string }) => unknown }; want?: { typeIds?: string[]; traits?: string[]; mult: number; label: string } };
/** The season at the start of a haggle at the Giza stall: a khamsin or a Mawlid crowd shortens tempers, a feast sets buyers looking for one kind of rug. */
export function seasonAtStall(enc: EncLike, day: number) {
  const lane = laneDay(day);
  if (lane.patience && lane.patience !== 1) {
    enc.patience = Math.max(10, Math.round(enc.patience * lane.patience));
    const sand = eventsOn(day).some((e) => e.dust);
    enc.log.push({ speaker: 'system', text: sand ? 'Sand on the wind. Your buyer wants to be indoors and will not haggle for long.' : 'The crowds are loud and pressing. Your buyer will not haggle for long.' });
  }
  const want = stallWant(day);
  if (want) {
    enc.want = want;
    enc.log.push({ speaker: 'system', text: `It is the feast. Buyers are looking for ${want.label} and will pay more for one.` });
  }
}

/** Is a khamsin blowing today? */
export const dustToday = (day: number) => eventsOn(day).find((e) => e.dust);

// ---------- Sand in the stock ----------
const DUSTED: Partial<Record<Condition, Condition>> = { Excellent: 'Good', Good: 'Worn' };
type DustState = {
  started: boolean; day: number; inventory: RugItem[]; journal: { day: number; text: string; kind?: string }[];
  world: { at: string | null; x: number; y: number }; khamsinUntil?: number; tutorial: { done: boolean }; seasonsSeen?: string[];
};
/** Once in each khamsin: a rug out in the open loses a little condition. At the Giza stall it is one
 *  on display (rugs packed in the store are safe); away from Giza, one carried rug, unless the
 *  khamsin kit is packed. Outside Egypt nothing happens. Returns the patch, or null. */
export function khamsinDust(s: DustState, egypt: (x: number, y: number, at: string | null) => boolean): Record<string, unknown> | null {
  if (!s.started || !s.tutorial.done) return null;
  const e = dustToday(s.day);
  if (!e) return null;
  const seen = s.seasonsSeen ?? [];
  if (seen.includes(e.id)) return null;
  const mark = { seasonsSeen: [...seen.slice(-40), e.id] };
  if (!egypt(s.world.x, s.world.y, s.world.at)) return mark;
  const atStall = s.world.at === 'giza';
  if (!atStall && (s.khamsinUntil ?? 0) >= s.day) return { ...mark, journal: [...s.journal, { day: s.day, text: 'A khamsin on the road. The khamsin kit\'s gauze kept the sand off the bales.' }] };
  const open = s.inventory.filter((i) => !i.stored && i.restoringUntil == null && DUSTED[i.condition]);
  if (!open.length) return mark;
  const hit = open[e.from % open.length];
  const to = DUSTED[hit.condition]!;
  const name = RUGS[hit.typeId]?.name ?? 'rug';
  const text = atStall
    ? `The khamsin blew sand into the ${name} on display. It is ${to.toLowerCase()} now. Rugs packed in the store are safe.`
    : `The khamsin drove sand into the ${name} on the road. It is ${to.toLowerCase()} now.`;
  return {
    ...mark,
    inventory: s.inventory.map((i) => (i.uid === hit.uid ? { ...i, condition: to, notes: [...i.notes, 'Sand from the khamsin in the pile.'] } : i)),
    journal: [...s.journal, { day: s.day, text }],
  };
}
