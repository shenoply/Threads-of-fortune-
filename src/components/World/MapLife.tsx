// The travel map's life: ships sailing their short lanes, caravans walking theirs, clouds drifting, the
// haze of a sandstorm breathing, seabirds. One small canvas over the painting, drawn by its own frame
// loop straight from the live camera (no React render per frame), about thirty times a second, and not at
// all while the tab is hidden or "Map life" is off in Settings.
import { useEffect, useRef } from 'react';
import { SHIPS, CARAVANS, WEATHER, WAKE, type ArtItem } from '../../data/mapArt';
import { mapLanes, poseAt } from '../../game/systems/mapLife';
import { paintingFor, shipPlaceholder, wakePlaceholder, caravanPlaceholder, cloudPlaceholder, hazePlaceholder, drawBirds } from '../../game/systems/mapArtDraw';

export interface Camera { tx: number; ty: number; s: number; w: number; h: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** frame times of the last few seconds, for the performance check (tests/maplife.mjs) */
const perf = { frames: 0, ms: 0, worst: 0 };
if (typeof window !== 'undefined') (window as unknown as { __mapLife?: typeof perf }).__mapLife = perf;

export function MapLife({ camera, on }: { camera: () => Camera | null; on: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const camRef = useRef(camera);
  camRef.current = camera;
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !on) { if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height); return; }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const lanes = mapLanes();
    const t0 = performance.now();
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
      // ships, each turned to its heading, its wake trailing behind it
      const wake = paintingFor(WAKE) ?? wakePlaceholder();
      for (const it of SHIPS) {
        const lane = lanes.get(it.code);
        if (!lane) continue;
        const p = poseAt(lane, t);
        const x = X(p.x), y = Y(p.y);
        const size = it.ship === 'felucca' ? clamp(18 * s, 20, 46) : clamp(26 * s, 28, 64);
        if (!seen(x, y, size)) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        // seen from above, a ship turned round is simply rotated; the wake fades while it comes about
        ctx.globalAlpha = p.turning ? 0.35 : 0.8;
        ctx.drawImage(wake, -size / 2, -size / 2, size, size);
        ctx.globalAlpha = 1;
        ctx.drawImage(paintingFor(it) ?? shipPlaceholder(it.ship!), -size / 2, -size / 2, size, size);
        ctx.restore();
        dirty = true;
      }
      // caravans: they face the way they walk (mirrored, never turned on their heads)
      for (const it of CARAVANS as ArtItem[]) {
        const lane = lanes.get(it.code);
        if (!lane) continue;
        const p = poseAt(lane, t);
        const x = X(p.x), y = Y(p.y);
        const size = clamp(40 * s, 34, 96);
        if (!seen(x, y, size)) continue;
        const img = paintingFor(it);
        const left = Math.cos(p.angle) < 0;
        ctx.save();
        ctx.translate(x, y);
        if (left) ctx.scale(-1, 1);
        if (img) ctx.drawImage(img, -size / 2, -size / 2 + Math.sin(t * 3) * size * 0.006, size, size);
        else {
          const ph = caravanPlaceholder(it.camels ?? 4, Math.floor(t * 2.2) % 2);
          const w = size * 1.25, h = (w * ph.height) / ph.width;
          ctx.drawImage(ph, -w / 2, -h / 2, w, h);
        }
        ctx.restore();
        dirty = true;
      }
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
