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

/** Ramp a plain <audio> element's volume, since it has no built-in gain scheduling of its own.
 *  Used so a chosen record rises in (and falls out) instead of slamming in at full volume the
 *  instant whatever was already playing gets cut. */
function fadeEl(el: HTMLAudioElement, to: number, ms: number) {
  const from = el.volume;
  const start = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / ms);
    el.volume = from + (to - from) * t;
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

  useEffect(() => () => { elRef.current?.pause(); audio.muteMusic(false); }, []);

  const play = (id: string) => {
    audio.sfx('tap');
    audio.ensure();
    // switching records: the old one drops out quickly, the new one still rises on its own fade-in
    // below, so there's a brief overlap rather than one cutting dead before the next is heard
    if (elRef.current) { const prev = elRef.current; fadeEl(prev, 0, 300); setTimeout(() => prev.pause(), 320); }
    audio.muteMusic(true, 1.1);
    const el = new Audio(`audio/music/${id}.mp3`);
    el.volume = 0;
    el.onended = () => { setPlaying(null); audio.muteMusic(false); };
    el.play().catch(() => {});
    fadeEl(el, 0.85, 1400);
    elRef.current = el;
    setPlaying(id);
  };
  const stop = () => {
    const el = elRef.current;
    if (el) { fadeEl(el, 0, 500); setTimeout(() => el.pause(), 520); }
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
