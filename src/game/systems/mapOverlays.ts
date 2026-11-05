// Where the painted overlays stand on the travel map (pure, so a test can check it): the town landmarks, laid out for
// the zoom so none hides a pin, a name or another landmark, and the small groups of people near the towns, placed once
// clear of water, roads, railways, pins, names and landmarks.
// The landmark stands just above its town's pin (its foot at the top of the pin), at the town's own spot; a road well
// has no pin, so its vignette stands on the spot. Most important first (where you are, home, cities, ports, towns, the
// rest, wells); one that would overlap a landmark already placed, or another town's pin and name, is left out at that
// zoom. Zoomed far out only the cities', your home's and your own town's show, a size smaller.
import SIZES from '../../data/mapOverlays.json';
import { LANDMARKS, MAP_LABELS, PEOPLE, PAINTED_LANDMARKS, paintedBox, type ArtItem, type PeopleArt } from '../../data/mapArt';
import { SETTLEMENTS, ROAD_WELLS, RAIL_LINKS, type SettlementKind } from '../../data/world';
import { ROAD_LINES } from '../../data/terrain';
import { geo } from '../../data/projection';
import { isWaterPx, terrainAt, routeLeg, settlementById, MAP_W, MAP_H, type Pt } from './world';

const SZ = SIZES.sizes as unknown as Record<string, [number, number]>;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** a rectangle in map units */
export interface Box { l: number; t: number; r: number; b: number }
const hit = (a: Box, b: Box, pad = 0) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;

// ---------- places ----------
interface Place { id: string; kind: SettlementKind | 'well'; name: string; x: number; y: number }
const PLACES: Place[] = [
  ...SETTLEMENTS.filter((s) => !s.gateway).map((s) => ({ id: s.id, kind: s.kind, name: s.name.split(',')[0], x: s.x, y: s.y })),
  ...ROAD_WELLS.map((w) => ({ id: w.id, kind: 'well' as const, name: '', x: w.x, y: w.y })),
];
const placeOf = (id: string) => PLACES.find((p) => p.id === id);
const NAMED_MID = new Set<string>(['home', 'city', 'town', 'port']);
/** A town's pin and name on screen at scale s (map px per unit), as a box in map units. The pin (22-24 px) sits over
 *  its name (Cinzel 11 px, about 8.4 px a letter), the pair centred on the town. `tier` 2 names every place, 1 only
 *  the towns, cities and ports (WorldMap's rule). */
export function pinBox(p: Place, s: number, tier: number): Box {
  const named = tier >= 2 || NAMED_MID.has(p.kind);
  // (and the shop, job and news marks that sit beside a pin)
  const half = ((named ? Math.max(13, (p.name.length * 8.4 + 10) / 2) : 13) + 12) / s;
  const up = (named ? 22 : 13) / s, down = (named ? 20 : 13) / s;
  return { l: p.x - half, r: p.x + half, t: p.y - up, b: p.y + down };
}

// ---------- the landmarks ----------
/** the landmarks painted into the map itself (map units): an overlay never covers one */
export const PAINTED_BOXES: Box[] = LANDMARKS.map(paintedBox).filter((b): b is Box => !!b);
export const landmarkFile = (it: ArtItem) => `${it.code}-${it.name}.webp`;
/** the landmark's size on screen at scale s, in px: as wide as about 48 map units, never under 138 px (126 zoomed far
 *  out, `far`, where only the cities' and your own town's show) nor over 264 (since 2026-11-05 half as big again as the
 *  rule before, 32 units, 92/84-176 px: on a phone they still read as small, and the painting's own were painted out) */
export const LANDMARK_RULE = { units: 48, min: 138, minFar: 126, max: 264 };
export function landmarkPx(it: ArtItem, s: number, far = false): { w: number; h: number } {
  const [iw, ih] = SZ[landmarkFile(it)] ?? [384, 256];
  const W = clamp(LANDMARK_RULE.units * s, far ? LANDMARK_RULE.minFar : LANDMARK_RULE.min, LANDMARK_RULE.max), H = W * 0.74;
  const k = Math.min(W / iw, H / ih);
  return { w: iw * k, h: ih * k };
}
/** how far to one side a landmark may stand from above its pin, in its own widths */
const SHIFTS = [0, -0.3, 0.3, -0.45, 0.45];
const SHRINK = [1, 0.86, 0.74, 0.62, 0.52];
/** the most a landmark is lifted above its pin to clear what stands there, in px */
const LIFT = 72;
/** the places whose landmarks show zoomed far out (and where you are) */
const FAR_KINDS = new Set<string>(['home', 'city', 'port']);
const RANK: Record<string, number> = { home: 0, city: 1, port: 1.5, town: 2, monastery: 3, oasis: 3, camp: 3, village: 3.5, well: 4 };
export interface LandmarkSpot { it: ArtItem; x: number; /** the foot, map units */ y: number; w: number; h: number; box: Box }
/** The box a landmark takes at scale s, in map units, its foot at the top of its town's pin (a well's on the spot). */
export function landmarkBox(it: ArtItem, s: number, far = false): LandmarkSpot | null {
  const p = placeOf(it.town!);
  if (!p) return null;
  const { w, h } = landmarkPx(it, s, far);
  // the pin's top (the name below it centres the pair on the town), and a pixel of air
  const foot = p.kind === 'well' ? p.y + 3 / s : p.y - (NAMED_MID.has(p.kind) ? 21 : 12) / s;
  return { it, x: p.x, y: foot, w, h, box: { l: p.x - w / 2 / s, r: p.x + w / 2 / s, t: foot - h / s, b: foot } };
}
/** The landmarks shown at scale s: most important first, each left out where it would overlap one already placed or
 *  another place's pin and name. `shown(id)`: the place is on the map (a town you know; a well in country you have seen);
 *  `pins`: the places whose pins are on screen (known towns). `first` puts a place ahead of its rank (where you are). */
export interface PinBlock { id: string; /** the pin itself (not its name or a mark beside it) */ dot: boolean; box: Box }
export function landmarkLayout(s: number, tier: number, shown: (id: string) => boolean, pins: (id: string) => boolean, first?: (id: string) => boolean, blocks?: PinBlock[]): LandmarkSpot[] {
  // far out (tier 0) only the cities', your home's and where you are
  // (a landmark painted into the map itself is not laid over it again)
  const cand = LANDMARKS.filter((it) => !PAINTED_LANDMARKS.has(it.code) && shown(it.town!)).map((it) => ({ it, p: placeOf(it.town!)! }))
    .filter((c) => c.p && (tier > 0 || FAR_KINDS.has(c.p.kind) || !!first?.(c.it.town!)));
  cand.sort((a, b) => (first?.(b.it.town!) ? 1 : 0) - (first?.(a.it.town!) ? 1 : 0) || (RANK[a.p.kind] ?? 3) - (RANK[b.p.kind] ?? 3) || a.p.y - b.p.y);
  // what is on the map: the pins, names and marks as the page laid them out, else as they usually stand
  const boxes: { id: string; b: Box; dot: boolean }[] = blocks?.length ? blocks.map((q) => ({ id: q.id, b: q.box, dot: q.dot }))
    : PLACES.filter((p) => p.kind !== 'well' && pins(p.id)).map((q) => ({ id: q.id, b: pinBox(q, s, tier), dot: false }));
  const out: LandmarkSpot[] = [];
  const pad = 2 / s;
  for (const c of cand) {
    const L0 = landmarkBox(c.it, s, tier === 0);
    if (!L0) continue;
    // its foot just above its pin, or above its name where the name sits over the pin
    const own = boxes.filter((q) => q.id === c.p.id);
    const dot = own.find((q) => q.dot);
    const feet = blocks?.length && c.p.kind !== 'well' ? [...new Set([dot ? dot.b.t - 1.5 / s : L0.y, Math.min(...own.map((q) => q.b.t), L0.y) - 1.5 / s])] : [L0.y];
    // straight above if it fits, lifted over whatever stands just above the pin (its mission tag, rank mark, your
    // medallion: never more than LIFT px, never past another town's marks); else a little to one side or the other (never off its pin); else under the
    // town's name, on open ground (zoomed out, where the towns crowd together); else a size smaller. Moved off its
    // pin, or zoomed far out, it must stand on dry land (never out at sea off a coast town).
    const lift = LIFT / s;
    const below = Math.max(L0.y, ...own.map((q) => q.b.b)) + 1.5 / s;
    const fits = (f: number, k: number, foot0: number, down: boolean): LandmarkSpot | null => {
      const w = L0.w * f, h = L0.h * f, dx = (k * w) / s;
      let foot = down ? foot0 + h / s : foot0;
      const start = foot;
      for (let n = 0; n < 4; n++) {
        const L = { ...L0, x: L0.x + dx, y: foot, w, h, box: { l: L0.x + dx - w / 2 / s, r: L0.x + dx + w / 2 / s, t: foot - h / s, b: foot } };
        if (out.some((o) => hit(o.box, L.box, pad)) || PAINTED_BOXES.some((o) => hit(o, L.box, -4))) return null;  // (a corner over a painted one's edge is let pass)
        const under = boxes.filter((q) => hit(q.b, L.box, -0.5 / s) && (blocks?.length ? true : q.id !== c.p.id));
        if (!under.length) {
          if ((down || tier === 0 || foot < feet[0] - 4 / s) && (isWaterPx({ x: L.x, y: foot - 1 / s }) || isWaterPx({ x: L.x, y: foot - h / 2 / s }))) return null;
          return L;
        }
        // it steps past its own town's marks (and your medallion), never past another town's
        if (under.some((q) => q.id !== c.p.id && q.id !== 'me')) return null;
        foot = down ? Math.max(...under.map((q) => q.b.b)) + h / s + 1.5 / s : Math.min(...under.map((q) => q.b.t)) - 1.5 / s;
        if (Math.abs(foot - start) > lift) return null;
      }
      return null;
    };
    let got: LandmarkSpot | null = null;
    for (const f of SHRINK) {
      for (const k of SHIFTS) { for (const foot0 of feet) { got = fits(f, k, foot0, false); if (got) break; } if (got) break; }
      if (!got && blocks?.length && c.p.kind !== 'well') for (const k of SHIFTS) { got = fits(f, k, below, true); if (got) break; }
      // else beside its town, to the right or the left: its near edge just clear of the town's own pin, name and marks
      // (and your medallion, standing there), its middle at the pin's height (since 2026-11-05: in the crowded Delta,
      // Giza and Cairo stand a pin's width apart, and above and below are taken by Tanta's and Saqqara's marks)
      if (!got && blocks?.length && c.p.kind !== 'well' && own.length) {
        const ob = { l: Math.min(...own.map((q) => q.b.l)), r: Math.max(...own.map((q) => q.b.r)) };
        const dotB: Box = dot?.b ?? { l: L0.x - 11 / s, r: L0.x + 11 / s, t: L0.y, b: L0.y + 22 / s };
        const mid = (dotB.t + dotB.b) / 2;
        const w = L0.w * f, h = L0.h * f;
        for (const side of [1, -1]) {
          const cx = side > 0 ? ob.r + 3 / s + w / 2 / s : ob.l - 3 / s - w / 2 / s;
          got = fits(f, ((cx - L0.x) * s) / w, mid + (h * 0.45) / s, false);
          if (got) break;
        }
      }
      if (got) break;
    }
    if (got) out.push(got);
  }
  return out;
}

// ---------- people ----------
/** a group's height in map units (it is drawn at that, so it grows and shrinks with the map like the painting) */
export const PEOPLE_H = 4.4;
/** map units per pixel of the people's pictures (one scale for all, so a ploughman's ox and a soldier agree) */
export const PEOPLE_UNIT = PEOPLE_H / 110;
export const peopleSize = (art: PeopleArt) => { const [w, h] = SZ[`people/${art}.webp`] ?? [200, 110]; return { w: w * PEOPLE_UNIT, h: h * PEOPLE_UNIT }; };
/** the closest-in scales the people show at (WorldMap's close tier on a phone, and on a wide screen) */
export const PEOPLE_SCALES = [2.9, 4.2, 5.7];
export interface PeoplePlace { art: PeopleArt; near: string; x: number; /** the feet, map units */ y: number; w: number; h: number; /** faces left */ flip: boolean }

/** every road and railway as points 1.5 units apart, in a coarse grid, for "how far to the nearest way" */
let ways: Map<number, Pt[]> | null = null;
const WB = 20, wkey = (x: number, y: number) => Math.floor(y / WB) * 1000 + Math.floor(x / WB);
function wayGrid() {
  if (ways) return ways;
  ways = new Map();
  const add = (pts: Pt[]) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5));
      for (let k = 0; k <= n; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
        const key = wkey(p.x, p.y);
        let l = ways!.get(key);
        if (!l) ways!.set(key, (l = []));
        l.push(p);
      }
    }
  };
  for (const r of ROAD_LINES) add(r.pts.map(([x, y]) => ({ x, y })));
  for (const l of RAIL_LINKS) { const A = settlementById(l.a), B = settlementById(l.b); add(routeLeg({ x: A.x, y: A.y }, { x: B.x, y: B.y }, 'rail')); }
  return ways;
}
export function nearestWay(p: Pt): number {
  const g = wayGrid();
  let best = Infinity;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const l = g.get(wkey(p.x + dx * WB, p.y + dy * WB));
    if (l) for (const q of l) best = Math.min(best, Math.hypot(q.x - p.x, q.y - p.y));
  }
  return best;
}
const wet = (p: Pt) => { if (p.x < 2 || p.y < 2 || p.x > MAP_W - 2 || p.y > MAP_H - 2 || isWaterPx(p)) return true; const t = terrainAt(p); return t === 'water' || t === 'river' || t === 'lake' || t === 'canal'; };

// the names written on the painting (mapRender.ts draws them; the lesser ones by longitude and latitude, as there)
const MINOR = [['Syrian Desert', 39.3, 32.6, 1.1, 0], ['Zagros', 49.0, 32.6, 0.95, 40], ['Dasht-i Kavir', 54.5, 34.6, 0.9, 0]] as const;
const NAMES = [...MAP_LABELS.map((l) => ({ text: l.text, kind: l.kind as string, x: l.x, y: l.y, size: l.size ?? 1, rot: l.rot ?? 0 })),
  ...MINOR.map(([text, lon, lat, size, rot]) => ({ text, kind: 'minor', ...geo(lon, lat), size, rot }))];
/** is p under a painted name at scale s (the name's lettering box, turned with it, and a little air) */
export function underName(p: Pt, s: number) {
  const zf = clamp(s / 1.6, 0.75, 1.7);
  for (const l of NAMES) {
    const font = (l.kind === 'region' || l.kind === 'sea' ? 11.5 : 10) * l.size * zf;
    const gap = l.kind === 'region' ? 0.3 : l.kind === 'sea' ? 0.12 : l.kind === 'river' ? 0.08 : 0.18;
    const hw = (l.text.length * font * (0.62 + gap)) / 2 / s + 2, hh = (font * 0.7) / s + 1.5;
    const a = (-l.rot * Math.PI) / 180, dx = p.x - l.x, dy = p.y - l.y;
    const u = dx * Math.cos(a) - dy * Math.sin(a), v = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(u) < hw && Math.abs(v) < hh) return true;
  }
  return false;
}
/** a point `at` of the way along the road between two places */
function alongRoad(a: string, b: string, at: number): Pt | null {
  const r = ROAD_LINES.find((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a));
  if (!r) return null;
  const pts = (r.a === a ? r.pts : [...r.pts].reverse()).map(([x, y]) => ({ x, y }));
  const len = pts.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - pts[i].x, q.y - pts[i].y), 0);
  let left = len * at;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (left <= seg) { const t = left / seg; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }; }
    left -= seg;
  }
  return pts[pts.length - 1];
}
let obst: Box[] | null = null;
const obstacles = () => obst ??= PEOPLE_SCALES.flatMap((s) => [
  ...PLACES.filter((q) => q.kind !== 'well').map((q) => pinBox(q, s, 2)),
  ...LANDMARKS.map((it) => landmarkBox(it, s)?.box).filter((b): b is Box => !!b),
]);
/** what a group's ground (feet at (x, y), w x h units) must keep clear of; `shore` wants water close by */
export function peopleClear(x: number, y: number, w: number, h: number, near: string, shore = false): boolean {
  const box: Box = { l: x - w / 2, r: x + w / 2, t: y - h, b: y };
  for (const b of obstacles()) if (hit(b, box, 0.8)) return false;
  // the ground under and round the group: dry, and off the roads and railways
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) {
    const p = { x: box.l + (w * i) / 4, y: box.t + (h * j) / 2 };
    if (wet(p)) return false;
    if (nearestWay(p) < 1.8) return false;
  }
  if (shore) {
    let wetBy = false;
    for (let k = 0; k < 12 && !wetBy; k++) { const a = (k * Math.PI) / 6; wetBy = isWaterPx({ x: x + Math.cos(a) * (w * 0.5 + 3), y: y - h / 2 + Math.sin(a) * (h * 0.5 + 3) }); }
    if (!wetBy) return false;
  }
  // pins and names (every name shows close in) and the landmarks at their spots, at each close scale
  for (const b of obstacles()) if (hit(b, box, 0.8)) return false;
  for (const s of PEOPLE_SCALES) for (const p of [{ x, y }, { x: box.l, y: box.t }, { x: box.r, y: box.t }, { x: box.l, y }, { x: box.r, y }]) if (underName(p, s)) return false;
  void near;
  return true;
}
let people: PeoplePlace[] | null = null;
/** Where each group stands (worked out once): the nearest clear ground to its town (or its stretch of road), to the
 *  sides and south before the north (the landmark stands there), each group well apart from the others; facing the
 *  town or the way along the road. A group with no clear ground near its spot is left out. */
export function placePeople(): PeoplePlace[] {
  if (people) return people;
  const out: PeoplePlace[] = [];
  for (const sp of PEOPLE) {
    const town = placeOf(sp.near);
    if (!town) continue;
    const anchor = sp.to ? alongRoad(sp.near, sp.to, sp.at ?? 0.5) : { x: town.x, y: town.y };
    if (!anchor) continue;
    const { w, h } = peopleSize(sp.art);
    let best: { x: number; y: number; cost: number } | null = null;
    const r0 = sp.to ? 2.5 : 6, r1 = sp.to ? 32 : sp.shore ? 32 : 30;
    for (let r = r0; r <= r1; r += 1.25) {
      for (let k = 0; k < 24; k++) {
        const a = (k * Math.PI) / 12;
        const x = anchor.x + Math.cos(a) * r, y = anchor.y + Math.sin(a) * r * 0.8 + h / 2;
        // north of a town is the landmark's: cost more there
        const cost = r + (Math.sin(a) < -0.3 && !sp.to ? 6 : 0);
        if (best && cost >= best.cost) continue;
        if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 12)) continue;
        if (!peopleClear(x, y, w, h, sp.near, sp.shore)) continue;
        best = { x, y, cost };
      }
      if (best && best.cost <= r + 1.25) break;
    }
    if (!best) continue;
    // a group beside a town faces it; one on a road faces along it, away from the town it set out from
    const flip = sp.to ? (settlementById(sp.to)?.x ?? anchor.x) < anchor.x : town.x < best.x;
    out.push({ art: sp.art, near: sp.near, x: Math.round(best.x * 10) / 10, y: Math.round(best.y * 10) / 10, w, h, flip });
  }
  people = out;
  return out;
}
