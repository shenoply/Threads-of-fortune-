// The weaver's workshop: draw a carpet of your own, place by place, and have it woven. Everything
// fits one phone screen: the carpet at the top (tap it to look closely), its name and price, the
// steps, one row of choices and the button. Each choice shows what it adds to the price. The weaver
// keeps the proportions and outlines, so whatever you choose is woven properly.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tip } from '../Tips/Tip';
import { CarpetView } from '../RugViewer/CarpetView';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { rankOf } from '../../game/economy/progress';
import { dateFor } from '../../game/economy/economy';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { weaveryLine } from '../../data/weaveryLines';
import { daysFor, defaultName, loomsFree, needsWorkshop, newDesign, parts, priceOf, valueOf, withPalette, WORKSHOP_LINE, WORKSHOP_PRICE, type Design } from '../../game/loom/design';
import { renderDesign } from '../../game/loom/render';
import { BORDER, FIELD, GUARD, KNOTS, LAYOUT, MEDALLION, PALETTES, SIZES, WOOL } from '../../game/loom/patterns';
import { reveal } from '../Reveal/Reveal';
import { Icon } from '../Icon';
import { RUGS } from '../../data/rugs';
import { isOpen, UNLOCKS } from '../../game/unlocks';
import './loom.css';

type Step = 'size' | 'layout' | 'colours' | 'field' | 'centre' | 'border' | 'wool';
const STEPS: [Step, string][] = [['size', 'Size'], ['layout', 'Layout'], ['colours', 'Colours'], ['field', 'Figures'], ['centre', 'Medallion'], ['border', 'Border'], ['wool', 'Wool']];
type Place = 'ground' | 'main' | 'accent' | 'border' | 'ground2';
const PLACES: [Place, string][] = [['ground', 'Field'], ['main', 'Figures'], ['accent', 'Second'], ['border', 'Border'], ['ground2', 'Corners']];

function Option({ on, pic, name, line, delta, onPick, testid, dyes, lock }: { on: boolean; pic?: string; name: string; line?: string; delta?: number; onPick: () => void; testid: string; dyes?: string[]; lock?: boolean }) {
  return (
    <button className={`lm-opt ${on ? 'on' : ''} ${pic ? 'pic' : ''}`} onClick={onPick} aria-pressed={on} data-testid={testid}>
      {pic && <img src={pic} alt="" draggable={false} />}
      {dyes && <span className="lm-dyes">{dyes.map((h) => <i key={h} style={{ background: h }} />)}</span>}
      <b>{lock && <Icon name="lock" className="lm-lock" />}{name}</b>
      {line && <small>{lock ? 'Needs your own loom house. ' : ''}{line}</small>}
      {delta !== undefined && delta !== 0 && <em>{delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))}</em>}
    </button>
  );
}

/** the size of a box on screen, kept up to date */
function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** a long carpet stood on end when the screen is tall, so it is shown as large as it can be */
function FitRug({ src, alt, aspect = 1.6, upright }: { src: string; alt: string; aspect?: number; upright?: boolean }) {
  const [ref, { w, h }] = useBox();
  const flatW = Math.min(w, h * aspect), upW = Math.min(h, w * aspect);
  const up = upright === undefined ? upW > flatW * 1.12 : upright;
  const iw = Math.max(1, Math.floor(up ? upW : flatW));
  return (
    <div className="lm-fit" ref={ref}>
      {w > 0 && <img src={src} alt={alt} data-testid="loom-preview" draggable={false} style={{ width: iw, height: iw / aspect, transform: up ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)' }} />}
    </div>
  );
}

const turned = new Map<string, string>();
/** the picture turned a quarter round, for looking closely on a tall screen */
function useTurned(src: string, on: boolean) {
  const [out, setOut] = useState(on ? turned.get(src) ?? '' : src);
  useEffect(() => {
    if (!on) { setOut(src); return; }
    const hit = turned.get(src);
    if (hit) { setOut(hit); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.height; c.height = img.width;
      const g = c.getContext('2d')!;
      g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(img, 0, 0);
      const u = c.toDataURL('image/jpeg', 0.9);
      turned.set(src, u); setOut(u);
    };
    img.src = src;
  }, [src, on]);
  return out;
}

/** the carpet full screen, in your hands like any carpet in the game: spin, tip, zoom and roll it */
function Zoom({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div className="lm-zoom" data-testid="loom-zoom">
      <CarpetView src={src} unroll />
      <div className="lm-zoom-bar">
        <span>{name}</span>
        <button className="btn primary" onClick={onClose} data-testid="loom-zoom-close">Close</button>
      </div>
    </div>
  );
}

export function Loom({ onClose }: { onClose: () => void }) {
  const g = useGame();
  // the loom house: beaters and shuttles in the next room, quietly, while you draw
  useEffect(() => {
    if (navigator.webdriver) return;
    const a = audio.attach(new Audio('audio/moments/loom-house-bed.mp3'), 'sfx', 0.35);
    a.loop = true;
    a.play().catch(() => {});
    return () => { a.pause(); audio.detach(a); };
  }, []);
  const lm = g.loom ?? { designs: [], weaving: [], next: 1 };
  const [d, setD] = useState<Design>(() => newDesign(lm.next));
  const [step, setStep] = useState<Step>('size');
  const [place, setPlace] = useState<Place>('ground');
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (zoom) setZoom(null); else onClose(); } };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose, zoom]);
  useEffect(() => { strip.current?.scrollTo({ left: 0 }); }, [step]);
  const pic = useMemo(() => renderDesign(d, 820, 0.88), [d]);
  const owned = !!lm.owned;
  const cost = priceOf(d, owned), days = daysFor(d, owned), [lo, hi] = valueOf(d);
  const free = loomsFree(rankOf(g).idx, owned) - lm.weaving.length;
  const locked = needsWorkshop(d) && !owned;
  const set = (patch: Partial<Design>) => { audio.sfx('tap'); setNote(''); setD((x) => ({ ...x, ...patch })); };
  const delta = (patch: Partial<Design>) => priceOf({ ...d, ...patch }, owned) - cost;
  const thumb = (patch: Partial<Design>) => renderDesign({ ...d, ...patch }, 300, 0.8);
  const p = parts(d);
  const name = d.name.trim() || defaultName(d);
  const weave = () => {
    const msg = g.commissionCarpet(d);
    // in your own voice, when you have recorded it; the words show either way
    if (msg.startsWith('The weaver takes')) { const w = weaveryLine('commission'); void voice.say('seller', w); setNote(`“${w}” ${msg}`); } else setNote(msg);
    if (msg.startsWith('The weaver takes')) setD(newDesign(useGame.getState().loom?.next ?? lm.next));
  };
  const collect = (id: string) => {
    const msg = g.collectCarpet(id);
    if (!msg) return;
    const t = RUGS[id];
    reveal({ kicker: 'Off the loom', title: t.name, line: `${t.size} · your own design`, pic: renderDesign(t.art.kind === 'design' ? t.art.design : d, 820), picKind: 'rug', instant: true });
    const w = weaveryLine('collect'); void voice.say('seller', w);
    setNote(`“${w}” ${msg}`);
  };
  const rename = (id: string, old: string) => {
    const n = window.prompt('A name for this carpet', old);
    if (n && n.trim()) { g.renameCarpet(id, n); audio.sfx('pen'); }
  };

  return createPortal(
    <div className="overlay loom-screen" data-testid="loom" onClick={(e) => e.stopPropagation()}
      style={{ backgroundImage: 'linear-gradient(180deg, rgba(15,10,6,.5), rgba(15,10,6,.9) 34%, #0f0a06 62%), url(art/loom/workshop-768.webp), radial-gradient(ellipse 120% 60% at 50% 22%, #2e1f12, #0f0a06 70%)', backgroundSize: 'auto, 100% auto, auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'top center' }}>
      <Tip id="weaving" card />
      <div className="lm-head">
        <img className="lm-weaver" src="art/portraits/small/weaver-kerdasa.webp" alt="" />
        <h2>{owned ? 'Your loom house' : 'The weavers of Kerdasa'}<small>Sitt Zeinab, master weaver</small></h2>
        <span className="lm-cash">{fmt(g.cash)}</span>
        <button className="btn close" onClick={onClose} data-testid="loom-close">Done</button>
      </div>

      {lm.weaving.length > 0 && (
        <div className="lm-onloom" data-testid="loom-weaving">
          {lm.weaving.map((w) => {
            const des = lm.designs.find((x) => x.id === w.id);
            if (!des) return null;
            const ready = g.day >= w.ready;
            return (
              <div key={w.id} className="lm-wip">
                <OnLoom src={renderDesign(des, 420, 0.85)} done={ready ? 1 : Math.max(0.05, Math.min(0.97, 1 - (w.ready - g.day) / Math.max(1, daysFor(des, owned))))} onClick={() => setZoom({ src: renderDesign(des, 1640, 0.9), name: des.name })} />
                <button className="lm-wip-name" onClick={() => rename(des.id, des.name)} data-testid={`loom-rename-${des.id}`}><b>{des.name} ✎</b><small>{ready ? 'Off the loom' : `On the loom · ready ${dateFor(w.ready).short}, ${w.ready - g.day === 1 ? 'tomorrow' : `in ${w.ready - g.day} days`}`}</small></button>
                {ready && <button className="btn primary small" onClick={() => collect(w.id)} data-testid={`loom-collect-${w.id}`}>Collect</button>}
              </div>
            );
          })}
        </div>
      )}

      <button className="lm-preview" onClick={() => setZoom({ src: renderDesign(d, 1640, 0.9), name })} aria-label="Look closely at the carpet" data-testid="loom-preview-btn">
        <FitRug src={pic} alt={`Your design: ${name}`} aspect={p.size.cols / p.size.rows * 1.07} upright={d.orient === 'up'} />
        <span className="lm-zoomhint" aria-hidden="true">⤢</span>
      </button>
      <div className="lm-orient" role="radiogroup" aria-label="How the carpet lies">
        {(['side', 'up'] as const).map((o) => (
          <button key={o} role="radio" aria-checked={(d.orient ?? 'side') === o} className={(d.orient ?? 'side') === o ? 'on' : ''} onClick={() => set({ orient: o })} data-testid={`loom-orient-${o}`}>{o === 'side' ? 'Sideways' : 'Upright'}</button>
        ))}
      </div>

      <div className="lm-sum">
        <label className="lm-name">
          <span aria-hidden="true">✎</span>
          <input value={d.name} maxLength={40} placeholder={defaultName(d)} onChange={(e) => setD({ ...d, name: e.target.value })} aria-label="Name your carpet" data-testid="loom-name" />
        </label>
        <span className="lm-price"><b>{fmt(cost)}</b> · {days} day{days === 1 ? '' : 's'} · sells {fmt(lo)}–{fmt(hi)}</span>
      </div>

      <div className="lm-steps" role="tablist">
        {STEPS.filter(([s]) => s !== 'centre' || d.layout === 'medallion').map(([s, label]) => (
          <button key={s} role="tab" aria-selected={step === s} className={step === s ? 'on' : ''} onClick={() => { audio.sfx('tap'); setStep(s); }} data-testid={`loom-step-${s}`}>{label}</button>
        ))}
      </div>

      <div className="lm-choices">
        {step === 'colours' && (<>
          <div className="lm-places">
            {PLACES.map(([k, label]) => (
              <button key={k} className={place === k ? 'on' : ''} onClick={() => { audio.sfx('tap'); setPlace(k); }} data-testid={`loom-place-${k}`}>
                <i style={{ background: p.palette.dyes[d[k]]?.hex }} />{label}
              </button>
            ))}
          </div>
          <div className="lm-swatches" data-testid={`loom-swatches-${place}`}>
            {p.palette.dyes.map((y, i) => (
              <button key={y.name} className={`skein ${d[place] === i ? 'on' : ''}`} style={{ ['--dye' as string]: y.hex }} onClick={() => set({ [place]: i } as Partial<Design>)} aria-label={`${place}: ${y.name}`} aria-pressed={d[place] === i} title={y.name} data-testid={`loom-dye-${place}-${i}`}><i aria-hidden="true" />{y.dear ? <em>·</em> : null}</button>
            ))}
          </div>
        </>)}
        <div className="lm-strip" ref={strip}>
          {step === 'size' && SIZES.map((x) => <Option key={x.id} on={d.size === x.id} pic={thumb({ size: x.id })} name={x.name} line={x.cm} delta={delta({ size: x.id })} onPick={() => set({ size: x.id })} testid={`loom-size-${x.id}`} />)}
          {step === 'layout' && LAYOUT.map((x) => <Option key={x.id} on={d.layout === x.id} pic={thumb({ layout: x.id })} name={x.name} delta={delta({ layout: x.id })} onPick={() => set({ layout: x.id })} testid={`loom-layout-${x.id}`} />)}
          {step === 'field' && FIELD.map((x) => <Option key={x.id} on={d.field === x.id} pic={thumb({ field: x.id, layout: d.layout === 'medallion' ? 'allover' : d.layout })} name={x.name} delta={delta({ field: x.id })} onPick={() => set({ field: x.id })} testid={`loom-field-${x.id}`} />)}
          {step === 'centre' && MEDALLION.filter((x) => x.id !== 'none').map((x) => <Option key={x.id} on={d.medallion === x.id} pic={thumb({ medallion: x.id })} name={x.name} delta={delta({ medallion: x.id })} onPick={() => set({ medallion: x.id })} testid={`loom-med-${x.id}`} />)}
          {step === 'border' && BORDER.map((x) => <Option key={x.id} on={d.band === x.id} pic={thumb({ band: x.id })} name={x.name} delta={delta({ band: x.id })} onPick={() => set({ band: x.id })} testid={`loom-band-${x.id}`} />)}
          {step === 'border' && GUARD.map((x) => <Option key={x.id} on={d.guard === x.id} pic={thumb({ guard: x.id })} name={`${x.name} stripe`} delta={delta({ guard: x.id })} onPick={() => set({ guard: x.id })} testid={`loom-guard-${x.id}`} />)}
          {step === 'wool' && !owned && (
            <button className="lm-opt lm-house" onClick={() => { const msg = g.buyWorkshop(); setNote(msg || WORKSHOP_LINE); }} disabled={g.cash < WORKSHOP_PRICE} data-testid="loom-buy-house">
              <b>A loom house of your own</b>
              <small>A fifth cheaper, a quarter sooner, a second loom, the city knot and silk.</small>
              <em>{g.cash < WORKSHOP_PRICE ? `${fmt(WORKSHOP_PRICE)} · you have ${fmt(g.cash)}` : `Buy it · ${fmt(WORKSHOP_PRICE)}`}</em>
            </button>
          )}
          {step === 'wool' && KNOTS.map((x) => <Option key={x.id} on={d.knots === x.id} name={x.name} lock={needsWorkshop({ knots: x.id, wool: 'village' }) && !owned} line={x.line} delta={delta({ knots: x.id })} onPick={() => set({ knots: x.id })} testid={`loom-knots-${x.id}`} />)}
          {step === 'wool' && WOOL.map((x) => <Option key={x.id} on={d.wool === x.id} name={x.name} lock={needsWorkshop({ knots: 'coarse', wool: x.id }) && !owned} line={x.line} delta={delta({ wool: x.id })} onPick={() => set({ wool: x.id })} testid={`loom-wool-${x.id}`} />)}
          {step === 'colours' && PALETTES.map((x) => <Option key={x.id} on={d.palette === x.id} dyes={x.dyes.map((y) => y.hex)} name={x.name} delta={delta(withPalette(d, x.id))} onPick={() => { audio.sfx('tap'); setD((y) => withPalette(y, x.id)); }} testid={`loom-pal-${x.id}`} />)}
        </div>
      </div>

      <div className="lm-foot">
        {note && <p className="lm-msg" data-testid="loom-note">{note}</p>}
        <button className="btn primary" disabled={free <= 0 || g.cash < cost || locked} onClick={weave} data-testid="loom-weave">
          {locked ? 'The city knot and silk need your own loom house' : free <= 0 ? `Every loom is busy${lm.weaving.length ? ` · free in ${Math.max(1, Math.min(...lm.weaving.map((x) => x.ready)) - g.day)} days` : ''}` : g.cash < cost ? `You need ${fmt(cost)}` : `Weave it · ${fmt(cost)}`}
        </button>
      </div>
      {zoom && <Zoom src={zoom.src} name={zoom.name} onClose={() => setZoom(null)} />}
    </div>,
    document.body,
  );
}

/** the way in, from the stockroom */
export function LoomButton() {
  const [open, setOpen] = useState(false);
  const g = useGame();
  const ready = (g.loom?.weaving ?? []).some((w) => g.day >= w.ready);
  // the weavers of Kerdasa come into the game at their moment (game/unlocks.ts): until then, say when
  if (!isOpen(g, 'looms')) return <p className="stock-later" data-testid="stock-loom-later"><b>Design a carpet</b> {UNLOCKS.looms.later}</p>;
  return (
    <>
      <button className={`btn ${ready ? 'primary' : ''}`} onClick={() => { audio.sfx('tap'); setOpen(true); }} data-testid="stock-loom">{ready ? 'The weaver · ready' : 'Design a carpet'}</button>
      {open && <Loom onClose={() => setOpen(false)} />}
    </>
  );
}

/** The carpet on the loom: the frame (art/loom/loom-frame.webp) with the carpet woven up from the
 *  bottom as far as the days have gone, plain cotton warps above it. The drawing area in the frame is
 *  760 by 520 at 220, 150 of 1200 by 900. */
function OnLoom({ src, done, onClick }: { src: string; done: number; onClick: () => void }) {
  return (
    <button className="lm-frame" onClick={onClick} aria-label={done >= 1 ? 'The carpet, off the loom' : `On the loom, ${Math.round(done * 100)}% woven`}>
      <span className="lm-warp" />
      <img className="lm-woven" src={src} alt="" style={{ clipPath: `inset(${((1 - done) * 100).toFixed(1)}% 0 0 0)` }} />
      {done < 1 && <i className="lm-beater" style={{ top: `${(16.67 + (1 - done) * 57.78).toFixed(2)}%` }} />}
      <img className="lm-frame-art" src="art/loom/loom-frame.webp" alt="" draggable={false} />
    </button>
  );
}
