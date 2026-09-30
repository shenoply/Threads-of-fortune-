// Arran Embleton's textile laboratory in Giza: fibre under the microscope, dye tests, a colour-fastness
// rub, and the balance for metal antiques. Every result comes from the rug's hidden lab profile below,
// never from a dice roll; a rug with no profile, or a test that cannot answer the question, is
// "inconclusive". No test here dates a rug or proves where it was woven.
import type { Condition, RugItem } from '../types';
import { RUGS } from '../../data/rugs';

export type LabService = 'fibre' | 'dye' | 'fastness' | 'metal';
export type LabVerdict = 'consistent' | 'inconsistent' | 'inconclusive';
export interface LabFinding {
  /** `${subjectId}:${service}` */
  id: string;
  subjectId: string;
  service: LabService;
  verdict: LabVerdict;
  confidence: 'tentative' | 'moderate' | 'strong';
  /** what was compared: the dealer's description the test was measured against */
  claim: string;
  evidence: string[];
  limitations: string[];
  day: number;
  /** a sample was cut from the back with the player's consent */
  cut?: boolean;
}

export const LAB_SERVICES: Record<LabService, { label: string; price: number; minutes: number; station: 'microscope' | 'dye' | 'balance'; needsThread: boolean; blurb: string }> = {
  fibre: { label: 'Fibre under the microscope', price: 8, minutes: 45, station: 'microscope', needsThread: true, blurb: 'One loose yarn, teased apart on a slide: wool scales, cotton twists, the smooth rod of silk.' },
  dye: { label: 'Dye test', price: 18, minutes: 120, station: 'dye', needsThread: true, blurb: 'A few fibres boiled and spotted on porcelain, compared with his dye cards.' },
  fastness: { label: 'Colour-fastness rub', price: 6, minutes: 30, station: 'dye', needsThread: false, blurb: 'A damp white cloth pressed to the back of the rug. Nothing is cut.' },
  metal: { label: 'Density on the balance', price: 12, minutes: 40, station: 'balance', needsThread: false, blurb: 'Weigh an object in air and in water to estimate its density.' },
};

// ---- hidden lab profiles: what the rug is really made of ----
type Pile = 'wool' | 'wool-silk' | 'wool-mercerised';
type Foundation = 'wool' | 'cotton' | 'cotton-silk';
type Dyes = 'natural' | 'mixed' | 'synthetic';
type Fast = 'fast' | 'bleeds';
interface Profile { pile: Pile; foundation: Foundation; dyes: Dyes; fast: Fast; dyeNote: string }

const PROFILES: Record<string, Profile> = {
  'nile-reed': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'fast', dyeNote: 'madder red and indigo, with a sand colour from an aniline yellow' },
  'village-kilim-canal': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'bleeds', dyeNote: 'indigo and madder, but the bright red bands are an acid synthetic' },
  'delta-house': { pile: 'wool', foundation: 'wool', dyes: 'synthetic', fast: 'fast', dyeNote: 'synthetic alizarin red and a synthetic indigo, well fixed' },
  'fayoum-hearth': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder root red and a walnut-husk brown' },
  'red-medina': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'fast', dyeNote: 'madder red with a synthetic ivory-bleach in the border' },
  'date-palm-runner': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'weld yellow-green and madder russet' },
  'canal-ferry-rug': { pile: 'wool', foundation: 'cotton', dyes: 'synthetic', fast: 'fast', dyeNote: 'synthetic indigo, very even from end to end' },
  'tanta-courtyard': { pile: 'wool', foundation: 'cotton', dyes: 'mixed', fast: 'bleeds', dyeNote: 'natural indigo, but the red sprays are an aniline that runs' },
  'desert-star': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'madder, indigo and undyed brown wool' },
  'jaffa-citrus': { pile: 'wool', foundation: 'cotton', dyes: 'mixed', fast: 'fast', dyeNote: 'madder red, with a synthetic blue in the border rosettes' },
  'cairo-garden': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'madder and indigo throughout' },
  'cedar-caravan': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'fast', dyeNote: 'madder red, and a faded magenta of the early aniline kind in the small trees' },
  'jerusalem-stone': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder and weld, softened with age' },
  'anatolian-hearth': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder and indigo, with some abrash where the wool batches change' },
  'aleppo-courtyard': { pile: 'wool', foundation: 'cotton', dyes: 'mixed', fast: 'fast', dyeNote: 'natural indigo and madder, with a synthetic orange in the minor border' },
  'damascus-blue': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'indigo in several depths, and madder' },
  'konya-prayer-rug': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder, indigo and a weld yellow, with strong abrash' },
  'moroccan-ember': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder red and henna orange' },
  'golden-palm': { pile: 'wool', foundation: 'cotton', dyes: 'mixed', fast: 'fast', dyeNote: 'madder and indigo, but the gold ground is a chrome-mordanted synthetic yellow' },
  'caucasus-eagle': { pile: 'wool', foundation: 'wool', dyes: 'natural', fast: 'fast', dyeNote: 'madder, indigo and a natural yellow' },
  'sapphire-night': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'indigo, and a cochineal crimson' },
  'damascus-rose': { pile: 'wool-silk', foundation: 'cotton-silk', dyes: 'natural', fast: 'fast', dyeNote: 'cochineal, indigo and weld; the highlights are dyed silk' },
  'istanbul-tulip': { pile: 'wool-mercerised', foundation: 'cotton-silk', dyes: 'natural', fast: 'fast', dyeNote: 'madder, indigo and weld; the bright highlights are mercerised cotton' },
  'baghdad-night': { pile: 'wool', foundation: 'cotton', dyes: 'natural', fast: 'fast', dyeNote: 'indigo and cochineal' },
};

const PILE_WORDS: Record<Pile, string> = {
  wool: 'The pile is sheep\'s wool: overlapping scales along the fibre under the lens.',
  'wool-silk': 'The pile is wool, with highlights of true silk: smooth, glassy rods with no scales and no twist.',
  'wool-mercerised': 'The pile is wool; the bright highlights are mercerised cotton: flat twisted ribbons, swollen and glossy from the caustic bath.',
};
const FOUND_WORDS: Record<Foundation, string> = {
  wool: 'A warp thread from the fringe is wool too.',
  cotton: 'A warp thread from the fringe is cotton: the flat, twisted ribbon of a cotton fibre.',
  'cotton-silk': 'The warps are fine cotton, with silk in some wefts.',
};

/** a sample can be taken without cutting: a worn or damaged rug has loose yarn; a flatweave has loose weft ends at the fringe */
export function hasLooseThread(i: RugItem) {
  const t = RUGS[i.typeId];
  return i.condition === 'Worn' || i.condition === 'Damaged' || !!t?.traits.includes('flatweave');
}
const DOWN: Record<Condition, Condition> = { Excellent: 'Good', Good: 'Worn', Worn: 'Worn', Dirty: 'Dirty', Damaged: 'Damaged' };
/** what cutting a small sample from the back costs the rug */
export const conditionAfterCut = (c: Condition) => DOWN[c];

const OLD = /18th|19th|late 19th/i;

/** Resolve a test on a real item from its hidden profile. Deterministic: the same rug gives the same answer. */
export function resolveFinding(item: RugItem, service: LabService, day: number, cut = false): LabFinding {
  const t = RUGS[item.typeId];
  const p = PROFILES[item.typeId];
  const id = `${item.uid}:${service}`;
  const base = { id, subjectId: item.uid, service, day, ...(cut ? { cut } : {}) };
  if (service === 'metal') {
    return { ...base, verdict: 'inconclusive', confidence: 'tentative', claim: 'Metal content', evidence: ['A rug is not a metal object. The balance has nothing to say about it.'], limitations: ['Bring a brass, silver or gold antique for this test.'] };
  }
  if (!t || !p) {
    return { ...base, verdict: 'inconclusive', confidence: 'tentative', claim: t ? t.material : 'Unknown', evidence: ['Arran has no reference cards for this weave.'], limitations: ['Without reference samples he will not guess.'] };
  }
  if (service === 'fibre') {
    const claimsSilk = t.traits.includes('silk');
    const evidence = [PILE_WORDS[p.pile], FOUND_WORDS[p.foundation]];
    const saysCotton = /cotton/i.test(t.material);
    let verdict: LabVerdict = 'consistent';
    const limitations = ['Fibre shows what the rug is made of, not when or where it was woven.'];
    if (p.pile === 'wool-mercerised') limitations.push('The catalogue says "silk-style", which is honest. Anyone who sells it as silk is wrong.');
    if (claimsSilk && p.pile !== 'wool-silk') verdict = 'inconsistent';
    if (saysCotton && p.foundation === 'wool') verdict = 'inconsistent';
    if (!saysCotton && p.foundation !== 'wool') evidence.push(`The description "${t.material}" speaks of the pile; the cotton foundation is normal for this weave.`);
    return { ...base, verdict, confidence: 'strong', claim: `${t.material}${claimsSilk ? ' (sold with silk highlights)' : ''}`, evidence, limitations };
  }
  if (service === 'dye') {
    const claimsOld = OLD.test(t.age);
    const evidence = [`Dyes: ${p.dyeNote}.`];
    const limitations = [
      'Synthetic dyes were sold from 1856; chrome dyes were common after about 1900. A synthetic colour says "probably after that", never a year.',
      'Natural dyes were still used in 1925, so natural dyes do not prove age either.',
    ];
    if (item.restored) evidence.push('One small area has newer yarn in a synthetic dye: the repair, not the original weaving.');
    let verdict: LabVerdict = 'consistent';
    let confidence: LabFinding['confidence'] = 'moderate';
    if (claimsOld && p.dyes !== 'natural') { verdict = 'inconsistent'; evidence.push(`Such a colour fits poorly with "${t.age}". It points to the early twentieth century.`); }
    else if (!claimsOld && p.dyes === 'natural') { confidence = 'tentative'; evidence.push('All natural dyes. That fits the stated age, but it does not prove it.'); }
    return { ...base, verdict, confidence, claim: t.age, evidence, limitations };
  }
  // fastness: a damp cloth on the back
  const claimsWashable = t.traits.includes('washable');
  const bleeds = p.fast === 'bleeds';
  return {
    ...base,
    verdict: bleeds ? (claimsWashable ? 'inconsistent' : 'consistent') : 'consistent',
    confidence: 'strong',
    claim: claimsWashable ? 'Sold as washable' : 'Colours hold in a cold wash',
    evidence: [bleeds ? 'The cloth came away pink. The red will run if the rug is washed.' : 'The cloth stayed white. The colours held.'],
    limitations: bleeds ? ['Dry cleaning only. Do not let a buyer wash it in the courtyard.'] : ['A cold rub only. Hot water or strong soap can still move a dye.'],
  };
}

/** Why a rug cannot be examined right now, or '' if it can. */
export function examineBlock(i: RugItem, day: number) {
  if (i.restoringUntil && i.restoringUntil > day) return 'It is with the weaver for repair.';
  return '';
}

export const verdictWord: Record<LabVerdict, string> = { consistent: 'Consistent', inconsistent: 'Inconsistent', inconclusive: 'Inconclusive' };
