// Clothes moth in summer stock. In the Cairo heat, June to September, moth lays its eggs in wool kept
// dark and still: bales in a store, rugs rolled at the back of a stall. Dealers aired their stock,
// hung it over a rope and beat it with a cane beater, or kept it in a camphor-wood chest. Silk is
// attacked less, and a cotton foundation gives the larvae less to live on. Moth takes a rug down one
// step of condition at most once a month, and only after a warning.
import type { Condition, RugItem } from '../types';
import type { GameState } from '../state/store';
import { RUGS } from '../../data/rugs';
import { fmt } from '../economy/money';

/** June, July, August and September (0-based months) */
export const MOTH_MONTHS = [5, 6, 7, 8];
export const AIR_DAYS = 14;
export const AIR_MINUTES = 60;
/** a porter's boy to help hang and beat the rugs */
export const AIR_COST = 2;
/** the stall upgrade that keeps rugs left at the Giza stall safe */
export const CAMPHOR = 'camphor';
/** nights of grace after a warning before moth can do harm */
export const MOTH_GRACE = 2;
/** chance a night, for one unprotected wool rug, before it has been hit this month */
export const MOTH_NIGHT = 0.025;

const dateOf = (day: number) => new Date(Date.UTC(1925, 2, 9 + day));
export const monthKey = (day: number) => { const d = dateOf(day); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
export const mothSeason = (day: number) => MOTH_MONTHS.includes(dateOf(day).getUTCMonth());
const short = (day: number) => { const d = dateOf(day); return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`; };

/** how much moth likes this rug, against a plain wool rug (1) */
export function mothAppetite(i: RugItem) {
  const t = RUGS[i.typeId];
  if (!t) return 0;
  let m = 1;
  if (t.traits.includes('silk')) m *= 0.5;
  if (/cotton/i.test(t.material) || /cotton/i.test(t.weave.foundation)) m *= 0.75;
  if (t.traits.includes('flatweave')) m *= 0.8;
  if (i.condition === 'Dirty') m *= 1.5;
  return m;
}

export type MothGuard = 'proofed' | 'aired' | 'chest' | 'display' | 'restorer' | null;
type MothState = Pick<GameState, 'day' | 'upgrades' | 'world' | 'inventory' | 'stallShut'>;
/** the rugs hanging at the open Giza stall are in light and air every day */
export function onDisplay(s: MothState) {
  if (s.world.at !== 'giza' || s.stallShut) return [];
  return s.inventory.filter((i) => !i.restoringUntil && !i.reservedFor).slice(0, 3).map((i) => i.uid);
}
/** what keeps moth off this rug tonight, or null */
export function mothGuard(i: RugItem, s: MothState, day = s.day, shown = onDisplay(s)): MothGuard {
  if (i.mothproof) return 'proofed';
  if (i.restoringUntil) return 'restorer';
  if ((i.airedUntil ?? 0) >= day) return 'aired';
  if (i.stored && s.upgrades.includes(CAMPHOR)) return 'chest';
  if (shown.includes(i.uid)) return 'display';
  return null;
}
export const GUARD_WORDS: Record<Exclude<MothGuard, null>, string> = {
  proofed: 'Moth-proofed', aired: 'Aired', chest: 'In the camphor chest', display: 'Hanging at the stall', restorer: 'At the restorer',
};

const STEP: Record<Condition, Condition | null> = { Excellent: 'Good', Good: 'Worn', Worn: 'Damaged', Dirty: 'Damaged', Damaged: null };

/** One night's moth: a warning first, then at most a step of condition a month on rugs left unprotected. */
export function mothNight(s: GameState, day: number, rnd: () => number = Math.random): { patch: Partial<GameState>; notes: string[] } {
  if (!mothSeason(day) || !s.inventory.length) return { patch: {}, notes: [] };
  const st = { ...s, day };
  const shown = onDisplay(st);
  const open = s.inventory.filter((i) => mothAppetite(i) > 0 && STEP[i.condition] && !mothGuard(i, st, day, shown));
  if (!open.length) return { patch: {}, notes: [] };
  const warned = s.moths?.warned;
  // a fresh warning at the start of each summer, and again when an airing wears off
  const lapsed = s.inventory.some((i) => i.airedUntil === day - 1);
  if (warned === undefined || day - warned > 130 || (lapsed && day - warned > MOTH_GRACE)) {
    const text = lapsed && warned !== undefined && day - warned <= 130
      ? `Moths in the bales: the airing has worn off. ${open.length === 1 ? 'One rug is' : `${open.length} rugs are`} open to moth again. Air your stock (Stock, an hour).`
      : `Moths in the bales: air your stock. In the summer heat moth lays its eggs in wool kept dark and still. Air and beat the rugs (Stock, an hour), or keep a camphor-wood chest at the stall.`;
    return { patch: { moths: { ...(s.moths ?? {}), warned: day }, journal: [...s.journal, { day, text, kind: 'stall' }] }, notes: [text] };
  }
  if (day - warned < MOTH_GRACE) return { patch: {}, notes: [] };
  const key = monthKey(day);
  const hit: { name: string; to: Condition }[] = [];
  const month = dateOf(day).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  const inventory = s.inventory.map((i) => {
    if (!open.includes(i) || i.mothMonth === key || rnd() >= MOTH_NIGHT * mothAppetite(i)) return i;
    const to = STEP[i.condition]!;
    hit.push({ name: RUGS[i.typeId]?.name ?? 'rug', to });
    return { ...i, condition: to, mothMonth: key, notes: [...i.notes, `Moth got into the pile in ${month}: ${i.condition} to ${to}.`] };
  });
  if (!hit.length) return { patch: {}, notes: [] };
  const first = hit[0];
  const text = `Moths got into your stock overnight: the ${first.name} is now ${first.to}${hit.length > 1 ? `, and ${hit.length - 1} more rug${hit.length > 2 ? 's' : ''} lost a step` : ''}. Air and beat the rest (Stock), or buy a camphor-wood chest.`;
  return { patch: { inventory, journal: [...s.journal, { day, text, kind: 'stall' }] }, notes: [text] };
}

/** Hang the rugs you have with you over a rope and beat them: an hour, a couple of piastres. */
export function airRugsPatch(s: GameState): { patch: Partial<GameState>; text: string } | { error: string } {
  if (!s.world.at) return { error: 'There is nowhere to hang rugs on the road. Air them in a town.' };
  if (s.cash < AIR_COST) return { error: `A porter's boy wants ${fmt(AIR_COST)} to help. You have ${fmt(s.cash)}.` };
  const here = (i: RugItem) => !i.restoringUntil && (s.world.at === 'giza' || !i.stored);
  const n = s.inventory.filter(here).length;
  if (!n) return { error: 'You have no rugs here to air.' };
  const until = s.day + AIR_DAYS;
  const inventory = s.inventory.map((i) => (here(i) ? { ...i, airedUntil: until } : i));
  const quiet = mothSeason(s.day) ? '' : ' There is little moth about until June, but it does no harm.';
  const text = `You and a porter's boy hang ${n === 1 ? 'the rug' : `${n} rugs`} over a rope in the sun and beat them with a cane beater. Safe from moth until ${short(until)}.${quiet}`;
  return {
    text,
    patch: {
      cash: s.cash - AIR_COST,
      inventory,
      ledger: [...s.ledger, { day: s.day, kind: 'expense', label: 'A boy to help air the rugs', amount: -AIR_COST }],
      journal: [...s.journal, { day: s.day, text: `Aired and beat ${n === 1 ? 'one rug' : `${n} rugs`} against moth.`, kind: 'quiet' }],
    },
  };
}

/** a line for the Stock screen: how the summer stands for your rugs */
export function mothStatus(s: GameState) {
  const season = mothSeason(s.day);
  const shown = onDisplay(s);
  const open = s.inventory.filter((i) => mothAppetite(i) > 0 && STEP[i.condition] && !mothGuard(i, s, s.day, shown));
  return { season, open: open.map((i) => i.uid), soon: !season && MOTH_MONTHS.includes(dateOf(s.day + 14).getUTCMonth()) };
}
export const airedUntilWord = (day: number) => short(day);
