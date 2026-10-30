// A carpet in your hands, all in one: it rolls and unrolls, spins round on the floor, tips towards
// you, zooms and moves, all at once and at any moment, drawn on one canvas from the carpet's own
// picture. One finger: across spins it, up or down tips it; zoomed in, it slides the carpet instead,
// so you can go to a corner or the fringe. Two fingers: pinch to zoom about the point between them,
// move to slide it, twist to turn it (or the turn button). The roll bar under it rolls it up or lays it out as far as you like, whatever angle or
// zoom it is at; the roll button does it in one go. A double tap lays it straight again.
// Used by the inspector and by the weaver's screen for carpets of your own.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CORE as CORE_R, THICK as THICK_T, extent, outerRadius, rollAt, springStep } from '../../game/roll';
import { audio } from '../../game/audio/engine';
import { Icon } from '../Icon';
import './carpet-view.css';

const TILT = 0.6; // how far the view tips while the carpet is in its roll, so the roll reads as round
const F = 2.6; // camera distance, in carpet lengths
const ZMIN = 0.6, ZMAX = 4;

interface View {
  p: number; v: number; goal: number | null; hand: number | null; sound: boolean;
  settle: number; settleAmp: number;
  yaw: number; pitch: number; zoom: number; px: number; py: number; vy: number;
  ease: { yaw: number; pitch: number; zoom: number; px: number; py: number } | null;
  rest: number; dirty: boolean;
}

export interface CarpetViewProps {
  src: string;
  filter?: string;
  /** start rolled and unroll as it opens */
  unroll?: boolean;
  /** any use of the controls (the lesson counts a closer look) */
  onUse?: () => void;
  /** more buttons for the tool column (the reverse side, in the inspector) */
  tools?: ReactNode;
  /** a line over the picture (e.g. "Simulated reverse") */
  label?: ReactNode;
  hint?: boolean;
}

export function CarpetView({ src, filter, unroll = false, onUse, tools, label, hint: hintOn = false }: CarpetViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const V = useRef<View>({ p: unroll ? 0 : 1, v: 0, goal: unroll ? 1 : null, hand: null, sound: false, settle: 0, settleAmp: 0, yaw: 0, pitch: 0, zoom: 1, px: 0, py: 0, vy: 0, ease: null, rest: 0, dirty: true });
  const [ui, setUi] = useState({ p: unroll ? 0 : 1, zoom: 1, turned: false, moving: unroll });
  const [hint, setHint] = useState(hintOn);
  useEffect(() => { if (!hint) return; const t = window.setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, [hint]);
  const used = () => { onUse?.(); setHint(false); };

  // the picture
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      img.current = im;
      // a long carpet on a tall phone screen lies up the screen, so it fills it
      const el = box.current;
      const v = V.current;
      if (el && el.clientHeight > el.clientWidth * 1.15 && im.naturalWidth > im.naturalHeight * 1.15 && v.rest === 0 && v.yaw === 0) { v.rest = Math.PI / 2; v.yaw = Math.PI / 2; }
      v.dirty = true;
    };
    im.src = src;
  }, [src]);

  // drawing and motion, every frame
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    let raf = 0, last = 0, alive = true, uiT = 0;
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const frame = (now: number) => {
      if (!alive) return;
      const dt = last ? Math.min(0.08, (now - last) / 1000) : 1 / 60;
      last = now;
      const v = V.current;
      let moving = false;
      // the roll: under the finger, springing to an end, or resting where it was left
      if (v.hand != null) { const np = Math.max(0, Math.min(1, v.hand)); if (np !== v.p) { v.p = np; v.dirty = true; } v.v = 0; v.settle = 0; }
      else if (v.goal != null) {
        if (!v.sound && Math.abs(v.goal - v.p) > 0.05) { v.sound = true; audio.sfx('unfold'); }
        [v.p, v.v] = springStep(v.p, v.v, v.goal, dt, 4.4, 0.8);
        if (v.p > 1) { v.settleAmp = Math.min(0.02, Math.abs(v.v) * 0.008); v.p = 1; v.v = 0; v.settle = v.settle || 0.0001; }
        if (v.p < 0) { v.p = 0; v.v = 0; }
        if (Math.abs(v.p - v.goal) < 0.0015 && Math.abs(v.v) < 0.01 && (v.settle === 0 || v.settle > 0.9)) { v.p = v.goal; v.goal = null; v.sound = false; }
        v.dirty = true; moving = true;
      }
      if (v.settle > 0) { v.settle += dt; if (v.settle > 1.2) v.settle = 0; v.dirty = true; moving = true; }
      // a flick carries the spin on a little
      if (Math.abs(v.vy) > 0.05 && !drag.current) { v.yaw += v.vy * dt; v.vy *= Math.exp(-3.2 * dt); v.dirty = true; moving = true; } else if (!drag.current) v.vy = 0;
      // easing back to straight, or round a quarter turn
      if (v.ease) {
        const k = 1 - Math.exp(-7 * dt), e = v.ease;
        v.yaw += (e.yaw - v.yaw) * k; v.pitch += (e.pitch - v.pitch) * k; v.zoom += (e.zoom - v.zoom) * k; v.px += (e.px - v.px) * k; v.py += (e.py - v.py) * k;
        if (Math.abs(e.yaw - v.yaw) < 0.002 && Math.abs(e.pitch - v.pitch) < 0.002 && Math.abs(e.zoom - v.zoom) < 0.002 && Math.abs(e.px - v.px) < 0.5 && Math.abs(e.py - v.py) < 0.5) { Object.assign(v, e); v.ease = null; }
        v.dirty = true; moving = true;
      }
      if (v.dirty) { draw(); v.dirty = false; }
      if (now - uiT > 90) {
        uiT = now;
        const turned = Math.abs(v.yaw - v.rest) > 0.01 || Math.abs(v.pitch) > 0.01 || Math.abs(v.zoom - 1) > 0.01 || Math.abs(v.px) > 1 || Math.abs(v.py) > 1;
        setUi((u) => (Math.abs(u.p - v.p) > 0.004 || Math.abs(u.zoom - v.zoom) > 0.04 || u.turned !== turned || u.moving !== moving ? { p: v.p, zoom: v.zoom, turned, moving } : u));
      }
      raf = requestAnimationFrame(frame);
    };

    const draw = () => {
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const im = img.current;
      if (!im || !im.naturalWidth) return;
      const v = V.current;
      const p = v.p, iw = im.naturalWidth, ih = im.naturalHeight, wz = ih / iw;
      // the size it lies at when flat and straight: the whole carpet in view, either way round
      const along = Math.abs(Math.sin(v.rest)) > 0.5;
      const S0 = along ? Math.min(H * 0.9, (W * 0.92) / wz) : Math.min(W * 0.92, (H * 0.88) / wz);
      const phi = TILT * Math.pow(1 - p, 0.7);
      const cph = Math.cos(phi), sph = Math.sin(phi);
      const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      const [x0, x1] = extent(p);
      const len = x1 - x0;
      // closer in as it rolls up, so the roll is not lost in the middle of the screen
      const zr = Math.max(1, Math.min(1.5, (along ? H * 0.9 : W * 0.9) / (S0 * len), (along ? W * 0.86 : H * 0.86) / (S0 * wz)));
      const S = S0 * (1 + (zr - 1) * Math.pow(1 - p, 1.5)) * v.zoom;
      const raw = (x: number, y: number, z: number) => {
        const X = x * cy - z * sy, Z = x * sy + z * cy;
        const Xs = X * cph + y * sph, D1 = -X * sph + y * cph;
        const Zs = Z * cp + D1 * sp, Dep = D1 * cp - Z * sp;
        const k = F / (F - Dep * 1.2);
        return { x: Xs * S * k, y: Zs * S * k, d: Dep };
      };
      const cen = raw((x0 + x1) / 2, 0, 0);
      const ox = W / 2 + v.px - cen.x, oy = H / 2 + v.py - cen.y;
      const proj = (x: number, y: number, z: number) => { const q = raw(x, y, z); return { x: ox + q.x, y: oy + q.y, d: q.d }; };
      const wob = v.settle > 0 ? v.settleAmp * Math.exp(-v.settle * 5.5) * Math.sin(v.settle * 15) : 0;
      // the shadow it throws on the floor
      {
        const a = proj(Math.max(x0, -0.5), 0, -wz / 2), b = proj(Math.min(p - 0.5, 0.5), 0, -wz / 2), cc = proj(Math.min(p - 0.5, 0.5), 0, wz / 2), d = proj(Math.max(x0, -0.5), 0, wz / 2);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.moveTo(a.x + 5, a.y + 9); g.lineTo(b.x + 5, b.y + 9); g.lineTo(cc.x + 5, cc.y + 9); g.lineTo(d.x + 5, d.y + 9); g.closePath(); g.fill();
      }
      g.filter = filter || 'none';
      const L = { x: -0.35, y: 0.94 };
      const piece = (u0: number, u1: number, P0: { x: number; y: number }, P1: { x: number; y: number }, shade: boolean) => {
        const A = proj(P0.x, P0.y, -wz / 2), B = proj(P1.x, P1.y, -wz / 2), C = proj(P0.x, P0.y, wz / 2), D = proj(P1.x, P1.y, wz / 2);
        const sx0 = u0 * iw, sw = Math.max(0.5, (u1 - u0) * iw);
        const ta = (B.x - A.x) / sw, tb = (B.y - A.y) / sw, tc = (C.x - A.x) / ih, td = (C.y - A.y) / ih;
        g.setTransform(dpr * ta, dpr * tb, dpr * tc, dpr * td, dpr * (A.x - ta * sx0), dpr * (A.y - tb * sx0));
        const over = shade ? sw * 0.6 + 0.6 : 0.6;
        g.drawImage(im, sx0, 0, Math.min(iw - sx0, sw + over), ih, sx0, 0, Math.min(iw - sx0, sw + over), ih);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!shade) return;
        let tx = P1.x - P0.x, ty = P1.y - P0.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = -ty, ny = tx, facing = (-nx * sph + ny * cph) * cp, fn = facing >= 0 ? 1 : -1;
        const lit = Math.max(0, (nx * L.x + ny * L.y) * fn);
        let dark = 1 - (0.55 + 0.45 * lit);
        if (facing < 0) dark = Math.min(0.85, 0.38 + dark * 0.8);
        if (dark > 0.01) {
          g.fillStyle = `rgba(12,7,3,${dark.toFixed(3)})`;
          g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.lineTo(D.x, D.y); g.lineTo(C.x, C.y); g.closePath(); g.fill();
        }
      };
      // the flat part: one piece when seen straight down, thin strips when in perspective
      const flatEnd = Math.min(1, p);
      const persp = phi > 0.005 || Math.abs(v.pitch) > 0.005;
      const nFlat = flatEnd <= 0 ? 0 : wob ? 24 : persp ? Math.max(4, Math.ceil(flatEnd * 48)) : 1;
      for (let i = 0; i < nFlat; i++) {
        const u0 = (flatEnd * i) / nFlat, u1 = (flatEnd * (i + 1)) / nFlat;
        const lift = (u: number) => (p >= 0.9999 && wob ? wob * Math.max(0, (u - 0.72) / 0.28) ** 2 : 0);
        piece(u0, u1, { x: u0 - 0.5, y: lift(u0) }, { x: u1 - 0.5, y: lift(u1) }, !!wob && u1 > 0.72);
      }
      // tipped towards you, the pile darkens a little; tipped right over, you see its back in shade
      if (Math.abs(sp) > 0.05 && flatEnd > 0) {
        const a = proj(-0.5, 0, -wz / 2), b = proj(flatEnd - 0.5, 0, -wz / 2), cc = proj(flatEnd - 0.5, 0, wz / 2), d = proj(-0.5, 0, wz / 2);
        g.filter = 'none';
        g.fillStyle = `rgba(10,6,3,${Math.min(0.3, Math.abs(sp) * 0.3).toFixed(3)})`;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
        g.filter = filter || 'none';
      }
      // the roll: slices close enough to stay round, far ones first
      if (p < 0.9999) {
        const R = outerRadius(p);
        const turnsAngle = (2 * Math.PI * (R - CORE_R)) / THICK_T;
        const n = Math.max(24, Math.min(160, Math.ceil(turnsAngle / 0.32)));
        const pts: { u: number; x: number; y: number }[] = [];
        for (let i = 0; i <= n; i++) { const u = p + ((1 - p) * i) / n; const q = rollAt(u, p); pts.push({ u, x: q.x, y: q.y }); }
        const order = Array.from({ length: n }, (_, i) => i);
        const depthOf = (i: number) => raw((pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2, 0).d;
        order.sort((i, j) => depthOf(i) - depthOf(j));
        for (const i of order) piece(pts[i].u, pts[i + 1].u, pts[i], pts[i + 1], true);
      }
      g.filter = 'none';
    };
    const ro = new ResizeObserver(() => { V.current.dirty = true; });
    ro.observe(c);
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [filter]);
  useEffect(() => { V.current.dirty = true; }, [src, filter]);

  // ---- the hands ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; px: number; py: number; axis?: 'x' | 'y' | 'pan'; lt: number; on: boolean } | null>(null);
  // a pinch: zoom about the point between the fingers (cx, cy: the stage's centre on screen), and a twist turns it
  const pinch = useRef<{ d: number; z: number; mx: number; my: number; px: number; py: number; cx: number; cy: number; a: number; yaw: number; twist: boolean } | null>(null);
  const lastTap = useRef(0);
  const straighten = () => { const v = V.current; v.vy = 0; v.ease = { yaw: v.rest + Math.round((v.yaw - v.rest) / (2 * Math.PI)) * 2 * Math.PI, pitch: 0, zoom: 1, px: 0, py: 0 }; };
  const release = () => {
    const v = V.current;
    if (v.hand != null) { v.hand = null; v.goal = null; }
  };
  useEffect(() => {
    const lift = (e: PointerEvent) => { pointers.current.delete(e.pointerId); if (!pointers.current.size) { pinch.current = null; drag.current = null; release(); } };
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);
    return () => { window.removeEventListener('pointerup', lift); window.removeEventListener('pointercancel', lift); };
  }, []);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button, input')) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = V.current;
    v.ease = null;
    if (pointers.current.size === 2) {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      v.vy = 0;
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: v.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, px: v.px, py: v.py, cx: r.left + r.width / 2, cy: r.top + r.height / 2, a: Math.atan2(b.y - a.y, b.x - a.x), yaw: v.yaw, twist: false };
      return;
    }
    if (pointers.current.size > 2 || pinch.current) return;
    v.vy = 0;
    drag.current = { x: e.clientX, y: e.clientY, yaw: v.yaw, pitch: v.pitch, px: v.px, py: v.py, lt: e.timeStamp, on: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = V.current;
    const pc = pinch.current;
    if (pc && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      v.zoom = Math.max(ZMIN, Math.min(ZMAX, pc.z * (Math.hypot(a.x - b.x, a.y - b.y) / pc.d)));
      // the spot under the fingers stays under them as it grows or shrinks
      const k = v.zoom / pc.z, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      v.px = mx - pc.cx - (pc.mx - pc.cx - pc.px) * k; v.py = my - pc.cy - (pc.my - pc.cy - pc.py) * k;
      // a twist of the two fingers turns it, once it is clearly meant (a pinch alone never turns it)
      let da = Math.atan2(b.y - a.y, b.x - a.x) - pc.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (!pc.twist && Math.abs(da) > 0.26) pc.twist = true;
      if (pc.twist) v.yaw = pc.yaw + da;
      v.dirty = true; used();
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on && Math.hypot(dx, dy) < 8) return;
    // zoomed in, one finger slides the carpet under the glass; the turn button or a two-finger twist turns it
    if (!d.on) { d.on = true; d.axis = v.zoom > 1.05 ? 'pan' : Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; used(); }
    const dt = Math.max(1, e.timeStamp - d.lt) / 1000;
    if (d.axis === 'pan') {
      const c = cv.current, lim = c ? Math.max(c.clientWidth, c.clientHeight) * v.zoom * 0.6 : Infinity;
      v.px = Math.max(-lim, Math.min(lim, d.px + dx)); v.py = Math.max(-lim, Math.min(lim, d.py + dy));
    } else if (d.axis === 'x') { const ny = d.yaw + dx * 0.009; v.vy = 0.6 * v.vy + 0.4 * ((ny - v.yaw) / dt); v.yaw = ny; }
    else v.pitch = Math.max(-0.9, Math.min(0.9, d.pitch + dy * 0.007));
    d.lt = e.timeStamp;
    v.dirty = true;
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    const v = V.current;
    if (d && d.on) { if (e.timeStamp - d.lt > 90 || d.axis !== 'x') v.vy = 0; v.vy = Math.max(-10, Math.min(10, v.vy)); return; }
    if (d && !d.on) {
      // a tap: a carpet still unrolling jumps to the end; two quick taps lay it straight
      if (v.goal != null) { v.p = v.goal; v.v = 0; v.goal = null; v.dirty = true; }
      if (e.timeStamp - lastTap.current < 320) { straighten(); used(); }
      lastTap.current = e.timeStamp;
    }
  };

  const toggleRoll = () => { const v = V.current; v.hand = null; v.goal = v.p > 0.5 ? 0 : 1; v.sound = false; used(); };
  const zoomBy = (f: number) => { const v = V.current; v.ease = null; v.zoom = Math.max(ZMIN, Math.min(ZMAX, v.zoom * f)); if (v.zoom <= 1.001) { v.px = 0; v.py = 0; } v.dirty = true; used(); };
  const quarter = () => { const v = V.current; v.vy = 0; v.ease = { yaw: v.yaw + Math.PI / 2, pitch: v.pitch, zoom: v.zoom, px: v.px, py: v.py }; used(); };

  return (
    <div className="carpet-view" ref={box}>
      <div className="cv-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.12 : 0.89)} data-testid="carpet-stage">
        {label}
        <canvas ref={cv} className="cv-canvas" data-testid="inspector-img" data-zoom={ui.zoom.toFixed(2)} aria-hidden="true" />
        {hint && (
          <div className="cv-hint" aria-hidden="true">
            <span className="ih-track"><i className="ih-finger" /></span>
            <small>Drag to spin or tip · pinch to zoom, then drag to move · twist to turn · roll it with the bar</small>
          </div>
        )}
        <div className="insp-tools">
          <button onClick={toggleRoll} aria-label={ui.p > 0.5 ? 'Roll it up' : 'Lay it out'} data-testid="roll-toggle"><Icon name="scroll" /></button>
          {ui.turned && <button className="on" onClick={() => { straighten(); used(); }} aria-label="Lay it straight" data-testid="straighten"><Icon name="locate" /></button>}
          <button onClick={() => zoomBy(1.4)} aria-label="Zoom in" data-testid="zoom-in"><Icon name="zoomin" /></button>
          <button onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out"><Icon name="zoomout" /></button>
          <button onClick={quarter} aria-label="Turn it a quarter" data-testid="rotate"><Icon name="rotate" /></button>
          {tools}
        </div>
      </div>
      <label className="cv-roll" aria-label="Roll the carpet">
        <small>Rolled</small>
        <input type="range" min={0} max={1000} value={Math.round(ui.p * 1000)}
          onPointerDown={() => { const v = V.current; v.goal = null; v.hand = v.p; used(); }}
          onChange={(e) => { const v = V.current; v.goal = null; v.hand = Number(e.target.value) / 1000; setUi((u) => ({ ...u, p: v.hand ?? u.p })); }}
          onPointerUp={release} onKeyUp={release} data-testid="roll-bar" />
        <small>Laid out</small>
        <em>{ui.zoom.toFixed(1)}×</em>
      </label>
    </div>
  );
}
