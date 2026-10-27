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
}
export interface FallenMan { name: string; kind: string; day: number; fights: number; kills: number; where?: string }

const REGION: Record<string, PoolRegion> = { bedouin: 'bedouin', desertcaptain: 'bedouin', reformed: 'bedouin', arnaut: 'anatolia' };
const AGE: Record<string, ('y' | 'm' | 'o')[]> = { fellah: ['y'], bedouin: ['y', 'm'], reformed: ['y', 'm'], veteran: ['m', 'o'], desertcaptain: ['m', 'o'] };

const GIVEN: Record<string, string[]> = {
  egypt: ['Mitwalli', 'Sayed', 'Ragab', 'Abdel-Sattar', 'Hamdi', 'Fathi', 'Mansour', 'Shaaban', 'Zaki', 'Hassanein', 'Desouki', 'Metwalli', 'Gaber', 'Ashour', 'Bayoumi', 'Khalaf', 'Ramadan', 'Sabry', 'Taha', 'Suleiman', 'Fawzi', 'Abbas', 'Mahrous', 'Hanafi'],
  bedouin: ['Mutlaq', 'Sweilim', 'Eid', 'Salem', 'Audeh', 'Hamad', 'Faraj', 'Mufleh', 'Nasser', 'Sabbah', 'Hussein', 'Atallah', 'Jazi', 'Rashed', 'Ghanem', 'Khalaf'],
  anatolia: ['Bajram', 'Ilir', 'Gjergj', 'Ramiz', 'Selim', 'Hysen', 'Dervish', 'Kasem'],
};
const FAMILY: Record<string, string[]> = {
  egypt: ['Abu Zeid', 'el-Masri', 'Shalabi', 'Abu Hamed', 'el-Fiqi', 'Abdel-Aal', 'Mansi', 'el-Saeedi', 'Hegazi', 'Abu Shusha', 'el-Gammal', 'Abu Daif', 'Qandil', 'el-Sharqawi'],
  bedouin: ['al-Huweitat', 'Abu Rabia', 'al-Tarabin', 'al-Azazmeh', 'Abu Sitta', 'al-Sawarka', 'al-Masaid', 'Abu Tayi'],
  anatolia: ['Toptani', 'Vlora', 'Dibra', 'Kruja', 'Frasheri'],
};
/** names the men give one of their own after enough fights: plain and earned */
const BYNAMES = ['the Steady', 'the Quiet', 'the Hawk', 'Iron Hand', 'the Patient', 'Abu Barud', 'the Lion', 'the Wall', 'Sharp-Eye', 'the Lucky'];

const h = (s: string) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
export const regionOf = (kind: string): PoolRegion => REGION[kind] ?? 'egypt';
export const manLabel = (m: NamedMan) => (m.by ? `${m.name.split(' ')[0]} ${m.by}` : m.name);
export const kindName = (kind: string) => (TROOPS[kind]?.name ?? kind).toLowerCase().replace('bedouin', 'Bedouin').replace('cairo', 'Cairo').replace('giza', 'Giza').replace('arnaut', 'Arnaut');
/** the face, or the troop's own picture until the pool's painting exists */
export const manFace = (m: NamedMan) => `art/people/${m.face}.jpg`;
export const manFallback = (m: { kind: string }) => `art/troops/${m.kind}.jpg`;

function freshMan(kind: string, day: number, taken: Set<string>, takenFaces: Set<string>, salt: string): NamedMan {
  const region = regionOf(kind);
  const g = GIVEN[region] ?? GIVEN.egypt, f = FAMILY[region] ?? FAMILY.egypt;
  let name = '';
  for (let i = 0; i < 60 && (!name || taken.has(name)); i++) {
    const k = h(`${salt}:${kind}:${i}`);
    name = `${g[k % g.length]} ${f[(k >>> 8) % f.length]}`;
  }
  const ages = AGE[kind] ?? ['m'];
  const faces = POOL.filter((p) => p.region === region && p.sex === 'm' && ages.includes(p.age));
  const all = faces.length ? faces : POOL.filter((p) => p.sex === 'm' && ages.includes(p.age));
  const free = all.filter((p) => !takenFaces.has(p.id));
  const pick = (free.length ? free : all)[h(`${salt}:face`) % (free.length || all.length || 1)];
  return { id: `m${h(`${salt}:${name}`).toString(36)}`, name, kind, face: pick?.id ?? 'egypt-m-m-01', joined: day, fights: 0, kills: 0, scars: 0 };
}

/** keep the roster in step with the troop counts: new hires get a name, men let go leave (the newest first) */
export function syncMen(men: NamedMan[], troops: Record<string, number>, day: number): NamedMan[] {
  let out = men.filter((m) => (troops[m.kind] ?? 0) > 0);
  const byKind = new Map<string, NamedMan[]>();
  for (const m of out) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m]);
  let changed = out.length !== men.length;
  for (const [kind, list] of byKind) {
    const want = troops[kind] ?? 0;
    if (list.length > want) {
      const drop = new Set([...list].sort((a, b) => b.joined - a.joined || a.fights - b.fights).slice(0, list.length - want).map((m) => m.id));
      out = out.filter((m) => !drop.has(m.id)); changed = true;
    }
  }
  const names = new Set(out.map((m) => m.name)), faces = new Set(out.map((m) => m.face));
  for (const [kind, n] of Object.entries(troops)) {
    if (!TROOPS[kind]) continue;
    const have = out.filter((m) => m.kind === kind).length;
    for (let i = have; i < (n ?? 0); i++) {
      const m = freshMan(kind, day, names, faces, `${kind}:${day}:${i}:${out.length}`);
      names.add(m.name); faces.add(m.face); out = [...out, m]; changed = true;
    }
  }
  return changed ? out : men;
}

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

/** "Mitwalli Abu Zeid and Sayed el-Masri" */
export const nameList = (ms: NamedMan[]) => {
  const n = ms.map(manLabel);
  return n.length <= 1 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};
