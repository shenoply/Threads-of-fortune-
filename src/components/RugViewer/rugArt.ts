import type { RugType } from '../../game/types';

// Procedural rug renderer for rugs without approved photography.
// Produces a hand-woven looking carpet: borders, field, medallion or lattice, knot texture, fringe.

const cache = new Map<string, string>();

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

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function wovenRug(t: RugType, W = 900, H = 560): string {
  const key = t.id + W + 'x' + H;
  if (cache.has(key)) return cache.get(key)!;
  if (t.art.kind !== 'woven') return '';
  const { palette, layout, seed } = t.art;
  const r = mulberry(seed);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const [field, dark, light, accent, deep] = palette;
  const fr = 26; // fringe length
  // body
  const x0 = fr, x1 = W - fr, y0 = 8, y1 = H - 8;
  g.fillStyle = field;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);

  const bw = Math.round((y1 - y0) * 0.13);
  // borders
  const band = (inset: number, w: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x0 + inset, y0 + inset, x1 - x0 - inset * 2, w);
    g.fillRect(x0 + inset, y1 - inset - w, x1 - x0 - inset * 2, w);
    g.fillRect(x0 + inset, y0 + inset, w, y1 - y0 - inset * 2);
    g.fillRect(x1 - inset - w, y0 + inset, w, y1 - y0 - inset * 2);
  };
  if (layout !== 'kilim') {
    band(0, 6, deep);
    band(6, bw, dark);
    band(6 + bw, 5, light);
    band(11 + bw, 6, accent);
    // border motifs: repeated diamonds / rosettes
    const step = bw * 0.78;
    g.fillStyle = light;
    const motif = (cx: number, cy: number, s: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(cx, cy - s);
      g.lineTo(cx + s, cy);
      g.lineTo(cx, cy + s);
      g.lineTo(cx - s, cy);
      g.closePath();
      g.fill();
      g.fillStyle = accent;
      g.fillRect(cx - s * 0.25, cy - s * 0.25, s * 0.5, s * 0.5);
    };
    let n = 0;
    for (let x = x0 + 6 + step / 2; x < x1 - 6; x += step) {
      const col = n++ % 2 ? light : palette[4];
      motif(x, y0 + 6 + bw / 2, bw * 0.3, col);
      motif(x, y1 - 6 - bw / 2, bw * 0.3, col);
    }
    for (let y = y0 + 6 + bw + step / 2; y < y1 - 6 - bw; y += step) {
      const col = n++ % 2 ? light : palette[4];
      motif(x0 + 6 + bw / 2, y, bw * 0.3, col);
      motif(x1 - 6 - bw / 2, y, bw * 0.3, col);
    }
    // thin guard stripe of dots
    g.fillStyle = deep;
    for (let x = x0 + 14 + bw; x < x1 - 14 - bw; x += 7) { g.fillRect(x, y0 + 8 + bw, 3, 3); g.fillRect(x, y1 - 11 - bw, 3, 3); }
  }
  const fx0 = x0 + (layout === 'kilim' ? 0 : 17 + bw), fx1 = x1 - (layout === 'kilim' ? 0 : 17 + bw);
  const fy0 = y0 + (layout === 'kilim' ? 0 : 17 + bw), fy1 = y1 - (layout === 'kilim' ? 0 : 17 + bw);
  const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
  const fw = fx1 - fx0, fh = fy1 - fy0;

  const stepped = (px: number, py: number, rx: number, ry: number, col: string, steps = 7) => {
    // stepped (woven) diamond: widest at the centre row
    g.fillStyle = col;
    const rows = steps * 2 + 1;
    const h = (ry * 2) / rows;
    for (let k = -steps; k <= steps; k++) {
      const w = rx * 2 * (1 - Math.abs(k) / (steps + 1));
      g.fillRect(px - w / 2, py + k * h - h / 2, w, h + 0.6);
    }
  };

  if (layout === 'medallion') {
    // spandrels
    g.fillStyle = accent;
    const sp = (sx: number, sy: number, dx: number, dy: number) => {
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + dx * fw * 0.28, sy);
      g.quadraticCurveTo(sx + dx * fw * 0.12, sy + dy * fh * 0.1, sx, sy + dy * fh * 0.36);
      g.closePath();
      g.fill();
    };
    sp(fx0, fy0, 1, 1); sp(fx1, fy0, -1, 1); sp(fx0, fy1, 1, -1); sp(fx1, fy1, -1, -1);
    // scattered florets
    for (let i = 0; i < 260; i++) {
      const px = fx0 + r() * fw, py = fy0 + r() * fh;
      g.fillStyle = [light, accent, deep][i % 3];
      g.globalAlpha = 0.75;
      g.beginPath();
      g.arc(px, py, 1.5 + r() * 3.5, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    // vine lines
    g.strokeStyle = palette[4];
    g.lineWidth = 2;
    g.globalAlpha = 0.6;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      const sx = fx0 + r() * fw, sy = fy0 + r() * fh;
      g.moveTo(sx, sy);
      g.bezierCurveTo(sx + 40 * (r() - 0.5) * 4, sy + 30, sx + 60 * (r() - 0.5) * 3, sy - 30, sx + 80 * (r() - 0.5) * 3, sy + 20);
      g.stroke();
    }
    g.globalAlpha = 1;
    // central medallion with pendants
    stepped(cx, cy, fw * 0.2, fh * 0.36, light, 9);
    stepped(cx, cy, fw * 0.14, fh * 0.26, accent, 7);
    stepped(cx, cy, fw * 0.08, fh * 0.15, field, 5);
    g.fillStyle = light;
    g.fillRect(cx - fw * 0.26, cy - 5, fw * 0.52, 10);
    stepped(cx - fw * 0.29, cy, fw * 0.035, fh * 0.07, light, 4);
    stepped(cx + fw * 0.29, cy, fw * 0.035, fh * 0.07, light, 4);
    g.fillStyle = palette[3];
    g.beginPath();
    g.arc(cx, cy, fh * 0.06, 0, Math.PI * 2);
    g.fill();
    // rosette petals around the centre
    for (let k = 0; k < 8; k++) {
      const a2 = (k / 8) * Math.PI * 2;
      g.fillStyle = k % 2 ? light : palette[2];
      g.beginPath();
      g.ellipse(cx + Math.cos(a2) * fh * 0.1, cy + Math.sin(a2) * fh * 0.1, fh * 0.03, fh * 0.015, a2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (layout === 'lattice') {
    const cols = 5, rows = 3;
    const cw = fw / cols, ch = fh / rows;
    g.strokeStyle = dark;
    g.lineWidth = 7;
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const px = fx0 + i * cw, py = fy0 + j * ch;
        g.beginPath();
        g.moveTo(px - cw / 2, py);
        g.lineTo(px, py - ch / 2);
        g.lineTo(px + cw / 2, py);
        g.lineTo(px, py + ch / 2);
        g.closePath();
        g.stroke();
      }
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const px = fx0 + (i + 0.5) * cw, py = fy0 + (j + 0.5) * ch;
        stepped(px, py, cw * 0.18, ch * 0.28, light, 5);
        g.fillStyle = (i + j) % 2 ? accent : deep;
        g.fillRect(px - 5, py - 5, 10, 10);
      }
    }
  } else {
    // kilim: horizontal bands with stepped diamonds
    let y = y0;
    let i = 0;
    while (y < y1) {
      const h = 18 + Math.floor(r() * 40);
      const col = palette[i % palette.length];
      g.fillStyle = col;
      g.fillRect(x0, y, x1 - x0, Math.min(h, y1 - y));
      if (h > 34) {
        const n = 6 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const px = x0 + ((k + 0.5) * (x1 - x0)) / n;
          stepped(px, y + h / 2, h * 0.45, h * 0.4, palette[(i + 2) % palette.length], 4);
        }
      } else {
        g.fillStyle = palette[(i + 3) % palette.length];
        for (let px = x0 + 8; px < x1; px += 22) g.fillRect(px, y + h / 2 - 2, 10, 4);
      }
      y += h;
      i++;
    }
  }

  // knot texture + abrash (dye variation)
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let yy = y0; yy < y1; yy++) {
    const abrash = 1 + Math.sin(yy * 0.021 + seed) * 0.035;
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 4;
      const knot = ((xx >> 1) + (yy >> 1)) % 2 === 0 ? 1.04 : 0.95;
      const n = 0.93 + r() * 0.12;
      const f = knot * n * abrash;
      d[o] = Math.min(255, d[o] * f);
      d[o + 1] = Math.min(255, d[o + 1] * f);
      d[o + 2] = Math.min(255, d[o + 2] * f);
    }
  }
  g.putImageData(img, 0, 0);
  // soften hard vector edges into wool, then add worn patches
  const tmp = document.createElement('canvas');
  tmp.width = W;
  tmp.height = H;
  tmp.getContext('2d')!.drawImage(c, 0, 0);
  g.filter = 'blur(0.9px) saturate(0.82) contrast(0.95)';
  g.drawImage(tmp, 0, 0);
  g.filter = 'none';
  for (let i = 0; i < 7; i++) {
    const wx = x0 + r() * (x1 - x0), wy = y0 + r() * (y1 - y0), wr = 40 + r() * 110;
    const wg = g.createRadialGradient(wx, wy, 0, wx, wy, wr);
    wg.addColorStop(0, `rgba(235,215,175,${0.05 + r() * 0.07})`);
    wg.addColorStop(1, 'rgba(235,215,175,0)');
    g.fillStyle = wg;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // soft wear + vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(255,240,210,0.06)');
  vg.addColorStop(1, 'rgba(20,10,4,0.28)');
  g.fillStyle = vg;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // fringe
  const [lr, lg, lb] = hexToRgb('#e9dcc0');
  for (let yy = y0 + 2; yy < y1 - 2; yy += 4) {
    for (const side of [0, 1]) {
      const len = fr - 4 + r() * 6;
      g.strokeStyle = `rgba(${lr - r() * 30},${lg - r() * 30},${lb - r() * 40},0.95)`;
      g.lineWidth = 2;
      g.beginPath();
      const sx = side ? x1 : x0;
      g.moveTo(sx, yy);
      g.quadraticCurveTo(sx + (side ? len / 2 : -len / 2), yy + (r() - 0.5) * 4, sx + (side ? len : -len), yy + (r() - 0.5) * 6);
      g.stroke();
    }
  }
  const url = c.toDataURL('image/jpeg', 0.9);
  cache.set(key, url);
  return url;
}

export function rugSrc(t: RugType): string {
  return t.art.kind === 'photo' ? t.art.src : wovenRug(t);
}

/** Simulated reverse: mirrored, flattened, desaturated, with a knot grid. Clearly labelled in the UI. */
export async function simulatedBack(t: RugType): Promise<string> {
  const key = 'back-' + t.id;
  if (cache.has(key)) return cache.get(key)!;
  const src = rugSrc(t);
  const img = new Image();
  img.src = src;
  await img.decode().catch(() => {});
  const W = img.naturalWidth || 900, H = img.naturalHeight || 560;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.translate(W, 0);
  g.scale(-1, 1);
  g.filter = 'saturate(0.55) contrast(0.8) brightness(0.82) blur(0.8px)';
  g.drawImage(img, 0, 0, W, H);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = 'none';
  g.strokeStyle = 'rgba(30,18,8,0.25)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 5) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = 0; y < H; y += 5) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  const url = c.toDataURL('image/jpeg', 0.85);
  cache.set(key, url);
  return url;
}
