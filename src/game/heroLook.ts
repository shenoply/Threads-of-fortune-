// "Play as Yourself": the player makes three pictures of themselves in their own ChatGPT account,
// in the game's painted style, and uploads them. Nothing is sent anywhere: the pictures are shrunk in the
// browser and kept in the save (so they travel with save files and slots).
//
// One look for every outfit: the clothes still change charisma and how buyers read you, but the
// picture does not change with them.

export type HeroLook = { kind: 'hassan' } | { kind: 'custom'; name: string; full: string; stall: string; portrait: string };
export type LookKind = 'full' | 'stall' | 'portrait';

export const REFERENCE_SHEET = 'art/hero/play-as-yourself-reference.jpg';

const STYLE = `Painted game-character style, matching the attached reference sheet exactly: a warm, polished digital illustration like a premium 1920s adventure game, soft natural light from the front-left, rich warm colours, clean edges. No visible brush strokes, no canvas texture, skin not overly smooth, keep real skin detail. Plain flat light-grey background (#ECECEC), no shadow on the ground, no props, no text, no watermark. Set in Cairo in 1925: the man wears a cream linen shirt, a dark brown embroidered vest and cream sirwal trousers.`;
const LIKE = `The person is the one in my attached photo(s). Keep their face, hair, beard, skin tone, age and build accurate and recognisable. Do not make them look like the man on the reference sheet: copy only the framing, pose and painting style.`;
export const PROMPTS: Record<LookKind, { title: string; size: string; text: string }> = {
  full: { title: '1 · Full length', size: 'tall, 2:3 portrait', text: `Create image 1 of 3, FULL LENGTH, tall 2:3 portrait. The person standing, facing the viewer, arms relaxed at the sides, head to shoes completely in frame with a little space around. ${LIKE} ${STYLE}` },
  stall: { title: '2 · At the stall', size: 'tall, 2:3 portrait', text: `Create image 2 of 3, AT THE STALL, tall 2:3 portrait. Same person, same clothes, waist up, turned slightly, both hands open towards the buyer, a calm, shrewd, friendly expression. ${LIKE} ${STYLE}` },
  portrait: { title: '3 · Portrait', size: 'square', text: `Create image 3 of 3, PORTRAIT, square. Same person, same clothes, head and shoulders, looking at the viewer, neutral confident expression. ${LIKE} ${STYLE}` },
};
export const FIRST_MESSAGE = `I'm making a character for a game. I'll attach my photo(s) and a reference sheet. I will ask for three images, one at a time, in the same painted style. Keep my face accurate each time. Ready for image 1?`;

const SIZES: Record<LookKind, { w: number; h: number; square?: boolean }> = { full: { w: 640, h: 960 }, stall: { w: 640, h: 960 }, portrait: { w: 320, h: 320, square: true } };

export interface Checked { ok: boolean; message?: string; dataUrl?: string; note?: string }

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

/** Check, shrink and store one picture. Returns a small WebP data URL (PNG if the browser cannot write WebP). */
export async function processHeroImage(file: File, kind: LookKind): Promise<Checked> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { ok: false, message: 'Use a PNG, JPG or WebP picture.' };
  if (file.size > 15 * 1024 * 1024) return { ok: false, message: 'That file is over 15 MB. Save a smaller copy and try again.' };
  let img: HTMLImageElement;
  try { img = await loadImg(file); } catch (e) { return { ok: false, message: (e as Error).message }; }
  const sz = SIZES[kind];
  if (img.naturalWidth < 300 || img.naturalHeight < 300) return { ok: false, message: 'That picture is too small. Ask ChatGPT for a larger one (at least 600 pixels tall).' };
  const ratio = img.naturalWidth / img.naturalHeight;
  const want = sz.square ? 1 : 2 / 3;
  let note: string | undefined;
  if (Math.abs(ratio - want) > 0.28) note = sz.square ? 'It is not square, so the middle will be used.' : 'It is not a tall 2:3 picture, so it may look squeezed in. Ask ChatGPT for a tall portrait image.';
  // draw at the target size: portrait crops to a square from the top; the others fit inside the frame
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  if (sz.square) {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2, sy = Math.max(0, (img.naturalHeight - side) * 0.1);
    c.width = sz.w; c.height = sz.h;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, sz.w, sz.h);
  } else {
    const scale = Math.min(sz.w / img.naturalWidth, sz.h / img.naturalHeight, 1);
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, 0, 0, c.width, c.height);
  }
  const cut = knockOutBackground(c);
  let dataUrl = c.toDataURL('image/webp', 0.86);
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = c.toDataURL('image/png');
  if (!cut && !/png|webp/.test(file.type)) note = (note ? note + ' ' : '') + 'The background could not be removed, so the picture will show its own background.';
  return { ok: true, dataUrl, note };
}

/** What each part of the game draws for the hero */
export const lookFor = (look: HeroLook | undefined | null, pose: 'full' | 'stall' | 'portrait') => (look && look.kind === 'custom' ? look[pose] : null);
