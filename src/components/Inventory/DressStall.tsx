// Dress your stall: the stall painting, large, with each spot marked. Tap a spot to see what can stand
// there; tap a piece to see it in place at once (pale until it is bought); buy it, or put out one you
// already have, or put the spot's piece away. Nothing changes on the stall except what is done here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmt } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { DRESSING_BY_ID, dressingArt, dressingFx, type DressingPiece } from '../../data/shops';
import { SPOTS, SPOT_BY_ID, piecesFor, spotsOf, ownsPiece, placedPieces, type Spot } from '../../game/stallDressing';
import { StallSky } from '../Atmosphere/StallSky';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';

const STAGE_IMG = 'art/stall2/stall-empty-patched.webp';
const GRAMO = 'art/stall2/props/prop-gramophone.webp';

/** what the stall's pieces do together, in a few words */
export function fxWords(placed: string[]) {
  const n = dressingFx(placed, false), r = dressingFx(placed, true);
  const bits = [n.patience && `+${n.patience} patience`, n.interest && `+${n.interest} interest`, n.trust && `+${n.trust} trust`].filter(Boolean) as string[];
  const rich = [r.interest > n.interest && `+${r.interest - n.interest} interest`, r.trust > n.trust && `+${r.trust - n.trust} trust`].filter(Boolean) as string[];
  if (placed.some((id) => DRESSING_BY_ID[id]?.buyerWeek)) bits.push('one more buyer a week');
  return [bits.join(', '), rich.length ? `rich buyers ${rich.join(', ')} more` : ''].filter(Boolean).join('; ') || 'nothing yet';
}

/** a piece's picture cropped to its spot (the cut-outs are full-canvas), on the painting behind it, or its
 *  icon while it has no picture */
const TW = 134, TH = 74;
function PieceThumb({ d, spot }: { d: DressingPiece; spot: Spot }) {
  const [x0, y0, x1, y1] = spot.rect;
  const w = x1 - x0, h = y1 - y0;
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="dress-thumb icon" aria-hidden="true"><Icon name={d.icon} /></span>;
  // fit the spot's rectangle into the thumbnail, and scale the whole canvas to match
  const a = (w * 1536) / (h * 1024);
  const iw = a > TW / TH ? TW : TH * a, ih = iw / a;
  const cw = (iw * 100) / w; // the full canvas's width at this scale
  const pos = { width: cw, height: cw / 1.5, left: (-x0 / 100) * cw, top: (-y0 / 100) * (cw / 1.5) };
  return (
    <span className="dress-thumb" aria-hidden="true">
      <span className="dress-thumb-in" style={{ width: iw, height: ih }}>
        <img src={STAGE_IMG} alt="" style={pos} />
        <img src={dressingArt(d.id)} alt="" onError={() => setOk(false)} style={pos} />
      </span>
    </span>
  );
}

/** one piece standing on the painting: its cut-out, or its icon at the spot while it has no picture */
function OnStage({ id, preview }: { id: string; preview?: boolean }) {
  const d = DRESSING_BY_ID[id];
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [id]);
  if (!d) return null;
  const sp = SPOT_BY_ID[d.spot];
  if (!ok && sp) {
    const [x0, y0, x1, y1] = sp.rect;
    return (
      <span className={`dress-icon ${preview ? 'preview' : ''}`} style={{ left: `${(x0 + x1) / 2}%`, top: `${(y0 + y1) / 2}%` }} data-testid={`dress-on-${id}`} aria-hidden="true">
        <Icon name={d.icon} />
      </span>
    );
  }
  return <img className={`dress-piece ${preview ? 'preview' : ''}`} src={dressingArt(id)} alt="" draggable={false} onError={() => setOk(false)} data-testid={`dress-on-${id}`} />;
}

export function DressStall({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const spots = spotsOf(g);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const placed = placedPieces(g);
  // the painting is wider than a phone: start with the shelves in view, and bring a chosen spot into view
  const centre = (xPct: number, smooth: boolean) => {
    const sc = scroller.current, st = stage.current;
    if (!sc || !st) return;
    sc.scrollTo({ left: Math.max(0, (st.offsetWidth * xPct) / 100 - sc.clientWidth / 2), behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => { centre(40, false); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const pick = (id: string) => {
    audio.sfx('tap');
    setSel(id);
    setPreview(null);
    setNote('');
    const r = SPOT_BY_ID[id].rect;
    centre((r[0] + r[2]) / 2, true);
  };
  // spots in tapping order: the big ones first, so a small spot inside a big one stays on top
  const tapOrder = useMemo(() => [...SPOTS].sort((a, b) => (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]) - (a.rect[2] - a.rect[0]) * (a.rect[3] - a.rect[1])), []);
  const spot = sel ? SPOT_BY_ID[sel] : null;
  const cur = sel ? spots[sel] || '' : '';
  const shown = preview ?? cur;
  const pd = preview ? DRESSING_BY_ID[preview] : null;
  const owned = preview ? ownsPiece(g, preview) : false;
  const act = (msg: string) => { if (msg) setNote(msg); setPreview(null); };

  return createPortal(
    <div className="overlay dress-screen" data-testid="dress-screen" onClick={(e) => e.stopPropagation()}>
      <div className="overlay-head">
        <h2>Dress your stall</h2>
        <span className="sub">{fmt(g.cash)}</span>
        <button className="btn close" onClick={onClose} data-testid="dress-close">Done</button>
      </div>
      <div className="dress-scroll" ref={scroller}>
        <div className="dress-stage" ref={stage} data-testid="dress-stage">
          <img className="dress-bg" src={STAGE_IMG} alt="Your stall at Giza" draggable={false} />
          <StallSky />
          {SPOTS.map((s) => {
            const id = s.id === sel ? shown : spots[s.id];
            return id ? <OnStage key={s.id + id} id={id} preview={s.id === sel && !!preview && !owned} /> : null;
          })}
          <img className="dress-piece" src={GRAMO} alt="" draggable={false} />
          {tapOrder.map((s) => (
            <button key={s.id} className={`dress-spot ${s.id === sel ? 'on' : ''} ${spots[s.id] ? 'full' : ''}`} style={{ left: `${s.rect[0]}%`, top: `${s.rect[1]}%`, width: `${s.rect[2] - s.rect[0]}%`, height: `${s.rect[3] - s.rect[1]}%` }} onClick={() => pick(s.id)} aria-label={s.label} aria-pressed={s.id === sel} data-testid={`spot-${s.id}`} />
          ))}
        </div>
      </div>
      <div className="dress-panel">
        {!spot ? (
          <>
            <p className="dress-hint">Tap a place on the stall to see what could stand there. Each place holds one piece; you can change them round whenever you like.</p>
            <p className="dress-fx" data-testid="dress-fx">Your stall helps every sale: {fxWords(placed)}.</p>
          </>
        ) : (
          <>
            <div className="dress-spot-head"><b>{spot.label}</b><span>{cur ? `Now: ${DRESSING_BY_ID[cur]?.name}` : 'Empty'}</span></div>
            <div className="dress-strip" data-testid="dress-strip">
              {piecesFor(spot.id).map((d) => {
                const mine = ownsPiece(g, d.id);
                return (
                  <button key={d.id} className={`dress-card ${shown === d.id ? 'on' : ''} ${d.id === cur ? 'here' : ''}`} onClick={() => { audio.sfx('tap'); setNote(''); setPreview(d.id === cur ? null : d.id); }} data-testid={`piece-${d.id}`} aria-pressed={shown === d.id}>
                    <PieceThumb d={d} spot={spot} />
                    <b>{d.name}</b>
                    <small>{d.effect}</small>
                    <em>{d.id === cur ? 'On the stall' : d.father ? "Your father's" : mine ? 'Yours' : fmt(d.cost)}</em>
                  </button>
                );
              })}
            </div>
            <div className="dress-actions">
              {pd && !owned && <button className="btn primary" disabled={g.cash < pd.cost} onClick={() => act(g.buyDressing(pd.id))} data-testid="dress-buy">Buy and put out · {fmt(pd.cost)}</button>}
              {pd && owned && <button className="btn primary" onClick={() => act(g.placeDressing(spot.id, pd.id))} data-testid="dress-place">Put it out</button>}
              {pd && <button className="btn" onClick={() => setPreview(null)} data-testid="dress-cancel">Leave it</button>}
              {!pd && cur && <button className="btn" onClick={() => act(g.placeDressing(spot.id, null))} data-testid="dress-remove">Put it away</button>}
              {!pd && !cur && <span className="dim small">Tap a piece to see it in place.</span>}
            </div>
            {pd && !owned && g.cash < pd.cost && <p className="dim small">You have {fmt(g.cash)}.</p>}
          </>
        )}
        {note && <p className="dress-note" data-testid="dressing-note">{note}</p>}
      </div>
    </div>,
    document.body,
  );
}

/** The way into the screen, in the Improve sheet: what the stall has now, and a button. */
export function StallDressing() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const placed = placedPieces(g);
  return (
    <div className="upgrade dress-entry" data-testid="dressing-fold">
      <span className="dress-pic" aria-hidden="true"><Icon name="room" /></span>
      <div className="u-main"><b>Dress your stall</b><span>{placed.length} of {SPOTS.length} places dressed · {fxWords(placed)}</span></div>
      <button className="btn primary" onClick={() => { audio.sfx('tap'); setOpen(true); }} data-testid="dress-open">Dress</button>
      {open && <DressStall onClose={() => setOpen(false)} />}
    </div>
  );
}
