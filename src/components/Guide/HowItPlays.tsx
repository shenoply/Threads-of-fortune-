// How it plays: one square tile per main feature, each a moving thumbnail of its film. Tap one and the
// film plays full screen: the game itself, screen by screen, with the narrator explaining each step and
// the words on screen. Take your time: nothing moves on until you choose. "Watch them all" plays the
// films one after another. The films are made by tools/how-films (capture.mjs, then compose.py).
import { useEffect, useRef, useState } from 'react';
import { HOW_FILMS } from '../../data/howFilms';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { radio } from '../../game/radio/player';
import './howItPlays.css';

export interface Feature { id: string; name: string; what: string }
export const FEATURES: Feature[] = [
  { id: 'stall', name: 'Selling at your stall', what: 'Wait for a buyer, lay a rug on the table and talk them round.' },
  { id: 'district', name: 'Walking Giza', what: 'Your lane in Giza is a map you walk.' },
  { id: 'rashid', name: 'Buying stock', what: 'Uncle Rashid sells you the rugs you sell on.' },
  { id: 'inspect', name: 'Inspecting a rug', what: 'Know what you are selling before you price it.' },
  { id: 'travel', name: 'Travelling', what: 'The whole region is open to you.' },
  { id: 'caravan', name: 'Your caravan', what: 'Everything you take on the road.' },
  { id: 'cafe', name: 'Chess and tawla', what: 'Bilgin’s coffee house, for an hour off.' },
  { id: 'news', name: 'Paper and radio', what: 'Every day is a real day of 1925.' },
].filter((f) => HOW_FILMS[f.id]);
const src = (id: string, kind: 'film' | 'loop' | 'poster') => (kind === 'film' ? `video/how/${id}.mp4` : kind === 'loop' ? `video/how/${id}-loop.mp4` : `video/how/${id}.webp`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** open How it plays from anywhere */
export const openHowItPlays = (id?: string) => window.dispatchEvent(new CustomEvent('tof-how', { detail: id }));

/** the moving thumbnail: a short silent loop that only plays while its tile is on screen */
function Loop({ id }: { id: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = v.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (failed) return <img className="how__clip" src={src(id, 'poster')} alt="" />;
  return <video ref={v} className="how__clip" src={src(id, 'loop')} poster={src(id, 'poster')} muted loop playsInline autoPlay preload="auto" onError={() => setFailed(true)} aria-hidden="true" />;
}

/** One film, full screen, with sound and captions. */
function Player({ at, all, onPick, onClose }: { at: number; all: boolean; onPick: (k: number) => void; onClose: () => void }) {
  const f = FEATURES[at];
  const film = HOW_FILMS[f.id];
  const v = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const next = at + 1 < FEATURES.length ? at + 1 : null;
  useEffect(() => { setT(0); setEnded(false); setPaused(false); setFailed(false); }, [at]);
  // the film has the stage: the music steps back, the radio and anyone talking stop
  useEffect(() => {
    voice.stop();
    if (radio.playing) radio.stop();
    audio.attenuate('how', true, 0.4, { music: 0, ambience: 0.15 });
    return () => audio.attenuate('how', false, 1.0);
  }, []);
  // watching them all: go on by itself a moment after each one ends
  useEffect(() => {
    if (!ended || !all || next === null) return;
    const h = window.setTimeout(() => onPick(next), 2500);
    return () => window.clearTimeout(h);
  }, [ended, all, next, onPick]);
  const cue = film.cues.find((c) => t >= c.start - 0.05 && t <= c.end + 0.6);
  const toggle = () => { const el = v.current; if (!el) return; if (el.paused) { void el.play(); setPaused(false); } else { el.pause(); setPaused(true); } };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const el = v.current; if (!el) return; const r = e.currentTarget.getBoundingClientRect(); el.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * film.length; setEnded(false); };
  return (
    <div className="how-play" role="dialog" aria-label={f.name} data-testid="how-view">
      {failed
        ? <img className="how-play__video" src={src(f.id, 'poster')} alt="" />
        : <video ref={v} key={f.id} className="how-play__video" src={src(f.id, 'film')} poster={src(f.id, 'poster')} autoPlay playsInline muted={muted} onClick={toggle}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onEnded={() => setEnded(true)} onError={() => setFailed(true)} data-testid="how-video" />}
      <div className="how-play__top">
        <div className="how-play__title"><small>{at + 1} of {FEATURES.length}</small><b>{f.name}</b></div>
        <button className="btn small" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Sound off'} data-testid="how-sound">{muted ? '🔇' : '🔊'}</button>
        <button className="btn small" onClick={onClose} aria-label="Close" data-testid="how-close-film">✕</button>
      </div>
      {(cue || failed) && !ended && <p className="how-play__caption" data-testid="how-caption">{failed ? film.cues.map((c) => c.text).join(' ') : cue!.text}</p>}
      {paused && !ended && <button className="how-play__big" onClick={toggle} aria-label="Play">▶</button>}
      {ended && (
        <div className="how-play__end" data-testid="how-end">
          <button className="btn" onClick={() => { const el = v.current; if (el) { el.currentTime = 0; void el.play(); } setEnded(false); }}>↺ Watch again</button>
          {next !== null ? <button className="btn primary" onClick={() => onPick(next)} data-testid="how-next">Next: {FEATURES[next].name} ›</button> : <button className="btn primary" onClick={onClose}>Done</button>}
        </div>
      )}
      <div className="how-play__bar">
        <button className="btn small" disabled={at === 0} onClick={() => onPick(at - 1)} aria-label="Previous" data-testid="how-prev">‹</button>
        <button className="btn small" onClick={toggle} aria-label={paused ? 'Play' : 'Pause'} data-testid="how-pause">{paused ? '▶' : '❚❚'}</button>
        <div className="how-play__track" onClick={seek}><i style={{ width: `${Math.min(100, (t / film.length) * 100)}%` }} /></div>
        <span className="how-play__time">{mmss(t)} / {mmss(film.length)}</span>
        <button className="btn small" disabled={next === null} onClick={() => next !== null && onPick(next)} aria-label="Next" data-testid="how-skip">›</button>
      </div>
    </div>
  );
}

export function HowItPlays({ onClose, start }: { onClose: () => void; start?: string }) {
  const [open, setOpen] = useState<number | null>(() => { const k = FEATURES.findIndex((f) => f.id === start); return k >= 0 ? k : null; });
  const [all, setAll] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') (open === null ? onClose() : setOpen(null)); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [open, onClose]);
  const total = FEATURES.reduce((n, f) => n + HOW_FILMS[f.id].length, 0);
  return (
    <div className="how" role="dialog" aria-label="How it plays" data-testid="how-it-plays">
      <div className="how__head">
        <div><small>Threads of Fortune</small><h2>How it plays</h2></div>
        <button className="btn small" onClick={onClose} aria-label="Close" data-testid="how-close">✕</button>
      </div>
      <p className="how__intro">Short narrated films of the game itself. Tap one to watch it full screen, with sound.</p>
      <button className="btn primary how__all" onClick={() => { setAll(true); setOpen(0); }} data-testid="how-all">▶ Watch them all · {Math.round(total / 60)} min</button>
      <div className="how__grid">
        {FEATURES.map((x, k) => (
          <button key={x.id} className="how__tile" onClick={() => { setAll(false); setOpen(k); }} data-testid={`how-${x.id}`}>
            <Loop id={x.id} />
            <span className="how__len">{mmss(HOW_FILMS[x.id].length)}</span>
            <span className="how__name">{x.name}<small>{x.what}</small></span>
          </button>
        ))}
      </div>
      {open !== null && <Player at={open} all={all} onPick={setOpen} onClose={() => { setOpen(null); setAll(false); }} />}
    </div>
  );
}
