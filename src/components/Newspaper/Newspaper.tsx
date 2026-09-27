import { Icon } from '../Icon';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../game/state/store';
import { paperFor } from '../../game/economy/newspaper';
import { isFirstOfMonth } from '../../game/economy/life';
import { audio } from '../../game/audio/engine';

/** The Giza Courier for a given day, laid out like a broadsheet folded for the pocket. */
export function Newspaper({ day, onClose }: { day: number; onClose: () => void }) {
  const g = useGame();
  const billSoon = Array.from({ length: 7 }, (_, i) => day + i + 1).some((d) => isFirstOfMonth(d));
  const p = useMemo(() => paperFor(day, { bills: billSoon, commissions: day === g.day ? g.commissions.filter((c) => !c.done) : [] }), [day, billSoon, g.day, g.commissions]);
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
