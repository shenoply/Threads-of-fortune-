import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';

// Friendly titles for the records on offer.
const LABELS: Record<string, string> = {
  'title-hijaz': 'Threads of Fortune (Theme)',
  'nightingale-club': 'The Nightingale Club',
  'bu-geceyi-sev': 'Bu Geceyi Sev',
  'larg-nga-malet': 'Larg nga Malet',
  'sahil-al-layl': "Sahil al-Layl",
  'la-vie-du-levant': 'La Vie du Levant',
  'qamar-dimashq': 'Qamar Dimashq',
  'ya-layl-ya-ayn': 'Ya Layl Ya Ayn',
};
const label = (id: string) => LABELS[id] ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// The gramophone is a jukebox of finished songs, not every incidental theme cue the score also uses
// elsewhere (those play on their own as you move around); only offer the tracks named above, in this order.
const SONG_ORDER = Object.keys(LABELS);

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
  const elRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('audio/music/tracks.json')
      .then((r) => r.json())
      .then((m: Record<string, number>) => setTracks(SONG_ORDER.filter((id) => id in m)))
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
        <div className="radio-set">
          <div className={`radio-pic ${playing ? 'on' : ''}`}><img src="art/stall2/props/prop-gramophone.webp" alt="The gramophone" draggable={false} /></div>
        </div>
        <div className="radio-captions" data-testid="gramophone-list">
          {tracks === null && <p className="hint">Winding it up…</p>}
          {tracks?.length === 0 && <p className="hint">The records are packed away this trip.</p>}
          {failed && <p className="hint" data-testid="gramo-failed">The record would not play. <button className="btn small" onClick={() => play(failed)} data-testid="gramo-retry">Try again</button></p>}
          {tracks?.map((id) => (
            <button
              key={id}
              className={`btn gramo-track ${playing === id ? 'on' : ''}`}
              onClick={() => (playing === id ? stop() : play(id))}
              data-testid={`gramo-${id}`}
            >
              {playing === id ? '■' : '▶'} {label(id)}
            </button>
          ))}
        </div>
        <button className="btn radio-close" onClick={() => { stop(); onClose(); }} data-testid="gramophone-close">Close the lid</button>
      </div>
    </div>
  );
}
