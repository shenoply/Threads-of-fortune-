import { useEffect, useRef } from 'react';
import type { Battle, Man } from '../../game/systems/battle';
import { BAND_ART } from './BattleField';

/**
 * The fight drawn from above on the painted ground, every man a token: your men warm-ringed at the
 * bottom, the band dark-ringed at the top. Rifles flash and leave smoke, the fallen stay where they fell.
 * One canvas, redrawn every frame from the battle the screen steps; tapping the ground sends the
 * chosen group there.
 */
const art = (id: string) => `art/battle/${id}.webp`;

interface Sprite { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number; ok: boolean }
const SPRITES = new Map<string, Sprite>();
/** load a token and find where the figure actually is on its canvas, so every man is drawn at one size */
function sprite(id: string): Sprite {
  let s = SPRITES.get(id);
  if (s) return s;
  const img = new Image();
  s = { img, sx: 0, sy: 0, sw: 512, sh: 512, ok: false };
  SPRITES.set(id, s);
  const me = s;
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); const w = img.naturalWidth, h = img.naturalHeight;
      c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true })!;
      x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y += 2) for (let xx = 0; xx < w; xx += 2) if (d[(y * w + xx) * 4 + 3] > 110) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 > x0) { const side = Math.max(x1 - x0, y1 - y0) + 8; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; me.sx = cx - side / 2; me.sy = cy - side / 2; me.sw = side; me.sh = side; }
    } catch { /* drawn uncropped */ }
    me.ok = true;
  };
  img.src = art(id);
  return s;
}

const heroKind = 'hero';
function kindArt(m: Man, bandId: string) {
  const band = BAND_ART[bandId] ?? BAND_ART['egypt-rural-highway-robbers'];
  if (m.state === 'down' || m.state === 'dead') return m.side === 0 ? 'fallen-light' : 'fallen-dark';
  if (m.hero) return heroKind;
  if (m.side === 1) return m.leader ? band.leader : band.man;
  return m.kind;
}

export function FieldCanvas({ battle, bandId, field, camels, wall, selected, onTap, frame }: {
  battle: React.MutableRefObject<Battle | null>; bandId: string; field: string; camels: number; wall: boolean;
  selected: string; onTap: (x: number, y: number) => void;
  /** called every frame before drawing: the screen steps the battle here */
  frame: (dt: number) => void;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLImageElement | null>(null);
  const tap = useRef<{ x: number; y: number; t: number } | null>(null);
  const sel = useRef(selected); sel.current = selected;
  const step = useRef(frame); step.current = frame;
  useEffect(() => { const i = new Image(); i.src = field; bg.current = i; }, [field]);
  useEffect(() => {
    let id = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      step.current(dt);
      draw(now / 1000);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = (now: number) => {
    const c = cv.current, b = battle.current; if (!c || !b) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const x = c.getContext('2d')!; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the ground, cover-fitted
    const im = bg.current;
    if (im && im.complete && im.naturalWidth) {
      const k = Math.max(W / im.naturalWidth, H / im.naturalHeight); const w = im.naturalWidth * k, h = im.naturalHeight * k;
      x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    } else { x.fillStyle = '#6b5636'; x.fillRect(0, 0, W, H); }
    const X = (v: number) => (v / 100) * W, Y = (v: number) => (v / 100) * H;
    const unit = Math.min(W, H * 0.75);
    const tok = (id: string, cx: number, cy: number, size: number, rot: number, alpha = 1) => {
      const s = sprite(id); if (!s.ok) return;
      x.save(); x.globalAlpha = alpha; x.translate(cx, cy); x.rotate(rot); x.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, -size / 2, -size / 2, size, size); x.restore();
    };
    // the camels: knelt in a line as a wall, or standing with the loads behind the men
    if (wall) { const n = Math.max(2, Math.min(5, camels)); for (let i = 0; i < n; i++) tok('camel', X(50 + (i - (n - 1) / 2) * 22), Y(66), unit * 0.22, Math.PI / 2); }
    else { const n = Math.min(3, camels); for (let i = 0; i < n; i++) tok('camel', X(50 + (i - (n - 1) / 2) * 16), Y(94), unit * 0.2, 0); }
    // the fallen first, then the living, then the smoke over them
    const order = [...b.men].sort((a, c2) => (a.state === 'up' ? 1 : 0) - (c2.state === 'up' ? 1 : 0));
    for (const m of order) {
      if (m.state === 'fled') continue;
      const px = X(m.x), py = Y(m.y);
      const size = unit * (m.state !== 'up' ? 0.11 : m.mounted ? 0.16 : m.hero || m.leader ? 0.13 : 0.115);
      if (m.state !== 'up') { tok(kindArt(m, b === null ? '' : bandId), px, py, size, (m.id * 1.7) % 6.28, 0.85); continue; }
      // a ring on the ground under each man: warm for yours, dark red for theirs, gold for the group you lead
      const chosen = m.side === 0 && !m.fleeing && (sel.current === 'all' ? !m.hero : sel.current === 'hero' ? m.hero : sel.current === m.group && !m.hero);
      x.beginPath(); x.ellipse(px, py + size * 0.08, size * 0.42, size * 0.3, 0, 0, Math.PI * 2);
      x.lineWidth = chosen ? 2.5 : 1.5;
      x.strokeStyle = m.side === 0 ? (chosen ? '#ffd27a' : 'rgba(255,236,200,.75)') : 'rgba(150,30,20,.85)';
      x.fillStyle = m.side === 0 ? 'rgba(255,230,180,.16)' : 'rgba(90,10,5,.2)';
      x.fill(); x.stroke();
      const shake = m.fleeing ? Math.sin(now * 30 + m.id) * 0.15 : 0;
      tok(kindArt(m, bandId), px, py, size, m.face + Math.PI / 2 + shake);
      if (m.hero || m.leader) {
        // a small mark over Hassan and over their leader
        x.save(); x.translate(px, py - size * 0.62); x.rotate(Math.PI / 4); x.fillStyle = m.hero ? '#ffd27a' : '#d0402a'; x.strokeStyle = '#1a0f06'; x.lineWidth = 1; x.fillRect(-3.5, -3.5, 7, 7); x.strokeRect(-3.5, -3.5, 7, 7); x.restore();
        if (m.hp < m.maxHp) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(px - 12, py + size * 0.5, 24, 3); x.fillStyle = m.hero ? '#e8c05a' : '#e0553c'; x.fillRect(px - 12, py + size * 0.5, 24 * (m.hp / m.maxHp), 3); }
      }
    }
    // rifle fire: a flash at the muzzle, a thread of the shot, a puff of smoke that drifts and thins
    for (const s of b.shots) {
      const age = b.t - s.t; if (age > 2.2 || age < 0) continue;
      const sx = X(s.x), sy = Y(s.y);
      if (age < 0.09) {
        x.strokeStyle = 'rgba(255,240,190,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx, sy); x.lineTo(X(s.x2), Y(s.y2)); x.stroke();
        x.fillStyle = 'rgba(255,220,120,.95)'; x.beginPath(); x.arc(sx, sy + (s.side === 0 ? -8 : 8), 4, 0, Math.PI * 2); x.fill();
      }
      const r = 6 + age * 9, a = Math.max(0, 0.5 - age * 0.23);
      x.fillStyle = `rgba(235,228,212,${a})`; x.beginPath(); x.arc(sx + age * 7, sy + (s.side === 0 ? -9 : 9) - age * 3, r, 0, Math.PI * 2); x.fill();
      if (s.hit && age < 0.35) { x.fillStyle = `rgba(160,30,20,${0.6 - age})`; x.beginPath(); x.arc(X(s.x2), Y(s.y2), 3 + age * 10, 0, Math.PI * 2); x.fill(); }
    }
    // where you sent them
    const t = tap.current;
    if (t && now - t.t < 1) { const a = 1 - (now - t.t); x.strokeStyle = `rgba(255,210,122,${a})`; x.lineWidth = 2; x.beginPath(); x.arc(X(t.x), Y(t.y), 10 + (1 - a) * 14, 0, Math.PI * 2); x.stroke(); }
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 100, py = ((e.clientY - r.top) / r.height) * 100;
    tap.current = { x: px, y: py, t: performance.now() / 1000 };
    onTap(px, py);
  };
  return <canvas ref={cv} className="fb-canvas" onPointerDown={down} data-testid="battlefield" aria-label="The battlefield. Tap the ground to send the chosen men there." />;
}
