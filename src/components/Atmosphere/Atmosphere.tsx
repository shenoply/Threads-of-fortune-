// The air of a painted scene: light that follows the hour, lantern glow, and dust drifting in it.
// Nothing here reacts to the player.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { DustHaze } from './DustHaze';
import { Weather } from './Weather';

type RGBA = [number, number, number, number];
interface Key { h: number; tint: RGBA; glow: RGBA; gx: number; gy: number; sun: number }

// The light through a day in Giza. tint is multiplied over the painting, glow is added from where the light comes.
const NIGHT: Omit<Key, 'h'> = { tint: [28, 36, 84, 0.55], glow: [255, 170, 90, 0.2], gx: 12, gy: 88, sun: 0.12 };
const KEYS: Key[] = [
  { h: 0, ...NIGHT },
  { h: 4.8, ...NIGHT },
  { h: 6, tint: [120, 90, 120, 0.3], glow: [255, 175, 140, 0.28], gx: 4, gy: 40, sun: 0.5 },
  { h: 8, tint: [255, 225, 190, 0.16], glow: [255, 215, 150, 0.2], gx: 4, gy: 30, sun: 0.9 },
  { h: 11, tint: [255, 250, 240, 0], glow: [255, 245, 225, 0.08], gx: 50, gy: 0, sun: 1 },
  { h: 14.5, tint: [255, 250, 240, 0], glow: [255, 245, 225, 0.08], gx: 50, gy: 0, sun: 1 },
  { h: 16.5, tint: [255, 205, 150, 0.16], glow: [255, 200, 120, 0.22], gx: 96, gy: 30, sun: 0.95 },
  { h: 18.2, tint: [210, 110, 70, 0.38], glow: [255, 150, 80, 0.4], gx: 98, gy: 45, sun: 0.7 },
  { h: 19.5, tint: [70, 60, 110, 0.42], glow: [255, 160, 80, 0.2], gx: 12, gy: 88, sun: 0.3 },
  { h: 21, ...NIGHT },
  { h: 24, ...NIGHT },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixC = (a: RGBA, b: RGBA, t: number) => a.map((v, i) => mix(v, b[i], t)) as RGBA;
const css = ([r, g, b, a]: RGBA, k = 1) => `rgba(${r | 0},${g | 0},${b | 0},${(a * k).toFixed(3)})`;

export function lightAt(hour: number): Omit<Key, 'h'> {
  const h = ((hour % 24) + 24) % 24;
  const i = Math.max(0, KEYS.findIndex((k) => k.h > h) - 1);
  const a = KEYS[i], b = KEYS[i + 1] ?? a;
  const t = b.h > a.h ? (h - a.h) / (b.h - a.h) : 0;
  return { tint: mixC(a.tint, b.tint, t), glow: mixC(a.glow, b.glow, t), gx: mix(a.gx, b.gx, t), gy: mix(a.gy, b.gy, t), sun: mix(a.sun, b.sun, t) };
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** sheltered: the Giza stall, whose view outside has its own sky (StallSky): the hour's tint falls more
 *  lightly under the awning, and after dark the lamps keep the inside warm */
export function Atmosphere({ indoor = false, hour, sheltered = false }: { indoor?: boolean; hour?: number; sheltered?: boolean }) {
  const gameHour = useGame((s) => s.world.hour);
  const h = hour ?? gameHour;
  const L = lightAt(h);
  const k = indoor ? 0.5 : sheltered ? 0.6 : 1;
  const night = Math.min(1, Math.max(0, (0.9 - L.sun) / 0.75));
  const hourRef = useRef(h);
  hourRef.current = h;
  return (
    <div className={`atmo ${indoor ? 'indoor' : ''}`} aria-hidden="true">
      <div className="atmo-tint" style={{ background: css(L.tint, k) }} />
      <div className="atmo-glow" style={{ background: `radial-gradient(ellipse 75% 90% at ${L.gx}% ${L.gy}%, ${css(L.glow, indoor ? 0.7 : 1)}, transparent 70%)` }} />
      {sheltered && night > 0.05 && <div className="atmo-warm" style={{ opacity: night, background: 'radial-gradient(ellipse 42% 55% at 36% 40%, rgba(255,176,96,.26), rgba(255,150,70,.08) 60%, transparent 80%)' }} />}
      <Lamps night={night} />
      <Air hourRef={hourRef} indoor={indoor} />
      {!indoor && hour === undefined && <DustHaze />}
      {!indoor && hour === undefined && <Weather />}
    </div>
  );
}

// Lanterns painted into a scene. A painting marks them on its <img>:
//   data-lamps="0.537,0.124;0.412,0.252"  (flame centres as fractions of the image)
//   data-lamp-size="260"                   (halo diameter in image pixels, optional)
// Each gets a softly breathing halo, faint by day and warm after dark.
type Lamp = { x: number; y: number; d: number };

function lampsIn(root: HTMLElement): Lamp[] {
  const box = root.getBoundingClientRect();
  const out: Lamp[] = [];
  root.closest('.atmo')?.parentElement?.querySelectorAll<HTMLImageElement>('img[data-lamps]').forEach((img) => {
    if (!img.naturalWidth || img.style.display === 'none') return;
    const W = img.offsetWidth, H = img.offsetHeight;
    if (!W || !H) return;
    const r = img.getBoundingClientRect();
    const clip = img.parentElement!.getBoundingClientRect();
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight); // object-fit: cover
    const cw = img.naturalWidth * s, ch = img.naturalHeight * s;
    const kx = r.width / W, ky = r.height / H; // any transform: scale
    const d = parseFloat(img.dataset.lampSize ?? '260') * s * kx;
    for (const pt of img.dataset.lamps!.split(';')) {
      const [fx, fy] = pt.split(',').map(Number);
      const x = r.left + ((W - cw) * px + fx * cw) * kx;
      const y = r.top + ((H - ch) * py + fy * ch) * ky;
      if (x < clip.left || x > clip.right || y < clip.top || y > clip.bottom) continue;
      out.push({ x: x - box.left, y: y - box.top, d });
    }
  });
  return out;
}

function Lamps({ night }: { night: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lamps, setLamps] = useState<Lamp[]>([]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = lampsIn(el);
      setLamps((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // paintings load and swap (a new buyer, a new pose), so look again now and then
    const t = setInterval(() => { if (!document.hidden) update(); }, 1000);
    update();
    return () => { ro.disconnect(); clearInterval(t); };
  }, []);
  return (
    <div className="atmo-lamps" ref={ref} style={{ opacity: 0.14 + night * 0.8 }}>
      {lamps.map((l, i) => (
        <span key={i} style={{ left: l.x - l.d / 2, top: l.y - l.d / 2, width: l.d, height: l.d, animationDuration: `${2.3 + (i % 3) * 0.45}s`, animationDelay: `${-i * 0.7}s` }} />
      ))}
    </div>
  );
}

// The dust is soft and small: drawn at one canvas pixel per CSS pixel even on sharp phone screens
// (four times fewer pixels to clear and fill than at 2x), and nobody can tell.
const dpr = () => 1;

/** Keeps a canvas sized to its box; returns a cleanup. */
function fit(c: HTMLCanvasElement, onSize: (w: number, h: number) => void) {
  const set = () => {
    const w = c.clientWidth, h = c.clientHeight, r = dpr();
    const cw = Math.max(1, Math.round(w * r)), ch = Math.max(1, Math.round(h * r));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    c.getContext('2d')!.setTransform(r, 0, 0, r, 0, 0);
    onSize(w, h);
  };
  const ro = new ResizeObserver(set);
  ro.observe(c);
  set();
  return () => ro.disconnect();
}

/** True when nothing of the scene under the canvas can be seen: a sheet, a panel or another screen
 *  sits on top of it. A few points across the canvas are tested; one that lands on the scene is enough. */
function covered(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return true;
  const scene = c.closest('.atmo')?.parentElement;
  if (!scene) return false;
  for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.75], [0.75, 0.75]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (hit && scene.contains(hit)) return false;
  }
  return true;
}

const FRAME_MS = 1000 / 24; // dust drifts slowly: 24 frames a second look the same as 60

/** Motes of dust, brightest where the light comes from. */
function Air({ hourRef, indoor }: { hourRef: React.MutableRefObject<number>; indoor: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    let W = 1, H = 1;
    type Mote = { x: number; y: number; r: number; vx: number; vy: number; ph: number };
    let motes: Mote[] = [];
    const spawn = (): Mote => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.4, vx: (Math.random() - 0.5) * 0.006, vy: -0.002 - Math.random() * 0.006, ph: Math.random() * 6.3 });
    const still = reduced();
    let raf = 0, last = performance.now(), drawn = 0;
    // the loop runs only while the dust can be seen: not in a hidden tab, not while the canvas is off
    // screen or not displayed, and not while another screen covers the scene
    let onScreen = true, hidden = false;
    const paused = () => document.hidden || !onScreen || hidden;
    const draw = (now: number) => {
      raf = 0;
      if (paused()) return;
      if (!still) raf = requestAnimationFrame(draw);
      if (!still && now - drawn < FRAME_MS - 2) return;
      drawn = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const L = lightAt(hourRef.current);
      const lx = L.gx / 100, ly = L.gy / 100;
      g.clearRect(0, 0, W, H);
      for (const m of motes) {
        m.ph += dt * 0.6;
        m.x += (m.vx + Math.sin(m.ph) * 0.003) * dt;
        m.y += m.vy * dt;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02; else if (m.x > 1.02) m.x = -0.02;
        const near = Math.max(0, 1 - Math.hypot(m.x - lx, (m.y - ly) * 0.8) * 1.1);
        const a = (0.1 + near * 0.5) * (0.25 + L.sun * 0.75) * (0.75 + Math.sin(m.ph * 1.7) * 0.25);
        if (a < 0.02) continue;
        g.fillStyle = `rgba(255,${L.sun > 0.4 ? 230 : 200},${L.sun > 0.4 ? 180 : 150},${a.toFixed(3)})`;
        g.beginPath();
        g.arc(m.x * W, m.y * H, m.r, 0, 6.2832);
        g.fill();
      }
    };
    const start = () => {
      if (raf || paused()) return;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const unfit = fit(c, (w, h) => {
      W = w; H = h;
      // fewer, slightly larger motes: about 30 on a phone, never more than 44
      const n = Math.round(Math.min(44, Math.max(16, (w * h) / 13000)) * (indoor ? 1.2 : 1));
      motes = Array.from({ length: n }, spawn);
      if (still) { cancelAnimationFrame(raf); raf = 0; start(); } // with reduced motion: one still frame, drawn afresh at each size
    });
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; if (onScreen && !still) start(); })
      : null;
    io?.observe(c);
    const onVis = () => { if (!document.hidden && !still) start(); };
    document.addEventListener('visibilitychange', onVis);
    // now and then, look whether the scene is still in view or another screen has been laid over it
    const look = window.setInterval(() => {
      if (document.hidden || !onScreen) return;
      const was = hidden;
      hidden = covered(c);
      if (was && !hidden && !still) start();
    }, 1000);
    start();
    return () => {
      cancelAnimationFrame(raf); raf = 0; unfit(); io?.disconnect(); clearInterval(look);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hourRef, indoor]);
  return <canvas className="atmo-air" ref={ref} />;
}
