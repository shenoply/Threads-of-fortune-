// Vintage-atlas renderer for the world map. Real coastlines, rivers and lakes (Natural Earth),
// drawn fresh at every zoom so the map stays sharp.
import geo from '../../data/geo.json';
import { RANGES, DESERTS, FERTILE, PALMS, LABELS, RAILWAYS, PROJ, proj } from '../../data/mapFeatures';
import { MASK_W, MASK_H } from '../../data/landmask';
import { RAIL_LINKS } from '../../data/world';
import { MAP_W, MAP_H, paint, settlementById, routeLeg } from './world';

type Ring = number[];

// ---------- the painted travel map ----------
// Two copies of the same painting: the small one (half a megabyte) arrives at once on a phone, so the
// painted map is up straight away; the sharp one (4.5 MB, for zooming in) replaces it when it lands.
// Until either has loaded, the engraved map is drawn.
let artImg: HTMLImageElement | null = null;
let artSmall: HTMLImageElement | null = null;
let artReady = false;
let smallReady = false;
let artFailed = false;
const artListeners = new Set<() => void>();
/** The painting, once it has loaded (the sharp copy when it is in, the small one before that). */
export function paintedMap(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!artSmall) {
    artSmall = new Image();
    artSmall.decoding = 'async';
    artSmall.onload = () => { smallReady = true; if (!artReady) artListeners.forEach((f) => f()); };
    artSmall.src = 'art/world/travel-map-original.jpg';
  }
  if (!artImg) {
    artImg = new Image();
    artImg.decoding = 'async';
    artImg.onload = () => {
      // a phone that cannot hold the big picture decoded keeps the small one
      artImg!.decode?.().then(() => { artReady = true; artListeners.forEach((f) => f()); }).catch(() => { artFailed = true; });
      if (!artImg!.decode) { artReady = true; artListeners.forEach((f) => f()); }
    };
    artImg.onerror = () => { artFailed = true; artListeners.forEach((f) => f()); };
    // phones get a 3072-wide copy: the full 4608 one is more than some phones will decode for a canvas
    const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    artImg.src = phone ? 'art/world/travel-map-3k.jpg' : 'art/world/travel-map.jpg';
  }
  return artReady ? artImg : smallReady ? artSmall : null;
}
export function onPaintedMap(f: () => void) { artListeners.add(f); return () => { artListeners.delete(f); }; }

let railCache: { x: number; y: number }[][] | null = null;
function paintedRails() {
  if (railCache) return railCache;
  railCache = RAIL_LINKS.map((l) => {
    const A = settlementById(l.a), B = settlementById(l.b);
    return routeLeg({ x: A.x, y: A.y }, { x: B.x, y: B.y }, 'rail');
  });
  return railCache;
}

const PAINT_LABELS: { text: string; x: number; y: number; kind: 'region' | 'sea' | 'minor' | 'river'; size?: number; rot?: number }[] = [
  { text: 'EGYPT', x: 360, y: 930, kind: 'region', size: 1.25 },
  { text: 'SINAI', x: 790, y: 880, kind: 'region', size: 0.9 },
  { text: 'PALESTINE', x: 690, y: 660, kind: 'region', size: 0.7 },
  { text: 'TRANSJORDAN', x: 900, y: 660, kind: 'region', size: 0.75 },
  { text: 'SYRIA', x: 1010, y: 430, kind: 'region', size: 1 },
  { text: 'ANATOLIA', x: 470, y: 185, kind: 'region', size: 1.1 },
  { text: 'IRAQ', x: 1290, y: 560, kind: 'region', size: 1.1 },
  { text: 'Mediterranean Sea', x: 330, y: 470, kind: 'sea', size: 1.1 },
  { text: 'Red Sea', x: 720, y: 960, kind: 'sea', size: 0.9, rot: 58 },
  { text: 'Black Sea', x: 560, y: 40, kind: 'sea', size: 0.9 },
  { text: 'Syrian Desert', x: 1090, y: 620, kind: 'minor', size: 1.1 },
  { text: 'Nile', x: 342, y: 880, kind: 'river', rot: 72 },
  { text: 'Euphrates', x: 1150, y: 395, kind: 'river', rot: 28 },
];
const ringPath = (rings: Ring[]) => {
  const p = new Path2D();
  for (const r of rings) {
    p.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]);
    p.closePath();
  }
  return p;
};

let cache: null | {
  land: Path2D; holes: Path2D; lakes: Path2D; rivers: Path2D;
  grain: HTMLCanvasElement; stipple: { x: number; y: number; r: number }[];
  ranges: { x: number; y: number; size: number; seed: number }[];
  rails: { x: number; y: number }[][];
  rangeLines: { pts: { x: number; y: number }[]; size: number }[];
} = null;

function rnd(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build() {
  if (cache) return cache;
  const land = ringPath(geo.land as Ring[]);
  const holes = ringPath(geo.landHoles as Ring[]);
  const lakes = ringPath(geo.lakes as Ring[]);
  const rivers = ringPath(geo.rivers as Ring[]);
  // screen-space paper grain
  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const g = grain.getContext('2d')!;
  const r = rnd(11);
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 128 + (r() - 0.5) * 60;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.94;
    img.data[i * 4 + 2] = v * 0.82;
    img.data[i * 4 + 3] = 30;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(110,80,40,0.08)';
  for (let i = 0; i < 70; i++) {
    g.beginPath();
    const x = r() * 256, y = r() * 256, a = r() * Math.PI;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18);
    g.stroke();
  }
  // desert stipple in world coordinates
  const stipple: { x: number; y: number; r: number }[] = [];
  const rs = rnd(5);
  for (const d of DESERTS) {
    const c = proj(d.lon, d.lat), R = d.r * PROJ.k;
    for (let i = 0; i < d.r * 900; i++) {
      const a = rs() * Math.PI * 2, rr = Math.sqrt(rs()) * R;
      stipple.push({ x: c.x + Math.cos(a) * rr * 1.2, y: c.y + Math.sin(a) * rr * 0.8, r: 0.25 + rs() * 0.45 });
    }
  }
  // mountain peaks along each range
  const ranges: { x: number; y: number; size: number; seed: number }[] = [];
  let seed = 1;
  for (const rg of RANGES) {
    const pts = rg.pts.map(([lo, la]) => proj(lo, la));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(len / (8.5 * rg.size)));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        ranges.push({ x: a.x + (b.x - a.x) * t + (seed % 3 - 1) * 1.5, y: a.y + (b.y - a.y) * t + ((seed * 7) % 3 - 1) * 1.8, size: rg.size * (0.75 + ((seed * 13) % 10) / 20), seed: seed++ });
      }
    }
  }
  ranges.sort((a, b) => a.y - b.y);
  const rails = RAILWAYS.map((l) => l.map(([lo, la]) => proj(lo, la)));
  const rangeLines = RANGES.map((rg) => ({ pts: rg.pts.map(([lo, la]) => proj(lo, la)), size: rg.size }));
  cache = { land, holes, lakes, rivers, grain, stipple, ranges, rails, rangeLines };
  return cache;
}

export interface View { w: number; h: number; s: number; tx: number; ty: number; dpr: number }

const SEA = '#a4b9af';
const SEA_DEEP = '#93aba1';
const PAPER = '#ead8ac';
const INK = '#4a3421';

export function drawWorld(ctx: CanvasRenderingContext2D, v: View, opts: { fog?: HTMLCanvasElement | null; roads?: { pts: { x: number; y: number }[]; major: boolean }[]; labels?: boolean } = {}) {
  const c = build();
  const { w, h, s, tx, ty, dpr } = v;
  const screen = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const world = () => ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty);
  const X = (x: number) => x * s + tx, Y = (y: number) => y * s + ty;
  const zf = Math.max(0.75, Math.min(1.7, s / 1.6));

  const art = paintedMap();
  if (!art && !artFailed) {
    // the painting is still loading: show plain parchment rather than flashing the old engraved map
    screen();
    ctx.fillStyle = '#2a1d12';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (art) {
    // The painted travel map: the whole region in one picture.
    screen();
    ctx.fillStyle = '#2a1d12';
    ctx.fillRect(0, 0, w, h);
    world();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art, 0, 0, MAP_W, MAP_H);
    screen();
  } else {
  // sea
  screen();
  const sg = ctx.createLinearGradient(0, 0, w, h);
  sg.addColorStop(0, SEA_DEEP);
  sg.addColorStop(1, SEA);
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h);

  // engraved ripple bands around every coast
  world();
  ctx.lineJoin = 'round';
  const bands: [number, string][] = [[26, 'rgba(60,92,86,0.07)'], [19, 'rgba(196,212,202,0.35)'], [13, 'rgba(60,92,86,0.09)'], [8, 'rgba(196,212,202,0.45)'], [4, 'rgba(60,92,86,0.12)']];
  for (const [px, col] of bands) {
    ctx.lineWidth = px / s;
    ctx.strokeStyle = col;
    ctx.stroke(c.land);
    ctx.stroke(c.lakes);
  }

  // land
  ctx.fillStyle = PAPER;
  ctx.fill(c.land);
  ctx.save();
  ctx.clip(c.land);
  // deserts: warm sand wash and stipple
  for (const d of DESERTS) {
    const p = proj(d.lon, d.lat), R = d.r * PROJ.k;
    const rg = ctx.createRadialGradient(p.x, p.y, R * 0.1, p.x, p.y, R * 1.15);
    rg.addColorStop(0, 'rgba(222,178,108,0.5)');
    rg.addColorStop(1, 'rgba(222,178,108,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(p.x - R * 1.3, p.y - R * 1.3, R * 2.6, R * 2.6);
  }
  if (s > 0.9) {
    ctx.fillStyle = 'rgba(140,98,50,0.32)';
    const x0 = -tx / s, y0 = -ty / s, x1 = x0 + w / s, y1 = y0 + h / s;
    const step = s < 1.6 ? 3 : 1;
    for (let i = 0; i < c.stipple.length; i += step) {
      const d = c.stipple[i];
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      ctx.fillRect(d.x, d.y, d.r * 1.3 / Math.max(1, s / 2.5), d.r * 1.3 / Math.max(1, s / 2.5));
    }
  }
  // fertile land: the Nile, the Delta, the Levant coast, the Euphrates
  ctx.lineCap = 'round';
  for (const f of FERTILE) {
    const pts = f.pts.map(([lo, la]) => proj(lo, la));
    for (const [mul, a] of [[1.6, 0.1], [1.0, 0.16], [0.55, 0.22]] as const) {
      ctx.strokeStyle = `rgba(104,128,62,${a})`;
      ctx.lineWidth = f.w * PROJ.k * mul;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  // soft inner shadow along the coast
  ctx.lineWidth = 7 / s;
  ctx.strokeStyle = 'rgba(120,86,44,0.14)';
  ctx.stroke(c.land);
  ctx.restore();
  ctx.fillStyle = SEA;
  ctx.fill(c.holes);

  // lakes and rivers
  ctx.fillStyle = '#9cb4ab';
  ctx.fill(c.lakes);
  ctx.lineWidth = 0.8 / s;
  ctx.strokeStyle = INK;
  ctx.stroke(c.lakes);
  ctx.fillStyle = '#5f8599';
  ctx.fill(c.rivers);
  ctx.lineWidth = Math.max(0.35, 0.9 / s);
  ctx.strokeStyle = 'rgba(80,120,145,0.9)';
  ctx.stroke(c.rivers);

  // coastline ink
  ctx.lineWidth = 1.25 / s;
  ctx.strokeStyle = INK;
  ctx.stroke(c.land);

  // paper grain over everything
  screen();
  const pat = ctx.createPattern(c.grain, 'repeat');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  }

  // mountains: a soft brown hill-shade under each range, then inked peaks lit from the west
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const rl of c.rangeLines) {
    for (const [wd, a] of [[26, 0.07], [16, 0.09], [8, 0.1]] as [number, number][]) {
      ctx.strokeStyle = `rgba(122,84,44,${a})`;
      ctx.lineWidth = wd * rl.size * Math.pow(s, 0.85);
      ctx.beginPath();
      rl.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.stroke();
    }
  }
  for (const m of c.ranges) {
    const x = X(m.x), y = Y(m.y);
    if (x < -30 || y < -30 || x > w + 30 || y > h + 30) continue;
    const sz = Math.max(5.5, Math.min(14, 5 * m.size * Math.pow(s, 0.6)));
    ctx.beginPath();
    ctx.moveTo(x - sz, y + sz * 0.45);
    ctx.lineTo(x - sz * 0.1, y - sz * 0.75);
    ctx.lineTo(x + sz, y + sz * 0.45);
    ctx.closePath();
    ctx.fillStyle = '#e2cc98';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - sz * 0.1, y - sz * 0.75);
    ctx.lineTo(x + sz, y + sz * 0.45);
    ctx.lineTo(x + sz * 0.1, y + sz * 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(120,86,48,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,52,33,0.85)';
    ctx.lineWidth = Math.max(0.7, sz / 9);
    ctx.beginPath();
    ctx.moveTo(x - sz, y + sz * 0.45);
    ctx.lineTo(x - sz * 0.1, y - sz * 0.75);
    ctx.lineTo(x + sz, y + sz * 0.45);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, sz / 14);
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      ctx.beginPath();
      ctx.moveTo(x - sz * 0.1 + (sz * 1.1) * t * 0.5, y - sz * 0.75 + sz * 1.2 * t * 0.5);
      ctx.lineTo(x + sz * 0.1 + sz * 0.4 * t, y + sz * 0.45);
      ctx.stroke();
    }
  }

  // palms at oases and along the Nile
  if (s > 1.1) {
    for (const [lo, la] of PALMS) {
      const p = proj(lo, la);
      const x = X(p.x), y = Y(p.y);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const z = Math.min(12, 3.4 * s);
      ctx.strokeStyle = 'rgba(70,86,40,0.9)';
      ctx.lineWidth = Math.max(0.8, z / 7);
      ctx.beginPath();
      ctx.moveTo(x, y + z * 0.6);
      ctx.quadraticCurveTo(x + z * 0.1, y, x, y - z * 0.4);
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.55;
        ctx.beginPath();
        ctx.moveTo(x, y - z * 0.4);
        ctx.quadraticCurveTo(x + Math.cos(a) * z * 0.4, y - z * 0.4 + Math.sin(a) * z * 0.25, x + Math.cos(a) * z * 0.7, y - z * 0.4 + Math.sin(a) * z * 0.5 + z * 0.2);
        ctx.stroke();
      }
    }
  }

  }

  // caravan roads: a worn track, dark bed with a pale beaten centre, so it reads apart from the
  // railways' black and white. A trunk route between major places (city, port or home) draws
  // heavier than a local track to a village, oasis, monastery or camp, the way a real atlas would.
  if (opts.roads) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const major of [false, true]) {
      // a minor track to a village/oasis/monastery/camp fades into the paper; a trunk route between
      // real cities and ports stays dark and gets a brighter beaten centre, so it reads as "the way" first
      const wMul = major ? 1.35 : 0.5;
      const aMul = major ? 1 : 0.6;
      for (const [style, width, dash] of [[`rgba(84,46,18,${0.55 * aMul})`, 3.2 * wMul, []], [`rgba(238,214,160,${0.85 * aMul})`, 1.2 * wMul, [5, 4]]] as [string, number, number[]][]) {
        ctx.setLineDash(dash);
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        for (const r of opts.roads) {
          if (r.major !== major) continue;
          ctx.beginPath();
          r.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
  }
  // railways: the classic black-and-white line
  for (const line of art ? paintedRails() : c.rails) {
    ctx.beginPath();
    line.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.strokeStyle = '#2a1d12';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#efe3c4';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // terra incognita
  if (opts.fog) {
    world();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
    ctx.drawImage(opts.fog, 0, 0, MAP_W, MAP_H);
    screen();
  }

  // labels
  if (opts.labels !== false) {
    for (const l of art ? PAINT_LABELS : LABELS) {
      const p = 'x' in l ? paint(l.x, l.y) : proj(l.lon, l.lat);
      const x = X(p.x), y = Y(p.y);
      if (x < -200 || y < -60 || x > w + 200 || y > h + 60) continue;
      const size = (l.kind === 'region' ? 15 : l.kind === 'sea' ? 15 : l.kind === 'river' ? 11 : 11) * (l.size ?? 1) * zf;
      ctx.save();
      ctx.translate(x, y);
      if (l.rot) ctx.rotate((l.rot * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (l.kind === 'region') {
        ctx.font = `600 ${size}px Cinzel, Georgia, serif`;
        spaced(ctx, l.text, size * 0.35, 'rgba(92,62,34,0.62)');
      } else if (l.kind === 'sea') {
        ctx.font = `italic 500 ${size}px Alegreya, Georgia, serif`;
        spaced(ctx, l.text, size * 0.12, 'rgba(34,64,74,0.72)');
      } else if (l.kind === 'river') {
        ctx.font = `italic ${size}px Alegreya, Georgia, serif`;
        spaced(ctx, l.text, size * 0.08, 'rgba(46,82,110,0.85)');
      } else {
        ctx.font = `italic ${size}px Alegreya, Georgia, serif`;
        spaced(ctx, l.text, size * 0.18, 'rgba(92,62,34,0.6)');
      }
      ctx.restore();
    }
    // compass rose and cartouche, anchored in the sea
    if (!art) {
      const cp = proj(30.4, 33.5);
      compass(ctx, X(cp.x), Y(cp.y), Math.max(22, Math.min(60, 26 * zf)));
      const ct = proj(27.1, 32.35);
      cartouche(ctx, X(ct.x), Y(ct.y), zf);
    }
  }

  // vignette
  screen();
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(60,35,15,0)');
  vg.addColorStop(1, 'rgba(60,35,15,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function spaced(ctx: CanvasRenderingContext2D, text: string, gap: number, color: string) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let x = -total / 2;
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(236,222,186,0.55)';
  [...text].forEach((ch, i) => {
    ctx.strokeText(ch, x, 0);
    x += widths[i] + gap;
  });
  x = -total / 2;
  ctx.fillStyle = color;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, 0);
    x += widths[i] + gap;
  });
}

function compass(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(74,52,33,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const long = i % 2 === 0;
    const L = long ? r : r * 0.55, Wd = r * (long ? 0.14 : 0.1);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -L);
    ctx.lineTo(Wd, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? '#8e2a1c' : 'rgba(74,52,33,0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -L);
    ctx.lineTo(-Wd, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = '#efe3c4';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.font = `600 ${Math.max(9, r * 0.32)}px Cinzel, Georgia, serif`;
  ctx.fillStyle = 'rgba(74,52,33,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, -r - r * 0.22);
  ctx.restore();
}

function cartouche(ctx: CanvasRenderingContext2D, x: number, y: number, zf: number) {
  const W = 170 * zf, H = 56 * zf;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(236,222,186,0.9)';
  ctx.strokeStyle = 'rgba(74,52,33,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(-W / 2, -H / 2, W, H);
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a3421';
  ctx.font = `700 ${13 * zf}px Cinzel, Georgia, serif`;
  ctx.fillText('EGYPT & THE LEVANT', 0, -H * 0.14);
  ctx.font = `italic ${10 * zf}px Alegreya, Georgia, serif`;
  ctx.fillText('Trade roads and railways, 1925', 0, H * 0.2);
  // scale bar: 100 miles
  const px100 = (160.9 / 111) * PROJ.k; // 100 miles in degrees of latitude, in world px
  void px100;
  ctx.restore();
}

/** Scale bar length in screen px for 100 miles at the current zoom. */
export const milesPx = (s: number) => (paintedMap() ? 104 : (160.9 / 111) * PROJ.k) * s;

/** Fog texture: unexplored land shown as blank parchment. */
export function fogCanvas(fog: string) {
  const c = document.createElement('canvas');
  c.width = MASK_W;
  c.height = MASK_H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(MASK_W, MASK_H);
  for (let i = 0; i < MASK_W * MASK_H; i++) {
    img.data[i * 4] = 226;
    img.data[i * 4 + 1] = 208;
    img.data[i * 4 + 2] = 168;
    img.data[i * 4 + 3] = fog.charCodeAt(i) === 49 ? 0 : 150;
  }
  g.putImageData(img, 0, 0);
  // blur edges into cloud-like margins
  const big = document.createElement('canvas');
  big.width = MASK_W * 4;
  big.height = MASK_H * 4;
  const b = big.getContext('2d')!;
  b.filter = 'blur(6px)';
  b.drawImage(c, 0, 0, big.width, big.height);
  return big;
}
