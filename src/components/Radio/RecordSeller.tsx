// The record seller in a town's souq: the town's own records, each one played for you on his
// machine before you buy it. Bought records go to the gramophone at the stall.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { recordsIn, recordsOwned } from '../../data/records';
import { settlementById } from '../../game/systems/world';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { RecordDisc } from './RecordDisc';

export function RecordSeller({ town, onClose }: { town: string; onClose: () => void }) {
  const g = useGame();
  const have = recordsOwned(g);
  const [note, setNote] = useState('');
  const [hear, setHear] = useState<string | null>(null);
  const el = useRef<HTMLAudioElement | null>(null);
  const stopHear = () => { if (el.current) { el.current.pause(); audio.detach(el.current); el.current = null; } setHear(null); audio.muteMusic(false); };
  useEffect(() => () => stopHear(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const listen = (id: string) => {
    if (hear === id) { stopHear(); return; }
    stopHear();
    audio.ensure();
    audio.muteMusic(true, 0.8);
    const a = audio.attach(new Audio(`audio/music/${id}.mp3`), 'music', 0.7);
    el.current = a;
    a.onended = stopHear;
    a.play().catch(stopHear);
    setHear(id);
  };
  let name = town;
  try { name = settlementById(town).name; } catch { /* unknown town */ }
  return (
    <div className="radio-wrap" role="dialog" aria-label="The record seller" data-testid="record-seller" onClick={() => { stopHear(); onClose(); }}>
      <div className="radio-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rs-head"><small>THE RECORD SELLER · {name.toUpperCase()}</small><b>Records of {name}</b><span>He winds his machine and plays you any you like. What you buy goes to the gramophone at your stall.</span></div>
        <div className="radio-captions rs-list">
          {recordsIn(town).map((r) => {
            const own = have.includes(r.id);
            return (
              <div key={r.id} className={`rs-row ${own ? 'own' : ''}`}>
                <RecordDisc rec={r} owned spinning={hear === r.id} size={64} />
                <span className="rs-body"><b>{r.title}</b><small>{r.performer} · {r.company}</small></span>
                <span className="rs-acts">
                  <button className="btn small" onClick={() => listen(r.id)} data-testid={`rs-hear-${r.id}`}>{hear === r.id ? 'Stop' : 'Hear it'}</button>
                  {own ? <small className="rs-have">On your shelf</small> : <button className="btn small primary" disabled={g.cash < r.price} onClick={() => setNote(useGame.getState().buyRecord(r.id))} data-testid={`rs-buy-${r.id}`}>{fmt(r.price)}</button>}
                </span>
              </div>
            );
          })}
          {note && <p className="hint" data-testid="rs-note">{note}</p>}
        </div>
        <button className="btn radio-close" onClick={() => { stopHear(); onClose(); }} data-testid="record-seller-close">Leave</button>
      </div>
    </div>
  );
}
