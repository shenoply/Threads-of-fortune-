// Where the carpet lies in its picture. Many of the rug photographs show the carpet on a pale studio
// ground (and the Persian ones on a transparent one), so drawn edge to edge the ground comes along as
// a pale frame round the carpet. This finds the carpet's box: scanning in from each edge, a row or
// column belongs to the ground while almost all of it is smooth and close to the corners' colour, or
// transparent. Wool and fringe are full of fine contrast, so the fringe stays with the carpet; the
// ground, and the soft shadow the carpet throws on it, are smooth and are left out. A seam in the
// backdrop or a strip of something else at the picture's edge is not taken for the carpet.

export interface Crop { x: number; y: number; w: number; h: number }

const cache = new Map<string, Crop | null>();

/** the box of the picture that is the carpet, in the picture's own pixels; null when it fills the picture */
export function carpetCrop(im: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number }, key?: string): Crop | null {
  if (key && cache.has(key)) return cache.get(key)!;
  const out = find(im);
  if (key) {
    cache.set(key, out);
    if (cache.size > 120) cache.delete(cache.keys().next().value as string);
  }
  return out;
}

function find(im: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number }): Crop | null {
  const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
  if (!W || !H) return null;
  // a small copy is enough to find the edges
  const k = Math.min(1, 360 / Math.max(W, H));
  const w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k));
  let d: Uint8ClampedArray;
  try {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(im, 0, 0, w, h);
    d = g.getImageData(0, 0, w, h).data;
  } catch { return null; }
  const at = (x: number, y: number) => (y * w + x) * 4;
  const lum = (i: number) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  // the ground's colour: the corners that agree with most of the others
  const corners = [at(1, 1), at(w - 2, 1), at(1, h - 2), at(w - 2, h - 2)];
  const diff = (i: number, j: number) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
  const ref = corners.map((i) => ({ i, n: corners.filter((j) => diff(i, j) < 60).length })).sort((a, b) => b.n - a.n)[0].i;
  const clear = (i: number) => d[i + 3] < 40;
  // smooth: little contrast with the neighbours (wool and fringe have plenty)
  const ground = (x: number, y: number) => {
    const i = at(x, y);
    if (clear(i)) return true;
    // on a transparent ground everything drawn is carpet (the loom's designs have flat colours)
    if (d[ref + 3] < 40 || diff(i, ref) > 90) return false;
    const l = lum(i);
    const nb = [x > 0 ? at(x - 1, y) : i, x < w - 1 ? at(x + 1, y) : i, y > 0 ? at(x, y - 1) : i, y < h - 1 ? at(x, y + 1) : i];
    let g = 0;
    for (const j of nb) g = Math.max(g, clear(j) ? 255 : Math.abs(lum(j) - l));
    return g < 7;
  };
  const rowShare = (y: number, x0: number, x1: number) => { let n = 0; for (let x = x0; x < x1; x++) if (!ground(x, y)) n++; return n / Math.max(1, x1 - x0); };
  const colShare = (x: number, y0: number, y1: number) => { let n = 0; for (let y = y0; y < y1; y++) if (!ground(x, y)) n++; return n / Math.max(1, y1 - y0); };
  // the carpet is the biggest unbroken run of lines with something in them: a seam in the backdrop, or a
  // strip of something else along the picture's edge, is a run of its own, apart from the carpet
  const run = (share: number[]): [number, number] => {
    const gap = Math.max(1, Math.round(share.length * 0.015));
    let best: [number, number] = [0, 0], bestM = -1, s0 = -1, last = -1, m = 0;
    const close = () => { if (s0 >= 0 && m > bestM) { bestM = m; best = [s0, last + 1]; } };
    share.forEach((f, i) => {
      if (f < 0.06) return;
      if (s0 < 0 || i - last > gap + 1) { close(); s0 = i; m = 0; }
      m += f; last = i;
    });
    close();
    return best;
  };
  // across, then down, twice, so a line is judged across the carpet's width and not the whole picture's
  let L = 0, T = 0, R = w, B = h;
  for (let pass = 0; pass < 2; pass++) {
    [T, B] = run(Array.from({ length: h }, (_, y) => rowShare(y, L, R)));
    if (B - T < 4) return null;
    [L, R] = run(Array.from({ length: w }, (_, x) => colShare(x, T, B)));
    if (R - L < 4) return null;
  }
  // nothing found, or the carpet is most of nothing: leave the picture as it is
  if (R - L < w * 0.3 || B - T < h * 0.3) return null;
  if (L <= 0 && T <= 0 && R >= w && B >= h) return null;
  // back to the picture's pixels, a little inside where it was cut, so no ground shows at the edge (the
  // carpet's own edge is soft, and its shadow runs along it)
  const sx = W / w, sy = H / h, ix = Math.max(sx, W * 0.006), iy = Math.max(sy, H * 0.006);
  const x = Math.min(W - 1, Math.ceil(L * sx + (L > 0 ? ix : 0))), y = Math.min(H - 1, Math.ceil(T * sy + (T > 0 ? iy : 0)));
  const x2 = Math.max(x + 1, Math.floor(R * sx - (R < w ? ix : 0))), y2 = Math.max(y + 1, Math.floor(B * sy - (B < h ? iy : 0)));
  return { x, y, w: x2 - x, h: y2 - y };
}
