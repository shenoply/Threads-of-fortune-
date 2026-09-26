import { MASK_W, MASK_H, CELL, WATER_ROWS } from '../../data/landmask';
import { SETTLEMENTS, SEA_ROUTES, RAIL_LINKS, MOTOR_ROUTES, type Settlement } from '../../data/world';

export interface Pt { x: number; y: number }

export const MAP_W = 885, MAP_H = 590; // the painted travel map, 1536 x 1024, at 0.576 scale
/** Painting pixels to map units. */
export const paint = (x: number, y: number): Pt => ({ x: x * (MAP_W / 1536), y: y * (MAP_W / 1536) });
export const PX_PER_DAY = 24; // on foot with pack animals, about 40 km a day
export const TRAIN_PX_PER_DAY = 220; // about 400 km a day including stops
export const TRAIN_SPEEDUP = TRAIN_PX_PER_DAY / PX_PER_DAY;
export const FOOD_PER_DAY = 6;

const water = new Uint8Array(MASK_W * MASK_H);
WATER_ROWS.forEach((row, y) => {
  for (let x = 0; x < MASK_W; x++) water[y * MASK_W + x] = row.charCodeAt(x) === 49 ? 1 : 0;
});

export const cellOf = (p: Pt) => ({ cx: Math.max(0, Math.min(MASK_W - 1, Math.floor(p.x / CELL))), cy: Math.max(0, Math.min(MASK_H - 1, Math.floor(p.y / CELL))) });
export const isWaterPx = (p: Pt) => {
  const { cx, cy } = cellOf(p);
  return water[cy * MASK_W + cx] === 1;
};
const centre = (cx: number, cy: number): Pt => ({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 });
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function nearestLand(cx: number, cy: number): [number, number] {
  if (!water[cy * MASK_W + cx]) return [cx, cy];
  for (let r = 1; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < MASK_W && y < MASK_H && !water[y * MASK_W + x]) return [x, y];
      }
  return [cx, cy];
}

function lineOfSight(a: Pt, b: Pt) {
  const steps = Math.ceil(dist(a, b) / (CELL / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWaterPx({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

/** A* across land cells, then string-pulled into a short polyline. Returns null if unreachable on land. */
export function findPath(from: Pt, to: Pt): Pt[] | null {
  const s = cellOf(from), g = cellOf(to);
  const [sx, sy] = nearestLand(s.cx, s.cy);
  const [gx, gy] = nearestLand(g.cx, g.cy);
  if (water[gy * MASK_W + gx]) return null;
  const N = MASK_W * MASK_H;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const start = sy * MASK_W + sx, goal = gy * MASK_W + gx;
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
  const h = (i: number) => Math.hypot((i % MASK_W) - gx, Math.floor(i / MASK_W) - gy);
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % MASK_W, cy = Math.floor(cur / MASK_W);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MASK_W || ny >= MASK_H) continue;
        const ni = ny * MASK_W + nx;
        if (water[ni] || closed[ni]) continue;
        const ng = gScore[cur] + (dx && dy ? 1.4142 : 1);
        if (ng < gScore[ni]) {
          gScore[ni] = ng;
          came[ni] = cur;
          push(ng + h(ni), ni);
        }
      }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const cells: Pt[] = [];
  for (let i = goal; i !== -1; i = came[i]) {
    cells.push(centre(i % MASK_W, Math.floor(i / MASK_W)));
    if (i === start) break;
  }
  cells.reverse();
  const raw = [from, ...cells.slice(1, -1), to];
  // string pulling
  const out: Pt[] = [raw[0]];
  let anchor = 0;
  for (let i = 2; i < raw.length; i++) {
    if (!lineOfSight(raw[anchor], raw[i])) {
      out.push(raw[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(raw[raw.length - 1]);
  return out;
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
export const seaRoutesFrom = (id: string) =>
  SEA_ROUTES.filter((r) => r.a === id || r.b === id).map((r) => ({ to: r.a === id ? r.b : r.a, days: r.days, fare: r.fare }));
export const motorRoutesFrom = (id: string) =>
  MOTOR_ROUTES.filter((r) => r.a === id || r.b === id).map((r) => ({ to: r.a === id ? r.b : r.a, days: r.days, fare: r.fare }));

/** Cheapest railway journey between two stations (Dijkstra over the 1925 network). */
export function railJourney(from: string, to: string): { days: number; fare: number; stops: string[] } | null {
  if (from === to) return null;
  const edges = new Map<string, { to: string; days: number }[]>();
  for (const l of RAIL_LINKS) {
    const A = settlementById(l.a), B = settlementById(l.b);
    const days = l.days ?? Math.max(0.1, (dist(A, B) * 1.25) / TRAIN_PX_PER_DAY);
    edges.set(l.a, [...(edges.get(l.a) ?? []), { to: l.b, days }]);
    edges.set(l.b, [...(edges.get(l.b) ?? []), { to: l.a, days }]);
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
  return { days, fare: Math.max(5, Math.round((days * 40) / 5) * 5), stops };
}

// ---------- Fog of war ----------
export const FOG_LEN = MASK_W * MASK_H;
export function blankFog() {
  return '0'.repeat(FOG_LEN);
}
export function revealFog(fog: string, p: Pt, radiusCells = 7): string {
  const { cx, cy } = cellOf(p);
  const arr = fog.split('');
  let changed = false;
  for (let dy = -radiusCells; dy <= radiusCells; dy++)
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      if (dx * dx + dy * dy > radiusCells * radiusCells) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= MASK_W || y >= MASK_H) continue;
      const i = y * MASK_W + x;
      if (arr[i] !== '1') {
        arr[i] = '1';
        changed = true;
      }
    }
  return changed ? arr.join('') : fog;
}
export const isExplored = (fog: string, p: Pt) => {
  const { cx, cy } = cellOf(p);
  return fog.charCodeAt(cy * MASK_W + cx) === 49;
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
    if (p.x > 5 && p.y > 5 && p.x < MAP_W - 5 && p.y < MAP_H - 5 && !isWaterPx(p)) return p;
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
const ROAD_BANDS: [string, string, number, string][] = [
  ['cairo', 'suez', 3, 'Desert thieves'],
  ['suez', 'sinai', 5, 'Raiders'],
  ['jaffa', 'jerusalem', 4, 'Hill bandits'],
  ['jerusalem', 'damascus', 6, 'Raiders'],
  ['damascus', 'baghdad', 8, 'Desert raiders'],
  ['aleppo', 'konya', 6, 'Brigands'],
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
export function routeDanger(path: Pt[], parties: Party[]): number {
  let worst = 0;
  for (const p of parties) {
    if (p.kind !== 'raiders' || !p.strength) continue;
    const L = pathLength(path);
    for (let d = 0; d <= L; d += 8) if (dist(p, along(path, d).pos) < 26) { worst = Math.max(worst, p.strength); break; }
  }
  return worst;
}

export function stepParties(parties: Party[], days: number, rng: () => number, player?: Pt, playerStrength = 2): Party[] {
  return parties.map((p) => {
    // Raiders hunt weaker caravans nearby and avoid strong ones, like bandits on a Bannerlord map.
    if (p.kind === 'raiders' && player && p.strength) {
      const d = dist(p, player);
      if (d < 22 && playerStrength < p.strength * 1.4) {
        const step = Math.min(d, 26 * days); // about a laden camel's pace: animals and horses can outrun them
        const nx = p.x + ((player.x - p.x) / (d || 1)) * step, ny = p.y + ((player.y - p.y) / (d || 1)) * step;
        if (!isWaterPx({ x: nx, y: ny })) return { ...p, x: nx, y: ny, path: [{ x: nx, y: ny }, { x: nx, y: ny }], travelled: 0 };
      } else if (d < 20 && playerStrength >= p.strength * 2) {
        const step = 30 * days;
        const nx = p.x - ((player.x - p.x) / (d || 1)) * step, ny = p.y - ((player.y - p.y) / (d || 1)) * step;
        if (!isWaterPx({ x: nx, y: ny })) return { ...p, x: nx, y: ny, path: [{ x: nx, y: ny }, { x: nx, y: ny }], travelled: 0 };
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
