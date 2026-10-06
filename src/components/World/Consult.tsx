// A consultation with Dr Feras, as a short scene: he speaks first, you answer, he opens his book on the plate
// for your condition (tap it for full screen, his voice keeps going; Skip leaves it), then he names the
// treatments and you choose what to pay for.
import { useEffect, useRef, useState } from 'react';
import { useGame, TREAT_FEE } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { DISEASE, TIER_LABEL } from '../../game/systems/disease';
import { audio } from '../../game/audio/engine';
import { voice } from '../../game/audio/voice';

const PORTRAIT = 'art/portraits/feras.webp';

/** Full-screen picture: sits above everything; the audio element lives outside it, so his voice never breaks. */
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

/** "You are…" narration turned into what you would say */
const inFirstPerson = (t: string) => t.replace(/\bYou are\b/g, 'I am').replace(/\bYou're\b/g, "I'm").replace(/\bYou have\b/g, 'I have').replace(/\bYou can\b/g, 'I can').replace(/\bYou\b/g, 'I').replace(/\byour\b/g, 'my').replace(/\bYour\b/g, 'My').replace(/\byou\b/g, 'me');

type Line = { who: 'feras' | 'you'; text: string };

export function ConsultScene({ id, onDone }: { id: string; onDone: () => void }) {
  const g = useGame();
  const d = DISEASE(id)!;
  const il = (g.illnesses ?? []).find((x) => x.id === id);
  const lines: Line[] = [
    { who: 'feras', text: 'Sit down. Tell me where it hurts, and how long.' },
    { who: 'you', text: `Doctor, ${inFirstPerson(d.symptom).replace(/^./, (c) => c.toLowerCase())}` },
    { who: 'feras', text: 'Hm. Let me show you what it is, in my book.' },
  ];
  const [shown, setShown] = useState(1);
  const [stage, setStage] = useState<'talk' | 'plate' | 'treat'>('talk');
  const [pic, setPic] = useState(true);
  const [big, setBig] = useState(false);
  const [note, setNote] = useState('');
  const a = useRef<HTMLAudioElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // his lines and yours come one after the other
  useEffect(() => {
    if (stage !== 'talk') return;
    if (shown >= lines.length) { const t = window.setTimeout(() => setStage('plate'), 1400); return () => clearTimeout(t); }
    const t = window.setTimeout(() => setShown((n) => n + 1), 1700);
    return () => clearTimeout(t);
  }, [shown, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  // the plate: his voice reads it out while the music sits low
  useEffect(() => {
    if (stage !== 'plate') return;
    voice.stop();
    audio.attenuate('feras', true, 0.3, { music: 0.15, ambience: 0.3 });
    a.current?.play().catch(() => {});
    return () => { a.current?.pause(); audio.attenuate('feras', false, 0.8); };
  }, [stage]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [shown, stage, note]);

  const fullFee = TREAT_FEE[d.tier];
  const remedyFee = Math.max(5, Math.round(fullFee * 0.4));
  const treated = !!il?.treated;
  const left = il ? Math.max(1, il.until - g.day) : 0;
  const skipTalk = () => { setShown(lines.length); setStage('plate'); };
  const buy = (mode: 'full' | 'remedy') => setNote(g.treatIllness(id, mode));

  return (
    <div className="cl-consult-scene" data-testid={`consult-${id}`}>
      <div className="cl-cs-head"><b>{d.name}</b><small>{TIER_LABEL[d.tier]} · about {left} day{left === 1 ? '' : 's'} more</small></div>
      <div className="cl-chat">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className={`cl-bub ${l.who}`} data-testid={`line-${l.who}-${i}`}>
            {l.who === 'feras' && <img src={PORTRAIT} alt="" />}
            <p><small>{l.who === 'feras' ? 'Dr Feras' : 'You'}</small>{l.text}</p>
          </div>
        ))}
        {stage !== 'talk' && (
          <div className="cl-plate-block" data-testid="consult-plate">
            <button className="cl-plate-btn" onClick={() => setBig(true)} aria-label="Show the picture full screen" data-testid="plate-open">
              <img src={pic ? `art/clinic/desk/${d.id}.webp` : `art/clinic/plates/${d.id}.webp`} alt={`Dr Feras's book, the plate of ${d.name.toLowerCase()}`} onError={() => setPic(false)} />
              <span className="cl-zoom">⤢ Tap for full screen</span>
            </button>
            <div className="cl-bub feras"><img src={PORTRAIT} alt="" /><p><small>Dr Feras</small>“{d.doctor}”</p></div>
            <audio ref={a} src={`audio/feras/${d.id}.mp3`} preload="auto" onEnded={() => setStage((s) => (s === 'plate' ? 'treat' : s))} data-testid="feras-voice" />
            {stage === 'plate' && (
              <div className="cl-case-btns">
                <button className="btn" onClick={() => setBig(true)} data-testid="plate-full">⤢ Full screen</button>
                <button className="btn" onClick={() => { const el = a.current; if (el) { el.currentTime = 0; void el.play(); } }} data-testid="plate-replay">▶ Again</button>
                <button className="btn primary" onClick={() => { a.current?.pause(); setStage('treat'); }} data-testid="plate-skip">Skip to treatment ▸</button>
              </div>
            )}
          </div>
        )}
        {stage === 'treat' && (
          <div className="cl-treat" data-testid="consult-treat">
            <div className="cl-bub feras"><img src={PORTRAIT} alt="" /><p><small>Dr Feras</small>{treated ? 'I have treated it already. Now it is rest, and time.' : 'There are two things I can do for you. Choose, effendi.'}</p></div>
            {!treated && (
              <div className="cl-opts">
                <button className="cl-opt" disabled={g.cash < fullFee} onClick={() => buy('full')} data-testid={`treat-${id}`}><b>Full treatment · {fmt(fullFee)}</b><small>Cuts the illness by half. An hour of his time.</small></button>
                <button className="cl-opt" disabled={g.cash < remedyFee} onClick={() => buy('remedy')} data-testid={`remedy-${id}`}><b>Simple remedy · {fmt(remedyFee)}</b><small>A bottle and advice. Cuts it by a third.</small></button>
                <button className="cl-opt quiet" onClick={onDone} data-testid="treat-none"><b>No treatment</b><small>Rest and wait it out. Free.</small></button>
              </div>
            )}
            {note && <p className="cl-note" data-testid="clinic-note">{note}</p>}
            {(treated || note) && <button className="btn primary" onClick={onDone} data-testid="consult-done">Thank him and finish</button>}
          </div>
        )}
        <div ref={endRef} />
      </div>
      {stage === 'talk' && <button className="btn small cl-skip" onClick={skipTalk} data-testid="consult-skip">Skip ▸</button>}
      {big && <Lightbox src={pic ? `art/clinic/desk/${d.id}.webp` : `art/clinic/plates/${d.id}.webp`} alt={`The plate of ${d.name.toLowerCase()}`} onClose={() => setBig(false)} />}
    </div>
  );
}
