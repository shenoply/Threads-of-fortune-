// The gift chest in the top bar, and the page it opens: today's gift (a week of days in a row, a
// little more each day), and the day's three errands with their pay. It never opens by itself.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { rankOf } from '../../game/economy/progress';
import { fmt } from '../../game/economy/money';
import { ALL_THREE, errandsFor, giftFor, giftToday, type Gift } from '../../game/systems/daily';
import { Icon } from '../Icon';
import { reveal } from '../Reveal/Reveal';
import { showBale } from '../Bales/Bale';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import './daily.css';

const giftShort = (g: Gift) => (g.kind === 'cash' ? fmt(g.amount) : g.kind === 'rep' ? `+${g.amount}★` : g.kind === 'rug' ? 'A rug' : g.kind === 'bale' ? 'Sealed bale' : 'For the stall');

/** whether anything waits: today's gift unopened, or a finished errand not yet paid */
export function useDailyWaiting() {
  const g = useGame();
  const gift = giftToday(g.daily);
  const rk = rankOf(g).idx;
  const paid = g.daily?.paid ?? [];
  const errs = errandsFor(g.day, g.ledger, rk);
  const unpaid = errs.filter((e) => e.done && !paid.includes(`${g.day}:${e.id}`)).length + (errs.every((e) => e.done) && !paid.includes(`${g.day}:all`) ? 1 : 0);
  return { gift: gift.open, unpaid, run: gift.open ? gift.run - 1 : gift.run };
}

// the chest glows only until it has been looked into today; after that a small dot stays while
// something is still there to take, and nothing at all once it is all taken
const lookedKey = () => `tof-gift-looked-${new Date().toDateString()}`;
const lookedToday = () => { try { return localStorage.getItem(lookedKey()) === '1'; } catch { return false; } };

export function GiftButton() {
  const [open, setOpen] = useState(false);
  const [looked, setLooked] = useState(lookedToday);
  const w = useDailyWaiting();
  const waiting = w.gift || w.unpaid > 0;
  const calling = waiting && !looked;
  return (
    <>
      <button className={`icon-btn gift-btn ${calling ? 'calling' : ''}`} onClick={() => { audio.sfx('tap'); setOpen(true); try { localStorage.setItem(lookedKey(), '1'); } catch { /* private mode */ } setLooked(true); }} aria-label={waiting ? 'Your gift and errands: something is waiting' : 'Your gift and errands'} data-testid="gift-btn" data-waiting={waiting ? '1' : undefined}>
        <Icon name="gift" />
        {waiting && <span className="gift-dot" aria-hidden="true" />}
      </button>
      {open && <DailySheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function DailySheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const rk = rankOf(g).idx;
  const gift = giftToday(g.daily);
  const owned = g.dressing ?? [];
  const [got, setGot] = useState<Gift | null>(null);
  const paid = g.daily?.paid ?? [];
  const errs = errandsFor(g.day, g.ledger, rk);
  const allDone = errs.every((e) => e.done);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  // the week of days: where today falls in it
  const weekStart = Math.floor((gift.run - 1) / 7) * 7 + 1;
  const week = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const open = () => {
    const r = g.openGift();
    if (!r) return;
    setGot(r);
    if (r.kind === 'bale') { const lb = useGame.getState().lastBale; if (lb) showBale(lb.result, lb.items, `Your gift · day ${gift.run} in a row`); return; }
    const t = r.kind === 'rug' ? RUGS[r.typeId] : null;
    reveal({ kicker: `Today's gift · day ${gift.run} in a row`, title: r.kind === 'cash' ? fmt(r.amount) : r.kind === 'rep' ? `+${r.amount} reputation` : t ? t.name : r.text.replace(/^For the stall: /, ''), amount: r.kind === 'cash' ? r.amount : undefined, line: r.kind === 'cash' ? 'In your purse.' : r.kind === 'rep' ? r.text : r.kind === 'rug' ? 'From Uncle Rashid. It waits at the stall.' : 'Put it out from Dress your stall.', pic: t ? rugSrc(t) : undefined, picKind: 'rug' });
  };
  const collect = (id: string) => {
    const amt = id === 'all' ? ALL_THREE(rk) : errs.find((e) => e.id === id)?.reward ?? 0;
    if (!g.payErrand(id)) return;
    if (id === 'all') reveal({ kicker: 'All three errands done', title: fmt(amt), amount: amt, line: 'Paid in full. New errands tomorrow.' });
    else audio.sfx('coins');
  };
  const next = giftFor(gift.open ? gift.run : gift.run + 1, rk, owned);
  return createPortal(
    <div className="overlay daily-sheet" data-testid="daily-sheet" onClick={(e) => e.stopPropagation()}>
      <div className="overlay-head">
        <h2>Today</h2>
        <span className="sub">{fmt(g.cash)}</span>
        <button className="btn close" onClick={onClose} data-testid="daily-close">Done</button>
      </div>
      <div className="daily-body">
        <section className="daily-gift">
          <h3>Your gift <small>{gift.run > 1 || !gift.open ? `day ${gift.run} in a row` : 'day 1'}</small></h3>
          {gift.lost && <p className="dim small" data-testid="gift-lost">Welcome back. A new week of gifts starts today.</p>}
          <ol className="gift-week" data-testid="gift-week">
            {week.map((n) => {
              const gf = giftFor(n, rk, owned);
              const state = n < gift.run || (n === gift.run && !gift.open) ? 'had' : n === gift.run ? 'now' : 'later';
              return (
                <li key={n} className={state}>
                  <b>{((n - 1) % 7) + 1}</b>
                  <span>{giftShort(gf)}</span>
                </li>
              );
            })}
          </ol>
          <div className="gift-chest-row">
            <button className={`gift-chest ${gift.open ? 'ready' : 'opened'}`} onClick={open} disabled={!gift.open} data-testid="gift-open" aria-label={gift.open ? 'Open today\'s gift' : 'Opened'}>
              <Icon name="gift" />
            </button>
            <div className="gift-says" aria-live="polite">
              {gift.open ? <><b>{giftFor(gift.run, rk, owned).text}</b><span>Tap the chest.</span></>
                : got ? <><b className="gift-got" data-testid="gift-got">{got.text}</b><span>{got.kind === 'cash' ? `${fmt(got.amount)} in your purse.` : got.kind === 'rep' ? `+${got.amount} reputation.` : got.kind === 'rug' ? 'It waits at the stall.' : got.kind === 'bale' ? 'Cut open: what was inside is in your stock.' : 'Put it out from Dress your stall.'}</span></>
                : <><b>Opened today.</b><span>Come back tomorrow for day {gift.run + 1}: {next.text.toLowerCase()}.</span></>}
            </div>
          </div>
          {(got || !gift.open) && <p className="gift-next" data-testid="gift-next">Tomorrow, day {gift.run + 1}: <b>{giftShort(next)}</b>. One missed day is forgiven.</p>}
        </section>

        <section className="daily-errands" data-testid="errands">
          <h3>Today's errands <small>new ones each day</small></h3>
          {errs.map((e) => {
            const done = paid.includes(`${g.day}:${e.id}`);
            return (
              <div key={e.id} className={`errand ${e.done ? 'done' : ''} ${done ? 'paid' : ''}`} data-testid={`errand-${e.id}`}>
                <span className="errand-tick" aria-hidden="true">{e.done ? <Icon name="check" /> : null}</span>
                <span className="errand-text"><b>{e.text}</b><small>{e.done ? (done ? 'Paid' : 'Done') : e.progress}</small></span>
                {e.done && !done ? <button className="btn primary small" onClick={() => collect(e.id)} data-testid={`errand-pay-${e.id}`}>Collect {fmt(e.reward)}</button> : <em>{fmt(e.reward)}</em>}
              </div>
            );
          })}
          <div className={`errand all ${allDone ? 'done' : ''}`} data-testid="errand-all">
            <span className="errand-tick" aria-hidden="true"><Icon name="star" /></span>
            <span className="errand-text"><b>All three</b><small>{errs.filter((e) => e.done).length}/3</small></span>
            {allDone && !paid.includes(`${g.day}:all`) ? <button className="btn primary small" onClick={() => collect('all')} data-testid="errand-pay-all">Collect {fmt(ALL_THREE(rk))}</button> : <em>{paid.includes(`${g.day}:all`) ? 'Paid' : fmt(ALL_THREE(rk))}</em>}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
