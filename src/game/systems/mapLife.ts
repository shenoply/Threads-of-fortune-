// The travel map's moving pieces (src/data/mapArt.ts): where each ship sails and each caravan walks, and
// where it is at a given moment. Pure, so the lanes can be checked against the land mask in a test.
// A ship keeps to a short lane of open water near its spot (every point on it water, with a little sea
// either side); the felucca keeps to the Nile; a caravan walks a short stretch of road, or of open
// desert, near its spot. Each goes slowly one way, turns, and comes back.
import { CARAVANS, SHIPS, type ArtItem } from '../../data/mapArt';
import { ROAD_LINES } from '../../data/terrain';
import { dist, isBlockedPx, isWaterPx, terrainAt, MAP_W, MAP_H, type Pt } from './world';

export interface Lane { code: string; pts: Pt[]; len: number; /** seconds for one way */ secs: number; /** seconds to turn round at each end */ turn: number; phase: number }
export interface Pose { x: number; y: number; /** heading, radians, 0 = east (the art faces right), clockwise */ angle: number; /** moving towards the lane's end (false: coming back) */ out: boolean; /** 0..1 how far through a turn (0 when under way) */ turning: number }

const inMap = (p: Pt) => p.x > 2 && p.y > 2 && p.x < MAP_W - 2 && p.y < MAP_H - 2;
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((s, q, i) => s + dist(pts[i], q), 0);
/** a small hash of a code, for each piece's own timing */
const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** open sea at p, with water `clear` units round it */
function seaAt(p: Pt, clear: number) {
  if (!inMap(p) || !isWaterPx(p) || terrainAt(p) !== 'water') return false;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const q = { x: p.x + Math.cos(a) * clear, y: p.y + Math.sin(a) * clear };
    if (!inMap(q) || !isWaterPx(q)) return false;
  }
  return true;
}
function segmentOk(a: Pt, b: Pt, ok: (p: Pt) => boolean) {
  const n = Math.max(2, Math.ceil(dist(a, b) / 2));
  for (let i = 0; i <= n; i++) if (!ok({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n })) return false;
  return true;
}
/** The longest straight lane (up to `max` units) through or near c where every point passes `ok`, leaning to east-west. */
function straightLane(c: Pt, ok: (p: Pt) => boolean, max: number, min: number): Pt[] | null {
  const starts: Pt[] = [c];
  for (let r = 4; r <= 40; r += 4) for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; starts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }); }
  for (const s of starts) {
    if (!ok(s)) continue;
    let best: { a: Pt; b: Pt; score: number } | null = null;
    for (let L = max; L >= min; L -= 6) {
      for (let k = 0; k < 12; k++) {
        const ang = (k * Math.PI) / 12;
        const dx = (Math.cos(ang) * L) / 2, dy = (Math.sin(ang) * L) / 2;
        const a = { x: s.x - dx, y: s.y - dy }, b = { x: s.x + dx, y: s.y + dy };
        if (!segmentOk(a, b, ok)) continue;
        const score = L - Math.abs(Math.sin(ang)) * 12;
        if (!best || score > best.score) best = { a, b, score };
      }
      if (best) return [best.a, best.b];
    }
  }
  return null;
}
/** The felucca's lane: the middle of the Nile's channel, row by row, for `half` units up and down from its spot. */
function riverLane(c: Pt, half: number): Pt[] | null {
  const pts: Pt[] = [];
  let x0 = c.x;
  for (let y = c.y - half; y <= c.y + half; y += 5) {
    const xs: number[] = [];
    for (let x = x0 - 20; x <= x0 + 20; x += 2.5) if (terrainAt({ x, y }) === 'river') xs.push(x);
    if (!xs.length) { if (pts.length) break; else continue; }
    // the run of river cells nearest the last row's middle
    const mid = xs.reduce((s, x) => s + x, 0) / xs.length;
    x0 = mid;
    pts.push({ x: mid, y });
  }
  if (pts.length < 3) return null;
  // smoothed, so the boat does not zigzag between the cells
  const sm = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    return { x: (a.x + p.x * 2 + b.x) / 4, y: p.y };
  });
  return sm.every((p) => terrainAt(p) === 'river') ? sm : pts;
}
/** A caravan's way: the stretch of the nearest road near its spot, or a straight track over open ground. */
function landLane(c: Pt, half: number): Pt[] | null {
  // every road, resampled every 2 units, so a stretch can be cut to length anywhere along it
  let best: { line: Pt[]; i: number; d: number } | null = null;
  for (const r of ROAD_LINES) {
    const line: Pt[] = [];
    for (let j = 1; j < r.pts.length; j++) {
      const [ax, ay] = r.pts[j - 1], [bx, by] = r.pts[j];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
      for (let k = j === 1 ? 0 : 1; k <= n; k++) line.push({ x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n });
    }
    line.forEach((p, i) => { const d = dist(p, c); if (d < 45 && (!best || d < best.d)) best = { line, i, d }; });
  }
  const walkable = (p: Pt) => inMap(p) && !isBlockedPx(p) && !isWaterPx(p);
  if (best) {
    const { line, i } = best as { line: Pt[]; i: number };
    const step = Math.round(half / 2);
    const out = line.slice(Math.max(0, i - step), i + step + 1);
    // keep only every fourth point (8 units apart): the caravan's heading turns gently
    const thin = out.filter((_, k) => k % 4 === 0 || k === out.length - 1);
    if (thin.length >= 2 && lengthOf(thin) > 16 && out.every(walkable)) return thin;
  }
  return straightLane(c, walkable, half * 2, 16);
}

let lanes: Map<string, Lane> | null = null;
/** Every ship's and caravan's lane (worked out once). */
export function mapLanes(): Map<string, Lane> {
  if (lanes) return lanes;
  lanes = new Map();
  const add = (it: ArtItem, pts: Pt[] | null, speed: number) => {
    if (!pts) return;
    const len = lengthOf(pts), sd = seedOf(it.code);
    lanes!.set(it.code, { code: it.code, pts, len, secs: len / speed, turn: it.kind === 'caravan' ? 3 : 6, phase: (sd % 1000) / 1000 });
  };
  for (const s of SHIPS) {
    const c = { x: s.x!, y: s.y! };
    if (s.ship === 'felucca') add(s, riverLane(c, 45), 0.9);
    else add(s, straightLane(c, (p) => seaAt(p, s.ship === 'steamer' || s.ship === 'cargo' ? 8 : 5), 90, 24), s.ship === 'steamer' ? 1.6 : s.ship === 'cargo' ? 1.2 : 0.9);
  }
  for (const cv of CARAVANS) add(cv, landLane({ x: cv.x!, y: cv.y! }, 24), 0.45);
  return lanes;
}

/** a point `d` units along a lane, with the heading there */
function at(pts: Pt[], d: number): { p: Pt; a: number } {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const A = pts[i - 1], B = pts[i], seg = dist(A, B);
    if (left <= seg || i === pts.length - 1) {
      const t = seg ? Math.min(1, left / seg) : 0;
      return { p: { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }, a: Math.atan2(B.y - A.y, B.x - A.x) };
    }
    left -= seg;
  }
  return { p: pts[0], a: 0 };
}
const ease = (t: number) => t * t * (3 - 2 * t);

/** Where a piece on its lane is at time t (seconds): out along the lane, a slow turn, back, a turn. */
export function poseAt(lane: Lane, t: number): Pose {
  const cycle = 2 * (lane.secs + lane.turn);
  let u = ((t / cycle + lane.phase) % 1) * cycle;
  // the first and last bit of each leg eases in and out, so it never stops dead
  const leg = (v: number) => { const e = Math.min(0.12, 4 / Math.max(1, lane.secs)); const x = v / lane.secs; return x < e ? (x * x) / (2 * e) / (1 - e) : x > 1 - e ? 1 - ((1 - x) * (1 - x)) / (2 * e) / (1 - e) : (x - e / 2) / (1 - e); };
  if (u < lane.secs) { const q = at(lane.pts, leg(u) * lane.len); return { x: q.p.x, y: q.p.y, angle: q.a, out: true, turning: 0 }; }
  u -= lane.secs;
  if (u < lane.turn) { const q = at(lane.pts, lane.len); const k = ease(u / lane.turn); return { x: q.p.x, y: q.p.y, angle: q.a + Math.PI * k, out: true, turning: k || 0.001 }; }
  u -= lane.turn;
  if (u < lane.secs) { const q = at(lane.pts, (1 - leg(u)) * lane.len); return { x: q.p.x, y: q.p.y, angle: q.a + Math.PI, out: false, turning: 0 }; }
  u -= lane.secs;
  const q = at(lane.pts, 0); const k = ease(u / lane.turn);
  return { x: q.p.x, y: q.p.y, angle: q.a + Math.PI + Math.PI * k, out: false, turning: k || 0.001 };
}
