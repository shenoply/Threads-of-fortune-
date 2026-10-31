// Your men by name. The troop counts stay the rule of the game; this roster puts a face, a name and a
// record on every man behind them, so a man killed on the road is someone you knew.
import { POOL, type PoolRegion } from '../../data/portraitPool';
import { TROOPS } from '../../data/caravan';

export interface NamedMan {
  id: string; name: string; kind: string; face: string;
  joined: number; fights: number; kills: number; scars: number;
  /** wounded: out of the line until this day */
  hurtUntil?: number;
  /** a name the men gave him, earned in fights */
  by?: string;
  /** the town he was taken on in */
  home?: string;
}
export interface FallenMan {
  name: string; kind: string; day: number; fights: number; kills: number; where?: string;
  /** save 31: his face, the town he came from, the day he joined, how he died */
  face?: string; home?: string; joined?: number; how?: string;
  /** the day money went to his family */
  paid?: number;
}

// who a man is follows what he was hired as: a Bedouin rider is always a Bedouin, an Arnaut an Albanian,
// the Giza, Cairo and Alexandria watchmen are Egyptians; a guard, a veteran or a village lad is a man of
// the town he was hired in
type NameRegion = 'egypt' | 'bedouin' | 'albanian' | 'levant' | 'iraq' | 'persia' | 'turkish';
const FIXED: Record<string, NameRegion> = { bedouin: 'bedouin', desertcaptain: 'bedouin', reformed: 'bedouin', arnaut: 'albanian', watchman: 'egypt', sentinel: 'egypt', harbour: 'egypt' };
const OF_CULTURE: Record<string, NameRegion> = { egypt: 'egypt', copt: 'egypt', bedouin: 'bedouin', levant: 'levant', armenian: 'levant', greek: 'egypt', iraq: 'iraq', persia: 'persia', anatolia: 'turkish' };
const FACE_REGION: Record<NameRegion, PoolRegion> = { egypt: 'egypt', bedouin: 'bedouin', albanian: 'anatolia', levant: 'levant', iraq: 'iraq', persia: 'persia', turkish: 'anatolia' };
const AGE: Record<string, ('y' | 'm' | 'o')[]> = { fellah: ['y'], watchman: ['y', 'm'], bedouin: ['y', 'm'], reformed: ['y', 'm'], guard: ['m'], sentinel: ['m'], harbour: ['m'], veteran: ['m', 'o'], desertcaptain: ['m', 'o'], arnaut: ['m', 'o'] };
/** working men, not gentlemen: a village lad or a reformed raider has a plain face, no guard a notable's */
const CLS: Record<string, ('humble' | 'trade')[]> = { fellah: ['humble'], watchman: ['humble'], reformed: ['humble'], bedouin: ['humble'] };

const GIVEN: Record<string, string[]> = {
  egypt: ['Mitwalli', 'Sayed', 'Ragab', 'Abdel-Sattar', 'Hamdi', 'Fathi', 'Mansour', 'Shaaban', 'Zaki', 'Hassanein', 'Desouki', 'Metwalli', 'Gaber', 'Ashour', 'Bayoumi', 'Khalaf', 'Ramadan', 'Sabry', 'Taha', 'Suleiman', 'Fawzi', 'Abbas', 'Mahrous', 'Hanafi'],
  bedouin: ['Mutlaq', 'Sweilim', 'Eid', 'Salem', 'Audeh', 'Hamad', 'Faraj', 'Mufleh', 'Nasser', 'Sabbah', 'Hussein', 'Atallah', 'Jazi', 'Rashed', 'Ghanem', 'Khalaf'],
  albanian: ['Bajram', 'Ilir', 'Gjergj', 'Ramiz', 'Selim', 'Hysen', 'Dervish', 'Kasem'],
  levant: ['Khalil', 'Salim', 'Fares', 'Rizq', 'Musa', 'Saleh', 'Mahmoud', 'Hussein', 'Abdallah', 'Jamil', 'Darwish', 'Yunis', 'Shukri', 'Odeh', 'Hasan', 'Ali'],
  iraq: ['Jassim', 'Kadhim', 'Abbas', 'Hashim', 'Salman', 'Mahdi', 'Hamid', 'Yasin', 'Saleh', 'Jabbar', 'Hamza', 'Shakir'],
  persia: ['Gholam', 'Hossein', 'Reza', 'Karim', 'Abbas', 'Javad', 'Mehdi', 'Esmail', 'Qasem', 'Rahim', 'Nader', 'Morad'],
  turkish: ['Mehmet', 'Hasan', 'Osman', 'Halil', 'Mustafa', 'Ali', 'Hüseyin', 'Rıza', 'Nuri', 'Sadık', 'Yusuf', 'Ramazan'],
};
const FAMILY: Record<string, string[]> = {
  egypt: ['Abu Zeid', 'el-Masri', 'Shalabi', 'Abu Hamed', 'el-Fiqi', 'Abdel-Aal', 'Mansi', 'el-Saeedi', 'Hegazi', 'Abu Shusha', 'el-Gammal', 'Abu Daif', 'Qandil', 'el-Sharqawi'],
  bedouin: ['al-Huweitat', 'Abu Rabia', 'al-Tarabin', 'al-Azazmeh', 'Abu Sitta', 'al-Sawarka', 'al-Masaid', 'Abu Tayi'],
  albanian: ['Gjoka', 'Leka', 'Dibra', 'Kruja', 'Shehu'],
  levant: ['Abu Khalil', 'Shami', 'Halabi', 'Daher', 'Salameh', 'Nassar', 'Hourani', 'Zoubi', 'Abu Ghosh', 'Masri', 'Jabali', 'Ayyoub'],
  iraq: ['al-Jubouri', 'al-Dulaimi', 'al-Shammari', 'al-Ubaidi', 'al-Hilli', 'al-Basri', 'al-Rubai', 'al-Kubaisi'],
  persia: ['Lor', 'Kurd', 'Hamadani', 'Kermanshahi', 'Isfahani', 'Bakhtiari', 'Qashqai', 'Tabrizi'],
  turkish: ['oğlu Ahmet', 'Demirci', 'Çoban', 'Konyalı', 'Karadağlı', 'Topal', 'Kara', 'Uzun'],
};
/** names the men give one of their own after enough fights: plain and earned */
const BYNAMES = ['the Steady', 'the Quiet', 'the Hawk', 'Iron Hand', 'the Patient', 'Abu Barud', 'the Lion', 'the Wall', 'Sharp-Eye', 'the Lucky'];

const h = (s: string) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const nameRegion = (kind: string, culture?: string): NameRegion => FIXED[kind] ?? OF_CULTURE[culture ?? 'egypt'] ?? 'egypt';
export const regionOf = (kind: string, culture?: string): PoolRegion => FACE_REGION[nameRegion(kind, culture)];
export const manLabel = (m: NamedMan) => (m.by ? `${m.name.split(' ')[0]} ${m.by}` : m.name);
export const kindName = (kind: string) => (TROOPS[kind]?.name ?? kind).toLowerCase().replace('bedouin', 'Bedouin').replace('cairo', 'Cairo').replace('giza', 'Giza').replace('arnaut', 'Arnaut');
/** the face, or the troop's own picture until the pool's painting exists */
export const manFace = (m: NamedMan) => `art/people/small/${m.face}.webp`;
export const manFallback = (m: { kind: string }) => `art/troops/${m.kind}.jpg`;

function freshMan(kind: string, day: number, taken: Set<string>, takenFaces: Set<string>, salt: string, place?: Place): NamedMan {
  const nr = nameRegion(kind, place?.culture);
  const region = FACE_REGION[nr];
  const g = GIVEN[nr] ?? GIVEN.egypt, f = FAMILY[nr] ?? FAMILY.egypt;
  let name = '';
  for (let i = 0; i < 60 && (!name || taken.has(name)); i++) {
    const k = h(`${salt}:${kind}:${i}`);
    name = `${g[k % g.length]} ${f[(k >>> 8) % f.length]}`;
  }
  const ages = AGE[kind] ?? ['m'];
  const cls = CLS[kind] ?? ['humble', 'trade'];
  const near = POOL.filter((p) => p.region === region && p.sex === 'm' && ages.includes(p.age));
  const plain = near.filter((p) => (cls as string[]).includes(p.cls));
  const faces = plain.length ? plain : near.filter((p) => p.cls !== 'notable');
  const all = faces.length ? faces : near.length ? near : POOL.filter((p) => p.sex === 'm' && ages.includes(p.age) && p.region === 'egypt');
  const free = all.filter((p) => !takenFaces.has(p.id));
  const pick = (free.length ? free : all)[h(`${salt}:face`) % (free.length || all.length || 1)];
  return { id: `m${h(`${salt}:${name}`).toString(36)}`, name, kind, face: pick?.id ?? 'egypt-m-m-01', joined: day, fights: 0, kills: 0, scars: 0, ...(place?.id ? { home: place.id } : {}) };
}
/** where new men are taken on: the town and its people */
export interface Place { id?: string; culture?: string }

/** keep the roster in step with the troop counts: new hires get a name, men let go leave (the newest first) */
export function syncMen(men: NamedMan[], troops: Record<string, number>, day: number, place?: Place): NamedMan[] {
  let out = men.filter((m) => (troops[m.kind] ?? 0) > 0);
  const byKind = new Map<string, NamedMan[]>();
  for (const m of out) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m]);
  let changed = out.length !== men.length;
  for (const [kind, list] of byKind) {
    const want = troops[kind] ?? 0;
    if (list.length > want) {
      const drop = new Set([...list].sort((a, b) => (a.by ? 1 : 0) - (b.by ? 1 : 0) || b.joined - a.joined || a.fights - b.fights).slice(0, list.length - want).map((m) => m.id));
      out = out.filter((m) => !drop.has(m.id)); changed = true;
    }
  }
  const names = new Set(out.map((m) => m.name)), faces = new Set(out.map((m) => m.face));
  for (const [kind, n] of Object.entries(troops)) {
    if (!TROOPS[kind]) continue;
    const have = out.filter((m) => m.kind === kind).length;
    for (let i = have; i < (n ?? 0); i++) {
      const m = freshMan(kind, day, names, faces, `${kind}:${day}:${i}:${out.length}:${place?.id ?? ''}`, place);
      names.add(m.name); faces.add(m.face); out = [...out, m]; changed = true;
    }
  }
  return changed ? out : men;
}

/** the man who goes home first if one of this kind is let go: the newest, never one the men have named */
export const nextToGo = (men: NamedMan[], kind: string) => [...men.filter((m) => m.kind === kind)].sort((a, b) => (a.by ? 1 : 0) - (b.by ? 1 : 0) || b.joined - a.joined || a.fights - b.fights)[0];

/** the men killed in a fight, chosen from those of each kind (the green and the unlucky first) */
export function killMen(men: NamedMan[], lost: Record<string, number>, seed: string): { men: NamedMan[]; fallen: NamedMan[] } {
  let out = [...men];
  const fallen: NamedMan[] = [];
  for (const [kind, n] of Object.entries(lost)) {
    for (let i = 0; i < (n ?? 0); i++) {
      const pool = out.filter((m) => m.kind === kind);
      if (!pool.length) break;
      // the experienced live a little longer: weight by inexperience
      const weights = pool.map((m) => 1 / (1 + m.fights * 0.25));
      let r = (h(`${seed}:${kind}:${i}`) % 10000) / 10000 * weights.reduce((a, w) => a + w, 0);
      let pick = pool[pool.length - 1];
      for (let j = 0; j < pool.length; j++) { r -= weights[j]; if (r <= 0) { pick = pool[j]; break; } }
      fallen.push(pick); out = out.filter((m) => m.id !== pick.id);
    }
  }
  return { men: out, fallen };
}

/** the wounded: a scar each, and some days out of the line */
export function woundMen(men: NamedMan[], hurt: Record<string, number>, day: number, seed: string): { men: NamedMan[]; hurt: NamedMan[] } {
  const out = men.map((m) => ({ ...m }));
  const list: NamedMan[] = [];
  for (const [kind, n] of Object.entries(hurt)) {
    const pool = out.filter((m) => m.kind === kind && !list.includes(m));
    for (let i = 0; i < Math.min(n ?? 0, pool.length); i++) {
      const m = pool[(h(`${seed}:w:${kind}:${i}`) + i) % pool.length];
      if (list.includes(m)) continue;
      m.scars += 1; m.hurtUntil = day + 3; list.push(m);
    }
  }
  return { men: out, hurt: list };
}

/** after a fight: every man who stood counts it, the kills are shared out, and a man with enough of them earns a name */
export function bloodMen(men: NamedMan[], kills: number, seed: string): { men: NamedMan[]; named: NamedMan[] } {
  const out = men.map((m) => ({ ...m, fights: m.fights + 1 }));
  const named: NamedMan[] = [];
  const shooters = out.filter((m) => TROOPS[m.kind] && m.kind !== 'fellah');
  const pool = shooters.length ? shooters : out;
  for (let i = 0; i < kills && pool.length; i++) pool[h(`${seed}:k:${i}`) % pool.length].kills += 1;
  const usedBy = new Set(out.map((m) => m.by).filter(Boolean));
  for (const m of out) {
    if (!m.by && (m.kills >= 4 || (m.fights >= 6 && m.scars >= 1))) {
      const free = BYNAMES.filter((b) => !usedBy.has(b));
      if (!free.length) continue;
      m.by = free[h(`${seed}:${m.id}`) % free.length]; usedBy.add(m.by); named.push(m);
    }
  }
  return { men: out, named };
}

/** promotions move the most seasoned man of the old kind into the new one */
export function promoteMen(men: NamedMan[], ups: { from: string; to: string }[]): { men: NamedMan[]; up: NamedMan[] } {
  const out = men.map((m) => ({ ...m }));
  const up: NamedMan[] = [];
  for (const u of ups) {
    const m = out.filter((x) => x.kind === u.from && !up.includes(x)).sort((a, b) => b.fights - a.fights || b.kills - a.kills)[0];
    if (m) { m.kind = u.to; up.push(m); }
  }
  return { men: out, up };
}

/** true when every kind has exactly as many named men as the counts say */
export function rosterMatches(men: NamedMan[], troops: Record<string, number>): boolean {
  const kinds = new Set([...Object.keys(troops).filter((k) => TROOPS[k] && (troops[k] ?? 0) > 0), ...men.map((m) => m.kind)]);
  for (const k of kinds) if (men.filter((m) => m.kind === k).length !== (troops[k] ?? 0)) return false;
  return true;
}

/** a man as he is remembered once he is buried */
export const fallenOf = (m: NamedMan, day: number, where?: string, how?: string): FallenMan => ({
  name: manLabel(m), kind: m.kind, day, fights: m.fights, kills: m.kills, face: m.face, joined: m.joined,
  ...(where ? { where } : {}), ...(m.home ? { home: m.home } : {}), ...(how ? { how } : {}),
});
/** what goes to a dead man's family: about a season of his wage, never less than a pound */
export const familySum = (f: Pick<FallenMan, 'kind'>) => Math.max(100, Math.round((TROOPS[f.kind]?.wage ?? 8) * 30 / 10) * 10);

/** "Mitwalli Abu Zeid and Sayed el-Masri" */
export const nameList = (ms: NamedMan[]) => {
  const n = ms.map(manLabel);
  return n.length <= 1 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};
