// A consultation with Dr Feras, played like a buyer at the stall: one picture across his desk (Hassan
// sitting opposite him), the words in a bubble over it. He asks, you answer; he opens his book at your
// condition (the desk picture, his finger on the page), then the page itself fills the screen while
// his voice reads it; when he has finished (or you skip), it is back to the two of you at the desk to
// settle the treatment.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, TREAT_FEE } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { DISEASE, TIER_LABEL } from '../../game/systems/disease';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';
import { MedicalBook } from './MedicalBook';

const DESK = 'art/clinic/feras-desk-pov.webp';
/** the two of them at his desk, from the introduction film: a short loop, and its still */
const BOTH = 'video/clinic/feras-desk-loop.mp4';
const BOTH_STILL = 'art/clinic/feras-desk-both.webp';
const deskWith = (id: string) => `art/clinic/desk/${id}.webp`;

/** Full-screen picture (kept for anything else that wants one). */
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  return (
    <div className="cl-lightbox" role="dialog" aria-label={alt} onClick={onClose} data-testid="lightbox">
      <img src={src} alt={alt} />
      <button className="btn cl-lb-x" onClick={onClose} data-testid="lightbox-close">Close ×</button>
    </div>
  );
}

/** His book open at one chapter, full screen, over everything; his voice (outside it) carries on. */
export function BookPage({ id, onClose, speaking, onReplay, caption }: { id: string; onClose: () => void; speaking?: boolean; onReplay?: () => void; caption?: string }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  return createPortal(
    <div className="mb-reader cl-bookpage" role="dialog" aria-label="Dr Feras's book" data-testid="book-page-view">
      <div className="mb-reader-head">
        <b>{speaking ? 'Dr Feras reads from his book…' : 'Dr Feras’s book'}</b>
        <span className="cl-bp-btns">
          {onReplay && <button className="btn small" onClick={onReplay} data-testid="plate-replay">▶ Again</button>}
          <button className="btn small primary" onClick={onClose} data-testid="plate-skip">{speaking ? 'Back to the desk ▸' : 'Close'}</button>
        </span>
      </div>
      <div className="mb-reader-body"><MedicalBook key={id} start={id} /></div>
      {caption && <p className="cl-bp-caption" data-testid="feras-caption"><small>Dr Feras</small>{caption}</p>}
    </div>,
    document.body,
  );
}

/** "You are…" narration turned into what you would say */
const inFirstPerson = (t: string) => t.replace(/\bYou are\b/g, 'I am').replace(/\bYou're\b/g, "I'm").replace(/\bYou have\b/g, 'I have').replace(/\bYou can\b/g, 'I can').replace(/\bYou\b/g, 'I').replace(/\byour\b/g, 'my').replace(/\bYour\b/g, 'My').replace(/\byou\b/g, 'me');

type Line = { who: 'feras' | 'you'; text: string };
type Stage = 'talk' | 'desk' | 'page' | 'treat';

export function ConsultScene({ id, onDone }: { id: string; onDone: () => void }) {
  const g = useGame();
  const d = DISEASE(id)!;
  const il = (g.illnesses ?? []).find((x) => x.id === id);
  const lines: Line[] = [
    { who: 'feras', text: 'Sit down. Tell me where it hurts, and how long.' },
    { who: 'you', text: `Doctor, ${inFirstPerson(d.symptom).replace(/^./, (c) => c.toLowerCase())}` },
    { who: 'feras', text: 'Hm. Let me show you what it is, in my book.' },
  ];
  const [n, setN] = useState(0);
  const [stage, setStage] = useState<Stage>('talk');
  const [deskPic, setDeskPic] = useState(true);
  const [note, setNote] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const a = useRef<HTMLAudioElement>(null);

  // the lines come one after the other; a tap on the picture moves on at once
  useEffect(() => {
    if (stage !== 'talk') return;
    const t = window.setTimeout(() => (n < lines.length - 1 ? setN(n + 1) : setStage('desk')), n === lines.length - 1 ? 1600 : 2200);
    return () => clearTimeout(t);
  }, [n, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  // he opens the book: his voice starts, the desk shows a moment, then the page itself
  useEffect(() => {
    if (stage !== 'desk') return;
    voice.stop();
    audio.attenuate('feras', true, 0.3, { music: 0.15, ambience: 0.3 });
    const el = a.current; if (el) { el.currentTime = 0; el.play().then(() => setSpeaking(true)).catch(() => {}); }
    const t = window.setTimeout(() => setStage((s) => (s === 'desk' ? 'page' : s)), 2600);
    return () => clearTimeout(t);
  }, [stage]);
  useEffect(() => () => { a.current?.pause(); audio.attenuate('feras', false, 0.8); }, []);
  const toTreat = () => { a.current?.pause(); setSpeaking(false); audio.attenuate('feras', false, 0.8); setStage('treat'); };
  const tapStage = () => { if (stage === 'talk') { if (n < lines.length - 1) setN(n + 1); else setStage('desk'); } else if (stage === 'desk') setStage('page'); };

  const fullFee = TREAT_FEE[d.tier];
  const remedyFee = Math.max(5, Math.round(fullFee * 0.4));
  const treated = !!il?.treated;
  const left = il ? Math.max(1, il.until - g.day) : 0;
  const buy = (mode: 'full' | 'remedy') => setNote(g.treatIllness(id, mode));

  const line: Line = stage === 'talk' ? lines[n]
    : stage === 'treat' ? { who: 'feras', text: note ? 'Good. Rest now, and come back if it turns.' : treated ? 'I have treated it already. Now it is rest, and time.' : 'So. There are two things I can do for you. Choose, effendi.' }
    : { who: 'feras', text: `Here. ${d.name}: see the plate.` };
  const pic = deskPic ? deskWith(d.id) : DESK;

  return (
    <div className="cl-consult-scene" data-testid={`consult-${id}`}>
      <div className="cl-cs-head"><b>{d.name}</b><small>{TIER_LABEL[d.tier]} · about {left} day{left === 1 ? '' : 's'} more</small></div>
      {/* the scene: across his desk, Hassan sitting opposite; words in a bubble over the picture */}
      <div className={`cl-stage st-${stage}`} onClick={tapStage} data-testid="consult-stage">
        {stage === 'desk'
          ? <img key="book" className="cl-stage-img book" src={pic} alt={`Dr Feras opens his book at ${d.name.toLowerCase()}`} onError={() => setDeskPic(false)} draggable={false} />
          : <video key="both" className="cl-stage-img both" src={BOTH} poster={BOTH_STILL} autoPlay loop muted playsInline aria-label="Dr Feras and Hassan at his desk" data-testid="consult-both" />}
        <div className={`cl-say ${line.who}`} data-testid={`line-${line.who}-${stage === 'talk' ? n : stage}`}>
          <small>{line.who === 'feras' ? 'Dr Feras' : 'You'}</small>
          <p>{line.text}</p>
        </div>
        {stage === 'talk' && <button className="btn small cl-skip" onClick={(e) => { e.stopPropagation(); setStage('desk'); }} data-testid="consult-skip">Skip ▸</button>}
        {stage === 'desk' && <span className="cl-zoom">Tap to read the page</span>}
      </div>
      <audio ref={a} src={`audio/feras/${d.id}.mp3`} preload="auto" onEnded={() => { setSpeaking(false); setStage((s) => (s === 'page' || s === 'desk' ? 'treat' : s)); }} data-testid="feras-voice" />
      {(stage === 'desk' || stage === 'page') && (
        <div className="cl-case-btns" data-testid="consult-plate">
          <button className="btn" onClick={() => setStage('page')} data-testid="plate-open">Read the page</button>
          <button className="btn primary" onClick={toTreat} data-testid={stage === 'desk' ? 'plate-skip' : 'plate-skip-desk'}>Skip to treatment ▸</button>
        </div>
      )}
      {stage === 'page' && <BookPage id={d.id} speaking={speaking} caption={`“${d.doctor}”`} onReplay={() => { const el = a.current; if (el) { el.currentTime = 0; void el.play(); setSpeaking(true); } }} onClose={toTreat} />}
      {stage === 'treat' && (
        <div className="cl-treat" data-testid="consult-treat">
          {!treated && !note && (
            <div className="cl-opts">
              <button className="cl-opt" disabled={g.cash < fullFee} onClick={() => buy('full')} data-testid={`treat-${id}`}><b>Full treatment · {fmt(fullFee)}</b><small>Speeds recovery by about a third. An hour of his time.</small></button>
              <button className="cl-opt" disabled={g.cash < remedyFee} onClick={() => buy('remedy')} data-testid={`remedy-${id}`}><b>Simple remedy · {fmt(remedyFee)}</b><small>A bottle and advice. Speeds recovery a little.</small></button>
              <button className="cl-opt quiet" onClick={onDone} data-testid="treat-none"><b>No treatment</b><small>Rest and wait it out. Free.</small></button>
            </div>
          )}
          {note && <p className="cl-note" data-testid="clinic-note">{note}</p>}
          <div className="cl-case-btns">
            <button className="btn" onClick={() => setStage('page')} data-testid="consult-reread">Read his page again</button>
            {(treated || note) && <button className="btn primary" onClick={onDone} data-testid="consult-done">Thank him and finish</button>}
          </div>
        </div>
      )}
    </div>
  );
}
