import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { streetRoute } from '../../game/systems/streets';
import { createPortal } from 'react-dom';
import { takeMalekRequest, travelTo } from '../../game/nav';
import { IntroFilm, filmDue, filmReady, type FilmId } from '../IntroFilm/IntroFilm';
const unseen = (id: FilmId) => filmDue(id, useGame.getState().introSeen);
import { useGame, arrivalAt } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { SettlementPanel, type SetTab } from './Settlement';
import { Dialogue } from './Dialogue';
import { CafeRoom } from '../Cafe/CafeRoom';
const CafeTable = lazy(() => import('../Cafe/CafeTable').then((m) => ({ default: m.CafeTable })));
// Malek's grill loads only when you walk in
const MalekShop = lazy(() => import('../Malek/MalekShop'));
const ArranLab = lazy(() => import('../ArranLab/ArranLab').then((m) => ({ default: m.ArranLab })));

// Giza, seen from above: the lane with your stall, the coffee house, the souk, the animal market,
// the guard yard, the station, the ferry, the pyramids and the desert road. Walk to discover it.
const DW = 1536, DH = 1024; // matches art/world/giza-district.jpg
const FG = 8; // fog cell size
const FW = Math.ceil(DW / FG), FH = Math.ceil(DH / FG);
const REVEAL = 180;

interface Poi { id: string; name: string; sub: string; x: number; y: number; glyph: string }
export const POIS: Poi[] = [
  { id: 'stall', name: 'Your stall', sub: 'Open for buyers', x: 760, y: 522, glyph: 'S' },
  { id: 'coffee', name: "Bilgin's coffee house", sub: 'Gossip, rumours and advice', x: 842, y: 305, glyph: 'C' },
  { id: 'souk', name: 'Food souk', sub: 'Bread, dates and water for the road', x: 1080, y: 478, glyph: 'F' },
  { id: 'animals', name: 'Animal market', sub: 'Camels, horses, donkeys and mules', x: 565, y: 745, glyph: 'A' },
  { id: 'guards', name: 'Guard yard', sub: 'Hire men to guard your caravan', x: 930, y: 740, glyph: 'G' },
  { id: 'station', name: 'Giza station', sub: 'Trains north to Cairo and south up the valley', x: 1275, y: 330, glyph: 'R' },
  { id: 'ferry', name: 'Nile ferry', sub: 'Across the river to Cairo · £0.01', x: 1385, y: 680, glyph: 'N' },
  { id: 'lab', name: "Arran's laboratory", sub: 'Textile tests: fibre, dyes, fastness', x: 553, y: 318, glyph: 'L' },
  { id: 'malek', name: "Malek's grill", sub: 'Kofta, kebab, tea and road parcels', x: 690, y: 420, glyph: 'M' },
  { id: 'pyramids', name: 'The pyramids', sub: 'Tourists, guides and gossip', x: 225, y: 385, glyph: 'P' },
  { id: 'gate', name: 'Desert road', sub: 'Leave for the wider world', x: 90, y: 870, glyph: 'W' },
];
const START_SEEN = ['stall', 'coffee'];

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
function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function shadow(g: Ctx, blur: number, a: number, dx: number, dy: number, draw: () => void) {
  g.save();
  g.filter = `blur(${blur}px)`;
  g.fillStyle = `rgba(38,20,6,${a})`;
  g.translate(dx, dy);
  draw();
  g.restore();
}
function noise(g: Ctx, r: () => number, x: number, y: number, w: number, h: number, n: number, rgb: [number, number, number], a: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb[0] + (r() - 0.5) * 50},${rgb[1] + (r() - 0.5) * 40},${rgb[2] + (r() - 0.5) * 30},${a * (0.5 + r())})`;
    g.fillRect(x + r() * w, y + r() * h, 1 + r() * 1.8, 1 + r() * 1.8);
  }
}
function palm(g: Ctx, x: number, y: number, s = 1) {
  shadow(g, 5, 0.3, 16 * s, 12 * s, () => { g.beginPath(); g.arc(x, y, 30 * s, 0, 7); g.fill(); });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + x;
    const len = (26 + (i % 3) * 4) * s;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = x + Math.cos(a + 0.15) * len * 0.55, my = y + Math.sin(a + 0.15) * len * 0.55 - 3;
    g.strokeStyle = i % 2 ? '#56722c' : '#44601e';
    g.lineWidth = 1.8 * s;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    for (let t = 0.25; t < 1; t += 0.12) {
      const qx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * ex;
      const qy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * ey;
      const n = a + Math.PI / 2, l = 5.5 * s * (1 - t * 0.6);
      g.strokeStyle = '#678a34';
      g.lineWidth = 1.2 * s;
      g.beginPath(); g.moveTo(qx - Math.cos(n) * l, qy - Math.sin(n) * l); g.lineTo(qx + Math.cos(n) * l, qy + Math.sin(n) * l); g.stroke();
    }
  }
  g.fillStyle = '#6b4a22'; g.beginPath(); g.arc(x, y, 4 * s, 0, 7); g.fill();
}
function pyramid(g: Ctx, px: number, py: number, ps: number) {
  const tri = (pts: number[][], c: string) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
  };
  shadow(g, 12, 0.28, ps * 0.35, ps * 0.28, () => tri([[px - ps, py + ps], [px + ps, py + ps], [px + ps, py - ps], [px, py]], '#000'));
  tri([[px - ps, py - ps], [px + ps, py - ps], [px, py]], '#efd7a0');
  tri([[px - ps, py - ps], [px - ps, py + ps], [px, py]], '#e0c088');
  tri([[px - ps, py + ps], [px + ps, py + ps], [px, py]], '#a9834b');
  tri([[px + ps, py - ps], [px + ps, py + ps], [px, py]], '#bb9357');
  g.strokeStyle = 'rgba(80,55,25,0.2)'; g.lineWidth = 1;
  for (let k = 7; k < ps; k += 7) g.strokeRect(px - k, py - k, k * 2, k * 2);
  g.strokeStyle = 'rgba(255,245,215,0.4)';
  g.beginPath(); g.moveTo(px, py); g.lineTo(px - ps, py - ps); g.stroke();
}
function awning(g: Ctx, x: number, y: number, w: number, h: number, c1: string, c2: string, scallopDown: boolean) {
  shadow(g, 6, 0.38, 10, 8, () => g.fillRect(x, y, w, h));
  const n = Math.max(3, Math.round(w / 13));
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(x + (i * w) / n, y, w / n + 0.6, h); }
  const sag = g.createLinearGradient(0, y, 0, y + h);
  sag.addColorStop(0, 'rgba(255,245,220,0.22)'); sag.addColorStop(0.5, 'rgba(40,20,5,0.16)'); sag.addColorStop(1, 'rgba(255,245,220,0.1)');
  g.fillStyle = sag; g.fillRect(x, y, w, h);
  const ey = scallopDown ? y + h : y;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? c1 : c2;
    g.beginPath(); g.arc(x + ((i + 0.5) * w) / n, ey, w / n / 2, scallopDown ? 0 : Math.PI, scallopDown ? Math.PI : Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(50,28,10,0.5)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  for (const [qx, qy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.fillStyle = '#4a2e16'; g.beginPath(); g.arc(qx, qy, 2.6, 0, 7); g.fill(); }
}
function roof(g: Ctx, r: () => number, x: number, y: number, w: number, h: number) {
  shadow(g, 4, 0.35, 7, 7, () => g.fillRect(x, y, w, h));
  const t = 186 + r() * 28;
  g.fillStyle = `rgb(${t},${t - 30},${t - 78})`;
  g.fillRect(x, y, w, h);
  noise(g, r, x, y, w, h, (w * h) / 30, [t - 20, t - 50, t - 95], 0.2);
  g.strokeStyle = 'rgba(255,240,210,0.32)'; g.lineWidth = 2.5; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  g.strokeStyle = 'rgba(80,50,20,0.35)'; g.lineWidth = 1; g.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  const k = r();
  if (k < 0.35 && w > 30) {
    const jx = x + 10 + r() * (w - 20), jy = y + 10 + r() * (h - 20);
    const jg = g.createRadialGradient(jx - 2, jy - 2, 1, jx, jy, 5.5);
    jg.addColorStop(0, '#c98b5a'); jg.addColorStop(1, '#7a4a26');
    g.fillStyle = jg; g.beginPath(); g.arc(jx, jy, 5.5, 0, 7); g.fill();
    g.fillStyle = '#3a2210'; g.beginPath(); g.arc(jx, jy, 2, 0, 7); g.fill();
  } else if (k < 0.6 && w > 36) {
    const ly = y + 8 + r() * (h - 16);
    g.strokeStyle = 'rgba(60,40,20,0.6)'; g.beginPath(); g.moveTo(x + 5, ly); g.lineTo(x + w - 5, ly); g.stroke();
    for (let q = x + 8; q < x + w - 12; q += 8 + r() * 6) {
      g.fillStyle = ['#efe6d4', '#3c4f7a', '#9a3326', '#d8b25a', '#ffffff'][Math.floor(r() * 5)];
      g.fillRect(q, ly - 1, 5, 7 + r() * 5);
    }
  } else if (k < 0.7) {
    g.fillStyle = 'rgba(60,40,20,0.45)'; g.fillRect(x + w - 16, y + 6, 10, 10); // stair head
  }
}
function camelTop(g: Ctx, x: number, y: number, a: number, coat = '#b88c55') {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = 'rgba(30,16,6,0.3)'; g.beginPath(); g.ellipse(5, 5, 16, 8, 0, 0, 7); g.fill();
  g.fillStyle = coat; g.beginPath(); g.ellipse(0, 0, 14, 7, 0, 0, 7); g.fill();
  g.strokeStyle = coat; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(11, 0); g.quadraticCurveTo(18, -1, 22, 0); g.stroke();
  g.fillStyle = coat; g.beginPath(); g.ellipse(25, 0, 4.5, 2.8, 0, 0, 7); g.fill();
  const hg = g.createRadialGradient(-1, -1, 1, 0, 0, 7);
  hg.addColorStop(0, 'rgba(255,240,210,0.5)'); hg.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = hg; g.beginPath(); g.ellipse(-1, 0, 7, 5, 0, 0, 7); g.fill();
  g.restore();
}
function donkeyTop(g: Ctx, x: number, y: number, a: number) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = 'rgba(30,16,6,0.3)'; g.beginPath(); g.ellipse(4, 4, 11, 5.5, 0, 0, 7); g.fill();
  g.fillStyle = '#8c8176'; g.beginPath(); g.ellipse(0, 0, 10, 5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(13, 0, 4.5, 3, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(10, -3.5, 4, 1.2, -0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(10, 3.5, 4, 1.2, 0.4, 0, 7); g.fill();
  g.fillStyle = '#e8e0d0'; g.beginPath(); g.arc(16.5, 0, 1.8, 0, 7); g.fill();
  g.restore();
}
function horseTop(g: Ctx, x: number, y: number, a: number, coat: string) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = 'rgba(30,16,6,0.3)'; g.beginPath(); g.ellipse(5, 5, 14, 6, 0, 0, 7); g.fill();
  g.fillStyle = coat; g.beginPath(); g.ellipse(0, 0, 13, 5.5, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(15, 0, 6, 3, 0, 0, 7); g.fill();
  g.strokeStyle = '#1e140c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-13, 0); g.lineTo(-19, 1); g.stroke();
  g.restore();
}
function personStatic(g: Ctx, x: number, y: number, robe: string, head: string, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = 'rgba(30,16,6,0.3)'; g.beginPath(); g.ellipse(4, 3, 7, 5, 0.3, 0, 7); g.fill();
  g.fillStyle = robe; g.beginPath(); g.ellipse(0, 0, 4.5, 6.5, 0, 0, 7); g.fill();
  g.fillStyle = head; g.beginPath(); g.arc(0.3, 0, 3, 0, 7); g.fill();
  g.restore();
}

function paintDistrict(g: Ctx) {
  const r = mulberry(11);
  // desert to the west, town ground in the middle
  const base = g.createLinearGradient(0, 0, DW, 0);
  base.addColorStop(0, '#e2c58e'); base.addColorStop(0.38, '#d8b980'); base.addColorStop(0.45, '#cdae78'); base.addColorStop(1, '#c4a472');
  g.fillStyle = base; g.fillRect(0, 0, DW, DH);
  for (let i = 0; i < 160; i++) {
    const x = r() * DW, y = r() * DH, rad = 30 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.5 ? 'rgba(120,85,45,0.1)' : 'rgba(250,232,190,0.14)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  noise(g, r, 0, 0, DW, DH, 26000, [150, 115, 70], 0.1);
  // wind ripples on the plateau
  g.strokeStyle = 'rgba(160,120,70,0.18)'; g.lineWidth = 1.2;
  for (let i = 0; i < 90; i++) {
    const x = r() * 520, y = r() * DH;
    g.beginPath(); for (let k = 0; k < 40; k += 4) g.lineTo(x + k, y + Math.sin((x + k) * 0.2) * 1.5); g.stroke();
  }

  // the Nile, feluccas, reeds and the far bank
  g.save();
  g.beginPath();
  g.moveTo(1190, 0); g.bezierCurveTo(1160, 250, 1210, 520, 1175, 760); g.bezierCurveTo(1160, 880, 1180, 950, 1170, DH);
  g.lineTo(1330, DH); g.bezierCurveTo(1350, 800, 1320, 500, 1345, 260); g.lineTo(1350, 0); g.closePath();
  const rv = g.createLinearGradient(1170, 0, 1350, 0);
  rv.addColorStop(0, '#5c7a78'); rv.addColorStop(0.5, '#6d8b86'); rv.addColorStop(1, '#58766f');
  g.fillStyle = rv; g.fill();
  g.clip();
  g.strokeStyle = 'rgba(230,240,230,0.14)'; g.lineWidth = 1.2;
  for (let i = 0; i < 180; i++) { const x = 1160 + r() * 200, y = r() * DH; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 2, x + 14, y); g.stroke(); }
  g.restore();
  g.fillStyle = '#c9b07a'; g.fillRect(1345, 0, 60, DH);
  g.fillStyle = 'rgba(70,95,40,0.5)'; g.fillRect(1352, 0, 50, DH);
  for (let y = 0; y < DH; y += 7) {
    for (const bx of [1180 + Math.sin(y * 0.01) * 12, 1340]) {
      g.strokeStyle = r() < 0.5 ? '#6f8a3a' : '#57702c'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(bx + (r() - 0.5) * 8, y); g.lineTo(bx + (r() - 0.5) * 14, y - 7 - r() * 5); g.stroke();
    }
  }
  const felucca = (x: number, y: number, a: number) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(20,30,30,0.3)'; g.beginPath(); g.ellipse(4, 4, 16, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#6b4a2a'; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#f2ecdd'; g.beginPath(); g.moveTo(-14, -2); g.quadraticCurveTo(0, -18, 18, -4); g.lineTo(-10, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,60,40,0.6)'; g.lineWidth = 1; g.stroke();
    g.restore();
  };
  felucca(1260, 200, 1.3); felucca(1240, 720, -1.7); felucca(1290, 880, 1.5);
  // ferry landing
  g.fillStyle = '#7a5530'; g.fillRect(1175, 455, 60, 18);
  g.strokeStyle = 'rgba(40,22,8,0.5)'; for (let k = 1180; k < 1235; k += 6) { g.beginPath(); g.moveTo(k, 455); g.lineTo(k, 473); g.stroke(); }
  g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(1255, 464, 22, 8, 0, 0, 7); g.fill();
  g.fillStyle = '#8a6036'; g.fillRect(1240, 459, 30, 10);

  // fields between the railway and the river
  const field = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(40,60,20,0.25)'; g.lineWidth = 1;
    for (let k = y + 4; k < y + h; k += 5) { g.beginPath(); g.moveTo(x, k); g.lineTo(x + w, k); g.stroke(); }
    g.strokeStyle = 'rgba(90,120,120,0.6)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  };
  const greens = ['#7d963e', '#8fa44a', '#6c8a36', '#a0a852', '#7b8e3c'];
  for (let y = 0; y < DH; y += 46) {
    for (let x = 1130; x < 1175; x += 46) field(x, y, 44, 44, greens[Math.floor(r() * greens.length)]);
  }
  for (let y = 700; y < DH; y += 50) for (let x = 990; x < 1110; x += 58) field(x, y, 56, 48, greens[Math.floor(r() * greens.length)]);
  for (let y = 10; y < 190; y += 50) for (let x = 900; x < 1030; x += 62) field(x, y, 60, 48, greens[Math.floor(r() * greens.length)]);

  // railway: Egyptian State Railways, Upper Egypt line
  g.fillStyle = 'rgba(120,100,80,0.5)'; g.fillRect(1100, 0, 22, DH);
  g.fillStyle = '#5a4030'; for (let y = 0; y < DH; y += 7) g.fillRect(1100, y, 22, 3);
  g.strokeStyle = '#3a3a3a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(1105, 0); g.lineTo(1105, DH); g.moveTo(1117, 0); g.lineTo(1117, DH); g.stroke();
  // station: long roof and platform
  shadow(g, 4, 0.35, 8, 7, () => g.fillRect(1000, 210, 94, 80));
  g.fillStyle = '#b86a3a'; g.fillRect(1000, 210, 94, 80);
  g.fillStyle = '#9a5530'; g.fillRect(1047, 210, 47, 80);
  g.strokeStyle = 'rgba(60,30,10,0.4)'; for (let y = 216; y < 290; y += 6) { g.beginPath(); g.moveTo(1000, y); g.lineTo(1094, y); g.stroke(); }
  g.fillStyle = '#d8c8a8'; g.fillRect(1094, 200, 6, 110);
  g.fillStyle = '#2e2a26'; g.fillRect(1103, 120, 17, 70); g.fillStyle = '#4a3a2a'; g.fillRect(1103, 125, 17, 60); // waiting train
  g.fillStyle = '#1e1e1e'; g.fillRect(1103, 190, 17, 26);

  // desert road to the southwest, with a milestone gate
  g.strokeStyle = 'rgba(140,100,55,0.45)'; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(580, 710); g.bezierCurveTo(430, 760, 300, 820, 90, 900); g.stroke();
  g.strokeStyle = 'rgba(110,75,40,0.35)'; g.lineWidth = 1.5; g.setLineDash([6, 8]);
  g.beginPath(); g.moveTo(580, 705); g.bezierCurveTo(430, 755, 300, 815, 90, 895); g.stroke(); g.setLineDash([]);
  for (const [x, y] of [[98, 862], [128, 902]]) { shadow(g, 3, 0.4, 5, 4, () => g.fillRect(x - 6, y - 6, 12, 12)); g.fillStyle = '#cdb68a'; g.fillRect(x - 6, y - 6, 12, 12); g.strokeStyle = '#8a6a42'; g.strokeRect(x - 6, y - 6, 12, 12); }
  for (let i = 0; i < 4; i++) camelTop(g, 190 + i * 34, 860 - i * 12, -0.35, ['#b88c55', '#c9a36b', '#a07a48', '#d8bf90'][i]);

  // pyramids of Khufu, Khafre and Menkaure, and the Sphinx
  pyramid(g, 400, 215, 130);
  pyramid(g, 235, 400, 118);
  pyramid(g, 105, 575, 62);
  for (const [x, y] of [[520, 320], [540, 345], [560, 300]]) { shadow(g, 2, 0.4, 3, 3, () => g.fillRect(x - 8, y - 8, 16, 16)); g.fillStyle = '#d9bd86'; g.fillRect(x - 8, y - 8, 16, 16); } // queens' tombs
  shadow(g, 4, 0.4, 6, 5, () => { g.fillRect(470, 470, 50, 14); });
  g.fillStyle = '#d2b27a'; rr(g, 470, 470, 50, 14, 5); g.fill();
  g.fillStyle = '#c4a26a'; g.beginPath(); g.ellipse(522, 477, 9, 8, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(90,60,30,0.4)'; g.fillRect(496, 466, 30, 4); g.fillRect(496, 484, 30, 4); // paws
  // tourists and a guide with camels near Khufu
  for (const [x, y, c] of [[500, 250, '#f2ecdd'], [512, 258, '#2e2a26'], [505, 268, '#e8dcc0'], [530, 240, '#f2ecdd']] as [number, number, string][]) personStatic(g, x, y, c, c === '#2e2a26' ? '#1a1a1a' : '#f5f0e6');
  camelTop(g, 548, 262, 0.4); camelTop(g, 560, 285, 0.2, '#c9a36b');

  // town blocks: roofs between the lanes
  const lanes = [
    { x: 560, y: 540, w: 530, h: 140 }, // bazaar lane
    { x: 560, y: 745, w: 530, h: 30 }, // south lane
    { x: 818, y: 360, w: 30, h: 640 }, // north-south lane
    { x: 560, y: 360, w: 30, h: 640 }, // west edge lane
  ];
  const yards = [
    { x: 575, y: 780, w: 205, h: 175 }, // animal market
    { x: 800, y: 790, w: 170, h: 150 }, // guard yard
    { x: 855, y: 470, w: 100, h: 68 }, // coffee house terrace
    { x: 960, y: 560, w: 125, h: 110 }, // food souk
  ];
  const blocked = (x: number, y: number, w: number, h: number) => [...lanes, ...yards].some((b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y);
  for (let y = 365; y < 1000; y += 0) {
    const bh = 40 + r() * 30;
    for (let x = 592; x < 1092; x += 0) {
      const bw = 34 + r() * 44;
      if (!blocked(x, y, bw, bh)) roof(g, r, x, y, bw - 3, bh - 3);
      x += bw;
    }
    y += bh;
  }
  // lanes: packed earth with stones in the bazaar
  const stones = (L: { x: number; y: number; w: number; h: number }, dense: boolean) => {
    g.fillStyle = '#b8935c'; g.fillRect(L.x, L.y, L.w, L.h);
    if (dense) {
      for (let y = L.y + 2; y < L.y + L.h - 3; ) {
        const h = 10 + r() * 6;
        for (let x = L.x - r() * 16; x < L.x + L.w; ) {
          const w = 12 + r() * 14, t = 150 + r() * 40;
          g.fillStyle = `rgb(${t + 20},${t - 5},${t - 45})`;
          rr(g, x + 1, y + 1, w - 2, h - 2, 3); g.fill();
          x += w;
        }
        y += h;
      }
    }
    noise(g, r, L.x, L.y, L.w, L.h, (L.w * L.h) / 20, [120, 90, 50], 0.15);
  };
  stones({ x: 560, y: 595, w: 530, h: 38 }, true);
  stones(lanes[1], false); stones(lanes[2], false); stones(lanes[3], false);
  // bazaar stalls on both sides of the lane
  const cols = [['#9a3326', '#ecdcb8'], ['#2c3b6b', '#ecdcb8'], ['#6f7a3c', '#ecdcb8'], ['#8e5a1c', '#ecdcb8'], ['#6b2418', '#e8d6b0']];
  const goods = (x: number, y: number, w: number, kind: number) => {
    for (let i = 0; i < Math.floor(w / 13); i++) {
      const cx = x + 7 + i * 13;
      const c = [['#c9451f', '#d9a31e', '#6d8a2a'], ['#d99a4a', '#c98b3c', '#e0a860'], ['#8a4b26', '#6e3a1a', '#9a5a2e'], ['#2c3b6b', '#9a3326', '#e8d6b0'], ['#e8d6a0', '#b8904e', '#6d8a2a']][kind % 5][i % 3];
      const gg = g.createRadialGradient(cx - 2, y - 2, 0.5, cx, y, 6);
      gg.addColorStop(0, 'rgba(255,240,200,0.8)'); gg.addColorStop(0.35, c); gg.addColorStop(1, c);
      g.fillStyle = gg; g.beginPath(); g.arc(cx, y, 5.5, 0, 7); g.fill();
    }
  };
  let k = 0;
  for (let x = 596; x < 1082 - 60; x += 70) {
    if (x > 950) break;
    if (x + 62 > 818 && x < 848) continue;
    const [c1, c2] = cols[k % cols.length];
    g.fillStyle = '#7a5530'; g.fillRect(x + 4, 580, 56, 14); goods(x + 4, 587, 56, k);
    awning(g, x, 544, 64, 36, c1, c2, true);
    k++;
  }
  k = 2;
  for (let x = 596; x < 950; x += 70) {
    if (x + 62 > 818 && x < 848) continue;
    if (x >= 680 && x <= 760) continue; // your stall
    const [c1, c2] = cols[k % cols.length];
    g.fillStyle = '#7a5530'; g.fillRect(x + 4, 634, 56, 14); goods(x + 4, 641, 56, k);
    awning(g, x, 646, 64, 32, c1, c2, false);
    k++;
  }
  // your stall: open ground with rugs laid out, a cushion and rolled rugs
  g.strokeStyle = 'rgba(90,60,25,0.6)'; g.setLineDash([5, 4]); g.lineWidth = 1.2; g.strokeRect(668, 636, 108, 44); g.setLineDash([]);
  const rug = (x: number, y: number, w: number, h: number, a: number, c: string, b: string) => {
    g.save(); g.translate(x, y); g.rotate(a);
    shadow(g, 2, 0.35, 3, 3, () => g.fillRect(-w / 2, -h / 2, w, h));
    g.fillStyle = b; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = c; g.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    g.strokeStyle = b; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, w * 0.22, h * 0.28, 0, 0, 7); g.stroke();
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 2.5, 0, 7); g.fill();
    g.restore();
  };
  rug(696, 655, 40, 24, -0.08, '#9a2e22', '#1e2a4a');
  rug(740, 657, 40, 24, 0.06, '#2c3b6b', '#c9974a');
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#8e2a1c', '#2c3b6b', '#a8742a'][i]; rr(g, 672 + i * 22, 670, 20, 7, 3); g.fill(); }
  // coffee house: a vine pergola over little tables
  shadow(g, 4, 0.35, 7, 6, () => g.fillRect(855, 470, 100, 68));
  g.fillStyle = '#b89a6a'; g.fillRect(855, 470, 100, 68);
  for (let i = 0; i < 6; i++) { const tx = 872 + (i % 3) * 30, ty = 488 + Math.floor(i / 3) * 30; g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(tx, ty, 6, 0, 7); g.fill(); g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(tx, ty, 2, 0, 7); g.fill(); personStatic(g, tx - 10, ty + 2, ['#efe6d4', '#3c4f7a', '#7a5a3a'][i % 3], i % 2 ? '#8e2a1c' : '#f2ecdd', 1.57); }
  g.strokeStyle = 'rgba(60,90,30,0.85)'; g.lineWidth = 3;
  for (let x = 858; x < 955; x += 14) { g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 538); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,130,50,0.8)' : 'rgba(70,110,40,0.8)'; g.beginPath(); g.arc(858 + r() * 96, 472 + r() * 64, 4 + r() * 4, 0, 7); g.fill(); }
  // food souk: sacks, baskets and bread
  g.fillStyle = '#c6a46e'; g.fillRect(960, 560, 125, 110);
  for (let i = 0; i < 20; i++) {
    const x = 972 + (i % 5) * 23, y = 574 + Math.floor(i / 5) * 24;
    const c = ['#e8d6a0', '#6d8a2a', '#a8331f', '#d9a31e', '#b86a2a', '#f0e0b0'][i % 6];
    shadow(g, 2, 0.35, 3, 3, () => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
    g.fillStyle = '#b8904e'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    const sg = g.createRadialGradient(x - 2, y - 2, 0.5, x, y, 7);
    sg.addColorStop(0, '#fff2c8'); sg.addColorStop(0.4, c); sg.addColorStop(1, c);
    g.fillStyle = sg; g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill();
  }
  awning(g, 962, 560, 120, 18, '#9a3326', '#ecdcb8', true);
  // animal market: a fenced yard with camels, horses and donkeys and a trough
  g.fillStyle = '#c9a66e'; g.fillRect(575, 780, 205, 175);
  noise(g, r, 575, 780, 205, 175, 900, [120, 85, 45], 0.25);
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(90,60,25,0.25)'; g.beginPath(); g.ellipse(580 + r() * 195, 785 + r() * 165, 2, 3, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.strokeRect(575, 780, 205, 175);
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(677, 780); g.lineTo(677, 955); g.stroke();
  for (let x = 575; x <= 780; x += 12) { g.fillStyle = '#4a2e16'; g.beginPath(); g.arc(x, 780, 2, 0, 7); g.arc(x, 955, 2, 0, 7); g.fill(); }
  g.fillStyle = '#8a8a86'; g.fillRect(690, 800, 70, 10); g.fillStyle = '#5c7a78'; g.fillRect(692, 802, 66, 6);
  const cc = ['#b88c55', '#c9a36b', '#e0cfa8', '#eee3c8', '#a07a48', '#b48a57'];
  for (let i = 0; i < 7; i++) camelTop(g, 600 + (i % 2) * 40 + (i * 13) % 20, 800 + i * 21, (i % 3 - 1) * 0.5, cc[i % cc.length]);
  horseTop(g, 710, 840, 0.3, '#7a4a2a'); horseTop(g, 740, 870, -0.2, '#d9d6cf'); horseTop(g, 705, 900, 0.1, '#3a2a22');
  donkeyTop(g, 745, 915, 2.8); donkeyTop(g, 720, 935, 3.0); donkeyTop(g, 760, 940, 2.6);
  personStatic(g, 680, 825, '#efe6d4', '#f2ecdd'); personStatic(g, 660, 905, '#3c4f7a', '#8e2a1c');
  // guard yard: walled court, a tent, a fire and men at arms
  g.fillStyle = '#bfa06c'; g.fillRect(800, 790, 170, 150);
  g.strokeStyle = '#a0825a'; g.lineWidth = 8; g.strokeRect(804, 794, 162, 142);
  g.strokeStyle = 'rgba(255,240,210,0.3)'; g.lineWidth = 2; g.strokeRect(800, 790, 170, 150);
  shadow(g, 4, 0.35, 7, 6, () => g.fillRect(900, 810, 55, 45));
  g.fillStyle = '#3a2a1c'; g.fillRect(900, 810, 55, 45);
  g.strokeStyle = '#6b5a3a'; g.lineWidth = 1; for (let x = 903; x < 955; x += 6) { g.beginPath(); g.moveTo(x, 810); g.lineTo(x, 855); g.stroke(); }
  const fg = g.createRadialGradient(850, 880, 1, 850, 880, 14);
  fg.addColorStop(0, '#ffdb7a'); fg.addColorStop(0.4, '#e0602a'); fg.addColorStop(1, 'rgba(60,20,5,0)');
  g.fillStyle = fg; g.beginPath(); g.arc(850, 880, 14, 0, 7); g.fill();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, x = 850 + Math.cos(a) * 26, y = 880 + Math.sin(a) * 22;
    personStatic(g, x, y, ['#5a4a36', '#e8e0d0', '#3a4a3a', '#6b4a2a'][i % 4], i % 3 === 0 ? '#ece6d8' : '#2a1a10', a + Math.PI / 2);
    g.strokeStyle = '#2a1a0e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 3, y - 3); g.lineTo(x + 12, y - 9); g.stroke(); // rifle
  }
  g.strokeStyle = '#6b4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(820, 920); g.lineTo(890, 920); g.stroke(); // hitching rail
  horseTop(g, 830, 925, 1.57, '#6b3a1c'); horseTop(g, 860, 925, 1.57, '#2a1a12');
  // palms and a sabil fountain
  for (const [x, y, s] of [[590, 470, 1], [640, 500, 0.8], [1070, 700, 1], [960, 330, 1.1], [700, 380, 0.9], [540, 720, 1], [1150, 360, 0.9], [1150, 600, 1], [1160, 820, 0.9], [500, 640, 0.8], [880, 400, 0.8]]) palm(g, x, y, s);
  g.fillStyle = '#e6d8b8'; g.beginPath(); g.arc(833, 610, 9, 0, 7); g.fill(); g.fillStyle = '#5c7a78'; g.beginPath(); g.arc(833, 610, 5, 0, 7); g.fill();
}

interface Walker { x: number; y: number; vx: number; vy: number; robe: string; head: string; t: number; lane: number }

/** Game minutes that pass per real second at 1x while you are down in the district. */
const LOCAL_MIN_PER_SEC = 10;

export function District({ onStall, onWorld, initialPanel = null, onPanelClosed, scale = 1, frozen = false, onZoomOut, startZoomedOut = false }: { onStall: () => void; onWorld: (openPanel?: string) => void; initialPanel?: SetTab | null; onPanelClosed?: () => void; scale?: number; frozen?: boolean; onZoomOut?: () => void; startZoomedOut?: boolean }) {
  const g = useGame();
  const box = useRef<HTMLDivElement>(null);
  const walked = useRef(0);
  const cvs = useRef<HTMLCanvasElement>(null);
  const d0 = g.world.district;
  const initFog = useMemo(() => {
    if (d0?.fog && d0.fog.length === FW * FH) return d0.fog.split('').map((c) => c === '1');
    const f = new Array(FW * FH).fill(false);
    return f;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useRef({
    x: d0?.x ?? 760, y: d0?.y ?? 468, tx: d0?.x ?? 760, ty: d0?.y ?? 468,
    fog: initFog, seen: new Set<string>([...(d0?.seen?.length ? d0.seen : START_SEEN), 'lab', 'malek']),
    target: null as string | null, route: [] as { x: number; y: number }[], dirty: true,
  });
  const [cam, setCam] = useState({ s: startZoomedOut ? 0.01 : 1, cx: d0?.x ?? 760, cy: d0?.y ?? 480 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const [seen, setSeen] = useState<string[]>([...st.current.seen]);
  const [toast, setToast] = useState('');
  const [panel, setPanel] = useState<SetTab | null>(initialPanel);
  const [talk, setTalk] = useState(false);
  const [cafe, setCafe] = useState<false | 'chess' | 'tawla'>(false);
  const [room, setRoom] = useState(false);
  const [lab, setLab] = useState(false);
  const [malek, setMalek] = useState(false);
  // the film over the lab or the coffee house: by itself the first time, then on request
  const [film, setFilm] = useState<FilmId | null>(null);
  // asked for from the stall or the evening strip ("Lunch at Malek's"): the app shows the map afresh
  // (a new district), and that district opens the shop as it mounts
  useEffect(() => { if (takeMalekRequest()) setMalek(true); }, []);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNote(''); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [note]);

  const reveal = (x: number, y: number) => {
    const s = st.current;
    const cr = Math.ceil(REVEAL / FG);
    const cx = Math.floor(x / FG), cy = Math.floor(y / FG);
    let changed = false;
    for (let j = -cr; j <= cr; j++) for (let i = -cr; i <= cr; i++) {
      const X = cx + i, Y = cy + j;
      if (X < 0 || Y < 0 || X >= FW || Y >= FH) continue;
      if (i * i + j * j > cr * cr) continue;
      const k = Y * FW + X;
      if (!s.fog[k]) { s.fog[k] = true; changed = true; }
    }
    if (changed) s.dirty = true;
    for (const p of POIS) {
      if (!s.seen.has(p.id) && Math.hypot(p.x - x, p.y - y) < REVEAL + 20) {
        s.seen.add(p.id);
        setSeen([...s.seen]);
        setToast(`Found: ${p.name}`);
        audio.sfx('pen');
      }
    }
  };

  const save = () => {
    const s = st.current;
    useGame.getState().setDistrict({ x: Math.round(s.x), y: Math.round(s.y), fog: s.fog.map((b) => (b ? '1' : '0')).join(''), seen: [...s.seen] });
  };

  const arrive = (id: string) => {
    save();
    switch (id) {
      case 'stall': onStall(); break;
      case 'coffee': setRoom(true); if (unseen('abuhamid')) setFilm('abuhamid'); break;
      case 'lab': setLab(true); if (unseen('arran')) setFilm('arran'); break;
      case 'malek': setMalek(true); break;
      case 'souk': setPanel('market'); break;
      case 'animals': setPanel('animals'); break;
      case 'guards': setPanel('guards'); break;
      case 'station': onWorld(); break;
      case 'gate': onWorld(); break;
      case 'ferry': {
        // hand off to the world map so the crossing actually plays out (a moving boat, the river)
        // instead of snapping straight to the far bank the instant it's booked
        if (useGame.getState().cash < 1) setNote('The ferryman wants a piastre.');
        else travelTo('cairo');
        break;
      }
      case 'pyramids': {
        const lines = [
          'A guide in a white galabiya offers to show you the Great Pyramid. Two Americans argue about the price of a camel ride. You note the hotel names on their luggage: Mena House.',
          'Tourists from a Cook\'s party wander past. One lady asks whether you sell "real Persian". Tomorrow she may come to the lane.',
          'The guards at the plateau say the excavators at Saqqara have money this season and pay well for mats and carpets for their camp.',
        ];
        setNote(lines[Math.floor(Math.random() * lines.length)]);
        break;
      }
    }
  };

  const walkTo = (x: number, y: number, target: string | null) => {
    const s = st.current;
    // keep to the streets: the way there, point by point
    const way = streetRoute('giza', { x: s.x, y: s.y }, { x: Math.max(10, Math.min(DW - 10, x)), y: Math.max(10, Math.min(DH - 10, y)) }, !!target);
    const first = way.shift()!;
    s.tx = first.x; s.ty = first.y;
    s.route = way;
    s.target = target;
    audio.sfx('step');
  };

  // render loop
  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // painted district map; the old procedural painter draws until it has loaded
    // the painted district; the drawn fallback is only used if the painting cannot load
    let bg: HTMLCanvasElement | null = null;
    let bgImg: HTMLImageElement | null = null;
    { const im = new Image(); im.onload = () => { bgImg = im; }; im.onerror = () => { const f = document.createElement('canvas'); f.width = DW; f.height = DH; paintDistrict(f.getContext('2d')!); bg = f; }; im.src = 'art/world/giza-district.jpg'; }
    const fogC = document.createElement('canvas');
    fogC.width = FW; fogC.height = FH;
    const fctx = fogC.getContext('2d')!;
    const drawFog = () => {
      const img = fctx.createImageData(FW, FH);
      const f = st.current.fog;
      for (let i = 0; i < f.length; i++) { img.data[i * 4] = 70; img.data[i * 4 + 1] = 50; img.data[i * 4 + 2] = 30; img.data[i * 4 + 3] = f[i] ? 0 : 140; }
      fctx.putImageData(img, 0, 0);
      soft.clearRect(0, 0, softC.width, softC.height);
      soft.filter = 'blur(10px)';
      soft.drawImage(fogC, 0, 0, softC.width, softC.height);
      soft.filter = 'none';
    };
    const softC = document.createElement('canvas');
    softC.width = DW / 2; softC.height = DH / 2;
    const soft = softC.getContext('2d')!;
    reveal(st.current.x, st.current.y);
    const r = mulberry(5);
    const robes = ['#efe6d4', '#3c4f7a', '#7a5a3a', '#ddd2bd', '#2e2a26', '#8a6a4a'];
    const heads = ['#8e2a1c', '#f2ecdd', '#1e140e', '#3a2618', '#ece6d8'];
    const walkers: Walker[] = Array.from({ length: 26 }, (_, i) => {
      const lane = i % 3;
      const v = (r() < 0.5 ? -1 : 1) * (14 + r() * 14);
      return lane === 0 ? { x: 570 + r() * 520, y: 600 + r() * 28, vx: v, vy: 0, robe: robes[i % 6], head: heads[i % 5], t: r() * 10, lane }
        : lane === 1 ? { x: 825 + r() * 18, y: 370 + r() * 620, vx: 0, vy: v, robe: robes[(i + 2) % 6], head: heads[(i + 1) % 5], t: r() * 10, lane }
        : { x: 570 + r() * 520, y: 752 + r() * 16, vx: v, vy: 0, robe: robes[(i + 4) % 6], head: heads[(i + 3) % 5], t: r() * 10, lane };
    });
    const faces: Record<string, HTMLImageElement> = {};
    const face = (id: string) => { if (!faces[id]) { const im = new Image(); im.src = `art/portraits/${id}.jpg`; faces[id] = im; } return faces[id]; };
    const stallPoi = POIS[0];
    // the same painted walking figure used for "you" on the world map between towns, so the
    // merchant stays himself once you walk into one instead of shrinking to an abstract token.
    const meSprites: (HTMLImageElement | null)[] = [null, null];
    [1, 2].forEach((k, i) => { const im = new Image(); im.onload = () => { meSprites[i] = im; }; im.src = `art/world/party-solo-${k}.webp`; });
    let facing: 1 | -1 = 1;
    let raf = 0, last = performance.now(), saveT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const s = st.current;
      // walk
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy);
      const moving = dist > 1.5;
      if (moving) {
        const step = Math.min(dist, 230 * dt);
        s.x += (dx / dist) * step; s.y += (dy / dist) * step;
        // walking takes time: the clock moves as you go
        walked.current += step;
        if (walked.current >= 40 * 5) { walked.current -= 40 * 5; useGame.getState().passTime(5); }
        reveal(s.x, s.y);
        // camera follows
        const cm = camRef.current;
        const k = Math.min(1, dt * 3);
        setCam({ ...cm, cx: cm.cx + (s.x - cm.cx) * k, cy: cm.cy + (s.y - cm.cy) * k });
      } else if (s.route.length) {
        const n = s.route.shift()!;
        s.tx = n.x; s.ty = n.y;
      } else if (s.target) {
        const t = s.target;
        s.target = null;
        arrive(t);
      }
      saveT += dt;
      if (saveT > 2 && s.dirty) { saveT = 0; save(); }
      if (s.dirty) { drawFog(); s.dirty = false; }
      // camera
      const cm = camRef.current;
      const minS = Math.max(W / DW, H / DH);
      const sc = Math.max(minS, cm.s);
      let ox = W / 2 - cm.cx * sc, oy = H / 2 - cm.cy * sc;
      ox = Math.min(0, Math.max(W - DW * sc, ox));
      oy = Math.min(0, Math.max(H - DH * sc, oy));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#120c07'; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      ctx.imageSmoothingEnabled = true;
      if (bgImg || bg) ctx.drawImage((bgImg ?? bg)!, 0, 0, DW, DH);
      // passers-by are painted into the map; only the fallback needs moving figures
      if (!bgImg && bg) for (const w of walkers) {
        w.x += w.vx * dt; w.y += w.vy * dt; w.t += dt;
        if (w.lane !== 1) { if (w.x < 565) w.x = 1085; if (w.x > 1088) w.x = 566; } else { if (w.y < 365) w.y = 995; if (w.y > 998) w.y = 366; }
        const a = w.vx ? (w.vx > 0 ? 0 : Math.PI) : w.vy > 0 ? Math.PI / 2 : -Math.PI / 2;
        ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(a);
        ctx.fillStyle = 'rgba(30,16,6,0.3)'; ctx.beginPath(); ctx.ellipse(4, 3, 7, 5, 0.3, 0, 7); ctx.fill();
        const sw = Math.sin(w.t * 8) * 1.6;
        ctx.fillStyle = w.robe;
        ctx.beginPath(); ctx.ellipse(sw, -5, 2.2, 1.7, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-sw, 5, 2.2, 1.7, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = w.head; ctx.beginPath(); ctx.arc(0.3, 0, 3, 0, 7); ctx.fill();
        ctx.restore();
      }
      // fog of war
      ctx.drawImage(softC, 0, 0, DW, DH);
      // destination marker
      if (moving) {
        ctx.strokeStyle = 'rgba(255,215,130,0.9)'; ctx.lineWidth = 2 / sc;
        ctx.beginPath(); ctx.arc(s.tx, s.ty, 8 + Math.sin(now / 150) * 2, 0, 7); ctx.stroke();
      }
      // you: the same painted figure as the world map, not a plain token
      const bob = moving ? Math.sin(now / 90) * 1.2 : 0;
      if (moving && Math.abs(dx) > 0.5) facing = dx < 0 ? -1 : 1;
      const sprite = moving ? meSprites[Math.floor(now / 170) % 2] : meSprites[0];
      ctx.save(); ctx.translate(s.x, s.y);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, 'rgba(255,210,120,0.55)'); glow.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(30,16,6,0.35)'; ctx.beginPath(); ctx.ellipse(5, 11, 9, 4.5, 0.3, 0, 7); ctx.fill();
      if (sprite) {
        // the sprite is a tall standing cutout; drawn from the feet up so it plants on its shadow
        const h = 34, w = h * (sprite.width / sprite.height);
        ctx.scale(facing, 1);
        ctx.drawImage(sprite, -w / 2, -h + 2 + bob * 0.4, w, h);
      } else {
        // fallback while the sprite loads: the old abstract token, never a blank spot underfoot
        ctx.fillStyle = '#4a3322'; ctx.beginPath(); ctx.ellipse(0, bob, 6.5, 8.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8d8b8'; ctx.beginPath(); ctx.ellipse(0, bob, 3.5, 5.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2618'; ctx.beginPath(); ctx.arc(0, bob, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#e7bd6e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.stroke();
      }
      ctx.restore();
      // vital points
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of POIS) {
        if (!s.seen.has(p.id)) continue;
        const X = ox + p.x * sc, Y = oy + p.y * sc;
        if (X < -80 || Y < -40 || X > W + 80 || Y > H + 40) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(X + 1.5, Y + 2, 13, 0, 7); ctx.fill();
        ctx.fillStyle = p.id === 'stall' ? '#9a3326' : '#efe0bf';
        ctx.beginPath(); ctx.arc(X, Y, 13, 0, 7); ctx.fill();
        ctx.strokeStyle = '#5a3d20'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = p.id === 'stall' ? '#efe0bf' : '#5a3d20';
        ctx.font = '700 13px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.glyph, X, Y + 1);
        ctx.font = '600 12.5px Alegreya, Georgia, serif';
        const tw = ctx.measureText(p.name).width + 12;
        ctx.fillStyle = 'rgba(239,224,191,0.94)'; ctx.fillRect(X - tw / 2, Y + 16, tw, 18);
        ctx.strokeStyle = 'rgba(90,61,32,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(X - tw / 2 + 0.5, Y + 16.5, tw - 1, 17);
        ctx.fillStyle = '#2b1b0d'; ctx.fillText(p.name, X, Y + 25.5);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); save(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);

  // input: drag to pan, pinch or buttons to zoom, tap to walk
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; pinch?: number; s0?: number } | null>(null);
  const toWorld = (px: number, py: number) => {
    const c = cvs.current!;
    const W = c.clientWidth, H = c.clientHeight;
    const cm = camRef.current;
    const sc = Math.max(Math.max(W / DW, H / DH), cm.s);
    let ox = W / 2 - cm.cx * sc, oy = H / 2 - cm.cy * sc;
    ox = Math.min(0, Math.max(W - DW * sc, ox));
    oy = Math.min(0, Math.max(H - DH * sc, oy));
    return { x: (px - ox) / sc, y: (py - oy) / sc, sc };
  };
  const clampCam = (cm: { s: number; cx: number; cy: number }) => {
    const c = cvs.current!;
    const W = c.clientWidth, H = c.clientHeight;
    const s = Math.max(Math.max(W / DW, H / DH), Math.min(2.4, cm.s));
    const hw = W / 2 / s, hh = H / 2 / s;
    return { s, cx: Math.max(hw, Math.min(DW - hw, cm.cx)), cy: Math.max(hh, Math.min(DH - hh, cm.cy)) };
  };
  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = cvs.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const cm = camRef.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: 0, y: 0, cx: cm.cx, cy: cm.cy, moved: true, pinch: Math.hypot(a.x - b.x, a.y - b.y), s0: cm.s };
    } else drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, cx: cm.cx, cy: cm.cy, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const rect = cvs.current!.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const cm = camRef.current;
    if (d.pinch && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const want = (d.s0 ?? 1) * (Math.hypot(a.x - b.x, a.y - b.y) / d.pinch);
      if (onZoomOut && want < minScale() * 0.82) { drag.current = null; pointers.current.clear(); save(); onZoomOut(); return; }
      setCam(clampCam({ ...cm, s: want }));
      return;
    }
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (Math.hypot(x - d.x, y - d.y) > 6) d.moved = true;
    if (d.moved) {
      const { sc } = toWorld(0, 0);
      setCam(clampCam({ s: cm.s, cx: d.cx - (x - d.x) / sc, cy: d.cy - (y - d.y) / sc }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    pointers.current.delete(e.pointerId);
    if (!d || d.moved) { if (pointers.current.size === 0) drag.current = null; return; }
    drag.current = null;
    const rect = cvs.current!.getBoundingClientRect();
    const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = POIS.find((p) => st.current.seen.has(p.id) && Math.hypot(p.x - w.x, p.y - w.y) < 24 / w.sc + 6);
    if (hit) walkTo(hit.x, hit.y, hit.id);
    else walkTo(w.x, w.y, null);
  };
  const minScale = () => { const c = cvs.current!; return Math.max(c.clientWidth / DW, c.clientHeight / DH); };
  const zoom = (f: number) => {
    if (f < 1 && onZoomOut && camRef.current.s <= minScale() * 1.02) { save(); onZoomOut(); return; }
    // zooming in as far as it goes over your own stall opens it
    if (f > 1 && camRef.current.s >= 2.35) {
      const c = cvs.current!; const st0 = POIS[0]; const w = toWorld(c.clientWidth / 2, c.clientHeight / 2);
      if (Math.hypot(w.x - st0.x, w.y - st0.y) < 160) { save(); onStall(); return; }
    }
    setCam(clampCam({ ...camRef.current, s: camRef.current.s * f }));
  };

  const unknown = POIS.length - seen.length;
  return (
    <div className="district" ref={box} data-testid="district">
      <div className="district-stage">
        <canvas
          ref={cvs}
          className="district-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
          aria-label="Giza seen from above. Tap to walk, drag to look around."
        />
        <div className="district-top">
          <div className="district-title"><b>Giza</b><span>your district · tap to walk</span></div>
          <div className="map-tools district-tools">
            <button onClick={() => zoom(1.25)} aria-label="Zoom in" data-testid="district-zoom-in">+</button>
            <button onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
          </div>
        </div>
        {toast && <div className="district-toast" data-testid="district-toast">{toast}</div>}
        {note && <div className="poi-backdrop" onClick={() => setNote('')} />}
        {note && (
          <div className="district-note" data-testid="district-note" role="dialog" aria-modal="false">
            <button className="poi-sheet__close" aria-label="Close" onClick={() => setNote('')}>×</button>
            <p>{note}</p>
            <div className="poi-sheet__actions">
              <button className="btn" onClick={() => setNote('')}>Close</button>
            </div>
          </div>
        )}
      </div>
      <div className="district-sheet">
        <div className="district-places">
          {POIS.filter((p) => seen.includes(p.id)).map((p) => (
            <button key={p.id} className="dplace" onClick={() => walkTo(p.x, p.y, p.id)} data-testid={`poi-${p.id}`}>
              <i>{p.glyph}</i>
              <span><b>{p.name}</b><small>{p.sub}</small></span>
            </button>
          ))}
          {unknown > 0 && <div className="dplace unknown"><i>?</i><span><b>{unknown} more to find</b><small>Walk the lanes to discover them</small></span></div>}
        </div>
        <button className="btn primary" onClick={() => { save(); if (onZoomOut) onZoomOut(); else onWorld(); }} data-testid="district-world">⤢ Zoom out to the world</button>
      </div>
      {panel && <SettlementPanel id="giza" tab={panel} onClose={() => { setPanel(null); onPanelClosed?.(); }} onStall={onStall} />}
      {lab && <Suspense fallback={null}><ArranLab onLeave={() => setLab(false)} onFilm={filmReady('arran') ? () => setFilm('arran') : undefined} /></Suspense>}
      {film && createPortal(<IntroFilm id={film} onDone={() => { useGame.getState().markIntroSeen(film); setFilm(null); }} />, document.body)}
      {/* at page level, so the evening ledger strip and the map chrome never sit on top of the shop */}
      {malek && createPortal(<Suspense fallback={<div className="malek-boot" role="status">Walking over to Malek's…</div>}><MalekShop onLeave={() => setMalek(false)} /></Suspense>, document.body)}
      {talk && !film && <Dialogue npcId="abuhamid" onClose={(m) => { setTalk(false); if (m) setNote(m); }} />}
      {room && createPortal(<CafeRoom onTalk={() => setTalk(true)} onPlay={(g) => { setCafe(g); if (g === 'chess' && unseen('bilgin-chess')) setFilm('bilgin-chess'); }} onLeave={() => { setRoom(false); setTalk(false); setNote(''); }} onFilm={filmReady('abuhamid') ? () => setFilm('abuhamid') : undefined} note={note} onNote={() => setNote('')} />, document.body)}
      {cafe && <Suspense fallback={null}><CafeTable only={cafe} onClose={(m) => { setCafe(false); if (m) setNote(m); }} onFilm={filmReady('bilgin-chess') ? () => setFilm('bilgin-chess') : undefined} /></Suspense>}
    </div>
  );
}
