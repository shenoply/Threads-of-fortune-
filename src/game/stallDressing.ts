// Dress your stall: the spots on the stall's shelves, walls and counter, and what stands in each.
// Every piece is a full 1536x1024 cut-out painted for the old Giza stall; each stall's painting says
// where each spot is in it (game/stallScenes.ts), and the cut-out is scaled and moved there. Nothing here
// changes by itself: a spot holds what the player put there (or his father's things, on a new stall)
// until he changes it. Only Saffron moves about, and never onto a spot that holds something.
import { DRESSING, DRESSING_BY_ID, type DressingPiece } from '../data/shops';
import { stallSceneFor, unpaintedSpot, lookUps } from './stallScenes';

export interface Spot {
  id: string;
  /** plain words for the spot */
  label: string;
  /** where it was on the old Giza painting the cut-outs were made for, in % of the 1536x1024 canvas:
   *  [left, top, right, bottom] (each stall now places its spots itself: game/stallScenes.ts) */
  rect: [number, number, number, number];
}

/** In drawing order: the wall hangings behind the shelf pieces, the hooks over them, then the room. */
export const SPOTS: Spot[] = [
  { id: 'above-shelves', label: 'The wall over the shelves', rect: [29.5, 4.1, 48, 20.7] },
  { id: 'top-left', label: 'Top shelf, left', rect: [26.4, 9, 32.4, 21.7] },
  { id: 'top-mid', label: 'Top shelf, middle', rect: [35, 7.8, 43.2, 24] },
  { id: 'top-right', label: 'Top shelf, right', rect: [45.2, 7.9, 51.2, 20.6] },
  { id: 'mid-mid', label: 'Middle shelf', rect: [35.4, 24.3, 43.2, 33.9] },
  { id: 'bottom-left', label: 'Bottom shelf, left', rect: [25.3, 35.8, 39, 46.8] },
  { id: 'bottom-right', label: 'Bottom shelf, right', rect: [39.3, 34, 51.7, 47.3] },
  { id: 'hooks', label: 'The hooks under the beam', rect: [27, 0.8, 51, 8] },
  { id: 'wall', label: 'The wall by the rugs', rect: [2, 52, 20, 70] },
  { id: 'floor', label: 'The floor', rect: [10, 66, 56, 76] },
  { id: 'table', label: 'The brass table', rect: [27, 47.5, 42, 57] },
  { id: 'seat', label: 'By the cushion', rect: [39, 57, 53, 69] },
  { id: 'curtain', label: 'The opening', rect: [76, 9, 81.5, 66] },
  { id: 'sign', label: 'Over the opening', rect: [56, 4, 76, 11] },
];
export const SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(SPOTS.map((s) => [s.id, s]));
export const piecesFor = (spot: string): DressingPiece[] => DRESSING.filter((d) => d.spot === spot);

/** What a new stall has: your father's clock, his photograph and his books. */
export const DEFAULT_SPOTS: Record<string, string> = Object.fromEntries(DRESSING.filter((d) => d.father).map((d) => [d.spot, d.id]));

/** what stands in each spot (a spot missing or '' is empty) */
export const spotsOf = (s: { stallSpots?: Record<string, string> }): Record<string, string> => s.stallSpots ?? DEFAULT_SPOTS;
/** the spots this stall has room for (a borrowed corner has few; each stall's painting has its own) */
export const spotsHere = (upgrades: string[] | undefined): Spot[] => {
  const sc = stallSceneFor(upgrades ?? []);
  return SPOTS.filter((x) => sc.spots[x.id] || unpaintedSpot(x.id));
};
/** the pieces standing in the stall now, in drawing order: what buyers see, and what helps a sale. A
 *  piece put out at a spot this stall has no room for waits there, and stands again in a bigger stall. */
export const placedPieces = (s: { stallSpots?: Record<string, string>; upgrades?: string[]; stallLook?: string }): string[] => {
  const sp = spotsOf(s);
  return spotsHere(lookUps(s)).map((x) => sp[x.id]).filter((id): id is string => !!id && !!DRESSING_BY_ID[id]);
};
/** pieces the player may put out: everything bought, and his father's things */
export const ownsPiece = (s: { dressing?: string[] }, id: string) => !!DRESSING_BY_ID[id]?.father || (s.dressing ?? []).includes(id);

/** The spots of an older save (before save 25 every piece bought stood in the stall at once): your
 *  father's things, with every piece bought put in its spot; where two bought pieces share a spot the
 *  first one bought stands there and the other waits, owned, to be swapped in. */
export function spotsFromOwned(owned: string[] | undefined): Record<string, string> {
  const sp: Record<string, string> = { ...DEFAULT_SPOTS };
  const taken = new Set<string>();
  for (const id of owned ?? []) {
    const d = DRESSING_BY_ID[id];
    if (!d || taken.has(d.spot)) continue;
    sp[d.spot] = id;
    taken.add(d.spot);
  }
  return sp;
}

// Saffron the cat: her poses, each a full-canvas cut-out. Two of them sit where a piece would stand,
// so she takes those only while that spot is empty.
export const CAT_VARIANTS: Record<string, { hideWhileRugOnCounter?: boolean; needs?: string }> = {
  'cat-doorway': {},
  'cat-counter': { hideWhileRugOnCounter: true },
  'cat-topshelf': { needs: 'top-right' },
  'cat-radio': { needs: 'mid-mid' },
};

/** Deterministic day-seeded pick, so Saffron's place for the day doesn't flicker. */
export function dayPick<T>(day: number, salt: string, options: T[]): T {
  let h = day * 2654435761;
  for (let i = 0; i < salt.length; i++) h = (h * 33 + salt.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

/** Where Saffron is today: one of the poses that does not sit on a piece. */
export function catPose(day: number, spots: Record<string, string>): string {
  const free = Object.keys(CAT_VARIANTS).filter((k) => { const n = CAT_VARIANTS[k].needs; return !n || !spots[n]; });
  return dayPick(day, 'cat', free);
}

/** The stall's pictures as it stands (placed pieces, the cat, the gramophone): fetched as soon as a
 *  game opens so the stall is fully dressed the moment it is seen. */
export function stallDressing(s: { day: number; stallSpots?: Record<string, string> }): string[] {
  const pieces = placedPieces(s).map((id) => DRESSING_BY_ID[id]).filter((d) => d.art).map((d) => d.art!);
  return [...pieces, `art/stall2/props/${catPose(s.day, spotsOf(s))}.webp`, 'art/stall2/props/prop-turntable.webp'];
}
