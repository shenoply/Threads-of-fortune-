// The travel map's life: ships sailing their short lanes, caravans walking theirs, clouds drifting, the
// haze of a sandstorm breathing, seabirds. One small canvas over the painting, drawn by its own frame
// loop straight from the live camera (no React render per frame), about thirty times a second, and not at
// all while the tab is hidden or "Map life" is off in Settings.
import { useEffect, useRef } from 'react';
import { SHIPS, WEATHER, WAKE, SHEET_FRAMES, SHEET_ANCHOR, SHEET_TILT, PAINT_ANCHOR, shipPainting, type ArtItem, type ShipKind } from '../../data/mapArt';
import SIZES from '../../data/mapOverlays.json';
import type { Pt } from '../../game/systems/world';
import { mapLanes, poseAt, shipFrame } from '../../game/systems/mapLife';
import { drawKitLive } from '../../game/systems/mapKitDraw';
import { FOG_LEN, GRID_W } from '../../game/systems/world';
import { MASK_H, CELL } from '../../data/landmask';
import { sheetFor, shipPaintingFor, paintingFor, shipPlaceholder, wakePlaceholder, cloudPlaceholder, hazePlaceholder, drawBirds } from '../../game/systems/mapArtDraw';

export interface Camera { tx: number; ty: number; s: number; w: number; h: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** each type's hull length as a fraction of a sheet frame (tools/blender-ships.py: length / 12.2 units), for its wake */
const SHEET_LENGTH: Partial<Record<ShipKind, number>> = { steamer: 0.82, cargo: 0.75, 'small-steamer': 0.61, schooner: 0.61, dhow: 0.57, felucca: 0.46 };
/** the painted mail steamer's width and the first caravan's, in their pictures' pixels: every ship and every caravan is
 *  drawn at one scale from these (tools/map-overlays.py shrinks each set by one factor) */
const PAINT_STEAMER_W = (SIZES.sizes as unknown as Record<string, number[]>)['S1-steamer.webp']?.[0] ?? 293;
/** +1 when a lane's outward leg runs east (the paintings face right), -1 when it runs west */
const facingOut = (pts: Pt[]) => (pts[pts.length - 1].x >= pts[0].x ? 1 : -1);
/** ?ships=blender (or tof-ships=blender in local storage) shows the Blender sheets, for comparison */
const SHIP_STYLE = (() => { try { return new URLSearchParams(location.search).get('ships') ?? localStorage.getItem('tof-ships') ?? 'painted'; } catch { return 'painted'; } })();
/** frame times of the last few seconds, for the performance check (tests/maplife.mjs) */
const perf = { frames: 0, ms: 0, worst: 0, t0: 0 };
if (typeof window !== 'undefined') (window as unknown as { __mapLife?: typeof perf }).__mapLife = perf;

export function MapLife({ camera, on, kit = false, fog = '' }: { camera: () => Camera | null; on: boolean; kit?: boolean; fog?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const camRef = useRef(camera);
  camRef.current = camera;
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const fogRef = useRef(fog);
  fogRef.current = fog;
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !on) { if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height); return; }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const lanes = mapLanes();
    const t0 = performance.now();
    perf.t0 = t0;
    let raf = 0, last = 0, dirty = false;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      // about thirty frames a second is plenty for things this slow
      if (now - last < 32) return;
      last = now;
      const c = camRef.current();
      if (!c) return;
      const start = performance.now();
      // soft painted pieces need no more than one and a half pixels to the point; fewer pixels to fill and composite
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const W = Math.round(c.w * dpr), H = Math.round(c.h * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (dirty) ctx.clearRect(0, 0, W, H);
      dirty = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = (now - t0) / 1000;
      const { s, tx, ty } = c;
      const X = (x: number) => x * s + tx, Y = (y: number) => y * s + ty;
      const seen = (x: number, y: number, r: number) => x > -r && y > -r && x < c.w + r && y < c.h + r;
      // close in, the trees and palms sway and the sea marks breathe (the still ones are on the base map)
      if (kitRef.current) {
        const fg = fogRef.current;
        const dim = fg.length === FOG_LEN ? (x: number, y: number) => (fg.charCodeAt(Math.min(MASK_H - 1, Math.floor(y / CELL)) * GRID_W + Math.min(GRID_W - 1, Math.floor(x / CELL))) === 49 ? 1 : 0.42) : undefined;
        if (drawKitLive(ctx, c, dpr, t, dim)) dirty = true;
      }
      // weather first, under the boats: clouds drift east and fade at each end of their run; the haze breathes
      for (const it of WEATHER) {
        const img = paintingFor(it);
        if (it.weather === 'cloud') {
          // a cloud the size of a province is only for the wider views
          const fade = clamp((2.6 - s / 1.2) / 1, 0, 1);
          if (fade <= 0) continue;
          const period = 140, run = 140, u = ((t + (it.code === 'W2' ? 60 : 0)) % period) / period;
          const x = X(it.x! - run / 2 + run * u), y = Y(it.y! + Math.sin(t / 23) * 4), size = 170 * s;
          if (!seen(x, y, size)) continue;
          ctx.globalAlpha = Math.sin(Math.PI * u) * 0.9 * fade;
          ctx.drawImage(img ?? cloudPlaceholder(it.code === 'W2' ? 2 : 1), x - size / 2, y - size / 2, size, size);
        } else if (it.weather === 'sandstorm') {
          const x = X(it.x!), y = Y(it.y!), size = 240 * s * (1 + Math.sin(t / 7) * 0.04);
          if (!seen(x, y, size)) continue;
          ctx.globalAlpha = 0.45 + Math.sin(t / 5) * 0.2;
          ctx.drawImage(img ?? hazePlaceholder(), x - size / 2, y - size / 2, size, size);
        } else {
          const x = X(it.x! + Math.sin(t / 30) * 10), y = Y(it.y! + Math.cos(t / 40) * 6), size = clamp(60 * s, 50, 140);
          if (!seen(x, y, size)) continue;
          ctx.globalAlpha = 0.85;
          if (img) {
            // the painted flock bobs a little, as birds on the wing do
            ctx.drawImage(img, x - size / 2, y - size / 2 + Math.sin(t * 1.3) * size * 0.015, size, size);
          } else drawBirds(ctx, x, y, size, t);
        }
        dirty = true;
      }
      ctx.globalAlpha = 1;
      // ships: the type's painting, facing its heading (mirrored on a westward leg, tilted a few degrees at most,
      // so masts stay upright and the smoke trails astern), the wake under it; or the Blender sheet's frame for the
      // heading (the fallback, or ?ships=blender); without either, the ink placeholder turned to the heading
      const wakeArt = paintingFor(WAKE);
      const wake = wakeArt ?? wakePlaceholder();
      for (const it of SHIPS) {
        const lane = lanes.get(it.code);
        if (!lane) continue;
        const p = poseAt(lane, t);
        const x = X(p.x), y = Y(p.y);
        const painted = SHIP_STYLE !== 'blender' && !!shipPainting(it);
        const paint = painted ? shipPaintingFor(it) : null;
        // (a painting still loading: nothing for a moment, rather than fetching the sheet meanwhile)
        if (painted && !paint) continue;
        if (paint) {
          // every type at one scale (the paintings keep the ships' sizes to one another): a mail steamer about 28 map
          // units long, between 44 and 84 px
          // (the felucca a size smaller: the Nile is narrow)
          const k = (clamp(28 * s, 44, 84) / PAINT_STEAMER_W) * (it.ship === 'felucca' ? 0.72 : 1);
          const pw = paint.naturalWidth * k, ph = paint.naturalHeight * k;
          if (!seen(x, y, Math.max(pw, ph))) continue;
          // which way it faces: by the leg (out or back along its lane), turned over through a turn
          const out = facingOut(lane.pts);
          const dir = (p.out ? out : -out) * (p.turning ? Math.cos(Math.PI * p.turning) : 1);
          const ahead = Math.atan2(Math.sin(p.angle), Math.abs(Math.cos(p.angle)));
          const tilt = clamp((dir >= 0 ? ahead : -ahead) * 0.06, -0.08, 0.08);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(tilt);
          ctx.scale(Math.abs(dir) < 0.08 ? 0.08 * Math.sign(dir || 1) : dir, 1);
          // (a felucca on the winding Nile leaves no wake worth drawing: it would trail over the banks)
          if (wakeArt && it.ship !== 'felucca') {
            // the painted wake trails from the stern, foam fading out astern; faint through a turn
            const ww = pw * 0.95, wh = (ww * wakeArt.naturalHeight) / wakeArt.naturalWidth;
            ctx.globalAlpha = 0.75 * (p.turning ? 1 - Math.sin(Math.PI * p.turning) : 1);
            ctx.drawImage(wakeArt, -pw * 0.18 - ww, -wh * 0.62, ww, wh);
            ctx.globalAlpha = 1;
          }
          ctx.drawImage(paint, -pw * PAINT_ANCHOR.x, -ph * PAINT_ANCHOR.y, pw, ph);
          ctx.restore();
          dirty = true;
          continue;
        }
        const sheet = sheetFor(it);
        if (sheet) {
          // the Blender ship: the frame nearest its heading, never turned, so masts and funnel stay upright;
          // one size for every type (each sheet keeps the ships' sizes to one another)
          const fsz = clamp(32 * s, 48, 88);
          if (!seen(x, y, fsz)) continue;
          const f = shipFrame(p.angle);
          const L = fsz * (SHEET_LENGTH[it.ship!] ?? 0.8);
          // the wake lies on the water, foreshortened like the ship, trailing from its stern
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1, SHEET_TILT);
          ctx.rotate(f.ground);
          ctx.globalAlpha = p.turning ? 0.35 : 0.8;
          ctx.drawImage(wakeArt ? wakePlaceholder() : wake, -L * 0.62 - L * 0.29, -L * 0.62, L * 1.24, L * 1.24);
          ctx.restore();
          ctx.globalAlpha = 1;
          const fw = sheet.width / SHEET_FRAMES, fh = sheet.height;
          ctx.drawImage(sheet, f.i * fw, 0, fw, fh, x - fsz * SHEET_ANCHOR.x, y - fsz * SHEET_ANCHOR.y, fsz, fsz);
          dirty = true;
          continue;
        }
        const size = it.ship === 'felucca' ? clamp(18 * s, 20, 46) : clamp(26 * s, 28, 64);
        if (!seen(x, y, size)) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        // seen from above, a ship turned round is simply rotated; the wake fades while it comes about
        ctx.globalAlpha = p.turning ? 0.35 : 0.8;
        ctx.drawImage(wakePlaceholder(), -size / 2, -size / 2, size, size);
        ctx.globalAlpha = 1;
        ctx.drawImage(paintingFor(it) ?? shipPlaceholder(it.ship!), -size / 2, -size / 2, size, size);
        ctx.restore();
        dirty = true;
      }
      // no caravans: the painted ones wandered the deserts to no purpose (removed 2026-11-03; C1..C5 kept unused)
      const ms = performance.now() - start;
      perf.frames++; perf.ms += ms; perf.worst = Math.max(perf.worst, ms);
    };
    const go = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', go);
    go();
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', go); };
  }, [on]);
  return <canvas ref={ref} className="map-life" aria-hidden="true" data-testid="map-life" data-on={on ? '1' : '0'} />;
}
