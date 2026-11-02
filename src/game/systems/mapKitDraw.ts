// The travel map's decorations: painted palms, trees, olives, peaks, hills, desert marks, fields and sea marks laid
// over the painting at the spots tools/build-mapkit.py chose (src/data/mapKitZones.ts). Each kind is drawn from its
// atlas in public/art/map/kit (tools/cut-sheets.py cuts the artist's sheets into them) once that atlas is in the
// folder, else from a restrained ink placeholder drawn here; the two can be mixed, sheet by sheet. No code change
// when the sheets arrive: the build lists the folder (vite.config.ts, virtual:map-art-files).
// The decorations are drawn back to front into cached tiles at a few fixed scales, so a redraw of the map only
// copies a handful of pictures. Zoomed out the map shows fewer of them and each a little larger; close in, all.
// With Map life on and the map close in, the trees and palms (which sway a very little) and the sea marks (which
// fade in and out) are drawn instead each frame on the life canvas (drawKitLive, components/World/MapLife.tsx).
import KIT from '../../data/mapKitSheets.json';
import { artFiles, onArtFiles } from '../../data/mapArt';

export interface KitKind { kind: string; sheet: string; group: string; h: number; aspect: number; sway: boolean; sea: boolean }
export const KIT_KINDS: KitKind[] = KIT.kinds as KitKind[];
export const KIT_SHEETS = Object.keys(KIT.sheets);
const NK = KIT_KINDS.length;
const SWAY = KIT_KINDS.map((k) => k.sway);
const SEA = KIT_KINDS.map((k) => k.sea);
const KH = KIT_KINDS.map((k) => k.h);

// ---------- zoom: how many, how large ----------
/** the finest level of detail shown at scale s (map px per unit): 0 far out, 1 middle, 2 close */
export const lodFor = (s: number) => (s < 1.15 ? 0 : s < 2 ? 1 : 2);
/** how much larger than its ground size an item is drawn at scale s: up to half as large again far out */
export const boostFor = (s: number) => Math.max(1, Math.min(1.5, Math.pow(2 / s, 0.45)));
/** from this scale up, with Map life on, the swaying and fading kinds are drawn live */
export const LIVE_S = 3.2;
export const liveAt = (s: number, life: boolean) => life && s >= LIVE_S;
/** live kinds: the trees and palms and the sea marks */
export const isLiveKind = (k: number) => SWAY[k] || SEA[k];

// ---------- the zones ----------
export interface Zones { n: number; kind: Uint8Array; lod: Uint8Array; x: Float32Array; y: Float32Array; size: Float32Array; variant: Uint8Array; bins: Map<number, number[]> }
const BIN = 50;
const binKey = (bx: number, by: number) => by * 1000 + bx;
/** The packed zones (8 bytes an item, base64) as arrays, with a coarse grid of bins for finding items by place. */
export function decodeZones(b64: string): Zones {
  const bin = atob(b64);
  const n = Math.floor(bin.length / 8);
  const z: Zones = { n, kind: new Uint8Array(n), lod: new Uint8Array(n), x: new Float32Array(n), y: new Float32Array(n), size: new Float32Array(n), variant: new Uint8Array(n), bins: new Map() };
  const b = (i: number) => bin.charCodeAt(i);
  for (let i = 0; i < n; i++) {
    const o = i * 8;
    z.kind[i] = b(o); z.lod[i] = b(o + 1);
    z.x[i] = (b(o + 2) | (b(o + 3) << 8)) / 10; z.y[i] = (b(o + 4) | (b(o + 5) << 8)) / 10;
    z.size[i] = b(o + 6) / 64; z.variant[i] = b(o + 7);
    const k = binKey(Math.floor(z.x[i] / BIN), Math.floor(z.y[i] / BIN));
    let l = z.bins.get(k);
    if (!l) z.bins.set(k, (l = []));
    l.push(i);
  }
  return z;
}
/** the items whose base lies in [x0, x1] x [y0, y1], in drawing order (back to front) */
export function itemsIn(z: Zones, x0: number, y0: number, x1: number, y1: number): number[] {
  const out: number[] = [];
  for (let by = Math.floor(y0 / BIN); by <= Math.floor(y1 / BIN); by++)
    for (let bx = Math.floor(x0 / BIN); bx <= Math.floor(x1 / BIN); bx++) {
      const l = z.bins.get(binKey(bx, by));
      if (!l) continue;
      for (const i of l) if (z.x[i] >= x0 && z.x[i] <= x1 && z.y[i] >= y0 && z.y[i] <= y1) out.push(i);
    }
  return out.sort((a, b) => a - b);
}
let zones: Zones | null = null, zonesAsked = false;
const listeners = new Set<() => void>();
export const onMapKit = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const changed = () => { scaled.clear(); queue = []; tiles.clear(); listeners.forEach((f) => f()); };
/** The zones, once their module has loaded (asked for on the first call; a separate download, not at startup). */
export function kitZones(): Zones | null {
  if (!zonesAsked && typeof window !== 'undefined') {
    zonesAsked = true;
    import('../../data/mapKitZones').then((m) => { zones = decodeZones(m.KIT_ITEMS); changed(); }).catch(() => { zonesAsked = false; });
  }
  return zones;
}

// ---------- the atlases ----------
interface Frame { x: number; y: number; w: number; h: number; ax: number; ay: number; ih: number; g: string }
interface Atlas { img: HTMLImageElement; frames: Frame[]; groups: Record<string, number[]> }
const atlases = new Map<string, Atlas | null>();
/** which sheets have an atlas in public/art/map/kit (its image and its frames) */
export function kitPresent(list: readonly string[] = artFiles()): Record<string, boolean> {
  const lc = new Set(list.map((f) => f.toLowerCase()));
  return Object.fromEntries(KIT_SHEETS.map((s) => [s, lc.has(`kit/${s}.json`) && (lc.has(`kit/${s}.webp`) || lc.has(`kit/${s}.png`))]));
}
function loadAtlases() {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const have = kitPresent();
  const list = artFiles().map((f) => f.toLowerCase());
  for (const s of KIT_SHEETS) {
    if (!have[s]) { if (atlases.has(s)) { atlases.delete(s); changed(); } continue; }
    if (atlases.has(s)) continue;
    atlases.set(s, null);
    const img = list.includes(`kit/${s}.webp`) ? `art/map/kit/${s}.webp` : `art/map/kit/${s}.png`;
    fetch(`art/map/kit/${s}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(s)))).then((meta: { frames: Frame[]; groups: Record<string, number[]> }) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { atlases.set(s, { img: im, frames: meta.frames, groups: meta.groups }); changed(); };
      im.src = img;
    }).catch(() => { /* the placeholders stay */ });
  }
}
onArtFiles(loadAtlases);

// ---------- the sprites: an atlas frame, or a placeholder ----------
interface Sprite { img: CanvasImageSource; sx: number; sy: number; sw: number; sh: number; ax: number; ay: number; ih: number; id?: string }
const PH = 3; // placeholder variants per kind
const phCache = new Map<string, Sprite>();
function spriteFor(k: number, variant: number): Sprite {
  const kk = KIT_KINDS[k];
  const a = atlases.get(kk.sheet);
  if (a) {
    const g = a.groups[kk.group];
    if (g && g.length) {
      const fi = g[variant % g.length], f = a.frames[fi];
      return { img: a.img, sx: f.x, sy: f.y, sw: f.w, sh: f.h, ax: f.ax, ay: f.ay, ih: f.ih, id: `${kk.sheet}#${fi}` };
    }
  }
  const v = variant % PH, key = `${k}:${v}`;
  let sp = phCache.get(key);
  if (!sp) phCache.set(key, (sp = { ...placeholder(kk.kind, v), id: `p${key}` }));
  return sp;
}

// The placeholders: restrained ink-and-wash marks in the old atlas manner, lit from the north-west.
const INK = 'rgba(58,40,24,0.9)';
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
function placeholder(kind: string, v: number): Sprite {
  const big = kind === 'peak-big';
  const peak = kind.startsWith('peak');
  const H = big ? 160 : peak ? 72 : kind.startsWith('hill') ? 48 : 48;
  const aspect = KIT_KINDS.find((k) => k.kind === kind)!.aspect;
  const W = Math.ceil(H * aspect * 1.25) + 8, CH = H + 10;
  const c = document.createElement('canvas');
  c.width = W; c.height = CH;
  const g = c.getContext('2d')!;
  const r = rnd(kind.length * 977 + v * 131 + 7);
  const cx = W / 2, by = H + 2;   // base centre
  g.lineJoin = 'round'; g.lineCap = 'round';
  const shadow = (w: number) => { g.fillStyle = 'rgba(60,40,20,0.16)'; g.beginPath(); g.ellipse(cx + w * 0.18, by + 1, w * 0.55, Math.max(1.5, w * 0.12), 0, 0, Math.PI * 2); g.fill(); };
  if (peak) {
    const w = H * aspect * 0.5, top = 2 + (big ? 0 : r() * H * 0.12), px = cx - w * 0.08 + (r() - 0.5) * w * 0.15;
    const sh = kind === 'peak-snow' || big;
    const body = kind === 'peak-granite' ? '#b4775a' : sh ? '#b9a58a' : '#bfa37a';
    const dark = kind === 'peak-granite' ? '#7e4a35' : sh ? '#7d6a58' : '#86684a';
    shadow(w * 1.6);
    // the lit west face, then the shaded east face
    const sL = { x: cx - w + r() * w * 0.12, y: by }, sR = { x: cx + w - r() * w * 0.12, y: by };
    const shoulder = { x: px + w * (0.35 + r() * 0.15), y: top + (by - top) * (0.35 + r() * 0.15) };
    g.beginPath(); g.moveTo(sL.x, sL.y); g.lineTo(px, top); g.lineTo(shoulder.x, shoulder.y); g.lineTo(sR.x, sR.y); g.closePath();
    g.fillStyle = body; g.fill();
    g.beginPath(); g.moveTo(px, top); g.lineTo(shoulder.x, shoulder.y); g.lineTo(sR.x, sR.y); g.lineTo(px + w * 0.12, by); g.closePath();
    g.fillStyle = dark; g.fill();
    if (sh) {
      g.beginPath(); g.moveTo(px, top);
      g.lineTo(px - w * 0.3, top + (by - top) * 0.3); g.lineTo(px - w * 0.14, top + (by - top) * 0.26); g.lineTo(px - w * 0.02, top + (by - top) * 0.36);
      g.lineTo(px + w * 0.12, top + (by - top) * 0.27); g.lineTo(shoulder.x - w * 0.05, shoulder.y - (by - top) * 0.05); g.closePath();
      g.fillStyle = 'rgba(250,248,240,0.95)'; g.fill();
    }
    // hatching down the shaded face
    g.strokeStyle = 'rgba(58,40,24,0.35)'; g.lineWidth = Math.max(0.8, H / 70);
    for (let i = 1; i < 4; i++) { const t = i / 4; g.beginPath(); g.moveTo(px + (shoulder.x - px) * t, top + (shoulder.y - top) * t); g.lineTo(px + w * (0.15 + 0.2 * t), by - 1); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = Math.max(1, H / 48);
    g.beginPath(); g.moveTo(sL.x, sL.y); g.lineTo(px, top); g.lineTo(shoulder.x, shoulder.y); g.lineTo(sR.x, sR.y); g.stroke();
  } else if (kind.startsWith('hill')) {
    // a low mound in wash, its east side shaded, a few strokes of hatching: the old atlas hill sign
    const w = H * aspect * 0.5, top = by - H * (0.42 + r() * 0.15), peakX = cx - w * (0.1 + r() * 0.15);
    const path = () => { g.beginPath(); g.moveTo(cx - w, by); g.bezierCurveTo(cx - w * 0.55, by - (by - top) * 0.2, peakX - w * 0.25, top, peakX, top); g.bezierCurveTo(peakX + w * 0.3, top, cx + w * 0.6, by - (by - top) * 0.25, cx + w, by); };
    path(); g.closePath();
    g.fillStyle = kind === 'hill-green' ? 'rgba(118,132,76,0.42)' : 'rgba(170,128,76,0.38)'; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(80,56,30,0.22)'; g.fillRect(peakX, top - 2, w * 2, H);
    g.strokeStyle = 'rgba(70,48,28,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const x = peakX + w * (0.12 + i * 0.2); g.beginPath(); g.moveTo(x, top + (by - top) * (0.15 + i * 0.12)); g.lineTo(x + w * 0.08, by); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(58,40,24,0.55)'; g.lineWidth = 1.2; path(); g.stroke();
  } else if (kind === 'palm') {
    const lean = (r() - 0.5) * H * 0.2, tx = cx + lean, ty = by - H * 0.72;
    shadow(H * 0.45);
    g.strokeStyle = 'rgba(92,64,38,0.95)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(cx, by); g.quadraticCurveTo(cx + lean * 0.2, by - H * 0.4, tx, ty); g.stroke();
    g.strokeStyle = 'rgba(52,78,38,0.95)'; g.lineWidth = 2;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const ang = Math.PI + (i / (n - 1)) * Math.PI + (r() - 0.5) * 0.2, L = H * (0.26 + r() * 0.08);
      const ex = tx + Math.cos(ang) * L, ey = ty + Math.sin(ang) * L * 0.55 + L * 0.35;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(ang) * L * 0.6, ty + Math.sin(ang) * L * 0.6, ex, ey); g.stroke();
    }
  } else if (kind === 'broadleaf' || kind === 'olive' || kind === 'clump') {
    const crowns = kind === 'clump' ? [[-0.42, 0.1, 0.75], [0.38, 0.08, 0.8], [0, -0.08, 1]] : [[0, 0, 1]];
    const R0 = kind === 'olive' ? H * 0.3 : kind === 'clump' ? H * 0.26 : H * 0.32;
    shadow(R0 * (kind === 'clump' ? 4.2 : 2.2));
    for (const [dx, dy, k] of crowns) {
      const R = R0 * k * (0.9 + r() * 0.2), x = cx + dx * H * 0.9 * (kind === 'clump' ? 1.3 : 1), y = by - R * 1.15 - H * 0.12 + dy * H;
      g.strokeStyle = 'rgba(92,64,38,0.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, by + dy * H * 0.2); g.lineTo(x, y + R * 0.5); g.stroke();
      const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
      gr.addColorStop(0, kind === 'olive' ? '#b8bc94' : '#93a465'); gr.addColorStop(1, kind === 'olive' ? '#7d8560' : '#556a35');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke();
    }
  } else if (kind === 'conifer') {
    const w = H * 0.22;
    shadow(w * 2);
    g.beginPath(); g.moveTo(cx, by - H * 0.98); g.quadraticCurveTo(cx - w * 1.1, by - H * 0.3, cx - w, by - H * 0.12); g.lineTo(cx + w, by - H * 0.12); g.quadraticCurveTo(cx + w * 1.1, by - H * 0.3, cx, by - H * 0.98);
    const gr = g.createLinearGradient(cx - w, 0, cx + w, 0); gr.addColorStop(0, '#5f7a48'); gr.addColorStop(1, '#2f4a2a');
    g.fillStyle = gr; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = 'rgba(92,64,38,0.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - H * 0.12); g.stroke();
  } else if (kind === 'dune') {
    const w = H * aspect * 0.5;
    g.strokeStyle = 'rgba(120,80,40,0.55)'; g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const y = by - H * (0.15 + i * 0.28), off = (r() - 0.5) * w * 0.3, ww = w * (0.95 - i * 0.18);
      g.beginPath(); g.moveTo(cx - ww + off, y + H * 0.08); g.quadraticCurveTo(cx + off, y - H * 0.25, cx + ww + off, y + H * 0.08); g.stroke();
    }
  } else if (kind === 'outcrop') {
    const w = H * aspect * 0.42;
    shadow(w * 1.6);
    g.beginPath(); g.moveTo(cx - w, by); g.lineTo(cx - w * 0.6, by - H * 0.55); g.lineTo(cx - w * 0.1, by - H * (0.75 + r() * 0.2)); g.lineTo(cx + w * 0.45, by - H * 0.5); g.lineTo(cx + w, by); g.closePath();
    g.fillStyle = '#a88a66'; g.fill();
    g.save(); g.clip(); g.fillStyle = 'rgba(60,40,25,0.35)'; g.fillRect(cx, 0, w, CH); g.restore();
    g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  } else if (kind === 'scrub') {
    for (let i = 0; i < 4; i++) {
      const x = cx + (r() - 0.5) * H * 0.9, y = by - H * 0.2 - r() * H * 0.25, R = H * (0.12 + r() * 0.08);
      g.fillStyle = 'rgba(110,104,58,0.85)'; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(58,40,24,0.6)'; g.lineWidth = 0.9; g.stroke();
    }
  } else if (kind === 'field') {
    const w = H * aspect * 0.5, sk = (r() - 0.5) * w * 0.3;
    g.beginPath(); g.moveTo(cx - w + sk, by - H * 0.9); g.lineTo(cx + w * 0.85 + sk, by - H * 0.9); g.lineTo(cx + w - sk, by); g.lineTo(cx - w * 0.85 - sk, by); g.closePath();
    g.fillStyle = v === 1 ? 'rgba(170,166,92,0.55)' : 'rgba(120,140,70,0.55)'; g.fill();
    g.strokeStyle = 'rgba(80,70,36,0.45)'; g.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const t = i / 5; g.beginPath(); g.moveTo(cx - w + sk + (-sk * 2 + w * 0.15) * t, by - H * 0.9 + H * 0.9 * t); g.lineTo(cx + w * 0.85 + sk + (w * 0.15 - sk * 2) * t, by - H * 0.9 + H * 0.9 * t); g.stroke(); }
    g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(cx - w + sk, by - H * 0.9); g.lineTo(cx + w * 0.85 + sk, by - H * 0.9); g.lineTo(cx + w - sk, by); g.lineTo(cx - w * 0.85 - sk, by); g.closePath(); g.stroke();
  } else if (kind === 'wave') {
    const w = H * aspect * 0.42;
    g.strokeStyle = 'rgba(240,244,236,0.8)'; g.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const x0 = cx - w + i * w * 0.7, y = by - H * 0.3 - i * H * 0.25;
      g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + w * 0.4, y - H * 0.5, x0 + w * 0.8, y); g.stroke();
    }
  } else if (kind === 'shallow') {
    const w = H * aspect * 0.5;
    const gr = g.createRadialGradient(cx, by - H * 0.4, 1, cx, by - H * 0.4, w);
    gr.addColorStop(0, 'rgba(170,215,205,0.45)'); gr.addColorStop(1, 'rgba(170,215,205,0)');
    g.fillStyle = gr; g.save(); g.translate(cx, by - H * 0.4); g.scale(1, (H * 0.45) / w); g.beginPath(); g.arc(0, 0, w, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // the item's height above its base, as the atlases give it (the solid part, without the shadow)
  const ih = kind === 'dune' || kind === 'field' || kind === 'wave' || kind === 'shallow' ? H : peak ? by - 2 : H;
  return { img: c, sx: 0, sy: 0, sw: W, sh: CH, ax: cx, ay: by, ih };
}

/** A sprite shrunk once to about `hpx` pixels tall (in steps of a sixth of an octave), with a good filter: the tiles
 *  and the live layer then copy it at nearly its own size, which is cheap, instead of shrinking a large picture each
 *  time, which is not (on a phone, many times over). */
const scaled = new Map<string, { c: CanvasImageSource; k: number; sp: Sprite }>();
function scaledSprite(kind: number, variant: number, hpx: number) {
  const sp = spriteFor(kind, variant);
  const step = Math.round(Math.log2(hpx / sp.ih) * 6);
  const key = `${sp.id}:${step}`;
  let e = scaled.get(key);
  if (!e) {
    const k = Math.pow(2, step / 6);
    if (k >= 0.9) e = { c: sp.img, k, sp };          // drawn at about its size or larger: no shrinking to do
    else {
      const w = Math.max(1, Math.ceil(sp.sw * k)), h = Math.max(1, Math.ceil(sp.sh * k));
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = c.getContext('2d') as CanvasRenderingContext2D;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(sp.img, sp.sx, sp.sy, sp.sw, sp.sh, 0, 0, sp.sw * k, sp.sh * k);
      e = { c, k, sp: { ...sp, img: c, sx: 0, sy: 0, sw: sp.sw * k, sh: sp.sh * k, ax: sp.ax * k, ay: sp.ay * k, ih: sp.ih * k } };
    }
    if (scaled.size > 4000) scaled.clear();
    scaled.set(key, e);
  }
  return e.sp;
}
/** draw item i with its base at (x, y) in the context's current pixels, `hpx` pixels tall */
function drawItem(g: CanvasRenderingContext2D, z: Zones, i: number, x: number, y: number, hpx: number) {
  const sp = scaledSprite(z.kind[i], z.variant[i], hpx);
  const k = hpx / sp.ih;
  g.drawImage(sp.img, sp.sx, sp.sy, sp.sw, sp.sh, x - sp.ax * k, y - sp.ay * k, sp.sw * k, sp.sh * k);
}

// ---------- the cached tiles ----------
const TILE = 384;
const tiles = new Map<string, { c: CanvasImageSource; h?: CanvasImageSource; used: number }>();
/** how far an item can reach from its base, in map units (the very large peak, drawn half as large again far out) */
const REACH_UP = 95, REACH_SIDE = 90;
const perf = { blitMs: 0, built: 0, buildMs: 0, drawMs: 0, draws: 0, liveMs: 0, liveFrames: 0, liveItems: 0, tiles: 0 };
if (typeof window !== 'undefined') Object.assign(window, { __mapKit: perf });

function buildTile(z: Zones, b: number, sB: number, tx: number, ty: number, live: boolean): HTMLCanvasElement {
  const c = Object.assign(document.createElement('canvas'), { width: TILE, height: TILE });
  const g = c.getContext('2d')!;
  const T = TILE / b;
  const lod = lodFor(sB), boost = boostFor(sB);
  const ids = itemsIn(z, tx * T - REACH_SIDE, ty * T, (tx + 1) * T + REACH_SIDE, (ty + 1) * T + REACH_UP);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
  for (const i of ids) {
    if (z.lod[i] > lod) continue;
    if (live && isLiveKind(z.kind[i])) continue;
    const hpx = KH[z.kind[i]] * z.size[i] * boost * b;
    if (hpx < 2.5) continue;
    drawItem(g, z, i, z.x[i] * b - tx * TILE, z.y[i] * b - ty * TILE, hpx);
  }
  return c;
}

export interface KitView { w: number; h: number; s: number; tx: number; ty: number; dpr: number }
/** Draw the decorations under the camera onto the map canvas (in its screen units, after the painting, before the
 *  roads, fog and names). `life`: Map life is on (close in, the live kinds are left to drawKitLive). */
export function drawKit(ctx: CanvasRenderingContext2D, v: KitView, life: boolean) {
  const z = kitZones();
  if (!z || typeof document === 'undefined') return;
  const t0 = performance.now();
  // the tiles are drawn at the sharp resolution whatever this frame's, in half-octave steps of scale
  const sharp = Math.min(2, window.devicePixelRatio || 1);
  const b = Math.pow(2, Math.round(Math.log2(v.s * sharp) * 2) / 2);
  const sB = b / sharp;
  const live = liveAt(sB, life);
  const T = TILE / b;
  const x0 = -v.tx / v.s, y0 = -v.ty / v.s, x1 = x0 + v.w / v.s, y1 = y0 + v.h / v.s;
  const now = performance.now();
  const moving = v.dpr * 1.4 < sharp;
  if (moving) movingAt = now;
  let n = 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  // bilinear: the tiles are drawn at about their own size, and a better filter costs a phone dear when they are not
  ctx.imageSmoothingQuality = 'low';
  const snap = (p: number) => Math.round(p * v.dpr) / v.dpr;
  const want: Job[] = [];
  const tx0 = Math.floor(x0 / T), tx1 = Math.floor(x1 / T), ty0 = Math.floor(y0 / T), ty1 = Math.floor(y1 / T);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || ty < 0 || tx * T > 2000 || ty * T > 1214) continue;
      const key = `${b}:${tx}:${ty}:${live ? 1 : 0}`;
      let t = tiles.get(key);
      // a few tiles are made now; the rest a moment later, between frames, and the map drawn again then
      // (none while the map moves: a drag is never held up; the ring round the screen is usually ready anyway)
      if (!t && !moving && performance.now() - t0 < BUILD_BUDGET) t = make(z, { key, b, sB, tx, ty, live, seen: true }, now);
      if (!t) { want.push({ key, b, sB, tx, ty, live, seen: true }); continue; }
      t.used = now;
      const L = snap(tx * T * v.s + v.tx), Tp = snap(ty * T * v.s + v.ty), R = snap((tx + 1) * T * v.s + v.tx), B = snap((ty + 1) * T * v.s + v.ty);
      const b0 = performance.now();
      // a frame drawn at a lower resolution than the tiles (the map on the move) copies a half-size copy of each, made once
      ctx.drawImage(v.dpr * 1.4 < sharp ? half(t) : t.c, L, Tp, R - L, B - Tp);
      perf.blitMs += performance.now() - b0;
      n++;
    }
  ctx.restore();
  // and, once the view has settled, the ring of tiles round the screen, made between frames, so a drag finds them ready
  const viewKey = `${b}:${live}`;
  if (viewKey !== lastView) { lastView = viewKey; settledAt = now; }
  if (now - settledAt > 1500) for (let ty = ty0 - 1; ty <= ty1 + 1; ty++)
    for (let tx = tx0 - 1; tx <= tx1 + 1; tx++) {
      if (ty >= ty0 && ty <= ty1 && tx >= tx0 && tx <= tx1) continue;
      if (tx < 0 || ty < 0 || tx * T > 2000 || ty * T > 1214) continue;
      const key = `${b}:${tx}:${ty}:${live ? 1 : 0}`;
      if (!tiles.has(key)) want.push({ key, b, sB, tx, ty, live, seen: false });
    }
  queue = want;
  if (want.length) later();
  // keep the screen and its ring twice over (a zoom back, a pan back), the least recently drawn going first
  const ring = (tx1 - tx0 + 3) * (ty1 - ty0 + 3);
  cap = Math.max(48, ring * 2);
  evict();
  perf.tiles = tiles.size; perf.draws++; perf.drawMs += performance.now() - t0;
}
function half(t: { c: CanvasImageSource; h?: CanvasImageSource }) {
  if (!t.h) {
    const c = Object.assign(document.createElement('canvas'), { width: TILE / 2, height: TILE / 2 });
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    g.drawImage(t.c, 0, 0, TILE / 2, TILE / 2);
    t.h = c;
  }
  return t.h;
}
interface Job { key: string; b: number; sB: number; tx: number; ty: number; live: boolean; seen: boolean }
const BUILD_BUDGET = 6;
let queue: Job[] = [], cap = 32, timer = 0, lastView = '', settledAt = 0, movingAt = 0;
function make(z: Zones, j: Job, now: number) {
  const s0 = performance.now();
  const t: { c: HTMLCanvasElement; h?: CanvasImageSource; used: number } = { c: buildTile(z, j.b, j.sB, j.tx, j.ty, j.live), used: now };
  // on a sharp screen the moving map is drawn at half the resolution: its half-size copy made now, not mid-drag
  if (Math.min(2, window.devicePixelRatio || 1) > 1.4) half(t);
  tiles.set(j.key, t);
  perf.built++; perf.buildMs += performance.now() - s0;
  return t;
}
function evict() {
  if (tiles.size <= cap) return;
  const old = [...tiles.entries()].sort((a, c) => a[1].used - c[1].used);
  for (let i = 0; i < old.length - cap; i++) tiles.delete(old[i][0]);
}
/** make the waiting tiles in slices between frames; when one the screen wanted is in, ask for the map to be drawn again */
function later() {
  if (timer) return;
  // in the browser's idle time where it offers it (between frames, never holding one up), else in short slices
  const idle = typeof requestIdleCallback === 'function';
  const run = (dl?: IdleDeadline) => {
    timer = 0;
    const z = zones;
    if (!z) return;
    // the map on the move (drawn at the lower resolution a moment ago): leave the main thread to the drag
    if (performance.now() - movingAt < 350) { schedule(); return; }
    const t0 = performance.now();
    const more = () => (dl ? dl.timeRemaining() > 3 : performance.now() - t0 < 4);
    let shown = false;
    // one tile at a time (a tile is a few milliseconds on a phone): the frames keep coming between them
    while (queue.length && more()) {
      const j = queue.shift()!;
      if (tiles.has(j.key)) continue;
      make(z, j, j.seen ? performance.now() : performance.now() - 1);
      shown ||= j.seen;
      break;
    }
    if (shown) listeners.forEach((f) => f());
    if (queue.length) schedule();
  };
  const schedule = () => { timer = (idle ? requestIdleCallback(run, { timeout: 400 }) : window.setTimeout(run, 16)) as unknown as number; };
  schedule();
}

/** The live kinds under the camera, drawn each frame on the life canvas (close in, with Map life on): trees and palms
 *  sway a very little about their bases, each on its own beat; the sea marks fade in and out. `dim(x, y)` says how
 *  much of an item shows there (the unexplored country is veiled). */
export function drawKitLive(ctx: CanvasRenderingContext2D, cam: { tx: number; ty: number; s: number; w: number; h: number }, dpr: number, t: number, dim?: (x: number, y: number) => number) {
  const z = kitZones();
  if (!z) return 0;
  const sharp = Math.min(2, window.devicePixelRatio || 1);
  const b = Math.pow(2, Math.round(Math.log2(cam.s * sharp) * 2) / 2), sB = b / sharp;
  if (!liveAt(sB, true)) return 0;
  const t0 = performance.now();
  const s = cam.s, lod = lodFor(sB), boost = boostFor(sB);
  const x0 = -cam.tx / s, y0 = -cam.ty / s, x1 = x0 + cam.w / s, y1 = y0 + cam.h / s;
  const ids = itemsIn(z, x0 - 30, y0, x1 + 30, y1 + 40);
  let n = 0;
  for (const i of ids) {
    const k = z.kind[i];
    if (z.lod[i] > lod || !isLiveKind(k)) continue;
    const x = z.x[i] * s + cam.tx, y = z.y[i] * s + cam.ty;
    const hpx = KH[k] * z.size[i] * boost * s;
    const ph = z.variant[i] * 0.0245 + z.x[i] * 0.013;
    let a = dim ? dim(z.x[i], z.y[i]) : 1;
    if (SEA[k]) {
      a *= 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.45 + ph * 6));
      ctx.globalAlpha = a;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawItem(ctx, z, i, x, y, hpx);
    } else {
      // a skew about the base: the crown moves a pixel or so, the foot not at all
      const sk = Math.sin(t * (0.8 + (z.variant[i] % 7) * 0.05) + ph * 5) * 0.035;
      ctx.globalAlpha = a;
      ctx.setTransform(dpr, 0, -sk * dpr, dpr, dpr * x, dpr * y);
      drawItem(ctx, z, i, 0, 0, hpx);
    }
    n++;
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  perf.liveMs += performance.now() - t0; perf.liveFrames++; perf.liveItems = n;
  return n;
}
