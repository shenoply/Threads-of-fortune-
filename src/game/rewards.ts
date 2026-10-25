// The small rewards (feel.ts): watches the game for a sale, a lot won at auction, a mission or goal
// finished, Rashid's first instalment paid, and a rise in reputation, and marks each one: the coins and
// a floating price, an ink seal with a soft thud, a star on the chip. Nothing here changes the game,
// stops the clock or waits for a tap; a loaded save or a new game is not mistaken for any of them.
import { useGame } from './state/store';
import { audio } from './audio/engine';
import { BIG_SALE, floatSale, goldRush, saleMoment, stampOn, starTick, trackTaps } from './feel';
import { fmt } from './economy/money';
import { MAIN_ORDER } from '../data/missions';

type S = ReturnType<typeof useGame.getState>;
/** a jump bigger than this (a load, a new game, a save's quiet catch-up) is not one moment */
const MAX_FRESH = 4;

let installed = false;
export function installRewards() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  // every button answers a tap: one that plays no sound of its own gets the soft tap, after its own
  // handler has run (so a button with its own sound is never doubled)
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, [role="tab"], .btn');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const before = audio.lastSfxAt;
    window.setTimeout(() => { if (audio.lastSfxAt === before) audio.sfx('tap'); }, 0);
  }, true);
  trackTaps();
  /** fine deals (three stars) in a row */
let streak = 0;
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
        // what this sale means: a record, the best of the day, or the profit on what the rug cost
        const isSale = (l: { kind: string; amount: number; label: string }) => l.kind === 'sale' && l.amount > 0 && !/^Seized/.test(l.label);
        const before = (p.ledger ?? []).filter(isSale);
        const best = before.reduce((m, l) => Math.max(m, l.amount), 0);
        const dayBest = before.filter((l) => l.day === s.day).reduce((m, l) => Math.max(m, l.amount), 0);
        const mine = fresh.filter(isSale);
        const cost = mine.reduce((a, l) => a + (l.cost ?? 0), 0);
        const pct = cost > 0 ? Math.round(((sold - extra - cost) / cost) * 100) : 0;
        const record = before.length >= 3 && sold > best;
        // marks passed: the first sale, the tenth, three in one day... said on the ribbon itself
        const n = before.length + mine.length, today = before.filter((l) => l.day === s.day).length + mine.length;
        const marks: Record<number, string> = { 1: 'Your first sale. Your father would be glad', 10: 'Your tenth sale', 25: 'Twenty-five sales', 50: 'Fifty sales', 100: 'A hundred sales', 250: 'Two hundred and fifty sales' };
        const hit = Object.keys(marks).map(Number).find((m) => before.length < m && n >= m);
        const dayHit = [3, 5, 8].find((m) => today - mine.length < m && today >= m);
        const mark = hit ? marks[hit] : dayHit ? `${dayHit === 3 ? 'Three' : dayHit === 5 ? 'Five' : 'Eight'} sales today` : '';
        // the deal, rated: one star for a sale, two for a good one, three for a fine one (three in a row is a streak)
        const stars = cost <= 0 ? 2 : pct >= 75 ? 3 : pct >= 25 ? 2 : 1;
        streak = stars === 3 ? streak + 1 : 0;
        const hot = streak >= 3 ? `A streak: ${streak} fine deals in a row` : '';
        if (streak >= 3) queueMicrotask(() => useGame.setState((st) => ({ reputation: st.reputation + 1 })));
        const spot = (s.spotRun ?? 0) > 0 && (s.spotRun ?? 0) !== (p.spotRun ?? 0) ? s.spotRun! : 0;
        const note = (spot ? `Spot on${spot > 1 ? ` ×${spot}` : ''}! They paid extra for your eye` : '') || mark || hot || (record ? 'Your best sale yet' : dayBest > 0 && sold > dayBest ? 'The best of the day' : pct >= 10 ? `${pct}% more than it cost you` : pct < 0 ? 'Under what it cost you' : '');
        const loss = cost > 0 && sold - extra < cost;
        audio.sfx(loss ? 'chest' : record || mark || stars === 3 ? 'reward' : sold >= BIG_SALE ? 'soldBig' : 'sold');
        saleMoment(sold, loss ? `A loss: ${fmt(cost - (sold - extra))} under what it cost you` : note, !loss && (record || !!mark || sold >= BIG_SALE || stars === 3), loss ? 0 : stars, loss);
        // a fine deal at a good price is a fortune moment: the purse glows and the screen catches the gold
        if (!loss && stars === 3 && (sold >= BIG_SALE || record)) goldRush();
        floatSale(sold);
      }
      const won = fresh.filter((l) => l.kind === 'purchase' && /^Auction:/.test(l.label)).reduce((a, l) => a + (l.cost ?? -l.amount), 0);
      if (won > 0) floatSale(won, 'won');
    }

    // (a rug new to the Carpet Register is shown by the Reveal host itself, with the sun behind it: Reveal.tsx)

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
