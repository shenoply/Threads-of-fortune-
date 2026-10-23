// Turning a carpet over in your hands: drag across it and it spins round on the floor; drag up or
// down and it tips towards you or away, as when a buyer lifts one end to look along the pile. The
// carpet's own picture is used as it is, cut into strips and drawn in perspective; the underside
// shows darker when it is tipped right over.
import { useEffect, useRef } from 'react';

const F = 2.4; // camera distance in carpet lengths

export function ExamineRug({ src, fit, yaw, pitch, filter, zoom = 1, pan = { x: 0, y: 0 } }: { src: string; fit: { w: number; h: number }; yaw: number; pitch: number; filter?: string; zoom?: number; pan?: { x: number; y: number } }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const draw = () => {
    const c = cv.current, im = img.current;
    if (!c || !im || !im.naturalWidth) return;
    const g = c.getContext('2d');
    if (!g) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const iw = im.naturalWidth, ih = im.naturalHeight, wz = ih / iw, S = fit.w * zoom;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), spp = Math.sin(pitch);
    // the carpet lies in x (length) and z (width); spin it round the upright axis, then tip it about the screen's horizontal
    const proj = (x: number, z: number) => {
      const X = x * cy - z * sy, Z = x * sy + z * cy;
      const sy2 = Z * cp, depth = -Z * spp; // toward the camera
      const k = F / (F - depth);
      return { x: W / 2 + pan.x + X * S * k, y: H / 2 + pan.y + sy2 * S * k };
    };
    // which side faces us: the pile, or the back
    const facing = cp >= 0;
    g.filter = filter || 'none';
    const n = 36;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const x0 = u0 - 0.5, x1 = u1 - 0.5;
      const A = proj(x0, -wz / 2), B = proj(x1, -wz / 2), C = proj(x0, wz / 2);
      const sx0 = u0 * iw, sw = (u1 - u0) * iw;
      const ta = (B.x - A.x) / sw, tb = (B.y - A.y) / sw, tc = (C.x - A.x) / ih, td = (C.y - A.y) / ih;
      g.setTransform(dpr * ta, dpr * tb, dpr * tc, dpr * td, dpr * (A.x - ta * sx0), dpr * (A.y - tb * sx0));
      const over = Math.min(iw - sx0, sw + 1.2);
      g.drawImage(im, sx0, 0, over, ih, sx0, 0, over, ih);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.filter = 'none';
    // light falls from above: the more it is tipped, the more the pile darkens; the back is in shade
    const shade = facing ? Math.min(0.35, Math.abs(spp) * 0.3) : 0.55;
    if (shade > 0.01) {
      const P = [proj(-0.5, -wz / 2), proj(0.5, -wz / 2), proj(0.5, wz / 2), proj(-0.5, wz / 2)];
      g.fillStyle = `rgba(10,6,3,${shade.toFixed(3)})`;
      g.beginPath(); P.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.fill();
    }
  };
  useEffect(() => {
    const im = new Image();
    im.onload = () => { img.current = im; draw(); };
    im.src = src;
    return () => { img.current = null; };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { draw(); }); // every turn of the hand
  return <canvas ref={cv} className="rolling-rug" aria-hidden="true" data-testid="examine-rug" />;
}
