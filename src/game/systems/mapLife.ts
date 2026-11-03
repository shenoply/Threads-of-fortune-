// The travel map's moving pieces (src/data/mapArt.ts): where each ship sails, and
// where it is at a given moment. Pure, so the lanes can be checked against the land mask in a test.
// A ship keeps to a short lane of open water near its spot (every point on it water, with a little sea
// either side); the felucca keeps to the Nile. Each goes slowly one way, turns, and comes back.
// (The painted caravans no longer walk the map: their wandering served no purpose.)
import { SHIPS, SHEET_FRAMES, SHEET_TILT, SHIP_PAINT, PAINT_ANCHOR, type ArtItem, type ShipWater } from '../../data/mapArt';
import SIZES from '../../data/mapOverlays.json';
import { dist, isWaterPx, terrainAt, MAP_W, MAP_H, type Pt } from './world';

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
let lanes: Map<string, Lane> | null = null;
/** Every ship's lane (worked out once). */
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
    // a gulf or strait a few miles across: a shorter lane with less sea either side (the ship is drawn small to fit)
    else if (s.water === 'narrow') add(s, straightLane(c, (p) => seaAt(p, 2.5), 48, 12), 0.7);
    // on the open sea, well out from the coasts (so the ship can be drawn at its full size), else nearer them
    else add(s, straightLane(c, (p) => seaAt(p, 14), 90, 24) ?? straightLane(c, (p) => seaAt(p, s.ship === 'steamer' || s.ship === 'cargo' ? 8 : 5), 90, 24), s.ship === 'steamer' ? 1.6 : s.ship === 'cargo' ? 1.2 : 0.9);
  }
  // caravans no longer walk the map (2026-11-03): only ships have lanes
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

/** The ship sheet's frame for a heading on the map (radians, 0 = east, clockwise). The sheets are drawn from
 *  the map's slanting view, where the ground is foreshortened north to south, so the heading on the ground
 *  that looks like `angle` on the map is found first; then the nearest of the 16 frames. `ground` is that
 *  heading (the wake is laid on the ground at it), `rest` what is left over after the frame (within +-11.25
 *  degrees; the picture is not turned by it, so masts stay upright). */
export function shipFrame(angle: number): { i: number; ground: number; rest: number } {
  const ground = Math.atan2(Math.sin(angle) / SHEET_TILT, Math.cos(angle));
  const step = (Math.PI * 2) / SHEET_FRAMES;
  const i = ((Math.round(ground / step) % SHEET_FRAMES) + SHEET_FRAMES) % SHEET_FRAMES;
  let rest = ground - i * step;
  rest = Math.atan2(Math.sin(rest), Math.cos(rest));
  return { i, ground, rest };
}

// ---------- how big each ship is drawn ----------
// The paintings keep the ships' sizes to one another (tools/map-overlays.py): each is drawn at one scale, set from the
// mail steamer's width. On the open sea the steamer is about 20 map units long, between 30 and 58 px; in a narrow gulf
// or strait a size smaller, on a river smaller still. Wherever it sails it is never drawn bigger than its water: its
// hull stays on the water at every point of its lane, so a ship never overlaps the land at the size it is drawn.
const PSZ = SIZES.sizes as unknown as Record<string, [number, number]>;
const STEAMER_W = PSZ['S1-steamer.webp']?.[0] ?? 293;
export const WATER_SCALE: Record<ShipWater, number> = { sea: 1, narrow: 0.66, river: 0.5 };
export const waterOf = (it: ArtItem): ShipWater => it.water ?? (it.ship === 'felucca' ? 'river' : 'sea');
/** the painting's size in its own pixels (the type's picture, as tools/map-overlays.py wrote it) */
export function paintingPx(it: ArtItem): [number, number] {
  const code = SHIP_PAINT[it.ship!];
  const k = Object.keys(PSZ).find((f) => f.startsWith(`${code}-`));
  return k ? PSZ[k] : [STEAMER_W, 174];
}
/** the hull's footprint as fractions of the picture: the middle 80% of its width, from 30% of its height above the
 *  waterline to the foot of the picture (the sails and the smoke stand over whatever is behind) */
export const HULL = { w: 0.8, up: 0.3 } as const;
const onWater = (it: ArtItem) => (waterOf(it) === 'river' ? (p: Pt) => terrainAt(p) === 'river' || isWaterPx(p) : (p: Pt) => inMap(p) && isWaterPx(p));
/** is the hull of a ship `w` map units wide on the water with its waterline at p */
export function hullOnWater(it: ArtItem, p: Pt, w: number): boolean {
  const [iw, ih] = paintingPx(it), h = (w * ih) / iw, ok = onWater(it);
  const top = p.y - h * Math.min(HULL.up, PAINT_ANCHOR.y), bot = p.y + h * (1 - PAINT_ANCHOR.y);
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
    if (!ok({ x: p.x + w * HULL.w * (i / 6 - 0.5), y: top + ((bot - top) * j) / 2 })) return false;
  }
  return true;
}
/** points along a lane, about every two units */
export function lanePoints(lane: Lane): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < lane.pts.length; i++) {
    const a = lane.pts[i - 1], b = lane.pts[i], n = Math.max(1, Math.ceil(dist(a, b) / 2));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}
const roomCache = new Map<string, number>();
/** the widest the ship may be drawn, in map units, with its hull on the water all along its lane */
export function shipRoom(it: ArtItem): number {
  const hit = roomCache.get(it.code);
  if (hit !== undefined) return hit;
  const lane = mapLanes().get(it.code);
  let w = 0;
  if (lane) {
    const pts = lanePoints(lane);
    let lo = 0, hi = 80;
    for (let n = 0; n < 16; n++) { const m = (lo + hi) / 2; if (pts.every((p) => hullOnWater(it, p, m))) lo = m; else hi = m; }
    w = lo;
  }
  roomCache.set(it.code, w);
  return w;
}
/** The ship's drawn width in px at map scale s (px per unit), and how opaque (a ship too small to read fades out
 *  rather than popping out between two zoom steps). */
export function shipLook(it: ArtItem, s: number): { w: number; alpha: number } {
  const steamer = Math.max(30, Math.min(58, 20 * s)) * WATER_SCALE[waterOf(it)];
  const want = (steamer * paintingPx(it)[0]) / STEAMER_W;
  const w = Math.min(want, shipRoom(it) * s);
  return { w, alpha: Math.max(0, Math.min(1, (w - 7) / 5)) };
}
