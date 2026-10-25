import { Icon } from '../Icon';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../game/state/store';
import { paperFor } from '../../game/economy/newspaper';
import { seasonNews } from '../../game/systems/ranks';
import { isFirstOfMonth } from '../../game/economy/life';
import { audio } from '../../game/audio/engine';
import { dateFor } from '../../game/economy/economy';
import { fmt } from '../../game/economy/money';
import { marketOn } from '../../game/economy/market';
import { RIVAL_NAME, rivalOf, yourStall } from '../../game/systems/laneRival';
import { BUYERS } from '../../data/buyers';

/** The Giza Courier for a given day, laid out like a broadsheet folded for the pocket. */
export function Newspaper({ day, onClose }: { day: number; onClose: () => void }) {
  const g = useGame();
  const billSoon = Array.from({ length: 7 }, (_, i) => day + i + 1).some((d) => isFirstOfMonth(d));
  const p = useMemo(() => paperFor(day, { bills: billSoon, commissions: day === g.day ? g.commissions.filter((c) => !c.done) : [], ranks: seasonNews(g, day) }), [day, billSoon, g.day, g.commissions, g.ranks]);
  useEffect(() => { audio.sfx('paper'); }, [day]);
  const first = p.lead.body.charAt(0), rest = p.lead.body.slice(1);
  // First you hold it up and glance at the front: masthead, date and the day's headlines, printed on the
  // blank pages of the painting. "Read the full paper" opens every column.
  const [full, setFull] = useState(false);
  if (!full) {
    const lede = p.lead.body.split(/(?<=\.)\s/)[0];
    return (
      <div className="paper-pov-wrap" role="dialog" aria-label="The Giza Courier" data-testid="newspaper" onClick={onClose}>
        <div className="paper-pov" onClick={(e) => e.stopPropagation()}>
          <img src="art/newspaper-pov.jpg" alt="Your hands holding up the Giza Courier" draggable={false} />
          <div className="pov-page left" data-testid="paper-lead">
            <div className="pov-mast">The Giza Courier</div>
            <div className="pov-date">{p.date}</div>
            <h2>{p.lead.headline}</h2>
            <p>{lede}</p>
          </div>
          <div className="pov-page right">
            <div className="pov-also">Also today</div>
            {p.more.slice(0, 3).map((a) => <h4 key={a.id}>{a.headline}</h4>)}
            <div className="pov-also">The weather</div>
            <p>{p.weather}</p>
            {p.comingUp.length > 0 && <><div className="pov-also">Coming up</div>{p.comingUp.slice(0, 2).map((c, i) => <p key={i}><b>{c.when}.</b> {c.text}</p>)}</>}
          </div>
          <button className="paper-close" onClick={onClose} aria-label="Put the paper down" data-testid="newspaper-close">×</button>
          <button className="btn primary pov-read" onClick={() => setFull(true)} data-testid="paper-read">Read the full paper</button>
        </div>
      </div>
    );
  }
  return (
    <div className="paper-wrap" role="dialog" aria-label="The Giza Courier" data-testid="newspaper" onClick={onClose}>
      <article className="paper" onClick={(e) => e.stopPropagation()}>
        <button className="paper-close" onClick={onClose} aria-label="Put the paper down" data-testid="newspaper-close">×</button>
        <button className="paper-radio" onClick={() => { onClose(); window.dispatchEvent(new Event('tof:radio')); }} data-testid="radio-btn">The wireless ›</button>
        <header className="paper-mast">
          <div className="paper-ear"><span>No. {p.number}</span><span>Price five millièmes</span></div>
          <h1>The Giza Courier</h1>
          <div className="paper-ar" lang="ar" dir="rtl">بريد الجيزة</div>
          <div className="paper-dateline"><span>{p.date}</span><span>Giza · Cairo · Alexandria</span></div>
        </header>

        {p.glance.length > 0 && (
          <div className="paper-glance" data-testid="paper-glance">
            <b>TODAY AT A GLANCE</b>
            {p.glance.map((c, i) => <span key={i} className={`chip ${c.tone}`}><i><Icon name={c.icon} /></i>{c.text}</span>)}
          </div>
        )}

        <section className="paper-lead" data-testid="paper-lead">
          <div className="paper-kicker">{p.lead.kind === 'surprise' ? 'Market talk' : p.lead.kind === 'wire' ? (p.lead.eg ? 'Egypt' : 'From the wires') : p.lead.kind === 'event' ? 'Today\'s news' : 'About town'}</div>
          <h2 className="paper-headline">{p.lead.headline}</h2>
          {p.lead.img && (
            <figure className="paper-fig">
              <img src={p.lead.img} alt="" />
              {p.lead.caption && <figcaption>{p.lead.caption}</figcaption>}
            </figure>
          )}
          {p.lead.deck && <h3>{p.lead.deck}</h3>}
          <p className="paper-body"><span className="dropcap">{first}</span>{rest}</p>
          {p.lead.advice && <p className="paper-advice"><b>For the trade.</b> {p.lead.advice}</p>}
        </section>

        <LaneWeek day={day} />
        <div className="paper-cols">
          <div className="paper-col">
            {p.more.map((a) => (
              <section key={a.id} className="paper-story">
                {a.kind === 'surprise' && <div className="paper-kicker">Market talk</div>}
                {a.kind === 'wire' && <div className="paper-kicker">{a.eg ? 'Egypt' : 'From the wires'}</div>}
                {a.img && <img className="paper-thumb" src={a.img} alt="" />}
                <h4>{a.headline}</h4>
                {a.deck && <h5>{a.deck}</h5>}
                <p>{a.body}</p>
                {a.advice && <p className="paper-advice small"><b>For the trade.</b> {a.advice}</p>}
              </section>
            ))}
            {p.still.length > 0 && (
              <section className="paper-box">
                <h4 className="box-h">Still in the news</h4>
                {p.still.map((s) => <p key={s.name}><b>{s.name}.</b> {s.advice}</p>)}
              </section>
            )}
          </div>
          <aside className="paper-col side">
            <section className="paper-box" data-testid="paper-coming">
              <h4 className="box-h">Coming up</h4>
              {p.comingUp.length ? p.comingUp.map((c, i) => <p key={i}><b>{c.when}.</b> {c.text}</p>) : <p>Nothing announced for the fortnight.</p>}
            </section>
            {p.trade.length > 0 && (
              <section className="paper-box">
                <h4 className="box-h">In the markets</h4>
                {p.trade.map((t, i) => <p key={i}>{t}</p>)}
              </section>
            )}
            <section className="paper-box plain">
              <h4 className="box-h">The weather</h4>
              <p>{p.weather}</p>
              <h4 className="box-h">Shipping</h4>
              <p>{p.shipping}</p>
            </section>
            {[p.ad, p.ad2].map((a, i) => (
              <section key={i} className="paper-ad">
                <b>{a.title}</b>
                <p>{a.body}</p>
              </section>
            ))}
          </aside>
        </div>
        <footer className="paper-foot">Printed and published daily at the Courier press, Pyramids Road.</footer>
      </article>
    </div>
  );
}

/** Mondays: a column about you. The week's takings, the best sale, who came back, and what the lane
 *  says about you and Shukri. Every day: the bazaar's prices. */
function LaneWeek({ day }: { day: number }) {
  const g = useGame();
  const monday = dateFor(day).weekday === 'Monday' && day > 7;
  const m = marketOn(day);
  const week = g.ledger.filter((l) => l.kind === 'sale' && l.day > day - 8 && l.day < day);
  const total = week.reduce((a, l) => a + l.amount, 0);
  const profit = week.reduce((a, l) => a + l.amount - (l.cost ?? 0), 0);
  const best = week.reduce<typeof week[number] | null>((b, l) => (!b || l.amount > b.amount ? l : b), null);
  const r = rivalOf(g);
  const you = yourStall(g.upgrades);
  const fans = Object.entries(g.relationships).filter(([, x]) => (x.purchases ?? 0) >= 3).map(([id]) => BUYERS[id]?.name).filter(Boolean);
  if (!monday && !m) return null;
  return (
    <section className="paper-lane" data-testid="paper-lane">
      {monday && (
        <>
          <div className="paper-kicker">The lane this week</div>
          <h3 className="paper-lane-h">{week.length === 0 ? 'A quiet week at the young merchant\'s stall' : profit > 0 ? `The young merchant of the Giza lane clears ${fmt(profit)}` : 'A hard week for the young merchant of the Giza lane'}</h3>
          <p>{week.length ? `${week.length} rug${week.length === 1 ? '' : 's'} sold for ${fmt(total)} in all.` : 'Not a rug sold.'}{best ? ` The best of them, ${best.label.replace(/ to .*$/, '')}, fetched ${fmt(best.amount)}.` : ''}{fans.length ? ` ${fans.slice(0, 3).join(', ')} ${fans.length === 1 ? 'is' : 'are'} buying from no one else.` : ''}</p>
          <p className="paper-lane-gossip">{r.stall > you ? `Across the lane, ${RIVAL_NAME} has the better stall now, and lets everyone know it.` : r.stall < you ? `${RIVAL_NAME} is said to be furious: his stall is still the poorer of the two.` : `${RIVAL_NAME} is saving hard, and watching your stall more than his own.`}</p>
        </>
      )}
      {m && <p className="paper-lane-market"><b>Prices in the bazaar.</b> {m.why}: {m.up.label.toLowerCase()} fetch {Math.round(m.upBy * 100)}% more. {m.whyDown}: {m.down.label.toLowerCase()} are cheap at the dealers.</p>}
    </section>
  );
}
