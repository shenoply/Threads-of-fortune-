// Dr Feras's clinic in Cairo. The approved empty clinic room is the scene; the first time you come in,
// his introduction film plays inside that same scene (Skip / Esc, sound on or off), then the room
// returns. Below it: a consultation for whatever you have, and his medical book of every illness and
// injury in the game, which is how he explains them.
import { useEffect, useRef, useState } from 'react';
import { useGame, TREAT_FEE } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { DISEASES, DISEASE, TIER_LABEL, type Disease } from '../../game/systems/disease';
import { MedicalBook } from './MedicalBook';
import { ConsultScene, BookPage } from './Consult';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { radio } from '../../game/radio/player';
import './Clinic.css';

const ROOM = 'art/clinic/feras-clinic-interior.webp';
const FILM = 'video/clinic/feras-introduction.mp4';
const PORTRAIT = 'art/portraits/feras.webp';
const plate = (id: string) => `art/clinic/plates/${id}.webp`;
const CAPTION = 'Doctor Feras runs this Cairo clinic. He treats illness and injury, explains your condition, and helps you get back to business.';

/** A case on demand: Feras talks it through as if you had walked in with it (his voice and his words),
 *  with the plate from his book. For trying any of them out. */
function CaseRun({ d, onBook, onBack }: { d: Disease; onBook: () => void; onBack: () => void }) {
  const g = useGame();
  const a = useRef<HTMLAudioElement>(null);
  const [pic, setPic] = useState(true);
  const [big, setBig] = useState(false);
  const [note, setNote] = useState('');
  const has = (g.illnesses ?? []).some((x) => x.id === d.id);
  useEffect(() => {
    voice.stop();
    audio.attenuate('feras', true, 0.3, { music: 0.15, ambience: 0.3 });
    a.current?.play().catch(() => {});
    return () => { a.current?.pause(); audio.attenuate('feras', false, 0.8); };
  }, [d.id]);
  return (
    <div className="cl-run" data-testid={`case-run-${d.id}`}>
      <button className="linkish cl-back" onClick={onBack} data-testid="case-back">‹ All cases</button>
      <div className="cl-run-head">
        <img src={PORTRAIT} alt="" />
        <div><b>{d.name}</b><small>{TIER_LABEL[d.tier]} {d.kind === 'injury' ? 'injury' : 'disease'} · Dr Feras explains</small></div>
      </div>
      {/* the two of them at his desk, the book open at this case (tools/feras-desk-both.py); tap for the page */}
      <img className={pic ? 'cl-desk' : 'cl-run-plate'} src={pic ? `art/clinic/both/${d.id}.webp` : plate(d.id)} alt={`Dr Feras points to the plate of ${d.name.toLowerCase()} in his book`} onError={() => setPic(false)} onClick={() => setBig(true)} style={{ cursor: 'zoom-in' }} data-testid="case-desk" />
      {big && <BookPage id={d.id} onClose={() => setBig(false)} />}
      <p className="cl-feras">“{d.doctor}”</p>
      <audio ref={a} src={`audio/feras/${d.id}.mp3`} preload="auto" data-testid="feras-voice" />
      <div className="cl-case-btns">
        <button className="btn" onClick={() => { const el = a.current; if (el) { el.currentTime = 0; void el.play(); } }} data-testid="case-replay">▶ Hear him again</button>
        <button className="btn" onClick={onBook} data-testid="case-chapter">Read the chapter</button>
        <button className="btn" disabled={has} onClick={() => setNote(g.catchForTest(d.id))} data-testid="case-catch">{has ? 'You have it now' : 'Give me this, to test'}</button>
      </div>
      {note && <p className="cl-note">{note}</p>}
    </div>
  );
}

function Cases({ onBook }: { onBook: (id: string) => void }) {
  const [run, setRun] = useState<string | null>(null);
  const d = run ? DISEASE(run) : null;
  if (d) return <CaseRun d={d} onBack={() => setRun(null)} onBook={() => onBook(d.id)} />;
  return (
    <div className="cl-cases" data-testid="clinic-cases">
      <p className="cl-intro">Pick any illness or injury and Dr Feras will talk you through it as if you had come in with it.</p>
      {(['disease', 'injury'] as const).map((k) => (
        <section key={k}>
          <h4>{k === 'disease' ? 'Diseases' : 'Injuries'}</h4>
          <div className="cl-index">
            {DISEASES.filter((x) => x.kind === k).map((x) => <button key={x.id} className="cl-entry" onClick={() => setRun(x.id)} data-testid={`case-${x.id}`}><b>{x.name}</b><small>{TIER_LABEL[x.tier]}</small></button>)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Clinic({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const seen = (g.introSeen ?? []).includes('feras');
  const [intro, setIntro] = useState(!seen);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<'consult' | 'cases'>('consult');
  // the book opens full screen, over the clinic, like picking it up off his desk
  const [book, setBook] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const v = useRef<HTMLVideoElement>(null);
  const ill = g.illnesses ?? [];
  // with something wrong, the doctor starts talking as soon as you sit down (after his film, the first time)
  const [consulting, setConsulting] = useState<string | null>(null);
  const began = useRef(false);
  useEffect(() => { if (!intro && !began.current && ill.length) { began.current = true; setConsulting((ill.find((x) => !x.treated) ?? ill[0]).id); } }, [intro]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <section className={`clinic${consulting && tab === 'consult' && !intro ? ' consulting' : ''}`} aria-label="Dr Feras's clinic" data-testid="clinic">
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
          <button role="tab" aria-selected={tab === 'cases'} className={tab === 'cases' ? 'on' : ''} onClick={() => setTab('cases')} data-testid="clinic-cases-tab">Ask about any case</button>
          <button className="cl-booktab" onClick={() => setBook('')} data-testid="clinic-book">His book</button>
        </div>
        {tab === 'consult' ? (
          <div className="cl-consult">
            {ill.length === 0 && <p className="cl-intro">Nothing ails you today. Read his book: it is cheaper than his fee.</p>}
            {consulting && ill.some((x) => x.id === consulting)
              ? <ConsultScene key={consulting} id={consulting} onDone={() => setConsulting(null)} />
              : ill.map((il) => {
                const d = DISEASE(il.id); if (!d) return null;
                const left = Math.max(1, il.until - g.day);
                return (
                  <div key={il.id} className="cl-case" data-testid={`case-${il.id}`}>
                    <div className="cl-case-head"><b>{d.name}</b><small>{TIER_LABEL[d.tier]} · about {left} day{left === 1 ? '' : 's'} more</small></div>
                    <div className="cl-case-btns">
                      {il.treated ? <span className="cl-done">Treated</span> : null}
                      <button className="btn primary" onClick={() => setConsulting(il.id)} data-testid={`talk-${il.id}`}>{il.treated ? 'Talk to him again' : 'Talk it through with him'}</button>
                      <button className="btn" onClick={() => setBook(il.id)} data-testid={`read-${il.id}`}>Read his page</button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : <Cases onBook={(id) => setBook(id)} />}
      </div>
      {book !== null && (
        <div className="mb-reader" role="dialog" aria-label="Dr Feras's book" data-testid="book-reader">
          <div className="mb-reader-head"><b>Dr Feras’s book</b><button className="btn small" onClick={() => setBook(null)} data-testid="book-close">Close the book</button></div>
          <div className="mb-reader-body"><MedicalBook key={book || 'contents'} start={book || undefined} /></div>
        </div>
      )}
    </section>
  );
}
