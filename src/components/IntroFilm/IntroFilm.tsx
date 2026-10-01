// A short film the first time you meet someone: their video plays (its own sound kept low), then its
// last frame holds with a slow push-in while a documentary narrator finishes, with captions. Skip at
// any time. If the browser will not start sound on its own, a Play button starts it from a tap.
import { useEffect, useRef, useState } from 'react';
import { INTRO_FILMS, type IntroCue } from '../../data/introFilms';
import { useGame } from '../../game/state/store';
import './IntroFilm.css';

export type FilmId = 'malek' | 'arran';
/** the films there are footage for: Arran's waits for its video */
export const FILM_VIDEO: Record<FilmId, { video: string; webm?: string; poster: string; last: string } | null> = {
  malek: { video: 'video/malek-intro.mp4', webm: 'video/malek-intro.webm', poster: 'video/malek-intro-poster.webp', last: 'video/malek-intro-last.webp' },
  arran: null,
};
export const filmReady = (id: FilmId) => !!FILM_VIDEO[id] && !!INTRO_FILMS[id];

export function IntroFilm({ id, title, onDone }: { id: FilmId; title: string; onDone: () => void }) {
  const film = FILM_VIDEO[id]!;
  const script = INTRO_FILMS[id];
  const vol = useGame((s) => s.volumes);
  const video = useRef<HTMLVideoElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const [needTap, setNeedTap] = useState(false);
  const [held, setHeld] = useState(false);
  const [cue, setCue] = useState<IntroCue | null>(null);
  const [over, setOver] = useState(false);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; video.current?.pause(); voice.current?.pause(); onDone(); };

  const start = async () => {
    const v = video.current, a = voice.current;
    if (!v || !a) return;
    const master = vol?.master ?? 1;
    a.volume = Math.max(0, Math.min(1, master * (vol?.dialogue ?? 1)));
    v.volume = Math.max(0, Math.min(1, master * (vol?.sfx ?? 1) * 0.3));
    // the voice carries the film: if it cannot start without a tap, ask for one. The video is a bonus:
    // if this browser cannot play it, its picture holds with the slow push-in instead
    try { await a.play(); setNeedTap(false); } catch { setNeedTap(true); return; }
    v.play().catch(() => setHeld(true));
  };
  useEffect(() => { void start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // captions follow the narration
  useEffect(() => {
    const a = voice.current; if (!a) return;
    const tick = () => setCue(script.cues.find((c) => a.currentTime >= c.start && a.currentTime <= c.end + 0.25) ?? null);
    a.addEventListener('timeupdate', tick);
    return () => a.removeEventListener('timeupdate', tick);
  }, [script]);
  useEffect(() => { if (!over) return; const t = window.setTimeout(finish, 2500); return () => window.clearTimeout(t); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="film" role="dialog" aria-label={title} data-testid={`film-${id}`}>
      <div className="film__frame">
        <img className="film__bg" src={film.poster} alt="" aria-hidden="true" />
        <video ref={video} className={`film__video ${held ? 'is-held' : ''}`} poster={film.poster} playsInline preload="auto" onEnded={() => setHeld(true)} onError={() => setHeld(true)} data-testid="film-video">
          {film.webm && <source src={film.webm} type="video/webm" />}
          <source src={film.video} type="video/mp4" />
        </video>
        {held && <img className="film__still" src={film.last} alt="" aria-hidden="true" />}
      </div>
      <audio ref={voice} src={`audio/intro/${id}.mp3`} preload="auto" onEnded={() => setOver(true)} data-testid="film-voice" />
      <p className="film__title">{title}</p>
      <p className="film__caption" aria-live="polite" data-testid="film-caption">{cue?.text ?? ''}</p>
      <div className="film__btns">
        {needTap && <button className="btn primary" onClick={() => void start()} data-testid="film-play">▶ Play the film</button>}
        {over ? <button className="btn primary" onClick={finish} data-testid="film-continue">Continue</button>
          : <button className="btn" onClick={finish} data-testid="film-skip">Skip</button>}
      </div>
    </div>
  );
}
