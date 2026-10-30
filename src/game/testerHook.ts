// Fast testing: skip days in one go, and (for testers only) a console handle, window.tof, so a test run
// can move the game in one line instead of a dozen taps.
import { useGame } from './state/store';
import { CHEATS } from '../components/Settings/SecretCode';
import { fmt } from './economy/money';
import { testerNow } from './tester';

type S = ReturnType<typeof useGame.getState>;
const S = () => useGame.getState();

/** run n days through (the night, the takings, the bills), keeping you fed and rested so nothing is lost
 *  to hunger on the way; returns a line saying what changed */
export function skipDays(n: number): string {
  const cash0 = S().cash, rep0 = S().reputation, day0 = S().day;
  for (let i = 0; i < n; i++) {
    useGame.setState(CHEATS.rested.run(S()) as Partial<S>);
    S().endDay();
    useGame.setState({ dayOver: false } as Partial<S>);
  }
  const dc = S().cash - cash0;
  return `${S().day - day0} days on. Purse ${dc >= 0 ? '+' : '−'}${fmt(Math.abs(dc))} (${fmt(S().cash)}), reputation ${S().reputation - rep0 >= 0 ? '+' : ''}${S().reputation - rep0}.`;
}

export function installTesterHook() {
  if (!testerNow() || typeof window === 'undefined') return;
  (window as unknown as { tof: unknown }).tof = {
    state: () => S(),
    set: (p: Partial<S>) => useGame.setState(p),
    skip: skipDays,
    cheat: (word: string) => { const c = CHEATS[word]; if (!c) return `No cheat "${word}". Try: ${Object.keys(CHEATS).join(', ')}`; useGame.setState(c.run(S()) as Partial<S>); return c.what; },
    cheats: () => Object.fromEntries(Object.entries(CHEATS).map(([k, v]) => [k, v.what])),
  };
}
