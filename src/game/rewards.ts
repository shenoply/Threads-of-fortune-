// The small rewards (feel.ts): watches the game for a sale, a lot won at auction, a mission or goal
// finished, Rashid's first instalment paid, and a rise in reputation, and marks each one: the coins and
// a floating price, an ink seal with a soft thud, a star on the chip. Nothing here changes the game,
// stops the clock or waits for a tap; a loaded save or a new game is not mistaken for any of them.
import { useGame } from './state/store';
import { audio } from './audio/engine';
import { BIG_SALE, floatSale, stampOn, starTick, trackTaps } from './feel';
import { MAIN_ORDER } from '../data/missions';

type S = ReturnType<typeof useGame.getState>;
/** a jump bigger than this (a load, a new game, a save's quiet catch-up) is not one moment */
const MAX_FRESH = 4;

let installed = false;
export function installRewards() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  trackTaps();
  let prev: S = useGame.getState();
  useGame.subscribe(() => {
    // the state as it is now, not as this call was told: a watcher in the store that sets state from
    // inside its own call (a mission finishing) runs this again first, and the older call must not undo it
    const s = useGame.getState();
    const p = prev;
    prev = s;
    if (!s.started || !p.started || s === p) return;
    // a different game (a slot loaded, a new start): nothing to celebrate
    const j0 = p.journal?.length ?? 0, j1 = s.journal?.length ?? 0;
    if (s.day < p.day || (s.ledger?.length ?? 0) < (p.ledger?.length ?? 0) || j1 < j0 || j1 - j0 > 8) return;

    // ---- sales, and lots won ----
    const n0 = p.ledger?.length ?? 0, n1 = s.ledger?.length ?? 0;
    if (n1 > n0 && n1 - n0 <= MAX_FRESH) {
      const fresh = s.ledger.slice(n0);
      let sold = fresh.filter((l) => l.kind === 'sale' && l.amount > 0 && !/^Seized/.test(l.label)).reduce((a, l) => a + l.amount, 0);
      // a commission's bonus paid with the sale is part of what it brought in
      const extra = sold > 0 ? fresh.filter((l) => l.kind === 'bonus' && l.amount > 0 && /^Commission/.test(l.label)).reduce((a, l) => a + l.amount, 0) : 0;
      if (sold > 0) {
        sold += extra;
        audio.sfx(sold >= BIG_SALE ? 'soldBig' : 'sold');
        floatSale(sold);
      }
      const won = fresh.filter((l) => l.kind === 'purchase' && /^Auction:/.test(l.label)).reduce((a, l) => a + (l.cost ?? -l.amount), 0);
      if (won > 0) floatSale(won, 'won');
    }

    // ---- a mission or goal finished ----
    const done = Object.keys(s.missions ?? {}).filter((id) => s.missions[id] === 'done' && p.missions?.[id] !== 'done');
    if (done.length === 1) {
      const main = MAIN_ORDER.includes(done[0]);
      // after the notice it brings has been drawn
      window.setTimeout(() => stampOn(
        main ? ['[data-testid="mission-card"]', '.objective-bar'] : ['[data-testid="milestone-notice"]', '.objective-bar'],
        main ? 'Done' : 'Goal', () => audio.sfx('stamp'),
      ), 120);
    }

    // ---- Rashid's first instalment, paid in time ----
    const fw = s.family?.first, pw = p.family?.first;
    if (fw?.done && !pw?.done && (fw.how === 'early' || fw.how === 'onTime')) {
      window.setTimeout(() => stampOn(['[data-testid="family-debt"]', '[data-testid="week-due"]', '.objective-bar'], 'Paid', () => audio.sfx('stamp'), 'brass'), 120);
    }

    // ---- reputation up ----
    const up = s.reputation - p.reputation;
    if (up > 0 && up <= 20) window.setTimeout(() => starTick(up), done.length ? 250 : 0);
  });
}
