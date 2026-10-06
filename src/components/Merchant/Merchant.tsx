import { useEffect } from 'react';
import { useGame } from '../../game/state/store';
import { Fortune, Ledger } from '../Ledger/Ledger';
import { Customers } from './Customers';

export type MerchantSub = 'me' | 'skills' | 'customers' | 'collection' | 'book';

/** The Merchant page: who you are, what you can do, what you own, and the book of accounts. */
import { openGuide } from '../Guide/Guide';

export function Merchant({ sub, setSub }: { sub: MerchantSub; setSub: (s: MerchantSub) => void }) {
  const g = useGame();
  useEffect(() => { g.markMerchantSeen(); if (sub === 'customers' && !g.onboard?.buyers) useGame.setState({ onboard: { ...(g.onboard ?? {}), buyers: true } }); }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="screen merchant" data-testid="merchant">
      <div className="merchant-tabs" role="tablist">
        {([['customers', 'Buyers'], ['collection', 'Collection'], ['book', 'Ledger']] as [MerchantSub, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)} data-testid={`msub-${k}`}>{label}</button>
        ))}
        <button className="merchant-help" onClick={() => openGuide()} data-testid="progress-how-to-play">How to play</button>
      </div>
      {(sub === 'me' || sub === 'skills') && <Customers />}
      {sub === 'customers' && <Customers />}
      {sub === 'collection' && <Fortune />}
      {sub === 'book' && <Ledger />}
    </div>
  );
}

export { progressScore } from '../../game/economy/progress';
