// Arran Embleton's textile laboratory in Giza: fibre under the microscope, dye tests, a colour transfer
// rub (does colour come off on a damp cloth?), a small-sample wash, and the balance for metal antiques.
// A rub never speaks for a wash: they are separate tests with separate claims. Every result comes from the rug's hidden lab profile below,
// never from a dice roll; a rug with no profile, or a test that cannot answer the question, is
// "inconclusive". No test here dates a rug or proves where it was woven.
import type { Condition, RugItem } from '../types';
import { RUGS } from '../../data/rugs';

/** 'fastness' is the colour transfer rub (kept as the saved id so old results stay valid); 'wash' is the sample wash */
export type LabService = 'fibre' | 'dye' | 'fastness' | 'wash' | 'metal' | 'provisions' | 'cargo';
export type LabProcedure = 'microscopy' | 'dyeComparison' | 'dampRub' | 'sampleWash' | 'balance';
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
  procedure?: LabProcedure;
}

/** Arran keeps his door open from seven in the morning to eight at night */
export const LAB_HOURS: [number, number] = [7, 20];

export interface ServiceDef {
  label: string; price: number; minutes: number; station: 'microscope' | 'dye' | 'balance' | 'notebook'; needsThread: boolean;
  blurb: string; question: string;
  /** material used up, shown before you pay */
  consumes: string;
  can: string; cannot: string;
}
export const LAB_SERVICES: Record<LabService, ServiceDef> = {
  fibre: { label: 'Fibre under the microscope', price: 8, minutes: 45, station: 'microscope', needsThread: true, question: 'What is it made of: wool, cotton or silk?',
    blurb: 'One loose yarn, teased apart on a slide: wool scales, cotton twists, the smooth rod of silk.', consumes: 'One loose yarn, about a thumb long.',
    can: 'Which fibres the pile and foundation are made of, and whether that matches how the rug is sold.', cannot: 'When or where the rug was woven.' },
  dye: { label: 'Dye test', price: 18, minutes: 120, station: 'dye', needsThread: true, question: 'Natural or synthetic dyes, against the stated age?',
    blurb: 'A few fibres boiled and spotted on porcelain, compared with his dye cards.', consumes: 'A few loose fibres of each main colour.',
    can: 'Whether the colours are natural or synthetic, and whether that fits the stated age.', cannot: 'A year, or where the rug came from.' },
  fastness: { label: 'Colour transfer rub', price: 6, minutes: 30, station: 'dye', needsThread: false, question: 'Does colour transfer when rubbed with a clean cloth?',
    blurb: 'A damp white cloth rubbed firmly on the back of the rug and examined in daylight. Nothing is cut.', consumes: 'Nothing. The rug is untouched.',
    can: 'Whether colour comes off on a damp cloth: a guide for floors where it will be rubbed.', cannot: 'How the rug will behave in a wash, hot water or strong soap.' },
  wash: { label: 'Sample wash test', price: 14, minutes: 180, station: 'dye', needsThread: true, question: 'Does the colour run when a sample is washed?',
    blurb: 'A few loose fibres washed in warm soapy water in a porcelain dish beside undyed white wool, then dried and compared.', consumes: 'A few loose fibres of each main colour.',
    can: 'Whether the dyes run in a warm soap wash of a small sample.', cannot: 'Exactly how the whole rug will behave in a laundry, or in hot water and harsh soda.' },
  metal: { label: 'Density on the balance', price: 12, minutes: 40, station: 'balance', needsThread: false, question: 'Is it the metal it is sold as?',
    blurb: 'Weigh an object in air and in water to estimate its density.', consumes: 'Nothing.', can: 'An estimate of density.', cannot: 'Plating, or what is inside a hollow piece.' },
  provisions: { label: 'Provisions assessment', price: 10, minutes: 60, station: 'notebook', needsThread: false, question: 'Will the caravan\'s food last the road, and how tired are you?',
    blurb: 'Arran goes through your stores, water skins and the state of your men with McCarrison open beside him.', consumes: 'Nothing.',
    can: 'How many travel days your food covers, what to add, and how fatigue is building.', cannot: 'Cure anything today: food and rest work over days.' },
  cargo: { label: 'Cargo hazard check', price: 12, minutes: 60, station: 'notebook', needsThread: false, question: 'Is this cargo safe to carry, and what paperwork does it need?',
    blurb: 'Arran reads the labels, the manifest and the packing, and says what the crate is and who should handle it.', consumes: 'Nothing. He does not open sealed cases.',
    can: 'What kind of cargo it is, whether the packing is sound, and which licence or specialist it needs.', cannot: 'Make it legal, or stand in for a licensed shot-firer or pharmacist.' },
};

// ---- hidden lab profiles: what the rug is really made of ----
type Pile = 'wool' | 'wool-silk' | 'wool-mercerised';
type Foundation = 'wool' | 'cotton' | 'cotton-silk';
type Dyes = 'natural' | 'mixed' | 'synthetic';
type Fast = 'fast' | 'bleeds';
/** fast: behaviour in a sample wash; rub: whether colour transfers on a damp cloth (defaults: follows fast only for the worst dyes) */
interface Profile { pile: Pile; foundation: Foundation; dyes: Dyes; fast: Fast; dyeNote: string; rub?: 'clean' | 'transfers' }

const PROFILES: Record<string, Profile> = {
  'nile-reed': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'fast', dyeNote: 'madder red and indigo, with a sand colour from an aniline yellow' },
  'village-kilim-canal': { pile: 'wool', foundation: 'wool', dyes: 'mixed', fast: 'bleeds', rub: 'transfers', dyeNote: 'indigo and madder, but the bright red bands are an acid synthetic' },
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
    return { ...base, procedure: 'microscopy', verdict, confidence: 'strong', claim: `${t.material}${claimsSilk ? ' (sold with silk highlights)' : ''}`, evidence, limitations };
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
    return { ...base, procedure: 'dyeComparison', verdict, confidence, claim: t.age, evidence, limitations };
  }
  if (service === 'wash') {
    const claimsWashable = t.traits.includes('washable');
    const runs = p.fast === 'bleeds';
    return {
      ...base, procedure: 'sampleWash',
      verdict: runs ? (claimsWashable ? 'inconsistent' : 'consistent') : 'consistent',
      confidence: 'moderate',
      claim: claimsWashable ? 'Sold as washable' : 'No washing claim made',
      evidence: [runs ? 'The wash water turned pink and the white wool beside the sample was stained. A colour ran.' : 'The wash water stayed clear and the white wool beside the sample was unstained.'],
      limitations: ['A small sample in warm soapy water. It does not show exactly how the whole rug will behave in a laundry, hot water or harsh soda.'],
    };
  }
  // the colour transfer rub: a damp white cloth on the back. It speaks only of rubbing, never of washing.
  const transfers = rubResult(p) === 'transfers';
  return {
    ...base, procedure: 'dampRub',
    verdict: transfers ? 'inconsistent' : 'consistent',
    confidence: 'strong',
    claim: 'Colour does not transfer when rubbed',
    evidence: [transfers ? 'Colour transferred to the damp test cloth.' : 'No visible colour transferred to the damp test cloth.'],
    limitations: ['This rubbing test does not establish how the rug will behave in a wash, hot water, or strong soap.'],
  };
}

const rubResult = (p: Profile) => p.rub ?? 'clean';

/** Why a rug cannot be examined right now, or '' if it can. */
export function examineBlock(i: RugItem, day: number) {
  if (i.restoringUntil && i.restoringUntil > day) return 'It is with the weaver for repair.';
  return '';
}

export const verdictWord: Record<LabVerdict, string> = { consistent: 'Consistent', inconsistent: 'Inconsistent', inconclusive: 'Inconclusive' };

/** Whether colour transfers on a damp rub, from the rug's lab profile; null if Arran has no card for it. */
export function rubTruth(typeId: string): 'clean' | 'transfers' | null {
  const p = PROFILES[typeId];
  return p ? rubResult(p) : null;
}
/** Whether a sample's colour runs in a warm wash; null if Arran has no card for it. */
export function washTruth(typeId: string): 'fast' | 'bleeds' | null {
  return PROFILES[typeId]?.fast ?? null;
}
/** Rewrite an old rub result in the rub's own terms, keeping its day and id (no charge, no new test). */
export function migrateRubFinding(f: LabFinding, typeId?: string): LabFinding {
  if (f.service !== 'fastness') return f;
  const p = typeId ? PROFILES[typeId] : undefined;
  const transfers = p ? rubResult(p) === 'transfers' : /pink|ran|run/i.test(f.evidence.join(' '));
  return {
    ...f, procedure: 'dampRub',
    verdict: p || f.verdict !== 'inconclusive' ? (transfers ? 'inconsistent' : 'consistent') : f.verdict,
    confidence: 'strong',
    claim: 'Colour does not transfer when rubbed',
    evidence: [transfers ? 'Colour transferred to the damp test cloth.' : 'No visible colour transferred to the damp test cloth.'],
    limitations: ['This rubbing test does not establish how the rug will behave in a wash, hot water, or strong soap.'],
  };
}
