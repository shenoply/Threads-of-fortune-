// The top of a game at a coffee-house table (chess, tawla, dominoes): title and stake, sound and leave on
// the right, a two-sided scoreboard; and the card at the end of a game.
import { useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { DEFAULT_VOLUMES, type Volumes } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import './cafe.css';

export interface Seat { label: string; main: React.ReactNode; sub?: string }

/** the sound at the table: the same sliders as Settings, a tap away from the right-hand corner */
function SoundPanel({ onClose }: { onClose: () => void }) {
  const vols = useGame((g) => g.volumes ?? DEFAULT_VOLUMES);
  const setVolume = useGame((g) => g.setVolume);
  return (
    <div className="cafe-sound" role="dialog" aria-label="Sound" data-testid="cafe-sound-panel">
      <div className="cafe-sound__head"><b>Sound</b><button className="btn small" onClick={onClose} aria-label="Close sound">✕</button></div>
      {([['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects'], ['dialogue', 'Voices']] as [keyof Volumes, string][]).map(([k, l]) => (
        <label className="vol-row" key={k}>
          <span>{l}</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(vols[k] * 100)} onChange={(e) => setVolume(k, Number(e.target.value) / 100)} aria-label={`${l} volume`} data-testid={`cafe-vol-${k}`} />
          <b>{Math.round(vols[k] * 100)}</b>
        </label>
      ))}
    </div>
  );
}

/** the top of a game: title and stake, sound and leave on the right, then a clear scoreboard */
export function Head({ title, stake, onQuit, you, him, turn }: { title: string; stake: number; onQuit: () => void; you: Seat; him: Seat; turn: 'you' | 'him' | null }) {
  const [sound, setSound] = useState(false);
  return (
    <div className="cafe-head">
      <div className="cafe-head__top">
        <h2>{title}</h2>
        <span className="cafe-head__stake">{stake ? `for ${fmt(stake)}` : 'for tea'}</span>
        <button className="btn small cafe-head__btn" onClick={() => setSound((v) => !v)} aria-label="Sound" aria-pressed={sound} data-testid="cafe-sound"><Icon name="sound" /></button>
        <button className="btn small cafe-head__btn" onClick={onQuit} data-testid="cafe-quit" aria-label="Leave the table" title={stake ? 'Leaving a game you have started gives up the stake' : 'Leave'}>✕</button>
      </div>
      <div className="cafe-scores" data-testid="cafe-score">
        {[['you', you], ['him', him]].map(([k, sd]) => {
          const x = sd as Seat;
          return (
            <div key={k as string} className={`cafe-side ${k}${turn === k ? ' on' : ''}`}>
              <span className="cafe-side__who">{x.label}{turn === k && <i> · to play</i>}</span>
              <b className="cafe-side__main">{x.main}</b>
              {x.sub && <small className="cafe-side__sub">{x.sub}</small>}
            </div>
          );
        })}
      </div>
      {sound && <SoundPanel onClose={() => setSound(false)} />}
    </div>
  );
}

export function EndCard({ text, onDone }: { text: string; onDone: () => void }) {
  return (
    <div className="cafe-end" data-testid="cafe-end">
      <p>{text}</p>
      <button className="btn" onClick={onDone} data-testid="cafe-done">Get up from the table</button>
    </div>
  );
}

