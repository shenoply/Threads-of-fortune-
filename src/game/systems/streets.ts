// Walking inside a town keeps to its streets, as in Bannerlord: you tap anywhere, and the hero goes
// there by the lanes, not over roofs and through walls. Each walkable town map has its streets as
// polylines (points that two streets share are their crossings) and, where there is open ground (the
// desert by the pyramids, a big square), free areas where you can walk straight.
import { STREETS } from '../../data/streets';

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface StreetMap { streets: [number, number][][]; free?: Rect[] }

const key = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`;
const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** the nearest point on a street to p: which segment and where */
function project(m: StreetMap, p: Pt) {
  let best = { d: Infinity, at: p, a: p, b: p };
  for (const line of m.streets)
    for (let i = 1; i < line.length; i++) {
      const a = { x: line[i - 1][0], y: line[i - 1][1] }, b = { x: line[i][0], y: line[i][1] };
      const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L));
      const at = { x: a.x + vx * t, y: a.y + vy * t };
      const dd = d(p, at);
      if (dd < best.d) best = { d: dd, at, a, b };
    }
  return best;
}

/** How far from a street the last step may go to reach a door (a place's marker) */
const DOOR = 70;

/**
 * The way from `from` to `to` on this map's streets, as the points to walk through in order (the
 * last is where you stop). With no street map, the straight line.
 */
export function streetRoute(mapKey: string, from: Pt, to: Pt, toPlace = false): Pt[] {
  const m = STREETS[mapKey];
  if (!m) return [to];
  const freeOf = (p: Pt) => m.free?.findIndex((r) => inRect(p, r)) ?? -1;
  const fFrom = freeOf(from), fTo = freeOf(to);
  if (fFrom >= 0 && fFrom === fTo) return [to];

  // the graph: street points, joined along each street
  const nodes = new Map<string, Pt>();
  const edges = new Map<string, Map<string, number>>();
  const link = (a: Pt, b: Pt) => {
    const ka = key(a), kb = key(b);
    nodes.set(ka, a); nodes.set(kb, b);
    if (!edges.has(ka)) edges.set(ka, new Map());
    if (!edges.has(kb)) edges.set(kb, new Map());
    const w = d(a, b);
    edges.get(ka)!.set(kb, w); edges.get(kb)!.set(ka, w);
  };
  for (const line of m.streets) for (let i = 1; i < line.length; i++) link({ x: line[i - 1][0], y: line[i - 1][1] }, { x: line[i][0], y: line[i][1] });
  // a street that ends on (or just short of) another joins it there, even without a shared point
  for (const line of m.streets)
    for (const end of [line[0], line[line.length - 1]]) {
      const e = { x: end[0], y: end[1] };
      const other: StreetMap = { streets: m.streets.filter((l) => l !== line) };
      const pr = project(other, e);
      if (pr.d > 30 || pr.d < 0.5) continue;
      link(e, pr.at); link(pr.at, pr.a); link(pr.at, pr.b);
    }
  // inside a free area every street point in it is reachable straight
  m.free?.forEach((r) => {
    const inside = [...nodes.values()].filter((n) => inRect(n, r));
    for (let i = 0; i < inside.length; i++) for (let j = i + 1; j < inside.length; j++) link(inside[i], inside[j]);
  });
  // where you join the streets, and where you leave them
  const attach = (p: Pt, free: number, tag: string) => {
    const k = `@${tag}`;
    nodes.set(k, p);
    edges.set(k, new Map());
    const add = (q: Pt) => {
      const kq = key(q);
      if (!nodes.has(kq)) nodes.set(kq, q);
      if (!edges.has(kq)) edges.set(kq, new Map());
      const w = d(p, q);
      edges.get(k)!.set(kq, w); edges.get(kq)!.set(k, w);
    };
    const pr = project(m, p);
    // the point on the street, joined to both ends of its segment
    const kp = key(pr.at);
    if (!nodes.has(kp)) { nodes.set(kp, pr.at); edges.set(kp, new Map()); }
    for (const end of [pr.a, pr.b]) { const ke = key(end); const w = d(pr.at, end); if (ke !== kp) { edges.get(kp)!.set(ke, w); edges.get(ke)?.set(kp, w); } }
    add(pr.at);
    if (free >= 0) for (const n of [...nodes.values()]) if (inRect(n, m.free![free]) && !key(n).startsWith('@')) add(n);
    return pr;
  };
  const pFrom = attach(from, fFrom, 'from');
  const pTo = attach(to, fTo, 'to');

  // Dijkstra
  const dist = new Map<string, number>([['@from', 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>(['@from']);
  while (open.size) {
    let u = '', best = Infinity;
    for (const k of open) { const v = dist.get(k)!; if (v < best) { best = v; u = k; } }
    open.delete(u);
    if (u === '@to') break;
    for (const [v, w] of edges.get(u) ?? []) {
      const nd = best + w;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); open.add(v); }
    }
  }
  if (!prev.has('@to')) return [to];
  const keys: string[] = [];
  for (let k = '@to'; k !== '@from'; k = prev.get(k)!) keys.push(k);
  keys.reverse();
  const pts = keys.map((k) => nodes.get(k)!);
  // off the street at the end: only as far as a door, unless it is open ground
  // (a place you tapped is always reached: its door is on its street)
  if (fTo < 0 && pTo.d > DOOR && !toPlace) pts[pts.length - 1] = pTo.at;
  // the first step from where you stand to the street is fine (you are always on or next to it)
  void pFrom;
  // drop points that are on top of each other
  return pts.filter((p, i) => i === 0 || d(p, pts[i - 1]) > 1);
}

/** Is there a street map for this town (so taps follow the lanes)? */
export const hasStreets = (mapKey: string) => !!STREETS[mapKey];
