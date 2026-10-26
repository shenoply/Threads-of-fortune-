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

export type Culture = 'egypt' | 'levant' | 'anatolia' | 'iraq' | 'persia' | 'bedouin' | 'armenian' | 'greek';
export type Role = 'souq' | 'merchant' | 'notable' | 'craft' | 'caravan' | 'dealer' | 'kin';
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
}
export interface House {
  id: string; name: string; home: string; head: string; members: string[];
  rank: 'humble' | 'trade' | 'notable' | 'grand';
  trade: string;
  rival?: string;
}

// ---- names, by people ----
const NAMES: Record<Culture, { m: string[]; f: string[]; fam: string[] }> = {
  egypt: {
    m: ['Mahmoud', 'Ahmad', 'Hassan', 'Ibrahim', 'Mustafa', 'Abdel-Rahman', 'Sayed', 'Hamid', 'Fathi', 'Ragab', 'Shaaban', 'Mitwalli', 'Abdel-Aziz', 'Zaki', 'Tawfiq', 'Fouad', 'Hilmi', 'Rashad', 'Kamal', 'Anwar', 'Saad', 'Salah', 'Gamal', 'Yusuf', 'Abdu', 'Hafez', 'Ismail', 'Ali', 'Khalil', 'Darwish'],
    f: ['Fatma', 'Zeinab', 'Aisha', 'Amina', 'Khadija', 'Nefisa', 'Sakina', 'Hanem', 'Bahiya', 'Ihsan', 'Safiya', 'Nabawiya', 'Tafida', 'Zakiya', 'Hamida', 'Rasmiya', 'Galila', 'Wahiba', 'Saniya', 'Hikmat'],
    fam: ['al-Masri', 'Abdel-Fattah', 'el-Sharqawi', 'Mansour', 'el-Tantawi', 'Barakat', 'el-Bahrawi', 'Hegazi', 'Shalabi', 'el-Gammal', 'Abu Zeid', 'el-Naggar', 'Radwan', 'el-Assiuti', 'Ezzat', 'Moussa', 'el-Hakim', 'Sabri', 'Fahmi', 'el-Saadani'],
  },
  levant: {
    m: ['Elias', 'Yusuf', 'Khalil', 'Georges', 'Nasri', 'Salim', 'Fuad', 'Rashid', 'Jamil', 'Tawfiq', 'Nicola', 'Habib', 'Wadih', 'Abdallah', 'Mahmoud', 'Hussein', 'Raja', 'Shukri', 'Adib', 'Najib', 'Fares', 'Rizq', 'Ibrahim', 'Musa', 'Saleh'],
    f: ['Mariam', 'Hind', 'Wadad', 'Nazira', 'Salwa', 'Laila', 'Rose', 'Afifa', 'Saada', 'Najla', 'Hilana', 'Fadwa', 'Widad', 'Latifa', 'Munira', 'Samia', 'Amira', 'Nadia'],
    fam: ['Haddad', 'Khoury', 'Sabbagh', 'Tamari', 'Nassar', 'Qassis', 'Dajani', 'Husseini', 'Nashashibi', 'Atallah', 'Shami', 'Halabi', 'Mardam', 'Azm', 'Kurd Ali', 'Quwatli', 'Sursock', 'Bustani', 'Tueni', 'Faris'],
  },
  anatolia: {
    m: ['Mehmet', 'Ahmet', 'Hasan', 'Hüseyin', 'Ali', 'Mustafa', 'Osman', 'Halil', 'İbrahim', 'Rıza', 'Hakkı', 'Necip', 'Şevket', 'Tevfik', 'Kâzım', 'Cemal', 'Hilmi', 'Nuri', 'Sadık', 'Rauf'],
    f: ['Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Hacer', 'Nazlı', 'Şükran', 'Saadet', 'Meliha', 'Naciye', 'Feride', 'Halide', 'Nimet'],
    fam: ['Tezcan', 'Kalkan', 'Yılmaz', 'Demirci', 'Halıcı', 'Kuyumcu', 'Tüccar', 'Bezzaz', 'Kâtipzade', 'Hacıoğlu', 'Karaosman', 'Ağaoğlu', 'Bayraktar', 'Çelebi', 'Hocazade'],
  },
  iraq: {
    m: ['Jassim', 'Abbas', 'Kadhim', 'Hamid', 'Ja\'far', 'Mahdi', 'Salman', 'Hashim', 'Rauf', 'Abdul-Karim', 'Yasin', 'Nuri', 'Saleh', 'Mahmoud', 'Ezra', 'Menahem', 'Sassoon', 'Yusuf'],
    f: ['Zahra', 'Hasiba', 'Najiba', 'Badriya', 'Fadhila', 'Ruqaya', 'Simha', 'Habiba', 'Wafiqa', 'Khatun'],
    fam: ['al-Najjar', 'al-Chalabi', 'Kubba', 'al-Haidari', 'Shamash', 'Sassoon', 'al-Pachachi', 'al-Umari', 'al-Damluji', 'Baban', 'al-Shabibi', 'Abu Timman'],
  },
  persia: {
    m: ['Hossein', 'Hassan', 'Reza', 'Mohammad-Ali', 'Abbas', 'Mahmoud', 'Javad', 'Karim', 'Mehdi', 'Ghulam-Hossein', 'Ali-Akbar', 'Esmail', 'Mirza Jafar', 'Habibollah', 'Nasrollah', 'Asadollah'],
    f: ['Fatemeh', 'Zahra', 'Khadijeh', 'Maryam', 'Roqayeh', 'Shokat', 'Tuba', 'Batul', 'Ashraf', 'Qamar'],
    fam: ['Tabrizi', 'Kashani', 'Isfahani', 'Kermani', 'Hamadani', 'Sarraf', 'Farshchi', 'Qalibaf', 'Tajer', 'Bazargan', 'Malek', 'Amin al-Tojjar'],
  },
  bedouin: {
    m: ['Salem', 'Eid', 'Mutlaq', 'Hamad', 'Sweilim', 'Farhan', 'Odeh', 'Musallam', 'Atiya', 'Suleiman', 'Rabia', 'Mansour', 'Khalaf', 'Jum\'a'],
    f: ['Nura', 'Hamda', 'Shaha', 'Mizna', 'Sabha', 'Fadda', 'Hasna', 'Wudha'],
    fam: ['ibn Eid', 'Abu Rabia', 'al-Tarabini', 'Abu Sitta', 'al-Huweitat', 'ibn Jazi', 'al-Ghanim', 'Abu Taya'],
  },
  armenian: {
    m: ['Hagop', 'Garabed', 'Boghos', 'Kevork', 'Hrant', 'Mihran', 'Krikor', 'Sarkis', 'Vartan', 'Aram', 'Levon', 'Ohannes', 'Toros', 'Nishan'],
    f: ['Anoush', 'Siranoush', 'Zabel', 'Maritza', 'Takouhi', 'Arshalouys', 'Haiganoush', 'Lusine'],
    fam: ['Boyajian', 'Kalaydjian', 'Tashjian', 'Kouyoumdjian', 'Arslanian', 'Balian', 'Tavitian', 'Manoukian', 'Gulbenkian', 'Der Ohannessian'],
  },
  greek: {
    m: ['Pericles', 'Yanni', 'Costa', 'Dimitri', 'Spiro', 'Nikos', 'Stavros', 'Andreas', 'Michalis', 'Panayotis', 'Lefteris', 'Giorgos'],
    f: ['Eleni', 'Zoe', 'Katina', 'Despina', 'Sofia', 'Maria', 'Eftychia', 'Calliope'],
    fam: ['Stavrou', 'Lambrakis', 'Ralli', 'Kalogeras', 'Benakis', 'Salvagos', 'Zervudachi', 'Choremi', 'Kyriakou', 'Papadopoulos'],
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

const GOODS: Record<Culture, string[]> = {
  egypt: ['cotton', 'sugar and dates', 'Assiut shawls', 'brass and copper', 'coffee', 'grain'],
  levant: ['silk', 'olive-oil soap', 'oranges', 'Damascus brocade', 'dried apricots', 'tobacco'],
  anatolia: ['angora wool', 'tobacco', 'hazelnuts', 'opium for the pharmacies', 'kilims'],
  iraq: ['dates', 'Persian gall-nuts', 'hides', 'grain'],
  persia: ['dried fruit', 'saffron', 'turquoise', 'opium', 'gum tragacanth'],
  bedouin: ['camels', 'ghee', 'goat-hair cloth'],
  armenian: ['jewellery', 'cloth', 'photography'],
  greek: ['wine and spirits', 'groceries', 'cotton futures', 'shipping'],
};
const NOTABLE_TITLE: Record<Culture, string[]> = {
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
const CHRISTIAN = /\b(Elias|Georges|Nicola|Habib|Wadih|Nasri|Jamil|Raja|Adib|Najib|Fares|Rizq|Rose|Hilana|Mariam|Wadad|Nazira|Afifa|Najla|Fadwa|Widad|Haddad|Khoury|Sabbagh|Tamari|Nassar|Qassis|Atallah|Sursock|Bustani|Tueni|Faris|Valenti)\b/;
const JEWISH = /\b(Ezra|Menahem|Sassoon|Simha|Shamash|Levy|Cohen)\b/;
const faithOf = (name: string, c: Culture): Person['faith'] => (c === 'armenian' || c === 'greek' || CHRISTIAN.test(name) ? 'christian' : JEWISH.test(name) ? 'jewish' : 'muslim');
const traitsOf = (r: () => number): Trait[] => { const a = pick(r, TRAITS); let b = pick(r, TRAITS); while (b === a || OPP[a] === b) b = pick(r, TRAITS); return [a, b]; };

// faces: the closest free face in the pool for people, sex, age and class
const POOL_REGION: Record<Culture, PoolRegion> = { egypt: 'egypt', levant: 'levant', anatolia: 'anatolia', iraq: 'iraq', persia: 'persia', bedouin: 'bedouin', armenian: 'armenian', greek: 'greek' };
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
  // the names already taken by the characters written by hand
  const usedNames = new Set<string>([...RIVALS.map((x) => x.name), ...Object.values(NPCS).map((n) => n.name), ...Object.values(BRIDES).map((b) => b.name)]);
  const face = (p: Person, cls: 'humble' | 'trade' | 'notable') => {
    const reg = POOL_REGION[p.culture], band = ageBand(p.age);
    const fits = (f: (typeof POOL)[number]) => f.region === reg && f.sex === p.sex;
    const order = [
      POOL.filter((f) => fits(f) && f.age === band && f.cls === cls),
      POOL.filter((f) => fits(f) && f.age === band),
      POOL.filter((f) => fits(f)),
    ];
    for (const list of order) { const free = list.find((f) => !used.has(f.id)); if (free) { used.add(free.id); return free.id; } }
    // the pool is spent for this people: share a face with someone far away
    const any = order[1][0] ?? order[2][0];
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
  const nameFor = (r: () => number, c: Culture, sex: 'm' | 'f', fam?: string, faith?: Person['faith']) => {
    const all = NAMES[c][sex];
    const fit = faith === 'christian' && c === 'levant' ? all.filter((n) => CHRISTIAN.test(n)) : faith === 'muslim' ? all.filter((n) => !CHRISTIAN.test(n) && !JEWISH.test(n)) : faith === 'jewish' ? all.filter((n) => JEWISH.test(n) || ['Yusuf', 'Saleh', 'Habiba', 'Khatun'].includes(n)) : all;
    const names = fit.length ? fit : all;
    for (let k = 0; k < 12; k++) {
      const given = pick(r, names);
      const n = `${given} ${fam ?? pick(r, NAMES[c].fam)}`;
      if (!usedNames.has(n)) { usedNames.add(n); return { name: n, given }; }
    }
    const given = pick(r, names); return { name: `${given} ${fam ?? pick(r, NAMES[c].fam)}`, given };
  };
  /** a wife and children for a head of house; the children's ages fit his */
  const family = (head: Person, h: House, r: () => number, opts: { daughter?: Person; wife?: boolean } = {}) => {
    const c = head.culture;
    const fam = /\bthe\b|^Uncle /.test(head.name) || !head.name.includes(' ') ? pick(r, NAMES[c].fam) : head.name.match(/((?:al-|el-|Abu |ibn |Abd al-|Abd |Der )?\S+)$/)![1];
    if (opts.wife !== false && head.age >= 28) {
      const w = nameFor(r, c, 'f', pick(r, NAMES[c].fam), head.faith);
      const wife = add({ faith: head.faith, id: `${head.id}-w`, name: w.name, short: c === 'egypt' || c === 'levant' || c === 'iraq' ? `Umm ${pick(r, NAMES[c].m)}` : w.given, sex: 'f', age: Math.max(22, head.age - 4 - Math.floor(r() * 8)), culture: c, home: head.home, role: 'kin', title: `Wife of ${head.short}`, house: h.id, spouse: head.id, children: [], traits: traitsOf(r), bio: '' }, h.rank === 'humble' ? 'humble' : h.rank === 'trade' ? 'trade' : 'notable');
      head.spouse = wife.id; h.members.push(wife.id);
    }
    const n = head.age < 30 ? 0 : 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const sex: 'm' | 'f' = r() < 0.55 ? 'm' : 'f';
      const age = Math.max(4, head.age - 22 - Math.floor(r() * 14) - i * 3);
      const nm = nameFor(r, c, sex, fam, head.faith);
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
    const h: House = { id: `house-${rv.id}`, name: `The house of ${head.name.replace(/^Signora /, '')}`, home: city, head: head.id, members: [head.id], rank: rv.season >= 180000 ? 'grand' : 'notable', trade: 'carpets', rival: rv.id };
    head.house = h.id; houses[h.id] = h;
    const brideId = Object.values(BRIDES).find((b) => b.house === rv.id)?.id;
    const daughter = brideId ? add({ id: `bride-${brideId}`, name: BRIDES[brideId].name, short: BRIDES[brideId].short, sex: 'f', age: 21, culture: c, home: BRIDES[brideId].city, role: 'kin', title: `Daughter of ${head.short}`, children: [], traits: traitsOf(r), art: `art/family/bride-${brideId}.jpg`, bride: brideId, bio: BRIDES[brideId].intro }) : undefined;
    family(head, h, r, { daughter, wife: !rv.she });
  }
  // 2. the other brides' families: a buyer, a weaver, a coffee-house keeper, a sheikh
  for (const b of Object.values(BRIDES)) {
    if (b.house || people[`bride-${b.id}`]) continue;
    const r = rngOf(`bride-${b.id}`);
    const c = b.city === 'bedouin' ? 'bedouin' : b.id === 'emine' ? 'anatolia' : cultureOf(b.city);
    const fname = b.father.split(',')[0];
    const head = add({ id: `father-${b.id}`, name: fname, short: fname.replace(/^(Ustaz|Hajj|Haj|Sheikh|the late)\s+/i, '').split(' ')[0], sex: 'm', age: 48 + Math.floor(r() * 14), culture: c, home: b.city, role: b.rank === 'humble' ? 'craft' : 'merchant', title: ((t) => t[0].toUpperCase() + t.slice(1))((b.father.split(',').slice(1).join(',').trim() || b.father).replace(/^who\s+/, '')), children: [], traits: b.likes === 'honesty' ? ['honest', 'stern'] : b.likes === 'dress' ? ['proud', 'curious'] : b.likes === 'learning' ? ['curious', 'pious'] : ['honest', 'generous'], bio: b.father }, b.rank === 'humble' ? 'humble' : b.rank === 'grand' ? 'notable' : 'trade');
    if (/the late/i.test(b.father)) { head.title = `Father of Shukri and Aziza (died 1922)`; head.bio = 'The late Hajj Mansour kept a stall in the Giza lane for thirty years.'; }
    const h: House = { id: `house-${b.id}`, name: `The family of ${b.short}`, home: b.city, head: head.id, members: [head.id], rank: b.rank ?? 'trade', trade: b.brings };
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
      const h: House = { id: `house-${head.id}`, name: `The house of ${nm.name.split(' ').slice(1).join(' ') || nm.name}`, home: st.id, head: head.id, members: [head.id], rank: role === 'notable' ? 'notable' : role === 'craft' ? 'humble' : 'trade', trade: role === 'souq' ? 'carpets' : role === 'merchant' ? goods! : role === 'craft' ? 'the looms' : 'land and law' };
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
    const h: House = { id: `house-${p.id}`, name: `The house of ${nm.name.split(' ').slice(1).join(' ')}`, home: route[0], head: p.id, members: [p.id], rank: 'trade', trade: goods };
    p.house = h.id; houses[h.id] = h;
    family(p, h, r);
    caravans[pid] = p.id;
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
  return (world().byCity[city] ?? []).map((id) => world().people[id]).filter((p) => p.role !== 'kin').sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
}
export const souqMaster = (city: string) => world().people[`${city}-souq`];
export const caravanMaster = (partyId: string) => { const id = world().caravans[partyId]; return id ? world().people[id] : undefined; };
export const ageNow = (p: Person, day: number) => p.age + Math.floor(day / 365);
