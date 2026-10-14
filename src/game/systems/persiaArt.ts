// Persia, drawn in code east of the painted travel map: parchment, ink and brown mountains in the
// painting's manner, blended into its right-hand edge. Built once into an offscreen canvas and drawn by
// mapRender.ts beside the painting. The ground it shows is the ground the pathfinder uses (data/persiaMap.ts).
import { ALBORZ, ALBORZ_HW, CASPIAN, DESERTS, GULF, HILLS, PAINT_W, EAST_W, PERSIA_AT, ZAGROS, ZAGROS_HW, distToLine, east, inPoly, type P } from '../../data/persiaMap';

/** where the drawing starts: a little inside the painting, so the two fade into each other */
export const PERSIA_X0 = PAINT_W - 30;
const BLEND_TO = PAINT_W - 1;
const H = 590;

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

let built: HTMLCanvasElement | null = null;
let asked = false;
const waiting = new Set<() => void>();

/** The drawing of Persia, once made. It is made a moment after it is first asked for, off the first
 *  paint of the map (a few hundred milliseconds on a phone); `onReady` is called when it is there. */
export function persiaCanvas(onReady?: () => void): HTMLCanvasElement | null {
  if (built) return built;
  if (onReady) waiting.add(onReady);
  if (!asked && typeof document !== 'undefined') {
    asked = true;
    const go = () => { try { build(); } finally { const fs = [...waiting]; waiting.clear(); fs.forEach((f) => f()); } };
    const idle = (globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(go, { timeout: 600 }); else setTimeout(go, 50);
  }
  return null;
}

/** Persia, PERSIA_X0 to the map's east edge, at `k` canvas pixels a map unit. */
function build(): HTMLCanvasElement | null {
  if (built) return built;
  if (typeof document === 'undefined') return null;
  const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const k = phone ? 2.4 : 3.2;
  const W = EAST_W - PERSIA_X0;
  const c = document.createElement('canvas');
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  const g = c.getContext('2d');
  if (!g) return null;
  g.scale(k, k);
  g.translate(-PERSIA_X0, 0);
  const r = rnd(1925);
  const poly = (pts: P[]) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
  // the coasts drawn softly (Chaikin's corner cutting) and a little ragged, as a hand would draw them
  const soft = (pts: P[], open = false) => {
    let q = pts;
    for (let it = 0; it < 3; it++) {
      const out: P[] = open ? [q[0]] : [];
      for (let i = 0; i < q.length - (open ? 1 : 0); i++) {
        const a = q[i], b = q[(i + 1) % q.length];
        out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      if (open) out.push(q[q.length - 1]);
      q = out;
    }
    return q.map((p) => ({ x: p.x + (r() - 0.5) * 1.2, y: p.y + (r() - 0.5) * 1.2 }));
  };
  const line = (pts: P[]) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };

  // ---- the parchment: the painting's warm sand, mottled ----
  g.fillStyle = 'rgb(208,158,96)';
  g.fillRect(PERSIA_X0, 0, W, H);
  for (let i = 0; i < 320; i++) {
    const x = PERSIA_X0 + r() * W, y = r() * H, rr = 10 + r() * 40;
    const light = r() < 0.55;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    grd.addColorStop(0, light ? `rgba(232,190,128,${0.12 + r() * 0.16})` : `rgba(160,108,58,${0.08 + r() * 0.12})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // fine sand: the painting's grain
  for (let i = 0; i < 5000; i++) {
    const x = PERSIA_X0 + r() * W, y = r() * H;
    g.fillStyle = r() < 0.5 ? 'rgba(120,80,40,0.16)' : 'rgba(245,214,160,0.18)';
    g.fillRect(x, y, 0.5 + r() * 0.7, 0.5 + r() * 0.7);
  }
  // dune ripples on the plateau
  g.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const x = PERSIA_X0 + 30 + r() * (W - 40), y = 200 + r() * 260;
    if (inPoly({ x, y }, GULF) || distToLine({ x, y }, ZAGROS) < ZAGROS_HW + 10) continue;
    g.strokeStyle = `rgba(150,100,52,${0.18 + r() * 0.15})`;
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 4, y - 1.6, x + 8 + r() * 4, y + 0.3);
    g.stroke();
  }

  // ---- the salt deserts ----
  for (const d of DESERTS) {
    const grd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, Math.max(d.rx, d.ry));
    grd.addColorStop(0, 'rgba(236,218,176,0.75)');
    grd.addColorStop(0.7, 'rgba(228,204,156,0.45)');
    grd.addColorStop(1, 'rgba(228,204,156,0)');
    g.save();
    g.translate(d.x, d.y);
    g.scale(d.rx / Math.max(d.rx, d.ry), d.ry / Math.max(d.rx, d.ry));
    g.translate(-d.x, -d.y);
    g.fillStyle = grd;
    g.fillRect(d.x - Math.max(d.rx, d.ry), d.y - Math.max(d.rx, d.ry), Math.max(d.rx, d.ry) * 2, Math.max(d.rx, d.ry) * 2);
    g.restore();
    // cracked salt crust
    g.strokeStyle = 'rgba(170,140,100,0.35)';
    g.lineWidth = 0.35;
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r());
      const x = d.x + Math.cos(a) * rr * d.rx * 0.8, y = d.y + Math.sin(a) * rr * d.ry * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 6, y + (r() - 0.5) * 4);
      g.lineTo(x + (r() - 0.5) * 8, y + (r() - 0.5) * 6);
      g.stroke();
    }
  }

  // ---- the seas: the Caspian, and the Gulf carried on from the painting ----
  for (const sea of [soft(CASPIAN), soft(GULF)]) {
    // a pale sandy shore, then the water
    g.lineJoin = 'round';
    poly(sea);
    g.strokeStyle = 'rgba(232,206,150,0.9)';
    g.lineWidth = 4;
    g.stroke();
    poly(sea);
    const gulf = sea[0].y > 300;
    const grd = g.createLinearGradient(0, gulf ? 390 : 0, 0, gulf ? 590 : 170);
    grd.addColorStop(0, 'rgb(70,118,124)');
    grd.addColorStop(1, 'rgb(50,94,104)');
    g.fillStyle = grd;
    g.fill();
    g.save();
    poly(sea);
    g.clip();
    // light on the water, and a darker band off the shore
    poly(sea);
    g.strokeStyle = 'rgba(120,170,168,0.55)';
    g.lineWidth = 3;
    g.stroke();
    for (let i = 0; i < 160; i++) {
      const x = PERSIA_X0 + r() * W, y = r() * H;
      if (!inPoly({ x, y }, sea)) continue;
      g.strokeStyle = `rgba(170,210,205,${0.25 + r() * 0.3})`;
      g.lineWidth = 0.45;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 2, y - 1, x + 4, y);
      g.quadraticCurveTo(x + 6, y + 1, x + 8, y);
      g.stroke();
    }
    g.restore();
    poly(sea);
    g.strokeStyle = 'rgba(96,66,36,0.85)';
    g.lineWidth = 0.7;
    g.stroke();
  }
  // palms along the Diyala and on the plain of Khuzistan at the head of the Gulf, as the painting has them
  for (const [x, y, n] of [[872, 262, 4], [880, 300, 3], [868, 330, 3], [905, 368, 5], [935, 380, 4], [962, 386, 3]] as [number, number, number][])
    for (let i = 0; i < n; i++) palm(g, x + (r() - 0.5) * 14, y + (r() - 0.5) * 8, 1 + r() * 0.5);
  // a sailing boat on the Caspian, as the painting has on its seas
  boat(g, 1070, 110, 1.1);

  // ---- green land: the Caspian shore and the gardens round each town ----
  g.save();
  line([{ x: 992, y: 150 }, { x: 1012, y: 158 }, { x: 1052, y: 166 }, { x: 1100, y: 174 }, { x: 1150, y: 170 }]);
  g.strokeStyle = 'rgba(92,116,54,0.55)';
  g.lineWidth = 9;
  g.stroke();
  g.restore();
  for (const id of Object.keys(PERSIA_AT)) {
    const p = PERSIA_AT[id];
    const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 13);
    grd.addColorStop(0, 'rgba(104,126,60,0.7)');
    grd.addColorStop(0.6, 'rgba(104,126,60,0.35)');
    grd.addColorStop(1, 'rgba(104,126,60,0)');
    g.fillStyle = grd;
    g.fillRect(p.x - 13, p.y - 13, 26, 26);
    // poplars and orchard trees
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 4 + r() * 7;
      tree(g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, 0.9 + r() * 0.5, r() < 0.5);
    }
  }
  // the Zayandeh Rud through Isfahan, lost in the desert to the east
  line(soft([east(50.7, 32.8), east(51.1, 32.62), east(51.4, 32.7), east(51.67, 32.64), east(52.0, 32.56), east(52.3, 32.42), east(52.6, 32.38)], true));
  g.strokeStyle = 'rgba(64,112,128,0.7)';
  g.lineWidth = 0.8;
  g.lineCap = 'round';
  g.stroke();

  // ---- hills ----
  const hill = (x: number, y: number, s: number) => {
    g.beginPath();
    g.moveTo(x - 4 * s, y);
    g.quadraticCurveTo(x - 1.2 * s, y - 3.4 * s, x + 1 * s, y - 2.4 * s);
    g.quadraticCurveTo(x + 3 * s, y - 1.4 * s, x + 4.5 * s, y);
    g.closePath();
    g.fillStyle = 'rgba(176,124,70,0.55)';
    g.fill();
    g.strokeStyle = 'rgba(110,72,38,0.5)';
    g.lineWidth = 0.35;
    g.stroke();
  };
  const hillSpots: P[] = [];
  for (let y = 6; y < H; y += 6)
    for (let x = PERSIA_X0 + 3; x < EAST_W; x += 7) {
      const p = { x: x + (r() - 0.5) * 5, y: y + (r() - 0.5) * 4 };
      if (inPoly(p, CASPIAN) || inPoly(p, GULF)) continue;
      const dz = distToLine(p, ZAGROS), da = distToLine(p, ALBORZ);
      const hilly = (dz >= ZAGROS_HW - 2 && dz < ZAGROS_HW + 12) || (da >= ALBORZ_HW - 2 && da < ALBORZ_HW + 8) || HILLS.some((h) => ((p.x - h.x) / h.rx) ** 2 + ((p.y - h.y) / h.ry) ** 2 <= 1);
      if (hilly && r() < 0.7) hillSpots.push(p);
    }
  // the plateau is not flat: scattered ridges of low hills, and camel-thorn scrub
  for (let i = 0; i < 70; i++) {
    const p = { x: PERSIA_X0 + 40 + r() * (W - 60), y: 120 + r() * 330 };
    if (inPoly(p, CASPIAN) || inPoly(p, GULF) || distToLine(p, ZAGROS) < ZAGROS_HW + 12 || distToLine(p, ALBORZ) < ALBORZ_HW + 8) continue;
    if (Object.values(PERSIA_AT).some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 16)) continue;
    const n = 2 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) hillSpots.push({ x: p.x + j * 4 + (r() - 0.5) * 2, y: p.y + (r() - 0.5) * 3 });
  }
  hillSpots.sort((a, b) => a.y - b.y).forEach((p) => hill(p.x, p.y, 0.8 + r() * 0.6));
  for (let i = 0; i < 700; i++) {
    const p = { x: PERSIA_X0 + 20 + r() * (W - 30), y: 100 + r() * 380 };
    if (inPoly(p, CASPIAN) || inPoly(p, GULF)) continue;
    g.fillStyle = `rgba(${96 + r() * 30},${92 + r() * 20},${50},${0.35 + r() * 0.3})`;
    g.beginPath();
    g.arc(p.x, p.y, 0.35 + r() * 0.45, 0, Math.PI * 2);
    g.fill();
  }

  // ---- the mountains: the Zagros and the Alborz, peaks lit from the west ----
  // a brown shade under each range first, so the peaks stand on mountain country, not on the sand
  for (const [ridge, hw] of [[ZAGROS, ZAGROS_HW], [ALBORZ, ALBORZ_HW]] as [P[], number][]) {
    for (const [wd, a] of [[hw * 2.6, 0.1], [hw * 2, 0.14], [hw * 1.3, 0.16]] as [number, number][]) {
      line(ridge);
      g.strokeStyle = `rgba(132,88,46,${a})`;
      g.lineWidth = wd;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
    }
  }
  const peaks: (P & { s: number; snow: boolean })[] = [];
  for (const [ridge, hw, snowy] of [[ZAGROS, ZAGROS_HW, false], [ALBORZ, ALBORZ_HW, true]] as [P[], number, boolean][]) {
    for (let y = -6; y < H + 10; y += 6.5)
      for (let x = PERSIA_X0 - 10; x < EAST_W + 8; x += 9) {
        const p = { x: x + (r() - 0.5) * 7 + ((y / 6.5) % 2) * 4.5, y: y + (r() - 0.5) * 4 };
        const d = distToLine(p, ridge);
        if (d > hw + 2 || inPoly(p, CASPIAN) || inPoly(p, GULF) || r() < 0.18) continue;
        const core = Math.max(0, 1 - d / (hw + 2));
        peaks.push({ ...p, s: 0.75 + core * 0.95 + r() * 0.45, snow: (snowy && core > 0.35) || (!snowy && p.y < 215 && core > 0.4) || (!snowy && core > 0.8 && r() < 0.25) });
      }
  }
  // Damavand, the white cone above Tehran
  const dam = east(52.1, 35.95);
  peaks.push({ ...dam, s: 2.6, snow: true });
  peaks.sort((a, b) => a.y - b.y).forEach((m) => peak(g, m.x, m.y, m.s, m.snow, r));

  // ---- caravanserais and villages along the roads ----
  for (const [x, y] of [east(45.86, 34.46), east(46.24, 34.27), east(47.43, 34.38), east(47.96, 34.5), east(49.2, 35.6), east(50.0, 36.27), east(48.48, 36.67), east(47.7, 37.42), east(50.88, 34.64), east(51.55, 33.1), east(53.08, 32.86), east(54.36, 31.9), east(56.0, 30.4)].map((p) => [p.x, p.y])) village(g, x, y + 2, 1, r);

  // ---- the edges of the sheet: darker, as the painting's are ----
  const right = g.createLinearGradient(EAST_W - 22, 0, EAST_W, 0);
  right.addColorStop(0, 'rgba(70,40,16,0)');
  right.addColorStop(1, 'rgba(70,40,16,0.65)');
  g.fillStyle = right;
  g.fillRect(EAST_W - 22, 0, 22, H);
  for (const [y0, y1] of [[0, 14], [H, H - 14]]) {
    const e = g.createLinearGradient(0, y0, 0, y1);
    e.addColorStop(0, 'rgba(70,40,16,0.45)');
    e.addColorStop(1, 'rgba(70,40,16,0)');
    g.fillStyle = e;
    g.fillRect(PERSIA_X0, Math.min(y0, y1), W, 14);
  }
  // a torn, inked edge down the right-hand side
  g.beginPath();
  g.moveTo(EAST_W - 2, 0);
  for (let y = 0; y <= H; y += 3) g.lineTo(EAST_W - 2.5 - r() * 2.5, y);
  g.lineTo(EAST_W, H);
  g.lineTo(EAST_W, 0);
  g.closePath();
  g.fillStyle = 'rgba(52,30,12,0.85)';
  g.fill();

  // ---- the seam: fade in over the painting's own edge ----
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, (BLEND_TO - PERSIA_X0) * k, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.55, 'rgba(0,0,0,0.6)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  built = c;
  return c;
}

function peak(g: CanvasRenderingContext2D, x: number, y: number, s: number, snow: boolean, r: () => number) {
  const w = 6.2 * s, h = 7.2 * s * (0.85 + r() * 0.35);
  const tip = { x: x - w * 0.1 + (r() - 0.5) * w * 0.3, y: y - h };
  const shL = { x: x - w * (0.45 + r() * 0.15), y: y - h * (0.42 + r() * 0.2) };
  const shR = { x: x + w * (0.4 + r() * 0.2), y: y - h * (0.38 + r() * 0.2) };
  const foot = { x: x + w * 0.08 + (r() - 0.5) * w * 0.15, y };
  // shadow on the ground to the east
  g.fillStyle = 'rgba(96,60,28,0.2)';
  g.beginPath();
  g.ellipse(x + w * 0.35, y + 0.3, w * 0.95, 1.1 * s, 0, 0, Math.PI * 2);
  g.fill();
  // the lit west face
  let grd = g.createLinearGradient(tip.x, tip.y, x - w, y);
  grd.addColorStop(0, 'rgb(234,194,134)');
  grd.addColorStop(1, 'rgb(190,140,82)');
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(shL.x, shL.y);
  g.lineTo(tip.x, tip.y);
  g.lineTo(foot.x, y);
  g.closePath();
  g.fillStyle = grd;
  g.fill();
  // the east face in shadow
  grd = g.createLinearGradient(tip.x, tip.y, x + w, y);
  grd.addColorStop(0, 'rgb(156,104,58)');
  grd.addColorStop(1, 'rgb(116,76,40)');
  g.beginPath();
  g.moveTo(tip.x, tip.y);
  g.lineTo(shR.x, shR.y);
  g.lineTo(x + w, y);
  g.lineTo(foot.x, y);
  g.closePath();
  g.fillStyle = grd;
  g.fill();
  // ridges and gullies down both faces
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(86,52,24,0.55)';
  g.lineWidth = 0.32 * Math.min(1.6, s);
  for (let i = 0; i < 4; i++) {
    const t = 0.2 + i * 0.2 + r() * 0.08;
    g.beginPath();
    g.moveTo(tip.x + (shR.x - tip.x) * t * 0.6, tip.y + (shR.y - tip.y) * t * 0.6 + h * 0.05);
    g.quadraticCurveTo(tip.x + w * (0.15 + t * 0.4), y - h * (0.4 - t * 0.2), foot.x + w * (0.1 + t * 0.8), y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(250,224,170,0.45)';
  for (let i = 0; i < 2; i++) {
    const t = 0.3 + i * 0.3;
    g.beginPath();
    g.moveTo(tip.x - w * 0.05 * (i + 1), tip.y + h * 0.15);
    g.quadraticCurveTo(tip.x - w * (0.2 + t * 0.3), y - h * 0.35, x - w * (0.3 + t * 0.5), y);
    g.stroke();
  }
  if (snow) {
    g.beginPath();
    g.moveTo(tip.x, tip.y);
    g.lineTo(tip.x + (shL.x - tip.x) * 0.45, tip.y + (shL.y - tip.y) * 0.45);
    g.lineTo(tip.x - w * 0.1, tip.y + h * 0.22);
    g.lineTo(tip.x + w * 0.04, tip.y + h * 0.3);
    g.lineTo(tip.x + w * 0.16, tip.y + h * 0.2);
    g.lineTo(tip.x + (shR.x - tip.x) * 0.5, tip.y + (shR.y - tip.y) * 0.5);
    g.closePath();
    g.fillStyle = 'rgba(246,242,232,0.95)';
    g.fill();
    g.strokeStyle = 'rgba(150,140,130,0.5)';
    g.lineWidth = 0.25;
    g.stroke();
  }
  // the outline, a thin brown ink
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(shL.x, shL.y);
  g.lineTo(tip.x, tip.y);
  g.lineTo(shR.x, shR.y);
  g.lineTo(x + w, y);
  g.strokeStyle = 'rgba(84,52,24,0.75)';
  g.lineWidth = 0.4;
  g.stroke();
}

function village(g: CanvasRenderingContext2D, x: number, y: number, s: number, r: () => number) {
  for (let i = 0; i < 3; i++) {
    const bx = x + (i - 1) * 2.6 * s + (r() - 0.5), bh = (1.6 + r() * 1.2) * s, bw = (2 + r()) * s;
    g.fillStyle = i % 2 ? 'rgb(196,150,98)' : 'rgb(178,128,78)';
    g.fillRect(bx - bw / 2, y - bh, bw, bh);
    g.strokeStyle = 'rgba(84,52,24,0.7)';
    g.lineWidth = 0.25;
    g.strokeRect(bx - bw / 2, y - bh, bw, bh);
    if (i === 1) {
      g.beginPath();
      g.arc(bx, y - bh, bw * 0.38, Math.PI, 0);
      g.fillStyle = 'rgb(206,166,112)';
      g.fill();
      g.stroke();
    }
    g.fillStyle = 'rgba(60,36,18,0.7)';
    g.fillRect(bx - 0.25 * s, y - bh * 0.5, 0.5 * s, 0.7 * s);
  }
  tree(g, x + 4.2 * s, y, 0.8 * s, true);
}

function tree(g: CanvasRenderingContext2D, x: number, y: number, s: number, poplar: boolean) {
  g.fillStyle = 'rgba(64,50,30,0.8)';
  g.fillRect(x - 0.15 * s, y, 0.3 * s, 1.2 * s);
  g.beginPath();
  if (poplar) g.ellipse(x, y - 1.2 * s, 0.7 * s, 2 * s, 0, 0, Math.PI * 2);
  else g.arc(x, y - 0.6 * s, 1.2 * s, 0, Math.PI * 2);
  g.fillStyle = poplar ? 'rgb(74,96,44)' : 'rgb(86,110,50)';
  g.fill();
  g.strokeStyle = 'rgba(40,52,24,0.6)';
  g.lineWidth = 0.25;
  g.stroke();
}

function palm(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.strokeStyle = 'rgb(92,66,38)';
  g.lineWidth = 0.45 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + 0.6 * s, y - 2.5 * s, x + 0.2 * s, y - 5 * s);
  g.stroke();
  const tx = x + 0.2 * s, ty = y - 5 * s;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.5;
    g.strokeStyle = k % 2 ? 'rgb(62,92,40)' : 'rgb(84,116,52)';
    g.lineWidth = 0.55 * s;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * 1.6 * s, ty + Math.sin(a) * 1.2 * s - 0.6 * s, tx + Math.cos(a) * 2.8 * s, ty + Math.sin(a) * 1.4 * s + 1.2 * s);
    g.stroke();
  }
}

function boat(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.fillStyle = 'rgb(84,54,30)';
  g.beginPath();
  g.moveTo(x - 4 * s, y);
  g.lineTo(x + 4 * s, y);
  g.lineTo(x + 3 * s, y + 1.4 * s);
  g.lineTo(x - 3 * s, y + 1.4 * s);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgb(70,46,26)';
  g.lineWidth = 0.3;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 6 * s);
  g.stroke();
  g.fillStyle = 'rgb(236,222,190)';
  g.beginPath();
  g.moveTo(x + 0.3 * s, y - 5.6 * s);
  g.quadraticCurveTo(x + 3.6 * s, y - 3 * s, x + 0.3 * s, y - 0.6 * s);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(x - 0.3 * s, y - 5 * s);
  g.quadraticCurveTo(x - 3 * s, y - 2.6 * s, x - 0.3 * s, y - 0.8 * s);
  g.closePath();
  g.fill();
}
