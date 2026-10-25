// The end of a season (91 days): one page on how it went. What you cleared, your best buyer and best
// sale, where you stood among Cairo's dealers, how you did against Shukri across the lane, and the
// mark the lane gives the season. Then a line on the stall screen for the season under way: days left
// and where you stand, so every season has a finish line.
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { SEASON_DAYS, seasonEnd, seasonName, seasonOf, standing } from '../../game/systems/ranks';
import { RIVAL_NAME, rivalOf, yourStall } from '../../game/systems/laneRival';
import { audio } from '../../game/audio/engine';
import { BUYERS } from '../../data/buyers';
import { useEffect } from 'react';
import './season.css';

const NAME_TO_BUYER = new Map(Object.values(BUYERS).map((b) => [b.name, b.id]));
export const GRADES = [
  { min: 85, word: 'A golden season', letter: 'A' },
  { min: 68, word: 'A fine season', letter: 'B' },
  { min: 50, word: 'A fair season', letter: 'C' },
  { min: 30, word: 'A thin season', letter: 'D' },
  { min: 0, word: 'A season to forget', letter: 'E' },
];

type L = { day: number; kind: string; label: string; amount: number; cost?: number };
export function seasonSummary(ledger: L[], season: number, prevProfit: number) {
  const from = season * SEASON_DAYS + 1, to = seasonEnd(season);
  const sales = ledger.filter((l) => l.kind === 'sale' && l.amount > 0 && l.day >= from && l.day <= to && !/^Seized/.test(l.label));
  const profit = sales.reduce((a, l) => a + l.amount - (l.cost ?? 0), 0);
  const revenue = sales.reduce((a, l) => a + l.amount, 0);
  const spend = new Map<string, number>();
  for (const l of sales) { const who = l.label.split(' to ')[1]; if (who) spend.set(who, (spend.get(who) ?? 0) + l.amount); }
  const bestBuyer = [...spend.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestSale = sales.reduce<L | null>((b, l) => (!b || l.amount - (l.cost ?? 0) > b.amount - (b.cost ?? 0) ? l : b), null);
  // the mark: growth on last season, and the size of the trade
  const growth = prevProfit > 0 ? profit / prevProfit : profit > 0 ? 1.5 : 0;
  const score = Math.max(0, Math.min(100, Math.round(35 * Math.min(1.6, growth) / 1.6 + 35 * Math.min(1, sales.length / 60) + 30 * Math.min(1, profit / 30000))));
  return { profit, revenue, count: sales.length, bestBuyer, bestSale, score };
}

export function SeasonReport() {
  const g = useGame();
  const last = g.ranks?.last;
  const due = !!last && g.day - last.day <= 3 && g.seasonSeen !== last.season;
  useEffect(() => { if (due) audio.sfx('reward'); }, [due]);
  if (!due || !last) return null;
  const prev = last.season > 0 ? seasonSummary(g.ledger, last.season - 1, 0).profit : 0;
  const sum = seasonSummary(g.ledger, last.season, prev);
  const grade = GRADES.find((x) => sum.score >= x.min)!;
  const cairo = last.places?.cairo;
  const r = rivalOf(g), you = yourStall(g.upgrades);
  const close = () => useGame.setState({ seasonSeen: last.season });
  return (
    <div className="overlay season-wrap" onClick={close} data-testid="season-report">
      <div className="season-card" onClick={(e) => e.stopPropagation()}>
        <small className="sr-k">THE END OF {seasonName(last.season).toUpperCase()}</small>
        <div className={`sr-grade g${grade.letter}`}><b>{grade.letter}</b><span>{grade.word}</span></div>
        <div className="sr-grid">
          <span><small>CLEARED</small><b className={sum.profit >= 0 ? 'pos' : 'neg'}>{fmt(sum.profit)}</b><i>{sum.count} rug{sum.count === 1 ? '' : 's'} sold for {fmt(sum.revenue)}</i></span>
          <span><small>LAST SEASON</small><b>{prev ? fmt(prev) : '–'}</b><i>{prev ? (sum.profit >= prev ? `up ${fmt(sum.profit - prev)}` : `down ${fmt(prev - sum.profit)}`) : 'your first season'}</i></span>
          <span><small>BEST BUYER</small><b>{sum.bestBuyer ? sum.bestBuyer[0] : '–'}</b><i>{sum.bestBuyer ? `spent ${fmt(sum.bestBuyer[1])} with you` : 'nobody yet'}</i></span>
          <span><small>BEST SALE</small><b>{sum.bestSale ? `+${fmt(sum.bestSale.amount - (sum.bestSale.cost ?? 0))}` : '–'}</b><i>{sum.bestSale ? sum.bestSale.label.split(' to ')[0] : ''}</i></span>
          <span><small>AMONG CAIRO'S DEALERS</small><b>{cairo ? `${cairo}${cairo === 1 ? 'st' : cairo === 2 ? 'nd' : cairo === 3 ? 'rd' : 'th'}` : '–'}</b><i>{cairo === 1 ? 'First Merchant of Cairo' : cairo ? 'in the season\'s table' : 'not yet on the table'}</i></span>
          <span><small>ACROSS THE LANE</small><b>{you > r.stall ? 'Ahead' : you === r.stall ? 'Level' : 'Behind'}</b><i>{RIVAL_NAME}</i></span>
        </div>
        <button className="btn primary" onClick={close} data-testid="season-ok">On to {seasonName(last.season + 1)}</button>
      </div>
    </div>
  );
}

/** the season under way, in one line on the stall screen */
export function SeasonLine() {
  const day = useGame((s) => s.day);
  const ranks = useGame((s) => s.ranks);
  const ledger = useGame((s) => s.ledger);
  if (day < 14) return null;
  const season = seasonOf(day);
  const left = seasonEnd(season) - day;
  const place = standing(ranks, 'cairo');
  const sum = seasonSummary(ledger, season, 0);
  return (
    <p className="skill-goal season-line" data-testid="season-line">
      <span>SEASON</span> {seasonName(season)}: {left} day{left === 1 ? '' : 's'} left · cleared <b>{fmt(sum.profit)}</b>{place ? ` · ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'} in Cairo` : ''}
      <i><em style={{ width: `${Math.round((1 - left / SEASON_DAYS) * 100)}%` }} /></i>
    </p>
  );
}
