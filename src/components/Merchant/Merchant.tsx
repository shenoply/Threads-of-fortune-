import { Road } from '../Road/Road';
import { useEffect } from 'react';
import { useGame } from '../../game/state/store';
import { Fortune, Ledger, Standing } from '../Ledger/Ledger';
import { Customers } from './Customers';
import { PostList } from '../Objectives/PostList';
import { unread } from '../../game/systems/post';

export type MerchantSub = 'road' | 'me' | 'skills' | 'customers' | 'collection' | 'book' | 'post';

/** The Merchant page: who you are, what you can do, what you own, and the book of accounts. */
import { openGuide } from '../Guide/Guide';

export function Merchant({ sub, setSub }: { sub: MerchantSub; setSub: (s: MerchantSub) => void }) {
  const g = useGame();
  useEffect(() => { g.markMerchantSeen(); if (sub === 'customers' && !g.onboard?.buyers) useGame.setState({ onboard: { ...(g.onboard ?? {}), buyers: true } }); }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="screen merchant" data-testid="merchant">
      <Standing />
      <div className="merchant-tabs" role="tablist">
        {([['road', 'Road'], ['customers', 'Buyers'], ['collection', 'Collection'], ['book', 'Ledger'], ['post', 'Post']] as [MerchantSub, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)} data-testid={`msub-${k}`}>{label}{k === 'post' && unread(g.post, g.day) > 0 && <b className="msub-badge">{unread(g.post, g.day)}</b>}</button>
        ))}
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
