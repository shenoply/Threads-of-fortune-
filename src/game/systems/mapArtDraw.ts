// Drawing the map's painted pieces (src/data/mapArt.ts): the painting when its file is in public/art/map,
// else a restrained ink-and-brass placeholder drawn here. The placeholders are drawn once onto small
// canvases and reused, so a frame only copies pictures.
import { itemFile, artFile, artFiles, shipSheet, shipPainting, onArtFiles, LANDMARKS, CARTOUCHE, SCALE_BAR, MAP_LABELS, type ArtItem, type ShipKind } from '../../data/mapArt';
import { SETTLEMENTS, ROAD_WELLS } from '../../data/world';
import { MASK_H, CELL } from '../../data/landmask';
import { FOG_LEN, GRID_W } from './world';
import { landmarkLayout, placePeople, type LandmarkSpot, type PinBlock } from './mapOverlays';

const INK = '#3d2a19';
const INK_SOFT = 'rgba(61,42,25,0.75)';
const CREAM = '#efe3c4';
const BRASS = '#b08a4a';
const BRASS_HI = '#d9bb7c';

// ---------- the paintings ----------
const loaded = new Map<string, HTMLImageElement | null>();
const listeners = new Set<() => void>();
export const onMapArt = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
onArtFiles(() => { loaded.clear(); toned.clear(); layoutMemo = null; listeners.forEach((f) => f()); });
/** The painting at `src`, once decoded (null until then; asked for on the first call). */
function picture(src: string | undefined): HTMLImageElement | null {
  if (!src || typeof Image === 'undefined') return null;
  if (loaded.has(src)) return loaded.get(src) ?? null;
  loaded.set(src, null);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { loaded.set(src, img); listeners.forEach((f) => f()); };
  img.onerror = () => { /* stays null: the placeholder is drawn */ };
  img.src = src;
  return null;
}
/** The painting for a piece, if its file is in and has loaded. */
export const paintingFor = (it: ArtItem) => picture(itemFile(it));
export const paintingByCode = (code: string) => picture(artFile(code));
/** A ship type's single painting (art/map/S<n>-<name>.webp), once loaded. */
export const shipPaintingFor = (it: ArtItem) => picture(shipPainting(it));
/** A ship's 16-heading sprite sheet (art/map/ships/<type>.webp), once loaded. */
export const sheetFor = (it: ArtItem) => picture(shipSheet(it));

// ---------- placeholders ----------
const cache = new Map<string, HTMLCanvasElement>();
function canvas(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g);
  cache.set(key, c);
  return c;
}

/** A ship seen from above, facing right, on a 128 x 128 canvas (the painting's square, shrunk). */
export function shipPlaceholder(kind: ShipKind): HTMLCanvasElement {
  return canvas(`ship:${kind}`, 128, 128, (g) => {
    g.translate(64, 64);
    const long = kind === 'steamer' ? 46 : kind === 'cargo' ? 42 : kind === 'small-steamer' ? 34 : kind === 'schooner' ? 40 : kind === 'felucca' ? 32 : 36;
    const beam = kind === 'felucca' ? 7 : kind === 'dhow' ? 9 : 10;
    // hull: a pointed bow to the right, a rounded stern
    g.beginPath();
    g.moveTo(long, 0);
    g.quadraticCurveTo(long * 0.45, -beam, -long * 0.75, -beam * 0.85);
    g.quadraticCurveTo(-long, 0, -long * 0.75, beam * 0.85);
    g.quadraticCurveTo(long * 0.45, beam, long, 0);
    g.closePath();
    g.fillStyle = kind === 'cargo' ? '#4a3a2c' : kind === 'dhow' || kind === 'felucca' ? '#7a5634' : '#2e241c';
    g.fill();
    g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
    // deck
    g.beginPath();
    g.moveTo(long * 0.8, 0);
    g.quadraticCurveTo(long * 0.4, -beam * 0.62, -long * 0.65, -beam * 0.55);
    g.quadraticCurveTo(-long * 0.82, 0, -long * 0.65, beam * 0.55);
    g.quadraticCurveTo(long * 0.4, beam * 0.62, long * 0.8, 0);
    g.fillStyle = kind === 'steamer' ? '#d8c8a2' : '#a88a5c';
    g.fill();
    if (kind === 'steamer' || kind === 'cargo' || kind === 'small-steamer') {
      // superstructure and one funnel (black over red on the mail steamers)
      g.fillStyle = kind === 'steamer' ? CREAM : '#c9b48a';
      g.fillRect(-long * 0.35, -beam * 0.4, long * 0.6, beam * 0.8);
      g.strokeStyle = INK_SOFT; g.lineWidth = 1; g.strokeRect(-long * 0.35, -beam * 0.4, long * 0.6, beam * 0.8);
      g.beginPath(); g.arc(-long * 0.02, 0, beam * 0.38, 0, Math.PI * 2);
      g.fillStyle = kind === 'steamer' ? '#8e2a1c' : '#2a2018'; g.fill();
      g.beginPath(); g.arc(-long * 0.02, 0, beam * 0.22, 0, Math.PI * 2); g.fillStyle = '#1a130d'; g.fill();
      // a light smoke plume trailing aft
      const sm = g.createLinearGradient(-long * 0.05, 0, -long * 1.2, 0);
      sm.addColorStop(0, 'rgba(90,80,70,0.35)'); sm.addColorStop(1, 'rgba(90,80,70,0)');
      g.fillStyle = sm;
      g.beginPath(); g.ellipse(-long * 0.62, -beam * 0.3, long * 0.6, beam * 0.45, -0.08, 0, Math.PI * 2); g.fill();
    } else {
      // lateen sails (one on a dhow or felucca, two on the schooner), seen from above: a pale curved wedge
      const masts = kind === 'schooner' ? [long * 0.25, -long * 0.25] : [long * 0.1];
      for (const mx of masts) {
        g.beginPath();
        g.moveTo(mx + long * 0.32, -beam * 0.2);
        g.quadraticCurveTo(mx - long * 0.05, -beam * 2.6, mx - long * 0.42, -beam * 0.4);
        g.lineTo(mx, beam * 0.15);
        g.closePath();
        g.fillStyle = 'rgba(244,236,214,0.95)'; g.fill();
        g.lineWidth = 1.1; g.strokeStyle = INK_SOFT; g.stroke();
        g.beginPath(); g.moveTo(mx + long * 0.32, -beam * 0.2); g.lineTo(mx - long * 0.42, -beam * 0.4);
        g.strokeStyle = '#5a3d22'; g.lineWidth = 1.4; g.stroke();
      }
    }
  });
}
/** A wake alone: pale foam fading to the left of the ship's stern. */
export function wakePlaceholder(): HTMLCanvasElement {
  return canvas('wake', 128, 128, (g) => {
    g.translate(64, 64);
    for (const side of [-1, 1]) {
      const gr = g.createLinearGradient(-20, 0, -62, 0);
      gr.addColorStop(0, 'rgba(246,240,224,0.7)'); gr.addColorStop(1, 'rgba(246,240,224,0)');
      g.strokeStyle = gr; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-22, side * 3); g.quadraticCurveTo(-40, side * 6, -62, side * 13); g.stroke();
    }
    const gr = g.createLinearGradient(-22, 0, -60, 0);
    gr.addColorStop(0, 'rgba(246,240,224,0.45)'); gr.addColorStop(1, 'rgba(246,240,224,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(-40, 0, 20, 3, 0, 0, Math.PI * 2); g.fill();
  });
}
/** A string of camels walking right, tiny ink figures, on a 160 x 64 canvas; `frame` 0 or 1 moves the legs. */
export function caravanPlaceholder(camels: number, frame: number): HTMLCanvasElement {
  return canvas(`caravan:${camels}:${frame}`, 160, 64, (g) => {
    const gap = Math.min(20, 140 / camels);
    const x0 = 80 + ((camels - 1) * gap) / 2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < camels; i++) {
      const x = x0 - i * gap, y = 38 + (i % 2 ? 1.5 : 0);
      // the lead rope
      if (i) { g.strokeStyle = 'rgba(61,42,25,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + 6, y - 6); g.lineTo(x + gap - 6, y - 4); g.stroke(); }
      // shadow
      g.fillStyle = 'rgba(61,42,25,0.18)'; g.beginPath(); g.ellipse(x + 1, y + 9, 7, 1.8, 0, 0, Math.PI * 2); g.fill();
      // legs
      const sw = (frame + i) % 2 ? 1.6 : -1.6;
      g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - 3.5, y); g.lineTo(x - 3.5 + sw, y + 8);
      g.moveTo(x - 1.5, y); g.lineTo(x - 1.5 - sw, y + 8);
      g.moveTo(x + 3, y); g.lineTo(x + 3 - sw, y + 8);
      g.moveTo(x + 4.5, y); g.lineTo(x + 4.5 + sw, y + 8);
      g.stroke();
      // body with its hump, the neck and head forward
      g.fillStyle = '#8a6438';
      g.beginPath();
      g.moveTo(x - 6, y);
      g.quadraticCurveTo(x - 6, y - 5, x - 2, y - 6);
      g.quadraticCurveTo(x, y - 10, x + 3, y - 6);
      g.quadraticCurveTo(x + 6, y - 5, x + 6, y);
      g.closePath();
      g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(x + 5.5, y - 3); g.quadraticCurveTo(x + 9, y - 4, x + 9, y - 9); g.lineTo(x + 11.5, y - 9.2);
      g.lineWidth = 1.6; g.stroke();
      // a rider on the first and a bale on the rest
      if (i === 0 || (camels >= 6 && i === camels - 1)) { g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(x, y - 10, 1.8, 0, Math.PI * 2); g.fill(); g.lineWidth = 0.8; g.stroke(); }
      else { g.fillStyle = '#c9b089'; g.fillRect(x - 3, y - 7.5, 4, 2.6); }
    }
  });
}
/** A soft drifting cloud, white and thin, on a 256 x 256 canvas; two shapes. */
export function cloudPlaceholder(n: number): HTMLCanvasElement {
  return canvas(`cloud:${n}`, 256, 256, (g) => {
    let a = n * 9301 + 49297;
    const r = () => ((a = (a * 233280 + 49297) % 233280) / 233280);
    // many faint puffs spread wide and flat, so no one spot is bright
    for (let i = 0; i < 26; i++) {
      const x = 128 + (r() - 0.5) * 170, y = 128 + (r() - 0.5) * 70 * (1 - Math.abs(r() - 0.5)), R = 26 + r() * 36;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(255,252,244,0.11)'); gr.addColorStop(1, 'rgba(255,252,244,0)');
      g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    }
  });
}
/** A sandstorm's haze: ochre dust with soft edges, on a 256 x 256 canvas. */
export function hazePlaceholder(): HTMLCanvasElement {
  return canvas('haze', 256, 256, (g) => {
    for (const [x, y, R, al] of [[128, 128, 120, 0.5], [96, 140, 70, 0.35], [160, 116, 80, 0.35]] as const) {
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, `rgba(196,150,84,${al})`); gr.addColorStop(1, 'rgba(196,150,84,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
  });
}
/** Seabirds as fine ink ticks, each flapping on its own beat (drawn live: a handful of strokes). */
export function drawBirds(g: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) {
  g.save();
  g.strokeStyle = 'rgba(52,40,30,0.7)';
  g.lineWidth = Math.max(0.8, size / 90);
  g.lineCap = 'round';
  const birds = [[-0.3, -0.1], [-0.12, 0.08], [0.05, -0.2], [0.22, 0.02], [0.32, -0.12], [0.1, 0.18]];
  birds.forEach(([bx, by], i) => {
    const ang = t * 0.12 + i;
    const px = x + (bx + Math.cos(ang) * 0.05) * size, py = y + (by + Math.sin(ang * 1.3) * 0.04) * size;
    const w = size * 0.035, flap = Math.sin(t * 5 + i * 1.7) * 0.5 + 0.5;
    g.beginPath();
    g.moveTo(px - w, py - w * (0.2 + flap * 0.6));
    g.quadraticCurveTo(px - w * 0.4, py - w * 0.1, px, py + w * 0.2);
    g.quadraticCurveTo(px + w * 0.4, py - w * 0.1, px + w, py - w * (0.2 + flap * 0.6));
    g.stroke();
  });
  g.restore();
}

// ---------- on the base map (drawn with the painting, src/game/systems/mapRender.ts) ----------
export interface LandmarkLook { [town: string]: 'visited' | 'known' | 'dim' }
export interface ArtLayer {
  /** how far in the map is: 0 far out, 1 middle, 2 close (WorldMap's tier) */
  tier: number;
  /** zoomed right out: the cartouche and the scale ornament show */
  overview: boolean;
  landmarks: LandmarkLook;
  /** the explored country (world.fog): nothing painted stands in the unexplored */
  fog?: string;
  /** the places whose pins are on the map (the towns you know), comma separated */
  pins?: string;
  /** where you are: its landmark goes first */
  here?: string;
  /** Map life is on (the people near the towns show close in) */
  life?: boolean;
  /** where the pins, names and their marks are on the map, as the page laid them out (WorldMap) */
  blocks?: { key: string; list: PinBlock[] };
}

/** A picture shrunk once to the size it is drawn at (in steps of a twelfth of an octave), toned for how the place is
 *  known: the frame then copies it at its own size, which is cheap even on a phone, and no canvas filter is needed. */
const toned = new Map<string, HTMLCanvasElement>();
function tonedSprite(img: HTMLImageElement, key: string, wpx: number, look: 'visited' | 'known' | 'dim', flip = false): HTMLCanvasElement {
  const step = Math.round(Math.log2(Math.max(4, wpx)) * 12);
  const k = `${key}:${look}:${step}:${flip ? 1 : 0}`;
  let c = toned.get(k);
  if (c) return c;
  const W = Math.max(2, Math.round(Math.pow(2, step / 12))), H = Math.max(2, Math.round((W * img.naturalHeight) / img.naturalWidth));
  c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  // halve in steps down to twice the size, so a large picture shrinks without shimmer
  let src: CanvasImageSource = img, sw = img.naturalWidth, sh = img.naturalHeight;
  while (sw > W * 2.2) {
    const t = document.createElement('canvas');
    t.width = Math.round(sw / 2); t.height = Math.round(sh / 2);
    const tg = t.getContext('2d')!; tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
    tg.drawImage(src, 0, 0, t.width, t.height);
    src = t; sw = t.width; sh = t.height;
  }
  if (flip) { g.translate(W, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, W, H);
  if (look !== 'visited') {
    // a place you know but have not been to: a little paler; one you cannot go to yet: faded nearly to the paper's colour
    const d = g.getImageData(0, 0, W, H), px = d.data;
    const sat = look === 'known' ? 0.88 : 0.35, lift = look === 'known' ? 0 : 0.08, alpha = look === 'known' ? 1 : 0.8;
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      px[i] = l + (px[i] - l) * sat + (232 - l) * lift;
      px[i + 1] = l + (px[i + 1] - l) * sat + (214 - l) * lift;
      px[i + 2] = l + (px[i + 2] - l) * sat + (172 - l) * lift;
      px[i + 3] *= alpha;
    }
    g.putImageData(d, 0, 0);
  }
  if (toned.size > 600) toned.clear();
  toned.set(k, c);
  return c;
}
const explored = (fog: string | undefined, x: number, y: number) => !fog || fog.length !== FOG_LEN || fog.charCodeAt(Math.min(MASK_H - 1, Math.max(0, Math.floor(y / CELL))) * GRID_W + Math.min(GRID_W - 1, Math.max(0, Math.floor(x / CELL)))) === 49;

const hashKey = (t: string) => { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; };
let layoutMemo: { key: string; spots: LandmarkSpot[] } | null = null;
/** The town landmarks: from the middle zoom in, each just above its town's pin, laid out so none hides a pin, a name
 *  or another landmark (systems/mapOverlays.ts); warm where you have been, paler where you know the place, faded where
 *  you cannot go yet; none in unexplored country. Before a painting is in, nothing at the towns (their pins say enough)
 *  and a tiny ink mark at a well, close in. */
export function drawLandmarks(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, s: number, w: number, h: number, L: ArtLayer, dpr = 1) {
  if (L.tier < 1) return;
  const pins = new Set((L.pins ?? '').split(','));
  const shown = (id: string) => !!L.landmarks[id] && !!placeAt(id) && explored(L.fog, placeAt(id)!.x, placeAt(id)!.y);
  const key = `${s.toFixed(3)}|${L.tier}|${L.pins}|${L.here}|${L.blocks?.key.length ?? 0}:${hashKey(L.blocks?.key ?? '')}|${Object.keys(L.landmarks).filter(shown).join(',')}`;
  if (!layoutMemo || layoutMemo.key !== key) layoutMemo = { key, spots: landmarkLayout(s, L.tier, shown, (id) => pins.has(id), (id) => id === L.here, L.blocks?.list) };
  const spots = layoutMemo.spots;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  for (const sp of spots) {
    const it = sp.it, look = L.landmarks[it.town!] ?? 'dim';
    const x = X(sp.x), y = Y(sp.y);
    if (x < -sp.w || y < -10 || x > w + sp.w || y > h + sp.h + 10) continue;
    const img = paintingFor(it);
    if (img) ctx.drawImage(tonedSprite(img, it.code, sp.w * dpr, look), x - sp.w / 2, y - sp.h, sp.w, sp.h);
  }
  // the wells with no painting yet: the old atlas sign for a well, close in
  if (L.tier >= 2) for (const it of LANDMARKS) {
    if (!it.town!.startsWith('well-') || paintingFor(it) || itemFile(it)) continue;
    const p = placeAt(it.town!);
    if (!p || !explored(L.fog, p.x, p.y)) continue;
    const x = X(p.x), y = Y(p.y);
    if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
    ctx.globalAlpha = L.landmarks[it.town!] === 'visited' ? 0.9 : 0.5;
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
const places = new Map<string, { x: number; y: number } | null>();
function placeAt(id: string) {
  if (!places.has(id)) { const p = SETTLEMENTS.find((q) => q.id === id) ?? ROAD_WELLS.find((q) => q.id === id); places.set(id, p ? { x: p.x, y: p.y } : null); }
  return places.get(id) ?? null;
}

/** The people near the towns: small painted groups at their spots (systems/mapOverlays.ts placePeople), close in and
 *  with Map life on only, and only in country you have seen. Still: they are seasoning, not a crowd. */
export function drawPeople(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, s: number, w: number, h: number, L: ArtLayer, dpr = 1) {
  if (L.tier < 2 || !L.life) return;
  const list = artFiles();
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  for (const p of placePeople()) {
    const x = X(p.x), y = Y(p.y), pw = p.w * s, ph = p.h * s;
    if (x < -pw || y < -2 || x > w + pw || y > h + ph) continue;
    if (!explored(L.fog, p.x, p.y)) continue;
    const file = `people/${p.art}.webp`;
    if (!list.includes(file)) continue;
    const img = picture(`art/map/${file}`);
    if (!img) continue;
    ctx.drawImage(tonedSprite(img, file, pw * dpr, 'visited', p.flip), x - pw / 2, y - ph, pw, ph);
  }
  ctx.restore();
}

/** The title cartouche and the scale ornament, zoomed right out only. */
export function drawCartouche(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, s: number, unitsPer100Miles: number) {
  // the cartouche: about a sixth of the map's width
  {
    const W = 300 * s, H = W / 2;
    const cx = X(CARTOUCHE.x!), cy = Y(CARTOUCHE.y!);
    const img = paintingFor(CARTOUCHE);
    ctx.save();
    if (img) ctx.drawImage(img, cx - W / 2, cy - H / 2, W, H);
    else {
      // a plain scroll: parchment with a brass and ink border, the ends rolled
      const w = W * 0.86, hh = H * 0.5;
      ctx.fillStyle = 'rgba(238,224,190,0.92)';
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, W / 260);
      ctx.beginPath(); ctx.rect(cx - w / 2, cy - hh / 2, w, hh); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = BRASS; ctx.lineWidth = Math.max(1, W / 200);
      ctx.strokeRect(cx - w / 2 + W * 0.018, cy - hh / 2 + W * 0.018, w - W * 0.036, hh - W * 0.036);
      for (const side of [-1, 1]) {
        const ex = cx + side * (w / 2 + W * 0.02);
        const gr = ctx.createLinearGradient(ex - W * 0.03, 0, ex + W * 0.03, 0);
        gr.addColorStop(0, '#cbb486'); gr.addColorStop(0.5, '#efe0b8'); gr.addColorStop(1, '#b89e6c');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.ellipse(ex, cy, W * 0.03, hh * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, W / 260); ctx.stroke();
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    // the lettering sized to sit well inside the border
    const fit = (text: string, font: (px: number) => string, px: number, maxW: number) => {
      ctx.font = font(px);
      const m = ctx.measureText(text).width;
      if (m > maxW) ctx.font = font(px * (maxW / m));
    };
    fit('THREADS OF FORTUNE', (px) => `700 ${px}px Cinzel, Georgia, serif`, W * 0.062, W * 0.66);
    ctx.fillText('THREADS OF FORTUNE', cx, cy - H * 0.05);
    fit('Egypt, the Levant, Iraq and Persia · 1925', (px) => `italic ${px}px Alegreya, Georgia, serif`, W * 0.036, W * 0.6);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('Egypt, the Levant, Iraq and Persia · 1925', cx, cy + H * 0.1);
    ctx.restore();
  }
  // the scale ornament: 300 miles, ticked every 50
  {
    const len = 3 * unitsPer100Miles * s, hgt = Math.max(6, len / 22);
    const cx = X(SCALE_BAR.x!), cy = Y(SCALE_BAR.y!);
    const x0 = cx - len / 2;
    const img = paintingFor(SCALE_BAR);
    ctx.save();
    if (img) ctx.drawImage(img, x0 - len * 0.06, cy - (len * 1.12) / 12, len * 1.12, (len * 1.12) / 6);
    else {
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? CREAM : INK; ctx.fillRect(x0 + (len * i) / 6, cy - hgt / 2, len / 6, hgt); }
      ctx.strokeStyle = BRASS; ctx.lineWidth = 1.2; ctx.strokeRect(x0, cy - hgt / 2, len, hgt);
      ctx.strokeStyle = BRASS_HI; ctx.lineWidth = 0.6; ctx.strokeRect(x0 - 2, cy - hgt / 2 - 2, len + 4, hgt + 4);
    }
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.max(8, hgt * 1.1)}px Cinzel, Georgia, serif`;
    for (const m of [0, 100, 200, 300]) ctx.fillText(String(m), x0 + (len * m) / 300, cy + hgt / 2 + 3);
    ctx.font = `italic ${Math.max(8, hgt * 1.1)}px Alegreya, Georgia, serif`;
    ctx.fillText('English miles', cx, cy + hgt / 2 + 3 + hgt * 1.4);
    ctx.restore();
  }
}

export { MAP_LABELS };
