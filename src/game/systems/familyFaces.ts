// Faces for the household as the years pass: a grown son or daughter, and a wife no longer the bride of
// her wedding portrait, take a face from the portrait pool (data/portraitPool.ts) by people, sex and age.
// The owner's rule holds here as in the world (systems/population.ts, SHARE_FACES false): no face is
// ever used twice, so a face is taken only if nobody in the world or the household has it. When none is
// free, the card keeps the sitter's initial.
import { POOL, type PoolRegion } from '../../data/portraitPool';
import { worldFaces, poolRegionOf, faceBand, person, ageNow, type Culture } from './population';
import { BRIDES, ageOf, childLook, wivesOf, setWife, GROWN, type HouseholdState, type Child, type Spouse, type BrideId } from './household';

/** the family pictures of grown children that exist (art/family/child-<look>-<sex>-18.webp) */
const FAMILY_GROWN = new Set(['child-egypt-son-18', 'child-egypt-daughter-18']);
const LOOK_REGION: Record<'egypt' | 'levant' | 'desert', PoolRegion> = { egypt: 'egypt', levant: 'levant', desert: 'iraq' };

/** the person in the world a bride is: her own picture's sitter, with her people and her age */
const brideFolk = (id: BrideId) => { const b = BRIDES[id]; return person(b?.folk ?? `bride-${id}`); };
/** the people a child's face is drawn from: the mother's, as the household's pictures already are */
function regionOf(mother: BrideId | undefined): PoolRegion {
  const p = mother ? brideFolk(mother) : undefined;
  if (p) return poolRegionOf(p.culture as Culture);
  if (mother === 'nura') return 'bedouin';
  return LOOK_REGION[childLook(mother)];
}
const clsOf = (mother?: BrideId): 'humble' | 'trade' | 'notable' => { const r = mother ? BRIDES[mother]?.rank : undefined; return r === 'humble' ? 'humble' : r === 'notable' || r === 'grand' ? 'notable' : 'trade'; };

/** faces the household already has */
export function householdFaces(h: HouseholdState): Set<string> {
  const out = new Set<string>();
  for (const c of h.children) if (c.face) out.add(c.face);
  for (const w of wivesOf(h)) if (w.face) out.add(w.face);
  if (h.merchant?.child?.face) out.add(h.merchant.child.face);
  return out;
}

function pick(taken: Set<string>, region: PoolRegion, sex: 'm' | 'f', band: 'y' | 'm' | 'o', cls: 'humble' | 'trade' | 'notable'): string | undefined {
  const mine = POOL.filter((f) => f.region === region && f.sex === sex && !f.nat && !taken.has(f.id));
  return (mine.find((f) => f.age === band && f.cls === cls) ?? mine.find((f) => f.age === band))?.id;
}

/** the household with faces given where the years call for them; the same object when nothing changed */
export function assignFamilyFaces(h0: HouseholdState | undefined, day: number): HouseholdState | undefined {
  if (!h0) return h0;
  const grownBare = h0.children.some((c) => ageOf(c) >= GROWN && c.face === undefined);
  const wives = wivesOf(h0);
  const wifeAge = (w: Spouse) => { const p = brideFolk(w.id); return (p ? ageNow(p, Math.min(day, w.married)) : 21) + Math.floor((w.homeDays ?? 0) / 365); };
  const older = wives.some((w) => faceBand(wifeAge(w)) !== (w.faceBand ?? 'y'));
  if (!grownBare && !older) return h0;
  const taken = new Set([...worldFaces(), ...householdFaces(h0)]);
  let h = h0;
  if (grownBare) {
    const firstWife = h0.spouse?.id;
    h = { ...h, children: h.children.map((c): Child => {
      if (ageOf(c) < GROWN || c.face !== undefined) return c;
      const mother = c.mother ?? firstWife;
      const fam = `child-${childLook(mother)}-${c.sex}-18`;
      // the household's own picture of a grown child first, while no brother or sister has it
      const id = FAMILY_GROWN.has(fam) && !taken.has(`fam:${fam}`) ? `fam:${fam}` : pick(taken, regionOf(mother), c.sex === 'son' ? 'm' : 'f', 'y', clsOf(mother));
      if (id) taken.add(id);
      // '' marks "looked, none free": the initial stays, and the search is not repeated every night
      return { ...c, face: id ?? '' };
    }) };
  }
  for (const w of wivesOf(h)) {
    const band = faceBand(wifeAge(w));
    if (band === (w.faceBand ?? 'y')) continue;
    const id = pick(taken, regionOf(w.id), 'f', band, clsOf(w.id));
    if (id) taken.add(id);
    // no free face: she keeps the one she has, and the search waits for the next band
    h = setWife(h, { ...w, faceBand: band, ...(id ? { face: id } : {}) });
  }
  return h;
}
