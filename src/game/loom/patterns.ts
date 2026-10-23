// The weaver's pattern book: every shape a carpet of yours can carry, each with its place on the
// carpet fixed in advance, and the dye sets of the old weaving towns. A design is a choice from
// each list; the places, proportions and outlines are the weaver's, so whatever is chosen comes
// out as a properly made carpet.
//
// Shapes are drawn on the knot grid: each is a set of layers over a cell, in coordinates from -1 to
// 1, and every knot takes the colour of the last layer that covers it. A layer marked `edge` gets a
// one-knot dark outline where it meets what is outside it, the way weavers outline every figure.

export type Role = 0 | 1 | 2 | 3 | 4; // 0 shows the ground, 1 main colour, 2 accent, 3 outline (dark), 4 light
type Shape = (u: number, v: number) => boolean;
export interface Layer { shape: Shape; role: Role; edge?: boolean }
export interface Motif { id: string; name: string; line: string; layers: Layer[]; /** extra labour, in piastres for a rug */ cost: number }

// ---------- shape helpers ----------
const A = Math.abs;
const diamond = (r: number): Shape => (u, v) => A(u) + A(v) <= r;
const square = (r: number): Shape => (u, v) => Math.max(A(u), A(v)) <= r;
const octagon = (r: number): Shape => (u, v) => Math.max(A(u), A(v), (A(u) + A(v)) * 0.75) <= r;
const circle = (r: number): Shape => (u, v) => u * u + v * v <= r * r;
const star8 = (r: number): Shape => (u, v) => Math.max(A(u), A(v)) <= r * 0.72 || A(u) + A(v) <= r;
const rosette = (r: number, petals: number, depth = 0.28): Shape => (u, v) => {
  const a = Math.atan2(v, u);
  return Math.hypot(u, v) <= r * (1 - depth + depth * Math.cos(petals * a));
};
const not = (s: Shape): Shape => (u, v) => !s(u, v);
const and = (...ss: Shape[]): Shape => (u, v) => ss.every((s) => s(u, v));
const or = (...ss: Shape[]): Shape => (u, v) => ss.some((s) => s(u, v));
const ring = (outer: Shape, inner: Shape) => and(outer, not(inner));
/** small latch hooks on the four points of a diamond of radius r */
const hooks = (r: number, w = 0.12): Shape => (u, v) => {
  const t = (p: number, q: number) => A(p) >= r - 0.02 && A(p) <= r + 0.24 && A(q) <= w;
  const curl = (p: number, q: number) => A(p) >= r + 0.12 && A(p) <= r + 0.26 && q >= 0 && q <= w * 2.4;
  return t(u, v) || t(v, u) || curl(u, v * Math.sign(u || 1)) || curl(v, -u * Math.sign(v || 1));
};
const quarter = (s: Shape, f: (u: number, v: number) => boolean): Shape => (u, v) => s(u, v) && f(u, v);

// ---------- field motifs (repeated over the field, or sprinkled round a medallion) ----------
export const FIELD: Motif[] = [
  { id: 'lozenge', name: 'Hooked lozenge', line: 'The village diamond with hooks at its points, from Anatolia to the Caucasus.', cost: 0,
    layers: [{ shape: diamond(0.62), role: 1, edge: true }, { shape: hooks(0.62), role: 1 }, { shape: diamond(0.36), role: 4, edge: true }, { shape: diamond(0.14), role: 2 }] },
  { id: 'gul', name: 'Turkmen gul', line: 'The quartered octagon of the Turkmen tents, each quarter in its own colour.', cost: 6,
    layers: [{ shape: octagon(0.86), role: 1, edge: true },
      { shape: quarter(octagon(0.6), (u, v) => u * v > 0), role: 2 }, { shape: quarter(octagon(0.6), (u, v) => u * v <= 0), role: 4 },
      { shape: ring(octagon(0.66), octagon(0.58)), role: 3 }, { shape: (u, v) => (A(u) < 0.06 || A(v) < 0.06) && octagon(0.6)(u, v), role: 3 }, { shape: diamond(0.18), role: 1, edge: true }] },
  { id: 'star', name: 'Eight-pointed star', line: 'The star of the Mamluk carpets of Cairo and the Anatolian villages.', cost: 6,
    layers: [{ shape: star8(0.8), role: 1, edge: true }, { shape: octagon(0.42), role: 4, edge: true }, { shape: star8(0.26), role: 2 }] },
  { id: 'rosette', name: 'Rosette', line: 'A round flower of eight petals, as the town workshops weave it.', cost: 10,
    layers: [{ shape: rosette(0.78, 8), role: 1, edge: true }, { shape: rosette(0.46, 8, 0.2), role: 4, edge: true }, { shape: circle(0.2), role: 2 }] },
  { id: 'herati', name: 'Herati', line: 'A flower in a small diamond with four leaves round it: the Persian town pattern.', cost: 14,
    layers: [
      { shape: (u, v) => { const p = (u + v) / 1.41, q = (u - v) / 1.41; const leaf = (a: number, b: number) => (A(a) - 0.56) ** 2 / 0.07 + b * b / 0.018 <= 1; return leaf(p, q) || leaf(q, p); }, role: 2, edge: true },
      { shape: ring(diamond(0.42), diamond(0.3)), role: 1 }, { shape: rosette(0.24, 4, 0.35), role: 4, edge: true }] },
  { id: 'cypress', name: 'Cypress', line: 'The tall cypress of the garden carpets, for long life.', cost: 8,
    layers: [{ shape: (u, v) => v > -0.88 && v < 0.6 && A(u) <= 0.6 * (v + 0.88) / 1.48 + 0.08, role: 1, edge: true },
      { shape: (u, v) => v >= 0.58 && v <= 0.9 && A(u) <= 0.09, role: 3 }, { shape: (u, v) => A(u) <= 0.05 && v > -0.6 && v < 0.5, role: 4 }] },
  { id: 'memling', name: 'Memling gul', line: 'A stepped octagon with hooked edges, an old Anatolian figure.', cost: 8,
    layers: [{ shape: and(diamond(0.86), square(0.62)), role: 1, edge: true }, { shape: and(diamond(0.56), square(0.4)), role: 4, edge: true },
      { shape: or(square(0.12), and(diamond(0.3), (u, v) => A(u) < 0.06 || A(v) < 0.06)), role: 2 }] },
];

// ---------- medallions (one, in the middle of the field) ----------
export const MEDALLION: Motif[] = [
  { id: 'none', name: 'No medallion', line: 'The field pattern runs all over, edge to edge.', cost: 0, layers: [] },
  { id: 'stepped', name: 'Stepped lozenge', line: 'A large diamond in bands, with pendants at each end: Kazak and Anatolian village work.', cost: 40,
    layers: [{ shape: or(diamond(0.82), and(square(0.12), (u) => A(u) <= 1)), role: 1, edge: true }, { shape: ring(diamond(0.62), diamond(0.5)), role: 4 },
      { shape: diamond(0.5), role: 2, edge: true }, { shape: diamond(0.3), role: 1, edge: true }, { shape: star8(0.16), role: 4 }] },
  { id: 'star', name: 'Star medallion', line: 'A great eight-pointed star round an octagon, in the Mamluk manner.', cost: 55,
    layers: [{ shape: star8(0.9), role: 1, edge: true }, { shape: octagon(0.6), role: 4, edge: true }, { shape: octagon(0.48), role: 2, edge: true },
      { shape: star8(0.36), role: 1, edge: true }, { shape: octagon(0.12), role: 4 }] },
  { id: 'round', name: 'Floral round', line: 'A round medallion of petals and a star at its heart, as Tabriz and Kerman weave them.', cost: 80,
    layers: [{ shape: or(rosette(0.92, 16, 0.12), and(square(0.1), (u) => A(u) <= 1.02)), role: 1, edge: true }, { shape: circle(0.66), role: 4, edge: true },
      { shape: rosette(0.56, 8, 0.22), role: 2, edge: true }, { shape: circle(0.3), role: 1, edge: true }, { shape: star8(0.2), role: 4 }] },
  { id: 'hexagon', name: 'Hooked hexagon', line: 'A long six-sided panel with hooked sides, the shape of the Bergama and Ladik rugs.', cost: 45,
    layers: [{ shape: (u, v) => A(v) <= 0.62 && A(u) <= 0.95 - A(v) * 0.5, role: 1, edge: true }, { shape: (u, v) => A(v) <= 0.42 && A(u) <= 0.7 - A(v) * 0.5, role: 4, edge: true },
      { shape: (u, v) => A(v) <= 0.26 && A(u) <= 0.46 - A(v) * 0.5, role: 2, edge: true }, { shape: diamond(0.12), role: 3 }] },
];

// ---------- the main border: a band repeated round the carpet ----------
/** s runs along the band (0..1 over one repeat), t across it (0 at the outside, 1 at the inside) */
export interface Band { id: string; name: string; line: string; cost: number; at: (s: number, t: number) => Role }
export const BORDER: Band[] = [
  { id: 'meander', name: 'Running wave', line: 'A curling wave running round the carpet, older than anyone can say.', cost: 10,
    at: (s, t) => { const x = s % 1, w = 0.5 + 0.3 * Math.sin(x * Math.PI * 2); const d = t - w;
      if (Math.abs(d) < 0.09) return 3; const cx = 0.25, cy = 0.3, e = ((x - cx) / 0.1) ** 2 + ((t - cy) / 0.13) ** 2; if (e < 1) return 2;
      const cx2 = 0.75, cy2 = 0.7, e2 = ((x - cx2) / 0.1) ** 2 + ((t - cy2) / 0.13) ** 2; if (e2 < 1) return 4; return d < 0 ? 1 : 0; } },
  { id: 'teeth', name: 'Reciprocal teeth', line: 'Two rows of interlocking triangles, light into dark.', cost: 6,
    at: (s, t) => { const h = 1 - A((s % 1) - 0.5) * 2; return t < 0.12 || t > 0.88 ? 3 : t < 0.12 + h * 0.76 ? 1 : 4; } },
  { id: 'rosettes', name: 'Rosette and leaf', line: 'Round flowers alternating with small diamonds: the border of the town carpets.', cost: 18,
    at: (s, t) => { const u = ((s * 2) % 1) * 2 - 1, v = t * 2 - 1, big = Math.floor(s * 2) % 2 === 0;
      if (big) { const r = Math.hypot(u, v); return r < 0.25 ? 2 : r < 0.62 ? 4 : r < 0.76 ? 3 : (A(v) < 0.08 ? 1 : 0); }
      return A(u) + A(v) < 0.4 ? 1 : A(u) + A(v) < 0.52 ? 3 : (A(v) < 0.08 ? 1 : 0); } },
  { id: 'kufic', name: 'Kufic border', line: 'Upright strokes and knots like old Kufic writing, from the Seljuk carpets of Konya.', cost: 14,
    at: (s, t) => { const x = s % 1; const stroke = (x > 0.18 && x < 0.3) || (x > 0.7 && x < 0.82); const bar = t > 0.7 && t < 0.84; const knot = x > 0.4 && x < 0.6 && t > 0.3 && t < 0.56;
      return (stroke && t > 0.16 && t < 0.84) || bar || knot ? 1 : t < 0.08 || t > 0.92 ? 3 : 0; } },
  { id: 'vine', name: 'Leaf vine', line: 'A climbing vine with a leaf at each turn.', cost: 12,
    at: (s, t) => { const x = s % 1; const w = 0.5 + 0.28 * Math.sin(x * Math.PI * 2); if (A(t - w) < 0.09) return 3;
      const lx = x < 0.5 ? 0.25 : 0.75, ly = x < 0.5 ? 0.25 : 0.75; const e = ((x - lx) / 0.14) ** 2 + ((t - ly) / 0.2) ** 2; return e < 0.55 ? 2 : e < 1 ? 1 : 0; } },
];

// ---------- the guard stripes either side of the border ----------
export const GUARD: Band[] = [
  { id: 'plain', name: 'Plain', line: 'A plain stripe.', cost: 0, at: (_s, t) => (t > 0.3 && t < 0.7 ? 1 : 0) },
  { id: 'barber', name: 'Barber pole', line: 'Short diagonal stripes, two colours.', cost: 3, at: (s, t) => ((s * 2 + t) % 1 < 0.5 ? 1 : 4) },
  { id: 'dots', name: 'Dots', line: 'A row of small light dots.', cost: 2, at: (s, t) => (A((s % 1) - 0.5) < 0.2 && A(t - 0.5) < 0.3 ? 4 : 0) },
  { id: 'zigzag', name: 'Zigzag', line: 'A narrow running zigzag.', cost: 3, at: (s, t) => (A(t - (0.2 + 0.6 * (1 - A((s % 1) * 2 - 1)))) < 0.25 ? 1 : 0) },
];

// ---------- layouts ----------
export interface Layout { id: string; name: string; line: string; cost: number }
export const LAYOUT: Layout[] = [
  { id: 'medallion', name: 'Medallion', line: 'A medallion in the middle of the field, with corner pieces.', cost: 30 },
  { id: 'allover', name: 'All-over', line: 'One figure repeated in rows over the whole field.', cost: 0 },
  { id: 'prayer', name: 'Prayer niche', line: 'An arched niche at one end, like the mihrab of a mosque.', cost: 40 },
  { id: 'bands', name: 'Bands', line: 'The field woven in bands across, each with its row of figures, as on the kilims.', cost: 0 },
];

// ---------- dye sets of the weaving towns ----------
export interface Dye { name: string; hex: string; /** costly dyes: indigo, cochineal, saffron */ dear?: boolean }
export interface Palette { id: string; name: string; line: string; dyes: Dye[]; /** default roles: ground, ground2, main, accent, light, outline, border */ roles: number[] }
const madder = { name: 'madder red', hex: '#9c2f24' }, deepMadder = { name: 'deep madder', hex: '#6f1f1a' }, indigo = { name: 'indigo', hex: '#23365c', dear: true },
  sky = { name: 'sky blue', hex: '#5f86a6' }, ivory = { name: 'undyed ivory', hex: '#e6d7b4' }, walnut = { name: 'walnut brown', hex: '#3b2618' },
  weld = { name: 'weld yellow', hex: '#c99a3a' }, saffron = { name: 'saffron', hex: '#d8a23e', dear: true }, green = { name: 'pistachio green', hex: '#5c6b3a' },
  rose = { name: 'cochineal rose', hex: '#a94a57', dear: true }, apricot = { name: 'apricot', hex: '#c97a45' }, camel = { name: 'camel', hex: '#a9875a' },
  black = { name: 'iron black', hex: '#1d1612' }, teal = { name: 'teal', hex: '#2f5c5a' }, cream = { name: 'cream', hex: '#efe3c6' }, aubergine = { name: 'aubergine', hex: '#47253a' };
export const PALETTES: Palette[] = [
  { id: 'heriz', name: 'Heriz', line: 'Brick madder, deep indigo and ivory: the strong village colours of Persian Azerbaijan.', dyes: [madder, indigo, ivory, sky, weld, walnut, apricot], roles: [0, 1, 1, 3, 2, 5, 1] },
  { id: 'mamluk', name: 'Cairo Mamluk', line: 'Wine red, leaf green and sky blue, the three colours of the old Cairo court carpets.', dyes: [deepMadder, green, sky, ivory, weld, black], roles: [0, 1, 2, 4, 3, 5, 1] },
  { id: 'kazak', name: 'Kazak', line: 'Bright madder, green and ivory with a strong yellow, the Caucasian village palette.', dyes: [madder, green, ivory, weld, indigo, walnut], roles: [0, 4, 1, 3, 2, 5, 4] },
  { id: 'tabriz', name: 'Tabriz', line: 'Ivory grounds with rose, navy and soft green: the city workshops of Tabriz.', dyes: [cream, rose, indigo, green, camel, walnut], roles: [0, 4, 2, 1, 0, 5, 2] },
  { id: 'konya', name: 'Konya', line: 'Apricot, madder and weld yellow, the warm Seljuk colours of central Anatolia.', dyes: [apricot, madder, weld, indigo, ivory, walnut], roles: [1, 0, 3, 2, 4, 5, 3] },
  { id: 'baluch', name: 'Baluch', line: 'Dark wine, aubergine and camel with touches of white: the tent rugs of the eastern deserts.', dyes: [deepMadder, aubergine, camel, ivory, indigo, black], roles: [1, 0, 2, 0, 3, 5, 4] },
  { id: 'bakhtiari', name: 'Bakhtiari garden', line: 'Teal, madder and weld for the garden panels of the Bakhtiari tribes.', dyes: [teal, madder, weld, ivory, indigo, walnut], roles: [0, 1, 1, 2, 3, 5, 4] },
  { id: 'nile', name: 'Nile village', line: 'Camel, madder and indigo on undyed wool, as the Delta weavers dye it.', dyes: [camel, madder, indigo, ivory, walnut], roles: [0, 3, 1, 2, 3, 4, 1] },
  { id: 'saffron', name: 'Saffron and blue', line: 'Saffron grounds with indigo and madder: a rich man\'s order.', dyes: [saffron, indigo, madder, ivory, sky, walnut], roles: [0, 3, 1, 2, 3, 5, 1] },
];

// ---------- the loom: sizes, knots and wool ----------
export interface Size { id: string; name: string; cm: string; cols: number; rows: number; area: number; days: number }
export const SIZES: Size[] = [
  { id: 'mat', name: 'Small mat', cm: '120 × 80 cm', cols: 96, rows: 64, area: 1, days: 2 },
  { id: 'rug', name: 'Rug', cm: '190 × 125 cm', cols: 126, rows: 84, area: 2.4, days: 4 },
  { id: 'runner', name: 'Runner', cm: '300 × 85 cm', cols: 168, rows: 56, area: 2.6, days: 4 },
  { id: 'carpet', name: 'Room carpet', cm: '300 × 200 cm', cols: 150, rows: 100, area: 6, days: 8 },
];
export interface Knots { id: string; name: string; line: string; scale: number; price: number; days: number; kpsi: string }
export const KNOTS: Knots[] = [
  { id: 'coarse', name: 'Village knot', line: 'About 60 knots to the inch. Sturdy, and quick on the loom.', scale: 0.8, price: 1, days: 1, kpsi: 'about 60 knots per sq. inch' },
  { id: 'medium', name: 'Town knot', line: 'About 120 knots to the inch: crisper figures.', scale: 1, price: 1.9, days: 1.6, kpsi: 'about 120 knots per sq. inch' },
  { id: 'fine', name: 'City knot', line: 'About 250 knots to the inch: fine curves, and many weeks of work.', scale: 1.3, price: 3.8, days: 2.6, kpsi: 'about 250 knots per sq. inch' },
];
export interface Wool { id: string; name: string; line: string; price: number; sheen: number; traits: ('wool' | 'silk' | 'soft' | 'hardwearing' | 'fragile')[] }
export const WOOL: Wool[] = [
  { id: 'village', name: 'Village wool', line: 'Hand-spun, hard-wearing, a little uneven.', price: 1, sheen: 0, traits: ['wool', 'hardwearing'] },
  { id: 'kork', name: 'Kork wool', line: 'The soft winter wool from a lamb\'s neck: soft, with a glow.', price: 1.7, sheen: 0.4, traits: ['wool', 'soft'] },
  { id: 'silk', name: 'Silk highlights', line: 'Wool pile with the light colours in silk: they shine when the carpet is turned.', price: 2.8, sheen: 0.7, traits: ['wool', 'silk', 'soft'] },
  { id: 'allsilk', name: 'All silk', line: 'Silk on silk. A palace order, and delicate.', price: 6, sheen: 1, traits: ['silk', 'soft', 'fragile'] },
];
/** base labour and wool for a village-knot village-wool rug of area 1, in piastres */
export const BASE_COST = 45;
export const DEAR_DYE = 8; // each costly dye used, per unit of area
