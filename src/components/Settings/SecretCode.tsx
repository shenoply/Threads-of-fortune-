// A quiet "Have a code?" line at the foot of the settings: the owner's code tops up the purse (for
// testing the late game without grinding). Only the code's SHA-256 is in the build, not the code.
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';

const CODES: Record<string, number> = {
  bb71f37eb6eb91553e39ca37a705d89fbcebe2ddcf96b0c42c97ad17553a7ec0: 10000, // £100 (old/lost code, kept harmless)
  f8afb17fed0a681dbea3ba779193a3f1e02418525fcec22e813cfedde72755c7: 10000, // £100 — "hassan100"
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function SecretCode() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const go = async () => {
    const amount = CODES[await sha256(code)];
    if (!amount) { setMsg('Nothing happens.'); return; }
    const s = useGame.getState();
    useGame.setState({ cash: s.cash + amount, ledger: [...s.ledger, { day: s.day, kind: 'bonus', label: 'A purse from the family', amount }] });
    audio.sfx('coins');
    setMsg(`${fmt(amount)} added.`); setCode('');
  };
  if (!open) return <button className="code-link" onClick={() => setOpen(true)} data-testid="code-open">Have a code?</button>;
  return (
    <div className="code-row">
      <input value={code} onChange={(e) => { setCode(e.target.value); setMsg(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void go(); }} placeholder="Code" autoCapitalize="off" autoCorrect="off" spellCheck={false} data-testid="code-input" />
      <button className="btn small" onClick={() => void go()} data-testid="code-go">Use</button>
      {msg && <span className="dim" data-testid="code-msg">{msg}</span>}
    </div>
  );
}
