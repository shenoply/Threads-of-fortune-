// One card at a time. Arriving somewhere can bring several things at once (the frontier post, a fall in
// the street, a mission's scene, a buyer who wants a packed rug, the news, a level gained); instead of
// stacking them, each waits its turn behind the ones that matter more, and the short notices wait until
// no card and no fight is on screen.
import { useSyncExternalStore } from 'react';

/** the cards, most important first */
export const CARD_ORDER = ['border', 'rescue', 'scene', 'job'] as const;
export type CardKind = (typeof CARD_ORDER)[number];

interface CardState {
  border?: unknown;
  rescue?: unknown;
  missionScene?: unknown;
  jobOffer?: { city?: string } | null;
  world: { at: string | null };
}

/** which cards want the screen now */
export function cardsUp(s: CardState): CardKind[] {
  const up: CardKind[] = [];
  if (s.border) up.push('border');
  if (s.rescue) up.push('rescue');
  if (s.missionScene) up.push('scene');
  if (s.jobOffer && s.jobOffer.city === s.world.at) up.push('job');
  return up;
}

/** a card waits while one before it in CARD_ORDER is up; a notice (no kind) waits for every card */
export function waitsTurn(s: CardState, mine?: CardKind): boolean {
  const up = cardsUp(s);
  if (!mine) return up.length > 0 || held();
  const i = CARD_ORDER.indexOf(mine);
  return up.some((k) => CARD_ORDER.indexOf(k) < i);
}

// ---- holds: a road fight (or anything else full screen) keeps the notices back until it is over ----
const holds = new Set<string>();
const subs = new Set<() => void>();
let version = 0;
export const held = () => holds.size > 0;
export function setHold(key: string, on: boolean) {
  const had = holds.has(key);
  if (on === had) return;
  if (on) holds.add(key); else holds.delete(key);
  version++;
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** re-renders when a hold starts or ends; true while one is on */
export function useHeld(): boolean {
  useSyncExternalStore(subscribe, () => version, () => version);
  return held();
}
