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
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // turning it over by hand: a drag across spins it round, a drag up or down tips it; let go and it
  // carries on a little with the flick, then comes back to lie straight as it was
  const [turn, setTurn] = useState<{ yaw: number; pitch: number } | null>(null);
  const tw = useRef<{ yaw: number; pitch: number; vy: number; vp: number; t: number; raf: number; grab?: { x: number; y: number; yaw: number; pitch: number; lx: number; ly: number; lt: number; on: boolean } }>({ yaw: 0, pitch: 0, vy: 0, vp: 0, t: 0, raf: 0 });
  useEffect(() => () => cancelAnimationFrame(tw.current.raf), []);
  const home = () => {
    const w = tw.current, base = (rot * Math.PI) / 180;
    cancelAnimationFrame(w.raf);
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (Math.abs(w.vy) > 0.6) { w.yaw += w.vy * dt; w.vy *= Math.exp(-2.6 * dt); w.pitch += (0 - w.pitch) * (1 - Math.exp(-3 * dt)); }
      else {
        const goal = base + Math.round((w.yaw - base) / (2 * Math.PI)) * 2 * Math.PI;
        // a weighty spring back: it comes round and settles, no bounce
        w.vy += ((goal - w.yaw) * 30 - w.vy * 10) * dt; w.yaw += w.vy * dt;
        w.vp += ((0 - w.pitch) * 30 - w.vp * 10) * dt; w.pitch += w.vp * dt;
        if (Math.abs(goal - w.yaw) < 0.002 && Math.abs(w.pitch) < 0.002 && Math.abs(w.vy) < 0.02) { w.vy = w.vp = 0; setTurn(null); return; }
      }
      setTurn({ yaw: w.yaw, pitch: w.pitch });
      w.raf = requestAnimationFrame(step);
    };
    w.raf = requestAnimationFrame(step);
  };
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
          if (roll && roll.target === 'flat') { setSkip((k) => k + 1); return; }
          if (roll) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
            drag.current = null;
            if (tw.current.grab) { tw.current.grab = undefined; if (turn) home(); }
          } else {
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            if (zoom === 1) {
              const w = tw.current; cancelAnimationFrame(w.raf);
              if (!turn) { w.yaw = (rot * Math.PI) / 180; w.pitch = 0; }
              w.vy = w.vp = 0;
              w.grab = { x: e.clientX, y: e.clientY, yaw: w.yaw, pitch: w.pitch, lx: e.clientX, ly: e.clientY, lt: e.timeStamp, on: !!turn };
            }
          }
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            setZ(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
          } else if (tw.current.grab && zoom === 1) {
            const w = tw.current, gr = w.grab!;
            const dx = e.clientX - gr.x, dy = e.clientY - gr.y;
            if (!gr.on && Math.hypot(dx, dy) < 7) return;
            if (!gr.on) { gr.on = true; measure(); mark(); }
            const dt = Math.max(1, e.timeStamp - gr.lt) / 1000;
            const yaw = gr.yaw + dx * 0.011, pitch = Math.max(-1.05, Math.min(1.05, gr.pitch + dy * 0.008));
            w.vy = 0.6 * w.vy + 0.4 * ((yaw - w.yaw) / dt); w.vp = 0;
            w.yaw = yaw; w.pitch = pitch; gr.lx = e.clientX; gr.ly = e.clientY; gr.lt = e.timeStamp;
            setTurn({ yaw, pitch });
          } else if (drag.current && zoom > 1) {
            setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
            mark();
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          drag.current = null;
          const gr = tw.current.grab;
          tw.current.grab = undefined;
          if (gr?.on) { if (e.timeStamp - gr.lt > 90) tw.current.vy = 0; tw.current.vy = Math.max(-14, Math.min(14, tw.current.vy)); home(); }
        }}
        onPointerCancel={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; drag.current = null; if (tw.current.grab?.on) home(); tw.current.grab = undefined; }}
        onDoubleClick={() => setZ(zoom > 1.5 ? 1 : 2.2)}
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
          <RollingRug src={rugSrc(t)} fit={fit} from={roll.from} target={roll.target} skip={skip}
            filter={item.condition === 'Dirty' ? 'sepia(0.45) brightness(0.8)' : undefined}
            onSettled={(at) => { if (at === 'flat') setRoll(null); }} />
        )}
        {turn && !roll && fit && (
          <ExamineRug src={back ? backSrc || rugSrc(t) : rugSrc(t)} fit={fit} yaw={turn.yaw} pitch={turn.pitch}
            filter={item.condition === 'Dirty' && !back ? 'sepia(0.45) brightness(0.8)' : undefined} />
        )}
        <div className="insp-tools">
          <button onClick={() => {
            mark();
            if (roll?.target === 'rolled') { setRoll({ from: 'rolled', target: 'flat' }); return; }
            if (roll) return;
            setZoom(1); setPan({ x: 0, y: 0 }); setRot(0); setBack(false); measure();
            setRoll({ from: 'flat', target: 'rolled' });
          }} aria-label={roll?.target === 'rolled' ? 'Unroll it' : 'Roll it up'} data-testid="roll-toggle"><Icon name="scroll" /></button>
          <button onClick={() => setZ(zoom + 0.5)} aria-label="Zoom in" data-testid="zoom-in"><Icon name="zoomin" /></button>
          <button onClick={() => setZ(zoom - 0.5)} aria-label="Zoom out"><Icon name="zoomout" /></button>
          <button onClick={() => { setRot((r) => r + 90); mark(); }} aria-label="Rotate" data-testid="rotate"><Icon name="rotate" /></button>
          <button onClick={() => { setBack((b) => !b); mark(); }} aria-label={back ? 'Show front' : 'Show reverse'} data-testid="flip"><Icon name="flip" /></button>
        </div>
        <div className="insp-zoom">{roll ? (roll.target === 'rolled' ? 'Rolled up · the roll button lays it out again' : 'Unrolling · tap to skip') : <>{back ? 'Reverse (simulated)' : 'Front'} · {zoom.toFixed(1)}×{zoom === 1 ? ' · drag to turn it, pinch to zoom' : ' · drag to pan'}</>}</div>
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
