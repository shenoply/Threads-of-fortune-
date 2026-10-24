// The flying carpet: Hassan's dream, and a little game of its own. He flies on his best carpet by
// night, Saffron curled at the front, over the game's own painted map: from Giza down the Nile to
// Alexandria, along the coast to Jaffa, up to Damascus, Aleppo and over Anatolia to Constantinople.
//
// Modelled on the calm one-touch flying games (Alto's Odyssey above all), with a runner's moves:
//   hold         the carpet rises; let go and it glides down
//   swipe up     Hassan jumps off the carpet for a moment (high lanterns, a falling star, birds below)
//   swipe down   he lies flat on the mat (flocks of birds pass over him)
// Lanterns chain and ring higher; rings of light carry you faster; three goals to a dream open the
// next stretch of the map. Three knocks and you wake. Nothing in the trade changes: only the journal,
// the stars and the stretches of the map you have flown. It can be played from the title screen too.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import { SETTLEMENTS } from '../../data/world';
import { START_WARDROBE, wornOutfit } from '../../data/wardrobe';
import { rugSrc } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import { filmLock } from '../../game/audio/voice';
import './dream.css';

const LENGTH = 55; // seconds of flight
const MAP = 'art/world/travel-map-3k.webp', MAP_PX = 2048 / 885; // map units to picture pixels
const SAFFRON = 'art/saffron-stall.webp';
/** painted poses, when they exist (art/dream/hassan-<pose>.webp); until then his standing figure is used */
const POSES = ['sit', 'jump', 'duck', 'hit'] as const;

// ---- the stretches of the map, in the order they open ----
interface Leg { name: string; route: string[]; tint: string }
const LEGS: Leg[] = [
  { name: 'The Nile to Alexandria', route: ['giza', 'cairo', 'tanta', 'alexandria'], tint: '#1b2350' },
  { name: 'The coast to Jerusalem', route: ['alexandria', 'portsaid', 'jaffa', 'jerusalem'], tint: '#182a52' },
  { name: 'Over the Jordan to Beirut', route: ['jerusalem', 'amman', 'damascus', 'beirut'], tint: '#22204a' },
  { name: 'North to Konya', route: ['beirut', 'aleppo', 'konya'], tint: '#20224c' },
  { name: 'Anatolia to Constantinople', route: ['konya', 'ankara', 'istanbul'], tint: '#1c1e4e' },
];

// ---- goals: three to a dream; done, they open the next stretch ----
type GoalKind = 'lanterns' | 'chain' | 'rings' | 'star' | 'clean' | 'ducks' | 'jumps';
interface Goal { kind: GoalKind; n: number; text: string }
const LEVELS: Goal[][] = [
  [{ kind: 'lanterns', n: 15, text: 'Gather 15 lanterns' }, { kind: 'ducks', n: 2, text: 'Lie flat under 2 flocks' }, { kind: 'chain', n: 4, text: 'Chain 4 lanterns' }],
  [{ kind: 'lanterns', n: 25, text: 'Gather 25 lanterns' }, { kind: 'rings', n: 3, text: 'Fly through 3 rings of light' }, { kind: 'jumps', n: 3, text: 'Jump for 3 lanterns' }],
  [{ kind: 'chain', n: 7, text: 'Chain 7 lanterns' }, { kind: 'star', n: 1, text: 'Catch a falling star' }, { kind: 'clean', n: 1, text: 'Wake without a single knock' }],
  [{ kind: 'lanterns', n: 35, text: 'Gather 35 lanterns' }, { kind: 'ducks', n: 5, text: 'Duck under 5 flocks' }, { kind: 'rings', n: 5, text: 'Fly through 5 rings of light' }],
  [{ kind: 'lanterns', n: 45, text: 'Gather 45 lanterns' }, { kind: 'star', n: 2, text: 'Catch 2 falling stars' }, { kind: 'chain', n: 10, text: 'Chain 10 lanterns' }],
];
export interface DreamState { seen: number; best: number; last: number; level?: number; done?: number[] }
const levelOf = (d?: DreamState) => Math.min(LEVELS.length - 1, d?.level ?? 0);

type Kind = 'lantern' | 'ring' | 'star' | 'line' | 'birds';
interface Thing { x: number; y: number; kind: Kind; got?: boolean; passed?: boolean; ph: number; vy?: number; high?: boolean }
interface Run { lanterns: number; chain: number; bestChain: number; rings: number; stars: number; hits: number; ducks: number; jumps: number }

export function DreamHost() {
  const [on, setOn] = useState<false | 'night' | 'nap' | 'play'>(false);
  useEffect(() => {
    const go = (e: Event) => {
      if (navigator.webdriver && !(window as { __tofDream?: boolean }).__tofDream) return;
      const d = (e as CustomEvent).detail;
      setOn(d === 'nap' ? 'nap' : d === 'play' ? 'play' : 'night');
    };
    window.addEventListener('tof:dream', go);
    return () => window.removeEventListener('tof:dream', go);
  }, []);
  if (!on) return null;
  return <Dream mode={on} onDone={() => setOn(false)} />;
}

const progress = (gl: Goal, r: Run) => (gl.kind === 'lanterns' ? r.lanterns : gl.kind === 'chain' ? r.bestChain : gl.kind === 'rings' ? r.rings : gl.kind === 'star' ? r.stars : gl.kind === 'ducks' ? r.ducks : gl.kind === 'jumps' ? r.jumps : 0);
const met = (gl: Goal, r: Run, over: boolean) => (gl.kind === 'clean' ? over && r.hits === 0 : progress(gl, r) >= gl.n);

function routePts(leg: Leg) {
  return leg.route.map((id) => SETTLEMENTS.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s).map((s) => ({ x: s.x * MAP_PX, y: s.y * MAP_PX, name: s.name }));
}

function Dream({ mode, onDone }: { mode: 'night' | 'nap' | 'play'; onDone: () => void }) {
  const g = useGame();
  const cv = useRef<HTMLCanvasElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<'intro' | 'fly' | 'wake'>('intro');
  const [hud, setHud] = useState({ lanterns: 0, chain: 0, lives: 3 });
  const [toast, setToast] = useState('');
  const [place, setPlace] = useState('');
  const runRef = useRef<Run>({ lanterns: 0, chain: 0, bestChain: 0, rings: 0, stars: 0, hits: 0, ducks: 0, jumps: 0 });
  // steering: the carpet goes where your finger takes it (dragged, never under your thumb) and stays there when you let go
  const input = useRef({ drag: false, sy: 0, from: 0.42, target: 0.42, jump: 0, flat: false, keyUp: false, keyDown: false });
  const d = g.dreams as DreamState | undefined;
  const level = levelOf(d);
  const goals = LEVELS[level];
  const doneBefore = d?.done ?? [];
  const leg = LEGS[Math.min(LEGS.length - 1, level)];
  // painted night skylines (art/dream/bg-<region>-<far|mid|near>.webp): used in place of the map once they exist
  const region = (['egypt', 'coast', 'levant', 'anatolia', 'anatolia'] as const)[Math.min(4, level)];
  const [skyline, setSkyline] = useState(false);
  useEffect(() => { const im = new Image(); im.onload = () => setSkyline(true); im.src = `art/dream/bg-${region}-near.webp`; }, [region]);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const pts = routePts(leg);
  const rug = [...g.inventory].sort((a, b) => (RUGS[b.typeId]?.valueBand[1] ?? 0) - (RUGS[a.typeId]?.valueBand[1] ?? 0))[0];
  const rugPic = rug && RUGS[rug.typeId] ? rugSrc(RUGS[rug.typeId]) : 'art/rugs/desert-star.jpg';
  const outfit = wornOutfit(g.wardrobe ?? START_WARDROBE).id;
  const best = d?.best ?? 0;

  useEffect(() => {
    filmLock.on();
    audio.muteMusic(true, 1);
    const a = audio.attach(new Audio('audio/music/title-hijaz.mp3'), 'record', 0.5);
    a.loop = true;
    a.play().catch(() => {});
    return () => { a.pause(); audio.detach(a); audio.muteMusic(false); filmLock.off(); try { (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.(); } catch { /* not locked */ } };
  }, []);

  // keys, for a desk: arrows (or W and S) to steer, space to jump, shift held to lie flat
  useEffect(() => {
    if (stage !== 'fly') return;
    const k = (on: boolean) => (e: KeyboardEvent) => {
      const i = input.current;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { i.keyUp = on; e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { i.keyDown = on; e.preventDefault(); }
      if (e.key === ' ') { if (on && !e.repeat) i.jump = 1; e.preventDefault(); }
      if (e.key === 'Shift') i.flat = on;
    };
    const dn = k(true), up = k(false);
    addEventListener('keydown', dn); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', dn); removeEventListener('keyup', up); };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'fly') return;
    const c = cv.current!;
    const ctx = c.getContext('2d')!;
    const load = (s: string) => { const im = new Image(); im.src = s; return im; };
    const rugIm = load(rugPic), catIm = load(SAFFRON), heroIm = load(`art/hero/outfits/${outfit}-full.webp`);
    const poseIm: Record<string, HTMLImageElement> = {};
    for (const p of POSES) { const im = new Image(); im.onerror = () => { delete poseIm[p]; }; im.src = `art/dream/hassan-${p}.webp`; poseIm[p] = im; }
    for (const p of ['cat-alert', 'cat-cling']) { const im = new Image(); im.onerror = () => { delete poseIm[p]; }; im.src = `art/dream/saffron-${p.slice(4)}.webp`; poseIm[p] = im; }
    const skyIm = load('art/dream/sky-night.webp');
    const lineIm = new Image(), birdIm = load('art/dream/birds.webp');
    [lineIm, birdIm].forEach((im) => { im.onerror = () => { im.removeAttribute('src'); }; });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = runRef.current;
    const inp = input.current;
    // the route: distance along it, the camera's place and heading
    const segs = pts.slice(1).map((p, i) => ({ a: pts[i], b: p, len: Math.hypot(p.x - pts[i].x, p.y - pts[i].y) }));
    const total = segs.reduce((s, x) => s + x.len, 0);
    const at = (dist: number) => {
      let rem = Math.max(0, Math.min(total - 0.01, dist));
      for (const s of segs) { if (rem <= s.len) { const k = rem / s.len; return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, h: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) }; } rem -= s.len; }
      const s = segs[segs.length - 1]; return { x: s.b.x, y: s.b.y, h: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) };
    };
    let raf = 0, last = 0, t = 0, y = 0.42, vy = 0, wobble = 0, next = 0.6, boost = 0, chainT = 0, scroll = 0, head = at(0).h, jumpT = 0, duckT = 0, lives = 3, named = '';
    const things: Thing[] = [];
    const sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const stars = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * 0.28, r: Math.random() * 1.1 + 0.3, tw: Math.random() * 6 }));
    const announced = new Set<number>(doneBefore);
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now; t += dt;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      boost = Math.max(0, boost - dt);
      const speed = (0.18 + Math.min(0.08, t * 0.0015)) * (boost > 0 ? 1.55 : 1);
      scroll += speed * dt;
      // the map passing under you: the route, followed at the pace of the flight, turning gently at each town
      const cam = at((t / LENGTH) * total);
      let dh = cam.h - head; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      head += dh * Math.min(1, dt * 1.2);
      layers.current.forEach((el, i) => { if (el) el.style.backgroundPositionX = `${(-scroll * W * [0.1, 0.25, 0.6][i]).toFixed(1)}px`; });
      if (plane.current) plane.current.style.transform = `translate(${(W * 0.34).toFixed(1)}px, ${(H * 0.9).toFixed(1)}px) rotateX(66deg) rotateZ(${(-head).toFixed(4)}rad) scale(1.25) translate(${(-cam.x).toFixed(1)}px, ${(-cam.y).toFixed(1)}px)`;
      const near = pts.find((p) => Math.hypot(p.x - cam.x, p.y - cam.y) < 60);
      if (near && near.name !== named) { named = near.name; setPlace(near.name); window.setTimeout(() => setPlace(''), 2600); }
      // the moves: hold to rise; a jump off the carpet; lying flat
      if (inp.jump && jumpT <= 0) { jumpT = 0.75; duckT = 0; audio.sfx('tap'); }
      inp.jump = 0;
      jumpT = Math.max(0, jumpT - dt);
      // lying flat lasts as long as the button is held (and a moment after a quick tap)
      if (inp.flat && jumpT <= 0) duckT = Math.max(duckT, 0.35); else duckT = Math.max(0, duckT - dt);
      if (inp.keyUp) inp.target -= 0.75 * dt;
      if (inp.keyDown) inp.target += 0.75 * dt;
      inp.target = Math.max(0.3, Math.min(0.8, inp.target));
      // the carpet glides to where it is steered, quick but never jerky, and hovers there
      const want = (inp.target - y) * 7;
      vy += (Math.max(-1.6, Math.min(1.6, want)) - vy) * Math.min(1, dt * 9);
      y += vy * dt + Math.sin(t * 1.4) * 0.0004;
      if (y < 0.3) { y = 0.3; vy = Math.max(0, vy); }
      if (y > 0.8) { y = 0.8; vy = Math.min(0, vy); }
      wobble = Math.max(0, wobble - dt);
      chainT = Math.max(0, chainT - dt);
      if (chainT === 0 && r.chain) r.chain = 0;

      // the sky over the map: stars and the moon (the map itself is the painted plane behind)
      for (const s of stars) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.7 + s.tw); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc((((s.x - scroll * 0.01) % 1) + 1) % 1 * W, s.y * H, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // the painted sky has its own crescent: then only its glow is added, so there is one moon
      if (skyIm.naturalWidth) moonGlow(ctx, W * 0.772, H * 0.119, Math.min(W, H) * 0.045);
      else moon(ctx, W * 0.82, H * 0.1, Math.min(W, H) * 0.045);

      // what comes: lanterns in curving lines, rings of light, a falling star and flocks of birds
      next -= dt;
      if (next <= 0 && t < LENGTH - 2.5) {
        const roll = Math.random();
        if (roll < 0.42) {
          const y0 = 0.22 + Math.random() * 0.5, amp = 0.05 + Math.random() * 0.08, ph = Math.random() * 6;
          const high = Math.random() < 0.3;
          for (let i = 0; i < 6; i++) things.push({ x: 1.06 + i * 0.075, y: y0 + Math.sin(ph + i * 0.7) * amp, kind: 'lantern', ph: ph + i, high });
          next = 1.5 + Math.random() * 0.5;
        } else if (roll < 0.55) { things.push({ x: 1.1, y: 0.2 + Math.random() * 0.55, kind: 'ring', ph: 0 }); next = 0.9; }
        else if (roll < 0.6) { things.push({ x: 1.0, y: 0.04, kind: 'star', ph: 0, vy: 0.2 }); next = 0.8; }
        else if (roll < 0.8) { // a low flock crossing at carpet height: lie flat and let it pass over
          things.push({ x: 1.1, y: Math.max(0.3, Math.min(0.78, y - 0.04)), kind: 'birds', ph: Math.random() * 6 }); next = 1.3 + Math.random() * 0.6; }
        else { things.push({ x: 1.1, y: Math.max(0.18, Math.min(0.76, y - 0.07)), kind: 'birds', ph: Math.random() * 6 }); next = 1.2 + Math.random() * 0.6; }
      }
      const cx = W * 0.34, cy = H * y;
      const w = Math.min(W * 0.42, 210);
      // where Hassan's body is: on the carpet, up in a jump, or flat on it
      const jumpH = jumpT > 0 ? Math.sin((1 - jumpT / 0.75) * Math.PI) * Math.min(H * 0.13, Math.max(H * 0.07, cy - w * 0.62)) : 0; // never off the top of the screen
      const bodyTop = duckT > 0 ? cy - w * 0.1 : cy - w * 0.62 - jumpH;
      const bodyBot = duckT > 0 ? cy : cy - jumpH;
      for (const o of things) {
        o.x -= speed * dt * 1.35;
        if (o.kind === 'lantern') o.y -= dt * 0.006;
        if (o.kind === 'star') { o.y += (o.vy ?? 0) * dt; o.x -= dt * 0.1; }
        if (o.kind === 'birds') o.x -= dt * 0.05;
        const ox = o.x * W, oy = o.y * H + (o.kind === 'lantern' ? Math.sin(t * 1.6 + o.ph) * 5 : 0);
        const inX = Math.abs(ox - cx) < w * 0.45;
        if (!o.got && !o.passed && inX) {
          if (o.kind === 'lantern' || o.kind === 'star') {
            // the carpet, or Hassan himself, takes it
            const hit = (oy > bodyTop - 12 && oy < cy + 14);
            if (hit) {
              o.got = true;
              if (o.kind === 'lantern') { r.lanterns += 1; r.chain += 1; r.bestChain = Math.max(r.bestChain, r.chain); chainT = 1.3; if (jumpT > 0 && oy < cy - w * 0.55) r.jumps += 1; chime(r.chain); for (let k = 0; k < 6; k++) sparks.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.7) * 60, life: 0.6 }); }
              else { r.stars += 1; r.lanterns += 5; audio.sfx('prize'); for (let k = 0; k < 18; k++) sparks.push({ x: ox, y: oy, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.9 }); }
            }
          } else if (o.kind === 'ring') {
            if (Math.abs(oy - (cy - w * 0.25)) < H * 0.07) { o.got = true; r.rings += 1; boost = 2.2; audio.sfx('unfold'); }
          } else if (Math.abs(ox - cx) < 8) {
            // a line or a flock across your way: clear if it passes over or under all of you
            o.passed = true;
            const band = o.kind === 'line' ? 6 : 14;
            const clash = oy + band > Math.min(bodyTop, cy - 6) && oy - band < Math.max(bodyBot, cy + 10);
            if (clash) { r.hits += 1; r.chain = 0; wobble = 1; lives -= 1; audio.sfx('tap'); setToast(lives > 0 ? 'Saffron digs her claws into the fringe' : ''); window.setTimeout(() => setToast(''), 1600); }
            else if (duckT > 0 && oy < cy - w * 0.12) { r.ducks += 1; }
          }
          setHud({ lanterns: r.lanterns, chain: r.chain, lives });
        }
        if (o.got) continue;
        if (o.kind === 'lantern') lantern(ctx, ox, oy, t + o.ph);
        else if (o.kind === 'ring') ring(ctx, ox, oy, H * 0.065, t);
        else if (o.kind === 'star') star(ctx, ox, oy, t);
        else if (o.kind === 'line') {
          const lw = W * 0.34;
          poles(ctx, ox, oy, lw, H);
          if (lineIm.naturalWidth) { const lh = lw * (lineIm.naturalHeight / lineIm.naturalWidth); ctx.drawImage(lineIm, ox - lw / 2, oy - lh * 0.25, lw, lh); } else washLine(ctx, ox, oy, W, t + o.ph);
        }
        else if (birdIm.naturalWidth) { const bw = W * 0.16, bh = bw * (birdIm.naturalHeight / birdIm.naturalWidth); ctx.drawImage(birdIm, ox - bw / 2, oy - bh / 2 + Math.sin(t * 2 + o.ph) * 4, bw, bh); }
        else birds(ctx, ox, oy, t + o.ph);
      }
      while (things.length && things[0].x < -0.4) things.shift();
      for (const s of sparks) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 30 * dt; if (s.life > 0) { ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = '#ffd690'; ctx.fillRect(s.x, s.y, 2, 2); } }
      ctx.globalAlpha = 1;
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      if (boost > 0) { ctx.strokeStyle = `rgba(255,214,140,${(boost / 2.2 * 0.5).toFixed(2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy + 6); ctx.quadraticCurveTo(cx - w, cy + 10 - vy * 40, cx - w * 1.6, cy + 4); ctx.stroke(); }
      rider(ctx, { rugIm, catIm, heroIm, poseIm }, cx, cy, w, t, wobble, vy, jumpH, duckT > 0, wobble > 0.6);
      goals.forEach((gl, i) => { if (!announced.has(i) && gl.kind !== 'clean' && met(gl, r, false)) { announced.add(i); audio.sfx('prize'); setToast(`${gl.text} ✓`); window.setTimeout(() => setToast(''), 2200); } });
      if (t >= LENGTH || lives <= 0) { setStage('wake'); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- waking: goals counted, the next stretch opened ----
  const r = runRef.current;
  const nowDone = goals.map((gl, i) => doneBefore.includes(i) || met(gl, r, true));
  const allDone = nowDone.every(Boolean);
  const nextLeg = allDone && level + 1 < LEGS.length ? LEGS[level + 1] : null;
  const knocked = r.hits >= 3;
  const wake = () => {
    const s = useGame.getState();
    const dd = (s.dreams as DreamState | undefined) ?? { seen: 0, best: 0, last: 0 };
    const done = nowDone.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    const levelUp = done.length === goals.length && level + 1 < LEVELS.length;
    useGame.setState({
      dreams: { seen: dd.seen + 1, best: Math.max(dd.best, r.lanterns), last: mode === 'play' ? dd.last : s.day, level: levelUp ? level + 1 : level, done: levelUp ? [] : done } as DreamState,
      ...(s.started && mode !== 'play' ? { journal: [...s.journal, { day: s.day, text: `Dreamt of flying by night on a carpet, Saffron at the front: ${leg.name.toLowerCase()}${r.lanterns ? `, ${r.lanterns} lantern${r.lanterns === 1 ? '' : 's'}` : ''}.` }] } : {}),
    });
    onDone();
  };

  // the hand: drag anywhere (up and down) to steer; the carpet moves with the finger, not under it,
  // and holds its height when you let go. Jump and lie flat are the two buttons under the right thumb.
  const down = (e: React.PointerEvent) => {
    if (stage !== 'fly' || (e.target as Element).closest('button')) return;
    const i = input.current; i.drag = true; i.sy = e.clientY; i.from = i.target;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const i = input.current;
    if (!i.drag) return;
    i.target = Math.max(0.3, Math.min(0.8, i.from + ((e.clientY - i.sy) / Math.max(1, window.innerHeight)) * 1.5));
  };
  const up = () => { input.current.drag = false; };
  const flat = (on: boolean) => (e: React.PointerEvent) => { e.stopPropagation(); if (on) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); input.current.flat = on; };
  const nap = mode === 'nap';

  return createPortal(
    <div className={`dream ${stage}`} data-testid="dream" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>
      <div className={`fc-world${skyline ? ' skyline' : ''}`} aria-hidden="true">
        <div className="fc-sky" style={{ backgroundImage: 'url(art/dream/sky-night.webp), linear-gradient(180deg, #050818 0%, #0f1434 22%, #24204a 34%, #3a2a48 40%, transparent 46%)' }} />
        {skyline && ['far', 'mid', 'near'].map((k, i) => <div key={k} className={`fc-layer ${k}`} ref={(el) => { layers.current[i] = el; }} style={{ backgroundImage: `url(art/dream/bg-${region}-${k}.webp)` }} />)}
        <div className={`fc-plane${skyline ? ' gone' : ''}`} ref={plane} style={{ backgroundImage: `url(${MAP})` }}>
          {SETTLEMENTS.filter((s) => s.x < 885).map((s) => <i key={s.id} className={`fc-town ${s.kind}`} style={{ left: s.x * MAP_PX, top: s.y * MAP_PX }} />)}
        </div>
        <div className="fc-night" style={{ background: `linear-gradient(180deg, transparent 0%, ${leg.tint}cc 30%, ${leg.tint}99 100%)` }} />
        <div className="fc-fog" />
      </div>
      <canvas ref={cv} className="dream-canvas" aria-hidden="true" />
      {stage === 'intro' && (
        <div className="dream-card">
          <img className="dream-key" src="art/dream/flying-carpet-card.webp" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <small>{mode === 'play' ? 'THE FLYING CARPET' : nap ? 'SAFFRON PURRS' : 'THAT NIGHT'}</small>
          <b>{leg.name}</b>
          <span>{nap ? 'The lane is warm and the cat is heavy on his lap. ' : ''}The carpet rises off the mat with Saffron curled at the front. <em>Drag</em> up or down anywhere to steer; the carpet stays where you leave it. <em>Jump</em> and <em>Lie flat</em> are under your right thumb.</span>
          <ul className="dream-goals">{goals.map((gl, i) => <li key={i} className={doneBefore.includes(i) ? 'done' : ''}>{doneBefore.includes(i) ? '★' : '☆'} {gl.text}</li>)}</ul>
          {typeof innerHeight !== 'undefined' && innerHeight > innerWidth && <p className="dream-turn">Best with your phone turned on its side.</p>}
          <div className="dream-btns">
            <button className="btn primary big" onClick={() => { goWide(); setStage('fly'); }} data-testid="dream-fly">Fly</button>
            {mode === 'play' && <button className="btn" onClick={onDone}>Back</button>}
          </div>
        </div>
      )}
      {stage === 'fly' && (
        <>
          <div className="dream-score" aria-live="polite"><b>{hud.lanterns}</b> lanterns{hud.chain > 1 ? <em> · chain {hud.chain}</em> : null}{best ? <small> · best {best}</small> : null}<span className="dream-lives">{'❦'.repeat(hud.lives)}<i>{'❦'.repeat(3 - hud.lives)}</i></span></div>
          {place && <div className="dream-place">{place}</div>}
          {toast && <div className="dream-toast">{toast}</div>}
          <button className="dream-wake" onClick={() => setStage('wake')} data-testid="dream-wake">Wake up</button>
          <div className="dream-pad">
            <button className="dream-act jump" onPointerDown={(e) => { e.stopPropagation(); input.current.jump = 1; }} aria-label="Jump" data-testid="dream-jump"><b>↑</b><small>Jump</small></button>
            <button className="dream-act flat" onPointerDown={flat(true)} onPointerUp={flat(false)} onPointerCancel={flat(false)} onLostPointerCapture={() => { input.current.flat = false; }} aria-label="Lie flat" data-testid="dream-flat"><b>↓</b><small>Lie flat</small></button>
          </div>
        </>
      )}
      {stage === 'wake' && (
        <div className="dream-card dawn">
          <small>{mode === 'play' ? 'LANDED' : nap ? 'A MOMENT LATER' : 'DAWN'}</small>
          <b>{knocked ? 'Knocked awake' : mode === 'play' ? 'Down on the mat' : nap ? 'You wake at the stall' : 'You wake on the mat'}</b>
          <span>{knocked ? 'One flock too many. ' : ''}{nap ? 'Saffron is washing her paw as if nothing happened.' : mode === 'play' ? '' : 'Saffron is asleep on your feet.'} {r.lanterns ? `${r.lanterns} lantern${r.lanterns === 1 ? '' : 's'}${r.lanterns > best ? ', more than ever before' : ''}.` : ''}</span>
          <ul className="dream-goals">{goals.map((gl, i) => <li key={i} className={nowDone[i] ? 'done' : ''}>{nowDone[i] ? '★' : '☆'} {gl.text}</li>)}</ul>
          {nextLeg && <p className="dream-next">Next time: <b>{nextLeg.name}</b>.</p>}
          <button className="btn primary big" onClick={wake} data-testid="dream-done">{mode === 'play' ? 'Done' : 'Get up'}</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/** on a phone, the flight is best sideways: full screen and turned, where the browser allows it */
function goWide() {
  if (typeof document === 'undefined' || innerHeight <= innerWidth) return;
  const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
  const lock = () => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
  if (document.fullscreenElement) { lock(); return; }
  el.requestFullscreen?.().then(lock).catch(() => {});
}

/** a chime for each lantern in a chain, a little higher each time */
function chime(n: number) {
  try {
    const ctx = (audio as unknown as { ctx?: AudioContext }).ctx;
    if (!ctx) { audio.sfx('coin'); return; }
    const o = ctx.createOscillator(), gn = ctx.createGain();
    const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    o.type = 'sine'; o.frequency.value = 523.25 * Math.pow(2, notes[Math.min(notes.length - 1, n - 1)] / 12);
    gn.gain.setValueAtTime(0.0001, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    o.connect(gn); gn.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.75);
  } catch { audio.sfx('coin'); }
}

function moonGlow(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const halo = c.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
  halo.addColorStop(0, 'rgba(255,236,190,.2)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = halo; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
}
function moon(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const halo = c.createRadialGradient(x, y, r * 0.8, x, y, r * 4);
  halo.addColorStop(0, 'rgba(255,236,190,.22)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = halo; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
  c.fillStyle = '#fbefc8'; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x + r * 0.45, y - r * 0.12, r * 0.88, 0, 7); c.fill();
  c.restore();
}
function lantern(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const g = c.createRadialGradient(x, y, 1, x, y, 22);
  g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = g; c.fillRect(x - 22, y - 22, 44, 44);
  c.fillStyle = '#ffcf86'; c.globalAlpha = 0.85 + 0.15 * Math.sin(t * 5);
  c.beginPath(); c.moveTo(x, y - 10); c.quadraticCurveTo(x + 8, y - 4, x + 6, y + 6); c.lineTo(x - 6, y + 6); c.quadraticCurveTo(x - 8, y - 4, x, y - 10); c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#7a5428'; c.fillRect(x - 5, y + 6, 10, 2); c.fillRect(x - 1, y - 13, 2, 3);
}
function ring(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  c.save();
  c.strokeStyle = `rgba(255,214,140,${(0.7 + 0.2 * Math.sin(t * 4)).toFixed(2)})`;
  c.lineWidth = 3; c.shadowColor = 'rgba(255,200,120,.9)'; c.shadowBlur = 14;
  c.beginPath(); c.ellipse(x, y, r * 0.5, r, 0, 0, 7); c.stroke();
  c.restore();
}
function star(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
  c.save(); c.strokeStyle = 'rgba(255,246,220,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y - 40); c.stroke();
  c.fillStyle = '#fffbe8'; c.shadowColor = '#fff2c0'; c.shadowBlur = 16 + Math.sin(t * 10) * 4; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.restore();
}
/** a washing line strung between two roofs that have dropped away below, linen hanging from it */
/** the two roofs a washing line is strung between: a pole on each, rising from a parapet at the foot of the screen */
function poles(c: CanvasRenderingContext2D, x: number, y: number, lw: number, H: number) {
  const top = y - lw * (320 / 1024) * 0.25 + lw * (60 / 1024);
  c.save();
  for (const px of [x - lw / 2 + 3, x + lw / 2 - 3]) {
    const roof = H * 0.93 + ((px * 7) % 13);
    c.fillStyle = 'rgba(24,17,20,.96)';
    c.fillRect(px - lw * 0.09, roof, lw * 0.18, H - roof + 2); // the parapet
    c.fillStyle = 'rgba(150,110,70,.55)'; c.fillRect(px - lw * 0.1, roof - 3, lw * 0.2, 3);
    c.strokeStyle = 'rgba(104,76,52,1)'; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px, roof); c.lineTo(px, top - 6); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(px - 5, top - 2); c.lineTo(px + 5, top - 2); c.stroke(); // a crosspiece
  }
  c.restore();
}
function washLine(c: CanvasRenderingContext2D, x: number, y: number, W: number, t: number) {
  const half = W * 0.16;
  c.save();
  c.strokeStyle = 'rgba(70,52,40,.95)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - half, y - 10); c.quadraticCurveTo(x, y + 8, x + half, y - 10); c.stroke();
  const cloth = ['#d8cdb4', '#8a3a2c', '#c8b88e', '#3a4a6a', '#e0d6c0'];
  for (let i = 0; i < 5; i++) {
    const u = (i + 0.5) / 5, px = x - half + u * half * 2, py = y - 10 + Math.sin(u * Math.PI) * 9;
    c.fillStyle = cloth[i]; c.globalAlpha = 0.92;
    c.beginPath(); c.moveTo(px - 7, py); c.lineTo(px + 7, py); c.lineTo(px + 6 + Math.sin(t * 3 + i) * 2, py + 16); c.lineTo(px - 6 + Math.sin(t * 3 + i) * 2, py + 16); c.closePath(); c.fill();
  }
  c.restore();
}
function birds(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
  c.save(); c.strokeStyle = 'rgba(30,24,30,.95)'; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const bx = x + (i % 3) * 16 - 14, by = y + (i - 2) * 6 + Math.sin(t * 2 + i) * 3, f = Math.sin(t * 9 + i) * 5;
    c.beginPath(); c.moveTo(bx - 8, by - f); c.quadraticCurveTo(bx - 3, by - 3, bx, by); c.quadraticCurveTo(bx + 3, by - 3, bx + 8, by - f); c.stroke();
  }
  c.restore();
}

// ---------- the carpet, Hassan and Saffron ----------
interface Ims { rugIm: HTMLImageElement; catIm: HTMLImageElement; heroIm: HTMLImageElement; poseIm: Record<string, HTMLImageElement> }
function rider(c: CanvasRenderingContext2D, ims: Ims, cx: number, cy: number, w: number, t: number, wobble: number, vy: number, jumpH: number, duck: boolean, hit: boolean) {
  const { rugIm: im, catIm, heroIm, poseIm } = ims;
  if (!im.naturalWidth) return;
  const tilt = Math.max(-0.2, Math.min(0.2, vy * 0.32)) + (hit ? Math.sin(t * 40) * 0.05 : 0);
  c.save(); c.translate(cx, cy); c.rotate(tilt); c.translate(-cx, -cy);
  const h = w * (im.naturalHeight / im.naturalWidth) * 0.34;
  const n = 30, iw = im.naturalWidth, ih = im.naturalHeight;
  const wave = (u: number) => Math.sin(u * 5.2 - t * 5.5) * (3 + wobble * 9) * (0.3 + u) + Math.sin(t * 1.2) * 2;
  const base = c.getTransform();
  // Hassan stands (or crouches, or lies flat) behind Saffron: drawn before the carpet's front edge
  const hx = cx - w * 0.08, hy = cy + wave(0.42) + h * 0.45;
  const pose = duck ? 'duck' : jumpH > 1 ? 'jump' : hit ? 'hit' : 'sit';
  const painted = poseIm[pose]?.naturalWidth ? poseIm[pose] : null;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const x0 = cx - w / 2 + u0 * w, x1 = cx - w / 2 + u1 * w, y0 = cy + wave(u0), y1 = cy + wave(u1);
    const sw = iw / n;
    c.setTransform(base);
    c.transform((x1 - x0) / sw, (y1 - y0) / sw, 0, h / ih, x0 - ((x1 - x0) / sw) * u0 * iw, y0 - ((y1 - y0) / sw) * u0 * iw);
    c.drawImage(im, u0 * iw, 0, sw + 1, ih, u0 * iw, 0, sw + 1, ih);
  }
  c.setTransform(base);
  c.strokeStyle = 'rgba(240,220,180,.55)'; c.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const py = cy + wave(0) + (i / 8) * h; c.beginPath(); c.moveTo(cx - w / 2, py); c.lineTo(cx - w / 2 - 6 - Math.sin(t * 6 + i) * 2, py + 1); c.stroke(); }
  if (painted) {
    // every pose is painted on the same 768 square, the carpet line at 700: one scale for all of them
    const S = w * 0.95;
    // the jump is painted already springing (feet ~120px above the line): only the rest of the rise is added
    const lift = pose === 'jump' ? Math.max(0, jumpH - S * (120 / 768)) : jumpH;
    c.drawImage(painted, hx - S / 2, hy - S * (700 / 768) - lift, S, S);
  } else if (heroIm.naturalWidth) {
    // his own painted figure, in the clothes he wears: standing, springing up, or flat on the mat
    const fh = w * 0.82, fw = fh * (heroIm.naturalWidth / heroIm.naturalHeight);
    c.save();
    if (duck) { c.translate(hx + w * 0.02, hy - h * 0.25); c.rotate(-Math.PI / 2 + 0.08); c.drawImage(heroIm, -fw / 2, -fh * 0.5, fw, fh * 0.98); }
    else { c.translate(hx, hy - jumpH); c.rotate(jumpH > 1 ? -0.06 : Math.sin(t * 1.3) * 0.015); c.drawImage(heroIm, -fw / 2, -fh, fw, fh); }
    c.restore();
  }
  // Saffron curled at the front, ears up when something is coming
  const catPose = hit ? poseIm['cat-cling'] : poseIm['cat-alert'];
  const catArt = catPose?.naturalWidth && (hit || jumpH > 1 || duck) ? catPose : catIm;
  if (catArt.naturalWidth) {
    const sx = cx + w * 0.3, sy = cy + wave(0.82) + h * 0.55;
    if (catArt !== catIm) {
      // her painted poses share one 512 square, paws on the line at 470: drawn at one scale
      const S = w * 0.36;
      c.drawImage(catArt, sx - S / 2, sy - S * (470 / 512), S, S);
    } else {
      const cw = w * 0.34, ch = cw * (catArt.naturalHeight / catArt.naturalWidth);
      c.drawImage(catArt, sx - cw / 2, sy - ch, cw, ch);
    }
  }
  c.restore();
}
