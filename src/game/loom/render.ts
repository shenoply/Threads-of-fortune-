// Weaving a design on screen. First the knot map: every knot of the carpet gets one dye, place by
// place (the edge, the guard stripes, the border, the field and what stands on it), each figure
// outlined the way weavers do it. Then the picture: each knot drawn as a small tuft of pile with its
// own light and shade, the slight shifts of colour from one batch of dyed wool to the next (abrash),
// a shine on silk, the flat-woven ends and the cotton fringe.
import type { Design } from './design';
import { colours, parts } from './design';
import type { Band, Layer, Motif, Role } from './patterns';
import { MEDALLION } from './patterns';

type Slot = 'ground' | 'ground2' | 'main' | 'accent' | 'light' | 'border' | 'outline';
const SLOTS: Slot[] = ['ground', 'ground2', 'main', 'accent', 'light', 'border', 'outline'];
interface Map { w: number; h: number; k: Uint8Array }

/** draw a motif's layers into a box of the map; `pal` turns its roles into slots */
function stamp(m: Map, motif: { layers: Layer[] }, x0: number, y0: number, bw: number, bh: number, pal: Record<Role, Slot | null>, keep?: (x: number, y: number) => boolean, turn = false) {
  const W = Math.round(bw), H = Math.round(bh);
  if (W < 3 || H < 3) return;
  const role = new Int8Array(W * H).fill(-1);
  for (const L of motif.layers) {
    const inside = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = ((i + 0.5) / W) * 2 - 1, v = ((j + 0.5) / H) * 2 - 1;
      if (turn ? L.shape(v, u) : L.shape(u, v)) inside[j * W + i] = 1;
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (!inside[j * W + i]) continue;
      let r: number = L.role;
      if (L.edge) {
        const out = (a: number, b: number) => a < 0 || b < 0 || a >= W || b >= H || !inside[b * W + a];
        if (out(i - 1, j) || out(i + 1, j) || out(i, j - 1) || out(i, j + 1)) r = 3;
      }
      role[j * W + i] = r;
    }
  }
  const ox = Math.round(x0), oy = Math.round(y0);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const r = role[j * W + i] as Role | -1;
    if (r < 0) continue;
    const slot = pal[r as Role];
    if (!slot) continue;
    const x = ox + i, y = oy + j;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
    if (keep && !keep(x, y)) continue;
    m.k[y * m.w + x] = SLOTS.indexOf(slot);
  }
}

/** a band round a rectangle: along each side, the repeat fitted so the corners meet cleanly */
function bandAround(m: Map, band: Band, x0: number, y0: number, x1: number, y1: number, depth: number, pal: Record<Role, Slot | null>, corner?: Motif) {
  const len = (n: number) => Math.max(1, Math.round(n / Math.max(4, depth * 1.7)));
  const nx = len(x1 - x0 - 2 * depth), ny = len(y1 - y0 - 2 * depth);
  const put = (x: number, y: number, r: Role) => { const s = pal[r]; if (s) m.k[y * m.w + x] = SLOTS.indexOf(s); };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const dl = x - x0, dr = x1 - 1 - x, dt = y - y0, db = y1 - 1 - y;
    const d = Math.min(dl, dr, dt, db);
    if (d >= depth) continue;
    const inCornerX = dl < depth || dr < depth, inCornerY = dt < depth || db < depth;
    if (inCornerX && inCornerY) {
      if (corner) continue; // drawn below as a block
      put(x, y, band.at(0, d / depth));
      continue;
    }
    const t = (d + 0.5) / depth;
    if (dt === d || db === d) put(x, y, band.at(((x - x0 - depth) / (x1 - x0 - 2 * depth)) * nx, dt === d ? t : t));
    else put(x, y, band.at(((y - y0 - depth) / (y1 - y0 - 2 * depth)) * ny, t));
  }
  if (corner) for (const [cx, cy] of [[x0, y0], [x1 - depth, y0], [x0, y1 - depth], [x1 - depth, y1 - depth]]) {
    for (let y = cy; y < cy + depth; y++) for (let x = cx; x < cx + depth; x++) put(x, y, 0);
    stamp(m, corner, cx, cy, depth, depth, pal);
  }
}

const CORNER: Motif = { id: 'corner', name: '', line: '', cost: 0, layers: [
  { shape: (u, v) => Math.abs(u) + Math.abs(v) <= 0.8, role: 2, edge: true }, { shape: (u, v) => Math.abs(u) + Math.abs(v) <= 0.36, role: 4 }] };

// the little things weavers scatter in every gap: stars, dots, small diamonds and rosettes
const TINY: string[][] = [
  ['..a..', '.aba.', 'abbba', '.aba.', '..a..'],
  ['a...a', '.a.a.', '..b..', '.a.a.', 'a...a'],
  ['.a.a.', 'aabaa', '.bbb.', 'aabaa', '.a.a.'],
  ['.a.', 'aba', '.a.'],
  ['..a..', '..a..', 'aabaa', '..a..', '..a..'],
  ['.aaa.', 'a.b.a', 'abbba', 'a.b.a', '.aaa.'],
];
/** fill the empty stretches of one colour inside an area with small figures, without touching anything */
function sprinkle(m: Map, x0: number, y0: number, x1: number, y1: number, slot: Slot, inks: [Slot, Slot][], seed: number, gap = 2, where?: (x: number, y: number) => boolean, fs = 1) {
  const r = rand(seed), want = SLOTS.indexOf(slot);
  gap *= fs;
  const free = (x: number, y: number, w: number, h: number) => {
    for (let yy = y - gap; yy < y + h + gap; yy++) for (let xx = x - gap; xx < x + w + gap; xx++) {
      if (xx < x0 || yy < y0 || xx >= x1 || yy >= y1 || m.k[yy * m.w + xx] !== want || (where && !where(xx, yy))) return false;
    }
    return true;
  };
  let n = 0;
  for (let y = y0 + gap; y < y1 - 3; y += 2 * fs) for (let x = x0 + gap + ((y >> 1) % 2); x < x1 - 3; x += 2 * fs) {
    const t = TINY[(Math.floor(r() * TINY.length) + n) % TINY.length];
    const h = t.length * fs, w = t[0].length * fs;
    if (!free(x, y, w, h)) continue;
    const [a, b] = inks[n % inks.length];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = t[Math.floor(j / fs)][Math.floor(i / fs)];
      if (ch === '.') continue;
      m.k[(y + j) * m.w + x + i] = SLOTS.indexOf(ch === 'a' ? a : b);
    }
    n++;
  }
}

export function knotMap(d: Design): Map {
  const p = parts(d);
  const sc = p.knots.scale;
  const w = Math.round(p.size.cols * sc), h = Math.round(p.size.rows * sc);
  const m: Map = { w, h, k: new Uint8Array(w * h) }; // 0 = ground
  const fill = (x0: number, y0: number, x1: number, y1: number, s: Slot) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m.k[y * w + x] = SLOTS.indexOf(s); };
  const gw = Math.max(2, Math.round(2.4 * sc)), bw = Math.max(7, Math.round(h * 0.11));
  // the edge, the outer guard, the border, the inner guard
  fill(0, 0, w, h, 'outline');
  fill(1, 1, w - 1, h - 1, 'ground2');
  bandAround(m, p.guard, 1, 1, w - 1, h - 1, gw, { 0: 'ground2', 1: 'accent', 2: 'accent', 3: 'outline', 4: 'light' });
  const b0 = 1 + gw;
  fill(b0, b0, w - b0, h - b0, 'border');
  bandAround(m, p.band, b0, b0, w - b0, h - b0, bw, { 0: 'border', 1: 'main', 2: 'accent', 3: 'outline', 4: 'light' }, CORNER);
  const g0 = b0 + bw;
  // a dark line either side of the border, then the inner guard
  fill(g0, g0, w - g0, h - g0, 'ground2');
  bandAround(m, p.guard, g0, g0, w - g0, h - g0, gw, { 0: 'ground2', 1: 'accent', 2: 'accent', 3: 'outline', 4: 'light' });
  const f0x = g0 + gw, f0y = g0 + gw;
  fill(f0x, f0y, w - f0x, h - f0y, 'outline');
  const fx0 = f0x + 1, fy0 = f0y + 1, fx1 = w - f0x - 1, fy1 = h - f0y - 1;
  fill(fx0, fy0, fx1, fy1, 'ground');
  const FW = fx1 - fx0, FH = fy1 - fy0;
  const FS = Math.max(1, Math.round(FH / 46)); // the small fillers grow with the knot count
  const inField = (x: number, y: number) => x >= fx0 && x < fx1 && y >= fy0 && y < fy1;
  const figA: Record<Role, Slot | null> = { 0: null, 1: 'main', 2: 'accent', 3: 'outline', 4: 'light' };
  const figB: Record<Role, Slot | null> = { 0: null, 1: 'accent', 2: 'main', 3: 'outline', 4: 'light' };
  const rowsFor = (n: number) => Math.max(2, n);
  const nRows = rowsFor(p.size.id === 'carpet' ? 4 : p.size.id === 'rug' ? 3 : 2);

  if (p.layout.id === 'allover' || p.layout.id === 'medallion') {
    const med = p.layout.id === 'medallion' ? p.medallion : MEDALLION[0];
    const hasMed = med.id !== 'none';
    // the medallion, its pendants reaching along the length, and the four corner pieces
    const mh = Math.round(FH * 0.8), mw = Math.round(Math.min(FW * 0.56, mh * 1.45));
    const mx = fx0 + Math.round((FW - mw) / 2), my = fy0 + Math.round((FH - mh) / 2);
    const medMask = (x: number, y: number) => {
      if (!hasMed) return false;
      const u = ((x - mx + 0.5) / mw) * 2 - 1, v = ((y - my + 0.5) / mh) * 2 - 1;
      return med.layers[0].shape(u * 0.96, v * 0.96) || (Math.abs(u) <= 1.1 && Math.abs(v) <= 0.3 && med.layers[0].shape(u * 0.9, v));
    };
    const sw = Math.round(FW * 0.26), sh = Math.round(FH * 0.42);
    const spandrel = (x: number, y: number) => {
      if (!hasMed) return false;
      const dx = Math.min(x - fx0, fx1 - 1 - x) / sw, dy = Math.min(y - fy0, fy1 - 1 - y) / sh;
      // a stepped quarter: the weaver's corner piece
      return dx + dy <= 1 && dx < 1 && dy < 1;
    };
    if (hasMed) {
      for (let y = fy0; y < fy1; y++) for (let x = fx0; x < fx1; x++) if (spandrel(x, y)) m.k[y * w + x] = SLOTS.indexOf('ground2');
      // outline the corner pieces
      for (let y = fy0; y < fy1; y++) for (let x = fx0; x < fx1; x++) if (spandrel(x, y) && (!spandrel(x + 1, y) || !spandrel(x - 1, y) || !spandrel(x, y + 1) || !spandrel(x, y - 1)) && inField(x + 1, y) && inField(x - 1, y) && inField(x, y + 1) && inField(x, y - 1)) m.k[y * w + x] = SLOTS.indexOf('outline');
    }
    // the small figures: rows across the field, every other row half a step along
    const cs = Math.max(hasMed ? 10 : 7, Math.floor(FH / (hasMed ? nRows + 2 : nRows)));
    const nc = Math.max(1, Math.round(FW / cs));
    const cw = FW / nc, rh = FH / Math.round(FH / cs);
    const nr = Math.round(FH / cs);
    for (let r = 0; r < nr; r++) {
      const off = r % 2 ? cw / 2 : 0;
      for (let c = -1; c <= nc; c++) {
        const x = fx0 + c * cw + off, y = fy0 + r * rh;
        if (x + cw * 0.5 < fx0 || x + cw * 0.5 > fx1) continue;
        const box = hasMed ? 0.94 : 0.88;
        const bx = x + cw * (1 - box) / 2, by = y + rh * (1 - box) / 2;
        // keep figures whole: none cut by the medallion or the corner pieces
        let clash = false;
        if (hasMed) for (let yy = Math.round(by) - 1; yy < by + rh * box + 1 && !clash; yy++) for (let xx = Math.round(bx) - 1; xx < bx + cw * box + 1; xx++) if (medMask(xx, yy) || spandrel(xx, yy)) { clash = true; break; }
        if (clash) continue;
        if (bx < fx0 - 0.5 || bx + cw * box > fx1 + 0.5) continue;
        stamp(m, p.field, bx, by, Math.min(cw, rh) * box, rh * box, (r + c) % 2 ? figB : figA, inField);
      }
    }
    if (hasMed) {
      stamp(m, med, mx, my, mw, mh, figA, inField);
      // little hooks all round the medallion's edge, as the village weavers do
      const OUTL = SLOTS.indexOf('outline'), GRD = SLOTS.indexOf('ground');
      const hooked: number[] = [];
      for (let y = my - 2; y < my + mh + 2; y++) for (let x = mx - 2; x < mx + mw + 2; x++) {
        if (!inField(x, y) || m.k[y * w + x] !== GRD) continue;
        const nb = [m.k[y * w + x - 1], m.k[y * w + x + 1], m.k[(y - 1) * w + x], m.k[(y + 1) * w + x]];
        if (nb.includes(OUTL) && medMask(x + 1, y) !== medMask(x - 1, y) || nb.includes(OUTL) && medMask(x, y + 1) !== medMask(x, y - 1)) if ((x + y) % 3 === 0) hooked.push(y * w + x);
      }
      for (const i of hooked) m.k[i] = OUTL;
      sprinkle(m, mx, my, mx + mw, my + mh, 'main', [['light', 'accent'], ['accent', 'outline'], ['outline', 'light']], 7, 1, undefined, FS);
      // a small figure in each corner piece
      const s2 = Math.round(Math.min(sw, sh) * 0.62);
      for (const [cx, cy] of [[fx0 + 1, fy0 + 1], [fx1 - 1 - s2, fy0 + 1], [fx0 + 1, fy1 - 1 - s2], [fx1 - 1 - s2, fy1 - 1 - s2]]) stamp(m, p.field, cx, cy, s2, s2, figB, (x, y) => spandrel(x, y) && inField(x, y));
    }
  } else if (p.layout.id === 'prayer') {
    // the niche: a stepped arch, its point towards one end, a light ground outside it
    const halfH = FH / 2, cy = fy0 + halfH, arch = FW * 0.3;
    const inNiche = (x: number, y: number) => { const q = Math.min(0.999, Math.abs(y + 0.5 - cy) / halfH); return (x - fx0) >= arch * (1 - Math.sqrt(1 - q * q)) + 2 && x < fx1; };
    for (let y = fy0; y < fy1; y++) for (let x = fx0; x < fx1; x++) {
      if (!inNiche(x, y)) m.k[y * w + x] = SLOTS.indexOf('ground2');
      else if (!inNiche(x - 1, y) || !inNiche(x, y - 1) || !inNiche(x, y + 1)) m.k[y * w + x] = SLOTS.indexOf('outline');
    }
    // the lamp below the arch, then a column of figures down the niche
    const ls = Math.round(FH * 0.42);
    stamp(m, p.field, fx0 + arch * 0.55, cy - ls / 2, ls, ls, figA, (x, y) => inNiche(x - 1, y) && inField(x, y), true);
    const cs = Math.round(FH / nRows);
    for (let x = fx0 + arch + ls * 0.4; x + cs * 0.8 < fx1; x += cs) for (let r = 0; r < nRows; r++) stamp(m, p.field, x, fy0 + r * (FH / nRows) + (FH / nRows - cs * 0.8) / 2, cs * 0.8, cs * 0.8, r % 2 ? figB : figA, inField, true);
    // little light figures in the spandrels
    const ss = Math.round(arch * 0.34);
    for (const yy of [fy0 + 2, fy1 - ss - 2]) stamp(m, CORNER, fx0 + 2, yy, ss, ss, { 0: null, 1: 'main', 2: 'main', 3: 'outline', 4: 'light' }, (x, y) => !inNiche(x, y));
  } else {
    // bands across the field, each with its own row of figures, a thin stripe between
    const cs = Math.max(8, Math.round(FH / nRows));
    const n = Math.max(3, Math.round(FW / (cs * 1.05)));
    const bwid = FW / n;
    for (let b = 0; b < n; b++) {
      const x0 = Math.round(fx0 + b * bwid), x1 = Math.round(fx0 + (b + 1) * bwid);
      const g: Slot = b % 3 === 1 ? 'ground2' : b % 3 === 2 ? 'border' : 'ground';
      fill(x0, fy0, x1, fy1, g);
      if (b > 0) { fill(x0, fy0, x0 + 1, fy1, 'outline'); fill(x0 + 1, fy0, x0 + 2, fy1, 'light'); }
      const inner = x1 - x0 - 2, size = Math.min(inner * 0.84, cs * 0.86);
      for (let r = 0; r < nRows; r++) stamp(m, p.field, x0 + 2 + (inner - size) / 2, fy0 + r * (FH / nRows) + (FH / nRows - size) / 2, size, size, (b + r) % 2 ? figB : figA, inField);
    }
  }
  // every empty stretch of the field and the corner pieces gets its small figures
  sprinkle(m, fx0, fy0, fx1, fy1, 'ground', [['light', 'accent'], ['accent', 'main'], ['main', 'light']], 11, 2, undefined, FS);
  sprinkle(m, fx0, fy0, fx1, fy1, 'ground2', [['main', 'light'], ['accent', 'main']], 13, 1, undefined, FS);
  return m;
}

// ---------- the picture ----------
function rgb(hex: string) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rand(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const cache = new Map<string, string>();
export const designKey = (d: Design) => JSON.stringify({ ...d, name: '' });

/** the woven carpet as a picture, `width` pixels across like the game's carpet photographs
 *  (lengthways across the screen, fringe at the ends) */
export function renderDesign(d: Design, width = 820, quality = 0.9): string {
  const key = designKey(d) + '|' + width;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const m = knotMap(d);
  const col = colours(d);
  const pal = SLOTS.map((s) => rgb(col[s].hex));
  const sheen = parts(d).wool.sheen;
  // the fringe is a set share of the picture, the carpet the rest; a knot is k pixels, not always whole
  const fr = Math.round(width * 0.03), end = Math.max(2, Math.round(width * 0.006));
  const k = (width - 2 * (fr + end)) / m.w;
  const W = width, H = Math.round(m.h * k) + 4;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b130c';
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  const px = img.data;
  const r = rand(hash(key));
  // abrash: each weft row (across the carpet) a touch lighter or darker, a little differently for each dye
  const abrash = SLOTS.map(() => { const a = new Float32Array(m.w); let v = 0; for (let x = 0; x < m.w; x++) { v = v * 0.92 + (r() - 0.5) * 0.035; a[x] = 1 + v; } return a; });
  const jitter = new Float32Array(m.w * m.h).map(() => 1 + (r() - 0.5) * 0.07);
  // the selvedge wanders by a pixel or so
  const wob = new Float32Array(m.w).map((_, i) => Math.sin(i * 0.31) * 0.6 + (r() - 0.5) * 0.8);
  const ox = fr + end, bodyW = Math.round(m.w * k);
  // slow patches of light and shade over the whole carpet, as on one that has lain on a floor
  const GX = 7, GY = 5, mott = new Float32Array((GX + 1) * (GY + 1)).map(() => 1 + (r() - 0.5) * 0.12);
  const mottAt = (fx: number, fy: number) => { const X = fx * GX, Y = fy * GY, i = Math.min(GX - 1, Math.floor(X)), j = Math.min(GY - 1, Math.floor(Y)), a = X - i, b = Y - j;
    const q = (ii: number, jj: number) => mott[jj * (GX + 1) + ii]; return (q(i, j) * (1 - a) + q(i + 1, j) * a) * (1 - b) + (q(i, j + 1) * (1 - a) + q(i + 1, j + 1) * a) * b; };
  for (let y = 0; y < H; y++) for (let x = ox; x < ox + bodyW; x++) {
    const kx = Math.min(m.w - 1, Math.floor((x - ox) / k));
    const yy = y - 2 - wob[kx] * k / 6;
    const ky = Math.floor(yy / k);
    if (ky < 0 || ky >= m.h) continue;
    const s = m.k[ky * m.w + kx];
    const [R, G, B] = pal[s];
    // one tuft: lit from above-left, a soft shadow where it meets the next
    const a = (x - ox) / k - kx, b = yy / k - ky;
    let f = 1.06 - 0.12 * (b - 0.35) * (b - 0.35) - 0.1 * (a - 0.4) * (a - 0.4) - (b > 0.82 ? 0.06 : 0) - (a > 0.85 ? 0.04 : 0);
    f *= abrash[s][kx] * jitter[ky * m.w + kx] * mottAt((x - ox) / bodyW, y / H) * (0.965 + r() * 0.07);
    // the edge cords are worn a little darker
    if (ky === 0 || ky === m.h - 1) f *= 0.86;
    // silk catches the light along the carpet
    if (sheen && s !== 6) f *= 1 + sheen * 0.1 * Math.max(0, Math.sin(((x - ox) / bodyW) * Math.PI)) * (s === 4 ? 1.8 : 0.8);
    // aged dye: a little greyed and warmed, like the carpets in the photographs
    const L = 0.3 * R + 0.59 * G + 0.11 * B;
    const i = (y * W + x) * 4;
    px[i] = Math.min(255, (R * 0.8 + L * 0.2) * f * 0.99); px[i + 1] = Math.min(255, (G * 0.8 + L * 0.2) * f * 0.96); px[i + 2] = Math.min(255, (B * 0.8 + L * 0.2) * f * 0.89); px[i + 3] = 255;
  }
  // the flat-woven ends, in the ground colour with a stripe, then the fringe of cotton warps
  const endCol = pal[SLOTS.indexOf('ground2')], fringe = [232, 220, 196];
  for (const side of [0, 1]) {
    const x0 = side ? ox + bodyW : fr, x1 = side ? x0 + end : ox;
    for (let y = 2; y < H - 2; y++) for (let x = x0; x < x1; x++) {
      const f = 0.82 + ((y >> 1) % 2) * 0.06 + (r() - 0.5) * 0.05;
      const i = (y * W + x) * 4;
      px[i] = endCol[0] * f; px[i + 1] = endCol[1] * f; px[i + 2] = endCol[2] * f; px[i + 3] = 255;
    }
    const fx = side ? ox + bodyW + end : 0;
    const step = Math.max(2, Math.round(k * 1.1));
    for (let y = 3; y < H - 3; y += step) {
      const len = fr * (0.72 + r() * 0.28), bend = (r() - 0.5) * 2.2;
      for (let t = 0; t < len; t++) {
        const xx = side ? fx + t : fx + fr - 1 - t;
        const yc = y + bend * (t / fr) * (t / fr) * 3;
        for (let dy = -1; dy <= 1; dy++) {
          const yi = Math.round(yc + dy);
          if (yi < 0 || yi >= H || xx < 0 || xx >= W) continue;
          const f = (dy === 0 ? 1 : 0.78) * (0.86 + 0.14 * (1 - t / len)) * (0.93 + r() * 0.07);
          const i = (yi * W + xx) * 4;
          px[i] = fringe[0] * f; px[i + 1] = fringe[1] * f; px[i + 2] = fringe[2] * f; px[i + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  // the pile softens the knot steps a little, as wool does
  if ('filter' in g && k > 2.2) { g.save(); g.globalAlpha = 0.55; g.filter = `blur(${Math.min(1.4, k * 0.2).toFixed(2)}px)`; g.drawImage(c, 0, 0); g.restore(); }
  // a little warmth and a soft fall-off of light towards the corners
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  v.addColorStop(0, 'rgba(255,240,210,0.05)');
  v.addColorStop(1, 'rgba(20,10,0,0.22)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  const url = c.toDataURL('image/jpeg', quality);
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}
