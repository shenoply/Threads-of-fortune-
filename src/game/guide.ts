// Where the player should go next, in one place, so every screen can light the way: the Map tab, the town on the
// map, the right button on the town menu, and the right marker in the streets.
import type { GameState } from './state/store';
import { openingStep } from './opening';
import { MISSIONS, MAIN_ORDER } from '../data/missions';

export interface GuideTarget {
  /** the town to be in (settlement id) */
  city?: string;
  /** the town-menu button's test id (menu-clinic, menu-guards...) */
  tile?: string;
  /** the marker in the Giza district or a city's walking streets (poi id) */
  poi?: string;
}

const OPENING_TARGET: Record<string, GuideTarget> = {
  malek: { city: 'giza', poi: 'malek', tile: 'menu-malek' },
  bilgin: { city: 'giza', poi: 'coffee' },
  guards: { city: 'giza', poi: 'guards', tile: 'menu-guards' },
  cairo: { city: 'cairo' },
  bandits: { city: 'alexandria' },
  auction: { city: 'alexandria' },
};

/** The one thing to point at now, or null. The opening comes first, then being ill, then the story mission. */
export function guideTarget(s: GameState): GuideTarget | null {
  const op = openingStep(s);
  if (op) return OPENING_TARGET[op.step.id] ?? null;
  if (s.started && (s.illnesses ?? []).length > 0 && (!s.sim || s.sim.illness || s.sim.injuries || s.ironman)) return { city: 'cairo', tile: 'menu-clinic', poi: 'clinic' };
  const activeId = MAIN_ORDER.find((id) => s.missions?.[id] === 'active');
  const target = activeId ? MISSIONS[activeId]?.target : undefined;
  return target ? { city: target } : null;
}
