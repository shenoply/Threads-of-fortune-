// Dress your stall: the stall painting, large, with each spot marked. Tap a spot to see what can stand
// there; tap a piece to see it in place at once (pale until it is bought); buy it, or put out one you
// already have, or put the spot's piece away. Nothing changes on the stall except what is done here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmt } from '../../game/economy/money';
import { useGame } from '../../game/state/store';
import { DRESSING_BY_ID, dressingArt, dressingFx, type DressingPiece } from '../../data/shops';
import { SPOT_BY_ID, piecesFor, spotsOf, spotsHere, ownsPiece, placedPieces } from '../../game/stallDressing';
import { PROP_BOX, markAt, placeStyle, placedRect, propKey, sceneImg, stallSceneFor, type StallScene } from '../../game/stallScenes';
import { StallSky } from '../Atmosphere/StallSky';
import { DEFAULT_SIGN, SignLetters } from '../StallEncounter/Scene';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';

const GRAMO = 'art/stall2/props/prop-gramophone.webp';

/** where a spot is on this stall's painting, for its tap target: the room its pieces take at their
 *  place, or a small square round the mark of a spot whose pieces have no picture yet */
function spotRect(sc: StallScene, spot: string): [number, number, number, number] | null {
  const at = sc.spots[spot];
  if (at) {
    const rs = piecesFor(spot).map((d) => placedRect(dressingArt(d.id), at)).filter((r): r is [number, number, number, number] => !!r);
    if (rs.length) return [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];
  }
  if (spot === 'sign') return sc.sign;
  const m = markAt(sc, spot);
  return m ? [m[0] - 3.5, m[1] - 5, m[0] + 3.5, m[1] + 5] : null;
}

/** what the stall's pieces do together, in a few words */
export function fxWords(placed: string[]) {
  const n = dressingFx(placed, false), r = dressingFx(placed, true);
  const bits = [n.patience && `+${n.patience} patience`, n.interest && `+${n.interest} interest`, n.trust && `+${n.trust} trust`].filter(Boolean) as string[];
  const rich = [r.interest > n.interest && `+${r.interest - n.interest} interest`, r.trust > n.trust && `+${r.trust - n.trust} trust`].filter(Boolean) as string[];
  if (placed.some((id) => DRESSING_BY_ID[id]?.buyerWeek)) bits.push('one more buyer a week');
  return [bits.join(', '), rich.length ? `rich buyers ${rich.join(', ')} more` : ''].filter(Boolean).join('; ') || 'nothing yet';
}

/** a piece's picture cropped to its own painted extent (the cut-outs are full-canvas), or its icon
 *  while it has no picture */
const TW = 134, TH = 74;
function PieceThumb({ d, sc }: { d: DressingPiece; sc: StallScene }) {
  const [ok, setOk] = useState(true);
  const box = PROP_BOX[propKey(dressingArt(d.id))];
  const r = !ok || !box ? spotRect(sc, d.spot) : null;
  if ((!ok || !box) && !r) return <span className="dress-thumb icon" aria-hidden="true"><Icon name={d.icon} /></span>;
  // no cut-out of its own: the place on this stall where it goes, cut from the painting
  const src = r ? sceneImg(sc.id) : dressingArt(d.id);
  const [x0, y0, x1, y1] = r ?? box!;
  const w = x1 - x0, h = y1 - y0;
  // fit the piece into the thumbnail, and scale the whole canvas to match
  const a = (w * 1536) / (h * 1024);
  const iw = a > TW / TH ? TW : TH * a, ih = iw / a;
  const cw = (iw * 100) / w; // the full canvas's width at this scale
  const pos = { width: cw, height: cw / 1.5, left: (-x0 / 100) * cw, top: (-y0 / 100) * (cw / 1.5) };
  return (
    <span className="dress-thumb" aria-hidden="true">
      <span className="dress-thumb-in" style={{ width: iw, height: ih }}>
        <img src={src} alt="" onError={() => setOk(false)} style={pos} />
      </span>
      {r && <Icon name={d.icon} />}
    </span>
  );
}

/** one piece standing on the painting at its place in this stall: its cut-out, or its icon at the
 *  spot while it has no picture */
function OnStage({ id, sc, preview }: { id: string; sc: StallScene; preview?: boolean }) {
  const d = DRESSING_BY_ID[id];
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [id]);
  if (!d) return null;
  const at = sc.spots[d.spot];
  const pos = at ? placeStyle(dressingArt(id), at) : null;
  if (!ok || !pos) {
    if (d.spot === 'sign') return null;
    const r = spotRect(sc, d.spot);
    if (!r) return null;
    return (
      <span className={`dress-icon ${preview ? 'preview' : ''}`} style={{ left: `${(r[0] + r[2]) / 2}%`, top: `${(r[1] + r[3]) / 2}%` }} data-testid={`dress-on-${id}`} aria-hidden="true">
        <Icon name={d.icon} />
      </span>
    );
  }
  return <img className={`dress-piece placed ${preview ? 'preview' : ''}`} src={dressingArt(id)} alt="" style={pos} draggable={false} onError={() => setOk(false)} data-testid={`dress-on-${id}`} />;
}

export function DressStall({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const sc = stallSceneFor(g.upgrades);
  const SPOTS = useMemo(() => spotsHere(g.upgrades).filter((x) => spotRect(sc, x.id)).sort((a, b) => { const ra = spotRect(sc, a.id)!, rb = spotRect(sc, b.id)!; return (ra[0] + ra[2]) - (rb[0] + rb[2]); }), [g.upgrades, sc]);
  const rectOf = (id: string) => spotRect(sc, id) ?? [0, 0, 0, 0];
  const spots = spotsOf(g);
  const [signDraft, setSignDraft] = useState(g.signName ?? '');
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
    const r = rectOf(id);
    centre((r[0] + r[2]) / 2, true);
  };
  // spots in tapping order: the big ones first, so a small spot inside a big one stays on top
  const area = (id: string) => { const r = rectOf(id); return (r[2] - r[0]) * (r[3] - r[1]); };
  const tapOrder = [...SPOTS].sort((a, b) => area(b.id) - area(a.id));
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
        <button className="btn close" onClick={() => { if (signDraft !== (g.signName ?? '')) g.setSignName(signDraft); onClose(); }} data-testid="dress-close">Done</button>
      </div>
      <div className="dress-scroll" ref={scroller}>
        <div className="dress-stage" ref={stage} data-testid="dress-stage">
          <img className="dress-bg" src={sceneImg(sc.id)} alt={`Your stall: ${sc.label}`} draggable={false} data-scene={sc.id} />
          {sc.sky && <StallSky scene={sc.id} />}
          {SPOTS.map((s) => {
            const id = s.id === sel ? shown : spots[s.id];
            return id ? <OnStage key={s.id + id} id={id} sc={sc} preview={s.id === sel && !!preview && !owned} /> : null;
          })}
          {(sel === 'sign' ? shown : spots.sign) && <SignLetters sc={sc} name={(sel === 'sign' ? signDraft : g.signName) || DEFAULT_SIGN} />}
          {sc.gramophone && <img className="dress-piece placed" src={GRAMO} alt="" style={placeStyle(GRAMO, sc.gramophone) ?? undefined} draggable={false} />}
          {tapOrder.map((s) => {
            const r = rectOf(s.id);
            return <button key={s.id} className={`dress-spot ${s.id === sel ? 'on' : ''} ${spots[s.id] ? 'full' : ''}`} style={{ left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2] - r[0]}%`, height: `${r[3] - r[1]}%` }} onClick={() => pick(s.id)} aria-label={s.label} aria-pressed={s.id === sel} data-testid={`spot-${s.id}`} />;
          })}
          {SPOTS.map((s, i) => {
            const r = rectOf(s.id);
            return <span key={s.id} className={`dress-pin ${s.id === sel ? 'on' : ''} ${spots[s.id] ? 'full' : ''}`} style={{ left: `${(r[0] + r[2]) / 2}%`, top: `${(r[1] + r[3]) / 2}%` }} aria-hidden="true">{spots[s.id] ? <Icon name="check" /> : i + 1}</span>;
          })}
        </div>
      </div>
      <div className="dress-places" role="tablist" aria-label="Places on the stall">
        {SPOTS.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={s.id === sel} className={`dress-place ${s.id === sel ? 'on' : ''} ${spots[s.id] ? 'full' : ''}`} onClick={() => pick(s.id)} data-testid={`place-${s.id}`}>
            <i>{spots[s.id] ? <Icon name="check" /> : i + 1}</i>
            <span><b>{s.label}</b><small>{spots[s.id] ? DRESSING_BY_ID[spots[s.id]!]?.name : 'Empty'}</small></span>
          </button>
        ))}
      </div>
      <div className="dress-panel">
        {!spot ? (
          <>
            <p className="dress-hint">Pick a place, above or on the picture, then a piece for it.{SPOTS.length < spotsHere(['mat', 'bazaar', 'khan']).length ? ' A bigger stall has more places.' : ''}</p>
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
                    <PieceThumb d={d} sc={sc} />
                    <b>{d.name}</b>
                    <small>{d.effect}</small>
                    <em>{d.id === cur ? 'On the stall' : d.father ? "Your father's" : mine ? 'Yours' : fmt(d.cost)}</em>
                  </button>
                );
              })}
            </div>
            {spot.id === 'sign' && (cur || pd) && (
              <label className="dress-signname">
                <span>The name on the board</span>
                <input value={signDraft} maxLength={28} placeholder={DEFAULT_SIGN} onChange={(e) => setSignDraft(e.target.value)} onBlur={() => g.setSignName(signDraft)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} data-testid="dress-signname" />
              </label>
            )}
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
  const room = spotsHere(g.upgrades).length;
  return (
    <div className="upgrade dress-entry" data-testid="dressing-fold">
      <span className="dress-pic" aria-hidden="true"><Icon name="room" /></span>
      <div className="u-main"><b>Dress your stall</b><span>{placed.length} of {room} places dressed · {fxWords(placed)}</span></div>
      <button className="btn primary" onClick={() => { audio.sfx('tap'); setOpen(true); }} data-testid="dress-open">Dress</button>
      {open && <DressStall onClose={() => setOpen(false)} />}
    </div>
  );
}
