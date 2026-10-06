import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CHATGPT_LINK, PROMPT, REFERENCE_SHEET, processHeadImage, type HeroLook } from '../../game/heroLook';
import './sandbox.css';


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
        <p className="sbx-dim">Free play: no guided start, and every city is open from the first day. The trade, roads, dangers and saving are the same as the campaign, and the story missions still come to you if you want them. Who are you in it?</p>
        <div className="sbx-choices">
          <button className="sbx-choice" onClick={onHassan} data-testid="play-as-hassan"><b>Play as Hassan</b><small>The rug merchant from the story.</small></button>
          <button className="sbx-choice" onClick={onYourself} data-testid="play-as-yourself"><b>Play as Yourself</b><small>Paint your own head with ChatGPT and put it on Hassan's body.</small></button>
        </div>
        <button className="ghost-btn" onClick={onClose} data-testid="sandbox-close">Back</button>
      </div>
    </div></Portal>
  );
}

export function PlayAsYourself({ onStart, onHassan, onClose }: { onStart: (look: HeroLook) => void; onHassan: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [head, setHead] = useState<string | null>(null);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (f?: File | null) => {
    if (!f) return;
    setBusy(true); setMsg('');
    const r = await processHeadImage(f);
    setBusy(false);
    if (!r.ok) { setMsg(r.message || 'That picture did not work.'); setHead(null); setPortrait(null); return; }
    setMsg(r.note || ''); setHead(r.head!); setPortrait(r.portrait!);
  };

  return (
    <Portal><div className="sbx-back" role="dialog" aria-modal="true" data-testid="play-as-yourself-modal">
      <div className="sbx-card wide">
        <h2>Play as Yourself</h2>
        <div className="sbx-body">
          <div className="sbx-step">
            <b>1 · Get the style picture</b>
            <div className="sbx-row">
              <img className="sbx-ref" src={REFERENCE_SHEET} alt="Style reference" />
              <a className="btn" href={REFERENCE_SHEET} download="threads-of-fortune-style.jpg" data-testid="download-reference">⬇ Download</a>
            </div>
          </div>
          <div className="sbx-step">
            <b>2 · Ask ChatGPT</b>
            <p className="sbx-dim">Open ChatGPT with the request filled in. Attach the style picture and a clear photo of your face, then send.</p>
            <div className="sbx-row">
              <a className="btn" href={CHATGPT_LINK} target="_blank" rel="noopener noreferrer" data-testid="open-chatgpt">Open ChatGPT</a>
              <CopyBtn text={PROMPT} id="copy-prompt" />
            </div>
          </div>
          <div className="sbx-step">
            <b>3 · Upload what it makes</b>
            <label className="sbx-name">Your name<input value={name} maxLength={24} placeholder="e.g. Sami" onChange={(e) => setName(e.target.value)} data-testid="sbx-name" /></label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} data-testid="upload-head" />
            {busy && <p className="sbx-dim">Preparing picture…</p>}
            {msg && <small className={head ? 'sbx-note' : 'sbx-err'} data-testid="msg-head">{msg}</small>}
            {head && portrait && <div className="sbx-prev" data-testid="sbx-preview"><img src={head} alt="Your head" /><img className="sq" src={portrait} alt="Your portrait" /></div>}
          </div>
          <p className="sbx-dim">Your picture stays on this device and in your save. Outfits keep Hassan's body, so your head sits on every outfit (hats are not shown).</p>
        </div>
        <div className="sbx-foot">
          <button className="ghost-btn" onClick={onClose} data-testid="sbx-cancel">Cancel</button>
          <button className="ghost-btn" onClick={onHassan} data-testid="sbx-use-hassan">Use Hassan instead</button>
          <button className="big-btn" disabled={!head} onClick={() => onStart({ kind: 'custom', name: name.trim() || 'You', head: head!, portrait: portrait! })} data-testid="sbx-start">Start Sandbox</button>
        </div>
      </div>
    </div></Portal>
  );
}
