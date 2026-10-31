// Your animals by name. The counts in party.animals (and in each stable) stay the rule of the game; this
// puts a name, an age and a temper on every beast behind them. Nothing here needs tending: the miles add
// up as you travel, an animal that has walked far with you becomes an old friend, and a mare and a
// stallion (or a she-camel and a bull, a jenny and a jack) left at the same stable have a young one in
// their own time. Nothing here ever takes an animal away.
import { BREEDS, type AnimalKind } from '../../data/animals';

export type Temper = 'steady' | 'gentle' | 'patient' | 'proud' | 'spirited' | 'stubborn' | 'clever' | 'greedy';
export interface NamedAnimal {
  id: string; breed: string; name: string; sex: 'f' | 'm';
  /** game day of birth (before day 0 for an animal bought grown) */
  born: number;
  temper: Temper;
  /** miles walked with you */
  miles: number;
  /** the day she came to you */
  joined: number;
  /** you gave the name yourself */
  renamed?: boolean;
  /** born in your keeping: the names of the mother and father */
  dam?: string; sire?: string;
  /** in foal (or in calf): the day the young one is due, and by whom */
  due?: number; dueBy?: string;
  /** the day she was first stabled with a mate (conception follows a few weeks together) */
  mateSince?: number;
  /** the last day she gave birth */
  lastYoung?: number;
  /** a prize animal: bought from a famous stud or herd (rarer, dearer, a notable's mount) */
  prize?: string;
}

/** about a mile for every pixel of the map (24 px make a day's walk of some 23 miles) */
export const MILES_PER_PX = 100 / 104;
/** miles together before an animal is an old friend */
export const FRIEND_MILES = 400;
export const isFriend = (a: Pick<NamedAnimal, 'miles'>) => a.miles >= FRIEND_MILES;

const YEAR = 365;
/** carrying a full load from this age */
const GROWN: Record<AnimalKind, number> = { camel: 4, horse: 3, donkey: 2, mule: 3 };
/** months in foal, and the youngest age to breed */
const CARRY_DAYS: Record<AnimalKind, number> = { camel: 390, horse: 335, donkey: 365, mule: 0 };
/** the young one's word */
export const YOUNG: Record<AnimalKind, { f: string; m: string; any: string }> = {
  camel: { f: 'she-calf', m: 'bull calf', any: 'calf' }, horse: { f: 'filly', m: 'colt', any: 'foal' },
  donkey: { f: 'jenny foal', m: 'jack foal', any: 'foal' }, mule: { f: 'foal', m: 'foal', any: 'foal' },
};
export const SEX_WORD: Record<AnimalKind, { f: string; m: string }> = {
  camel: { f: 'she-camel', m: 'bull camel' }, horse: { f: 'mare', m: 'stallion' }, donkey: { f: 'jenny', m: 'jack' }, mule: { f: 'mare mule', m: 'john mule' },
};

// period names, as a herdsman or a groom would give them
const NAMES: Record<AnimalKind, { f: string[]; m: string[] }> = {
  camel: {
    f: ['Hamra', 'Safra', 'Wadha', 'Shaqha', 'Mizna', 'Ghazala', 'Nuwwar', 'Barqa', 'Dhabia', 'Sabha', 'Shahla', 'Hadba', 'Majhoula', 'Umm Sabr'],
    m: ['Ashqar', 'Sabr', 'Rihan', 'Dahman', 'Hilal', 'Zaher', 'Ghanem', 'Abu Shama', 'Sultan', 'Mabrouk', 'Hadi', 'Jabal', 'Shaheen', 'Abu Rukba'],
  },
  horse: {
    f: ['Kuhaila', 'Saqlawiya', 'Hamdaniya', 'Obaya', 'Bint al-Rih', 'Zarifa', 'Najma', 'Ghazwa', 'Shuwaima', 'Hadba', 'Dahma', 'Jellabiya', 'Rabda', 'Wadha'],
    m: ['Antar', 'Barq', 'Sabbah', 'Shihab', 'Mabrouk', 'Rih', 'Nasr', 'Asil', 'Dahman', 'Ubayan', 'Shahin', 'Faris', 'Sakr', 'Hamdan'],
  },
  donkey: {
    f: ['Mabrouka', 'Fulla', 'Mishmisha', 'Zaitouna', 'Hanem', 'Sukkara', 'Lula', 'Warda', 'Kahla', 'Safsafa'],
    m: ['Abu Sabr', 'Zaitun', 'Simsim', 'Bulbul', 'Kammun', 'Mishmish', 'Antar', 'Hajji', 'Abu Toul', 'Shahat'],
  },
  mule: {
    f: ['Saboura', 'Hajja', 'Kahla', 'Sitt al-Kull', 'Baraka', 'Ghaliya'],
    m: ['Ghandour', 'Kassab', 'Tawil', 'Hajji', 'Abu Gamal', 'Sabour'],
  },
};
const TEMPERS: Record<AnimalKind, Temper[]> = {
  camel: ['patient', 'steady', 'proud', 'stubborn', 'greedy', 'gentle'],
  horse: ['spirited', 'proud', 'gentle', 'steady', 'clever'],
  donkey: ['stubborn', 'patient', 'clever', 'gentle', 'greedy'],
  mule: ['stubborn', 'steady', 'clever', 'patient'],
};
export const TEMPER_LINE: Record<Temper, string> = {
  steady: 'Steady. Walks all day at the same pace and minds nothing.',
  gentle: 'Gentle. Children and strangers can lead her by the rope.',
  patient: 'Patient. Kneels for the load and waits without a word.',
  proud: 'Proud. Will not be led behind another beast if it can help it.',
  spirited: 'Spirited. Wants to go faster than the rest, all day.',
  stubborn: 'Stubborn. Stops when it has decided to, and starts again in its own time.',
  clever: 'Clever. Has learned to untie its own rope at night.',
  greedy: 'Greedy. Would sell you for a mouthful of clover.',
};

const h = (s: string) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
export const kindOf = (a: Pick<NamedAnimal, 'breed'>): AnimalKind => BREEDS[a.breed]?.kind ?? 'camel';
export const ageYears = (a: Pick<NamedAnimal, 'born'>, day: number) => Math.max(0, (day - a.born) / YEAR);
export const isYoung = (a: Pick<NamedAnimal, 'born' | 'breed'>, day: number) => ageYears(a, day) < GROWN[kindOf(a)];
/** "four years old", "eight months old" */
export function ageWords(a: Pick<NamedAnimal, 'born'>, day: number) {
  const y = ageYears(a, day);
  if (y < 1) { const m = Math.max(0, Math.floor(y * 12)); return m < 1 ? 'a few days old' : `${m} ${m === 1 ? 'month' : 'months'} old`; }
  const n = Math.floor(y);
  const W = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return `${W[n] ?? n} ${n === 1 ? 'year' : 'years'} old`;
}
/** "Bishari she-camel", "Arabian colt" */
export function sortWord(a: NamedAnimal, day: number) {
  const k = kindOf(a);
  return isYoung(a, day) && ageYears(a, day) < 1.5 ? YOUNG[k][a.sex] : SEX_WORD[k][a.sex];
}

/** a new animal: a free name of its kind and sex, an age a dealer would sell, a temper */
export function freshAnimal(breed: string, day: number, taken: Set<string>, salt: string, o: { born?: number; sex?: 'f' | 'm'; dam?: string; sire?: string; prize?: string } = {}): NamedAnimal {
  const k = BREEDS[breed]?.kind ?? 'camel';
  const r = h(`${salt}:${breed}`);
  const sex = o.sex ?? (k === 'horse' && (r >>> 3) % 3 === 0 ? 'f' : (r >>> 3) % 2 ? 'f' : 'm');
  const list = NAMES[k][sex];
  let name = '';
  for (let i = 0; i < list.length; i++) { const c = list[(r + i) % list.length]; if (!taken.has(c)) { name = c; break; } }
  if (!name) { const c = list[r % list.length]; let n = 2; while (taken.has(`${c} ${['', '', 'the Second', 'the Third', 'the Fourth'][n] ?? n}`)) n++; name = `${c} ${['', '', 'the Second', 'the Third', 'the Fourth'][n] ?? n}`; }
  const grown = GROWN[k];
  const born = o.born ?? day - Math.round((grown + ((r >>> 9) % 6)) * YEAR + ((r >>> 14) % 300));
  const tempers = TEMPERS[k];
  return { id: `a${h(`${salt}:${name}:${day}`).toString(36)}`, breed, name, sex, born, temper: tempers[(r >>> 17) % tempers.length], miles: 0, joined: day,
    ...(o.dam ? { dam: o.dam } : {}), ...(o.sire ? { sire: o.sire } : {}), ...(o.prize ? { prize: o.prize } : {}) };
}

/** which of a breed goes first when one is sold or stabled by its breed: the newest, never an old friend if
 *  another will do */
const goOrder = (a: NamedAnimal, b: NamedAnimal) => (isFriend(a) ? 1 : 0) - (isFriend(b) ? 1 : 0) || a.miles - b.miles || b.joined - a.joined;
export const nextToGoAnimal = (herd: NamedAnimal[], breed: string) => herd.filter((a) => a.breed === breed).sort(goOrder)[0];

export interface Herds { party: NamedAnimal[]; stables: Record<string, NamedAnimal[]> }
/** Keep the names in step with the counts, everywhere at once: an animal stabled or taken back moves with
 *  its name; one bought or born gets a new name; one sold leaves (the newest first). */
export function syncHerds(h0: Herds, counts: { party: Record<string, number>; stables: Record<string, Record<string, number>> }, day: number): { herds: Herds; changed: boolean; gone: NamedAnimal[] } {
  const places = ['party', ...new Set([...Object.keys(counts.stables), ...Object.keys(h0.stables)])];
  const herdAt = (p: string) => (p === 'party' ? h0.party : h0.stables[p] ?? []);
  const countAt = (p: string) => (p === 'party' ? counts.party : counts.stables[p] ?? {});
  const out: Record<string, NamedAnimal[]> = {};
  const spare: NamedAnimal[] = [];
  let changed = false;
  // what each place has too many of goes into the spare pen
  for (const p of places) {
    const list = herdAt(p).filter((a) => BREEDS[a.breed]);
    if (list.length !== herdAt(p).length) changed = true;
    const keep: NamedAnimal[] = [];
    const breeds = new Set(list.map((a) => a.breed));
    for (const b of breeds) {
      const of = list.filter((a) => a.breed === b);
      const want = Math.max(0, countAt(p)[b] ?? 0);
      if (of.length > want) {
        const leave = [...of].sort(goOrder).slice(0, of.length - want);
        spare.push(...leave); changed = true;
        keep.push(...of.filter((a) => !leave.includes(a)));
      } else keep.push(...of);
    }
    out[p] = keep;
  }
  // and what each place is short of comes from the pen first (the same animal, moved), then fresh
  const taken = new Set([...Object.values(out).flat(), ...spare].map((a) => a.name));
  for (const p of places) {
    for (const [b, n] of Object.entries(countAt(p))) {
      if (!BREEDS[b]) continue;
      let have = out[p].filter((a) => a.breed === b).length;
      while (have < (n ?? 0)) {
        // a stabled animal brought back is the one you left; the old friend comes first
        spare.sort((x, y) => -goOrder(x, y));
        const i = spare.findIndex((x) => x.breed === b);
        const a = i >= 0 ? spare.splice(i, 1)[0] : freshAnimal(b, day, taken, `${p}:${b}:${day}:${have}:${taken.size}`);
        taken.add(a.name); out[p].push(a); have++; changed = true;
      }
    }
  }
  const stables: Record<string, NamedAnimal[]> = {};
  for (const p of places) if (p !== 'party' && out[p].length) stables[p] = out[p];
  return changed ? { herds: { party: out.party, stables }, changed, gone: spare } : { herds: h0, changed: false, gone: [] };
}

/** the miles walked: every animal with you shares them; one crossing the line becomes an old friend */
export function walkHerd(herd: NamedAnimal[], px: number): { herd: NamedAnimal[]; friends: NamedAnimal[] } {
  if (!herd.length || px <= 0) return { herd, friends: [] };
  const add = px * MILES_PER_PX;
  const friends: NamedAnimal[] = [];
  const out = herd.map((a) => { const n = { ...a, miles: a.miles + add }; if (!isFriend(a) && isFriend(n)) friends.push(n); return n; });
  return { herd: out, friends };
}

/** what the named animals change in what the caravan carries: an old friend takes a little more, a young
 *  one not yet grown carries less than a full load */
export function herdCarry(herd: NamedAnimal[] | undefined, day: number) {
  let d = 0;
  for (const a of herd ?? []) {
    const b = BREEDS[a.breed];
    if (!b) continue;
    if (isYoung(a, day)) d -= b.load * (ageYears(a, day) < 1.5 ? 1 : 0.5);
    else if (isFriend(a) && b.load > 0) d += 1;
  }
  return d;
}

/** what a dealer pays for this animal: young stock rising to the full price as it grows, old beasts less,
 *  a prize animal at its mark */
export function animalWorth(a: NamedAnimal, day: number, base: number) {
  const y = ageYears(a, day), g = GROWN[kindOf(a)];
  const age = y < g ? 0.45 + 0.55 * (y / g) : y > 15 ? 0.55 : y > 11 ? 0.8 : 1;
  return Math.round(base * age * (a.prize ? 1.15 : 1));
}

/** At the stables: a female and a male of a kind left together for some weeks; she carries; the young is
 *  born where she is when the day comes. Returns the new herds and the journal lines. */
export function breedHerds(herds: Herds, day: number, where: (sid: string) => string): { herds: Herds; lines: string[]; born: { at: string; young: NamedAnimal }[] } {
  const lines: string[] = [];
  const born: { at: string; young: NamedAnimal }[] = [];
  const taken = new Set([...herds.party, ...Object.values(herds.stables).flat()].map((a) => a.name));
  const stepPlace = (list: NamedAnimal[], at: string): NamedAnimal[] => {
    const out = list.map((a) => ({ ...a }));
    for (const a of out) {
      const k = kindOf(a);
      if (a.sex !== 'f' || !CARRY_DAYS[k]) continue;
      // birth: wherever she is
      if (a.due !== undefined && day >= a.due) {
        const young = freshAnimal(a.breed, day, taken, `${a.id}:${day}:young`, { born: day, dam: a.name, sire: a.dueBy });
        taken.add(young.name);
        born.push({ at, young });
        const word = YOUNG[k][young.sex];
        lines.push(`${a.name} has given birth ${at === 'party' ? 'on the road' : `at the stable in ${where(at)}`}: ${withA(word)}${a.dueBy ? ` by ${a.dueBy}` : ''}. The grooms call ${young.sex === 'f' ? 'her' : 'him'} ${young.name}.`);
        a.due = undefined; a.dueBy = undefined; a.lastYoung = day;
        continue;
      }
      if (at === 'party' || a.due !== undefined) { a.mateSince = undefined; continue; }
      const grownF = ageYears(a, day) >= GROWN[k] && ageYears(a, day) <= 18 && (a.lastYoung === undefined || day - a.lastYoung >= 120);
      const mate = out.find((m) => m.sex === 'm' && kindOf(m) === k && ageYears(m, day) >= GROWN[k] && ageYears(m, day) <= 20);
      if (!grownF || !mate) { a.mateSince = undefined; continue; }
      if (a.mateSince === undefined) { a.mateSince = day; continue; }
      if (day - a.mateSince >= 21) {
        a.due = day + CARRY_DAYS[k]; a.dueBy = mate.name; a.mateSince = undefined;
        lines.push(`The groom at ${where(at)} sends word: ${a.name} is ${k === 'camel' ? 'in calf' : 'in foal'} to ${mate.name}. The young one is due in ${dueWords(a.due)}.`);
      }
    }
    return out;
  };
  const party = stepPlace(herds.party, 'party');
  const stables: Record<string, NamedAnimal[]> = {};
  for (const [sid, list] of Object.entries(herds.stables)) stables[sid] = stepPlace(list, sid);
  return { herds: { party, stables }, lines, born };
}
const withA = (w: string) => `${/^[aeiou]/.test(w) ? 'an' : 'a'} ${w}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** day 0 is 9 March 1925 */
export const dueWords = (day: number) => { const d = new Date(Date.UTC(1925, 2, 9 + day)); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// ---- the camel race: your camel against five others; breed, age, temper and miles together, and luck ----
const RIVALS = ['Sheikh Salem\'s', 'the Tarabin boys\'', 'Abu Sitta\'s', 'a Sudanese dealer\'s', 'the omda\'s son\'s', 'Hajj Mutlaq\'s', 'a Cairo bey\'s', 'old Eid\'s'];
export interface RaceResult { place: number; field: { name: string; mine: boolean }[] }
/** how fast this camel runs today, before luck */
export function raceMerit(a: NamedAnimal, day: number) {
  const b = BREEDS[a.breed];
  if (!b) return 0;
  const y = ageYears(a, day);
  const age = y < GROWN.camel ? -3 : y <= 12 ? 1 : y <= 16 ? 0 : -2;
  const temper = a.temper === 'spirited' ? 1 : a.temper === 'proud' ? 0.5 : a.temper === 'stubborn' ? -1 : a.temper === 'greedy' ? -0.5 : 0;
  return b.ride * 10 + age + temper + (isFriend(a) ? 1.5 : 0) + (a.prize ? 1 : 0);
}
export function runRace(a: NamedAnimal, day: number, seed: string): RaceResult {
  const luck = (k: string) => (h(`${seed}:${k}`) % 1000) / 1000;
  const mine = raceMerit(a, day) + luck('me') * 6;
  const used = new Set<string>([a.name]);
  const rivals = [0, 1, 2, 3, 4].map((i) => {
    const r = h(`${seed}:r${i}`);
    const pool = NAMES.camel[r % 2 ? 'f' : 'm'];
    let nm = pool[r % pool.length]; for (let k = 1; used.has(nm) && k < pool.length; k++) nm = pool[(r + k) % pool.length];
    used.add(nm);
    // the others: racing camels of the camps, Bishari and Anafi blood, some good, some not
    return { name: `${RIVALS[(r >>> 5) % RIVALS.length]} ${nm}`, mine: false, score: 15 + ((r >>> 9) % 50) / 10 + luck(`r${i}`) * 6 };
  });
  const field = [...rivals, { name: a.name, mine: true, score: mine }].sort((x, y) => y.score - x.score);
  return { place: field.findIndex((f) => f.mine) + 1, field: field.map(({ name, mine: m }) => ({ name, mine: m })) };
}
export const RACE_PURSE = [5, 2, 1];
