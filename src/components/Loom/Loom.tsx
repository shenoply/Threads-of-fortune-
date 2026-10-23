// The weaver's workshop: draw a carpet of your own, place by place, and have it woven. The carpet
// at the top changes with every choice; each choice shows what it adds to the price. The weaver
// keeps the proportions and outlines, so whatever you choose is woven properly.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { rankOf } from '../../game/economy/progress';
import { audio } from '../../game/audio/engine';
import { costOf, daysOf, defaultName, loomsFree, newDesign, parts, valueOf, withPalette, type Design } from '../../game/loom/design';
import { renderDesign } from '../../game/loom/render';
import { BORDER, FIELD, GUARD, KNOTS, LAYOUT, MEDALLION, PALETTES, SIZES, WOOL } from '../../game/loom/patterns';
import { reveal } from '../Reveal/Reveal';
import { RUGS } from '../../data/rugs';
import './loom.css';

type Step = 'size' | 'layout' | 'colours' | 'field' | 'centre' | 'border' | 'wool';
const STEPS: [Step, string][] = [['size', 'Size'], ['layout', 'Layout'], ['colours', 'Colours'], ['field', 'Figures'], ['centre', 'Medallion'], ['border', 'Border'], ['wool', 'Wool & knot']];
const PLACES: [keyof Design & ('ground' | 'ground2' | 'main' | 'accent' | 'light' | 'border'), string][] = [['ground', 'Field'], ['main', 'Figures'], ['accent', 'Second colour'], ['border', 'Border'], ['ground2', 'Corners and stripes']];

function Option({ on, pic, name, line, delta, onPick, testid }: { on: boolean; pic?: string; name: string; line: string; delta?: number; onPick: () => void; testid: string }) {
  return (
    <button className={`lm-opt ${on ? 'on' : ''}`} onClick={onPick} aria-pressed={on} data-testid={testid}>
      {pic && <img src={pic} alt="" draggable={false} />}
      <b>{name}</b>
      <small>{line}</small>
      {delta !== undefined && delta !== 0 && <em>{delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}</em>}
    </button>
  );
}

export function Loom({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const lm = g.loom ?? { designs: [], weaving: [], next: 1 };
  const [d, setD] = useState<Design>(() => newDesign(lm.next));
  const [step, setStep] = useState<Step>('size');
  const [note, setNote] = useState('');
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const pic = useMemo(() => renderDesign(d, 4, 0.86), [d]);
  const cost = costOf(d), days = daysOf(d), [lo, hi] = valueOf(d);
  const free = loomsFree(rankOf(g).idx) - lm.weaving.length;
  const set = (patch: Partial<Design>) => { audio.sfx('tap'); setNote(''); setD((x) => ({ ...x, ...patch })); };
  const delta = (patch: Partial<Design>) => costOf({ ...d, ...patch }) - cost;
  const thumb = (patch: Partial<Design>) => renderDesign({ ...d, ...patch }, 2, 0.8);
  const p = parts(d);
  const weave = () => {
    const msg = g.commissionCarpet(d);
    setNote(msg);
    if (msg.startsWith('The weaver takes')) setD(newDesign((useGame.getState().loom?.next ?? lm.next)));
  };
  const collect = (id: string) => {
    const msg = g.collectCarpet(id);
    if (!msg) return;
    const t = RUGS[id];
    reveal({ kicker: 'Off the loom', title: t.name, line: `${t.size} · your own design`, pic: renderDesign(t.art.kind === 'design' ? t.art.design : d, 5), picKind: 'rug', instant: true });
    setNote(msg);
  };

  return createPortal(
    <div className="overlay loom-screen" data-testid="loom" onClick={(e) => e.stopPropagation()}>
      <div className="overlay-head">
        <h2>The weaver</h2>
        <span className="sub">{fmt(g.cash)}</span>
        <button className="btn close" onClick={onClose} data-testid="loom-close">Done</button>
      </div>
      <div className="lm-body">
        {lm.weaving.length > 0 && (
          <section className="lm-onloom" data-testid="loom-weaving">
            {lm.weaving.map((w) => {
              const des = lm.designs.find((x) => x.id === w.id);
              if (!des) return null;
              const ready = g.day >= w.ready;
              return (
                <div key={w.id} className="lm-wip">
                  <img src={renderDesign(des, 1, 0.8)} alt="" className={ready ? '' : 'wip'} />
                  <span><b>{des.name}</b><small>{ready ? 'Off the loom' : `On the loom · ready day ${w.ready}`}</small></span>
                  {ready && <button className="btn primary small" onClick={() => collect(w.id)} data-testid={`loom-collect-${w.id}`}>Collect</button>}
                </div>
              );
            })}
          </section>
        )}
        <div className="lm-preview"><img src={pic} alt={`Your design: ${d.name || defaultName(d)}`} data-testid="loom-preview" /></div>
        <div className="lm-sum">
          <input value={d.name} maxLength={40} placeholder={defaultName(d)} onChange={(e) => setD({ ...d, name: e.target.value })} aria-label="Name of the carpet" data-testid="loom-name" />
          <span><b>{fmt(cost)}</b> · {days} day{days === 1 ? '' : 's'} on the loom · sells for about {fmt(lo)}–{fmt(hi)}</span>
        </div>
        <div className="lm-steps" role="tablist">
          {STEPS.filter(([s]) => s !== 'centre' || d.layout === 'medallion').map(([s, label]) => (
            <button key={s} role="tab" aria-selected={step === s} className={step === s ? 'on' : ''} onClick={() => { audio.sfx('tap'); setStep(s); }} data-testid={`loom-step-${s}`}>{label}</button>
          ))}
        </div>
        <div className="lm-opts">
          {step === 'size' && SIZES.map((x) => <Option key={x.id} on={d.size === x.id} name={x.name} line={x.cm} delta={delta({ size: x.id })} onPick={() => set({ size: x.id })} testid={`loom-size-${x.id}`} />)}
          {step === 'layout' && LAYOUT.map((x) => <Option key={x.id} on={d.layout === x.id} pic={thumb({ layout: x.id })} name={x.name} line={x.line} delta={delta({ layout: x.id })} onPick={() => set({ layout: x.id })} testid={`loom-layout-${x.id}`} />)}
          {step === 'field' && FIELD.map((x) => <Option key={x.id} on={d.field === x.id} pic={thumb({ field: x.id, layout: d.layout === 'medallion' ? 'allover' : d.layout })} name={x.name} line={x.line} delta={delta({ field: x.id })} onPick={() => set({ field: x.id })} testid={`loom-field-${x.id}`} />)}
          {step === 'centre' && MEDALLION.filter((x) => x.id !== 'none').map((x) => <Option key={x.id} on={d.medallion === x.id} pic={thumb({ medallion: x.id })} name={x.name} line={x.line} delta={delta({ medallion: x.id })} onPick={() => set({ medallion: x.id })} testid={`loom-med-${x.id}`} />)}
          {step === 'border' && (<>
            {BORDER.map((x) => <Option key={x.id} on={d.band === x.id} pic={thumb({ band: x.id })} name={x.name} line={x.line} delta={delta({ band: x.id })} onPick={() => set({ band: x.id })} testid={`loom-band-${x.id}`} />)}
            <h4 className="lm-sub">Guard stripes</h4>
            {GUARD.map((x) => <Option key={x.id} on={d.guard === x.id} name={x.name} line={x.line} delta={delta({ guard: x.id })} onPick={() => set({ guard: x.id })} testid={`loom-guard-${x.id}`} />)}
          </>)}
          {step === 'wool' && (<>
            {KNOTS.map((x) => <Option key={x.id} on={d.knots === x.id} name={x.name} line={x.line} delta={delta({ knots: x.id })} onPick={() => set({ knots: x.id })} testid={`loom-knots-${x.id}`} />)}
            <h4 className="lm-sub">Wool</h4>
            {WOOL.map((x) => <Option key={x.id} on={d.wool === x.id} name={x.name} line={x.line} delta={delta({ wool: x.id })} onPick={() => set({ wool: x.id })} testid={`loom-wool-${x.id}`} />)}
          </>)}
          {step === 'colours' && (<>
            {PALETTES.map((x) => (
              <button key={x.id} className={`lm-opt lm-pal ${d.palette === x.id ? 'on' : ''}`} onClick={() => { audio.sfx('tap'); setD((y) => withPalette(y, x.id)); }} aria-pressed={d.palette === x.id} data-testid={`loom-pal-${x.id}`}>
                <span className="lm-dyes">{x.dyes.map((y) => <i key={y.name} style={{ background: y.hex }} title={y.name} />)}</span>
                <b>{x.name}</b><small>{x.line}</small>
                {delta(withPalette(d, x.id)) !== 0 && <em>{delta(withPalette(d, x.id)) > 0 ? '+' : '−'}{fmt(Math.abs(delta(withPalette(d, x.id))))}</em>}
              </button>
            ))}
            <h4 className="lm-sub">Each place, in the {p.palette.name} dyes</h4>
            {PLACES.map(([k, label]) => (
              <div key={k} className="lm-place" data-testid={`loom-place-${k}`}>
                <span>{label}</span>
                <span className="lm-swatches">
                  {p.palette.dyes.map((y, i) => (
                    <button key={y.name} className={d[k] === i ? 'on' : ''} style={{ background: y.hex }} onClick={() => set({ [k]: i } as Partial<Design>)} aria-label={`${label}: ${y.name}`} aria-pressed={d[k] === i} title={y.name} data-testid={`loom-dye-${k}-${i}`}>{y.dear ? '·' : ''}</button>
                  ))}
                </span>
              </div>
            ))}
            <p className="lm-note">A dot marks a costly dye: indigo, cochineal and saffron. The weaver lifts any figure that would vanish into its ground.</p>
          </>)}
        </div>
      </div>
      <div className="lm-foot">
        {note && <p className="lm-msg" data-testid="loom-note">{note}</p>}
        <button className="btn primary" disabled={free <= 0 || g.cash < cost} onClick={weave} data-testid="loom-weave">
          {free <= 0 ? 'No loom free' : g.cash < cost ? `You need ${fmt(cost)}` : `Weave it · ${fmt(cost)}`}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** the way in, from the stockroom */
export function LoomButton() {
  const [open, setOpen] = useState(false);
  const g = useGame();
  const ready = (g.loom?.weaving ?? []).some((w) => g.day >= w.ready);
  return (
    <>
      <button className={`btn ${ready ? 'primary' : ''}`} onClick={() => { audio.sfx('tap'); setOpen(true); }} data-testid="stock-loom">{ready ? 'The weaver · ready' : 'Design a carpet'}</button>
      {open && <Loom onClose={() => setOpen(false)} />}
    </>
  );
}
