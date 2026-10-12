/**
 * The player's marker on the walkable views: a round portrait in a brass ring, the same face as the
 * bottom-nav "Me" tab. The face is cut into a circle once, on an offscreen canvas, so each frame is a
 * single drawImage. Until it loads (or if it fails) the caller draws its old figure instead.
 */
const DEFAULT_FACE = 'art/hero/hero-face-small.webp';
const RES = 128; // px of the pre-cut disc; plenty for a ~52 px marker on a 3x screen

export interface PortraitMarker {
  /** point the marker at a face (null/undefined = Hassan's own); reloads only when it changes */
  setFace(url: string | null | undefined): void;
  /** true once a face is ready to draw */
  ready(): boolean;
  /**
   * Draw centred on the current origin (already translated to the walker's feet), in world units.
   * `sc` is the world→screen scale, so the disc keeps a steady 44–52 px on screen whatever the zoom.
   */
  draw(ctx: CanvasRenderingContext2D, sc: number, bob: number, now: number, moving: boolean): void;
}

export function portraitMarker(onReady: () => void = () => {}): PortraitMarker {
  let disc: HTMLCanvasElement | null = null;
  let want = '';
  const load = (src: string, fallback: boolean) => {
    const im = new Image();
    im.onload = () => {
      if (src !== want && !fallback) return; // a newer face was asked for meanwhile
      const c = document.createElement('canvas');
      c.width = c.height = RES;
      const x = c.getContext('2d');
      if (!x) return;
      x.beginPath(); x.arc(RES / 2, RES / 2, RES / 2, 0, Math.PI * 2); x.clip();
      x.fillStyle = '#2a1b10'; x.fillRect(0, 0, RES, RES);
      // cover-fit, biased to the top so a tall portrait keeps the face, not the chest
      const s = Math.max(RES / im.naturalWidth, RES / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      x.drawImage(im, (RES - w) / 2, h > RES ? -(h - RES) * 0.2 : (RES - h) / 2, w, h);
      disc = c;
      onReady();
    };
    im.onerror = () => { if (!fallback && src !== DEFAULT_FACE) load(DEFAULT_FACE, true); };
    im.src = src;
  };
  return {
    setFace(url) {
      const src = url || DEFAULT_FACE;
      if (src === want) return;
      want = src;
      load(src, false);
    },
    ready: () => !!disc,
    draw(ctx, sc, bob, now, moving) {
      if (!disc) return;
      const d = Math.min(52, Math.max(44, 36 * sc)) / sc; // diameter in world units
      const r = d / 2, ring = 3 / sc; // ~3 px brass band
      const lift = moving ? Math.abs(Math.sin(now / 110)) * (4 / sc) : 0; // a small hop per step
      const cy = -r - 2 / sc - lift + bob * 0.2;
      // soft shadow on the ground, tighter while the disc is up in the air
      const sh = 1 - lift / (r * 1.2);
      ctx.fillStyle = 'rgba(20,10,4,0.38)';
      ctx.beginPath(); ctx.ellipse(0, 1 / sc, r * 0.78 * sh, r * 0.3 * sh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      // brass ring: a darker outer edge, the bright brass band, then the face
      ctx.fillStyle = '#6b4a22';
      ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      g.addColorStop(0, '#e7bd6e'); g.addColorStop(0.55, '#c9974a'); g.addColorStop(1, '#8a6330');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, cy, r - 0.8 / sc, 0, Math.PI * 2); ctx.fill();
      const fr = r - ring;
      ctx.drawImage(disc, -fr, cy - fr, fr * 2, fr * 2);
      ctx.strokeStyle = 'rgba(40,24,10,0.55)'; ctx.lineWidth = 1 / sc;
      ctx.beginPath(); ctx.arc(0, cy, fr, 0, Math.PI * 2); ctx.stroke();
    },
  };
}
