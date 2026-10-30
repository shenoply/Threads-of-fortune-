// Boys from the lane's own families to mind the stall in Sami's place. They are not made up here: they
// are the sons of the humble houses of Giza and Cairo already in the world (systems/population: the
// "families of the quarter", a lane family to the matchmakers), at the age a boy of such a house was put
// to work in 1925, about eight to fourteen. Each has one gift, taken from his own nature in the world,
// that does a small thing at the stall, and a week's pay in piastres. One boy at a time, as with Sami.
// Pure: no store import.
import { world, ageNow, faceSrc, type Person, type Trait } from './population';
import type { BoyTrait } from './shopBoy';

export const BOY_TRAIT: Record<BoyTrait, { label: string; does: string }> = {
  sharp: { label: 'Sharp-eyed', does: 'On a night a thief is about while you are away, he sleeps across the stall and the thief goes off with nothing.' },
  quick: { label: 'Quick', does: 'Runs rugs you send by rail to the station the same morning: they reach your shop a day sooner.' },
  voice: { label: 'A good voice', does: 'Calls buyers in from the lane: they come to the stall a little sooner in the day.' },
  honest: { label: 'Honest', does: 'Never a coin short in the takings.' },
  lane: { label: 'Knows the lane', does: 'Now and then brings back a buyer who has bought from you before.' },
  reads: { label: 'Reads a little', does: 'He can read your price ticket, so he never takes a first low offer.' },
};

/** his gift, from his own nature in the world */
const FROM: [Trait, BoyTrait][] = [['honest', 'honest'], ['curious', 'sharp'], ['gossip', 'lane'], ['cheerful', 'voice'], ['pious', 'reads']];
const giftOf = (p: Person): BoyTrait => p.traits.map((t) => FROM.find(([a]) => a === t)?.[1]).find(Boolean) ?? 'quick';

export interface LaneBoy {
  id: string; name: string; short: string; age: number;
  /** his picture, when the world has one for him */
  face?: string;
  /** whose son he is and of which house */
  family: string;
  trait: BoyTrait;
  /** piastres a week */
  weekly: number;
}

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** the boys of the humble houses of Giza and Cairo old enough to mind a stall today */
export function laneBoys(day: number): LaneBoy[] {
  const w = world();
  const out: LaneBoy[] = [];
  for (const h of Object.values(w.houses)) {
    if (h.rank !== 'humble' || (h.home !== 'giza' && h.home !== 'cairo')) continue;
    for (const id of h.members) {
      const p = w.people[id];
      if (!p || p.sex !== 'm' || p.role !== 'kin' || !(p.father || p.mother)) continue;
      const age = ageNow(p, day);
      if (age < 8 || age > 14) continue;
      const parent = w.people[p.father ?? p.mother!];
      const trait = giftOf(p);
      out.push({
        id: p.id, name: p.name, short: p.short, age, face: faceSrc(p),
        family: `Son of ${parent ? `${parent.name}, ${lower(parent.title)}` : h.name}`,
        trait,
        // a boy at the kuttab is worth a little more; a small one a little less
        weekly: trait === 'reads' ? 15 : age < 10 ? 9 : 12,
      });
    }
  }
  return out.sort((a, b) => b.age - a.age);
}

/** the shop boy's picture: Sami's portrait, a lane boy's face from the world, or none (a silhouette) */
export const boyFace = (b?: { who?: string }) => (!b?.who ? 'art/portraits/small/sami.webp' : (() => { const p = world().people[b.who!]; return p ? faceSrc(p) : undefined; })());
