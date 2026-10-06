import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FIRST_MESSAGE, PROMPTS, REFERENCE_SHEET, processHeroImage, type HeroLook, type LookKind } from '../../game/heroLook';
import './sandbox.css';

const KINDS: LookKind[] = ['full', 'stall', 'portrait'];
const STEPS = ['Reference', 'ChatGPT', 'Upload', 'Preview'];

const Portal = ({ children }: { children: ReactNode }) => createPortal(children, document.body);

function CopyBtn({ text, id }: { text: string; id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn small" data-testid={id} onClick={async () => {
      try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ }
      setDone(true); setTimeout(() => setDone(false), 1500);
    }}>{done ? 'Copied ✓' : 'Copy'}</button>
  );
}

/** Choose who to play in the Sandbox. */
export function SandboxChoose({ onHassan, onYourself, onClose }: { onHassan: () => void; onYourself: () => void; onClose: () => void }) {
  return (
    <Portal><div className="sbx-back" role="dialog" aria-modal="true" data-testid="sandbox-choose">
      <div className="sbx-card">
        <h2>Sandbox</h2>
        <p className="sbx-dim">A free game with the same trade, roads and dangers. Who are you in it?</p>
        <div className="sbx-choices">
          <button className="sbx-choice" onClick={onHassan} data-testid="play-as-hassan"><b>Play as Hassan</b><small>The rug merchant from the story.</small></button>
          <button className="sbx-choice" onClick={onYourself} data-testid="play-as-yourself"><b>Play as Yourself</b><small>Make your own character with ChatGPT and upload three pictures.</small></button>
        </div>
        <button className="ghost-btn" onClick={onClose} data-testid="sandbox-close">Back</button>
      </div>
    </div></Portal>
  );
}

export function PlayAsYourself({ onStart, onHassan, onClose }: { onStart: (look: HeroLook) => void; onHassan: () => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [imgs, setImgs] = useState<Partial<Record<LookKind, string>>>({});
  const [msg, setMsg] = useState<Partial<Record<LookKind, string>>>({});
  const [busy, setBusy] = useState(false);
  const all = KINDS.every((k) => imgs[k]);

  const pick = async (k: LookKind, f?: File | null) => {
    if (!f) return;
    setBusy(true);
    const r = await processHeroImage(f, k);
    setBusy(false);
    if (!r.ok) { setMsg((m) => ({ ...m, [k]: r.message })); setImgs((i) => ({ ...i, [k]: undefined })); return; }
    setMsg((m) => ({ ...m, [k]: r.note || '' }));
    setImgs((i) => ({ ...i, [k]: r.dataUrl }));
  };

  return (
    <Portal><div className="sbx-back" role="dialog" aria-modal="true" data-testid="play-as-yourself-modal">
      <div className="sbx-card wide">
        <div className="sbx-steps">{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>{i + 1}. {s}</span>)}</div>
        <div className="sbx-body">
          {step === 0 && (
            <>
              <h2>1 · Download the reference sheet</h2>
              <p>It shows the painted style and the three framings the game needs: full length, at the stall, and portrait. ChatGPT copies the style from it.</p>
              <img className="sbx-ref" src={REFERENCE_SHEET} alt="Character reference sheet" />
              <a className="btn" href={REFERENCE_SHEET} download="threads-of-fortune-reference-sheet.jpg" data-testid="download-reference">⬇ Download reference sheet</a>
              <p className="sbx-dim">You need a clear photo of yourself too (face visible, good light). Pictures stay on your device and in your save. Nothing is uploaded by the game.</p>
            </>
          )}
          {step === 1 && (
            <>
              <h2>2 · Make three pictures in ChatGPT</h2>
              <ol className="sbx-list">
                <li>Open ChatGPT and start a new chat.</li>
                <li>Attach your photo and the reference sheet, then send this:<div className="sbx-prompt">{FIRST_MESSAGE}<CopyBtn text={FIRST_MESSAGE} id="copy-first" /></div></li>
                <li>Then send the three prompts below, one at a time. Save each result as a picture.</li>
              </ol>
              {KINDS.map((k) => (
                <div className="sbx-prompt" key={k}><b>{PROMPTS[k].title}</b> <small>({PROMPTS[k].size})</small><p>{PROMPTS[k].text}</p><CopyBtn text={PROMPTS[k].text} id={`copy-${k}`} /></div>
              ))}
              <p className="sbx-dim">Tip: if the face drifts, say "keep my face exactly as in my photo" and ask again.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h2>3 · Upload your three pictures</h2>
              <label className="sbx-name">Your name in the game<input value={name} maxLength={24} placeholder="e.g. Sami" onChange={(e) => setName(e.target.value)} data-testid="sbx-name" /></label>
              {KINDS.map((k) => (
                <div className="sbx-up" key={k}>
                  <div className="sbx-thumb">{imgs[k] ? <img src={imgs[k]} alt={PROMPTS[k].title} /> : <span>{PROMPTS[k].title}</span>}</div>
                  <div>
                    <b>{PROMPTS[k].title}</b>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void pick(k, e.target.files?.[0]); e.target.value = ''; }} data-testid={`upload-${k}`} />
                    {msg[k] && <small className={imgs[k] ? 'sbx-note' : 'sbx-err'} data-testid={`msg-${k}`}>{msg[k]}</small>}
                  </div>
                </div>
              ))}
              {busy && <p className="sbx-dim">Preparing picture…</p>}
            </>
          )}
          {step === 3 && (
            <>
              <h2>4 · Preview</h2>
              <p>{name.trim() || 'You'}, as the game will show you. The same look is used for every outfit.</p>
              <div className="sbx-prev" data-testid="sbx-preview">
                {KINDS.map((k) => <img key={k} src={imgs[k]} alt={PROMPTS[k].title} />)}
              </div>
              <p className="sbx-dim">Not right? Go back and upload a different picture.</p>
            </>
          )}
        </div>
        <div className="sbx-foot">
          <button className="ghost-btn" onClick={onClose} data-testid="sbx-cancel">Cancel</button>
          <button className="ghost-btn" onClick={onHassan} data-testid="sbx-use-hassan">Use Hassan instead</button>
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)} data-testid="sbx-back">Back</button>}
          {step < 3 && <button className="btn" disabled={step === 2 && !all} onClick={() => setStep(step + 1)} data-testid="sbx-next">Next</button>}
          {step === 3 && all && <button className="big-btn" onClick={() => onStart({ kind: 'custom', name: name.trim() || 'You', full: imgs.full!, stall: imgs.stall!, portrait: imgs.portrait! })} data-testid="sbx-start">Start Sandbox</button>}
        </div>
      </div>
    </div></Portal>
  );
}
