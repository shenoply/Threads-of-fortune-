import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { SETTLEMENTS } from '../../data/world';
import {
  PIECES, PIECE_ORDER, POSES, POSE_INFO, SLOTS, START_WARDROBE,
  heroCharisma, layerSrc, removePiece, soldIn, wearPiece, wornIds, wouldReplace,
  type FitTable, type Outfit, type Piece, type Pose, type Slot,
} from '../../data/wardrobe';
import { FIT } from '../../data/wardrobeFit';
import { basePrompt, piecePrompt } from '../../data/wardrobePrompts';
import { HeroFigure } from './HeroFigure';
import { preload } from '../../game/preload';
import './Wardrobe.css';

const placeName = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
/** Where each kind of piece sits on the 1024x1536 wardrobe canvas: [zoom, x%, y%] for the card thumbnail. */
const THUMB: Record<Slot, [number, number, number]> = { head: [420, 50, 10], top: [190, 50, 30], outer: [190, 50, 32], legs: [230, 50, 72], feet: [330, 50, 97], extras: [200, 50, 38], weapon: [180, 50, 45], carry: [200, 50, 58] };
const ZOOMS = [1, 1.35, 1.8, 2.6];
const ROOM = 'art/hero/wardrobe-room.jpg';
const sameOutfit = (a: Outfit, b: Outfit) => wornIds(a).sort().join() === wornIds(b).sort().join();

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** The hero's wardrobe: try pieces on over the painted body, see the price, buy, wear. */
export function Wardrobe({ onClose, startSlot }: { onClose: () => void; startSlot?: Slot }) {
  const g = useGame();
  const w = g.wardrobe ?? START_WARDROBE;
  const at = g.world?.at ?? null;
  const clean = g.attire?.clean ?? 100;
  // the wardrobe shows him full length; the stall and profile views are only for fitting their pictures
  const [fitPose, setFitPose] = useState<Pose>('wardrobe');
  const [zoom, setZoom] = useState(1);
  const [room, setRoom] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [noPic, setNoPic] = useState<Set<string>>(() => new Set());
  const [slot, setSlot] = useState<Slot>(startSlot ?? 'head');
  const [trial, setTrial] = useState<Outfit>(() => ({ ...w.outfit, extras: [...w.outfit.extras] }));
  const [note, setNote] = useState('');
  const [fitting, setFitting] = useState(false);
  const [fit, setFit] = useState<FitTable>(() => ({ ...FIT }));
  const [fitId, setFitId] = useState<string | null>(null);
  const [unpainted, setUnpainted] = useState<string[]>([]);

  const pose: Pose = fitting ? fitPose : 'wardrobe';
  const worn = new Set(wornIds(trial));
  const toBuy = wornIds(trial).filter((id) => !w.owned.includes(id));
  const total = toBuy.reduce((n, id) => n + PIECES[id].price, 0);
  const notHere = toBuy.filter((id) => !soldIn(PIECES[id], at));
  const changed = !sameOutfit(trial, w.outfit);
  const chNow = heroCharisma(w.outfit, clean);
  const chTrial = heroCharisma(trial, clean);
  const here = at ? placeName(at) : null;

  // zooming always starts on his head; drag to look elsewhere
  useEffect(() => { setPan({ x: 0, y: 0 }); }, [zoom, pose]);
  // every piece he might try on, fetched in the background so each appears the moment it is picked
  useEffect(() => { preload(Object.values(PIECES).filter((p) => p.poses.includes('wardrobe')).map((p) => layerSrc('wardrobe', p.id))); }, []);
  const clampPan = (x: number, y: number) => {
    const el = stage.current;
    if (!el) return { x, y };
    const mx = (el.clientWidth * (zoom - 1)) / 2, my = el.clientHeight * (zoom - 1);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my * 0.2, y)) };
  };
  const onDown = (e: React.PointerEvent) => { if (zoom === 1) return; drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (d) setPan(clampPan(d.px + e.clientX - d.x, d.py + e.clientY - d.y)); };
  const onUp = () => { drag.current = null; };

  const pieces = useMemo(() => PIECE_ORDER.map((id) => PIECES[id]).filter((p) => p.slot === slot), [slot]);

  const toggle = (p: Piece) => {
    setNote('');
    if (worn.has(p.id)) {
      if (p.slot === 'top' || p.slot === 'legs') {
        const next = removePiece(trial, p.id, w.owned);
        if (sameOutfit(next, trial)) { setNote('Something has to go on underneath. Pick another to swap.'); return; }
        setTrial(next);
      } else setTrial(removePiece(trial, p.id, w.owned));
    } else {
      const gone = wouldReplace(trial, p.id);
      setTrial(wearPiece(trial, p.id));
      if (gone.length) setNote(`${p.name} on, ${gone.map((x) => PIECES[x].name.toLowerCase()).join(' and ')} off.`);
      
    }
  };

  const buy = () => {
    const msg = g.buyPieces(toBuy);
    setNote(msg);
    if (!msg.startsWith('Not enough')) g.dressIn(trial);
  };

  const nudge = (dx: number, dy: number, ds: number) => {
    if (!fitId) return;
    const k = `${pose}/${fitId}`;
    const f = fit[k] ?? { x: 0, y: 0, s: 1 };
    setFit({ ...fit, [k]: { x: +(f.x + dx).toFixed(2), y: +(f.y + dy).toFixed(2), s: +(f.s + ds).toFixed(3) } });
  };
  const fitJson = JSON.stringify(Object.fromEntries(Object.entries(fit).filter(([, f]) => f.x || f.y || f.s !== 1)), null, 2);
  const poseLayers = wornIds(trial).map((id) => PIECES[id]).filter((p) => p.poses.includes(pose)).sort((a, b) => b.z - a.z);

  const status = (p: Piece) => {
    if (w.owned.includes(p.id)) return <em className="wr-own">Owned</em>;
    if (soldIn(p, at)) return <em className="wr-here">Sold here</em>;
    return <em className="wr-away">{p.where.length ? `Sold in ${p.where.slice(0, 3).map(placeName).join(', ')}${p.where.length > 3 ? '…' : ''}` : 'Any market town'}</em>;
  };

  return createPortal(
    <div className="overlay wardrobe" role="dialog" aria-label="Wardrobe" data-testid="wardrobe">
      <div className="overlay-head">
        <div style={{ flex: 1 }}>
          <h2>Wardrobe</h2>
          <div className="sub">{here ? `In ${here}` : 'On the road: nothing to buy here'} · Cash {fmt(g.cash)} · Charisma {chNow}{changed && chTrial !== chNow ? ` → ${chTrial}` : ''}</div>
        </div>
        <button className={`btn ${fitting ? 'primary' : ''}`} onClick={() => setFitting(!fitting)} data-testid="wr-fit-toggle">Fit</button>
        <button className="btn" onClick={onClose} data-testid="wr-close">Close</button>
      </div>

      <div className="wr-body">
        <section className="wr-stage" style={room ? { backgroundImage: `linear-gradient(180deg, rgba(18,12,7,0.05), rgba(18,12,7,0.35)), url(${ROOM})` } : undefined}>
          <img src={ROOM} alt="" hidden onError={() => setRoom(false)} />
          {fitting && (
            <div className="wr-poses" role="tablist">
              {POSES.map((p) => (
                <button key={p} role="tab" aria-selected={pose === p} className={`chip ${pose === p ? 'on' : ''}`} onClick={() => setFitPose(p)} data-testid={`wr-pose-${p}`}>{POSE_INFO[p].label}</button>
              ))}
            </div>
          )}
          <div className={`wr-figure-wrap ${zoom > 1 ? 'zoomed' : ''}`} ref={stage} data-testid="wr-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className={`wr-figure-box pose-${pose}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <HeroFigure pose={pose} outfit={trial} fit={fit} highlight={fitting ? fitId : null} onMissing={setUnpainted} />
            </div>
          </div>
          <div className="wr-zoom">
            <button className="btn" onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])} disabled={zoom === ZOOMS[0]} aria-label="Zoom out" data-testid="wr-zoom-out">−</button>
            <button className="btn" onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in" data-testid="wr-zoom-in">+</button>
          </div>
          {unpainted.length > 0 && (
            <div className="wr-unpainted">
              <small>No picture yet:</small>
              {unpainted.map((id) => <span key={id} className="wr-tag"><i style={{ background: PIECES[id].swatch }} />{PIECES[id].name}</span>)}
            </div>
          )}
        </section>

        <section className="wr-shop">
          {fitting ? (
            <div className="wr-fitpanel" data-testid="wr-fitpanel">
              <p className="wr-help">Pick a layer, then nudge it until it sits right on the body. Copy the result into <code>src/data/wardrobeFit.ts</code>.</p>
              <div className="wr-fitlist">
                {poseLayers.map((p) => (
                  <button key={p.id} className={`chip ${fitId === p.id ? 'on' : ''}`} onClick={() => setFitId(p.id)}>{p.name}</button>
                ))}
                {!poseLayers.length && <small>Nothing worn shows in this view.</small>}
              </div>
              <div className="wr-nudge">
                <button className="btn" disabled={!fitId} onClick={() => nudge(-0.5, 0, 0)} aria-label="Left">←</button>
                <button className="btn" disabled={!fitId} onClick={() => nudge(0, -0.5, 0)} aria-label="Up">↑</button>
                <button className="btn" disabled={!fitId} onClick={() => nudge(0, 0.5, 0)} aria-label="Down">↓</button>
                <button className="btn" disabled={!fitId} onClick={() => nudge(0.5, 0, 0)} aria-label="Right">→</button>
                <button className="btn" disabled={!fitId} onClick={() => nudge(0, 0, -0.01)} aria-label="Smaller">−</button>
                <button className="btn" disabled={!fitId} onClick={() => nudge(0, 0, 0.01)} aria-label="Larger">+</button>
                <button className="btn" disabled={!fitId} onClick={() => { const k = `${pose}/${fitId}`; const n = { ...fit }; delete n[k]; setFit(n); }}>Reset</button>
              </div>
              {fitId && <small className="wr-fitval">{JSON.stringify(fit[`${pose}/${fitId}`] ?? { x: 0, y: 0, s: 1 })}</small>}
              <textarea className="wr-json" readOnly value={fitJson} rows={6} onFocus={(e) => e.currentTarget.select()} />
              <div className="wr-copyrow">
                <button className="btn" onClick={async () => setNote((await copy(fitJson)) ? 'Fit table copied.' : 'Select the text box and copy it by hand.')}>Copy fit table</button>
                <button className="btn" disabled={!fitId} onClick={async () => fitId && setNote((await copy(piecePrompt(PIECES[fitId], pose))) ? `ChatGPT prompt for ${PIECES[fitId].name} (${POSE_INFO[pose].label}) copied. Save as ${layerSrc(pose, fitId).replace('art/', 'public/art/')}` : 'Copy failed.')}>Copy prompt for this piece</button>
                <button className="btn" onClick={async () => setNote((await copy(basePrompt(pose))) ? `Base-body prompt for ${POSE_INFO[pose].label} copied.` : 'Copy failed.')}>Copy base prompt</button>
              </div>
            </div>
          ) : (
            <>
              <div className="wr-slots" role="tablist">
                {SLOTS.map((s) => {
                  const n = PIECE_ORDER.filter((id) => PIECES[id].slot === s.id && worn.has(id)).length;
                  return (
                    <button key={s.id} role="tab" aria-selected={slot === s.id} className={`wr-slot ${slot === s.id ? 'on' : ''}`} onClick={() => setSlot(s.id)} data-testid={`wr-slot-${s.id}`}>
                      {s.label}{n > 0 && <b>{s.multi ? n : '•'}</b>}
                    </button>
                  );
                })}
              </div>
              <div className="wr-list">
                {pieces.map((p) => (
                  <button key={p.id} className={`wr-piece ${worn.has(p.id) ? 'on' : ''}`} onClick={() => toggle(p)} data-testid={`wr-piece-${p.id}`}>
                    <span className="wr-thumb" style={{ backgroundColor: p.swatch }}>
                      <img src={layerSrc('wardrobe', p.id)} alt="" hidden onLoad={(e) => e.currentTarget.parentElement?.classList.add('has-pic')} onError={() => setNoPic((n) => (n.has(p.id) ? n : new Set(n).add(p.id)))} />
                      <i style={{ backgroundImage: `url(${layerSrc('wardrobe', p.id)})`, backgroundSize: `${THUMB[p.slot][0]}% auto`, backgroundPosition: `${THUMB[p.slot][1]}% ${THUMB[p.slot][2]}%` }} />
                    </span>
                    <span className="wr-info">
                      <span className="wr-top"><b>{p.name}</b><span className="wr-price">{w.owned.includes(p.id) ? '' : fmt(p.price)}</span></span>
                      <small>{p.note}</small>
                      <span className="wr-meta">{p.charisma > 0 && <em>Charisma +{p.charisma}</em>}{status(p)}{worn.has(p.id) && <em className="wr-on">Trying on</em>}{noPic.has(p.id) && <em className="wr-nopic">No picture yet</em>}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="wr-foot">
            {note && <p className="wr-note" data-testid="wr-note">{note}</p>}
            {toBuy.length > 0 ? (
              <>
                <p className="wr-sum">
                  {toBuy.length} new {toBuy.length === 1 ? 'piece' : 'pieces'}: <b>{fmt(total)}</b>
                  {notHere.length > 0 && <span className="wr-warn"> · {notHere.map((id) => PIECES[id].name).join(', ')} {notHere.length === 1 ? 'is' : 'are'} not sold {here ? `in ${here}` : 'on the road'}</span>}
                  {notHere.length === 0 && g.cash < total && <span className="wr-warn"> · you have {fmt(g.cash)}</span>}
                </p>
                <div className="wr-actions">
                  <button className="btn" onClick={() => { setTrial({ ...w.outfit, extras: [...w.outfit.extras] }); setNote(''); }}>Put back</button>
                  <button className="btn primary" disabled={notHere.length > 0 || g.cash < total} onClick={buy} data-testid="wr-buy">Buy and wear · {fmt(total)}</button>
                </div>
              </>
            ) : (
              <div className="wr-actions">
                <button className="btn" disabled={!changed} onClick={() => { setTrial({ ...w.outfit, extras: [...w.outfit.extras] }); setNote(''); }}>Put back</button>
                <button className="btn primary" disabled={!changed} onClick={() => { g.dressIn(trial); setNote('Dressed.'); }} data-testid="wr-wear">Wear this</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
