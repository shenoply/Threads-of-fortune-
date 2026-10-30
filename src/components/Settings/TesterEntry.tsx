// The Tester's sheet, at the top of Settings: one tap when the tester tools are on; otherwise the
// same button asks for the tester's code in place and opens the sheet as soon as it is right.
import { useState } from 'react';
import { testerNow, tryTesterCode } from '../../game/tester';
import { audio } from '../../game/audio/engine';
import './settings-tester.css';

export function TesterEntry({ ironman, open }: { ironman: boolean; open: () => void }) {
  const [on, setOn] = useState(testerNow());
  const [asking, setAsking] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const go = async () => {
    if (await tryTesterCode(code)) {
      import('../../game/testerHook').then((m) => m.installTesterHook());
      audio.sfx('coins'); setOn(true); setAsking(false); setCode(''); open();
    } else setMsg('That is not the tester\'s code.');
  };
  if (on || !asking) {
    return (
      <button className="btn tester-entry" disabled={ironman} onClick={() => (on ? open() : setAsking(true))} data-testid="admin-open">
        Tester's sheet
        <small>{ironman ? 'Not in a one-life game' : on ? 'Skip days, fights, cheats and every feature, one tap away' : 'Type the tester\'s code to open it'}</small>
      </button>
    );
  }
  return (
    <div className="tester-entry asking" data-testid="tester-code-row">
      <input type="password" autoFocus value={code} placeholder="Tester's code" onChange={(e) => { setCode(e.target.value); setMsg(''); }} onKeyDown={(e) => { if (e.key === 'Enter') void go(); }} data-testid="tester-code" aria-label="Tester's code" />
      <button className="btn primary" onClick={() => void go()} data-testid="tester-code-go">Open</button>
      <button className="btn" onClick={() => { setAsking(false); setMsg(''); }} aria-label="Cancel">×</button>
      {msg && <small className="warn">{msg}</small>}
    </div>
  );
}
