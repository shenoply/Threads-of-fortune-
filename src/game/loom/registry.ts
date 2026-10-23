// Carpets of your own design join the rug register as types of their own, so the stall, the
// stockroom and the buyers treat them like any other carpet. They are registered from the save
// before anything reads it, and again when a new one is commissioned.
import { RUGS } from '../../data/rugs';
import { rugTypeOf, type Design } from './design';
import { BORDER, FIELD, GUARD, KNOTS, LAYOUT, MEDALLION, PALETTES, SIZES, WOOL } from './patterns';

const ids = <T extends { id: string }>(l: T[]) => new Set(l.map((x) => x.id));
const OK = { size: ids(SIZES), layout: ids(LAYOUT), palette: ids(PALETTES), field: ids(FIELD), medallion: ids(MEDALLION), band: ids(BORDER), guard: ids(GUARD), knots: ids(KNOTS), wool: ids(WOOL) };

/** a design read from a save: every choice one the pattern book knows */
export function validDesign(d: unknown): d is Design {
  if (!d || typeof d !== 'object') return false;
  const x = d as Record<string, unknown>;
  if (typeof x.id !== 'string' || !/^own-\d+$/.test(x.id) || typeof x.name !== 'string') return false;
  for (const [k, set] of Object.entries(OK)) if (typeof x[k] !== 'string' || !set.has(x[k] as string)) return false;
  if (x.orient !== undefined && x.orient !== 'side' && x.orient !== 'up') return false;
  return ['ground', 'ground2', 'main', 'accent', 'light', 'border'].every((k) => Number.isInteger(x[k]) && (x[k] as number) >= 0 && (x[k] as number) < 8);
}

export function registerDesigns(list: unknown) {
  if (!Array.isArray(list)) return;
  for (const d of list) if (validDesign(d)) RUGS[d.id] = rugTypeOf(d);
}

/** from the raw save, before the game state is built from it */
export function registerFromSave(key: string) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return;
    registerDesigns(JSON.parse(raw)?.state?.loom?.designs);
  } catch { /* an unreadable save is dealt with elsewhere */ }
}
