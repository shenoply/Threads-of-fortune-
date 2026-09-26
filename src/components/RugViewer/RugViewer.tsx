import { hasPerk } from '../../data/character';
import { Fragment, useEffect, useRef, useState } from 'react';
import { fmt, snap, snapDown } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { RUGS } from '../../data/rugs';
import type { RugItem } from '../../game/types';
import { rugSrc, simulatedBack } from './rugArt';
import { Icon } from '../Icon';
import { perceivedValue } from '../../game/systems/negotiation';

const TABS = ['Overview', 'Condition', 'Weave', 'Fringe', 'Provenance', 'Estimate'] as const;

export interface RugPreview { typeId: string; condition: RugItem['condition']; provenance?: RugItem['provenance']; price?: number }
/** Inspect a rug you own (uid) or one you are thinking of buying (preview). */
export function RugViewer({ uid, preview, onClose }: { uid?: string; preview?: RugPreview; onClose: () => void }) {
  const g = useGame();
  const item: RugItem | undefined = preview
    ? { uid: 'preview', typeId: preview.typeId, condition: preview.condition, provenance: preview.provenance ?? RUGS[preview.typeId].provenance, paid: preview.price ?? 0, notes: [], restored: false, stored: false } as RugItem
    : g.inventory.find((i) => i.uid === uid);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rot, setRot] = useState(0);
  const [back, setBack] = useState(false);
  const [backSrc, setBackSrc] = useState('');
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const tut = !g.tutorial.done && !!g.encounter?.tutorial;
  const used = g.tutorial.inspected;

  const t = item ? RUGS[item.typeId] : null;
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
  const exact = g.upgrades.includes('ledgerbook') || hasPerk(g.skills?.appraisal, 'appraisal', 5);
  const lo = exact ? t.valueBand[0] : snapDown(t.valueBand[0] * 0.85);
  const hi = exact ? t.valueBand[1] : snap(t.valueBand[1] * 1.15);
  const pv = snap(perceivedValue(t, item));

  return (
    <div className="overlay" role="dialog" aria-label={`Inspecting ${t.name}`} data-testid="inspector">
      <div className="overlay-head">
        <div>
          <h2>{t.name}</h2>
          <div className="sub">
            {t.origin} · {t.material} · {t.age} · {t.size}
          </div>
        </div>
        <button className="btn close" onClick={onClose} disabled={tut && g.tutorial.step === 'inspect2' && !used} data-testid="inspector-close">
          {tut && g.tutorial.step === 'inspect2' && !used ? 'Look closer first' : 'Done'}
        </button>
      </div>
      <div
        className="inspector-stage"
        onWheel={(e) => setZ(zoom * (e.deltaY < 0 ? 1.15 : 0.87))}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
            drag.current = null;
          } else drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            setZ(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
          } else if (drag.current && zoom > 1) {
            setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
            mark();
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          drag.current = null;
        }}
        onDoubleClick={() => setZ(zoom > 1.5 ? 1 : 2.2)}
      >
        {back && <div className="sim-label">Simulated reverse · illustration, not a photograph</div>}
        <img
          src={back ? backSrc || rugSrc(t) : rugSrc(t)}
          alt={back ? `Simulated reverse of ${t.name}` : t.name}
          draggable={false}
          style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rot}deg) scale(${zoom})`, filter: item.condition === 'Dirty' && !back ? 'sepia(0.45) brightness(0.8)' : undefined }}
          data-testid="inspector-img"
          data-zoom={zoom.toFixed(2)}
        />
        <div className="insp-tools">
          <button onClick={() => setZ(zoom + 0.5)} aria-label="Zoom in" data-testid="zoom-in"><Icon name="zoomin" /></button>
          <button onClick={() => setZ(zoom - 0.5)} aria-label="Zoom out"><Icon name="zoomout" /></button>
          <button onClick={() => { setRot((r) => r + 90); mark(); }} aria-label="Rotate" data-testid="rotate"><Icon name="rotate" /></button>
          <button onClick={() => { setBack((b) => !b); mark(); }} aria-label={back ? 'Show front' : 'Show reverse'} data-testid="flip"><Icon name="flip" /></button>
        </div>
        <div className="insp-zoom">{back ? 'Reverse (simulated)' : 'Front'} · {zoom.toFixed(1)}×{zoom === 1 ? ' · pinch or tap + to zoom' : ' · drag to pan'}</div>
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
            </dl>
          )}
          {tab === 'Weave' && (
            <dl className="kv">
              <dt>Knot</dt><dd>{t.weave.knot}</dd>
              <dt>Density</dt><dd>{t.weave.kpsi}</dd>
              <dt>Foundation</dt><dd>{t.weave.foundation}</dd>
              <dt>Seller's view</dt><dd>{t.craftLine}</dd>
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
              <dt>Market value</dt><dd>{fmt(lo)}–{fmt(hi)} {exact ? '' : '(rough: a ledger book would tighten this)'}</dd>
              <dt>In this condition</dt><dd>about {fmt(pv)}</dd>
              <dt>{preview ? 'Asking' : 'You paid'}</dt><dd>{fmt(item.paid)}</dd>
              <dt>Usual asking</dt><dd>{fmt(t.asking)}</dd>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
