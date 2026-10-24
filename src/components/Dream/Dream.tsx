// Hassan's dream: now and then, when he sleeps, he flies on one of his own carpets over Giza by
// night, the Nile under him and the pyramids going by, catching the lanterns that float up from the
// rooftops. It is only a dream: nothing in the trade, the purse or the days changes, only a line in
// the journal and the most lanterns he has caught. Saffron can bring it on too, if you are patient
// with her. Drawn on one canvas; the carpet is the best rug you own, rippling in the wind.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import { filmLock } from '../../game/audio/voice';
import './dream.css';

const LENGTH = 40; // seconds of flight

interface Thing { x: number; y: number; kind: 'lantern' | 'kite'; got?: boolean; ph: number }

export function DreamHost() {
  const [on, setOn] = useState<false | 'night' | 'nap'>(false);
  useEffect(() => {
    const go = (e: Event) => { if (!navigator.webdriver || (window as { __tofDream?: boolean }).__tofDream) setOn((e as CustomEvent).detail === 'nap' ? 'nap' : 'night'); };
    window.addEventListener('tof:dream', go);
    return () => window.removeEventListener('tof:dream', go);
  }, []);
  if (!on) return null;
  return <Dream nap={on === 'nap'} onDone={() => setOn(false)} />;
}

function Dream({ nap, onDone }: { nap: boolean; onDone: () => void }) {
  const g = useGame();
  const cv = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<'intro' | 'fly' | 'wake'>('intro');
  const [score, setScore] = useState(0);
  const target = useRef(0.5);
  // the best rug you have, or the one your father left you
  const rug = [...g.inventory].sort((a, b) => (RUGS[b.typeId]?.valueBand[1] ?? 0) - (RUGS[a.typeId]?.valueBand[1] ?? 0))[0];
  const src = rug && RUGS[rug.typeId] ? rugSrc(RUGS[rug.typeId]) : 'art/rugs/desert-star.jpg';
  const best = g.dreams?.best ?? 0;

  // the music of the title, softly; the game's own score steps aside
  useEffect(() => {
    filmLock.on();
    audio.muteMusic(true, 1);
    const a = audio.attach(new Audio('audio/music/title-hijaz.mp3'), 'record', 0.55);
    a.loop = true;
    a.play().catch(() => {});
    return () => { a.pause(); audio.detach(a); audio.muteMusic(false); filmLock.off(); };
  }, []);

  useEffect(() => {
    if (stage !== 'fly') return;
    const c = cv.current!;
    const ctx = c.getContext('2d')!;
    const im = new Image(); im.src = src;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0, last = 0, t = 0, y = 0.5, vy = 0, got = 0, wobble = 0, next = 0.6;
    const things: Thing[] = [];
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6 }));
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now; t += dt;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const speed = 0.16 + t * 0.003; // screens a second
      // the carpet follows the finger, softly, as if on the air
      const ty = Math.max(0.12, Math.min(0.78, target.current));
      vy += ((ty - y) * 18 - vy * 6) * dt; y += vy * dt;
      wobble = Math.max(0, wobble - dt);
      // the sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#060a1f'); sky.addColorStop(0.55, '#1a1838'); sky.addColorStop(0.8, '#3a2a3a'); sky.addColorStop(1, '#1a1210');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.tw); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(((s.x - t * 0.004) % 1 + 1) % 1 * W, s.y * H, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // the moon
      ctx.fillStyle = '#fbefc8'; ctx.shadowColor = 'rgba(255,236,180,.8)'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.16, Math.min(W, H) * 0.06, 0, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#060a1f'; ctx.beginPath(); ctx.arc(W * 0.8 + Math.min(W, H) * 0.025, H * 0.16 - 4, Math.min(W, H) * 0.055, 0, 7); ctx.fill();
      // the pyramids far off, then the town's roofs and minarets nearer, passing faster
      const far = (t * speed * 0.15 * W) % (W * 1.6);
      ctx.fillStyle = '#251c2c';
      for (let k = -1; k < 3; k++) { const bx = k * W * 1.6 - far; tri(ctx, bx + W * 0.3, H * 0.78, W * 0.42, H * 0.2); tri(ctx, bx + W * 0.62, H * 0.78, W * 0.3, H * 0.15); tri(ctx, bx + W * 0.85, H * 0.78, W * 0.16, H * 0.08); }
      const near = (t * speed * 0.45 * W) % (W * 1.2);
      ctx.fillStyle = '#140e14';
      for (let k = -1; k < 3; k++) roofs(ctx, k * W * 1.2 - near, H, W);
      // the Nile, with the moon in it
      ctx.fillStyle = '#0d1428'; ctx.fillRect(0, H * 0.9, W, H * 0.1);
      ctx.fillStyle = 'rgba(251,239,200,.35)';
      for (let i = 0; i < 6; i++) ctx.fillRect(W * 0.8 - 30 + Math.sin(t * 3 + i) * 10, H * 0.91 + i * 6, 60 - i * 8, 2);
      // lanterns float up from the roofs; now and then a kite on its string
      next -= dt;
      if (next <= 0 && t < LENGTH - 2) { things.push({ x: 1.08, y: 0.18 + Math.random() * 0.58, kind: Math.random() < 0.18 ? 'kite' : 'lantern', ph: Math.random() * 6 }); next = 0.45 + Math.random() * 0.6; }
      const cx = W * 0.3, cy = H * y;
      for (const o of things) {
        o.x -= speed * dt * 1.4;
        if (o.kind === 'lantern') o.y -= dt * 0.012;
        const ox = o.x * W, oy = o.y * H + Math.sin(t * 2 + o.ph) * 6;
        if (!o.got && Math.abs(ox - cx) < W * 0.12 && Math.abs(oy - (cy - 10)) < H * 0.07) {
          o.got = true;
          if (o.kind === 'lantern') { got += 1; setScore(got); audio.sfx('coin'); }
          else { wobble = 0.9; got = Math.max(0, got - 1); setScore(got); audio.sfx('tap'); }
        }
        if (o.got) continue;
        if (o.kind === 'lantern') lantern(ctx, ox, oy, t + o.ph); else kite(ctx, ox, oy, t + o.ph);
      }
      while (things.length && things[0].x < -0.2) things.shift();
      // the carpet, rippling, with a dreamer sitting on it
      if (im.naturalWidth) carpet(ctx, im, cx, cy, Math.min(W * 0.42, 210), t, wobble);
      if (t >= LENGTH) { setStage('wake'); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage, src]);

  const point = (e: React.PointerEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); target.current = (e.clientY - r.top) / r.height; };
  const wake = () => {
    const s = useGame.getState();
    const d = s.dreams ?? { seen: 0, best: 0, last: 0 };
    useGame.setState({ dreams: { seen: d.seen + 1, best: Math.max(d.best, score), last: s.day }, journal: [...s.journal, { day: s.day, text: `Dreamt of flying over Giza by night on a carpet${score ? `, and caught ${score} lantern${score === 1 ? '' : 's'}` : ''}.` }] });
    onDone();
  };

  return createPortal(
    <div className={`dream ${stage}`} data-testid="dream" onPointerDown={point} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') point(e); }}>
      <canvas ref={cv} className="dream-canvas" aria-hidden="true" />
      {stage === 'intro' && (
        <div className="dream-card" onClick={() => setStage('fly')}>
          <small>{nap ? 'SAFFRON PURRS' : 'THAT NIGHT'}</small>
          <b>{nap ? 'Hassan nods off' : 'Hassan dreams'}</b>
          <span>{nap ? 'The lane is warm and the cat is heavy on his lap. ' : ''}He is sitting on one of his carpets, and it rises off the floor, out over the lane and the roofs of Giza. Hold your finger where you want to go. Catch the lanterns; mind the kites.</span>
          <button className="btn primary big" data-testid="dream-fly">Fly</button>
        </div>
      )}
      {stage === 'fly' && <div className="dream-score" aria-live="polite"><b>{score}</b> lanterns{best ? ` · best ${best}` : ''}</div>}
      {stage === 'fly' && <button className="dream-wake" onClick={(e) => { e.stopPropagation(); setStage('wake'); }} data-testid="dream-wake">Wake up</button>}
      {stage === 'wake' && (
        <div className="dream-card dawn" onClick={wake}>
          <small>{nap ? 'A MOMENT LATER' : 'DAWN'}</small>
          <b>{nap ? 'You wake at the stall' : 'You wake on the mat'}</b>
          <span>{nap ? 'Saffron is washing her paw as if nothing happened.' : 'Saffron is asleep on your feet.'} {score ? `${score} lantern${score === 1 ? '' : 's'}${score > best ? ', more than ever before' : ''}.` : 'The lanterns stayed in the sky.'}</span>
          <button className="btn primary big" data-testid="dream-done">Get up</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

function tri(c: CanvasRenderingContext2D, x: number, base: number, w: number, h: number) { c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x, base - h); c.lineTo(x + w / 2, base); c.closePath(); c.fill(); }
function roofs(c: CanvasRenderingContext2D, x0: number, H: number, W: number) {
  const base = H * 0.9;
  c.beginPath(); c.moveTo(x0, base);
  const blocks = [[0.0, 0.1], [0.08, 0.14], [0.17, 0.09], [0.24, 0.16], [0.36, 0.11], [0.45, 0.13], [0.58, 0.08], [0.66, 0.15], [0.8, 0.1], [0.9, 0.12], [1.2, 0.1]];
  for (const [bx, bh] of blocks) { c.lineTo(x0 + bx * W, base - bh * H); c.lineTo(x0 + (bx + 0.07) * W, base - bh * H); }
  c.lineTo(x0 + 1.2 * W, base); c.closePath(); c.fill();
  // a minaret and a dome
  const mx = x0 + 0.3 * W; c.fillRect(mx, base - H * 0.32, W * 0.018, H * 0.32); c.beginPath(); c.moveTo(mx - 3, base - H * 0.32); c.lineTo(mx + W * 0.009, base - H * 0.37); c.lineTo(mx + W * 0.018 + 3, base - H * 0.32); c.fill();
  c.beginPath(); c.arc(x0 + 0.72 * W, base - H * 0.15, W * 0.05, Math.PI, 0); c.fill();
}
function lantern(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
  c.save(); c.shadowColor = 'rgba(255,190,90,.9)'; c.shadowBlur = 18;
  c.fillStyle = `rgba(255,${180 + Math.sin(t * 5) * 20},90,0.95)`;
  c.beginPath(); c.ellipse(x, y, 8, 11, 0, 0, 7); c.fill();
  c.restore();
  c.fillStyle = '#6a4a24'; c.fillRect(x - 4, y - 13, 8, 3); c.fillRect(x - 3, y + 10, 6, 2);
}
function kite(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2) * 0.25);
  c.fillStyle = '#b8402a'; c.beginPath(); c.moveTo(0, -16); c.lineTo(12, 0); c.lineTo(0, 18); c.lineTo(-12, 0); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(240,220,180,.6)'; c.beginPath(); c.moveTo(0, 18); c.quadraticCurveTo(10, 40, -6, 70); c.stroke();
  c.restore();
}
/** the carpet in slices, each lifted by the wind's wave; a small dreamer sitting on its middle */
function carpet(c: CanvasRenderingContext2D, im: HTMLImageElement, cx: number, cy: number, w: number, t: number, wobble: number) {
  const h = w * (im.naturalHeight / im.naturalWidth) * 0.42; // seen from the side and a little above
  const n = 28, iw = im.naturalWidth, ih = im.naturalHeight;
  const wave = (u: number) => Math.sin(u * 5 - t * 6) * (4 + wobble * 10) + Math.sin(t * 1.3) * 3;
  // shadow far below
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cx, cy + 70, w * 0.4, 6, 0, 0, 7); c.fill();
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const x0 = cx - w / 2 + u0 * w, x1 = cx - w / 2 + u1 * w;
    const y0 = cy + wave(u0), y1 = cy + wave(u1);
    const sw = iw / n;
    c.save();
    c.setTransform(c.getTransform().a, 0, 0, c.getTransform().d, 0, 0);
    c.transform((x1 - x0) / sw, (y1 - y0) / sw, 0, h / ih, x0 - ((x1 - x0) / sw) * u0 * iw, y0 - ((y1 - y0) / sw) * u0 * iw);
    c.drawImage(im, u0 * iw, 0, sw + 1, ih, u0 * iw, 0, sw + 1, ih);
    c.restore();
  }
  // the dreamer: a seated figure in silhouette, warm at the edge with lantern light
  const mx = cx - w * 0.05, my = cy + wave(0.45);
  c.fillStyle = '#20140c';
  c.beginPath(); c.ellipse(mx, my - 4, 18, 9, 0, 0, 7); c.fill(); // crossed legs
  c.beginPath(); c.moveTo(mx - 11, my - 6); c.lineTo(mx - 8, my - 34); c.lineTo(mx + 8, my - 34); c.lineTo(mx + 12, my - 6); c.closePath(); c.fill(); // body
  c.beginPath(); c.arc(mx, my - 42, 8, 0, 7); c.fill(); // head
  c.strokeStyle = 'rgba(255,200,120,.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my - 42, 8, -1.2, 0.6); c.stroke();
}
