// A short cutscene inside an event card: silent video shots played in order with their own sound
// (docs/handoff/MALEK_VIDEO_AND_AUDIO_FOR_CLAUDE.md). Each shot has an effects track and timed cues
// (subtitles, a line of dialogue) driven by the video's own clock, not a timer, so pausing, hiding the
// tab or replaying never doubles or drifts a sound. Shots cut hard: the next one is already loaded and
// takes over only once it is playing, so there is no flash. If a shot cannot load, its still shows and
// the event carries on. Nothing here changes the game: the card around it applies the story step,
// once, when the player continues.
import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../game/audio/engine';
import { dialogueVolume, stopArranVoice } from '../../game/audio/arranVoice';
import { voice as charVoice, filmLock } from '../../game/audio/voice';
import { stopMalekArabic } from '../../game/audio/malekArabic';
import './Cutscene.css';

export interface CutsceneCue { at: number; until: number; who?: string; text: string; voice?: string }
export interface CutsceneShot { mp4: string; webm?: string; first: string; last: string; fx?: string; cues?: CutsceneCue[] }

/** H.264 where the browser can decode it (every phone), the WebM where it cannot */
let canH264: boolean | null = null;
function srcFor(s: CutsceneShot) {
  if (!s.webm) return s.mp4;
  if (canH264 == null) canH264 = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001F"');
  return canH264 ? s.mp4 : s.webm;
}
const fxVolume = () => (audio.toggles.sfx ? Math.max(0, Math.min(1, audio.volumes.master * audio.volumes.sfx)) : 0);

/** `skippable={false}` for a story moment you should not lose by a stray tap: no Skip button. */
export function Cutscene({ shots, title, onEnd, skippable = true }: { shots: CutsceneShot[]; title: string; onEnd?: () => void; skippable?: boolean }) {
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const fx = useRef<(HTMLAudioElement | null)[]>([]);
  const voice = useRef<HTMLAudioElement | null>(null);
  const fired = useRef(new Set<string>());
  const [shot, setShot] = useState(0);
  const [shown, setShown] = useState(0);
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'blocked' | 'done'>('idle');
  const [failed, setFailed] = useState<boolean[]>(() => shots.map(() => false));
  const [sound, setSound] = useState(true);
  const [subs, setSubs] = useState(true);
  const [cue, setCue] = useState<CutsceneCue | null>(null);
  const soundRef = useRef(sound); soundRef.current = sound;

  const stopSound = useCallback(() => {
    fx.current.forEach((a) => a?.pause());
    if (voice.current) { voice.current.pause(); voice.current = null; }
  }, []);
  const finish = useCallback(() => {
    stopSound();
    vids.current.forEach((v) => v?.pause());
    setCue(null);
    setState('done');
    audio.duckMusic(false);
    onEnd?.();
  }, [onEnd, stopSound]);

  // start a shot from its beginning (a player's Play / Replay is the gesture browsers want)
  const playShot = useCallback((i: number) => {
    const v = vids.current[i];
    setShot(i);
    if (!v || failed[i]) {
      // a shot that cannot load: its still, briefly, then on
      setShown(i);
      window.setTimeout(() => (i + 1 < shots.length ? playShot(i + 1) : finish()), 2200);
      return;
    }
    v.currentTime = 0;
    v.play().then(() => {
      setState('playing');
      audio.duckMusic(true);
      const a = fx.current[i];
      if (a) { a.currentTime = 0; a.volume = soundRef.current ? fxVolume() : 0; a.play().catch(() => {}); }
    }).catch(() => setState('blocked'));
  }, [failed, finish, shots.length]);

  const start = () => { fired.current.clear(); setShown(0); playShot(0); };

  // try to start on its own; a browser that wants a tap first gets a Play button
  useEffect(() => { filmLock.on(); charVoice.stop(); stopArranVoice(); stopMalekArabic(); audio.stopVoice(); start(); return () => { filmLock.off(); stopSound(); audio.duckMusic(false); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keep sound, subtitles and dialogue on the video's clock
  useEffect(() => {
    if (state !== 'playing') return;
    let raf = 0;
    const tick = () => {
      const v = vids.current[shot];
      if (v) {
        const t = v.currentTime;
        const a = fx.current[shot];
        if (a && !a.paused && Math.abs(a.currentTime - t) > 0.15) a.currentTime = t; // drift or a buffering stall
        const cues = shots[shot].cues ?? [];
        setCue(cues.find((c) => t >= c.at && t < c.until) ?? null);
        cues.forEach((c, k) => {
          const key = `${shot}:${k}`;
          if (c.voice && t >= c.at && t < c.until && !fired.current.has(key)) {
            fired.current.add(key);
            const vol = dialogueVolume();
            if (soundRef.current && vol > 0) { const el = audio.attach(new Audio(c.voice), 'dialogue'); voice.current = el; el.play().catch(() => {}); }
          }
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, shot, shots]);

  // a hidden tab pauses everything; coming back resumes in step
  useEffect(() => {
    const onVis = () => {
      const v = vids.current[shot];
      if (document.hidden && state === 'playing') { v?.pause(); stopSound(); setState('paused'); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [state, shot, stopSound]);

  const resume = () => {
    const v = vids.current[shot]; if (!v) return;
    v.play().then(() => {
      setState('playing');
      const a = fx.current[shot];
      if (a) { a.currentTime = v.currentTime; a.volume = sound ? fxVolume() : 0; a.play().catch(() => {}); }
    }).catch(() => setState('blocked'));
  };
  const pause = () => { vids.current[shot]?.pause(); stopSound(); setState('paused'); };
  const toggleSound = () => {
    const on = !sound; setSound(on);
    fx.current.forEach((a) => { if (a) a.volume = on ? fxVolume() : 0; });
    if (!on && voice.current) { voice.current.pause(); voice.current = null; }
  };

  return (
    <div className="cut" data-testid="cutscene" data-shot={shot} data-state={state} aria-label={title}>
      <div className="cut__frame">
        {shots.map((s, i) => (
          <div key={s.mp4} className={`cut__shot ${i === shown ? 'is-on' : ''}`}>
            {failed[i]
              ? <img src={s.last} alt="" className="cut__media" />
              : (
                <video
                  ref={(el) => { vids.current[i] = el; }}
                  className="cut__media"
                  muted
                  playsInline
                  preload={i <= shot + 1 ? 'auto' : 'metadata'}
                  poster={s.first}
                  data-testid={`cutscene-video-${i}`}
                  onPlaying={() => setShown(i)}
                  onEnded={() => { fx.current[i]?.pause(); if (i + 1 < shots.length) playShot(i + 1); else finish(); }}
                  src={srcFor(s)}
                  onError={() => setFailed((f) => f.map((x, k) => (k === i ? true : x)))}
                />
              )}
            {s.fx && <audio ref={(el) => { fx.current[i] = el; }} src={s.fx} preload="auto" />}
          </div>
        ))}
        {subs && cue && <p className="cut__sub" data-testid="cutscene-sub">{cue.who && <b>{cue.who}</b>}{cue.text}</p>}
        {(state === 'blocked' || state === 'idle') && <button className="cut__play btn primary" onClick={() => (state === 'idle' ? start() : resume())} data-testid="cutscene-play">▶ Play</button>}
      </div>
      <div className="cut__bar">
        {state === 'playing' && <button className="btn small" onClick={pause} data-testid="cutscene-pause">Pause</button>}
        {state === 'paused' && <button className="btn small" onClick={resume} data-testid="cutscene-resume">Resume</button>}
        {state === 'done' && <button className="btn small" onClick={start} data-testid="cutscene-replay">Watch again</button>}
        <button className="btn small" onClick={toggleSound} aria-pressed={sound} data-testid="cutscene-sound">{sound ? 'Sound on' : 'Sound off'}</button>
        <button className="btn small" onClick={() => setSubs(!subs)} aria-pressed={subs} data-testid="cutscene-subs">{subs ? 'Subtitles on' : 'Subtitles off'}</button>
        {skippable && state !== 'done' && <button className="btn small" onClick={finish} data-testid="cutscene-skip">Skip</button>}
      </div>
    </div>
  );
}
