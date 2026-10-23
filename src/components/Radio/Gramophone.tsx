import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';

import { useGame } from '../../game/state/store';
import { RECORDS, RECORD_BY_ID, recordsOwned } from '../../data/records';
import { settlementById } from '../../game/systems/world';
import { RecordDisc } from './RecordDisc';

const label = (id: string) => RECORD_BY_ID[id]?.title ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
/** where a record not yet found can be had */
const whereOf = (home: string) => { try { return `the record seller in ${settlementById(home).name}`; } catch { return 'somewhere on the road'; } };

/** Ramp a record's own level (the sliders still apply on top, through the audio engine), so a
 *  chosen record rises in and falls out instead of slamming in. */
function fadeEl(el: HTMLAudioElement, from: number, to: number, ms: number) {
  const start = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / ms);
    audio.setElLevel(el, from + (to - from) * t);
    if (t < 1) requestAnimationFrame(tick);
  };
  tick();
}

/** The gramophone on the shelf: pick any record you have collected and it plays through the horn.
 *  The game's own score and ambience go fully quiet while it plays, so the two never overlap, and
 *  come back once the lid is closed. */
export function Gramophone({ onClose }: { onClose: () => void }) {
  const [tracks, setTracks] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const owned = useGame((st) => recordsOwned(st));
  const [peek, setPeek] = useState<string | null>(null);
  const elRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('audio/music/tracks.json')
      .then((r) => r.json())
      .then((m: Record<string, number>) => setTracks(RECORDS.map((r) => r.id).filter((id) => id in m)))
      .catch(() => setTracks([]));
  }, []);

  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => () => { elRef.current?.pause(); if (elRef.current) audio.detach(elRef.current); audio.muteMusic(false); }, []);

  const let_go = (el: HTMLAudioElement, ms: number) => {
    fadeEl(el, 0.85, 0, ms);
    setTimeout(() => { el.pause(); audio.detach(el); }, ms + 20);
  };
  const play = (id: string) => {
    audio.sfx('tap');
    audio.ensure();
    setFailed(null);
    // switching records: the old one drops out quickly, the new one still rises on its own fade-in
    if (elRef.current) let_go(elRef.current, 300);
    audio.muteMusic(true, 1.1);
    const el = audio.attach(new Audio(`audio/music/${id}.mp3`), 'music', 0);
    elRef.current = el;
    // only the record that is on now may end the session or bring the score back
    const mine = () => elRef.current === el;
    el.onended = () => { if (!mine()) return; elRef.current = null; setPlaying(null); audio.muteMusic(false); };
    const fail = () => { if (!mine()) return; elRef.current = null; audio.detach(el); setPlaying(null); setFailed(id); audio.muteMusic(false); };
    el.onerror = fail;
    el.play().catch(fail);
    fadeEl(el, 0, 0.85, 1400);
    setPlaying(id);
  };
  const stop = () => {
    const el = elRef.current;
    if (el) let_go(el, 500);
    elRef.current = null;
    setPlaying(null);
    audio.muteMusic(false);
  };

  return (
    <div className="radio-wrap" role="dialog" aria-label="Gramophone" data-testid="gramophone" onClick={() => { stop(); onClose(); }}>
      <div className="radio-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="radio-set gramo-set">
          <div className={`gramo-platter ${playing ? 'on' : ''}`} data-testid="gramo-now">
            {playing && RECORD_BY_ID[playing] ? <RecordDisc rec={RECORD_BY_ID[playing]} owned spinning size={150} /> : <span className="gramo-felt" />}
            <i className="gramo-arm" />
          </div>
          <p className="gramo-playing">{playing ? <><b>{label(playing)}</b><small>{RECORD_BY_ID[playing]?.performer} · {RECORD_BY_ID[playing]?.company}</small></> : <small>Pick a record from your shelf</small>}</p>
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
        <button className="btn radio-close" onClick={() => { stop(); onClose(); }} data-testid="gramophone-close">Close the lid</button>
      </div>
    </div>
  );
}
