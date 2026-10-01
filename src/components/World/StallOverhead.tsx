import { useEffect, useRef } from 'react';
import { stallName, useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';

const W = 720, H = 460;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

function shadowed(g: Ctx, blur: number, alpha: number, dx: number, dy: number, draw: () => void) {
  g.save();
  g.filter = `blur(${blur}px)`;
  g.fillStyle = `rgba(38,20,6,${alpha})`;
  g.translate(dx, dy);
  draw();
  g.restore();
}

function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Static ground layer: roofs, lane, neighbouring stalls, palm and pyramid. Drawn once. Sun from the upper left.
function paintGround(g: Ctx) {
  const r = mulberry(7);
  // earth
  g.fillStyle = '#cfae78';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, rad = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5;
    gr.addColorStop(0, dark ? 'rgba(120,85,45,0.12)' : 'rgba(245,225,180,0.14)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = `rgba(${110 + r() * 70},${80 + r() * 50},${45 + r() * 35},${0.06 + r() * 0.12})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6);
  }

  // the lane: worn flagstones with sand in the joints
  const laneY = 186, laneH = 118;
  g.fillStyle = '#b8935c';
  g.fillRect(0, laneY, W, laneH);
  for (let row = 0, y = laneY + 2; y < laneY + laneH - 4; row++) {
    const h = 11 + r() * 6;
    for (let x = -r() * 20; x < W; ) {
      const w = 14 + r() * 16;
      const t = 150 + r() * 40;
      g.fillStyle = `rgb(${t + 20},${t - 5},${t - 45})`;
      roundRect(g, x + 1, y + 1, w - 2, h - 2, 3);
      g.fill();
      g.fillStyle = 'rgba(255,240,210,0.12)';
      roundRect(g, x + 1, y + 1, w - 3, (h - 2) * 0.45, 3);
      g.fill();
      x += w;
    }
    y += h;
  }
  // sand drifted over the stones, heavier at the edges, and cart ruts down the middle
  const sand = g.createLinearGradient(0, laneY, 0, laneY + laneH);
  sand.addColorStop(0, 'rgba(207,174,120,0.85)');
  sand.addColorStop(0.18, 'rgba(207,174,120,0.25)');
  sand.addColorStop(0.5, 'rgba(207,174,120,0.1)');
  sand.addColorStop(0.82, 'rgba(207,174,120,0.25)');
  sand.addColorStop(1, 'rgba(207,174,120,0.85)');
  g.fillStyle = sand;
  g.fillRect(0, laneY, W, laneH);
  g.strokeStyle = 'rgba(90,60,30,0.22)';
  g.lineWidth = 3;
  for (const y of [laneY + 46, laneY + 72]) {
    g.beginPath();
    for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 2.5);
    g.stroke();
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = 'rgba(70,45,20,0.13)';
    g.beginPath();
    g.ellipse(r() * W, laneY + 12 + r() * (laneH - 24), 2.2, 3.8, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${200 + r() * 40},${170 + r() * 30},90,0.5)`;
    g.lineWidth = 1;
    const x = r() * W, y = laneY + r() * laneH, a = r() * 3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    g.stroke();
  }

  // pyramid seen from above, top right, casting its shadow east
  const px = 650, py = 36, ps = 150;
  const tri = (pts: number[][], c: string | CanvasGradient) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => g.lineTo(p[0], p[1]));
    g.closePath();
    g.fill();
  };
  shadowed(g, 14, 0.16, 26, 22, () => tri([[px - ps, py + ps], [px + ps, py + ps], [px + ps, py - ps], [px, py]], '#000'));
  tri([[px - ps, py - ps], [px + ps, py - ps], [px, py]], '#ecd29a');
  tri([[px - ps, py - ps], [px - ps, py + ps], [px, py]], '#dcbc80');
  tri([[px - ps, py + ps], [px + ps, py + ps], [px, py]], '#a8824a');
  tri([[px + ps, py - ps], [px + ps, py + ps], [px, py]], '#b88f55');
  g.strokeStyle = 'rgba(80,55,25,0.22)';
  g.lineWidth = 1;
  for (let k = 9; k < ps; k += 9) g.strokeRect(px - k, py - k, k * 2, k * 2);
  g.strokeStyle = 'rgba(255,240,200,0.35)';
  g.beginPath(); g.moveTo(px, py); g.lineTo(px - ps, py - ps); g.stroke();

  // flat roofs of the houses behind the north stalls
  let x = -10;
  while (x < 500) {
    const w = 60 + r() * 60, h = 44 + r() * 20, y = -6;
    shadowed(g, 5, 0.35, 8, 8, () => g.fillRect(x, y, w, h));
    const t = 188 + r() * 25;
    g.fillStyle = `rgb(${t},${t - 30},${t - 80})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = `rgba(255,240,210,0.35)`;
    g.lineWidth = 3;
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.strokeStyle = 'rgba(80,50,20,0.35)';
    g.lineWidth = 1;
    g.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
    if (r() < 0.6) { // water jar
      const jx = x + 12 + r() * (w - 24), jy = y + 14 + r() * (h - 26);
      g.fillStyle = 'rgba(40,20,8,0.3)'; g.beginPath(); g.arc(jx + 3, jy + 3, 6, 0, 7); g.fill();
      const jg = g.createRadialGradient(jx - 2, jy - 2, 1, jx, jy, 6);
      jg.addColorStop(0, '#c98b5a'); jg.addColorStop(1, '#7a4a26');
      g.fillStyle = jg; g.beginPath(); g.arc(jx, jy, 6, 0, 7); g.fill();
      g.fillStyle = '#3a2210'; g.beginPath(); g.arc(jx, jy, 2.2, 0, 7); g.fill();
    }
    if (r() < 0.5) { // washing line
      const ly = y + 10 + r() * (h - 20);
      g.strokeStyle = 'rgba(60,40,20,0.6)'; g.beginPath(); g.moveTo(x + 6, ly); g.lineTo(x + w - 6, ly); g.stroke();
      for (let k = x + 10; k < x + w - 14; k += 9 + r() * 6) {
        g.fillStyle = ['#efe6d4', '#3c4f7a', '#9a3326', '#d8b25a', '#ffffff'][Math.floor(r() * 5)];
        g.fillRect(k, ly - 1, 6, 8 + r() * 5);
      }
    }
    x += w + 2;
  }

  // neighbouring stalls: cloth awnings on poles, with goods laid out toward the lane
  const awning = (ax: number, ay: number, aw: number, ah: number, c1: string, c2: string, goods: 'pots' | 'spice' | 'copper' | 'cloth' | 'baskets', north: boolean) => {
    // table with goods, on the lane side
    const ty = north ? ay + ah - 8 : ay - 22;
    shadowed(g, 3, 0.35, 5, 5, () => g.fillRect(ax + 6, ty, aw - 12, 30));
    g.fillStyle = '#7a5530';
    g.fillRect(ax + 6, ty, aw - 12, 30);
    g.strokeStyle = 'rgba(40,24,10,0.45)';
    for (let k = ty + 7; k < ty + 30; k += 7) { g.beginPath(); g.moveTo(ax + 6, k); g.lineTo(ax + aw - 6, k); g.stroke(); }
    const n = Math.floor((aw - 20) / 17);
    for (let i = 0; i < n; i++) {
      const cx = ax + 16 + i * 17, cy = ty + 15;
      if (goods === 'spice') {
        const c = ['#c9451f', '#d9a31e', '#6d8a2a', '#a8331f', '#b86a2a'][i % 5];
        g.fillStyle = '#8a6a3a'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        const sg = g.createRadialGradient(cx - 2, cy - 2, 0.5, cx, cy, 7);
        sg.addColorStop(0, '#fff2c0'); sg.addColorStop(0.35, c); sg.addColorStop(1, c);
        g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, 6.5, 0, 7); g.fill();
      } else if (goods === 'copper') {
        const cg = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 8);
        cg.addColorStop(0, '#ffe2a0'); cg.addColorStop(0.4, '#d99a4a'); cg.addColorStop(1, '#7a4a1c');
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        g.strokeStyle = 'rgba(90,50,15,0.6)'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.stroke();
      } else if (goods === 'pots') {
        const pg = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 8);
        pg.addColorStop(0, '#c8845a'); pg.addColorStop(1, '#6e3a1a');
        g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, 7.5, 0, 7); g.fill();
        g.fillStyle = '#2e1608'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
      } else if (goods === 'baskets') {
        g.fillStyle = '#b8904e'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        g.strokeStyle = 'rgba(90,60,20,0.6)';
        for (let k = 2; k < 8; k += 2) { g.beginPath(); g.arc(cx, cy, k, 0, 7); g.stroke(); }
        g.fillStyle = ['#e8d6a0', '#6d8a2a', '#a8331f'][i % 3]; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
      } else {
        const c = ['#2c3b6b', '#9a3326', '#e8d6b0', '#6f7a3c'][i % 4];
        g.fillStyle = c; g.fillRect(cx - 7, cy - 9, 14, 18);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(cx - 7, cy - 9, 14, 4);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(cx + 4, cy - 9, 3, 18);
      }
    }
    // awning cloth: cast shadow, stripes, sag shading, scalloped lane edge, poles and guy ropes
    shadowed(g, 7, 0.4, 14, 11, () => g.fillRect(ax, ay, aw, ah));
    const stripes = Math.max(4, Math.round(aw / 15));
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? c1 : c2;
      g.fillRect(ax + (i * aw) / stripes, ay, aw / stripes + 0.6, ah);
    }
    const sag = g.createLinearGradient(0, ay, 0, ay + ah);
    sag.addColorStop(0, 'rgba(255,245,220,0.22)');
    sag.addColorStop(0.5, 'rgba(40,20,5,0.16)');
    sag.addColorStop(1, 'rgba(255,245,220,0.12)');
    g.fillStyle = sag;
    g.fillRect(ax, ay, aw, ah);
    const side = g.createLinearGradient(ax, 0, ax + aw, 0);
    side.addColorStop(0, 'rgba(255,240,210,0.12)');
    side.addColorStop(1, 'rgba(30,15,5,0.18)');
    g.fillStyle = side;
    g.fillRect(ax, ay, aw, ah);
    const ey = north ? ay + ah : ay;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? c1 : c2;
      g.beginPath();
      g.arc(ax + ((i + 0.5) * aw) / stripes, ey, aw / stripes / 2, north ? 0 : Math.PI, north ? Math.PI : Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(50,28,10,0.55)';
    g.lineWidth = 1;
    g.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);
    for (const [qx, qy, ox, oy] of [[ax, ay, -10, -8], [ax + aw, ay, 10, -8], [ax, ay + ah, -10, 8], [ax + aw, ay + ah, 10, 8]]) {
      g.strokeStyle = 'rgba(90,70,40,0.55)';
      g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + ox, qy + oy); g.stroke();
      g.fillStyle = '#4a2e16'; g.beginPath(); g.arc(qx, qy, 3.2, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,220,160,0.5)'; g.beginPath(); g.arc(qx - 1, qy - 1, 1.2, 0, 7); g.fill();
    }
  };
  awning(18, 66, 150, 92, '#9a3326', '#ecdcb8', 'spice', true);
  awning(188, 72, 130, 86, '#2c3b6b', '#ecdcb8', 'copper', true);
  awning(338, 68, 138, 90, '#6f7a3c', '#ecdcb8', 'pots', true);
  awning(420, 342, 150, 96, '#8e5a1c', '#ecdcb8', 'cloth', false);
  awning(590, 336, 120, 104, '#9a3326', '#e8d6b0', 'baskets', false);
  awning(-30, 342, 110, 100, '#2c3b6b', '#e8d6b0', 'pots', false);

  // a date palm, seen from above
  const pcx = 548, pcy = 138;
  shadowed(g, 6, 0.35, 22, 16, () => { g.beginPath(); g.arc(pcx, pcy, 44, 0, 7); g.fill(); });
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + 0.2;
    const len = 38 + (i % 3) * 5;
    const ex = pcx + Math.cos(a) * len, ey = pcy + Math.sin(a) * len;
    const mx = pcx + Math.cos(a + 0.12) * len * 0.55, my = pcy + Math.sin(a + 0.12) * len * 0.55 - 4;
    g.strokeStyle = i % 2 ? '#56722c' : '#48621f';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(pcx, pcy); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    for (let t = 0.2; t < 1; t += 0.08) {
      const qx = (1 - t) * (1 - t) * pcx + 2 * (1 - t) * t * mx + t * t * ex;
      const qy = (1 - t) * (1 - t) * pcy + 2 * (1 - t) * t * my + t * t * ey;
      const n = a + Math.PI / 2, l = 7 * (1 - t * 0.6);
      g.strokeStyle = t < 0.6 ? '#5e7e30' : '#6f8e3a';
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(qx - Math.cos(n) * l, qy - Math.sin(n) * l); g.lineTo(qx + Math.cos(n) * l, qy + Math.sin(n) * l); g.stroke();
    }
  }
  g.fillStyle = '#6b4a22'; g.beginPath(); g.arc(pcx, pcy, 6, 0, 7); g.fill();
  g.fillStyle = '#c28a2a'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(pcx + Math.cos(k) * 7, pcy + Math.sin(k) * 7, 2, 0, 7); g.fill(); }
}

interface Walker { x: number; y: number; v: number; kind: number; robe: string; t: number }

export function StallOverhead({ onOpen, compact }: { onOpen?: () => void; compact?: boolean }) {
  const g = useGame();
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = g.inventory.filter((i) => !i.restoringUntil).slice(0, 5).map((i) => i.typeId);
  const upgrades = g.upgrades;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const ground = document.createElement('canvas');
    ground.width = W;
    ground.height = H;
    paintGround(ground.getContext('2d')!);
    const imgs = shown.map((id) => {
      const im = new Image();
      im.src = rugSrc(RUGS[id]);
      return im;
    });
    const r = mulberry(3);
    const robes = ['#efe6d4', '#3c4f7a', '#7a5a3a', '#ddd2bd', '#2e2a26', '#8a6a4a'];
    const walkers: Walker[] = Array.from({ length: 13 }, () => ({ x: r() * W, y: 205 + r() * 80, v: (r() < 0.5 ? -1 : 1) * (14 + r() * 16), kind: Math.floor(r() * 5), robe: robes[Math.floor(r() * robes.length)], t: r() * 10 }));
    let cartX = -120;
    let raf = 0;
    let last = performance.now();
    const S = { x: 140, y: 318, w: 250, h: 128 }; // your stall
    const big = upgrades.includes('bazaar') ? 1.15 : upgrades.includes('mat') ? 1.05 : 0.9;

    const person = (x: number, y: number, robe: string, kind: number, t: number, dir = 0, walking = true) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1.45, 1.45);
      ctx.rotate(dir);
      ctx.fillStyle = 'rgba(30,16,6,0.3)';
      ctx.beginPath();
      ctx.ellipse(5, 4, 10, 6.5, 0.3, 0, 7);
      ctx.fill();
      const sw = walking ? Math.sin(t * 8) * 2.2 : 0;
      // arms
      ctx.fillStyle = robe;
      ctx.beginPath(); ctx.ellipse(sw, -7.5, 3.2, 2.4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-sw, 7.5, 3.2, 2.4, 0, 0, 7); ctx.fill();
      // shoulders
      const bg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
      bg.addColorStop(0, robe);
      bg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 9.5, 0, 0, 7);
      ctx.fillStyle = robe; ctx.fill();
      ctx.fillStyle = bg; ctx.fill();
      // head and headwear
      if (kind === 0) { ctx.fillStyle = '#8e2a1c'; ctx.beginPath(); ctx.arc(0.5, 0, 4.4, 0, 7); ctx.fill(); ctx.fillStyle = '#b8402a'; ctx.beginPath(); ctx.arc(0, -0.6, 2.8, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3.5, 1.5); ctx.stroke(); }
      else if (kind === 1) { ctx.fillStyle = '#f2ecdd'; ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, 7); ctx.fill(); ctx.strokeStyle = '#c8bb98'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0.4, 5.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 1.8, 1, 5); ctx.stroke(); }
      else if (kind === 2) { ctx.fillStyle = '#1e140e'; ctx.beginPath(); ctx.ellipse(0.5, 0, 6.5, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(-1, -2, 3, 4, 0, 0, 7); ctx.fill(); }
      else if (kind === 4) { ctx.fillStyle = '#ece6d8'; ctx.beginPath(); ctx.ellipse(1, 0, 6, 6.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.stroke(); }
      else { ctx.fillStyle = '#3a2618'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,220,180,0.25)'; ctx.beginPath(); ctx.arc(-1.2, -1.2, 1.6, 0, 7); ctx.fill(); }
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.drawImage(ground, 0, 0);
      // your stall: ground, mat, rugs
      ctx.save();
      ctx.translate(S.x + S.w / 2, S.y + S.h / 2);
      ctx.scale(big, big);
      ctx.translate(-S.w / 2, -S.h / 2);
      if (upgrades.includes('mat')) {
        ctx.fillStyle = '#6b2418';
        ctx.fillRect(-6, -6, S.w + 12, S.h + 12);
        ctx.strokeStyle = '#e8d6b0';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, S.w, S.h);
      } else {
        ctx.strokeStyle = 'rgba(90,60,25,0.5)';
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(0, 0, S.w, S.h);
        ctx.setLineDash([]);
      }
      const spots = [[18, 22, -0.08], [94, 16, 0.05], [165, 26, -0.03], [40, 68, 0.1], [130, 70, -0.06]];
      imgs.forEach((im, i) => {
        const [x, y, a] = spots[i];
        ctx.save();
        ctx.translate(x + 40, y + 22);
        ctx.rotate(a);
                ctx.save();
        ctx.filter = 'blur(3px)';
        ctx.fillStyle = 'rgba(30,16,6,0.35)';
        ctx.fillRect(-46, -22, 100, 56);
        ctx.restore();
        if (im.complete && im.naturalWidth) ctx.drawImage(im, -50, -28, 100, 54);
        else { ctx.fillStyle = '#8e2a1c'; ctx.fillRect(-50, -28, 100, 54); }
        const fold = ctx.createLinearGradient(-50, 0, 50, 0);
        fold.addColorStop(0, 'rgba(255,240,210,0.12)');
        fold.addColorStop(0.5, 'rgba(0,0,0,0)');
        fold.addColorStop(1, 'rgba(20,10,4,0.18)');
        ctx.fillStyle = fold;
        ctx.fillRect(-50, -28, 100, 54);
        ctx.strokeStyle = 'rgba(236,220,184,0.85)';
        ctx.lineWidth = 1;
        for (let k = -26; k <= 26; k += 3) {
          ctx.beginPath(); ctx.moveTo(-50, k); ctx.lineTo(-55, k + 0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(50, k); ctx.lineTo(55, k - 0.5); ctx.stroke();
        }
        ctx.restore();
      });
      // rolled rugs stacked along the back
      const rolls = ['#8e2a1c', '#2c3b6b', '#a8742a', '#6b2418', '#3e5a3a'];
      for (let i = 0; i < Math.min(5, 2 + g.inventory.length); i++) {
        const ry = S.h - 12 + (i % 2) * 5, rx = 8 + i * 30;
        ctx.fillStyle = 'rgba(30,16,6,0.3)'; roundRect(ctx, rx + 3, ry + 3, 28, 11, 5); ctx.fill();
        const rg = ctx.createLinearGradient(0, ry, 0, ry + 11);
        rg.addColorStop(0, 'rgba(255,240,210,0.35)'); rg.addColorStop(0.5, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = rolls[i % rolls.length]; roundRect(ctx, rx, ry, 28, 11, 5); ctx.fill();
        ctx.fillStyle = rg; roundRect(ctx, rx, ry, 28, 11, 5); ctx.fill();
      }
      if (upgrades.includes('display')) {
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(S.w - 18, -10, 6, S.h + 10);
      }
      if (upgrades.includes('tea')) {
        ctx.fillStyle = '#c98b3c';
        ctx.beginPath();
        ctx.arc(S.w - 34, S.h - 22, 11, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#f5e6c0';
        [[-4, -3], [4, -2], [0, 4]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(S.w - 34 + dx, S.h - 22 + dy, 2.2, 0, 7); ctx.fill(); });
      }
      // the merchant
      // cushion and the merchant sitting on it, facing the lane
      ctx.fillStyle = 'rgba(30,16,6,0.3)'; ctx.fillRect(S.w - 76, S.h - 50, 34, 30);
      ctx.fillStyle = '#7a2a1c'; roundRect(ctx, S.w - 80, S.h - 54, 34, 30, 6); ctx.fill();
      ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 1.5; roundRect(ctx, S.w - 77, S.h - 51, 28, 24, 4); ctx.stroke();
      person(S.w - 63, S.h - 39, '#4a3322', 3, now / 1000, Math.PI / 2, false);
      // Saffron curled up, tail twitching
      const cx = 30, cy = S.h - 22;
      ctx.fillStyle = 'rgba(30,18,8,0.3)';
      ctx.beginPath(); ctx.ellipse(cx + 4, cy + 3, 13, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e08a2e';
      ctx.beginPath(); ctx.ellipse(cx, cy, 12, 8.5, 0.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, cy - 4, 5.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 7, cy - 8); ctx.lineTo(cx + 9, cy - 13); ctx.lineTo(cx + 11, cy - 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 11, cy - 8); ctx.lineTo(cx + 14, cy - 12); ctx.lineTo(cx + 15, cy - 6); ctx.fill();
      ctx.strokeStyle = '#e08a2e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 2);
      ctx.quadraticCurveTo(cx - 18, cy + 10 + Math.sin(now / 400) * 4, cx - 6, cy + 10);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,80,20,0.6)'; ctx.lineWidth = 1.2;
      for (let k = -6; k <= 6; k += 4) { ctx.beginPath(); ctx.moveTo(cx + k, cy - 7); ctx.lineTo(cx + k + 1, cy + 7); ctx.stroke(); }
      if (upgrades.includes('bazaar')) {
        // the canopy's front edge only: a slim striped valance, so the stall under it stays visible
        const stripes = 14;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 ? 'rgba(122,36,22,0.75)' : 'rgba(226,204,160,0.7)';
          ctx.fillRect((i * (S.w + 20)) / stripes - 10, S.h - 8, (S.w + 20) / stripes + 0.5, 10);
        }
      }
      ctx.restore();
      // label
      ctx.fillStyle = 'rgba(18,11,6,0.75)';
      const label = `Your stall · ${stallName(upgrades)}`;
      ctx.font = '600 15px Georgia, serif';
      const tw = ctx.measureText(label).width;
      ctx.fillRect(S.x + S.w / 2 - tw / 2 - 8, S.y + S.h + 10, tw + 16, 22);
      ctx.fillStyle = '#efe0bf';
      ctx.fillText(label, S.x + S.w / 2 - tw / 2, S.y + S.h + 26);
      // passers-by and a donkey cart
      for (const w of walkers) {
        w.x += w.v * dt;
        w.t += dt;
        if (w.x < -20) w.x = W + 20;
        if (w.x > W + 20) w.x = -20;
        person(w.x, w.y, w.robe, w.kind, w.t, w.v < 0 ? Math.PI : 0);
      }
      cartX += 22 * dt;
      if (cartX > W + 160) cartX = -160;
      ctx.save();
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = 'rgba(30,16,6,0.35)';
      ctx.fillRect(cartX + 8, 240, 70, 36);
      ctx.beginPath(); ctx.ellipse(cartX + 96, 254, 22, 9, 0, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#2a1a0e'; ctx.fillRect(cartX + 22, 226, 22, 5); ctx.fillRect(cartX + 22, 265, 22, 5); // wheels
      ctx.fillStyle = '#8a6036'; ctx.fillRect(cartX, 231, 66, 34);
      ctx.strokeStyle = 'rgba(40,22,8,0.5)'; ctx.lineWidth = 1;
      for (let k = 237; k < 265; k += 6) { ctx.beginPath(); ctx.moveTo(cartX, k); ctx.lineTo(cartX + 66, k); ctx.stroke(); }
      for (let k = 0; k < 8; k++) {
        const mx = cartX + 10 + (k % 4) * 14, my = 240 + Math.floor(k / 4) * 15;
        const mg = ctx.createRadialGradient(mx - 2, my - 2, 1, mx, my, 7);
        mg.addColorStop(0, '#b8d070'); mg.addColorStop(1, '#4e6a22');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cartX + 66, 238); ctx.lineTo(cartX + 84, 244); ctx.moveTo(cartX + 66, 258); ctx.lineTo(cartX + 84, 252); ctx.stroke();
      const dg = ctx.createRadialGradient(cartX + 90, 245, 2, cartX + 92, 248, 18);
      dg.addColorStop(0, '#a49a8e'); dg.addColorStop(1, '#6e645a');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(cartX + 92, 248, 16, 7.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cartX + 78, 248); ctx.lineTo(cartX + 106, 248); ctx.stroke();
      ctx.fillStyle = '#7e746a'; ctx.beginPath(); ctx.ellipse(cartX + 112, 248, 7, 4.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.ellipse(cartX + 118, 248, 2.4, 2.8, 0, 0, 7); ctx.fill();
      const ear = Math.sin(now / 300) * 0.15;
      ctx.fillStyle = '#6e645a';
      ctx.beginPath(); ctx.ellipse(cartX + 106, 243, 6, 1.8, -0.35 + ear, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cartX + 106, 253, 6, 1.8, 0.35 - ear, 0, 7); ctx.fill();
      person(cartX + 96, 268, '#efe6d4', 1, now / 1000, 0);
      // late-afternoon light
      const lg = ctx.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, 'rgba(255,210,140,0.10)');
      lg.addColorStop(1, 'rgba(60,30,10,0.18)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(30,15,5,0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.join(), upgrades.join()]);

  return (
    <div className={`overhead ${compact ? 'compact' : ''}`} data-testid="stall-overhead">
      <img className="overhead-img" src="art/world/stall-top.jpg" alt="Your rug stall in the Giza bazaar, seen from above, with Saffron asleep on a rug" onClick={onOpen} />
      <span className="overhead-label">Your stall · {stallName(upgrades)}</span>
      {!compact && onOpen && <button className="btn overhead-open" onClick={onOpen}>Step into your stall</button>}
    </div>
  );
}
