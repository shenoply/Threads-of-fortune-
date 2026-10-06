// "Play as Yourself": the player makes ONE picture of their head in their own ChatGPT account, in the game's
// painted style, and uploads it. The game puts that head on Hassan's own body (every outfit, both poses).
// Nothing is sent anywhere: the picture is shrunk in the browser and kept in the save.

export type HeroLook = { kind: 'hassan' } | { kind: 'custom'; name: string; head: string; portrait: string };

export const REFERENCE_SHEET = 'art/hero/play-as-yourself-reference.jpg';

export const PROMPT = `Make a painted game-character portrait of the person in my attached photo: HEAD AND NECK ONLY, facing the camera, cut off at the base of the neck (no shoulders, no clothes). Paint it in exactly the style of the attached reference image: a warm, polished digital painting like a premium 1920s adventure game, soft light from the front-left, rich colours, clean edges, no visible brush strokes, no canvas texture, real skin detail. Keep my face, hair, beard, skin tone and age accurate and recognisable. Do not copy the reference man's face, only the style. No hat. Plain flat light-grey background (#ECECEC), no shadow, no text. Square image.`;
export const CHATGPT_LINK = `https://chatgpt.com/?q=${encodeURIComponent(PROMPT)}`;

export const FIRST_MESSAGE = `I'm making a character for a game. I'll attach my photo(s) and a reference sheet. I will ask for three images, one at a time, in the same painted style. Keep my face accurate each time. Ready for image 1?`;

const loadImg = (file: File) => new Promise<HTMLImageElement>((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); res(img); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not a picture the browser can read.')); };
  img.src = url;
});

/** An opaque picture on a flat background: make the background transparent by filling in from the edges. */
function knockOutBackground(c: HTMLCanvasElement): boolean {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) transparent++;
  if (transparent > 20) return false; // it already has a transparent background
  const corner = (x: number, y: number) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const cs = [corner(2, 2), corner(w - 3, 2), corner(2, h - 3), corner(w - 3, h - 3)];
  const bg = cs[0];
  // the four corners must agree, or this is a scene and not a flat background
  const near = (a: number[], b: number[], t: number) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < t;
  if (!cs.every((k) => near(k, bg, 60))) return false;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const p = y * w + x; if (seen[p]) return; const i = p * 4; if (!near([d[i], d[i + 1], d[i + 2]], bg, 70)) return; seen[p] = 1; stack.push(p); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) { const p = stack.pop()!; const x = p % w, y = (p / w) | 0; d[p * 4 + 3] = 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  // soften the cut edge by one pixel so it does not show a halo
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x; if (seen[p]) continue;
    if (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) d[p * 4 + 3] = 170;
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

export interface Checked { ok: boolean; message?: string; head?: string; portrait?: string; note?: string }

/** Check one uploaded head picture: knock out the flat background, trim to the head, store small. */
export async function processHeadImage(file: File): Promise<Checked> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { ok: false, message: 'Use a PNG, JPG or WebP picture.' };
  if (file.size > 15 * 1024 * 1024) return { ok: false, message: 'That file is over 15 MB. Save a smaller copy and try again.' };
  let img: HTMLImageElement;
  try { img = await loadImg(file); } catch (e) { return { ok: false, message: (e as Error).message }; }
  if (img.naturalWidth < 200 || img.naturalHeight < 200) return { ok: false, message: 'That picture is too small. Ask ChatGPT for a larger one.' };
  const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const cut = knockOutBackground(c);
  let note: string | undefined;
  if (!cut) note = 'The background could not be removed, so your head will show a box. Ask ChatGPT for a plain flat light-grey background.';
  // trim to the opaque part, then keep a head-shaped middle (drops shoulders if ChatGPT added them)
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0 || y1 <= y0) return { ok: false, message: 'No head found in that picture.' };
  let w = x1 - x0 + 1; const h = y1 - y0 + 1;
  const maxW = Math.round(h * 0.95);
  if (w > maxW) { x0 += Math.round((w - maxW) / 2); w = maxW; note = (note ? note + ' ' : '') + 'It showed shoulders, so only the head and neck are used.'; }
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const tc = t.getContext('2d')!;
  tc.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  // soft fade at the bottom so the neck melts into the collar
  tc.globalCompositeOperation = 'destination-in';
  const fade = tc.createLinearGradient(0, h * 0.86, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = fade; tc.fillRect(0, 0, w, h);
  const enc = (cv: HTMLCanvasElement, q: number) => { const u = cv.toDataURL('image/webp', q); return u.startsWith('data:image/webp') ? u : cv.toDataURL('image/png'); };
  // square portrait for the small round faces: the head on a warm dark backdrop
  const p = document.createElement('canvas'); p.width = p.height = 256;
  const pc = p.getContext('2d')!;
  const g = pc.createRadialGradient(128, 110, 20, 128, 128, 190); g.addColorStop(0, '#7a5a38'); g.addColorStop(1, '#2a1c10');
  pc.fillStyle = g; pc.fillRect(0, 0, 256, 256);
  const s = Math.min(236 / h, 230 / w); const pw = w * s, ph = h * s;
  pc.drawImage(t, (256 - pw) / 2, 256 - ph - 6, pw, ph);
  return { ok: true, head: enc(t, 0.88), portrait: enc(p, 0.85), note };
}

const loadSrc = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; });

/** Where Hassan's head sits in the outfit art (768x1152), measured from the paintings: the head and hat zone to
 *  wipe, and the box the new head is painted into. Every outfit shares one body, so one set per pose. */
const HEAD_ZONE = {
  full: { wipe: { cx: 380, cy: 112, rx: 96, ry: 100, hatTop: 0, hatL: 262, hatR: 500, hatBottom: 105 }, box: { cx: 380, bottom: 212, h: 190 } },
  stall: { wipe: { cx: 400, cy: 215, rx: 138, ry: 160, hatTop: 0, hatL: 225, hatR: 580, hatBottom: 215 }, box: { cx: 405, bottom: 392, h: 352 } },
} as const;
const cache = new Map<string, Promise<string>>();

/** Hassan's outfit with the player's head on it (cached per outfit, pose and head). */
export function composeHero(outfitSrc: string, head: string, pose: 'full' | 'stall'): Promise<string> {
  const key = `${pose}|${outfitSrc}|${head.length}|${head.slice(-40)}`;
  const hit = cache.get(key); if (hit) return hit;
  const job = (async () => {
    const [body, hd] = await Promise.all([loadSrc(outfitSrc), loadSrc(head)]);
    const c = document.createElement('canvas'); c.width = body.naturalWidth; c.height = body.naturalHeight;
    const k = c.width / 768; const ctx = c.getContext('2d')!;
    ctx.drawImage(body, 0, 0, c.width, c.height);
    const z = HEAD_ZONE[pose]; const w = z.wipe;
    ctx.save(); ctx.scale(k, k); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(w.cx, w.cy, w.rx, w.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(w.hatL, w.hatTop, w.hatR - w.hatL, w.hatBottom - w.hatTop);
    ctx.globalCompositeOperation = 'source-over';
    const bh = z.box.h, bw = bh * (hd.naturalWidth / hd.naturalHeight);
    ctx.drawImage(hd, z.box.cx - bw / 2, z.box.bottom - bh, bw, bh);
    ctx.restore();
    const u = c.toDataURL('image/webp', 0.9);
    return u.startsWith('data:image/webp') ? u : c.toDataURL('image/png');
  })();
  cache.set(key, job);
  return job;
}

/** What each small round face draws for the hero (null = Hassan's own). */
export const lookFor = (look: HeroLook | undefined | null, _pose: 'portrait' = 'portrait') => (look && look.kind === 'custom' && look.portrait ? look.portrait : null);
export const headOf = (look: HeroLook | undefined | null) => (look && look.kind === 'custom' && look.head ? look.head : null);
