import { useEffect, useRef, useState } from 'react';
import { streetRoute } from '../../game/systems/streets';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { VENUES, VENUE_W as DW, VENUE_H as DH, type VenuePoi, type Venue as VenueDef } from '../../data/venues';
import { BUYERS } from '../../data/buyers';
import { StallEncounter } from '../StallEncounter/StallEncounter';
import { Tip } from '../Tips/Tip';

// Walk the grounds of a palace. The fog lifts as you go; the chamberlain gives advice; the audience hall starts the negotiation.
// Illustrated markers for the stops that have one (art/drafts/icons); the rest keep their letter glyph.
const ICON_FOR = (p: VenuePoi): string | undefined => {
  const a = p.action ?? '';
  if (p.id === 'port') return 'port';
  if (p.kind === 'exit' && /station/i.test(p.name)) return 'station';
  if (p.kind === 'audience' || a === 'palace') return 'palace';
  if (a === 'market') return 'carpet-market';
  if (a === 'floor' || a.startsWith('house:')) return 'auction';
  if (a === 'guards') return 'guards';
  if (a === 'animals') return 'caravanserai';
  if (a.startsWith('venue:')) return 'cabaret';
  return undefined;
};
const iconSrc = (n: string) => `${import.meta.env.BASE_URL}art/drafts/icons/${n}-96.png`;
const ICON_IMG: Record<string, HTMLImageElement> = {};
const iconImg = (n: string) => {
  if (typeof Image === 'undefined') return undefined;
  const im = (ICON_IMG[n] ??= Object.assign(new Image(), { src: iconSrc(n) }));
  return im.complete && im.naturalWidth ? im : undefined;
};

const FG = 8, FW = Math.ceil(DW / FG), FH = Math.ceil(DH / FG), REVEAL = 190;

/** A royal audience in progress, full screen over whatever opened it. */
export function AudienceOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div className="audience-overlay" data-testid="audience">
      <StallEncounter onLeaveAudience={onDone} />
    </div>
  );
}

export function Venue({ id, def, onLeave, onAction, onExitCity, exitLabel }: { id?: string; def?: VenueDef; onLeave: () => void; onAction?: (a: string) => void; onExitCity?: () => void; exitLabel?: string }) {
  const v = def ?? VENUES[id!];
  const g = useGame();
  const royal = v.royal ? BUYERS[v.royal] : undefined;
  const walked = useRef(0);
  const cvs = useRef<HTMLCanvasElement>(null);
  // what you explored here before stays explored
  const saved = useGame.getState().world.walks?.[v.id];
  const st = useRef({ x: v.start.x, y: v.start.y, tx: v.start.x, ty: v.start.y, fog: saved && saved.fog.length === FW * FH ? saved.fog.split('').map((c) => c === '1') : (new Array(FW * FH).fill(false) as boolean[]), seen: new Set<string>([...v.pois.filter((p) => p.kind === 'exit' || p.kind === 'audience' || p.kind === 'goto').map((p) => p.id), ...(saved?.seen ?? [])]), target: null as string | null, route: [] as { x: number; y: number }[], dirty: true });
  const save = () => useGame.getState().setWalk(v.id, st.current.fog.map((b) => (b ? '1' : '0')).join(''), [...st.current.seen]);
  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [cam, setCam] = useState({ s: 1, cx: v.start.x, cy: v.start.y - 120 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const [seen, setSeen] = useState<string[]>([...st.current.seen]);
  const [toast, setToast] = useState('');
  const [note, setNote] = useState<{ title: string; text: string; poi?: VenuePoi } | null>(null);
  const [audience, setAudience] = useState(false);
  const [hintSeen, setHintSeen] = useState(() => { try { return localStorage.getItem('tof-poi-hint-seen') === '1'; } catch { return true; } });
  const lastFocus = useRef<HTMLElement | null>(null);
  const dismissHint = () => { setHintSeen(true); try { localStorage.setItem('tof-poi-hint-seen', '1'); } catch { /* ignore */ } };
  const closeNote = () => { setNote(null); lastFocus.current?.focus(); };
  /** Tapping an information-only stop shows what it has to say right away, without walking there first,
   *  so the sheet never has to interrupt a walk in progress or hide the marker you just tapped. */
  const peek = (p: VenuePoi, from?: HTMLElement) => {
    lastFocus.current = from ?? null;
    const lines = p.text ?? [];
    setNote({ title: p.name, text: lines[Math.floor(Math.random() * lines.length)] ?? '', poi: p });
    if (!hintSeen) dismissHint();
  };
  useEffect(() => {
    if (!note) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNote(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const reveal = (x: number, y: number) => {
    const s = st.current;
    const cr = Math.ceil(REVEAL / FG), cx = Math.floor(x / FG), cy = Math.floor(y / FG);
    for (let j = -cr; j <= cr; j++) for (let i = -cr; i <= cr; i++) {
      const X = cx + i, Y = cy + j;
      if (X < 0 || Y < 0 || X >= FW || Y >= FH || i * i + j * j > cr * cr) continue;
      const k = Y * FW + X;
      if (!s.fog[k]) { s.fog[k] = true; s.dirty = true; }
    }
    for (const p of v.pois) {
      if (!s.seen.has(p.id) && Math.hypot(p.x - x, p.y - y) < REVEAL + 30) {
        s.seen.add(p.id);
        setSeen([...s.seen]);
        setToast(`Found: ${p.name}`);
        audio.sfx('pen');
        save();
      }
    }
  };

  const arrive = (p: VenuePoi) => {
    if (p.kind === 'exit') { onLeave(); return; }
    if (p.kind === 'goto' && p.action) { onAction?.(p.action); return; }
    if (p.kind === 'audience' && v.royal) {
      const msg = useGame.getState().startAudience(v.royal);
      if (msg) setNote({ title: p.name, text: msg });
      else setAudience(true);
      return;
    }
    const lines = p.text ?? [];
    setNote({ title: p.name, text: lines[Math.floor(Math.random() * lines.length)] ?? '' });
  };

  const walkTo = (x: number, y: number, target: string | null) => {
    const s = st.current;
    // keep to the streets: the way there, point by point
    const way = streetRoute(v.id, { x: s.x, y: s.y }, { x: Math.max(10, Math.min(DW - 10, x)), y: Math.max(10, Math.min(DH - 10, y)) });
    const first = way.shift()!;
    s.tx = first.x; s.ty = first.y;
    s.route = way;
    s.target = target;
    audio.sfx('step');
  };

  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let bg: HTMLImageElement | null = null;
    { const im = new Image(); im.onload = () => { bg = im; }; im.src = v.map!; }
    const fogC = document.createElement('canvas');
    fogC.width = FW; fogC.height = FH;
    const fctx = fogC.getContext('2d')!;
    const softC = document.createElement('canvas');
    softC.width = DW / 2; softC.height = DH / 2;
    const soft = softC.getContext('2d')!;
    const drawFog = () => {
      const img = fctx.createImageData(FW, FH);
      const f = st.current.fog;
      for (let i = 0; i < f.length; i++) { img.data[i * 4] = 70; img.data[i * 4 + 1] = 50; img.data[i * 4 + 2] = 30; img.data[i * 4 + 3] = f[i] ? 0 : 140; }
      fctx.putImageData(img, 0, 0);
      soft.clearRect(0, 0, softC.width, softC.height);
      soft.filter = 'blur(10px)';
      soft.drawImage(fogC, 0, 0, softC.width, softC.height);
      soft.filter = 'none';
    };
    reveal(st.current.x, st.current.y);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const s = st.current;
      const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy);
      const moving = dist > 1.5;
      if (moving) {
        const step = Math.min(dist, 240 * dt);
        s.x += (dx / dist) * step; s.y += (dy / dist) * step;
        // walking takes time: the clock moves as you go
        walked.current += step;
        if (walked.current >= 26 * 5) { walked.current -= 26 * 5; useGame.getState().passTime(5); }
        reveal(s.x, s.y);
        const cm = camRef.current, k = Math.min(1, dt * 3);
        setCam({ ...cm, cx: cm.cx + (s.x - cm.cx) * k, cy: cm.cy + (s.y - cm.cy) * k });
      } else if (s.route.length) {
        const n = s.route.shift()!;
        s.tx = n.x; s.ty = n.y;
      } else if (s.target) {
        const t = v.pois.find((p) => p.id === s.target);
        s.target = null;
        if (t) arrive(t);
      }
      if (s.dirty) { drawFog(); s.dirty = false; }
      const cm = camRef.current;
      const sc = Math.max(Math.max(W / DW, H / DH), cm.s);
      let ox = W / 2 - cm.cx * sc, oy = H / 2 - cm.cy * sc;
      ox = Math.min(0, Math.max(W - DW * sc, ox));
      oy = Math.min(0, Math.max(H - DH * sc, oy));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#120c07'; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      if (bg) ctx.drawImage(bg, 0, 0, DW, DH);
      ctx.drawImage(softC, 0, 0, DW, DH);
      if (moving) {
        ctx.strokeStyle = 'rgba(255,215,130,0.9)'; ctx.lineWidth = 2 / sc;
        ctx.beginPath(); ctx.arc(s.tx, s.ty, 8 + Math.sin(now / 150) * 2, 0, 7); ctx.stroke();
      }
      const bob = moving ? Math.sin(now / 90) * 1.2 : 0;
      ctx.save(); ctx.translate(s.x, s.y);
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, 'rgba(255,210,120,0.55)'); glow.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(30,16,6,0.35)'; ctx.beginPath(); ctx.ellipse(5, 4, 9, 6, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#4a3322'; ctx.beginPath(); ctx.ellipse(0, bob, 6.5, 8.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8d8b8'; ctx.beginPath(); ctx.ellipse(0, bob, 3.5, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2618'; ctx.beginPath(); ctx.arc(0, bob, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e7bd6e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.stroke();
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of v.pois) {
        if (!s.seen.has(p.id)) continue;
        const X = ox + p.x * sc, Y = oy + p.y * sc;
        if (X < -80 || Y < -40 || X > W + 80 || Y > H + 40) continue;
        const key = p.kind === 'audience' || p.kind === 'goto';
        const ic = ICON_FOR(p), im = ic ? iconImg(ic) : undefined;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let lab = 16;
        if (im) {
          // a parchment disc under the illustrated icon; a red ring still marks the places you can enter
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(X + 1.5, Y + 2.5, 20, 0, 7); ctx.fill();
          ctx.fillStyle = '#efe0bf'; ctx.beginPath(); ctx.arc(X, Y, 20, 0, 7); ctx.fill();
          ctx.strokeStyle = key ? '#9a3326' : '#5a3d20'; ctx.lineWidth = key ? 2.5 : 1.5; ctx.stroke();
          ctx.drawImage(im, X - 16, Y - 16, 32, 32);
          lab = 23;
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(X + 1.5, Y + 2, 13, 0, 7); ctx.fill();
          ctx.fillStyle = key ? '#9a3326' : '#efe0bf';
          ctx.beginPath(); ctx.arc(X, Y, 13, 0, 7); ctx.fill();
          ctx.strokeStyle = key ? '#e7bd6e' : '#5a3d20'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = key ? '#efe0bf' : '#5a3d20';
          ctx.font = '700 13px Cinzel, Georgia, serif';
          ctx.fillText(p.glyph, X, Y + 1);
        }
        ctx.font = '600 12.5px Alegreya, Georgia, serif';
        const tw = ctx.measureText(p.name).width + 12;
        ctx.fillStyle = 'rgba(239,224,191,0.94)'; ctx.fillRect(X - tw / 2, Y + lab, tw, 18);
        ctx.strokeStyle = 'rgba(90,61,32,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(X - tw / 2 + 0.5, Y + lab + 0.5, tw - 1, 17);
        ctx.fillStyle = '#2b1b0d'; ctx.fillText(p.name, X, Y + lab + 9.5);
        // a small "i" badge marks a stop that only offers information, tapped straight into a sheet
        if (p.kind === 'note') {
          ctx.fillStyle = '#402616'; ctx.beginPath(); ctx.arc(X + 10, Y - 10, 7, 0, 7); ctx.fill();
          ctx.strokeStyle = '#f5ddb0'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#fff2d2'; ctx.font = '700 10px Georgia, serif';
          ctx.fillText('i', X + 10, Y - 9.5);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t); }, [toast]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; pinch?: number; s0?: number } | null>(null);
  const view = () => {
    const c = cvs.current!;
    const W = c.clientWidth, H = c.clientHeight, cm = camRef.current;
    const sc = Math.max(Math.max(W / DW, H / DH), cm.s);
    let ox = W / 2 - cm.cx * sc, oy = H / 2 - cm.cy * sc;
    ox = Math.min(0, Math.max(W - DW * sc, ox));
    oy = Math.min(0, Math.max(H - DH * sc, oy));
    return { W, H, sc, ox, oy };
  };
  const clampCam = (cm: { s: number; cx: number; cy: number }) => {
    const { W, H } = view();
    const s = Math.max(Math.max(W / DW, H / DH), Math.min(2.4, cm.s));
    const hw = W / 2 / s, hh = H / 2 / s;
    return { s, cx: Math.max(hw, Math.min(DW - hw, cm.cx)), cy: Math.max(hh, Math.min(DH - hh, cm.cy)) };
  };
  const local = (e: React.PointerEvent) => { const r = cvs.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const cm = camRef.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: 0, y: 0, cx: cm.cx, cy: cm.cy, moved: true, pinch: Math.hypot(a.x - b.x, a.y - b.y), s0: cm.s };
    } else drag.current = { ...p, cx: cm.cx, cy: cm.cy, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const cm = camRef.current;
    if (d.pinch && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setCam(clampCam({ ...cm, s: (d.s0 ?? 1) * (Math.hypot(a.x - b.x, a.y - b.y) / d.pinch) }));
      return;
    }
    if (Math.hypot(p.x - d.x, p.y - d.y) > 6) d.moved = true;
    if (d.moved) setCam(clampCam({ s: cm.s, cx: d.cx - (p.x - d.x) / view().sc, cy: d.cy - (p.y - d.y) / view().sc }));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    pointers.current.delete(e.pointerId);
    if (!d || d.moved) { if (pointers.current.size === 0) drag.current = null; return; }
    drag.current = null;
    const p = local(e);
    const { sc, ox, oy } = view();
    const wx = (p.x - ox) / sc, wy = (p.y - oy) / sc;
    const hit = v.pois.find((q) => st.current.seen.has(q.id) && Math.hypot(q.x - wx, q.y - wy) < 24 / sc + 6);
    if (hit && hit.kind === 'note') peek(hit);
    else if (hit) walkTo(hit.x, hit.y, hit.id);
    else walkTo(wx, wy, null);
  };
  const zoom = (f: number) => setCam(clampCam({ ...camRef.current, s: camRef.current.s * f }));
  const unknown = v.pois.length - seen.length;
  const canSee = g.reputation >= (royal?.royal?.minRep ?? 0);
  const isCity = !v.royal;

  return (
    <div className="venue" data-testid="venue" data-venue={v.id}>
      <div className="venue-stage">
        <canvas ref={cvs} className="district-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)} aria-label={`${v.name}, seen from above. Tap a marker's "i" badge for information, or tap the ground to walk.`} />
        <div className="district-top">
          <div className="district-title"><b>{v.name}</b><span>{isCity ? `${v.where} · tap to walk, tap a place to go in` : `${v.where} · ${canSee ? 'you may request an audience' : `audience needs reputation ${royal?.royal?.minRep}`}`}</span></div>
          <div className="map-tools district-tools">
            <button onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
            <button onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
          </div>
        </div>
        {toast && <div className="district-toast">{toast}</div>}
        {!hintSeen && !note && (
          <div className="poi-hint" data-testid="poi-hint">
            <span>Tap a place to learn about it or visit.</span>
            <button onClick={dismissHint} aria-label="Dismiss hint">×</button>
          </div>
        )}
        {note && <div className="poi-backdrop" data-testid="poi-backdrop" onClick={closeNote} />}
        {note && (
          <div className="district-note poi-sheet" data-testid="venue-note" role="dialog" aria-modal="false" aria-labelledby="poi-sheet-title">
            <button className="poi-sheet__close" aria-label="Close place information" onClick={closeNote}>×</button>
            <h3 id="poi-sheet-title">{note.title}</h3>
            <p>{note.text}</p>
            <div className="poi-sheet__actions">
              {note.poi && (
                <button className="btn primary" data-testid="poi-visit" onClick={() => { const p = note.poi!; setNote(null); walkTo(p.x, p.y, p.id); }}>Visit this place</button>
              )}
              <button className="btn" data-testid="poi-close" onClick={closeNote}>Close</button>
            </div>
          </div>
        )}
      </div>
      <div className="district-sheet">
        <div className="district-places">
          {v.pois.filter((p) => seen.includes(p.id)).map((p) => (
            <button key={p.id} className={`dplace ${p.kind === 'audience' || p.kind === 'goto' ? 'royal' : ''}`} onClick={(e) => (p.kind === 'note' ? peek(p, e.currentTarget) : walkTo(p.x, p.y, p.id))} data-testid={`vpoi-${p.id}`}>
              <i>{ICON_FOR(p) ? <img src={iconSrc(ICON_FOR(p)!)} alt="" draggable={false} /> : p.glyph}</i>
              <span><b>{p.name}</b><small>{p.sub}</small></span>
            </button>
          ))}
          {unknown > 0 && <div className="dplace unknown"><i>?</i><span><b>{unknown} more to find</b><small>{isCity ? 'Walk the streets' : 'Walk the grounds'}</small></span></div>}
        </div>
      </div>
      <div className="venue-doors">
        <button className="btn door-btn leave" onClick={onLeave} data-testid="venue-leave">⟵ {v.id.startsWith('auction-') || def?.pois.some((p) => p.action === 'floor') ? 'Leave, back to town' : isCity ? 'Back to the town square' : 'Leave the palace'}</button>
        {onExitCity && <button className="btn door-btn leave exit-city" onClick={onExitCity} data-testid="venue-exit-city">{exitLabel ?? 'Leave the city'} ⟶</button>}
        {v.pois.filter((p) => p.kind === 'goto' && p.action).length <= 2 && v.pois.filter((p) => p.kind === 'goto' && p.action).map((p) => (
          <button key={p.id} className="btn primary door-btn enter" onClick={() => onAction?.(p.action!)} data-testid={`venue-enter-${p.id}`}>Enter {p.name.toLowerCase()} ⟶</button>
        ))}
        {!isCity && canSee && v.pois.filter((p) => p.kind === 'audience').slice(0, 1).map((p) => (
          <button key={p.id} className="btn primary door-btn enter" onClick={() => walkTo(p.x, p.y, p.id)} data-testid="venue-enter-audience">Go to {p.name.toLowerCase()} ⟶</button>
        ))}
      </div>
      <Tip id="audience" when={!isCity && !audience} />
      {audience && <AudienceOverlay onDone={() => setAudience(false)} />}
    </div>
  );
}
