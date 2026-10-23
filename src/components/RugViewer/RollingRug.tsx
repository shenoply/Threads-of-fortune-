// The carpet rolling and unrolling in the inspector, drawn on a canvas over the stage. The carpet's
// own picture is used as it is, cut into thin slices along its length: the slices already unrolled
// lie flat, the rest wind round the core (src/game/roll.ts). The view tips a little while the carpet
// is in its roll, so the roll reads as round, and comes back to straight above as it lies flat, at
// exactly the size and place the inspector shows it, so the hand-over to the still picture is seamless.
import { useEffect, useRef } from 'react';
import { CORE as CORE_R, THICK as THICK_T, extent, outerRadius, rollAt, springStep } from '../../game/roll';
import { audio } from '../../game/audio/engine';

const TILT = 0.6; // the most the view tips, in radians (about 34°), when the carpet is all rolled
const F = 2.6; // camera distance, in carpet lengths: a gentle perspective

export interface RollingRugProps {
  src: string;
  /** the size the still picture is shown at in the stage, at rest */
  fit: { w: number; h: number };
  /** where it is going: lying flat to be looked at, or rolled up */
  target: 'flat' | 'rolled';
  /** start rolled (opening the inspector) or flat (rolling it up) */
  from: 'flat' | 'rolled';
  filter?: string;
  /** reached its end and settled */
  onSettled: (at: 'flat' | 'rolled') => void;
  /** a tap: jump to the end */
  skip?: number;
  /** a finger holding the roll: while set, the carpet is exactly this far open (0 rolled, 1 flat) */
  hand?: { current: number | null };
  /** told, every frame, how far open it is */
  at?: { current: number };
}

export function RollingRug({ src, fit, target, from, filter, onSettled, skip = 0, hand, at }: RollingRugProps) {
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef({ p: from === 'flat' ? 1 : 0, v: 0, settle: 0, settleAmp: 0, done: false, sound: false });
  const tgt = useRef(target);
  tgt.current = target;
  const settled = useRef(onSettled);
  settled.current = onSettled;
  // a new target starts the motion again from wherever it is
  useEffect(() => { st.current.done = false; st.current.settle = 0; st.current.sound = false; }, [target]);
  useEffect(() => { if (skip) { const s = st.current; s.p = tgt.current === 'flat' ? 1 : 0; s.v = 0; s.settle = 1; } }, [skip]);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    const img = new Image();
    let raf = 0, last = 0, alive = true;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const frame = (now: number) => {
      if (!alive) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      const s = st.current;
      const goal = tgt.current === 'flat' ? 1 : 0;
      const held = hand?.current;
      if (held != null) {
        // under the finger: no spring, it is where the hand has it, and lets go with the hand's speed
        const np = Math.max(0, Math.min(1, held));
        s.v = 0.5 * s.v + 0.5 * ((np - s.p) / dt);
        s.p = np; s.done = false; s.settle = 0; s.sound = true;
        if (at) at.current = s.p;
        draw(s.p, 0);
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!s.done) {
        if (!s.sound && Math.abs(goal - s.p) > 0.05) { s.sound = true; audio.sfx('unfold'); }
        [s.p, s.v] = springStep(s.p, s.v, goal, dt, 4.4, 0.8);
        // the floor and the roll take up the overshoot: a small settle instead of a bounce
        if (s.p > 1) { s.settleAmp = Math.min(0.02, Math.abs(s.v) * 0.008); s.p = 1; s.v = 0; s.settle = s.settle || 0.0001; }
        if (s.p < 0) { s.settleAmp = Math.min(0.016, Math.abs(s.v) * 0.012); s.p = 0; s.v = 0; s.settle = s.settle || 0.0001; }
        if (s.settle > 0) s.settle += dt;
        const still = Math.abs(s.p - goal) < 0.0015 && Math.abs(s.v) < 0.01;
        if ((s.settle > 0.9 || (still && s.settle === 0 && Math.abs(s.v) < 0.003)) && still) {
          s.p = goal; s.done = true;
          draw(s.p, 0);
          settled.current(goal === 1 ? 'flat' : 'rolled');
          raf = requestAnimationFrame(frame);
          return;
        }
      }
      if (at) at.current = s.p;
      draw(s.p, s.settle > 0 ? s.settleAmp * Math.exp(-s.settle * 5.5) * Math.sin(s.settle * 15) : 0);
      raf = requestAnimationFrame(frame);
    };

    const draw = (p: number, wobble: number) => {
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (!img.naturalWidth) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const S0 = fit.w; // pixels per carpet length when it lies flat in the inspector
      const wz = ih / iw; // the carpet's width, in lengths
      const phi = TILT * Math.pow(1 - p, 0.7);
      const cos = Math.cos(phi), sin = Math.sin(phi);
      // keep the carpet framed: centred on what is there, a little closer in as it rolls up
      const [x0, x1] = extent(p);
      const len = x1 - x0;
      const zr = Math.max(1, Math.min(1.5, (W * 0.9) / (S0 * len), (H * 0.86) / (S0 * wz)));
      const z = 1 + (zr - 1) * Math.pow(1 - p, 1.5); // exactly the inspector's size once it lies flat
      const cx = (x0 + x1) / 2, cxr = cx * cos;
      const proj = (x: number, y: number, zw: number) => {
        const xr = x * cos + y * sin, depth = -x * sin + y * cos;
        const k = F / (F - depth * 1.2);
        return { x: W / 2 + (xr - cxr) * S0 * z * k, y: H / 2 + zw * S0 * z * k, depth };
      };
      // the shadow on the floor: soft gradients, drawn once per frame without blur filters
      const fa = proj(Math.max(x0, -0.5), 0, -wz / 2), fb = proj(Math.min(p - 0.5, 0.5), 0, wz / 2);
      g.fillStyle = 'rgba(0,0,0,0.32)';
      if (p > 0.01) { g.fillRect(fa.x - 4, fa.y + 6, fb.x - fa.x + 8, fb.y - fa.y + 6); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(fa.x - 9, fa.y + 2, fb.x - fa.x + 18, fb.y - fa.y + 16); }
      const roll = p < 0.9999 ? wobble : 0;
      if (p < 0.9999) {
        const R = outerRadius(p), rc = proj(p - 0.5 + roll, 0, 0), rr = R * S0 * z;
        const sh = g.createLinearGradient(rc.x - rr * 1.6, 0, rc.x + rr * 1.8, 0);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sh; g.fillRect(rc.x - rr * 1.6, fa.y + 4, rr * 3.4, fb.y - fa.y + 4);
      }
      g.filter = filter || 'none';
      const L = { x: -0.35, y: 0.94 };
      // a stretch of the carpet between u0 and u1, from P0 to P1, drawn as one affine piece
      const piece = (u0: number, u1: number, P0: { x: number; y: number }, P1: { x: number; y: number }, shade: boolean) => {
        const A = proj(P0.x, P0.y, -wz / 2), B = proj(P1.x, P1.y, -wz / 2), C = proj(P0.x, P0.y, wz / 2), D = proj(P1.x, P1.y, wz / 2);
        const sx0 = u0 * iw, sw = Math.max(0.5, (u1 - u0) * iw);
        const ta = (B.x - A.x) / sw, tb = (B.y - A.y) / sw, tc = (C.x - A.x) / ih, td = (C.y - A.y) / ih;
        g.setTransform(dpr * ta, dpr * tb, dpr * tc, dpr * td, dpr * (A.x - ta * sx0), dpr * (A.y - tb * sx0));
        const over = shade ? sw * 0.6 + 0.6 : 0.5;
        g.drawImage(img, sx0, 0, Math.min(iw - sx0, sw + over), ih, sx0, 0, Math.min(iw - sx0, sw + over), ih);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!shade) return;
        let tx = P1.x - P0.x, ty = P1.y - P0.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = -ty, ny = tx, facing = nx * -sin + ny * cos, fn = facing >= 0 ? 1 : -1;
        const lit = Math.max(0, (nx * L.x + ny * L.y) * fn);
        let dark = 1 - (0.55 + 0.45 * lit);
        if (facing < 0) dark = Math.min(0.85, 0.38 + dark * 0.8); // the back of the carpet, in the roll's shade
        if (dark > 0.01) {
          g.fillStyle = `rgba(12,7,3,${dark.toFixed(3)})`;
          g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.lineTo(D.x, D.y); g.lineTo(C.x, C.y); g.closePath(); g.fill();
        }
      };
      // the flat part in a few pieces (enough for the gentle perspective), the end lifting as it settles
      const flatEnd = Math.min(1, p);
      const nFlat = p >= 0.9999 && wobble ? 24 : phi > 0.005 ? Math.max(2, Math.ceil(flatEnd * 18)) : 1;
      for (let i = 0; i < nFlat; i++) {
        const u0 = (flatEnd * i) / nFlat, u1 = (flatEnd * (i + 1)) / nFlat;
        const lift = (u: number) => (p >= 0.9999 && wobble ? wobble * Math.max(0, (u - 0.72) / 0.28) ** 2 : 0);
        piece(u0, u1, { x: u0 - 0.5, y: lift(u0) }, { x: u1 - 0.5, y: lift(u1) }, !!wobble && u1 > 0.72);
      }
      // the roll: slices close enough to stay round, far ones first
      if (p < 0.9999) {
        const R = outerRadius(p);
        const turnsAngle = (2 * Math.PI * (R - CORE_R)) / THICK_T;
        const n = Math.max(24, Math.min(160, Math.ceil(turnsAngle / 0.32)));
        const pts: { u: number; x: number; y: number }[] = [];
        for (let i = 0; i <= n; i++) {
          const u = p + ((1 - p) * i) / n;
          const q = rollAt(u, p);
          pts.push({ u, x: q.x + roll, y: q.y });
        }
        const order: number[] = [];
        for (let i = 0; i < n; i++) order.push(i);
        const depthOf = (i: number) => -((pts[i].x + pts[i + 1].x) / 2) * sin + ((pts[i].y + pts[i + 1].y) / 2) * cos;
        order.sort((i, j) => depthOf(i) - depthOf(j));
        for (const i of order) piece(pts[i].u, pts[i + 1].u, pts[i], pts[i + 1], true);
      }
      g.filter = 'none';
    };
    img.onload = () => { raf = requestAnimationFrame(frame); };
    img.src = src;
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [src, fit.w, fit.h, filter]);

  return <canvas ref={cv} className="rolling-rug" aria-hidden="true" data-testid="rolling-rug" />;
}
