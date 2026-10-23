// The chase, on screen: a strip of road with each rider on it, a button you hold to spur on, the
// animals' wind under it, and what happens told line by line as it happens. See systems/chase.ts.
import { useEffect, useRef, useState } from 'react';
import { startChase, stepChase, paceRatio, type ChaseSetup, type ChaseState } from '../../game/systems/chase';
import { milesPerDay } from './CaravanScreen';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import { Icon } from '../Icon';
import './chase.css';

export function Chase({ setup, onEnd }: { setup: ChaseSetup; onEnd: (c: ChaseState) => void }) {
  const [c, setC] = useState(() => startChase(setup));
  const st = useRef(c);
  const held = useRef(false);
  const [holding, setHolding] = useState(false);
  const logged = useRef(1);
  useEffect(() => {
    let raf = 0, last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const n = stepChase(st.current, dt, held.current);
      if (n !== st.current) {
        // each new line gets its sound: hooves for a catch, a shout for one getting away
        for (const l of n.log.slice(logged.current)) { audio.sfx(l.kind === 'good' ? 'coin' : l.kind === 'bad' ? 'tap' : 'tap'); if (l.kind === 'good') buzz(15); }
        logged.current = n.log.length;
        st.current = n;
        setC(n);
      }
      if (!n.over) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  const down = (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); held.current = true; setHolding(true); };
  const up = () => { held.current = false; setHolding(false); };
  const ratio = paceRatio(c);
  const pursue = c.mode === 'pursue';
  const shown = [...c.log].reverse().slice(0, 6);
  return (
    <div className={`chase ${pursue ? 'pursue' : 'flee'}`} data-testid="chase">
      <div className="ch-head">
        <small>{pursue ? 'RIDE THEM DOWN' : 'RUN FOR IT'}</small>
        <span className="ch-pace" data-testid="chase-pace">
          {pursue ? 'Your riders' : 'Your caravan'} {milesPerDay(c.mine)} mi/day · theirs {milesPerDay(c.theirs)}
          <em className={ratio >= 1 ? 'ok' : 'warn'}>{ratio >= 1.15 ? 'you are faster' : ratio >= 0.95 ? 'about even' : 'they are faster'}</em>
        </span>
      </div>
      <div className="ch-road" aria-hidden="true">
        <i className="ch-time" style={{ width: `${Math.min(100, (c.t / c.limit) * 100)}%` }} />
        {pursue ? (
          <>
            <span className="ch-you" style={{ left: '4%' }}><Icon name="run" /></span>
            {c.runners.map((r) => (
              <span key={r.name} className={`ch-man ${r.state}${r.leader ? ' lead' : ''}`} style={{ left: `${8 + Math.max(0, Math.min(100, r.gap)) * 0.86}%` }} title={r.name}>
                <b>{r.name}</b>
              </span>
            ))}
            <span className="ch-cover">cover</span>
          </>
        ) : (
          <>
            {c.runners.map((r, i) => (
              <span key={r.name} className={`ch-man ${r.state}`} style={{ left: `${4 + (i % 3) * 2}%`, top: `${30 + i * 9}%` }} title={r.name}><b>{r.name}</b></span>
            ))}
            <span className="ch-you flee" style={{ left: `${10 + Math.max(0, Math.min(100, c.lead)) * 0.82}%` }}><Icon name="camel" /></span>
            <span className="ch-cover">clear</span>
          </>
        )}
      </div>
      <ul className="ch-log" data-testid="chase-log">
        {shown.map((l, i) => <li key={`${l.t}-${i}`} className={l.kind} style={{ opacity: 1 - i * 0.14 }}>{l.text}</li>)}
      </ul>
      {!c.over ? (
        <>
          <div className="ch-wind" aria-label={`Wind ${Math.round(c.wind)}%`}><i style={{ width: `${c.wind}%` }} className={c.wind < 25 ? 'low' : ''} /><small>{pursue ? "Horses' wind" : "Animals' wind"}</small></div>
          <button className={`btn primary big ch-hold ${holding ? 'on' : ''}`} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onContextMenu={(e) => e.preventDefault()} data-testid="chase-hold">
            {pursue ? 'Hold to spur on' : 'Hold to drive them on'}
          </button>
          <small className="ch-tip">{pursue ? `Ease off when the wind runs low. Your riders can hold ${c.hands} more.` : c.overloaded ? 'Laden animals shed loads when pushed hard.' : 'Ease off when the wind runs low.'}</small>
        </>
      ) : (
        <button className="btn primary big" onClick={() => onEnd(c)} data-testid="chase-done">Continue</button>
      )}
    </div>
  );
}
