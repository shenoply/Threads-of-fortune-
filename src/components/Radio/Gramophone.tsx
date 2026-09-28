import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';

// Friendly titles for tracks whose key doesn't read well title-cased; everything else falls back to that.
const LABELS: Record<string, string> = {
  'khan-bayati': 'Khan, Bayati',
  'khan-rast': 'Khan, Rast',
  'khan-kurd': 'Khan, Kurd',
  'palace-rast': 'At the Palace, Rast',
  'palace-nahawand': 'At the Palace, Nahawand',
  'road-hijaz': 'On the Road, Hijaz',
  'road-bayati': 'On the Road, Bayati',
  'evening-saba': 'Evening, Saba',
  'evening-bayati': 'Evening, Bayati',
  auction: 'The Auction Room',
  'salon-waltz': 'A Waltz for the Salon',
  'istanbul-ussak': 'Istanbul, Ussak',
  'title-hijaz': 'Threads of Fortune (Theme)',
  'nightingale-club': 'The Nightingale Club',
  'bu-geceyi-sev': 'Bu Geceyi Sev',
  'larg-nga-malet': 'Larg nga Malet',
  'sahil-al-layl': "Sahil al-Layl",
  'la-vie-du-levant': 'La Vie du Levant',
};
const label = (id: string) => LABELS[id] ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** The gramophone on the shelf: pick any recording you have collected and it plays through the horn,
 *  ducking whatever ambient theme is already going, the way the radio ducks it for the bulletin. */
export function Gramophone({ onClose }: { onClose: () => void }) {
  const [tracks, setTracks] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const elRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('audio/music/tracks.json').then((r) => r.json()).then((m: Record<string, number>) => setTracks(Object.keys(m))).catch(() => setTracks([]));
  }, []);

  useEffect(() => () => { elRef.current?.pause(); audio.duckMusic(false); }, []);

  const play = (id: string) => {
    audio.sfx('tap');
    audio.ensure();
    if (elRef.current) { elRef.current.pause(); elRef.current = null; }
    audio.duckMusic(true);
    const el = new Audio(`audio/music/${id}.mp3`);
    el.volume = 0.85;
    el.onended = () => { setPlaying(null); audio.duckMusic(false); };
    el.play().catch(() => {});
    elRef.current = el;
    setPlaying(id);
  };
  const stop = () => {
    elRef.current?.pause();
    elRef.current = null;
    setPlaying(null);
    audio.duckMusic(false);
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
