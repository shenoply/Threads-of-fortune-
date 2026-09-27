// The air of a painted scene: light that follows the hour, dust drifting in it, and (outdoors)
// people passing close to the camera, soft and out of focus. Nothing here reacts to the player.
import { useEffect, useRef } from 'react';
import { useGame } from '../../game/state/store';

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

export function Atmosphere({ indoor = false, crowd = false, hour }: { indoor?: boolean; crowd?: boolean; hour?: number }) {
  const gameHour = useGame((s) => s.world.hour);
  const h = hour ?? gameHour;
  const L = lightAt(h);
  const k = indoor ? 0.5 : 1;
  const hourRef = useRef(h);
  hourRef.current = h;
  return (
    <div className={`atmo ${indoor ? 'indoor' : ''}`} aria-hidden="true">
      <div className="atmo-tint" style={{ background: css(L.tint, k) }} />
      <div className="atmo-glow" style={{ background: `radial-gradient(ellipse 75% 90% at ${L.gx}% ${L.gy}%, ${css(L.glow, indoor ? 0.7 : 1)}, transparent 70%)` }} />
      <Air hourRef={hourRef} indoor={indoor} />
      {crowd && <Passers hourRef={hourRef} />}
    </div>
  );
}

const OFF = 20000;
const dpr = () => Math.min(2, window.devicePixelRatio || 1);

/** Keeps a canvas sized to its box at device resolution; returns a cleanup. */
function fit(c: HTMLCanvasElement, onSize: (w: number, h: number) => void) {
  const set = () => {
    const w = c.clientWidth, h = c.clientHeight, r = dpr();
    c.width = Math.max(1, Math.round(w * r));
    c.height = Math.max(1, Math.round(h * r));
    c.getContext('2d')!.setTransform(r, 0, 0, r, 0, 0);
    onSize(w, h);
  };
  const ro = new ResizeObserver(set);
  ro.observe(c);
  set();
  return () => ro.disconnect();
}

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
    const spawn = (): Mote => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.3, vx: (Math.random() - 0.5) * 0.006, vy: -0.002 - Math.random() * 0.006, ph: Math.random() * 6.3 });
    const unfit = fit(c, (w, h) => {
      W = w; H = h;
      const n = Math.round(Math.min(70, Math.max(24, (w * h) / 9000)) * (indoor ? 1.2 : 1));
      motes = Array.from({ length: n }, spawn);
    });
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
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
      raf = requestAnimationFrame(draw);
    };
    if (reduced()) draw(last); else raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); unfit(); };
  }, [hourRef, indoor]);
  return <canvas className="atmo-air" ref={ref} />;
}

type Kind = 'tarboosh' | 'melaya' | 'turban' | 'porter' | 'boater';
const KINDS: [Kind, number][] = [['tarboosh', 4], ['melaya', 3], ['turban', 3], ['porter', 1.5], ['boater', 0.7]];
const pickKind = (): Kind => {
  let r = Math.random() * KINDS.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of KINDS) if ((r -= w) <= 0) return k;
  return 'tarboosh';
};

/** Head and shoulders of one passer-by, top of the figure at (cx, top), u = full figure height. */
function figure(g: CanvasRenderingContext2D, kind: Kind, cx: number, top: number, u: number) {
  g.beginPath();
  const sh = kind === 'melaya' ? 0.36 : 0.32;
  g.moveTo(cx - 0.36 * u, top + 1.1 * u);
  g.bezierCurveTo(cx - 0.35 * u, top + 0.5 * u, cx - 0.3 * u, top + sh * u, cx - 0.08 * u, top + 0.31 * u);
  g.lineTo(cx - 0.05 * u, top + 0.24 * u);
  g.lineTo(cx + 0.05 * u, top + 0.24 * u);
  g.lineTo(cx + 0.08 * u, top + 0.31 * u);
  g.bezierCurveTo(cx + 0.3 * u, top + sh * u, cx + 0.35 * u, top + 0.5 * u, cx + 0.36 * u, top + 1.1 * u);
  g.closePath();
  g.fill();
  if (kind === 'melaya') {
    // a black melaya drawn over the head and shoulders
    g.beginPath();
    g.ellipse(cx, top + 0.19 * u, 0.12 * u, 0.15 * u, 0, 0, 6.2832);
    g.fill();
    g.beginPath();
    g.moveTo(cx - 0.12 * u, top + 0.2 * u);
    g.quadraticCurveTo(cx - 0.24 * u, top + 0.34 * u, cx - 0.3 * u, top + 0.5 * u);
    g.lineTo(cx + 0.3 * u, top + 0.5 * u);
    g.quadraticCurveTo(cx + 0.24 * u, top + 0.34 * u, cx + 0.12 * u, top + 0.2 * u);
    g.fill();
    return;
  }
  g.beginPath();
  g.arc(cx, top + 0.17 * u, 0.095 * u, 0, 6.2832);
  g.fill();
  if (kind === 'tarboosh' || kind === 'porter') {
    g.beginPath();
    g.moveTo(cx - 0.078 * u, top + 0.11 * u);
    g.lineTo(cx - 0.064 * u, top + 0.01 * u);
    g.lineTo(cx + 0.064 * u, top + 0.01 * u);
    g.lineTo(cx + 0.078 * u, top + 0.11 * u);
    g.fill();
  } else if (kind === 'turban') {
    g.beginPath();
    g.ellipse(cx, top + 0.1 * u, 0.115 * u, 0.075 * u, 0, 0, 6.2832);
    g.fill();
  } else if (kind === 'boater') {
    g.beginPath();
    g.ellipse(cx, top + 0.1 * u, 0.16 * u, 0.025 * u, 0, 0, 6.2832);
    g.fill();
    g.fillRect(cx - 0.085 * u, top + 0.03 * u, 0.17 * u, 0.07 * u);
  }
  if (kind === 'porter') {
    // a bale carried on the far shoulder
    g.beginPath();
    g.roundRect(cx + 0.02 * u, top + 0.08 * u, 0.34 * u, 0.24 * u, 0.05 * u);
    g.fill();
  }
}

/** People walking past close to the camera, soft and out of focus. None after dark. */
function Passers({ hourRef }: { hourRef: React.MutableRefObject<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || reduced()) return;
    const g = c.getContext('2d')!;
    let W = 1, H = 1;
    const unfit = fit(c, (w, h) => { W = w; H = h; });
    type P = { kind: Kind; x: number; dir: 1 | -1; speed: number; u: number; top: number; ph: number };
    let people: P[] = [];
    const busy = () => {
      const h = hourRef.current % 24;
      if (h >= 21 || h < 5.5) return 0;
      if (h >= 19.5 || h < 7) return 0.35;
      if (h >= 13 && h < 15.5) return 0.5; // the lane empties in the midday heat
      return 1;
    };
    let wait = 3 + Math.random() * 6;
    const add = (dir: 1 | -1, lag = 0) => {
      const u = H * (0.62 + Math.random() * 0.14);
      const w = u * 0.8;
      people.push({ kind: pickKind(), dir, x: dir === 1 ? -w - lag : W + w + lag, speed: W / (3.6 + Math.random() * 2), u, top: H * (0.56 + Math.random() * 0.08), ph: Math.random() * 6.3 });
    };
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const b = busy();
      if (b > 0 && (wait -= dt) <= 0) {
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        add(dir);
        if (Math.random() < 0.2) add(dir, H * (0.25 + Math.random() * 0.3)); // two walking together
        wait = (11 + Math.random() * 20) / b;
      }
      g.clearRect(0, 0, W, H);
      const night = lightAt(hourRef.current).sun < 0.4;
      // Out of focus: each shape is drawn off the canvas and only its blurred shadow lands in view
      // (a canvas filter or CSS blur is not drawn reliably everywhere).
      const col = night ? 'rgb(6,5,8)' : 'rgb(20,13,8)';
      g.fillStyle = col;
      g.shadowColor = col;
      g.shadowOffsetX = OFF * dpr();
      for (const p of people) {
        p.x += p.dir * p.speed * dt;
        p.ph += dt * 11;
        g.shadowBlur = p.u * 0.04 * dpr();
        figure(g, p.kind, p.x - OFF, p.top + Math.abs(Math.sin(p.ph)) * p.u * 0.012, p.u);
      }
      people = people.filter((p) => (p.dir === 1 ? p.x < W + p.u : p.x > -p.u));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); unfit(); };
  }, [hourRef]);
  return <canvas className="atmo-crowd" ref={ref} />;
}
