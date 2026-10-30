// Epithets: the name the bazaar gives you for the way you trade, fight and travel. Each is won when
// something you do often enough crosses a mark, and is worn after your name ("Hassan al-Sadiq").
// Some pull against each other: a man cannot be called the Truthful and the Sly at once, so winning
// one takes the other away. The same small emblems mark the tempers of the other named people:
// rival dealers, bandit chiefs and the buyers at your counter.
import { levelOf } from './character';

/** the drawn emblems (components/Epithet/Emblem.tsx) */
export type EmblemId =
  | 'scales' | 'fox' | 'hand' | 'stone' | 'coins' | 'rose' | 'dalla' | 'staves' | 'fist' | 'rifles' | 'shackles'
  | 'star' | 'eye' | 'palm' | 'flame' | 'anchor' | 'hourglass' | 'dagger' | 'gate' | 'lock' | 'cat'
  // the merchant's ranks (game/economy/progress.ts RANKS)
  | 'awning' | 'carpet' | 'arch' | 'compass' | 'crown';

export interface EpithetCtx {
  manner?: { honesty: number; firmness: number; kindness: number; charm: number };
  skills?: Record<string, number | undefined>;
  stats?: { liesOk?: number; liesCaught?: number };
  combat?: { wins?: number; rifles?: number; spare?: number; leaders?: Record<string, { status: string; gen?: number }> };
  whereabouts?: Record<number, string>;
  knotTally?: { close?: number };
  missions?: Record<string, string>;
}

export interface EpithetDef {
  id: string;
  /** the name as the bazaar says it, worn after yours */
  name: string;
  /** its sense in English */
  gloss: string;
  emblem: EmblemId;
  /** how it is won, in a few words */
  how: string;
  /** the epithet this one pushes out (a pair that cannot both be true of one man) */
  against?: string;
  /** a lesser epithet of the same kind that this one replaces */
  over?: string;
  /** how far along: [now, mark] */
  progress: (s: EpithetCtx) => [number, number];
  /** won when this is true (progress alone is not always the whole test) */
  test: (s: EpithetCtx) => boolean;
}

const m = (s: EpithetCtx) => s.manner ?? { honesty: 0, firmness: 0, kindness: 0, charm: 0 };
const lv = (s: EpithetCtx, k: string) => levelOf(s.skills?.[k] ?? 0);
const towns = (s: EpithetCtx) => new Set(Object.values(s.whereabouts ?? {}).filter((w) => w && w !== 'road')).size;
/** bandit chiefs you have taken alive: each jailed man is replaced by the next of his band (gen) */
export const chiefsTaken = (s: EpithetCtx) => Object.values(s.combat?.leaders ?? {}).reduce((a, l) => a + (l.gen ?? 0) + (l.status === 'free' ? 0 : 1), 0);
const reached = (p: [number, number]) => p[0] >= p[1];

export const EPITHETS: EpithetDef[] = [
  { id: 'sadiq', name: 'al-Sadiq', gloss: 'the Truthful', emblem: 'scales', against: 'fahlawi', how: 'Deal straight until you are known as honest (Honesty 40).',
    progress: (s) => [Math.max(0, m(s).honesty), 40], test: (s) => m(s).honesty >= 40 },
  { id: 'fahlawi', name: 'al-Fahlawi', gloss: 'the Sly', emblem: 'fox', against: 'sadiq', how: 'Get away with eight tall stories, and lean cunning.',
    progress: (s) => [s.stats?.liesOk ?? 0, 8], test: (s) => (s.stats?.liesOk ?? 0) >= 8 && m(s).honesty <= -15 },
  { id: 'karam', name: "Abu'l-Karam", gloss: 'the Open-Handed', emblem: 'hand', against: 'hagar', how: 'Be known for kindness at the counter (Kindness 40).',
    progress: (s) => [Math.max(0, m(s).kindness), 40], test: (s) => m(s).kindness >= 40 },
  { id: 'hagar', name: 'Qalb al-Hagar', gloss: 'Heart of Stone', emblem: 'stone', against: 'karam', how: 'Be known as cold to every hard-luck tale (Kindness -35).',
    progress: (s) => [Math.max(0, -m(s).kindness), 35], test: (s) => m(s).kindness <= -35 },
  { id: 'shatir', name: 'al-Shatir', gloss: 'the Shrewd', emblem: 'coins', against: 'tayyib', how: 'Reach Haggling 8 and hold your price (Firmness 25).',
    progress: (s) => [Math.min(lv(s, 'haggling'), 8), 8], test: (s) => lv(s, 'haggling') >= 8 && m(s).firmness >= 25 },
  { id: 'tayyib', name: 'al-Tayyib', gloss: 'the Good-Natured', emblem: 'rose', against: 'shatir', how: 'Give way to buyers until it is known (Firmness -35).',
    progress: (s) => [Math.max(0, -m(s).firmness), 35], test: (s) => m(s).firmness <= -35 },
  { id: 'lisan', name: 'Hilw al-Lisan', gloss: 'the Sweet-Tongued', emblem: 'dalla', how: 'Win buyers over with talk (Charm 40).',
    progress: (s) => [Math.max(0, m(s).charm), 40], test: (s) => m(s).charm >= 40 },
  { id: 'nabbut', name: 'Abu Nabbut', gloss: 'Master of the Cudgel', emblem: 'staves', how: 'Win five fights on the road.',
    progress: (s) => [s.combat?.wins ?? 0, 5], test: (s) => (s.combat?.wins ?? 0) >= 5 },
  { id: 'futuwwa', name: 'al-Futuwwa', gloss: 'the Strongman', emblem: 'fist', over: 'nabbut', how: 'Win fifteen fights on the road.',
    progress: (s) => [s.combat?.wins ?? 0, 15], test: (s) => (s.combat?.wins ?? 0) >= 15 },
  { id: 'banadiq', name: "Abu'l-Banadiq", gloss: 'Father of Rifles', emblem: 'rifles', how: 'Hold eight good rifles among your men and your spares.',
    progress: (s) => [(s.combat?.rifles ?? 0) + (s.combat?.spare ?? 0), 8], test: (s) => reached([(s.combat?.rifles ?? 0) + (s.combat?.spare ?? 0), 8]) },
  { id: 'ashqiya', name: "Sayyad al-Ashqiya'", gloss: 'Hunter of Brigands', emblem: 'shackles', how: 'Take two bandit chiefs alive.',
    progress: (s) => [chiefsTaken(s), 2], test: (s) => chiefsTaken(s) >= 2 },
  { id: 'sabil', name: 'Ibn al-Sabil', gloss: 'the Wayfarer', emblem: 'star', how: 'Stay in ten different towns.',
    progress: (s) => [towns(s), 10], test: (s) => towns(s) >= 10 },
  { id: 'khabir', name: 'al-Khabir', gloss: 'the Knowing Eye', emblem: 'eye', how: 'Reach Appraisal 8, or count twelve rugs\' knots close.',
    progress: (s) => [Math.max(Math.min(lv(s, 'appraisal'), 8) * 1.5, s.knotTally?.close ?? 0), 12], test: (s) => lv(s, 'appraisal') >= 8 || (s.knotTally?.close ?? 0) >= 12 },
  { id: 'usul', name: 'Ibn Usul', gloss: 'Son of Good Stock', emblem: 'palm', how: "Pay off your father's debt to Rashid.",
    progress: (s) => [s.missions?.['ms-debt'] === 'done' ? 1 : 0, 1], test: (s) => s.missions?.['ms-debt'] === 'done' },
];
export const EPITHET: Record<string, EpithetDef> = Object.fromEntries(EPITHETS.map((e) => [e.id, e]));

/** What changes now: epithets newly won, and those they push out. `have` is the list already held. */
export function epithetChanges(s: EpithetCtx, have: string[]): { won: string[]; lost: string[]; next: string[] } {
  // a lesser name already outgrown (Abu Nabbut once you are al-Futuwwa) is not won back
  const outgrown = new Set(have.map((id) => EPITHET[id]?.over).filter((x): x is string => !!x));
  const won = EPITHETS.filter((e) => !have.includes(e.id) && !outgrown.has(e.id) && e.test(s)).map((e) => e.id);
  if (!won.length) return { won, lost: [], next: have };
  const out = new Set(won.flatMap((id) => [EPITHET[id].against, EPITHET[id].over]).filter((x): x is string => !!x));
  const lost = have.filter((id) => out.has(id));
  const next = [...have.filter((id) => !out.has(id)), ...won.filter((id) => !out.has(id))];
  return { won: won.filter((id) => next.includes(id)), lost, next };
}

/** The epithet worn after the name: the one chosen, if still held, else the latest won. */
export function wornEpithet(have: string[] | undefined, chosen?: string): EpithetDef | undefined {
  const h = have ?? [];
  if (chosen && h.includes(chosen)) return EPITHET[chosen];
  return h.length ? EPITHET[h[h.length - 1]] : undefined;
}
export const nameWith = (name: string, e?: EpithetDef) => (e ? `${name} ${e.name}` : name);

// ---------- the tempers of other people, as emblems ----------
export interface TraitMark { emblem: EmblemId; label: string; tip: string }

/** rival dealers (data/rivals.ts temper) */
export const RIVAL_MARK: Record<string, TraitMark> = {
  aggressive: { emblem: 'dagger', label: 'The Undercutter', tip: 'Cuts his prices to hurt yours when you pass him.' },
  steady: { emblem: 'anchor', label: 'The Steady Hand', tip: 'Sells the same, season in and season out.' },
  cunning: { emblem: 'fox', label: 'The Fox', tip: 'Works by favours and quiet words.' },
  old: { emblem: 'gate', label: 'The Old House', tip: 'An old name. Buyers come to him from habit.' },
};
/** bandit chiefs (systems/combat.ts temper), once you have seen him fight */
export const CHIEF_MARK: Record<string, TraitMark> = {
  reckless: { emblem: 'flame', label: 'The Hothead', tip: 'Comes straight at you.' },
  cunning: { emblem: 'fox', label: 'The Fox', tip: 'Watch where he rides himself, not where his men go.' },
  cautious: { emblem: 'lock', label: 'The Wary', tip: 'Holds back, and will treat when his men falter.' },
};
/** a buyer's temper, read from the same numbers as the buyer's card */
export function buyerMarks(b: { patience: number; trust: number; embellishNotice?: number; catAffinity?: number }): TraitMark[] {
  const out: TraitMark[] = [];
  if (b.patience <= 45) out.push({ emblem: 'hourglass', label: 'Impatient', tip: 'Gets bored quickly.' });
  if ((b.embellishNotice ?? 0) >= 0.5) out.push({ emblem: 'eye', label: 'Sharp eye', tip: 'Will catch a tall tale.' });
  else if ((b.embellishNotice ?? 1) <= 0.25) out.push({ emblem: 'dalla', label: 'Easily charmed', tip: 'A good story goes a long way.' });
  if (b.trust <= 35) out.push({ emblem: 'lock', label: 'Wary', tip: 'Slow to trust.' });
  else if (b.trust >= 60) out.push({ emblem: 'hand', label: 'Trusting', tip: 'Takes you at your word.' });
  if ((b.catAffinity ?? 0) > 0) out.push({ emblem: 'cat', label: 'Fond of cats', tip: 'Saffron helps.' });
  return out.slice(0, 3);
}
