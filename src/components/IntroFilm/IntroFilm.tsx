// A short film the first time you meet someone: their video plays (its own sound kept low), then its
// last frame holds with a slow push-in while a documentary narrator finishes, with captions. Skip at
// any time. If the browser will not start sound on its own, a Play button starts it from a tap.
import { useEffect, useRef, useState } from 'react';
import { INTRO_FILMS, type IntroCue } from '../../data/introFilms';
import { FILMS, type FilmId, type Still } from './films';
import { useGame } from '../../game/state/store';
import './IntroFilm.css';

export { filmReady, filmDue, type FilmId } from './films';

export function IntroFilm({ id, title: titleIn, onDone }: { id: FilmId; title?: string; onDone: () => void }) {
  const film = FILMS[id];
  const title = titleIn ?? film.title;
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
    if (!a) return;
    const master = vol?.master ?? 1;
    a.volume = Math.max(0, Math.min(1, master * (vol?.dialogue ?? 1)));
    if (v) v.volume = Math.max(0, Math.min(1, master * (vol?.sfx ?? 1) * 0.3));
    // the voice carries the film: if it cannot start without a tap, ask for one. The video is a bonus:
    // if this browser cannot play it, its picture holds with the slow push-in instead
    try { await a.play(); setNeedTap(false); } catch { setNeedTap(true); return; }
    if (v) v.play().catch(() => setHeld(true));
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
      {film.video ? (
        <div className="film__frame">
          <img className="film__bg" src={film.video.poster} alt="" aria-hidden="true" />
          <video ref={video} className={`film__video ${held ? 'is-held' : ''}`} poster={film.video.poster} playsInline preload="auto" onEnded={() => setHeld(true)} onError={() => setHeld(true)} data-testid="film-video">
            {film.video.webm && <source src={film.video.webm} type="video/webm" />}
            <source src={film.video.mp4} type="video/mp4" />
          </video>
          {held && !film.after?.length && <img className="film__still" src={film.video.last} alt="" aria-hidden="true" />}
          {held && !!film.after?.length && <div className="film__after"><Stills stills={film.after} length={Math.max(4, script.length - (voice.current?.currentTime ?? 0))} playing /></div>}
        </div>
      ) : (
        <Stills stills={film.stills ?? []} length={script.length} playing={!needTap} />
      )}
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

/** The paintings, one after another across the narration, each with a slow pan and a cross-fade. */
function Stills({ stills, length, playing }: { stills: Still[]; length: number; playing: boolean }) {
  const [i, setI] = useState(0);
  const each = Math.max(4, length / Math.max(1, stills.length));
  useEffect(() => {
    if (!playing || i >= stills.length - 1) return;
    const t = window.setTimeout(() => setI((n) => n + 1), each * 1000);
    return () => window.clearTimeout(t);
  }, [i, playing, each, stills.length]);
  return (
    <div className="film__frame" data-testid="film-stills" data-frame={i}>
      {stills.map((st, k) => (k === i || k === i - 1) && (
        <div key={st.src} className={`film__panel ${k === i ? 'is-on' : 'is-off'}`}>
          {st.fit === 'contain' && <img className="film__bg" src={st.src} alt="" aria-hidden="true" />}
          <img
            className={`film__pan film__pan--${st.fit}`}
            src={st.src}
            alt=""
            aria-hidden="true"
            style={{
              ['--s0' as string]: st.from[0], ['--s1' as string]: st.to[0],
              ['--o0' as string]: `${st.from[1]}% ${st.from[2]}%`, ['--o1' as string]: `${st.to[1]}% ${st.to[2]}%`,
              animationDuration: `${each + 1.5}s`, animationPlayState: playing ? 'running' : 'paused',
            }}
          />
        </div>
      ))}
    </div>
  );
}
