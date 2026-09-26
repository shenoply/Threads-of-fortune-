import { hasPerk } from '../../data/character';
import { Icon } from '../Icon';
import { Rumours } from '../Rumours/Rumours';
import { useEffect, useRef, useState } from 'react';
import { fmt, snap, snapDown } from '../../game/economy/money';
import { FAMILY_START, FAMILY_INSTALMENT, useGame } from '../../game/state/store';
import { voice } from '../../game/audio/voice';
import { RUGS } from '../../data/rugs';
import { RASHID_PROFILE, rashidCredit } from '../../data/suppliers';
import { RASHID } from '../../data/dialogue';
import { rugSrc } from '../RugViewer/rugArt';
import { RugViewer, type RugPreview } from '../RugViewer/RugViewer';

/** Uncle Rashid himself. Tap him and he will find something wrong with you. */
export function RashidPortrait({ onPoke }: { onPoke?: () => void }) {
  return (
    <button className="rashid-face" onClick={onPoke} aria-label="Talk to Uncle Rashid" data-testid="rashid-poke">
      <img src="art/portraits/rashid.jpg" alt="Uncle Rashid" />
    </button>
  );
}

const pickOne = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function Supplier({ toast }: { toast: (s: string) => void }) {
  const g = useGame();
  const sup = g.supplier;
  const fam = g.family ?? FAMILY_START;
  // Rashid always has an opinion about how you look, how much you have, and the cat
  const [line, setLine] = useState(() => {
    const clean = g.attire?.clean ?? 100, worn = g.attire?.worn ?? 'galabiya';
    if (clean < 35) return pickOne(RASHID.smell);
    if (worn === 'galabiya' && g.cash > 2000 && Math.random() < 0.6) return pickOne(RASHID.ragged);
    if ((worn === 'frockcoat' || worn === 'kaftan') && Math.random() < 0.35) return pickOne(RASHID.dressed);
    if (g.cash < 60 && Math.random() < 0.6) return pickOne(RASHID.poor);
    if (g.cash > 20000 && Math.random() < 0.5) return pickOne(RASHID.rich);
    return sup.lastLine;
  });
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setLine(sup.lastLine); }, [sup.lastLine]);
  useEffect(() => {
    voice.say('rashid', line);
    return () => voice.stop();
  }, [line]);
  const poke = () => {
    const r = Math.random();
    setLine(r < 0.08 ? pickOne(RASHID.soft) : r < 0.25 ? pickOne(RASHID.cat) : pickOne(RASHID.poke.filter((l) => l !== line)));
  };
  const [look, setLook] = useState<RugPreview | null>(null);
  useEffect(() => { if (!g.onboard?.rashid) useGame.setState({ onboard: { ...(g.onboard ?? {}), rashid: true } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const exact = g.upgrades.includes('ledgerbook') || hasPerk(g.skills?.appraisal, 'appraisal', 5);
  return (
    <div className="screen" data-testid="supplier">
      <div className="screen-head">
        <div>
          <div className="eyebrow">WIKALAT EL-GHURI · CAIRO</div>
          <h2>Uncle Rashid</h2>
          <p>{RASHID_PROFILE.bio}</p>
        </div>
      </div>
      <div className="rashid">
        <RashidPortrait onPoke={poke} />
        <div>
          <div className="says" data-testid="rashid-line">"{line}"</div>
          <div className="who">Tap Rashid to talk. He will insult you.</div>
          <div className="rel-bar">
            Trust <i><span style={{ width: `${sup.trust}%` }} /></i> {sup.trust}
          </div>
          <div className="rel-bar" style={{ marginTop: 3 }}>
            {sup.debt > 0 ? (
              <>
                You owe {fmt(sup.debt)} · due day {sup.debtDue}
                <button className="btn" style={{ marginLeft: 8, padding: '3px 9px', fontSize: 12 }} onClick={g.payDebt} disabled={g.cash <= 0} data-testid="pay-debt">
                  Pay
                </button>
              </>
            ) : (
              <>{g.missions?.alexandria === 'done' ? `Credit up to ${fmt(rashidCredit(sup.trust, g.reputation))} for ${RASHID_PROFILE.creditDays} days once he trusts you` : 'No credit and only village rugs until you do his errand in Alexandria'}</>
            )}
          </div>
        </div>
      </div>

      {fam.left > 0 ? (
        <div className="family-debt" data-testid="family-debt">
          <div>
            <b>Your father's debt</b>
            <span className="fd-amt">{fmt(fam.left)} <small>of {fmt(FAMILY_START.left)}</small></span>
            <i className="fd-bar"><span style={{ width: `${100 - (fam.left / FAMILY_START.left) * 100}%` }} /></i>
            <small>{fam.due > 0 ? <em>{fmt(fam.due)} is overdue. It is taken from your cash each morning.</em> : <>{fmt(Math.min(FAMILY_INSTALMENT, fam.left))} is taken on the 1st of every month.</>}</small>
          </div>
          <div className="fd-btns">
            <button className="btn" disabled={g.cash < Math.min(500, fam.left)} onClick={() => g.payFamily(500)} data-testid="pay-family">Pay {fmt(Math.min(500, fam.left))}</button>
            <button className="btn" disabled={g.cash < Math.min(2000, fam.left)} onClick={() => g.payFamily(2000)}>Pay {fmt(Math.min(2000, fam.left))}</button>
          </div>
        </div>
      ) : (
        <div className="family-debt paid">Your father's hundred pounds is paid off.</div>
      )}
      {look && <RugViewer preview={look} onClose={() => setLook(null)} />}
      <Rumours max={4} />
      <div className="section-label">TODAY'S STOCK · CHANGES EVERY DAY</div>
      {sup.offers.length === 0 && <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>You have bought everything he had. Come back tomorrow.</p>}
      <div className="offer-list">
        {sup.offers.map((o) => {
          const t = RUGS[o.typeId];
          const lo = exact ? t.valueBand[0] : snapDown(t.valueBand[0] * 0.85);
          const hi = exact ? t.valueBand[1] : snap(t.valueBand[1] * 1.15);
          return (
            <div className="offer" key={o.uid} data-testid={`offer-${t.id}`}>
              <div className={`img ${o.condition === 'Dirty' ? 'dirty' : o.condition === 'Damaged' ? 'damaged' : ''}`} onClick={() => setLook({ typeId: o.typeId, condition: o.condition, price: o.price })} role="button" aria-label={`Look closely at ${t.name}`} data-testid={`look-${t.id}`}>
                <img src={rugSrc(t)} alt={t.name} />
                <span className="look-hint"><Icon name="search" /> Look closer</span>
                {o.tag && <span className={`tag ${o.tag}`}>{o.tag === 'Limited' ? 'Today only' : o.tag}</span>}
              </div>
              <div className="body">
                <div className="row1">
                  <h3>{t.name}{(o.qty ?? 1) > 1 && <span className="qty" data-testid="offer-qty"> ×{o.qty}</span>}</h3>
                  <span className="price" data-testid="offer-price">{fmt(o.price)}</span>
                </div>
                <div className="meta">{t.origin} · {t.material} · {t.age} · {o.condition}</div>
                <div className="est">Resale estimate in good condition {fmt(lo)}–{fmt(hi)}</div>
                <div className="btns">
                  <button className="btn" disabled={o.haggled} onClick={() => toast(g.haggle(o.uid))} data-testid="haggle">
                    {o.haggled ? 'Price fixed today' : 'Ask for better'}
                  </button>
                  <button className="btn primary" disabled={g.cash < o.price} onClick={() => toast(g.buyOffer(o.uid, false))} data-testid="buy-cash">
                    Buy
                  </button>
                  <button className="btn" disabled={sup.trust < 20 || sup.debt + o.price > (g.missions?.alexandria === 'done' ? rashidCredit(sup.trust, g.reputation) : 0)} onClick={() => toast(g.buyOffer(o.uid, true))} data-testid="buy-credit">
                    On credit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
