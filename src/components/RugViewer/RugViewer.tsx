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
import { CarpetView } from './CarpetView';

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
  const [back, setBack] = useState(false);
  const [backSrc, setBackSrc] = useState('');
  const [counting, setCounting] = useState(false);
  const [hint] = useState(() => { try { const n = +(localStorage.getItem('tof-insp-hint') ?? 0); localStorage.setItem('tof-insp-hint', String(n + 1)); return n < 4; } catch { return false; } });
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
      <div className="inspector-stage cv-host">
        <CarpetView key={back ? 'back' : 'front'} src={back ? backSrc || rugSrc(t) : rugSrc(t)} unroll={mayRoll() && !back}
          filter={item.condition === 'Dirty' && !back ? 'sepia(0.45) brightness(0.8)' : undefined}
          onUse={mark} hint={hint}
          label={back ? <div className="sim-label">Simulated reverse · illustration, not a photograph</div> : undefined}
          tools={<button onClick={() => { setBack((b) => !b); mark(); }} aria-label={back ? 'Show front' : 'Show reverse'} data-testid="flip"><Icon name="flip" /></button>} />
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
