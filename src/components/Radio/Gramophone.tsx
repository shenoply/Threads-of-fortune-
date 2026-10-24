import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';

import { useGame } from '../../game/state/store';
import { RECORDS, RECORD_BY_ID, recordsOwned } from '../../data/records';
import { settlementById } from '../../game/systems/world';
import { RecordDisc } from './RecordDisc';
import { recordPlayer } from '../../game/audio/recordPlayer';

const label = (id: string) => RECORD_BY_ID[id]?.title ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
/** where a record not yet found can be had */
const whereOf = (home: string) => { try { return `the record seller in ${settlementById(home).name}`; } catch { return 'somewhere on the road'; } };

/** a brass tonearm: a round base at the platter's corner, the arm, and the head with its needle */
function Tonearm({ down }: { down: boolean }) {
  return (
    <svg className={`gramo-tonearm ${down ? 'down' : ''}`} viewBox="0 0 60 130" aria-hidden="true">
      <defs><linearGradient id="brass" x1="0" x2="1"><stop offset="0" stopColor="#8a6224" /><stop offset=".5" stopColor="#f2d48a" /><stop offset="1" stopColor="#7a5420" /></linearGradient></defs>
      <circle cx="30" cy="18" r="15" fill="#2a1a0c" stroke="url(#brass)" strokeWidth="3" />
      <circle cx="30" cy="18" r="5" fill="url(#brass)" />
      <path d="M30 22 L30 92 Q30 104 22 112" fill="none" stroke="url(#brass)" strokeWidth="5" strokeLinecap="round" />
      <rect x="11" y="108" width="16" height="11" rx="2" transform="rotate(35 19 113)" fill="url(#brass)" />
    </svg>
  );
}

/** keeps a screen in step with the record playing */
export function useRecord() {
  const [, tick] = useState(0);
  useEffect(() => recordPlayer.subscribe(() => tick((n) => n + 1)), []);
  return recordPlayer;
}

/** The gramophone's shelf: your records, the one playing on the turntable. Closing the lid leaves the
 *  record playing while you work; pause or change it here or from the little control at the stall. */
export function Gramophone({ onClose }: { onClose: () => void }) {
  const [tracks, setTracks] = useState<string[] | null>(null);
  const owned = useGame((st) => recordsOwned(st));
  const [peek, setPeek] = useState<string | null>(null);
  const rp = useRecord();
  const on = rp.playing ? rp.current : null;
  const shown = rp.current;
  useEffect(() => {
    fetch('audio/music/tracks.json')
      .then((r) => r.json())
      .then((m: Record<string, number>) => setTracks(RECORDS.map((r) => r.id).filter((id) => id in m)))
      .catch(() => setTracks([]));
  }, []);
  const playing = on;
  const failed = rp.failed;
  const play = (id: string) => { audio.sfx('tap'); rp.play(id); };
  const stop = () => rp.pause();
  return (
    <div className="radio-wrap" role="dialog" aria-label="Gramophone" data-testid="gramophone" onClick={onClose}>
      <div className="radio-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="radio-set gramo-set">
          <div className={`gramo-platter ${playing ? 'on' : ''}`} data-testid="gramo-now">
            {shown && RECORD_BY_ID[shown] ? <RecordDisc rec={RECORD_BY_ID[shown]} owned spinning={!!playing} size={150} /> : <span className="gramo-felt" />}
            <Tonearm down={!!playing} />
          </div>
          <p className="gramo-playing">{shown ? <><b>{label(shown)}</b><small>{RECORD_BY_ID[shown]?.performer} · {RECORD_BY_ID[shown]?.company}</small></> : <small>Pick a record from your shelf</small>}</p>
          {shown && (
            <div className="gramo-ctl">
              <button className="btn small" onClick={() => { audio.sfx('tap'); rp.toggle(); }} data-testid="gramo-toggle">{playing ? 'Pause' : 'Play'}</button>
              <button className="btn small" onClick={() => { audio.sfx('tap'); rp.next(); }} data-testid="gramo-next">Next record</button>
              <button className="btn small" onClick={() => { audio.sfx('tap'); rp.stop(); }} data-testid="gramo-stop">Lift the needle</button>
            </div>
          )}
        </div>
        <div className="radio-captions gramo-shelf" data-testid="gramophone-list">
          <p className="gramo-count"><b>Your records</b> {owned.length} of {RECORDS.length}</p>
          {tracks === null && <p className="hint">Winding it up…</p>}
          {tracks?.length === 0 && <p className="hint">The records are packed away this trip.</p>}
          {failed && <p className="hint" data-testid="gramo-failed">The record would not play. <button className="btn small" onClick={() => play(failed)} data-testid="gramo-retry">Try again</button></p>}
          <div className="gramo-grid">
            {[...RECORDS].sort((x, y) => Number(owned.includes(y.id)) - Number(owned.includes(x.id))).map((r) => {
              const have = owned.includes(r.id) && !!tracks?.includes(r.id);
              return (
                <button key={r.id} className={`gramo-rec ${playing === r.id ? 'on' : ''} ${have ? '' : 'missing'}`}
                  onClick={() => { if (!have) { audio.sfx('tap'); setPeek(peek === r.id ? null : r.id); return; } if (playing === r.id) stop(); else play(r.id); }}
                  aria-label={have ? `${playing === r.id ? 'Stop' : 'Play'} ${r.title}` : 'A record you have not found'}
                  data-testid={have ? `gramo-${r.id}` : undefined}>
                  <RecordDisc rec={r} owned={have} spinning={playing === r.id} size={68} />
                  <small>{have ? r.title : '?'}</small>
                </button>
              );
            })}
          </div>
          {peek && RECORD_BY_ID[peek] && <p className="hint gramo-peek" data-testid="gramo-peek">Not found yet. Try {whereOf(RECORD_BY_ID[peek].home)}, or a sealed bale.</p>}
        </div>
        <button className="btn radio-close" onClick={onClose} data-testid="gramophone-close">{playing ? 'Close the lid · it keeps playing' : 'Close the lid'}</button>
      </div>
    </div>
  );
}
