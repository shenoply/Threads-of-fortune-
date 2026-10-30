import { Road } from '../Road/Road';
import { useEffect } from 'react';
import { useGame } from '../../game/state/store';
import { Fortune, Ledger, Standing } from '../Ledger/Ledger';
import { Customers } from './Customers';
import { PostList } from '../Objectives/PostList';
import { unread, badgeText } from '../../game/systems/post';
import { BUYERS } from '../../data/buyers';
import { RUG_IDS, PERSIAN_RUG_IDS } from '../../data/rugs';
const EVERY_RUG = [...RUG_IDS, ...PERSIAN_RUG_IDS];
import { roadOf } from '../../game/road';
import { fmt } from '../../game/economy/money';

// how much each tab held when it was last opened, to mark what is new
const SEEN_KEY = 'tof-progress-seen';
function seenCounts(): Partial<Record<MerchantSub, number>> { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } }
function keepSeen(k: MerchantSub, n: number) { try { const s = seenCounts(); if (s[k] !== n) localStorage.setItem(SEEN_KEY, JSON.stringify({ ...s, [k]: n })); } catch { /* private mode */ } }

export type MerchantSub = 'road' | 'me' | 'skills' | 'customers' | 'collection' | 'book' | 'post';

/** The Merchant page: who you are, what you can do, what you own, and the book of accounts. */
import { openGuide } from '../Guide/Guide';

export function Merchant({ sub, setSub, onBack }: { sub: MerchantSub; setSub: (s: MerchantSub) => void; onBack?: () => void }) {
  const g = useGame();
  // each tab says what is in it, and a small dot marks what is new since it was last opened
  const met = Object.entries(g.relationships).filter(([id, r]) => BUYERS[id] && r.visits > 0).length;
  const reg = EVERY_RUG.filter((id) => (g.register ?? []).includes(id)).length;
  const steps = roadOf(g), doneN = steps.filter((x) => x.done).length;
  const today = g.ledger.filter((e) => e.day === g.day).reduce((n, e) => n + e.amount, 0);
  const seen = seenCounts();
  const teasers: Partial<Record<MerchantSub, { line: string; fresh?: boolean }>> = {
    road: { line: `${doneN}/${steps.length}`, fresh: doneN > (seen.road ?? doneN) },
    customers: { line: met > (seen.customers ?? met) ? `${met - (seen.customers ?? 0)} new` : `${met} met`, fresh: met > (seen.customers ?? met) },
    collection: { line: `${reg}/${EVERY_RUG.length}`, fresh: reg > (seen.collection ?? reg) },
    book: { line: today ? `${today > 0 ? '+' : '−'}${fmt(Math.abs(today))} today` : 'today' },
    post: { line: unread(g.post, g.day) ? 'new' : '' },
  };
  useEffect(() => { keepSeen(sub, sub === 'road' ? doneN : sub === 'customers' ? met : sub === 'collection' ? reg : 0); }, [sub, doneN, met, reg]);
  useEffect(() => { g.markMerchantSeen(); if (sub === 'customers' && !g.onboard?.buyers) useGame.setState({ onboard: { ...(g.onboard ?? {}), buyers: true } }); }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="screen merchant" data-testid="merchant">
      {onBack && <button className="sub-back" onClick={onBack} data-testid="progress-back">‹ Me</button>}
      <Standing compact={sub !== 'road'} />
      <div className="merchant-tabs" role="tablist">
        {([['road', 'Road'], ['customers', 'Buyers'], ['collection', 'Collection'], ['book', 'Ledger'], ['post', 'Post']] as [MerchantSub, string][]).map(([k, label]) => {
          const t = teasers[k];
          return (
            <button key={k} role="tab" aria-selected={sub === k} className={`${sub === k ? 'on' : ''} ${t?.fresh && sub !== k ? 'fresh' : ''}`} onClick={() => setSub(k)} data-testid={`msub-${k}`}>
              <span className="msub-label">{label}</span>
              {t?.line && <small className="msub-tease">{t.line}</small>}
              {k === 'post' && unread(g.post, g.day) > 0 && <b className="msub-badge">{badgeText(unread(g.post, g.day))}</b>}
            </button>
          );
        })}
        <button className="merchant-help" aria-label="How to play" title="How to play" onClick={() => openGuide()} data-testid="progress-how-to-play">How to play</button>
      </div>
      {(sub === 'me' || sub === 'skills') && <Customers />}
      {sub === 'road' && <Road />}
      {sub === 'customers' && <Customers />}
      {sub === 'collection' && <Fortune />}
      {sub === 'book' && <Ledger />}
      {sub === 'post' && <div className="merchant-post" data-testid="merchant-post"><PostList /></div>}
    </div>
  );
}

export { progressScore } from '../../game/economy/progress';
