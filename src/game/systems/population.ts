// The people of the world, in the manner of Bannerlord: a few dozen characters written by hand, and
// several hundred more made by rules. Every city keeps its notables (the souq master who runs its rug
// trade, a merchant in another line, a man of standing, a craftsman), each the head of a family with a
// wife and children; the dealers on the season's tables head their own houses, the brides are their
// daughters; the road's caravans have masters who travel between the cities. All of it is made from a
// fixed seed, so the same world exists in every game and the encyclopedia can link one to another.
// What changes in a game (how each feels about you, what has passed between you) is kept in the save
// (GameState.folk), not here.
//
// Pure: no store import.
import { SETTLEMENTS, NPCS } from '../../data/world';
import { RIVALS } from '../../data/rivals';
import { POOL, type PoolRegion } from '../../data/portraitPool';
import { BRIDES } from './household';
import { FOREIGN_HEADS, FOREIGN_NAMES, FOREIGN_FAITH, FOREIGN_POOL, FOREIGN_WORD, type Foreign, type FamilyKind } from '../../data/foreigners';
import { TOWN_CHARACTERS } from '../../data/characters';

export type Culture = 'egypt' | 'levant' | 'anatolia' | 'iraq' | 'persia' | 'bedouin' | 'armenian' | 'greek' | Foreign | 'copt';
export type Role = 'souq' | 'merchant' | 'notable' | 'craft' | 'caravan' | 'dealer' | 'kin' | 'resident' | 'character';
export type Trait = 'honest' | 'greedy' | 'proud' | 'generous' | 'cunning' | 'pious' | 'cheerful' | 'stern' | 'curious' | 'gossip';
export const TRAIT_WORD: Record<Trait, string> = { honest: 'Honest', greedy: 'Greedy', proud: 'Proud', generous: 'Generous', cunning: 'Cunning', pious: 'Devout', cheerful: 'Cheerful', stern: 'Stern', curious: 'Curious', gossip: 'A talker' };

export interface Person {
  id: string;
  name: string;
  /** what others call him: "Haddad", "Umm Karim" */
  short: string;
  sex: 'm' | 'f';
  /** age in 1925 */
  age: number;
  culture: Culture;
  home: string;
  role: Role;
  /** one plain line: "Rug dealer in the Souq al-Hamidiyya" */
  title: string;
  house?: string;
  father?: string;
  mother?: string;
  spouse?: string;
  children: string[];
  traits: Trait[];
  /** a face from the portrait pool (art/people/<face>.jpg) */
  face?: string;
  /** a picture of his own instead (hand-made characters) */
  art?: string;
  /** the hand-made character this person is: an NPC with a dialogue (data/world NPCS), a dealer on the
   *  tables (data/rivals), a bride (household BRIDES) */
  npc?: string; rival?: string; bride?: string;
  /** what he trades in, for a merchant or caravan master */
  goods?: string;
  /** a caravan master's road: two cities */
  route?: [string, string];
  bio: string;
  /** Christian or Jewish families keep their own feasts and their own blessings */
  faith: 'muslim' | 'christian' | 'jewish';
  /** what they say when asked about their trade (foreign residents and town characters) */
  talk?: [string, string] | string;
  /** a foreigner: which people ("English", "Greek") */
  foreign?: string;
  /** a child of a mixed marriage: "Greek father, Egyptian mother" */
  mixed?: string;
  /** one of the town characters: what everyone remembers about them */
  look?: string;
}
export interface House {
  id: string; name: string; home: string; head: string; members: string[];
  rank: 'humble' | 'trade' | 'notable' | 'grand';
  trade: string;
  rival?: string;
}

// ---- names, by people ----
const NAMES: Record<Culture, { m: string[]; f: string[]; fam: string[] }> = {
  ...FOREIGN_NAMES,
  copt: {
    m: ['Boutros', 'Girgis', 'Mikhail', 'Tadros', 'Hanna', 'Wissa', 'Morcos', 'Fahim', 'Labib', 'Shenouda'],
    f: ['Mariam', 'Faiza', 'Wardah', 'Labiba', 'Victoria', 'Isis', 'Hoda', 'Marcelle', 'Tereza', 'Ilham'],
    fam: ['Ghali', 'Wissa', 'Abdel-Malek', 'Girgis', 'Tadros', 'Hanna', 'Basili', 'Doss', 'Iskandar', 'Ebeid'],
  },
  egypt: {
    m: ['Mahmoud', 'Ahmad', 'Hassan', 'Ibrahim', 'Mustafa', 'Abdel-Rahman', 'Sayed', 'Hamid', 'Fathi', 'Ragab', 'Shaaban', 'Mitwalli', 'Abdel-Aziz', 'Zaki', 'Tawfiq', 'Fouad', 'Hilmi', 'Rashad', 'Kamal', 'Anwar', 'Saad', 'Salah', 'Gamal', 'Yusuf', 'Abdu', 'Hafez', 'Ismail', 'Ali', 'Khalil', 'Darwish'],
    f: ['Fatma', 'Zeinab', 'Aisha', 'Amina', 'Khadija', 'Nefisa', 'Sakina', 'Hanem', 'Bahiya', 'Ihsan', 'Safiya', 'Nabawiya', 'Tafida', 'Zakiya', 'Hamida', 'Rasmiya', 'Galila', 'Wahiba', 'Saniya', 'Hikmat'],
    fam: ['al-Masri', 'Abdel-Fattah', 'el-Sharqawi', 'Mansour', 'el-Tantawi', 'Barakat', 'el-Bahrawi', 'Hegazi', 'Shalabi', 'el-Gammal', 'Abu Zeid', 'el-Naggar', 'Radwan', 'el-Assiuti', 'Ezzat', 'Moussa', 'el-Hakim', 'Sabri', 'Fahmi', 'el-Saadani'],
  },
  levant: {
    m: ['Elias', 'Yusuf', 'Khalil', 'Georges', 'Nasri', 'Salim', 'Fuad', 'Rashid', 'Jamil', 'Tawfiq', 'Nicola', 'Habib', 'Wadih', 'Abdallah', 'Mahmoud', 'Hussein', 'Raja', 'Shukri', 'Adib', 'Najib', 'Fares', 'Rizq', 'Ibrahim', 'Musa', 'Saleh'],
    f: ['Mariam', 'Hind', 'Wadad', 'Nazira', 'Salwa', 'Laila', 'Rose', 'Afifa', 'Saada', 'Najla', 'Hilana', 'Fadwa', 'Widad', 'Latifa', 'Munira', 'Samia', 'Amira', 'Nadia'],
    fam: ['Haddad', 'Khoury', 'Sabbagh', 'Tamari', 'Nassar', 'Qassis', 'Saliba', 'Hakim', 'Najjar', 'Atallah', 'Shami', 'Halabi', 'Daher', 'Salameh', 'Kanaan', 'Abboud', 'Shalhoub', 'Karam', 'Hanna', 'Faris'],
  },
  anatolia: {
    m: ['Mehmet', 'Ahmet', 'Hasan', 'Hüseyin', 'Ali', 'Mustafa', 'Osman', 'Halil', 'İbrahim', 'Rıza', 'Hakkı', 'Necip', 'Şevket', 'Tevfik', 'Kâzım', 'Cemal', 'Hilmi', 'Nuri', 'Sadık', 'Rauf'],
    f: ['Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Hacer', 'Nazlı', 'Şükran', 'Saadet', 'Meliha', 'Naciye', 'Feride', 'Halide', 'Nimet'],
    fam: ['Tezcan', 'Kalkan', 'Yılmaz', 'Demirci', 'Halıcı', 'Kuyumcu', 'Tüccar', 'Bezzaz', 'Kâtipzade', 'Hacıoğlu', 'Kuyucu', 'Demirtaş', 'Bayraktar', 'Çelebi', 'Hocazade'],
  },
  iraq: {
    m: ['Jassim', 'Abbas', 'Kadhim', 'Hamid', 'Ja\'far', 'Mahdi', 'Salman', 'Hashim', 'Rauf', 'Abdul-Karim', 'Yasin', 'Nuri', 'Saleh', 'Mahmoud', 'Ezra', 'Menahem', 'Sassoon', 'Yusuf'],
    f: ['Zahra', 'Hasiba', 'Najiba', 'Badriya', 'Fadhila', 'Ruqaya', 'Simha', 'Habiba', 'Wafiqa', 'Khatun'],
    fam: ['al-Najjar', 'al-Hilli', 'al-Saffar', 'al-Attar', 'Shamash', 'Moallem', 'al-Bazzaz', 'al-Umari', 'al-Khayyat', 'al-Basri', 'al-Rubai', 'Abu Khalaf'],
  },
  persia: {
    m: ['Hossein', 'Hassan', 'Reza', 'Mohammad-Ali', 'Abbas', 'Mahmoud', 'Javad', 'Karim', 'Mehdi', 'Ghulam-Hossein', 'Ali-Akbar', 'Esmail', 'Mirza Jafar', 'Habibollah', 'Nasrollah', 'Asadollah'],
    f: ['Fatemeh', 'Zahra', 'Khadijeh', 'Maryam', 'Roqayeh', 'Shokat', 'Tuba', 'Batul', 'Ashraf', 'Qamar'],
    fam: ['Tabrizi', 'Kashani', 'Isfahani', 'Kermani', 'Hamadani', 'Sarraf', 'Farshchi', 'Qalibaf', 'Tajer', 'Bazargan', 'Malek', 'Bazzaz'],
  },
  bedouin: {
    m: ['Salem', 'Eid', 'Mutlaq', 'Hamad', 'Sweilim', 'Farhan', 'Odeh', 'Musallam', 'Atiya', 'Suleiman', 'Rabia', 'Mansour', 'Khalaf', 'Jum\'a'],
    f: ['Nura', 'Hamda', 'Shaha', 'Mizna', 'Sabha', 'Fadda', 'Hasna', 'Wudha'],
    fam: ['ibn Eid', 'Abu Rabia', 'al-Tarabini', 'Abu Sitta', 'al-Huweitat', 'ibn Jazi', 'al-Ghanim', 'Abu Taya'],
  },
  armenian: {
    m: ['Hagop', 'Garabed', 'Boghos', 'Kevork', 'Hrant', 'Mihran', 'Krikor', 'Sarkis', 'Vartan', 'Aram', 'Levon', 'Ohannes', 'Toros', 'Nishan'],
    f: ['Anoush', 'Siranoush', 'Zabel', 'Maritza', 'Takouhi', 'Arshalouys', 'Haiganoush', 'Lusine'],
    fam: ['Boyajian', 'Kalaydjian', 'Tashjian', 'Kouyoumdjian', 'Arslanian', 'Balian', 'Tavitian', 'Manoukian', 'Hovsepian', 'Der Ohannessian'],
  },
  greek: {
    m: ['Pericles', 'Yanni', 'Costa', 'Dimitri', 'Spiro', 'Nikos', 'Stavros', 'Andreas', 'Michalis', 'Panayotis', 'Lefteris', 'Giorgos'],
    f: ['Eleni', 'Zoe', 'Katina', 'Despina', 'Sofia', 'Maria', 'Eftychia', 'Calliope'],
    fam: ['Stavrou', 'Lambrakis', 'Antoniou', 'Kalogeras', 'Georgiou', 'Pappas', 'Nikolaidis', 'Kostopoulos', 'Kyriakou', 'Papadopoulos'],
  },
};
const CULTURE_OF: Record<string, Culture> = {
  giza: 'egypt', saqqara: 'egypt', fayoum: 'egypt', cairo: 'egypt', tanta: 'egypt', alexandria: 'egypt', portsaid: 'egypt', suez: 'egypt',
  sinai: 'bedouin', bedouin: 'bedouin', jaffa: 'levant', jerusalem: 'levant', beirut: 'levant', damascus: 'levant', amman: 'levant', aleppo: 'levant',
  konya: 'anatolia', istanbul: 'anatolia', ankara: 'anatolia', baghdad: 'iraq', khanaqin: 'iraq',
  kermanshah: 'persia', hamadan: 'persia', tehran: 'persia', tabriz: 'persia', kashan: 'persia', isfahan: 'persia', kerman: 'persia',
};
export const cultureOf = (city: string): Culture => CULTURE_OF[city] ?? 'egypt';
/** cities where a second people keep a share of the trade: Armenians in Aleppo and Cairo, Greeks in Alexandria */
const MINORITY: Record<string, Culture> = { aleppo: 'armenian', cairo: 'armenian', istanbul: 'armenian', alexandria: 'greek', portsaid: 'greek', beirut: 'armenian' };

const GOODS: Record<string, string[]> = {
  egypt: ['cotton', 'sugar and dates', 'Assiut shawls', 'brass and copper', 'coffee', 'grain'],
  levant: ['silk', 'olive-oil soap', 'oranges', 'Damascus brocade', 'dried apricots', 'tobacco'],
  anatolia: ['angora wool', 'tobacco', 'hazelnuts', 'opium for the pharmacies', 'kilims'],
  iraq: ['dates', 'Persian gall-nuts', 'hides', 'grain'],
  persia: ['dried fruit', 'saffron', 'turquoise', 'opium', 'gum tragacanth'],
  bedouin: ['camels', 'ghee', 'goat-hair cloth'],
  armenian: ['jewellery', 'cloth', 'photography'],
  greek: ['wine and spirits', 'groceries', 'cotton futures', 'shipping'],
};
const NOTABLE_TITLE: Record<string, string[]> = {
  egypt: ['the qadi of the shari\'a court', 'a landowning bey', 'the sheikh of the quarter', 'a pasha\'s agent'],
  levant: ['the mukhtar of the quarter', 'a landowning effendi', 'the qadi', 'a notable of the old families'],
  anatolia: ['the müftü', 'a landowning ağa', 'a deputy of the new Assembly', 'the head of the guild'],
  iraq: ['a sheikh of the tribes', 'the qadi', 'a landowning sayyid', 'a deputy of the new parliament'],
  persia: ['a mojtahed of the great mosque', 'a landowning khan', 'the head of the merchants\' guild', 'a prince of the old house'],
  bedouin: ['the sheikh of the tribe'],
  armenian: ['the head of the church council'],
  greek: ['the president of the Greek community'],
};
const CRAFT_TITLE = ['master weaver', 'dyer', 'carpet restorer', 'wool merchant to the looms', 'fringe and binding maker'];
const TRAITS: Trait[] = ['honest', 'greedy', 'proud', 'generous', 'cunning', 'pious', 'cheerful', 'stern', 'curious', 'gossip'];
const OPP: Partial<Record<Trait, Trait>> = { honest: 'cunning', cunning: 'honest', greedy: 'generous', generous: 'greedy', cheerful: 'stern', stern: 'cheerful' };

// ---- a fixed seed: the same world in every game ----
function rngOf(seed: string) { let h = 2166136261; for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const CHRISTIAN = /\b(Elias|Georges|Nicola|Habib|Wadih|Nasri|Jamil|Raja|Adib|Najib|Fares|Rizq|Rose|Hilana|Mariam|Wadad|Nazira|Afifa|Najla|Fadwa|Widad|Haddad|Khoury|Sabbagh|Tamari|Nassar|Qassis|Atallah|Saliba|Shalhoub|Karam|Hanna|Faris|Valenti)\b/;
const JEWISH = /\b(Ezra|Menahem|Sassoon|Simha|Shamash|Moallem|Levy|Cohen)\b/;
const NATIVE = new Set<Culture>(['egypt', 'levant', 'anatolia', 'iraq', 'persia', 'bedouin']);
const faithOf = (name: string, c: Culture): Person['faith'] => (c in FOREIGN_NAMES ? (FOREIGN_FAITH[c as Foreign] ?? 'christian') : c === 'armenian' || c === 'greek' || c === 'copt' || CHRISTIAN.test(name) ? 'christian' : JEWISH.test(name) ? 'jewish' : 'muslim');
const traitsOf = (r: () => number): Trait[] => { const a = pick(r, TRAITS); let b = pick(r, TRAITS); while (b === a || OPP[a] === b) b = pick(r, TRAITS); return [a, b]; };

// faces: the closest free face in the pool for people, sex, age and class
const POOL_REGION: Record<Culture, PoolRegion> = { egypt: 'egypt', levant: 'levant', anatolia: 'anatolia', iraq: 'iraq', persia: 'persia', bedouin: 'bedouin', armenian: 'armenian', greek: 'greek', copt: 'egypt', ...FOREIGN_POOL };
const ageBand = (a: number): 'y' | 'm' | 'o' => (a < 33 ? 'y' : a < 55 ? 'm' : 'o');

export interface World { people: Record<string, Person>; houses: Record<string, House>; byCity: Record<string, string[]>; caravans: Record<string, string> }
let built: World | null = null;

/** The world's people, made once. */
export function world(): World {
  if (built) return built;
  const people: Record<string, Person> = {};
  const houses: Record<string, House> = {};
  const byCity: Record<string, string[]> = {};
  const used = new Set<string>();
  const faceCities: Record<string, Set<string>> = {};
  const faceHouses: Record<string, Set<string>> = {};
  // the names already taken by the characters written by hand
  const usedNames = new Set<string>([...RIVALS.map((x) => x.name), ...Object.values(NPCS).map((n) => n.name), ...Object.values(BRIDES).filter((b) => !b.folk).map((b) => b.name)]);
  const face = (p: Person, cls: 'humble' | 'trade' | 'notable') => {
    const reg = POOL_REGION[p.culture], band = ageBand(p.age);
    const fits = (f: (typeof POOL)[number]) => f.region === reg && f.sex === p.sex;
    const order = [
      ...(p.culture in FOREIGN_NAMES || p.culture === 'greek' ? [POOL.filter((f) => fits(f) && f.age === band && f.nat === p.culture), POOL.filter((f) => fits(f) && f.nat === p.culture)] : []),
      POOL.filter((f) => fits(f) && f.age === band && f.cls === cls),
      POOL.filter((f) => fits(f) && f.age === band),
      POOL.filter((f) => fits(f)),
    ];
    for (const list of order) { const free = list.find((f) => !used.has(f.id)); if (free) { used.add(free.id); (faceCities[free.id] ??= new Set()).add(p.home); if (p.house) (faceHouses[free.id] ??= new Set()).add(p.house); return free.id; } }
    // the pool is spent for this people: share a face, but never with someone in the same town (so never
    // with a sister or a neighbour), and spread the sharing over the whole set
    const all = order.find((l) => l.length) ?? [];
    const kin = all.filter((f) => !p.house || !faceHouses[f.id]?.has(p.house));
    const far = kin.filter((f) => !faceCities[f.id]?.has(p.home));
    const from = far.length ? far : kin.length ? kin : all;
    let hh = 0; for (const ch of p.id) hh = (hh * 31 + ch.charCodeAt(0)) >>> 0;
    const any = from[hh % Math.max(1, from.length)];
    if (any) { (faceCities[any.id] ??= new Set()).add(p.home); if (p.house) (faceHouses[any.id] ??= new Set()).add(p.house); }
    return any?.id;
  };
  const add = (p: Omit<Person, 'faith'> & { faith?: Person['faith'] }, cls: 'humble' | 'trade' | 'notable' = 'trade'): Person => {
    p.faith = p.faith ?? faithOf(p.name, p.culture);
    const q = p as Person;
    if (!q.art && q.age >= 12) q.face = face(q, cls);
    people[q.id] = q;
    (byCity[q.home] ??= []).push(q.id);
    return q;
  };
  const houseNames = new Set<string>();
  const settlementName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name.split(',')[0] ?? id;
  /** a house's name, never the same as another's: a second "house of al-Tojjar" is known by its town */
  const houseName = (base: string, city: string, full?: string) => {
    const tries = [base, full, `${base} of ${settlementName(city)}`, full && `${full} of ${settlementName(city)}`].filter(Boolean) as string[];
    const n = tries.find((t) => !houseNames.has(t)) ?? `${base} (${houseNames.size})`;
    houseNames.add(n); return n;
  };
  const nameFor = (r: () => number, c: Culture, sex: 'm' | 'f', fam?: string, faith?: Person['faith'], avoid?: Set<string>) => {
    const all = NAMES[c][sex];
    const fit = faith === 'christian' && c === 'levant' ? all.filter((n) => CHRISTIAN.test(n)) : faith === 'muslim' ? all.filter((n) => !CHRISTIAN.test(n) && !JEWISH.test(n)) : faith === 'jewish' ? all.filter((n) => JEWISH.test(n) || ['Yusuf', 'Saleh', 'Habiba', 'Khatun'].includes(n)) : all;
    const names = fit.length ? fit : all;
    for (let k = 0; k < 40; k++) {
      const given = pick(r, k >= 20 ? all : names);
      if (avoid?.has(given) && k < 39) continue;
      const n = `${given} ${fam ?? pick(r, NAMES[c].fam)}`;
      if (!usedNames.has(n)) { usedNames.add(n); return { name: n, given }; }
    }
    const given = pick(r, names); return { name: `${given} ${fam ?? pick(r, NAMES[c].fam)}`, given };
  };
  /** a wife and children for a head of house; the children's ages fit his */
  const family = (head: Person, h: House, r: () => number, opts: { daughter?: Person; wife?: boolean } = {}) => {
    const c = head.culture;
    const fam = /\bthe\b|^Uncle /.test(head.name) || !head.name.includes(' ') ? pick(r, NAMES[c].fam) : head.name.match(/((?:al-|el-|Abu |ibn |Abd al-|Abd |Der )?\S+)$/)![1];
    // no two in one family share a first name
    const givens = new Set<string>([head.name.split(' ')[0], ...(opts.daughter ? [opts.daughter.name.split(' ')[0]] : [])]);
    if (opts.wife !== false && head.age >= 28) {
      const w = nameFor(r, c, 'f', pick(r, NAMES[c].fam), head.faith, givens);
      givens.add(w.given);
      const wife = add({ faith: head.faith, id: `${head.id}-w`, name: w.name, short: c === 'egypt' || c === 'levant' || c === 'iraq' ? `Umm ${pick(r, NAMES[c].m)}` : w.given, sex: 'f', age: Math.max(22, head.age - 4 - Math.floor(r() * 8)), culture: c, home: head.home, role: 'kin', title: `Wife of ${head.short}`, house: h.id, spouse: head.id, children: [], traits: traitsOf(r), bio: '' }, h.rank === 'humble' ? 'humble' : h.rank === 'trade' ? 'trade' : 'notable');
      head.spouse = wife.id; h.members.push(wife.id);
    }
    const n = head.age < 30 ? 0 : 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const sex: 'm' | 'f' = r() < 0.55 ? 'm' : 'f';
      const age = Math.max(4, head.age - 22 - Math.floor(r() * 14) - i * 3);
      const nm = nameFor(r, c, sex, fam, head.faith, givens);
      givens.add(nm.given);
      const kid = add({ faith: head.faith, id: `${head.id}-c${i}`, name: nm.name, short: nm.given, sex, age, culture: c, home: head.home, role: 'kin', title: `${sex === 'm' ? 'Son' : 'Daughter'} of ${head.short}`, house: h.id, father: head.id, mother: head.spouse, children: [], traits: traitsOf(r), bio: '' }, h.rank === 'humble' ? 'humble' : h.rank === 'trade' ? 'trade' : 'notable');
      head.children.push(kid.id); if (head.spouse) people[head.spouse].children.push(kid.id); h.members.push(kid.id);
    }
    // a mother is known by her eldest son: Umm Karim
    const son = head.children.map((id) => people[id]).find((k) => k.sex === 'm');
    if (head.spouse && son && people[head.spouse].faith === 'muslim' && (c === 'egypt' || c === 'levant' || c === 'iraq')) people[head.spouse].short = `Umm ${son.short}`;
    else if (head.spouse) people[head.spouse].short = people[head.spouse].name.split(' ')[0];
    if (opts.daughter) { const d = opts.daughter; d.father = head.id; d.mother = head.spouse; d.house = h.id; head.children.push(d.id); if (head.spouse) people[head.spouse].children.push(d.id); h.members.push(d.id); }
  };

  // 1. the dealers on the season's tables: each heads a house in his city; a bride may be his daughter
  for (const rv of RIVALS) {
    const city = rv.cities[0];
    const r = rngOf(rv.id);
    const c = rv.id === 'rival-boghos' || rv.id === 'rival-kouyoumdjian' || rv.id === 'rival-arslanian' ? 'armenian' : rv.id === 'rival-yanni' || rv.id === 'rival-costa' ? 'greek' : rv.id === 'rival-lucia' ? 'greek' : cultureOf(city);
    const short = rv.name.replace(/^(Haj|Hajj|Abu Nadim|Signora|Hüsnü Bey)\s+/, '').split(' ').slice(-1)[0];
    const head = add({ id: rv.id, name: rv.name, short: rv.she ? 'Signora Valenti' : short, sex: rv.she ? 'f' : 'm', age: rv.temper === 'old' ? 62 + Math.floor(r() * 10) : 40 + Math.floor(r() * 14), culture: c, home: city, role: 'dealer', title: rv.role, rival: rv.id, art: `art/portraits/${rv.id}.jpg`, children: [], traits: rv.temper === 'aggressive' ? ['proud', 'greedy'] : rv.temper === 'cunning' ? ['cunning', 'curious'] : rv.temper === 'old' ? ['stern', 'pious'] : ['honest', 'cheerful'], bio: `${rv.role}. His house sells about £${Math.round(rv.season / 100).toLocaleString('en-GB')} of rugs in a season.` }, 'notable');
    if (rv.she) head.bio = `${rv.role}. She has kept the firm's place on the Alexandria table since his death.`;
    const h: House = { id: `house-${rv.id}`, name: houseName(`The house of ${head.name.replace(/^Signora /, '')}`, city), home: city, head: head.id, members: [head.id], rank: rv.season >= 180000 ? 'grand' : 'notable', trade: 'carpets', rival: rv.id };
    head.house = h.id; houses[h.id] = h;
    const brideId = Object.values(BRIDES).find((b) => b.house === rv.id && !b.folk)?.id;
    const daughter = brideId ? add({ id: `bride-${brideId}`, name: BRIDES[brideId].name, short: BRIDES[brideId].short, sex: 'f', age: 21, culture: c, home: BRIDES[brideId].city, role: 'kin', title: `Daughter of ${head.short}`, children: [], traits: traitsOf(r), art: `art/family/bride-${brideId}.jpg`, bride: brideId, bio: BRIDES[brideId].intro }) : undefined;
    family(head, h, r, { daughter, wife: !rv.she });
  }
  // 2. the other brides' families: a buyer, a weaver, a coffee-house keeper, a sheikh
  for (const b of Object.values(BRIDES)) {
    if (b.house || b.folk || people[`bride-${b.id}`]) continue;
    const r = rngOf(`bride-${b.id}`);
    const c = b.city === 'bedouin' ? 'bedouin' : b.id === 'emine' ? 'anatolia' : cultureOf(b.city);
    const fname = b.father.split(',')[0];
    const head = add({ id: `father-${b.id}`, name: fname, short: fname.replace(/^(Ustaz|Hajj|Haj|Sheikh|the late)\s+/i, '').split(' ')[0], sex: 'm', age: 48 + Math.floor(r() * 14), culture: c, home: b.city, role: b.rank === 'humble' ? 'craft' : 'merchant', title: ((t) => t[0].toUpperCase() + t.slice(1))((b.father.split(',').slice(1).join(',').trim() || b.father).replace(/^who\s+/, '')), children: [], traits: b.likes === 'honesty' ? ['honest', 'stern'] : b.likes === 'dress' ? ['proud', 'curious'] : b.likes === 'learning' ? ['curious', 'pious'] : ['honest', 'generous'], bio: b.father }, b.rank === 'humble' ? 'humble' : b.rank === 'grand' ? 'notable' : 'trade');
    if (/the late/i.test(b.father)) { head.title = `Father of Shukri and Aziza (died 1922)`; head.bio = 'The late Hajj Mansour kept a stall in the Giza lane for thirty years.'; }
    const h: House = { id: `house-${b.id}`, name: houseName(`The family of ${b.short}`, b.city), home: b.city, head: head.id, members: [head.id], rank: b.rank ?? 'trade', trade: b.brings };
    head.house = h.id; houses[h.id] = h;
    const daughter = add({ id: `bride-${b.id}`, name: b.name, short: b.short, sex: 'f', age: 20 + Math.floor(r() * 5), culture: c, home: b.city, role: 'kin', title: `Daughter of ${head.short}`, children: [], traits: traitsOf(r), art: `art/family/bride-${b.id}.jpg`, bride: b.id, bio: b.intro });
    family(head, h, r, { daughter });
    // Aziza's brother: Shukri, who keeps the stall across the lane from yours
    if (b.id === 'aziza') {
      const sh = add({ id: 'shukri', name: 'Shukri Mansour', short: 'Shukri', sex: 'm', age: 27, culture: 'egypt', home: 'giza', role: 'dealer', title: 'Keeps the stall across the lane from yours', house: h.id, father: head.id, children: [], traits: ['proud', 'cunning'], art: 'art/portraits/shukri.jpg', bio: 'He took his late father\'s stall in the Giza lane and means to have the whole lane before he is thirty. He watches every buyer who stops at yours.' });
      head.children.unshift(sh.id); h.members.push(sh.id);
    }
  }
  // 3. each city's notables: the souq master, a merchant, a man of standing, a craftsman, each with a family
  for (const st of SETTLEMENTS) {
    if (!['city', 'town', 'port', 'oasis', 'home', 'camp'].includes(st.kind)) continue;
    const big = st.kind === 'city' || st.kind === 'port';
    const roles: Role[] = st.kind === 'camp' ? ['notable', 'merchant'] : big ? ['souq', 'merchant', 'notable', 'craft'] : ['souq', 'merchant', 'craft'];
    roles.forEach((role, i) => {
      const r = rngOf(`${st.id}:${role}`);
      const c = role === 'merchant' && MINORITY[st.id] ? MINORITY[st.id] : role === 'craft' && st.id === 'aleppo' ? 'armenian' : cultureOf(st.id);
      const sex: 'm' | 'f' = role === 'craft' && r() < 0.35 ? 'f' : 'm';
      const nm = nameFor(r, c, sex);
      const age = role === 'notable' ? 50 + Math.floor(r() * 20) : 32 + Math.floor(r() * 28);
      const where = st.name;
      const goods = role === 'merchant' ? pick(r, GOODS[c]) : undefined;
      const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
      const title = role === 'souq' ? `Master of the rug souq, ${where}` : role === 'merchant' ? `Merchant in ${goods}, ${where}` : role === 'notable' ? `${cap(pick(r, NOTABLE_TITLE[c]))}, ${where}` : `${cap(pick(r, CRAFT_TITLE))}, ${where}`;
      const short = role === 'notable' ? `${c === 'anatolia' ? '' : c === 'persia' ? 'Mirza ' : 'Sheikh '}${nm.given}`.trim() : sex === 'f' ? `Umm ${pick(r, NAMES[c].m)}` : nm.name.split(' ').slice(-1)[0];
      const head = add({ id: `${st.id}-${role}`, name: nm.name, short, sex, age, culture: c, home: st.id, role, title, goods, children: [], traits: traitsOf(r), bio: '' }, role === 'notable' ? 'notable' : role === 'craft' ? 'humble' : 'trade');
      head.bio = bioFor(head, st.name);
      const h: House = { id: `house-${head.id}`, name: houseName(`The house of ${nm.name.split(' ').slice(1).join(' ') || nm.name}`, st.id, `The house of ${nm.name}`), home: st.id, head: head.id, members: [head.id], rank: role === 'notable' ? 'notable' : role === 'craft' ? 'humble' : 'trade', trade: role === 'souq' ? 'carpets' : role === 'merchant' ? goods! : role === 'craft' ? 'the looms' : 'land and law' };
      head.house = h.id; houses[h.id] = h;
      family(head, h, r, { wife: sex === 'm' });
      void i;
    });
  }
  // the characters written by hand: each stands among his town's people, with his own talk
  for (const st of SETTLEMENTS) for (const id of st.people) {
    const n = NPCS[id];
    if (!n || people[`npc-${id}`]) continue;
    const r = rngOf(`npc:${id}`);
    add({ id: `npc-${id}`, name: n.name, short: n.name.split(' ')[0], sex: /Umm|Hanım|Nadia|Sister|Madame|Mrs/.test(n.name) ? 'f' : 'm', age: 35 + Math.floor(r() * 25), culture: cultureOf(st.id), home: st.id, role: 'notable', title: n.role, npc: id, art: `art/portraits/${id}.jpg`, children: [], traits: traitsOf(r), bio: n.role });
  }
  // 4. the road's caravan masters, one to each caravan on the map
  const caravans: Record<string, string> = {};
  const ROADS: [string, [string, string], Culture, string][] = [
    ['p0', ['aleppo', 'cairo'], 'levant', 'Aleppo wool'], ['p3', ['damascus', 'baghdad'], 'iraq', 'Persian carpets'],
    ['p5', ['fayoum', 'giza'], 'egypt', 'oasis salt and dates'], ['p6', ['hamadan', 'khanaqin'], 'persia', 'Persian carpets'],
  ];
  for (const [pid, route, c, goods] of ROADS) {
    const r = rngOf(`caravan:${pid}`);
    const nm = nameFor(r, c, 'm');
    const p = add({ id: `caravan-${pid}`, name: nm.name, short: nm.name.split(' ').slice(-1)[0], sex: 'm', age: 38 + Math.floor(r() * 22), culture: c, home: route[0], role: 'caravan', title: `Caravan master, ${goods}`, goods, route, children: [], traits: traitsOf(r), bio: '' }, 'trade');
    p.bio = `Takes ${goods} between ${SETTLEMENTS.find((x) => x.id === route[0])?.name} and ${SETTLEMENTS.find((x) => x.id === route[1])?.name}, and has done for ${Math.max(6, p.age - 24)} years.`;
    const h: House = { id: `house-${p.id}`, name: houseName(`The house of ${nm.name.split(' ').slice(1).join(' ')}`, route[0], `The house of ${nm.name}`), home: route[0], head: p.id, members: [p.id], rank: 'trade', trade: goods };
    p.house = h.id; houses[h.id] = h;
    family(p, h, r);
    caravans[pid] = p.id;
  }
  // 5. the foreign communities: officials, officers, merchants, teachers, engineers and their families,
  // some married into the town (data/foreigners.ts)
  const WIFE_OF: Record<Exclude<FamilyKind, 'alone' | 'own'>, (head: Person) => Culture> = {
    'mixed-egypt': (hd) => (hd.faith === 'muslim' ? 'egypt' : 'copt'), 'mixed-levant': () => 'levant', 'mixed-greek': () => 'greek', 'mixed-armenian': () => 'armenian', 'mixed-british': () => 'british',
  };
  const an = (w: string) => `${/^[AEIOU]/.test(w) ? 'an' : 'a'} ${w}`;
  const wordOf = (c: Culture) => (FOREIGN_WORD as Record<string, string>)[c] ?? (c === 'copt' || c === 'egypt' ? 'Egyptian' : c === 'levant' ? 'Syrian' : c);
  FOREIGN_HEADS.forEach((fh, i) => {
    const r = rngOf(`foreign:${fh.city}:${i}`);
    const c = fh.c as Culture;
    const sex = fh.sex ?? 'm';
    const nm = nameFor(r, c, sex);
    const role: Role = fh.goods ? 'merchant' : 'resident';
    const lowTitle = /^(Major|Lieutenant|Colonel|Captain|Inspector|Officer|Flight)/.test(fh.title);
    const short = c === 'british' || c === 'american' ? `${sex === 'f' ? 'Miss' : lowTitle ? fh.title.split(' ')[0] : 'Mr'} ${nm.name.split(' ').slice(-1)[0]}`
      : c === 'french' || c === 'belgian' || c === 'swiss' ? `${sex === 'f' ? 'Madame' : 'Monsieur'} ${nm.name.split(' ').slice(-1)[0]}`
      : c === 'italian' || c === 'maltese' ? `${sex === 'f' ? 'Signora' : 'Signor'} ${nm.name.split(' ').slice(-1)[0]}`
      : c === 'german' ? `${sex === 'f' ? 'Frau' : 'Herr'} ${nm.name.split(' ').slice(-1)[0]}`
      : c === 'greek' ? `${sex === 'f' ? 'Kyria' : 'Kyrios'} ${nm.name.split(' ').slice(-1)[0]}`
      : nm.given;
    const head = add({ id: `foreign-${fh.city}-${i}`, name: nm.name, short, sex, age: fh.age, culture: c, home: fh.city, role, title: fh.title, goods: fh.goods, children: [], traits: traitsOf(r), bio: fh.bio, talk: fh.talk, foreign: wordOf(c) }, fh.rank === 'humble' ? 'humble' : fh.rank === 'trade' ? 'trade' : 'notable');
    if (fh.fam === 'alone') return;
    const h: House = { id: `house-${head.id}`, name: houseName(`The ${nm.name.split(' ').slice(-1)[0]} family`, fh.city, `The family of ${nm.name}`), home: fh.city, head: head.id, members: [head.id], rank: fh.rank, trade: fh.goods ?? fh.title.replace(/^(an?|the) /i, '').split(' of ')[0].toLowerCase() };
    head.house = h.id; houses[h.id] = h;
    const wc: Culture = fh.fam === 'own' ? c : WIFE_OF[fh.fam](head);
    const fam = nm.name.split(' ').slice(-1)[0];
    const givens = new Set<string>([nm.given]);
    if (head.age >= 26) {
      const w = nameFor(r, wc, 'f', pick(r, NAMES[wc].fam), wc === 'egypt' ? 'muslim' : undefined, givens);
      givens.add(w.given);
      const wife = add({ faith: head.faith, id: `${head.id}-w`, name: w.name, short: w.given, sex: 'f', age: Math.max(22, head.age - 3 - Math.floor(r() * 9)), culture: wc, home: fh.city, role: 'kin', title: `Wife of ${head.short}`, house: h.id, spouse: head.id, children: [], traits: traitsOf(r), bio: wc === c ? '' : `${wordOf(wc)} by birth, married into the ${fam} family.`, foreign: wc === c ? head.foreign : undefined }, fh.rank === 'humble' ? 'humble' : fh.rank === 'trade' ? 'trade' : 'notable');
      head.spouse = wife.id; h.members.push(wife.id);
    }
    const n = head.age < 30 || !head.spouse ? 0 : 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const ksex: 'm' | 'f' = r() < 0.5 ? 'm' : 'f';
      // a child of a mixed house takes a name from either side
      const from: Culture = wc !== c && r() < 0.5 ? wc : c;
      const kn = nameFor(r, from, ksex, fam, head.faith, givens);
      givens.add(kn.given);
      const kid = add({ faith: head.faith, id: `${head.id}-c${k}`, name: kn.name, short: kn.given, sex: ksex, age: Math.max(4, head.age - 24 - Math.floor(r() * 12) - k * 3), culture: c, home: fh.city, role: 'kin', title: `${ksex === 'm' ? 'Son' : 'Daughter'} of ${head.short}`, house: h.id, father: head.id, mother: head.spouse, children: [], traits: traitsOf(r), bio: wc !== c ? `Born in ${SETTLEMENTS.find((x) => x.id === fh.city)?.name}, of ${an(wordOf(c))} father and ${an(wordOf(wc))} mother; at home in both.` : '', foreign: head.foreign, mixed: wc !== c ? `${wordOf(c)} father, ${wordOf(wc)} mother` : undefined }, fh.rank === 'humble' ? 'humble' : fh.rank === 'trade' ? 'trade' : 'notable');
      head.children.push(kid.id); if (head.spouse) people[head.spouse].children.push(kid.id); h.members.push(kid.id);
    }
  });
  // 6. the town characters: the giant porter, the tiny moneychanger, the moustache (data/characters.ts)
  for (const tc of TOWN_CHARACTERS) {
    const r = rngOf(`char:${tc.id}`);
    usedNames.add(tc.name);
    add({ id: `char-${tc.id}`, name: tc.name, short: tc.short, sex: tc.sex, age: tc.age, culture: tc.c as Culture, home: tc.city, role: 'character', title: tc.title, children: [], traits: traitsOf(r), bio: tc.bio, talk: tc.talk, look: tc.look, art: `art/people/char-${tc.id}.jpg`, foreign: NATIVE.has(tc.c as Culture) ? undefined : wordOf(tc.c as Culture) });
  }
  // no family shares a face, and as few neighbours as the pool allows: a last pass over every house
  const inTown: Record<string, Record<string, number>> = {};
  for (const q of Object.values(people)) if (q.face) { const t = (inTown[q.home] ??= {}); t[q.face] = (t[q.face] ?? 0) + 1; }
  for (const h of Object.values(houses)) {
    const seenF = new Set<string>();
    for (const m of h.members) {
      const q = people[m];
      if (!q?.face) continue;
      if (!seenF.has(q.face)) { seenF.add(q.face); continue; }
      const reg = POOL_REGION[q.culture], band = ageBand(q.age);
      const cands = POOL.filter((f) => f.region === reg && f.sex === q.sex && !seenF.has(f.id));
      const best = [...cands].sort((a, b) => (Number(a.age !== band) - Number(b.age !== band)) || ((inTown[q.home]?.[a.id] ?? 0) - (inTown[q.home]?.[b.id] ?? 0)))[0];
      if (!best) continue;
      inTown[q.home][q.face]--; q.face = best.id; inTown[q.home][best.id] = (inTown[q.home][best.id] ?? 0) + 1; seenF.add(best.id);
    }
  }
  built = { people, houses, byCity, caravans };
  return built;
}

function bioFor(p: Person, where: string): string {
  const t = p.traits;
  const lead = p.role === 'souq' ? `Every rug that changes hands in the ${where} souq passes under his eye, and most of them through his hands.`
    : p.role === 'merchant' ? `Deals in ${p.goods} from a warehouse near the ${where} market, and knows what every caravan is carrying before it arrives.`
    : p.role === 'notable' ? `One of the men ${where} listens to: disputes come to his door, and so do favours.`
    : `${p.sex === 'f' ? 'Her' : 'His'} hands are blue to the wrist from the vats, and the dealers of ${where} send ${p.sex === 'f' ? 'her' : 'him'} the work they cannot do themselves.`;
  const tail = t.includes('honest') ? ' Known for a straight price.' : t.includes('cunning') ? ' Never quite says what he means.' : t.includes('generous') ? ' Feeds half the quarter at the feasts.' : t.includes('greedy') ? ' Counts twice what others count once.' : t.includes('pious') ? ' Never misses the dawn prayer.' : t.includes('gossip') ? ' Knows everybody\'s business, and tells it.' : t.includes('proud') ? ' Does not forget a slight.' : '';
  return lead + tail;
}

/** a person's face: their own picture, a face from the pool, or nothing (the drawn medallion stands in) */
export const faceSrc = (p: Person) => p.art ?? (p.face ? `art/people/${p.face}.jpg` : undefined);
export const person = (id: string): Person | undefined => world().people[id];
export const houseOf = (id: string): House | undefined => world().houses[id];
/** the notables a city keeps: its souq master first */
export function notablesOf(city: string): Person[] {
  const order: Role[] = ['souq', 'dealer', 'merchant', 'notable', 'craft', 'caravan'];
  return (world().byCity[city] ?? []).map((id) => world().people[id]).filter((p) => p.role !== 'kin' && p.role !== 'resident' && p.role !== 'character').sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
}
/** the foreigners who live in a town and head a household there (or live alone) */
export const residentsOf = (city: string): Person[] => (world().byCity[city] ?? []).map((id) => world().people[id]).filter((p) => p.role === 'resident');
/** the town's characters: the people everyone remembers */
export const charactersOf = (city: string): Person[] => (world().byCity[city] ?? []).map((id) => world().people[id]).filter((p) => p.role === 'character');
export const souqMaster = (city: string) => world().people[`${city}-souq`];
export const caravanMaster = (partyId: string) => { const id = world().caravans[partyId]; return id ? world().people[id] : undefined; };
export const ageNow = (p: Person, day: number) => p.age + Math.floor(day / 365);

// ---- the daughters of the world's families, as matches a merchant could make ----
const RANK_PRICE: Record<House['rank'], { mahr: number; feast: number; rep: number; gift: [string, number]; minRep?: number }> = {
  humble: { mahr: 1200, feast: 700, rep: 2, gift: ['a box of sweets and a bolt of cotton', 100] },
  trade: { mahr: 2600, feast: 1400, rep: 4, gift: ['a brass tray and good coffee for the house', 220] },
  notable: { mahr: 5200, feast: 2800, rep: 6, gift: ['a silk shawl for her mother', 450], minRep: 25 },
  grand: { mahr: 9000, feast: 5000, rep: 8, gift: ['a small silk rug for her mother', 800], minRep: 40 },
};
const LOOK_OF: Record<string, 'egypt' | 'levant' | 'desert'> = { egypt: 'egypt', copt: 'egypt', levant: 'levant', anatolia: 'levant', armenian: 'levant', greek: 'levant', iraq: 'desert', persia: 'desert', bedouin: 'desert', indian: 'desert' };
/** a daughter of age and unpromised: 18 to 28 in the year the game has reached */
export function eligibleDaughters(day: number): Person[] {
  const w = world();
  return Object.values(w.people).filter((p) => p.sex === 'f' && p.role === 'kin' && p.father && !p.bride && ageNow(p, day) >= 18 && ageNow(p, day) <= 28 && w.people[p.father]?.role !== 'kin');
}
export const folkBrideId = (personId: string) => `folk-${personId}`;
/** Each such daughter as a match in the household's terms (household BRIDES), added once. */
export function registerFolkBrides(day = 0, keep: string[] = []) {
  const w = world();
  // a match already made or in hand stays a match, whatever her age now
  const kept = keep.filter((k) => k.startsWith('folk-')).map((k) => w.people[k.slice(5)]).filter(Boolean);
  for (const d of [...eligibleDaughters(day), ...kept]) {
    const id = folkBrideId(d.id);
    if (BRIDES[id]) continue;
    const fa = w.people[d.father!];
    const h = d.house ? w.houses[d.house] : undefined;
    const rank = h?.rank ?? 'trade';
    const pr = RANK_PRICE[rank];
    const city = SETTLEMENTS.find((x) => x.id === d.home);
    const likes = fa.traits.includes('honest') || fa.traits.includes('stern') ? 'honesty' : fa.traits.includes('proud') || fa.traits.includes('greedy') ? 'dress' : fa.traits.includes('curious') || fa.traits.includes('pious') ? 'learning' : 'craft';
    const her = d.traits.includes('cheerful') ? 'quick to laugh' : d.traits.includes('curious') ? 'asks more questions than her brothers' : d.traits.includes('proud') ? 'carries herself like a pasha\'s daughter' : d.traits.includes('pious') ? 'devout and quiet' : d.traits.includes('cunning') ? 'sharper than her father, and knows it' : d.traits.includes('generous') ? 'known in the quarter for her kindness' : d.traits.includes('stern') ? 'serious beyond her years' : 'keeps her father\'s house';
    const brings = fa.role === 'souq' ? `Her father's souq in ${city?.name} will sell to you as to family.` : fa.role === 'dealer' ? `Her father's house in ${city?.name} would count you as one of its own.` : fa.role === 'merchant' ? `Her family's trade in ${fa.goods ?? 'goods'} opens the merchants of ${city?.name} to you.` : fa.role === 'notable' ? `Her father's word carries weight in ${city?.name}: its dealers treat you as a friend.` : fa.role === 'craft' ? 'She was raised among the looms, and knows a rug from the back.' : `Her family's friends in ${city?.name} would be yours.`;
    (BRIDES as Record<string, unknown>)[id] = {
      id, folk: d.id, name: d.name, short: d.short, city: d.home, cityName: city?.name ?? d.home,
      father: `${fa.name}, ${fa.title.charAt(0).toLowerCase()}${fa.title.slice(1)}`, introducer: fa.name,
      intro: `${fa.short}'s daughter, ${ageNow(d, day)}: ${her}.`,
      brings, mahr: pr.mahr, feast: pr.feast, feastRep: pr.rep, gift: { label: pr.gift[0], cost: pr.gift[1] },
      likes, rank, meet: 'friend', minRep: pr.minRep, role: fa.role === 'craft' ? 'rugs' : fa.role === 'merchant' ? 'books' : fa.role === 'souq' ? 'stall' : 'home',
      friends: [d.home], art: faceSrc(d), look: LOOK_OF[d.culture] ?? 'levant',
    };
  }
}
/** the daughters of age in this person's house, as match ids */
export const daughtersToMarry = (personId: string, day: number) => { const p = person(personId); return p ? p.children.map((c) => world().people[c]).filter((c) => c && eligibleDaughters(day).some((e) => e.id === c.id)).map((c) => folkBrideId(c.id)) : []; };
