import { MASK_W, MASK_H, CELL, WATER_ROWS } from '../../data/landmask';
import { TERRAIN_ROWS } from '../../data/terrain';
import { BARRIER_ROWS, BARRIER_NAMES } from '../../data/barriers';
import { SETTLEMENTS, SEA_ROUTES, RAIL_LINKS, MOTOR_ROUTES, RAIL_FARE_PER_KM, RAIL_FARE_MIN, ANIMAL_FREIGHT, type Settlement } from '../../data/world';
import { PAINT_W, EAST_W, eastGround, PERSIA_ROADS } from '../../data/persiaMap';
import { BREEDS } from '../../data/animals';
import { seaDelayOn, SEASON_NOW } from '../economy/calendar1925';

export interface Pt { x: number; y: number }

// The painted travel map (1536 x 1024, shown 885 x 590) and, east of it, Persia drawn in code
// (data/persiaMap.ts, systems/persiaArt.ts): the map is 1265 units across.
export const MAP_W = EAST_W, MAP_H = 590;
export { PAINT_W };
/** Painting pixels to map units. */
export const paint = (x: number, y: number): Pt => ({ x: x * (PAINT_W / 1536), y: y * (PAINT_W / 1536) });
/** The ground grid over the whole map: the painting's 177 columns (landmask.ts, terrain.ts, barriers.ts)
 *  and Persia's beyond them. */
export const GRID_W = Math.round(MAP_W / CELL);
export const PX_PER_DAY = 24; // on foot with pack animals, about 40 km a day
export const TRAIN_PX_PER_DAY = 220; // about 400 km a day including stops
export const TRAIN_SPEEDUP = TRAIN_PX_PER_DAY / PX_PER_DAY;
export const FOOD_PER_DAY = 6;

const water = new Uint8Array(GRID_W * MASK_H);
WATER_ROWS.forEach((row, y) => {
  for (let x = 0; x < MASK_W; x++) water[y * GRID_W + x] = row.charCodeAt(x) === 49 ? 1 : 0;
});
// the ground east of the painting, cell by cell
const EAST_GROUND: string[] = [];
for (let y = 0; y < MASK_H; y++)
  for (let x = MASK_W; x < GRID_W; x++) {
    const g = eastGround({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 });
    EAST_GROUND[y * GRID_W + x] = g;
    if (g === 'w') water[y * GRID_W + x] = 1;
  }

export const cellOf = (p: Pt) => ({ cx: Math.max(0, Math.min(GRID_W - 1, Math.floor(p.x / CELL))), cy: Math.max(0, Math.min(MASK_H - 1, Math.floor(p.y / CELL))) });
export const isWaterPx = (p: Pt) => {
  const { cx, cy } = cellOf(p);
  return water[cy * GRID_W + cx] === 1;
};
const centre = (cx: number, cy: number): Pt => ({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 });
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// Terrain from the painting (tools/build-terrain.py): roads are quick, fertile valleys normal going, open desert
// and hills slow, mountains closed except where a road crosses them, as in Bannerlord.
// Rivers, lakes and the canal (tools/build-barriers.py) are closed too, and a river is crossed only at a
// bridge (as quick as a road) or a ford (slow, wet going).
export type Terrain = 'road' | 'fertile' | 'desert' | 'hills' | 'mountains' | 'water' | 'river' | 'lake' | 'canal' | 'bridge' | 'ford';
const KIND: Record<string, Terrain> = { r: 'road', f: 'fertile', d: 'desert', h: 'hills', m: 'mountains' };
export const TERRAIN_SPEED: Record<Terrain, number> = { road: 1.25, fertile: 1, desert: 0.8, hills: 0.6, mountains: 0, water: 0, river: 0, lake: 0, canal: 0, bridge: 1.25, ford: 0.45 };
export const TERRAIN_LABEL: Record<Terrain, string> = { road: 'road', fertile: 'farmland', desert: 'open desert', hills: 'hills', mountains: 'mountains', water: 'water', river: 'a river', lake: 'a lake', canal: 'the canal', bridge: 'a bridge', ford: 'a ford' };
const BARRIER: Record<string, Terrain> = { R: 'river', L: 'lake', C: 'canal', B: 'bridge', F: 'ford', M: 'mountains' };
const speedOf = new Float32Array(GRID_W * MASK_H);
const kindOf: Terrain[] = new Array(GRID_W * MASK_H);
for (let y = 0; y < MASK_H; y++)
  for (let x = 0; x < GRID_W; x++) {
    const i = y * GRID_W + x;
    if (x >= MASK_W) {
      const k: Terrain = water[i] ? 'water' : KIND[EAST_GROUND[i]] ?? 'desert';
      kindOf[i] = k;
      speedOf[i] = TERRAIN_SPEED[k];
      continue;
    }
    const bar = BARRIER[BARRIER_ROWS[y]?.[x] ?? '.'];
    // a bridge or ford also opens a river the sea mask drew (the Nile above Cairo)
    const opened = BARRIER_ROWS[y]?.[x] === 'O'; // land an old trace marked as water
    if (opened) water[i] = 0;
    const land = KIND[TERRAIN_ROWS[y]?.[x] ?? 'd'] ?? 'desert';
    const k: Terrain = bar === 'bridge' || bar === 'ford' ? bar : bar ?? (water[i] ? 'water' : land === 'mountains' && opened ? 'fertile' : land);
    kindOf[i] = k;
    speedOf[i] = TERRAIN_SPEED[k];
  }
// the Persian roads, laid over the ground: through the Zagros and the Alborz they are the only way
for (const r of PERSIA_ROADS)
  for (let k = 1; k < r.pts.length; k++) {
    const a = r.pts[k - 1], b = r.pts[k], n = Math.ceil(dist(a, b));
    for (let t = 0; t <= n; t++) {
      const cx = Math.floor((a.x + ((b.x - a.x) * t) / n) / CELL), cy = Math.floor((a.y + ((b.y - a.y) * t) / n) / CELL);
      const i = cy * GRID_W + cx;
      if (['desert', 'hills', 'mountains', 'fertile'].includes(kindOf[i])) { kindOf[i] = 'road'; speedOf[i] = TERRAIN_SPEED.road; }
    }
  }
const idxOf = (p: Pt) => { const { cx, cy } = cellOf(p); return cy * GRID_W + cx; };
export const terrainAt = (p: Pt): Terrain => kindOf[idxOf(p)];
/** the river, lake or crossing here by name, if it has one */
export const placeNameAt = (p: Pt): string | undefined => { const { cx, cy } = cellOf(p); return cx < MASK_W ? BARRIER_NAMES[cy * MASK_W + cx] : undefined; };
/** How fast the caravan goes here, as a share of its pace on good ground (0 = cannot go). */
export const terrainSpeed = (p: Pt) => speedOf[idxOf(p)];
export const isBlockedPx = (p: Pt) => speedOf[idxOf(p)] === 0;
const MAX_SPEED = TERRAIN_SPEED.road;

function nearestOpen(cx: number, cy: number): [number, number] {
  if (speedOf[cy * GRID_W + cx]) return [cx, cy];
  for (let r = 1; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < GRID_W && y < MASK_H && speedOf[y * GRID_W + x]) return [x, y];
      }
  return [cx, cy];
}

/** Time cost (in cell-lengths at good-ground pace) of a straight line, or Infinity if it crosses closed ground. */
function lineCost(a: Pt, b: Pt) {
  const len = dist(a, b);
  const steps = Math.max(1, Math.ceil(len / (CELL / 2)));
  let cost = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const v = speedOf[idxOf({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })];
    if (!v) return Infinity;
    cost += len / steps / CELL / v;
  }
  return cost;
}

/** A* across open cells weighted by terrain, then string-pulled wherever a straight line is no slower.
 * Returns null if the place cannot be reached overland. */
export function findPath(from: Pt, to: Pt): Pt[] | null {
  const s = cellOf(from), g = cellOf(to);
  const [sx, sy] = nearestOpen(s.cx, s.cy);
  const [gx, gy] = nearestOpen(g.cx, g.cy);
  if (!speedOf[gy * GRID_W + gx] || !speedOf[sy * GRID_W + sx]) return null;
  const N = GRID_W * MASK_H;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const start = sy * GRID_W + sx, goal = gy * GRID_W + gx;
  gScore[start] = 0;
  // binary heap of [f, idx]
  const heap: number[][] = [[0, start]];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const h = (i: number) => Math.hypot((i % GRID_W) - gx, Math.floor(i / GRID_W) - gy) / MAX_SPEED;
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GRID_W, cy = Math.floor(cur / GRID_W);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= MASK_H) continue;
        const ni = ny * GRID_W + nx;
        if (!speedOf[ni] || closed[ni]) continue;
        const ng = gScore[cur] + (dx && dy ? 1.4142 : 1) * 0.5 * (1 / speedOf[cur] + 1 / speedOf[ni]);
        if (ng < gScore[ni]) {
          gScore[ni] = ng;
          came[ni] = cur;
          push(ng + h(ni), ni);
        }
      }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const chain: number[] = [];
  for (let i = goal; i !== -1; i = came[i]) {
    chain.push(i);
    if (i === start) break;
  }
  chain.reverse();
  const raw = [from, ...chain.slice(1, -1).map((i) => centre(i % GRID_W, Math.floor(i / GRID_W))), to];
  const cum = [0];
  // (a town drawn on the shore may sit in a water cell: its one step onto land counts at plain pace)
  for (let i = 1; i < raw.length; i++) { const c = lineCost(raw[i - 1], raw[i]); cum.push(cum[i - 1] + (Number.isFinite(c) ? c : dist(raw[i - 1], raw[i]) / CELL)); }
  // string pulling: cut a corner only where the straight line is open and no slower than the road it replaces
  const out: Pt[] = [raw[0]];
  let anchor = 0;
  for (let i = 2; i < raw.length; i++) {
    if (lineCost(raw[anchor], raw[i]) > cum[i] - cum[anchor] + 0.05) {
      out.push(raw[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(raw[raw.length - 1]);
  return out;
}

/** Ships keep to the sea: a search across water cells from the water nearest each port, straightened
 * wherever open water allows. Returns null if no sea lane joins them on the map. */
const SEA_DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
// the straits are narrower than a mask cell, so they are opened for ships only: the Dardanelles and the Bosporus
const sea = Uint8Array.from(water);
for (const [x, y] of [[22, 14], [22, 15], [34, 12], [34, 11], [34, 10], [35, 9]]) sea[y * GRID_W + x] = 1;
const isSeaPx = (p: Pt) => { const { cx, cy } = cellOf(p); return sea[cy * GRID_W + cx] === 1; };
function nearestWater(cx: number, cy: number): number {
  for (let r = 0; r < 16; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < GRID_W && y < MASK_H && sea[y * GRID_W + x]) return y * GRID_W + x;
      }
  return -1;
}
function seaOpen(a: Pt, b: Pt) {
  const steps = Math.max(1, Math.ceil(dist(a, b) / (CELL / 2)));
  for (let i = 0; i <= steps; i++) if (!isSeaPx({ x: a.x + (b.x - a.x) * (i / steps), y: a.y + (b.y - a.y) * (i / steps) })) return false;
  return true;
}
export function findSeaPath(from: Pt, to: Pt): Pt[] | null {
  const s = cellOf(from), g = cellOf(to);
  const start = nearestWater(s.cx, s.cy), goal = nearestWater(g.cx, g.cy);
  if (start < 0 || goal < 0) return null;
  const N = GRID_W * MASK_H;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const gx = goal % GRID_W, gy = Math.floor(goal / GRID_W);
  const h = (i: number) => Math.hypot((i % GRID_W) - gx, Math.floor(i / GRID_W) - gy);
  // a small binary heap of [f, cell]
  const heap: number[][] = [[h(start), start]];
  gScore[start] = 0;
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ;) {
        const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GRID_W, cy = Math.floor(cur / GRID_W);
    for (const [dx, dy, w] of SEA_DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= MASK_H) continue;
      const ni = ny * GRID_W + nx;
      if (!sea[ni] || closed[ni]) continue;
      // keep a cable's length off the shore where the sea allows: cells next to land cost a little more
      const ng = gScore[cur] + w * (sea[ni - 1] && sea[ni + 1] && sea[ni - GRID_W] && sea[ni + GRID_W] ? 1 : 1.6);
      if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = cur; push(ng + h(ni), ni); }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const chain: Pt[] = [];
  for (let i = goal; i !== -1; i = came[i]) { chain.push(centre(i % GRID_W, Math.floor(i / GRID_W))); if (i === start) break; }
  chain.reverse();
  const out: Pt[] = [chain[0]];
  let anchor = 0;
  for (let i = 2; i < chain.length; i++) if (!seaOpen(chain[anchor], chain[i])) { out.push(chain[i - 1]); anchor = i - 1; }
  out.push(chain[chain.length - 1]);
  return [from, ...out, to];
}

/** The way a train, a motor car or a ship really goes between two places on the map: railways and cars
 * along the land route (they take the roads through the passes, never over open mountains or sea), ships
 * around the coasts. Falls back to the straight line only if the map has no way through. */
const legCache = new Map<string, Pt[]>();
export function routeLeg(a: Pt, b: Pt, mode: 'rail' | 'motor' | 'ship'): Pt[] {
  const key = `${mode}:${a.x},${a.y}:${b.x},${b.y}`;
  let p = legCache.get(key);
  if (!p) { p = (mode === 'ship' ? findSeaPath(a, b) : findPath(a, b)) ?? [a, b]; legCache.set(key, p); }
  return p;
}
export function routeThrough(stops: Pt[], mode: 'rail' | 'motor' | 'ship'): Pt[] {
  const out: Pt[] = [stops[0]];
  for (let i = 1; i < stops.length; i++) out.push(...routeLeg(stops[i - 1], stops[i], mode).slice(1));
  return out;
}

/** Days on foot along a path at `pxPerDay` on good ground, slowed or sped by the terrain under each stretch. */
export function pathDays(p: Pt[], pxPerDay: number) {
  let d = 0;
  for (let i = 1; i < p.length; i++) {
    const c = lineCost(p[i - 1], p[i]);
    d += Number.isFinite(c) ? c * CELL : dist(p[i - 1], p[i]);
  }
  return d / pxPerDay;
}

export const pathLength = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + dist(p[i], q), 0);

/** Position after travelling `d` pixels along a path. */
export function along(p: Pt[], d: number): { pos: Pt; done: boolean } {
  let left = d;
  for (let i = 1; i < p.length; i++) {
    const seg = dist(p[i - 1], p[i]);
    if (left <= seg) {
      const t = seg ? left / seg : 1;
      return { pos: { x: p[i - 1].x + (p[i].x - p[i - 1].x) * t, y: p[i - 1].y + (p[i].y - p[i - 1].y) * t }, done: false };
    }
    left -= seg;
  }
  return { pos: p[p.length - 1], done: true };
}

export const settlementAt = (p: Pt, r = 12): Settlement | undefined => SETTLEMENTS.find((s) => dist(s, p) <= r);
export const settlementById = (id: string) => SETTLEMENTS.find((s) => s.id === id)!;

// ---------- fares for the whole party ----------
/** Who pays: the people in the caravan, and its animals by kind (camels and horses go as large stock). */
export interface FareParty { people: number; animals: Record<string, number> }
export interface FareLine { label: string; n: number; each: number }
export interface Fare { total: number; lines: FareLine[] }
/** A per-person fare made into the bill for everyone: a ticket each, and freight for every animal. */
export function partyFare(perPerson: number, party?: FareParty): Fare {
  if (!party) return { total: perPerson, lines: [{ label: 'person', n: 1, each: perPerson }] };
  const lines: FareLine[] = [{ label: party.people === 1 ? 'person' : 'people', n: Math.max(1, party.people), each: perPerson }];
  const byKind: Record<string, number> = {};
  for (const [id, n] of Object.entries(party.animals ?? {})) {
    const b = BREEDS[id];
    if (b && n > 0) byKind[b.kind] = (byKind[b.kind] ?? 0) + n;
  }
  for (const kind of ['camel', 'horse', 'mule', 'donkey']) {
    const n = byKind[kind];
    if (n) lines.push({ label: `${n === 1 ? kind : `${kind}s`} (freight)`, n, each: perPerson * (kind === 'camel' || kind === 'horse' ? ANIMAL_FREIGHT.large : ANIMAL_FREIGHT.small) });
  }
  return { total: lines.reduce((s, l) => s + l.n * l.each, 0), lines };
}

export const seaRoutesFrom = (id: string, party?: FareParty) =>
  // quarantine at Port Said or Alexandria holds a ship for a day or two (calendar1925.ts)
  SEA_ROUTES.filter((r) => r.a === id || r.b === id).map((r) => { const f = partyFare(r.fare, party); return { to: r.a === id ? r.b : r.a, days: r.days + seaDelayOn(SEASON_NOW.day, r.a, r.b), fare: f.total, perPerson: r.fare, bill: f.lines }; });
export const motorRoutesFrom = (id: string, party?: FareParty) =>
  MOTOR_ROUTES.filter((r) => r.a === id || r.b === id).map((r) => { const f = partyFare(r.fare, party); return { to: r.a === id ? r.b : r.a, days: r.days, fare: f.total, perPerson: r.fare, bill: f.lines }; });

/** Quickest railway journey between two stations (Dijkstra over the 1925 network). The fare goes by
 *  the kilometres of line travelled, third class; with a party, it is the bill for everyone. */
export function railJourney(from: string, to: string, party?: FareParty): { days: number; fare: number; perPerson: number; bill: FareLine[]; stops: string[] } | null {
  if (from === to) return null;
  const edges = new Map<string, { to: string; days: number; km: number }[]>();
  for (const l of RAIL_LINKS) {
    const A = settlementById(l.a), B = settlementById(l.b);
    // where a link has no length or timetable of its own, the map distance stands in for both
    const km = l.km ?? dist(A, B) * 2;
    const days = l.hours != null ? l.hours / 24 : l.days ?? Math.max(0.1, (dist(A, B) * 1.25) / TRAIN_PX_PER_DAY);
    edges.set(l.a, [...(edges.get(l.a) ?? []), { to: l.b, days, km }]);
    edges.set(l.b, [...(edges.get(l.b) ?? []), { to: l.a, days, km }]);
  }
  if (!edges.has(from) || !edges.has(to)) return null;
  const best = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([from]);
  while (open.size) {
    let cur = '';
    let cd = Infinity;
    for (const n of open) if ((best.get(n) ?? Infinity) < cd) { cd = best.get(n)!; cur = n; }
    open.delete(cur);
    if (cur === to) break;
    for (const e of edges.get(cur) ?? []) {
      const nd = cd + e.days;
      if (nd < (best.get(e.to) ?? Infinity)) { best.set(e.to, nd); prev.set(e.to, cur); open.add(e.to); }
    }
  }
  if (!best.has(to)) return null;
  const stops = [to];
  while (stops[0] !== from) stops.unshift(prev.get(stops[0])!);
  const days = best.get(to)!;
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += edges.get(stops[i - 1])!.find((e) => e.to === stops[i])!.km;
  const perPerson = Math.max(RAIL_FARE_MIN, Math.round(km * RAIL_FARE_PER_KM));
  const f = partyFare(perPerson, party);
  return { days, fare: f.total, perPerson, bill: f.lines, stops };
}

// ---------- how long a walk really takes, and what it eats ----------
/** The hours of a night on the road: night falls at 20:00 and a camp breaks at 06:00. */
export const NIGHT_FROM = 20, CAMP_UNTIL = 6;
export interface TripEstimate {
  /** days from setting off to arriving, by the clock */
  elapsedDays: number;
  /** nights spent in camp on the way */
  camps: number;
  /** midnights passed on the road: each one is a day's rations for the whole party */
  nights: number;
  rations: number;
  /** days spent waiting at the Sinai narrows, if allowed for */
  waitDays: number;
}
/**
 * The walk as the map will run it: `walkDays` of marching (24 hours a day of movement, as pathDays
 * gives it), stopped for the night from 20:00 to 06:00 when the party camps, plus any days of waiting
 * (an escort at the Sinai narrows). Rations are eaten at each midnight, a day's worth for everyone,
 * the same as the nightly upkeep on the road.
 */
export function tripEstimate(o: { walkDays: number; startHour: number; camp: boolean; perDay: number; waitDays?: number }): TripEstimate {
  let need = Math.max(0, o.walkDays) * 24;
  let t = o.startHour; // hours since midnight of the day you leave
  let camps = 0;
  // setting off after dark: that first night is marched, as the map does not ask about it
  const hod0 = ((t % 24) + 24) % 24;
  let skipNight = hod0 >= NIGHT_FROM || hod0 < CAMP_UNTIL - 1;
  for (let guard = 0; need > 1e-6 && guard < 2000; guard++) {
    const hod = ((t % 24) + 24) % 24;
    const dark = hod >= NIGHT_FROM || hod < CAMP_UNTIL - 1;
    if (o.camp && dark && !skipNight) {
      // sleep until dawn
      t += hod >= NIGHT_FROM ? 24 - hod + CAMP_UNTIL : CAMP_UNTIL - hod;
      camps++;
      continue;
    }
    if (!dark) skipNight = false;
    // march until the trip is done or until the next nightfall (or, in the dark, until daylight)
    const until = dark ? (hod >= NIGHT_FROM ? 24 - hod + CAMP_UNTIL - 1 : CAMP_UNTIL - 1 - hod) : NIGHT_FROM - hod;
    const step = Math.min(need, Math.max(1e-3, until));
    t += step;
    need -= step;
  }
  const waitDays = o.waitDays ?? 0;
  t += waitDays * 24;
  const nights = Math.floor(t / 24) - Math.floor(o.startHour / 24);
  return { elapsedDays: (t - o.startHour) / 24, camps, nights, rations: nights * Math.max(1, o.perDay), waitDays };
}

/** "30 min", "3½ h", "1 d 12 h": a length of time on the same clock the journey runs on. */
export function durationLabel(days: number) {
  const h = days * 24;
  if (h < 0.75) return `${Math.max(5, Math.round((h * 60) / 5) * 5)} min`;
  if (h < 24) {
    const half = Math.round(h * 2) / 2;
    return `${Math.floor(half)}${half % 1 ? '½' : ''} h`;
  }
  const d = Math.floor(h / 24), rest = Math.round(h - d * 24);
  return rest === 24 ? `${d + 1} d` : rest ? `${d} d ${rest} h` : `${d} d`;
}

// ---------- Fog of war ----------
export const FOG_LEN = GRID_W * MASK_H;
export function blankFog() {
  return '0'.repeat(FOG_LEN);
}
/** A fog of the right size for today's map. Saves from before Persia was added (save 24) kept
 *  177 cells a row: each row is carried over and Persia's cells start unexplored. */
let fitIn = '', fitOut = '';
export function fitFog(fog: string): string {
  if (fog.length === FOG_LEN) return fog;
  if (fog === fitIn) return fitOut;
  let out: string;
  if (fog.length === MASK_W * MASK_H) {
    const pad = '0'.repeat(GRID_W - MASK_W);
    out = '';
    for (let y = 0; y < MASK_H; y++) out += fog.slice(y * MASK_W, (y + 1) * MASK_W) + pad;
  } else out = (fog + '0'.repeat(FOG_LEN)).slice(0, FOG_LEN);
  fitIn = fog; fitOut = out;
  return out;
}
export function revealFog(fog: string, p: Pt, radiusCells = 7): string {
  const { cx, cy } = cellOf(p);
  fog = fitFog(fog);
  const arr = fog.split('');
  let changed = false;
  for (let dy = -radiusCells; dy <= radiusCells; dy++)
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      if (dx * dx + dy * dy > radiusCells * radiusCells) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= GRID_W || y >= MASK_H) continue;
      const i = y * GRID_W + x;
      if (arr[i] !== '1') {
        arr[i] = '1';
        changed = true;
      }
    }
  return changed ? arr.join('') : fog;
}
export const isExplored = (fog: string, p: Pt) => {
  const { cx, cy } = cellOf(p);
  return fitFog(fog).charCodeAt(cy * GRID_W + cx) === 49;
};

// ---------- Roaming parties ----------
export interface Party {
  id: string;
  kind: 'caravan' | 'pilgrims' | 'raiders' | 'bedouin' | 'mercenaries';
  name: string;
  size?: number;
  strength?: number;
  x: number;
  y: number;
  path: Pt[];
  travelled: number;
  speed: number; // px per day
  home?: Pt;
  cooldownUntil?: number; // game-day number, avoids repeat encounters
}


function randomLand(around: Pt, radius: number, rng: () => number): Pt {
  for (let k = 0; k < 40; k++) {
    const a = rng() * Math.PI * 2, r = rng() * radius;
    const p = { x: around.x + Math.cos(a) * r, y: around.y + Math.sin(a) * r };
    if (p.x > 5 && p.y > 5 && p.x < MAP_W - 5 && p.y < MAP_H - 5 && !isBlockedPx(p)) return p;
  }
  return around;
}

const PAIRS: [string, string, Party['kind'], string][] = [
  ['cairo', 'aleppo', 'caravan', 'Aleppo wool caravan'],
  ['cairo', 'suez', 'pilgrims', 'Pilgrims walking to Suez'],
  ['jaffa', 'jerusalem', 'pilgrims', 'Pilgrims bound for Jerusalem'],
  ['damascus', 'baghdad', 'caravan', 'Persian carpet caravan'],
  ['tanta', 'cairo', 'pilgrims', 'Sufi brothers going to Tanta'],
  ['giza', 'fayoum', 'caravan', 'Salt traders from the oases'],
  ['hamadan', 'khanaqin', 'caravan', 'Persian carpet caravan'],
];

export function spawnParties(rng: () => number): Party[] {
  const out: Party[] = [];
  PAIRS.forEach(([a, b, kind, name], i) => {
    const A = settlementById(a), B = settlementById(b);
    const path = findPath(A, B) ?? [A, B];
    const start = rng() * pathLength(path);
    const pos = along(path, start).pos;
    out.push({ id: `p${i}`, kind, name, size: kind === 'caravan' ? 8 + (i % 5) : 5 + (i % 7), x: pos.x, y: pos.y, path, travelled: start, speed: kind === 'caravan' ? 22 : 16 });
  });
  // raiders patrol the Sinai tracks and the Syrian desert; Bedouin herd near their camp
  const raidHomes = [paint(760, 740), paint(1020, 600)];
  raidHomes.forEach((h, i) => {
    const p = randomLand(h, 30, rng);
    const size = 4 + Math.floor(rng() * 5);
    out.push({ id: `r${i}`, kind: 'raiders', name: 'Raiders', size, strength: size * 2, x: p.x, y: p.y, path: [p, randomLand(h, 40, rng)], travelled: 0, speed: 30, home: h });
  });
  // a free company of guards looking for work
  [paint(720, 620), paint(430, 700)].forEach((h, i) => {
    const p = randomLand(h, 20, rng);
    out.push({ id: `m${i}`, kind: 'mercenaries', name: i ? 'Unemployed gendarmes' : 'Circassian riders for hire', size: 4, strength: 16, x: p.x, y: p.y, path: [p, randomLand(h, 30, rng)], travelled: 0, speed: 20, home: h });
  });
  const camp = settlementById('bedouin');
  const bp = randomLand(camp, 25, rng);
  out.push({ id: 'b0', kind: 'bedouin', name: 'Tarabin herders', size: 6, x: bp.x, y: bp.y, path: [bp, randomLand(camp, 30, rng)], travelled: 0, speed: 12, home: camp });
  return [...out, ...spawnRoadBands(rng)];
}

/** Bands that watch the trade roads beyond the Nile valley: weak near Egypt, strong in the far deserts. */
// (names as the ambush card gives them: see threatForParty in data/travelThreats1925.ts)
const ROAD_BANDS: [string, string, number, string][] = [
  ['cairo', 'suez', 3, 'Rural Highway Robbers'],
  ['suez', 'sinai', 5, 'Desert Raiders'],
  ['jaffa', 'jerusalem', 4, 'Road Thieves'],
  ['jerusalem', 'damascus', 6, 'Desert Raiders'],
  ['damascus', 'baghdad', 8, 'Border Smuggler-Brigands'],
  ['aleppo', 'konya', 6, 'Border Smuggler-Brigands'],
  // tribal raiders in the Zagros passes on the Persian road (travelThreats1925.ts: rb6, rb7)
  ['khanaqin', 'kermanshah', 7, 'Zagros Raiders'],
  ['kermanshah', 'hamadan', 6, 'Zagros Raiders'],
];
export function spawnRoadBands(rng: () => number): Party[] {
  return ROAD_BANDS.map(([a, b, size, name], i) => {
    const A = settlementById(a), B = settlementById(b);
    // they sit on the road itself, halfway along it
    const road = findPath(A, B) ?? [A, B];
    const mid = along(road, pathLength(road) / 2).pos;
    const p = randomLand(mid, 6, rng);
    return { id: `rb${i}`, kind: 'raiders' as const, name, size, strength: size * 2, x: p.x, y: p.y, path: [p, randomLand(mid, 18, rng)], travelled: 0, speed: 26, home: mid };
  });
}

/** The strongest band close to a route: what you are walking into. */
export function routeDanger(path: Pt[], parties: Party[], day?: number): number {
  let worst = 0;
  for (const p of parties) {
    if (p.kind !== 'raiders' || !p.strength) continue;
    // a band that has had its answer from this caravan keeps away for a while (see stepParties)
    if (day != null && (p.cooldownUntil ?? 0) > day) continue;
    const L = pathLength(path);
    for (let d = 0; d <= L; d += 8) if (dist(p, along(path, d).pos) < 26) { worst = Math.max(worst, p.strength); break; }
  }
  return worst;
}

export function stepParties(parties: Party[], days: number, rng: () => number, player?: Pt, playerStrength = 2, day = 0): Party[] {
  return parties.map((p) => {
    // Raiders hunt weaker caravans nearby and avoid strong ones, like bandits on a Bannerlord map;
    // a band that has already had its encounter with this caravan keeps to its own road for a while.
    if (p.kind === 'raiders' && player && p.strength && (p.cooldownUntil ?? 0) <= day) {
      const d = dist(p, player);
      if (d < 22 && playerStrength < p.strength * 1.4) {
        const step = Math.min(d, 26 * days); // about a laden camel's pace: animals and horses can outrun them
        const nx = p.x + ((player.x - p.x) / (d || 1)) * step, ny = p.y + ((player.y - p.y) / (d || 1)) * step;
        if (!isBlockedPx({ x: nx, y: ny })) return { ...p, x: nx, y: ny, path: [{ x: nx, y: ny }, { x: nx, y: ny }], travelled: 0 };
      } else if (d < 20 && playerStrength >= p.strength * 2) {
        const step = 30 * days;
        const nx = p.x - ((player.x - p.x) / (d || 1)) * step, ny = p.y - ((player.y - p.y) / (d || 1)) * step;
        if (!isBlockedPx({ x: nx, y: ny })) return { ...p, x: nx, y: ny, path: [{ x: nx, y: ny }, { x: nx, y: ny }], travelled: 0 };
      }
    }
    let travelled = p.travelled + p.speed * days;
    let path = p.path;
    const len = pathLength(path);
    if (travelled >= len) {
      travelled = 0;
      if (p.home) path = [path[path.length - 1], randomLand(p.home, 40, rng)];
      else path = [...path].reverse();
    }
    const pos = along(path, travelled).pos;
    return { ...p, x: pos.x, y: pos.y, path, travelled };
  });
}

/** Share of a path's length over each kind of ground. */
export function pathGround(p: Pt[]): Partial<Record<Terrain, number>> {
  const out: Partial<Record<Terrain, number>> = {};
  let total = 0;
  for (let i = 1; i < p.length; i++) {
    const len = dist(p[i - 1], p[i]);
    const steps = Math.max(1, Math.ceil(len / (CELL / 2)));
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps;
      const kind = terrainAt({ x: p[i - 1].x + (p[i].x - p[i - 1].x) * t, y: p[i - 1].y + (p[i].y - p[i - 1].y) * t });
      out[kind] = (out[kind] ?? 0) + len / steps;
    }
    total += len;
  }
  for (const k in out) out[k as Terrain] = out[k as Terrain]! / (total || 1);
  return out;
}
