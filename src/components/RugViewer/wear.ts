// A rug's condition, drawn on its picture: dirt as a warm grime with soft blotches, wear as a faded,
// thinner centre where feet went and the foundation begins to show, damage as a torn corner, a hole
// with its warps still across it, and bald patches where moth has eaten the pile. Painted once on a
// canvas over the rug's own picture, seeded by the rug, so the same rug always shows the same marks,
// and kept as a blob URL that any <img> or the inspector's carpet view can use.
import { useEffect, useState } from 'react';
import type { Condition } from '../../game/types';

export const WEARS: Condition[] = ['Dirty', 'Worn', 'Damaged'];
export const showsWear = (c?: Condition): c is Condition => !!c && WEARS.includes(c);

function seeded(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** where the rug lies in its picture: the box of pixels that are neither transparent nor the photograph's pale ground */
function rugBox(im: HTMLImageElement, W: number, H: number) {
  const s = 96, sh = Math.max(8, Math.round((s * H) / W));
  const c = document.createElement('canvas'); c.width = s; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(im, 0, 0, s, sh);
  const d = g.getImageData(0, 0, s, sh).data;
  const at = (x: number, y: number) => (y * s + x) * 4;
  const k = at(1, 1), bg = [d[k], d[k + 1], d[k + 2]], bgA = d[k + 3];
  let x0 = s, y0 = sh, x1 = 0, y1 = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < s; x++) {
    const i = at(x, y);
    const ground = d[i + 3] < 40 || (bgA > 200 && Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) < 36);
    if (ground) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 <= x0 || y1 <= y0) return { x: W * 0.06, y: H * 0.06, w: W * 0.88, h: H * 0.88 };
  // the fringe sits at the short ends: step in a little more along the length
  const fx = W >= H ? 0.035 : 0.01, fy = W >= H ? 0.01 : 0.035;
  const x = ((x0 / s) + fx) * W, y = ((y0 / sh) + fy) * H;
  return { x, y, w: ((x1 + 1) / s - fx) * W - x, h: ((y1 + 1) / sh - fy) * H - y };
}
type Box = ReturnType<typeof rugBox>;

/** an irregular round shape, for blotches, moth patches and holes */
function blobPts(cx: number, cy: number, r: number, rnd: () => number, pts = 11): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2, rr = r * (0.65 + rnd() * 0.5);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.75 + rnd() * 0.3)]);
  }
  return out;
}
function poly(g: CanvasRenderingContext2D, pts: [number, number][]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}
const scaled = (pts: [number, number][], cx: number, cy: number, f: number): [number, number][] => pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);

function grime(g: CanvasRenderingContext2D, b: Box, rnd: () => number, strength: number) {
  const m = Math.min(b.w, b.h);
  g.save();
  g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
  // a warm, even film of street dust
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(176,138,92,${0.42 * strength})`;
  g.fillRect(b.x, b.y, b.w, b.h);
  // dirt gathers at the edges and where it was walked on
  const edge = g.createRadialGradient(b.x + b.w / 2, b.y + b.h / 2, m * 0.35, b.x + b.w / 2, b.y + b.h / 2, Math.hypot(b.w, b.h) * 0.6);
  edge.addColorStop(0, 'rgba(120,88,52,0)');
  edge.addColorStop(1, `rgba(110,80,46,${0.38 * strength})`);
  g.fillStyle = edge; g.fillRect(b.x, b.y, b.w, b.h);
  // soft blotches: spilt coffee, a muddy boot, rain through a door
  const n = 7 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) {
    const cx = b.x + b.w * (0.08 + rnd() * 0.84), cy = b.y + b.h * (0.08 + rnd() * 0.84), r = m * (0.05 + rnd() * 0.11);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, `rgba(96,66,36,${(0.28 + rnd() * 0.2) * strength})`);
    gr.addColorStop(0.7, `rgba(110,78,44,${0.1 * strength})`);
    gr.addColorStop(1, 'rgba(120,88,52,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r, r * (0.6 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function fade(g: CanvasRenderingContext2D, b: Box, rnd: () => number, strength: number) {
  const along = b.w >= b.h; // warps run along the length
  g.save();
  g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
  // the colours tired all over
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = `rgba(128,128,128,${0.38 * strength})`;
  g.fillRect(b.x, b.y, b.w, b.h);
  // the centre, where the feet go, worn thin and pale
  const cx = b.x + b.w * (0.45 + rnd() * 0.1), cy = b.y + b.h * (0.45 + rnd() * 0.1);
  const rx = (along ? b.w * 0.4 : b.w * 0.32), ry = (along ? b.h * 0.32 : b.h * 0.4);
  g.globalCompositeOperation = 'screen';
  g.translate(cx, cy); g.scale(rx, ry);
  const pale = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  pale.addColorStop(0, `rgba(196,180,150,${0.52 * strength})`);
  pale.addColorStop(0.6, `rgba(180,165,138,${0.27 * strength})`);
  pale.addColorStop(1, 'rgba(160,150,130,0)');
  g.fillStyle = pale; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the knots' rows begin to show through the thin pile: faint lines across the warps
  const lines = document.createElement('canvas'); lines.width = g.canvas.width; lines.height = g.canvas.height;
  const l = lines.getContext('2d')!;
  l.strokeStyle = 'rgba(70,52,34,0.5)'; l.lineWidth = 1;
  const step = Math.max(3, Math.round(Math.min(b.w, b.h) / 90));
  for (let p = 0; p < (along ? b.w : b.h); p += step) {
    l.beginPath();
    if (along) { l.moveTo(b.x + p + 0.5, b.y); l.lineTo(b.x + p + 0.5, b.y + b.h); } else { l.moveTo(b.x, b.y + p + 0.5); l.lineTo(b.x + b.w, b.y + p + 0.5); }
    l.stroke();
  }
  l.globalCompositeOperation = 'destination-in';
  l.translate(cx, cy); l.scale(rx * 0.8, ry * 0.8);
  const keep = l.createRadialGradient(0, 0, 0, 0, 0, 1);
  keep.addColorStop(0, `rgba(0,0,0,${0.32 * strength})`);
  keep.addColorStop(1, 'rgba(0,0,0,0)');
  l.fillStyle = keep; l.beginPath(); l.arc(0, 0, 1, 0, Math.PI * 2); l.fill();
  g.globalCompositeOperation = 'multiply';
  g.drawImage(lines, 0, 0);
  g.restore();
}

/** short loose threads from a torn or cut edge */
function threads(g: CanvasRenderingContext2D, pts: [number, number][], out: [number, number], rnd: () => number, scale: number) {
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const t = rnd(), x = ax + (bx - ax) * t, y = ay + (by - ay) * t, len = scale * (0.5 + rnd());
      g.strokeStyle = rnd() < 0.7 ? 'rgba(226,214,186,0.9)' : 'rgba(150,72,52,0.85)';
      g.lineWidth = Math.max(0.8, scale * 0.12);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + out[0] * len + (rnd() - 0.5) * len * 0.6, y + out[1] * len + (rnd() - 0.5) * len * 0.6); g.stroke();
    }
  }
  g.restore();
}

/** where the damage falls on this rug: moth patches, a hole, a torn corner (fixed by the seed) */
function damagePlan(b: Box, rnd: () => number) {
  const m = Math.min(b.w, b.h);
  const moth: [number, number][][] = [];
  const clusters = 2 + Math.floor(rnd() * 2);
  for (let c = 0; c < clusters; c++) {
    const cx = b.x + b.w * (0.15 + rnd() * 0.7), cy = b.y + b.h * (0.15 + rnd() * 0.7);
    const n = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) moth.push(blobPts(cx + (rnd() - 0.5) * m * 0.18, cy + (rnd() - 0.5) * m * 0.14, m * (0.01 + rnd() * 0.022), rnd));
  }
  const hx = b.x + b.w * (0.25 + rnd() * 0.5), hy = b.y + b.h * (0.25 + rnd() * 0.5), hr = m * (0.03 + rnd() * 0.02);
  const hole = blobPts(hx, hy, hr, rnd, 13);
  const warpBend = [rnd(), rnd(), rnd()];
  const corner = Math.floor(rnd() * 4), sx = corner % 2 ? -1 : 1, sy = corner > 1 ? -1 : 1;
  const ox = sx > 0 ? b.x : b.x + b.w, oy = sy > 0 ? b.y : b.y + b.h;
  const a = m * (0.09 + rnd() * 0.05), c2 = m * (0.07 + rnd() * 0.05);
  const tear: [number, number][] = [];
  for (let i = 0; i <= 9; i++) { const t = i / 9, j = (rnd() - 0.5) * m * 0.018; tear.push([ox + sx * a * (1 - t) + j, oy + sy * c2 * t + j]); }
  return { m, moth, hole, hx, hy, hr, warpBend, sx, sy, ox, oy, a, c2, tear };
}
type Plan = ReturnType<typeof damagePlan>;

/** the marks that lie on the pile: faded, moth-eaten, darkened round the hole */
function damageMarks(g: CanvasRenderingContext2D, b: Box, rnd: () => number, p: Plan) {
  fade(g, b, rnd, 0.55);
  g.save();
  for (const pts of p.moth) {
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    poly(g, pts); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(92,70,48,0.35)'; g.fill();
    poly(g, scaled(pts, cx, cy, 0.72)); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(176,160,128,0.55)'; g.fill();
  }
  poly(g, scaled(p.hole, p.hx, p.hy, 1.35)); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(70,48,30,0.45)'; g.fill();
  g.beginPath(); p.tear.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = 'rgba(70,48,30,0.5)'; g.lineWidth = Math.max(2, p.m * 0.012); g.stroke();
  g.restore();
}

/** what is gone: the hole and the torn corner cut out, the warps left across the hole, threads from the tear */
function damageCuts(g: CanvasRenderingContext2D, b: Box, rnd: () => number, p: Plan) {
  const { sx, sy, ox, oy, a, c2, tear, hx, hy, hr, m } = p;
  g.save();
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  poly(g, p.hole); g.fill();
  g.beginPath(); g.moveTo(ox - sx * 4, oy - sy * 4); g.lineTo(ox + sx * (a + 2), oy - sy * 4);
  for (const [x, y] of tear) g.lineTo(x, y);
  g.lineTo(ox - sx * 4, oy + sy * (c2 + 2)); g.closePath(); g.fill();
  g.restore();
  g.save();
  g.strokeStyle = 'rgba(224,212,184,0.85)'; g.lineWidth = Math.max(1, m * 0.004);
  const along = b.w >= b.h;
  [-1, 0, 1].forEach((k, i) => {
    const bend = hr * 0.15 * (p.warpBend[i] - 0.5);
    g.beginPath();
    if (along) { const y = hy + k * hr * 0.45; g.moveTo(hx - hr * 1.1, y); g.quadraticCurveTo(hx, y + bend, hx + hr * 1.1, y); }
    else { const x = hx + k * hr * 0.45; g.moveTo(x, hy - hr * 1.1); g.quadraticCurveTo(x + bend, hy, x, hy + hr * 1.1); }
    g.stroke();
  });
  g.restore();
  threads(g, tear, [-sx * 0.7, -sy * 0.7], rnd, m * 0.022);
}

async function paint(src: string, cond: Condition, seed: string): Promise<string> {
  const im = new Image();
  im.src = src;
  await im.decode();
  const k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
  const W = Math.max(1, Math.round(im.naturalWidth * k)), H = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.drawImage(im, 0, 0, W, H);
  const b = rugBox(im, W, H);
  const rnd = seeded(`${cond}:${seed}`);
  const plan = cond === 'Damaged' ? damagePlan(b, rnd) : null;
  if (cond === 'Dirty') grime(g, b, rnd, 1);
  else if (cond === 'Worn') fade(g, b, rnd, 1);
  else damageMarks(g, b, rnd, plan!);
  // keep the picture's own transparency (the Persian pictures have no ground behind them)
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(im, 0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  if (plan) damageCuts(g, b, rnd, plan);
  return new Promise((res) => {
    if (c.toBlob) c.toBlob((bl) => res(bl ? URL.createObjectURL(bl) : c.toDataURL('image/png')), 'image/webp', 0.88);
    else res(c.toDataURL('image/png'));
  });
}
const cache = new Map<string, Promise<string>>();
const keyOf = (src: string, cond: Condition, seed: string) => `${cond}|${seed}|${src.length > 300 ? `${src.length}:${src.slice(-120)}` : src}`;

/** the rug's picture with its condition painted on (the plain picture for a rug in good order, or off-screen) */
export function wornSrc(src: string, cond: Condition | undefined, seed = ''): Promise<string> {
  if (!showsWear(cond) || typeof document === 'undefined') return Promise.resolve(src);
  const k = keyOf(src, cond, seed);
  let p = cache.get(k);
  if (!p) {
    p = paint(src, cond, seed).catch(() => src);
    cache.set(k, p);
    // a small cache: the oldest pictures go first
    if (cache.size > 40) {
      const first = cache.keys().next().value as string;
      const old = cache.get(first);
      cache.delete(first);
      old?.then((u) => { if (u.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(u), 30000); });
    }
  }
  return p;
}

/** in a component: the worn picture once painted, the plain one until then */
export function useWornSrc(src: string, cond: Condition | undefined, seed = ''): string {
  const k = showsWear(cond) ? keyOf(src, cond, seed) : '';
  const [out, setOut] = useState<{ k: string; url: string } | null>(null);
  useEffect(() => {
    if (!k) return;
    let live = true;
    wornSrc(src, cond, seed).then((url) => { if (live) setOut({ k, url }); });
    return () => { live = false; };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return k && out?.k === k ? out.url : src;
}
