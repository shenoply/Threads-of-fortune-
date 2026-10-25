// The market's mood in one line: what the town wants today and what it has too much of.
import { useGame } from '../../game/state/store';
import { marketOn, trendOf } from '../../game/economy/market';
import './market.css';

export function MarketLine({ where }: { where: 'stall' | 'rashid' }) {
  const day = useGame((s) => s.day);
  const m = marketOn(day);
  if (!m) return null;
  return (
    <div className="market-line" data-testid="market-line">
      <span className="ml-k">THE MARKET TODAY</span>
      <p><b className="up">▲ {m.up.label} +{Math.round(m.upBy * 100)}%</b> <small>{m.why}.</small></p>
      <p><b className="down">▼ {m.down.label}{where === 'rashid' ? ` −${Math.round(m.downBy * 100)}% here` : ''}</b> <small>{m.whyDown}.</small></p>
    </div>
  );
}

/** a small arrow on a rug: wanted today, or too many about */
export function TrendMark({ typeId }: { typeId: string }) {
  const day = useGame((s) => s.day);
  const t = trendOf(typeId, day);
  if (!t) return null;
  return <i className={`trend-mark ${t}`} title={t === 'up' ? 'Wanted today: buyers pay more' : 'Too many about today: cheap to buy'}>{t === 'up' ? '▲' : '▼'}</i>;
}
