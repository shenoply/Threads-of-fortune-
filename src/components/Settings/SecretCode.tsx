// A quiet "Have a code?" line at the foot of the settings: the owner's code tops up the purse (for
// testing the late game without grinding). Only the code's SHA-256 is in the build, not the code.
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { fmt } from '../../game/economy/money';
import { testerNow, tryTesterCode, sha256 } from '../../game/tester';

const CODES: Record<string, number> = {
  bb71f37eb6eb91553e39ca37a705d89fbcebe2ddcf96b0c42c97ad17553a7ec0: 10000, // £100 (old/lost code, kept harmless)
  f8afb17fed0a681dbea3ba779193a3f1e02418525fcec22e813cfedde72755c7: 10000, // £100 — "hassan100"
};


/** Beta codes for testers: typed into "Have a code?" in Settings. Plain words, any case. Each one is
 *  written in the journal as a beta code, so a tester's save shows what was used. Not in Ironman. */
type S = ReturnType<typeof useGame.getState>;
export const CHEATS: Record<string, { what: string; run: (s: S) => Partial<S> }> = {
  purse: { what: '£100 in your purse', run: (s) => ({ cash: s.cash + 10000 }) },
  fortune: { what: '£1,000 in your purse', run: (s) => ({ cash: s.cash + 100000 }) },
  goodname: { what: 'reputation +10', run: (s) => ({ reputation: s.reputation + 10 }) },
  famous: { what: 'reputation +50', run: (s) => ({ reputation: s.reputation + 50 }) },
  opendoors: { what: 'skip the opening and the first-sale lesson: every city open', run: (s) => ({ tipsSeen: [...new Set([...(s.tipsSeen ?? []), 'first-hour'])], tutorial: { done: true, step: 'done', inspected: true } }) },
  papers: { what: 'travel papers', run: (s) => ({ passport: { day: s.day } }) },
  rested: { what: 'rested, fed, watered and well', run: (s) => ({ condition: { ...(s.condition ?? { fatigue: 0, dependence: 0 }), fatigue: 0, fed: 100, water: 100 }, illnesses: [] }) },
  guards: { what: 'four Giza watchmen join you', run: (s) => ({ world: { ...s.world, party: { ...s.world.party, troops: { ...s.world.party.troops, watchman: (s.world.party.troops?.watchman ?? 0) + 4 } } } }) },
  camels: { what: 'two camels', run: (s) => ({ world: { ...s.world, party: { ...s.world.party, animals: { ...s.world.party.animals, falahi: (s.world.party.animals?.falahi ?? 0) + 2 } } } }) },
  rations: { what: 'ten days of food', run: (s) => ({ world: { ...s.world, party: { ...s.world.party, food: (s.world.party.food ?? 0) + 10 } } }) },
  loaded: { what: '£5,000, reputation +100, papers and every city open', run: (s) => ({ cash: s.cash + 500000, reputation: s.reputation + 100, passport: { day: s.day }, tipsSeen: [...new Set([...(s.tipsSeen ?? []), 'first-hour'])], tutorial: { done: true, step: 'done', inspected: true } }) },
  army: { what: 'six veterans and six Cairo sentinels join you', run: (s) => ({ world: { ...s.world, party: { ...s.world.party, troops: { ...s.world.party.troops, veteran: (s.world.party.troops?.veteran ?? 0) + 6, sentinel: (s.world.party.troops?.sentinel ?? 0) + 6 } } } }) },
  feast: { what: 'sixty days of food and four camels', run: (s) => ({ world: { ...s.world, party: { ...s.world.party, food: (s.world.party.food ?? 0) + 60, animals: { ...s.world.party.animals, falahi: (s.world.party.animals?.falahi ?? 0) + 4 } } } }) },
  nodebt: { what: 'every debt paid off', run: (s) => ({ supplier: { ...s.supplier, debt: 0 }, loans: [], family: s.family ? { ...s.family, left: 0, due: 0 } : s.family, bills: s.bills ? { ...s.bills, due: 0 } : s.bills }) },
};
export const BETA_CODES = Object.entries(CHEATS).map(([code, c]) => ({ code, what: c.what }));

export function SecretCode() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const go = async () => {
    const word = code.trim().toLowerCase();
    if (await tryTesterCode(word)) { import('../../game/testerHook').then((m) => m.installTesterHook()); setMsg('Tester tools on: the Tester\'s sheet above, the cheat words, road speeds up to 64x, and skipping days.'); setCode(''); audio.sfx('coins'); return; }
    const cheat = testerNow() ? CHEATS[word] : undefined;
    if (cheat) {
      const s = useGame.getState();
      if (s.ironman) { setMsg('Not in a one-life game.'); return; }
      useGame.setState({ ...cheat.run(s), journal: [...s.journal, { day: s.day, text: `Beta code "${word}": ${cheat.what}.`, kind: 'quiet' }] } as Partial<S>);
      audio.sfx('coins');
      setMsg(`Done: ${cheat.what}.`); setCode('');
      return;
    }
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
      {testerNow() && <details className="beta-codes" data-testid="beta-codes">
        <summary>Beta codes</summary>
        <ul>{BETA_CODES.map((c) => <li key={c.code}><button type="button" className="linkish" onClick={() => { setCode(c.code); setMsg(''); }}><b>{c.code}</b></button> {c.what}</li>)}</ul>
      </details>}
    </div>
  );
}
