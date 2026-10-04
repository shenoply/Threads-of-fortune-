// A short film the first time you meet someone: their video plays (its own sound kept low), then its
// last frame holds with a slow push-in while a documentary narrator finishes, with captions. A video
// that carries its own narration (Bilgin's) plays at the voices' level with no narrator over it, and
// if it cannot play its thumbnail and the introduction take over. Skip and sound off at any time;
// the music and the radio give way while it plays. If the browser will not start sound on its own,
// a Play button starts it from a tap.
import { useEffect, useRef, useState } from 'react';
import { INTRO_FILMS, type IntroCue } from '../../data/introFilms';
import { FILMS, type FilmId, type Still } from './films';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { radio } from '../../game/radio/player';
import './IntroFilm.css';

export { filmReady, filmDue, type FilmId } from './films';

export function IntroFilm({ id, title: titleIn, onDone }: { id: FilmId; title?: string; onDone: () => void }) {
  const film = FILMS[id];
  const title = titleIn ?? film.title;
  const script = INTRO_FILMS[id] as { length: number; cues: IntroCue[] } | undefined;
  const vol = useGame((s) => s.volumes);
  const video = useRef<HTMLVideoElement>(null);
  const voiceEl = useRef<HTMLAudioElement>(null);
  // 'video' while the film's own video is up; 'stills' for paintings (no video, or it could not play)
  const [mode, setMode] = useState<'video' | 'stills'>(film.video ? 'video' : 'stills');
  const [needTap, setNeedTap] = useState(false);
  const [held, setHeld] = useState(false);
  const [cue, setCue] = useState<IntroCue | null>(null);
  const [over, setOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [textAt, setTextAt] = useState(-1);
  const done = useRef(false);
  const started = useRef(false);
  const own = !!film.ownSound;
  const finish = () => { if (done.current) return; done.current = true; video.current?.pause(); voiceEl.current?.pause(); onDone(); };

  const level = (k: 'dialogue' | 'sfx') => Math.max(0, Math.min(1, (vol?.master ?? 1) * ((k === 'dialogue' ? vol?.dialogue : vol?.sfx) ?? 1)));
  // the narrator (or, with no script, the introduction as text over the thumbnail)
  const narrate = async () => {
    const a = voiceEl.current;
    if (!script || !a) { setTextAt((n) => Math.max(n, 0)); setNeedTap(false); return; }
    a.volume = level('dialogue');
    try { await a.play(); setNeedTap(false); } catch { setNeedTap(true); }
  };
  // the video could not play: its paintings take over, never a black screen
  const fail = () => {
    if (mode === 'stills' || done.current) return;
    setMode('stills');
    if (own) void narrate(); else setHeld(true);
  };

  const start = async () => {
    started.current = true;
    const v = video.current, a = voiceEl.current;
    if (mode === 'stills' || !v) { await narrate(); return; }
    if (own) {
      // the video speaks for itself, at the level of the voices
      v.muted = muted;
      v.volume = level('dialogue');
      try { await v.play(); setNeedTap(false); } catch (e) {
        if ((e as Error)?.name === 'NotAllowedError') setNeedTap(true); else fail();
      }
      return;
    }
    if (!a) return;
    a.volume = level('dialogue');
    v.volume = level('sfx') * 0.3;
    // the voice carries the film: if it cannot start without a tap, ask for one. The video is a bonus:
    // if this browser cannot play it, its picture holds with the slow push-in instead
    try { await a.play(); setNeedTap(false); } catch { setNeedTap(true); return; }
    v.play().catch(() => setHeld(true));
  };
  useEffect(() => { void start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // a film has the stage to itself: the score and the street step right back, the radio and anyone
  // talking stop, until it ends
  useEffect(() => {
    voice.stop();
    if (radio.playing) radio.stop();
    audio.attenuate('film', true, 0.4, { music: 0, ambience: 0.2 });
    return () => audio.attenuate('film', false, 1.2);
  }, []);
  // a video that never starts (missing, or the network gave up) is a failure too
  useEffect(() => {
    if (mode !== 'video' || !own) return;
    const t = window.setTimeout(() => { const v = video.current; if (v && v.currentTime < 0.05 && !needTap) fail(); }, 9000);
    return () => window.clearTimeout(t);
  }, [mode, needTap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // captions follow the narration
  useEffect(() => {
    const a = voiceEl.current; if (!a || !script) return;
    const tick = () => setCue(script.cues.find((c) => a.currentTime >= c.start && a.currentTime <= c.end + 0.25) ?? null);
    a.addEventListener('timeupdate', tick);
    return () => a.removeEventListener('timeupdate', tick);
  }, [script]);
  // the introduction as text: one line after another, at reading pace
  const lines = film.text ?? [];
  useEffect(() => {
    if (textAt < 0) return;
    if (textAt >= lines.length) { setOver(true); return; }
    const t = window.setTimeout(() => setTextAt((n) => n + 1), 2500 + lines[textAt].length * 45);
    return () => window.clearTimeout(t);
  }, [textAt, lines]);
  useEffect(() => { if (!over) return; const t = window.setTimeout(finish, 2500); return () => window.clearTimeout(t); }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (video.current) video.current.muted = muted;
    if (voiceEl.current) voiceEl.current.muted = muted;
  }, [muted]);

  const caption = cue?.text ?? (textAt >= 0 && textAt < lines.length ? lines[textAt] : '');
  const stillsLength = script?.length ?? Math.max(8, lines.reduce((n, l) => n + 2.5 + l.length * 0.045, 0));
  const fallbackStills = film.stills?.length ? film.stills : film.video ? [{ src: film.video.poster, fit: 'cover' as const, from: [1.05, 50, 50] as [number, number, number], to: [1.25, 50, 40] as [number, number, number] }] : [];

  return (
    <div className="film" role="dialog" aria-label={title} data-testid={`film-${id}`} data-mode={mode}>
      {mode === 'video' && film.video ? (
        <div className="film__frame">
          <img className="film__bg" src={film.video.poster} alt="" aria-hidden="true" />
          {own ? (
            <video ref={video} className="film__video" src={film.video.mp4} poster={film.video.poster} playsInline preload="auto" onEnded={() => setOver(true)} onError={fail} data-testid="film-video" />
          ) : (
            <video ref={video} className={`film__video ${held ? 'is-held' : ''}`} poster={film.video.poster} playsInline preload="auto" onEnded={() => setHeld(true)} onError={() => setHeld(true)} data-testid="film-video">
              {film.video.webm && <source src={film.video.webm} type="video/webm" />}
              <source src={film.video.mp4} type="video/mp4" />
            </video>
          )}
          {held && !film.after?.length && <img className="film__still" src={film.video.last} alt="" aria-hidden="true" />}
          {held && !!film.after?.length && script && <div className="film__after"><Stills stills={film.after} length={Math.max(4, script.length - (voiceEl.current?.currentTime ?? 0))} playing /></div>}
        </div>
      ) : (
        <Stills stills={fallbackStills} length={stillsLength} playing={!needTap} />
      )}
      {script && <audio ref={voiceEl} src={`audio/intro/${id}.mp3`} preload={own ? 'none' : 'auto'} onEnded={() => setOver(true)} data-testid="film-voice" />}
      <p className="film__title">{title}</p>
      <p className="film__caption" aria-live="polite" data-testid="film-caption">{caption}</p>
      <div className="film__btns">
        <button className="btn film__sound" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={muted} data-testid="film-sound">{muted ? '🔇' : '🔊'}</button>
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
              // a painting cropped to the screen keeps its focus in view (on a phone a wide painting
              // loses its sides), so the push-in lands on the person, not beside them
              ...(st.fit === 'cover' ? { objectPosition: `${st.to[1]}% ${st.to[2]}%` } : {}),
            }}
          />
        </div>
      ))}
    </div>
  );
}
