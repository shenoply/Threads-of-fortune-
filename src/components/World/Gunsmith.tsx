// Ali Hafez's shop in the Muski: the old armourer behind his counter, holding up whatever you ask to
// see (one still picture for each piece, art/arms/seller-<id>.webp), and below him what he has, at your
// side and long arms. Buy, and the piece you carried in that place is traded in at half its price.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { ARMS, ARM_BY_ID, armPic, type ArmSlot } from '../../data/arms';
import { lowerName } from '../../game/text';
import { audio } from '../../game/audio/engine';
import './gunsmith.css';

export function Gunsmith({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [slot, setSlot] = useState<ArmSlot>('side');
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // the picture shown, and the one before it fading out
  const [shown, setShown] = useState(armPic(null));
  const [prev, setPrev] = useState<string | null>(null);
  useEffect(() => {
    const next = armPic(sel);
    if (next === shown) return;
    const im = new Image();
    im.onload = () => { setPrev(shown); setShown(next); };
    im.src = next;
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const list = ARMS.filter((a) => a.slot === slot);
  // the pictures either side of the one chosen, ready before they are asked for
  useEffect(() => {
    const i = list.findIndex((a) => a.id === sel);
    for (const a of [list[i - 1], list[i + 1], list[0]]) if (a?.pic) { const im = new Image(); im.src = armPic(a.id); }
  }, [sel, slot]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = sel ? ARM_BY_ID[sel] : null;
  const mine = a ? g.carry?.[a.slot] === a.id : false;
  const old = a ? ARM_BY_ID[g.carry?.[a.slot] ?? ''] : undefined;
  const back = a && old && !mine ? Math.round(old.price / 2) : 0;
  const pay = a ? a.price - back : 0;
  const carried = [g.carry?.side, g.carry?.long].filter(Boolean).map((id) => lowerName(ARM_BY_ID[id!]?.name ?? '')).join(' and ');
  return createPortal(
    <div className="overlay gunsmith" data-testid="gunsmith" onClick={(e) => e.stopPropagation()}>
      <div className="overlay-head">
        <h2>Ali Hafez, gunsmith</h2>
        <span className="sub">{fmt(g.cash)}</span>
        <button className="btn close" onClick={onClose} data-testid="gunsmith-close">Done</button>
      </div>
      <div className="gun-body">
        <div className="gun-pic">
          {prev && <img key={`p${prev}`} className="gun-prev" src={prev} alt="" onAnimationEnd={() => setPrev(null)} />}
          <img key={shown} className="gun-now" src={shown} alt={a ? `Ali Hafez holding ${lowerName(a.name)}` : 'Ali Hafez behind his counter in the Muski'} data-testid="gun-pic" data-src={shown} />
          {a && !a.pic && <span className="gun-back">He keeps it in the back room. Ask, and he brings it out.</span>}
        </div>
        <p className="gun-says">{a ? a.line : `"Look as long as you like. A merchant on the roads should carry something."${carried ? ` You carry ${carried}.` : ''}`}</p>
        <div className="gun-slots" role="tablist">
          <button role="tab" aria-selected={slot === 'side'} className={slot === 'side' ? 'on' : ''} onClick={() => { audio.sfx('tap'); setSlot('side'); setSel(null); setNote(''); }} data-testid="gun-side">At your side</button>
          <button role="tab" aria-selected={slot === 'long'} className={slot === 'long' ? 'on' : ''} onClick={() => { audio.sfx('tap'); setSlot('long'); setSel(null); setNote(''); }} data-testid="gun-long">Long arms</button>
        </div>
        <div className="gun-strip" data-testid="gun-strip">
          {list.map((x) => (
            <button key={x.id} className={`gun-card ${sel === x.id ? 'on' : ''} ${g.carry?.[x.slot] === x.id ? 'mine' : ''}`} onClick={() => { audio.sfx('tap'); setNote(''); setSel(x.id); }} data-testid={`gun-${x.id}`}>
              <span className="gun-thumb"><img src={armPic(x.id, true)} alt="" loading="lazy" /></span>
              <b>{(() => { const n = x.name.replace(/^An? /, ''); return n[0].toUpperCase() + n.slice(1); })()}</b>
              <span>{g.carry?.[x.slot] === x.id ? 'You carry it' : fmt(x.price)}</span>
              <em>+{x.power} on the road</em>
            </button>
          ))}
        </div>
        {a && (
          <div className="gun-buy">
            <div>
              <b>{a.name}</b>
              <span>{`Adds ${a.power} to your caravan's strength, and widens your chance in a duel with a band's leader.`}{a.kind !== 'blade' && a.kind !== 'whip' ? ' Carry permit included.' : ''}</span>
              {back > 0 && <span className="gun-trade">He takes your {lowerName(old!.name.replace(/^An? /, ''))} for {fmt(back)}.</span>}
            </div>
            {mine ? <span className="gun-mine">You carry it</span>
              : <button className="btn primary" disabled={g.cash < pay} onClick={() => setNote(g.buyArm(a.id))} data-testid="gun-buy">Buy · {fmt(pay)}</button>}
          </div>
        )}
        {note && <p className="gun-note" data-testid="gun-note">{note}</p>}
      </div>
    </div>,
    document.body,
  );
}
