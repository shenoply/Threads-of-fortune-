import { hasPerk } from '../../data/character';
import { Fragment, useEffect, useRef, useState } from 'react';
import { fmt, snap, snapDown } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import type { RugItem } from '../../game/types';
import { rugSrc, simulatedBack } from './rugArt';
import { Icon } from '../Icon';
import { perceivedValue } from '../../game/systems/negotiation';
import { useEscapeClose } from './useEscapeClose';
import { FLAW_CLUES, eyeOf, flawFactorFor, flawNotes } from '../../game/systems/fakes';
import { RugFlags } from '../Inventory/RugFlags';
import { KnotCount } from '../KnotCount/KnotCount';
import { countable, knotVerdict } from '../../game/knots';
import { RollingRug } from './RollingRug';
import { ExamineRug } from './ExamineRug';

/** the carpet unrolls as the inspector opens; not for players who asked for less motion, nor in automated runs */
const mayRoll = () => typeof window !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches && (!navigator.webdriver || !!(window as { __tofRoll?: boolean }).__tofRoll);

const TABS = ['Overview', 'Condition', 'Weave', 'Fringe', 'Provenance', 'Estimate'] as const;

/** key: the dealer's offer (the seed of its hidden faults), so a knot count on it is kept and goes with the rug if bought */
export interface RugPreview { typeId: string; condition: RugItem['condition']; provenance?: RugItem['provenance']; price?: number; flaw?: Pick<RugItem, 'dye' | 'fakeAge'>; key?: string }
/** Inspect a rug you own (uid) or one you are thinking of buying (preview). */
export function RugViewer({ uid, preview, onClose }: { uid?: string; preview?: RugPreview; onClose: () => void }) {
  const g = useGame();
  const item: RugItem | undefined = preview
    ? { uid: preview.key ?? 'preview', typeId: preview.typeId, condition: preview.condition, provenance: preview.provenance ?? RUGS[preview.typeId].provenance, paid: preview.price ?? 0, notes: [], restored: false, stored: false, ...preview.flaw } as RugItem
    : g.inventory.find((i) => i.uid === uid);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rot, setRot] = useState(0);
  const [back, setBack] = useState(false);
  const [backSrc, setBackSrc] = useState('');
  const [counting, setCounting] = useState(false);
  // the carpet in motion: unrolling into view, rolling up, or lying rolled; null once it lies flat as a picture
  const [roll, setRoll] = useState<{ from: 'flat' | 'rolled'; target: 'flat' | 'rolled' } | null>(() => (mayRoll() ? { from: 'rolled', target: 'flat' } : null));
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);
  const [skip, setSkip] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const measure = () => { const el = imgRef.current; if (el && el.offsetWidth) setFit({ w: el.offsetWidth, h: el.offsetHeight }); };
  useEffect(() => { if (imgRef.current?.complete) measure(); }, []);
  const pinch = useRef<{ d: number; z: number; mx: number; my: number; px: number; py: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // In the hands: one finger turns it (across spins it round, up or down tips it towards you), and it
  // stays as you leave it; two fingers zoom and move it, at whatever angle it lies; a finger on a rolled
  // carpet pushes it open, and a finger on its far end pulls it up into a roll.
  const [turn, setTurn] = useState<{ yaw: number; pitch: number } | null>(null);
  const tw = useRef<{ yaw: number; pitch: number; vy: number; vp: number; raf: number }>({ yaw: 0, pitch: 0, vy: 0, vp: 0, raf: 0 });
  const grab = useRef<{ kind: 'turn' | 'roll'; x: number; y: number; yaw: number; pitch: number; p0: number; lt: number; v: number; on: boolean; axis?: 'x' | 'y' } | null>(null);
  const hand = useRef<number | null>(null); // where a finger holds the roll (0 rolled … 1 flat)
  const rollAt = useRef(roll ? 0 : 1); // where the roll is now, kept by the drawing
  const [hint, setHint] = useState(() => { try { const n = +(localStorage.getItem('tof-insp-hint') ?? 0); localStorage.setItem('tof-insp-hint', String(n + 1)); return n < 4; } catch { return false; } });
  useEffect(() => () => cancelAnimationFrame(tw.current.raf), []);
  // a finger lifted anywhere (off the stage, over a button) always lets go of the carpet
  useEffect(() => {
    const up = () => {
      if (pointers.current.size) return;
      if (hand.current !== null) { hand.current = null; setRoll((r) => (r ? { from: 'rolled', target: rollAt.current > 0.5 ? 'flat' : 'rolled' } : r)); }
      grab.current = null;
    };
    const lift = (e: PointerEvent) => { pointers.current.delete(e.pointerId); if (!pointers.current.size) pinch.current = null; up(); };
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);
    return () => { window.removeEventListener('pointerup', lift); window.removeEventListener('pointercancel', lift); };
  }, []);
  // the hint shows itself for a few seconds, then gets out of the way
  useEffect(() => { if (!hint) return; const t = window.setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, [hint]);
  const animate = (straighten: boolean) => {
    const w = tw.current, base = (rot * Math.PI) / 180;
    cancelAnimationFrame(w.raf);
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!straighten) {
        // a flick carries it round a little further, slowing as cloth would on the floor
        w.yaw += w.vy * dt; w.vy *= Math.exp(-3.2 * dt);
        setTurn({ yaw: w.yaw, pitch: w.pitch });
        if (Math.abs(w.vy) > 0.05) w.raf = requestAnimationFrame(step);
        return;
      }
      const goal = base + Math.round((w.yaw - base) / (2 * Math.PI)) * 2 * Math.PI;
      // a weighty spring back: it comes round and settles, no bounce
      w.vy += ((goal - w.yaw) * 30 - w.vy * 10) * dt; w.yaw += w.vy * dt;
      w.vp += ((0 - w.pitch) * 30 - w.vp * 10) * dt; w.pitch += w.vp * dt;
      if (Math.abs(goal - w.yaw) < 0.002 && Math.abs(w.pitch) < 0.002 && Math.abs(w.vy) < 0.02) { w.vy = w.vp = 0; setTurn(null); return; }
      setTurn({ yaw: w.yaw, pitch: w.pitch });
      w.raf = requestAnimationFrame(step);
    };
    w.raf = requestAnimationFrame(step);
  };
  const straighten = () => { tw.current.vy = tw.current.vp = 0; animate(true); };
  const tut = !g.tutorial.done && !!g.encounter?.tutorial;
  const used = g.tutorial.inspected;

  const t = item ? RUGS[item.typeId] : null;
  // Escape and the back gesture close it, as Done does (and, like Done, not while the lesson wants a closer look)
  const box = useRef<HTMLDivElement>(null);
  const locked = tut && g.tutorial.step === 'inspect2' && !used;
  useEscapeClose(box, () => { if (!locked) onClose(); });
  useEffect(() => {
    if (back && t && !backSrc) simulatedBack(t).then(setBackSrc);
  }, [back, t, backSrc]);

  if (!item || !t) return null;
  const mark = () => g.inspectorUsed();
  const setZ = (z: number) => {
    const nz = Math.max(1, Math.min(3, z));
    setZoom(nz);
    if (nz === 1) setPan({ x: 0, y: 0 });
    mark();
  };
  // a knot count tightens the estimate to what you counted: right if the count was right, a little off if not
  const knots = g.knotCounts?.[item.uid];
  const kf = knots ? Math.sqrt(knots.counted / knots.truth) : 1;
  const exact = !!knots || g.upgrades.includes('ledgerbook') || hasPerk(g.skills?.appraisal, 'appraisal', 5);
  const lo = knots ? snapDown(t.valueBand[0] * kf) : exact ? t.valueBand[0] : snapDown(t.valueBand[0] * 0.85);
  const hi = knots ? snap(t.valueBand[1] * kf) : exact ? t.valueBand[1] : snap(t.valueBand[1] * 1.15);
  const canCount = !!preview?.key && countable(t.id);
  const pv = snap(perceivedValue(t, item) * (g.knotCounts?.[item.uid] ? Math.sqrt(g.knotCounts[item.uid].counted / g.knotCounts[item.uid].truth) : 1));
  const flaws = flawNotes(item, eyeOf(g));

  return (
    <div ref={box} className="overlay" role="dialog" aria-modal="true" aria-label={`Inspecting ${t.name}`} data-testid="inspector">
      <div className="overlay-head">
        <div>
          <h2>{t.name}</h2>
          <div className="sub">
            {t.origin} · {t.material} · {t.age} · {t.size}
          </div>
          <RugFlags item={item} moth={!preview} />
        </div>
        <button className="btn close" onClick={onClose} disabled={tut && g.tutorial.step === 'inspect2' && !used} data-testid="inspector-close">
          {tut && g.tutorial.step === 'inspect2' && !used ? 'Look closer first' : 'Done'}
        </button>
      </div>
      <div
        className="inspector-stage"
        onWheel={(e) => setZ(zoom * (e.deltaY < 0 ? 1.15 : 0.87))}
        onPointerDown={(e) => {
          // the tool buttons keep their own taps (capturing the pointer would take their click away)
          if ((e.target as Element).closest('button')) return;
          setHint(false);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            // a second finger: zoom and move, whatever angle it lies at; a roll held by the first is let go
            const gr = grab.current; grab.current = null;
            if (gr?.kind === 'roll') { hand.current = null; setRoll({ from: 'rolled', target: rollAt.current > 0.5 ? 'flat' : 'rolled' }); }
            if (gr?.kind === 'turn' && gr.on) animate(false);
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, px: pan.x, py: pan.y };
            return;
          }
          if (pointers.current.size > 2 || pinch.current) return;
          const w = tw.current; cancelAnimationFrame(w.raf);
          const base = { x: e.clientX, y: e.clientY, yaw: w.yaw, pitch: w.pitch, lt: e.timeStamp, v: 0, on: false };
          if (roll) { grab.current = { kind: 'roll', ...base, p0: rollAt.current }; return; }
          if (!turn) { w.yaw = (rot * Math.PI) / 180; w.pitch = 0; }
          w.vy = w.vp = 0;
          grab.current = { kind: 'turn', ...base, yaw: w.yaw, pitch: w.pitch, p0: 1, on: !!turn };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pc = pinch.current;
          if (pc && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const nz = Math.max(1, Math.min(4, pc.z * (Math.hypot(a.x - b.x, a.y - b.y) / pc.d)));
            setZoom(nz);
            setPan({ x: pc.px + ((a.x + b.x) / 2 - pc.mx), y: pc.py + ((a.y + b.y) / 2 - pc.my) });
            mark();
            return;
          }
          const gr = grab.current;
          if (!gr) return;
          const dx = e.clientX - gr.x, dy = e.clientY - gr.y;
          if (!gr.on && Math.hypot(dx, dy) < 7) return;
          const dt = Math.max(1, e.timeStamp - gr.lt) / 1000;
          if (!gr.on) {
            gr.on = true; measure(); mark();
            if (gr.kind === 'roll' && !roll) { hand.current = 1; rollAt.current = 1; setRoll({ from: 'flat', target: 'flat' }); }
          }
          if (gr.kind === 'roll') {
            // the roll follows the finger along the carpet's length
            const len = (fit?.w ?? 300) * 0.9;
            const p = Math.max(0, Math.min(1, gr.p0 + dx / len));
            gr.v = 0.6 * gr.v + 0.4 * ((p - (hand.current ?? p)) / dt);
            hand.current = p;
          } else {
            const w = tw.current;
            // one movement at a time: a drag across spins it, a drag up or down tips it
            if (!gr.axis) gr.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
            const yaw = gr.axis === 'x' ? gr.yaw + dx * 0.009 : gr.yaw;
            const pitch = gr.axis === 'y' ? Math.max(-0.95, Math.min(0.95, gr.pitch + dy * 0.007)) : gr.pitch;
            w.vy = 0.6 * w.vy + 0.4 * ((yaw - w.yaw) / dt);
            w.yaw = yaw; w.pitch = pitch;
            setTurn({ yaw, pitch });
          }
          gr.lt = e.timeStamp;
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          if (pointers.current.size === 0 && zoom === 1 && !turn) setPan({ x: 0, y: 0 });
          const gr = grab.current;
          grab.current = null;
          if (!gr) return;
          const late = e.timeStamp - gr.lt > 90;
          if (gr.kind === 'roll') {
            if (!gr.on) {
              // a tap: the opening unroll jumps to its end; a carpet lying rolled lays itself out
              if (roll?.target === 'flat') setSkip((k) => k + 1);
              else if (roll) setRoll({ from: 'rolled', target: 'flat' });
              return;
            }
            const p = hand.current ?? rollAt.current, v = late ? 0 : gr.v;
            hand.current = null;
            setRoll({ from: 'rolled', target: v > 1.2 ? 'flat' : v < -1.2 ? 'rolled' : p > 0.5 ? 'flat' : 'rolled' });
            return;
          }
          if (gr.on) { if (late || gr.axis === 'y') tw.current.vy = 0; tw.current.vy = Math.max(-10, Math.min(10, tw.current.vy)); animate(false); }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId); pinch.current = null;
          if (grab.current?.kind === 'roll' && hand.current !== null) { hand.current = null; setRoll({ from: 'rolled', target: rollAt.current > 0.5 ? 'flat' : 'rolled' }); }
          grab.current = null;
        }}
        onDoubleClick={() => { if (turn) { straighten(); setZ(1); } else setZ(zoom > 1.5 ? 1 : 2.2); }}
      >
        {back && <div className="sim-label">Simulated reverse · illustration, not a photograph</div>}
        <img
          ref={imgRef}
          onLoad={measure}
          src={back ? backSrc || rugSrc(t) : rugSrc(t)}
          alt={back ? `Simulated reverse of ${t.name}` : t.name}
          draggable={false}
          style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rot}deg) scale(${zoom})`, filter: item.condition === 'Dirty' && !back ? 'sepia(0.45) brightness(0.8)' : undefined, visibility: roll || turn ? 'hidden' : undefined }}
          data-testid="inspector-img"
          data-zoom={zoom.toFixed(2)}
        />
        {roll && fit && (
          <RollingRug src={rugSrc(t)} fit={fit} from={roll.from} target={roll.target} skip={skip} hand={hand} at={rollAt}
            filter={item.condition === 'Dirty' ? 'sepia(0.45) brightness(0.8)' : undefined}
            onSettled={(at) => { if (at === 'flat') { setRoll(null); rollAt.current = 1; } }} />
        )}
        {turn && !roll && fit && (
          <ExamineRug src={back ? backSrc || rugSrc(t) : rugSrc(t)} fit={fit} yaw={turn.yaw} pitch={turn.pitch} zoom={zoom} pan={pan}
            filter={item.condition === 'Dirty' && !back ? 'sepia(0.45) brightness(0.8)' : undefined} />
        )}
        {hint && !counting && (
          <div className={`insp-hint ${roll ? 'roll' : ''}`} aria-hidden="true" data-testid="insp-hint">
            <span className="ih-track"><i className="ih-finger" /></span>
            <small>{roll ? 'Push it open with your finger' : 'Drag across to spin · up or down to tip · pinch to zoom'}</small>
          </div>
        )}
        <div className="insp-tools">
          <button onClick={() => {
            mark();
            if (roll?.target === 'rolled') { setRoll({ from: 'rolled', target: 'flat' }); return; }
            if (roll) return;
            setZoom(1); setPan({ x: 0, y: 0 }); setRot(0); setBack(false); cancelAnimationFrame(tw.current.raf); setTurn(null); measure();
            setRoll({ from: 'flat', target: 'rolled' });
          }} aria-label={roll?.target === 'rolled' ? 'Unroll it' : 'Roll it up'} data-testid="roll-toggle"><Icon name="scroll" /></button>
          {turn && <button className="on" onClick={() => { straighten(); mark(); }} aria-label="Lay it straight" data-testid="straighten"><Icon name="locate" /></button>}
          <button onClick={() => setZ(zoom + 0.5)} aria-label="Zoom in" data-testid="zoom-in"><Icon name="zoomin" /></button>
          <button onClick={() => setZ(zoom - 0.5)} aria-label="Zoom out"><Icon name="zoomout" /></button>
          <button onClick={() => { if (turn) { tw.current.yaw += Math.PI / 2; setTurn({ yaw: tw.current.yaw, pitch: tw.current.pitch }); } else setRot((r) => r + 90); mark(); }} aria-label="Rotate" data-testid="rotate"><Icon name="rotate" /></button>
          <button onClick={() => { setBack((b) => !b); mark(); }} aria-label={back ? 'Show front' : 'Show reverse'} data-testid="flip"><Icon name="flip" /></button>
        </div>
        <div className="insp-zoom">{roll ? (roll.target === 'rolled' ? 'Rolled up · push it open, or the roll button' : 'Unrolling · tap to skip, or take hold of it') : <>{back ? 'Reverse (simulated)' : 'Front'} · {zoom.toFixed(1)}×{turn ? ' · double-tap to lay it straight' : ' · drag to spin or tip, pinch to zoom'}</>}</div>
      </div>
      <div className="insp-panel">
        <div className="tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x} role="tab" aria-selected={tab === x} onClick={() => { setTab(x); mark(); }} data-testid={`tab-${x.toLowerCase()}`}>
              {x}
            </button>
          ))}
        </div>
        <div className="insp-body" data-testid="insp-body">
          {tab === 'Overview' && (
            <>
              <p style={{ margin: '0 0 6px' }}>{t.history}</p>
              <dl className="kv">
                <dt>Colours</dt><dd>{t.colourWords}</dd>
                <dt>Rarity</dt><dd>{t.rarity}</dd>
              </dl>
            </>
          )}
          {tab === 'Condition' && (
            <dl className="kv">
              <dt>Condition</dt><dd>{item.condition}{item.restored ? ' (restored)' : ''}</dd>
              <dt>Back</dt><dd>{t.backNote}</dd>
              {item.notes.map((n, i) => (<Fragment key={i}><dt>Note</dt><dd>{n}</dd></Fragment>))}
              {flaws.map((f) => (<Fragment key={f.kind}><dt>{f.know === 'proven' ? 'Known' : 'Your eye'}</dt><dd data-testid={`clue-${f.kind}`}>{f.know === 'proven' ? f.text + '.' : FLAW_CLUES[f.kind]}</dd></Fragment>))}
            </dl>
          )}
          {tab === 'Weave' && (
            <dl className="kv">
              <dt>Knot</dt><dd>{t.weave.knot}</dd>
              <dt>Density</dt><dd>{t.weave.kpsi}</dd>
              <dt>Foundation</dt><dd>{t.weave.foundation}</dd>
              <dt>Seller's view</dt><dd>{t.craftLine}</dd>
              {knots && <><dt>Your count</dt><dd data-testid="knot-line">{knotVerdict(knots, t.id, item)}</dd></>}
              {canCount && <><dt>Count it</dt><dd><button className="btn small" onClick={() => { setCounting(true); mark(); }} data-testid="knot-count-open">{!knots ? 'Count the knots on the back' : knots.day === g.day ? 'Your count today' : 'Count the knots again'}</button></dd></>}
            </dl>
          )}
          {tab === 'Fringe' && <p style={{ margin: 0 }}>{t.fringe}</p>}
          {tab === 'Provenance' && (
            <>
              <p style={{ margin: '0 0 6px' }}>
                <span className={`prov ${item.provenance}`}>{item.provenance}</span>
              </p>
              <p style={{ margin: 0 }}>
                {item.provenance === 'Documented' && 'Papers or a workshop record exist. Say so freely.'}
                {item.provenance === 'Likely' && 'Style, materials and route all agree. No papers, but no reason to doubt it.'}
                {item.provenance === 'Uncertain' && 'No papers and more than one possible origin. Claiming more than you know is a risk with sharp buyers.'}
                {item.provenance === 'Disputed' && 'Experts disagree. Expect hard questions.'}
              </p>
            </>
          )}
          {tab === 'Estimate' && (
            <dl className="kv">
              <dt>Market value</dt><dd data-testid="estimate-value">{fmt(lo)}–{fmt(hi)} {knots ? '(by your knot count)' : exact ? '' : '(rough: a ledger book or a knot count would tighten this)'}</dd>
              <dt>In this condition</dt><dd>about {fmt(pv)}</dd>
              {knots?.ok && flaws.some((f) => f.kind === 'age' && f.know === 'hint') && <><dt>As new work</dt><dd data-testid="knot-new-value">about {fmt(snap(pv * flawFactorFor(item, 'age')))}, if the knots tell the truth</dd></>}
              {flaws.some((f) => f.know === 'proven') && <><dt>Sold as what it is</dt><dd data-testid="honest-value">about {fmt(snap(pv * flaws.filter((f) => f.know === 'proven').reduce((m, f) => m * flawFactorFor(item, f.kind), 1)))}</dd></>}
              <dt>{preview ? 'Asking' : 'You paid'}</dt><dd>{fmt(item.paid)}</dd>
              <dt>Usual asking</dt><dd>{fmt(t.asking)}</dd>
            </dl>
          )}
        </div>
      </div>
      {counting && <KnotCount typeId={t.id} keyId={item.uid} where="dealer" fakeAge={item.fakeAge} onClose={() => setCounting(false)} />}
    </div>
  );
}
