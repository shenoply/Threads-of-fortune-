// Where the player should go next, in one place, so every screen can light the way: the Map tab, the town on the
// map, the right button on the town menu, and the right marker in the streets.
import type { GameState } from './state/store';
import { OPENING, openingStep } from './opening';
import { MISSIONS, MAIN_ORDER, AMBUSH_STRENGTH, strengthOf, type MissionState } from '../data/missions';
import { housesIn } from './auction/sessions';

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
  // the market, not the auction house: a sale there may be days off, and any rug from the souq will do
  auction: { city: 'alexandria', tile: 'menu-market', poi: 'souq' },
};

/** The one thing to point at now, or null. The opening comes first, then being ill, then the story mission. */
export function guideTarget(s: GameState): GuideTarget | null {
  const op = openingStep(s);
  if (op) return OPENING_TARGET[op.step.id] ?? null;
  if (s.started && (s.illnesses ?? []).length > 0 && (!s.sim || s.sim.illness || s.sim.injuries || s.ironman)) return { city: 'cairo', tile: 'menu-clinic', poi: 'clinic' };
  const activeId = MAIN_ORDER.find((id) => s.missions?.[id] === 'active');
  const ms = s as unknown as MissionState;
  // a mission that cannot be finished yet points at what is missing, not at the far town
  if (activeId === 'ambush' && strengthOf(ms) < AMBUSH_STRENGTH) return { tile: 'menu-guards', poi: 'guards' };
  if (activeId === 'alexandria') return { city: 'alexandria', tile: 'menu-market', poi: 'souq' };
  if (activeId === 'rival') return { city: 'giza', poi: 'stall' };
  // Farid is in Damascus's People; the palace is the town menu's court tile
  if (activeId === 'farid') return { city: 'damascus', tile: 'menu-people' };
  if (activeId === 'warrant') return { city: 'alexandria', tile: 'menu-court' };
  // the second court: Amman's Emir from reputation 20, King Fuad in Cairo from 25
  if (activeId === 'warrant2') return { city: (s.reputation ?? 0) >= 25 ? 'cairo' : 'amman', tile: 'menu-court' };
  // any town's sale rooms will do: the one you are in if it has them, else Cairo's
  if (activeId === 'auction') return { city: s.world.at && housesIn(s.world.at).length ? s.world.at : 'cairo', tile: 'menu-houses' };
  const target = activeId ? MISSIONS[activeId]?.target : undefined;
  return target ? { city: target } : null;
}

export interface ObjectiveLine {
  text: string;
  /** the button's label, '' for none */
  btn: string;
  /** where it goes: an opening step's or mission's target (App's chapterGo), 'stall' or 'stock' */
  go: string;
  /** "Step n of m" during the opening */
  n?: number;
  of?: number;
}

/** What the objective bar says now, for screens that cover it (a town's panel): the opening step, else the mission. */
export function objectiveLine(s: GameState): ObjectiveLine | null {
  const op = openingStep(s);
  if (op) {
    // Rashid's errand has no button until he has actually given it (as in the objective bar)
    const btn = op.step.id === 'auction' && s.missions?.alexandria !== 'active' && s.world.at !== 'alexandria' ? '' : op.step.btn;
    // once in Alexandria the way on is its market, not the map
    if (op.step.id === 'auction' && s.world.at === 'alexandria') return { text: op.step.text(s), btn: 'To the market', go: 'market', n: op.n + 1, of: OPENING.length };
    return { text: op.step.text(s), btn, go: op.step.go, n: op.n + 1, of: OPENING.length };
  }
  const activeId = MAIN_ORDER.find((id) => s.missions?.[id] === 'active');
  const m = activeId ? MISSIONS[activeId] : undefined;
  if (!m) return null;
  const ms = s as unknown as MissionState;
  const nx = m.next?.(ms);
  if (nx) return { text: m.hint(ms), btn: nx.btn, go: nx.go };
  return { text: m.hint(ms), btn: m.target ? (s.world.at === m.target ? 'Go' : 'Map') : '', go: m.target ?? '' };
}
