// Dr Feras's clinic in Cairo. The approved empty clinic room is the scene; the first time you come in,
// his introduction film plays inside that same scene (Skip / Esc, sound on or off), then the room
// returns. Below it: a consultation for whatever you have, and his medical book of every illness and
// injury in the game, which is how he explains them.
import { useEffect, useRef, useState } from 'react';
import { useGame, TREAT_FEE } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { DISEASES, DISEASE, TIER_LABEL, type Disease, type Effects } from '../../game/systems/disease';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { radio } from '../../game/radio/player';
import './Clinic.css';

const ROOM = 'art/clinic/feras-clinic-interior.webp';
const FILM = 'video/clinic/feras-introduction.mp4';
const PORTRAIT = 'art/portraits/feras.webp';
const plate = (id: string) => `art/clinic/plates/${id}.webp`;
const CAPTION = 'Doctor Feras runs this Cairo clinic. He treats illness and injury, explains your condition, and helps you get back to business.';

const EFFECT_WORDS: [keyof Effects, string, (v: number) => string][] = [
  ['fatigue', 'Tiredness', (v) => `+${v} a day`],
  ['hours', 'Stall hours lost', (v) => `${v} a day`],
  ['focus', 'Patience when haggling', (v) => `${v}`],
  ['trust', 'Buyers’ trust', (v) => `${v}`],
  ['speed', 'Travel speed', (v) => `${v}%`],
  ['carry', 'What you can carry', (v) => `${v}%`],
  ['sight', 'Judging a rug by eye', (v) => `${v}%`],
];
const effectsOf = (d: Disease) => EFFECT_WORDS.filter(([k]) => d.effects[k]).map(([k, label, f]) => `${label} ${f(d.effects[k]!)}`);
const deadliness = (f: number) => (f >= 0.2 ? 'Often fatal' : f >= 0.05 ? 'Can kill' : f >= 0.01 ? 'Rarely fatal' : f > 0 ? 'Almost never fatal' : 'Not fatal');

/** a page of Feras's book */
function Page({ d, onBack }: { d: Disease; onBack: () => void }) {
  const [pic, setPic] = useState(true);
  return (
    <article className="cl-page" data-testid={`book-page-${d.id}`}>
      <button className="linkish cl-back" onClick={onBack} data-testid="book-back">‹ The book</button>
      <h3>{d.name}</h3>
      <small className={`cl-tier t-${d.tier}`}>{d.kind === 'injury' ? 'Injury' : 'Disease'} · {TIER_LABEL[d.tier]} · {deadliness(d.fatality)}</small>
      {pic && <img className="cl-plate" src={plate(d.id)} alt="" onError={() => setPic(false)} />}
      <p className="cl-feras">“{d.doctor}”</p>
      <dl>
        <div><dt>How it comes</dt><dd>{d.cause}</dd></div>
        <div><dt>What you feel</dt><dd>{d.symptom}</dd></div>
        <div><dt>How long</dt><dd>{d.days[0]}–{d.days[1]} days</dd></div>
        {effectsOf(d).length > 0 && <div><dt>While it lasts</dt><dd>{effectsOf(d).join(' · ')}</dd></div>}
      </dl>
    </article>
  );
}

function Book({ start }: { start?: string }) {
  const [open, setOpen] = useState<string | null>(start ?? null);
  const [kind, setKind] = useState<'disease' | 'injury'>('disease');
  const d = open ? DISEASE(open) : null;
  if (d) return <Page d={d} onBack={() => setOpen(null)} />;
  const list = DISEASES.filter((x) => x.kind === kind);
  return (
    <div className="cl-book" data-testid="feras-book">
      <p className="cl-intro">His own book, with a teaching plate for each page. "Read it before you come to me, and you will waste less of my time."</p>
      <div className="cl-tabs" role="tablist">
        <button role="tab" aria-selected={kind === 'disease'} className={kind === 'disease' ? 'on' : ''} onClick={() => setKind('disease')} data-testid="book-diseases">Diseases · {DISEASES.filter((x) => x.kind === 'disease').length}</button>
        <button role="tab" aria-selected={kind === 'injury'} className={kind === 'injury' ? 'on' : ''} onClick={() => setKind('injury')} data-testid="book-injuries">Injuries · {DISEASES.filter((x) => x.kind === 'injury').length}</button>
      </div>
      {(['common', 'uncommon', 'rare', 'extreme'] as const).map((t) => {
        const rows = list.filter((x) => x.tier === t);
        return rows.length ? (
          <section key={t}>
            <h4>{TIER_LABEL[t]}</h4>
            <div className="cl-index">
              {rows.map((x) => <button key={x.id} className="cl-entry" onClick={() => setOpen(x.id)} data-testid={`book-${x.id}`}><b>{x.name}</b><small>{x.symptom}</small></button>)}
            </div>
          </section>
        ) : null;
      })}
    </div>
  );
}

export function Clinic({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const seen = (g.introSeen ?? []).includes('feras');
  const [intro, setIntro] = useState(!seen);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<'consult' | 'book'>('consult');
  const [bookAt, setBookAt] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const v = useRef<HTMLVideoElement>(null);
  const ill = g.illnesses ?? [];

  const endIntro = () => { v.current?.pause(); setIntro(false); setBlocked(false); g.markIntroSeen('feras'); };
  // the film has the stage while it plays: music down, radio and voices stop; Esc skips it
  useEffect(() => {
    if (!intro) return;
    voice.stop(); if (radio.playing) radio.stop();
    audio.attenuate('clinic', true, 0.4, { music: 0, ambience: 0.15 });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); endIntro(); } };
    window.addEventListener('keydown', key, true);
    const el = v.current;
    if (el) el.play().catch(() => setBlocked(true));
    return () => { window.removeEventListener('keydown', key, true); audio.attenuate('clinic', false, 1.0); };
  }, [intro]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="clinic" aria-label="Dr Feras's clinic" data-testid="clinic">
      <header className="cl-head">
        <div><strong>Dr Feras’s clinic</strong><small>Cairo · 1925</small></div>
        <span className="cl-cash">{fmt(g.cash)}</span>
        <button className="btn" onClick={() => { if (intro) endIntro(); onClose(); }} data-testid="clinic-leave">Leave</button>
      </header>
      <div className="cl-scene" data-testid="clinic-scene">
        <img className="cl-room" src={ROOM} alt="Dr Feras's consulting room" draggable={false} />
        {intro && (
          <div className="cl-film" data-testid="clinic-intro">
            <video ref={v} src={FILM} poster={ROOM} playsInline preload="metadata" muted={muted} onEnded={endIntro} onError={endIntro} data-testid="clinic-video" />
            {blocked && <button className="btn primary cl-play" onClick={() => { setBlocked(false); v.current?.play().catch(() => endIntro()); }} data-testid="clinic-play">▶ Play introduction</button>}
            <p className="cl-caption">{CAPTION}</p>
            <div className="cl-film-btns">
              <button className="btn small" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Sound off'} data-testid="clinic-sound">{muted ? '🔇' : '🔊'}</button>
              <button className="btn small" onClick={endIntro} data-testid="clinic-skip">Skip</button>
            </div>
          </div>
        )}
      </div>
      <div className={`cl-panel${intro ? ' locked' : ''}`} aria-hidden={intro || undefined}>
        <div className="cl-doctor">
          <img src={PORTRAIT} alt="" />
          <div>
            <b>Dr Feras</b>
            <small>{ill.length ? '"Sit down. Tell me where it hurts, and how long."' : '"You look well enough. Good. Then let me show you what I would rather you never catch."'}</small>
          </div>
          {seen && <button className="btn small" onClick={() => setIntro(true)} data-testid="clinic-replay">▶ Film</button>}
        </div>
        <div className="cl-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'consult'} className={tab === 'consult' ? 'on' : ''} onClick={() => setTab('consult')} data-testid="clinic-consult">Consultation{ill.length ? ` · ${ill.length}` : ''}</button>
          <button role="tab" aria-selected={tab === 'book'} className={tab === 'book' ? 'on' : ''} onClick={() => { setBookAt(undefined); setTab('book'); }} data-testid="clinic-book">His medical book</button>
        </div>
        {note && <p className="cl-note" data-testid="clinic-note">{note}</p>}
        {tab === 'consult' ? (
          <div className="cl-consult">
            {ill.length === 0 && <p className="cl-intro">Nothing ails you today. Read his book: it is cheaper than his fee.</p>}
            {ill.map((il) => {
              const d = DISEASE(il.id); if (!d) return null;
              const left = Math.max(1, il.until - g.day);
              return (
                <div key={il.id} className="cl-case" data-testid={`case-${il.id}`}>
                  <div className="cl-case-head"><b>{d.name}</b><small>{TIER_LABEL[d.tier]} · about {left} day{left === 1 ? '' : 's'} more</small></div>
                  <p className="cl-feras">“{d.doctor}”</p>
                  <div className="cl-case-btns">
                    {il.treated ? <span className="cl-done">Treated</span> : <button className="btn primary" disabled={g.cash < TREAT_FEE[d.tier]} onClick={() => setNote(g.treatIllness(il.id))} data-testid={`treat-${il.id}`}>Treat it · {fmt(TREAT_FEE[d.tier])}</button>}
                    <button className="btn" onClick={() => { setBookAt(il.id); setTab('book'); }} data-testid={`read-${il.id}`}>Read his page</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Book key={bookAt ?? 'index'} start={bookAt} />}
      </div>
    </section>
  );
}
