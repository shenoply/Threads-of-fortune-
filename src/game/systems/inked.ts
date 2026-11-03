// Inked journeys: every way actually travelled stays on the travel map as a fine sepia line. Each is
// kept in the save as a flat list of map units [x0, y0, x1, y1, ...], thinned (a point only where the
// line turns) and rounded to half a unit, so years of travel stay small.
import type { Pt } from './world';

/** the most numbers all the inked lines together may hold (about 15,000 points); the oldest go first */
export const INK_CAP = 30000;

/** Douglas-Peucker: drop the points that lie within `tol` units of the line through their neighbours. */
export function thin(pts: Pt[], tol = 1): Pt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
    let far = -1, fd = tol;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const d = L ? Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / L : Math.hypot(P.x - A.x, P.y - A.y);
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** A travelled way as it is kept: thinned, rounded, flat. Empty when it is too short to see. */
export function inkLine(pts: Pt[]): number[] {
  const clean = pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  let len = 0;
  for (let i = 1; i < clean.length; i++) len += Math.hypot(clean[i].x - clean[i - 1].x, clean[i].y - clean[i - 1].y);
  if (clean.length < 2 || len < 2) return [];
  const out: number[] = [];
  for (const p of thin(clean, 0.8)) out.push(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2);
  return out;
}

/** The inked lines with a new one added, the oldest dropped while the whole is over the cap. */
export function addInk(lines: number[][] | undefined, pts: Pt[]): number[][] {
  const line = inkLine(pts);
  const all = [...(lines ?? [])];
  if (!line.length) return all;
  all.push(line);
  let n = all.reduce((s, l) => s + l.length, 0);
  while (n > INK_CAP && all.length > 1) n -= all.shift()!.length;
  return all;
}

/** The SVG path for the inked lines (map units). */
export const inkPath = (lines: number[][] | undefined) => (lines ?? []).map((l) => {
  let d = `M${l[0]} ${l[1]}`;
  for (let i = 2; i < l.length; i += 2) d += `L${l[i]} ${l[i + 1]}`;
  return d;
}).join('');

/** The part of a path already behind a traveller `done` units along it. */
export function pathUpTo(path: Pt[], done: number): Pt[] {
  const out: Pt[] = [path[0]];
  let left = done;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg) { const t = seg ? left / seg : 0; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); return out; }
    out.push(b);
    left -= seg;
  }
  return out;
}

/** Near an inked line (within r units): a place you have travelled to or through. */
export function nearInk(lines: number[][] | undefined, p: Pt, r = 8): boolean {
  const r2 = r * r;
  for (const l of lines ?? []) {
    for (let i = 0; i < l.length; i += 2) {
      const ax = l[i], ay = l[i + 1];
      const bx = i + 2 < l.length ? l[i + 2] : ax, by = i + 2 < l.length ? l[i + 3] : ay;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / L2)) : 0;
      const ex = ax + dx * t - p.x, ey = ay + dy * t - p.y;
      if (ex * ex + ey * ey <= r2) return true;
    }
  }
  return false;
}
