import { useAudioEnv } from '../../game/audio/useAudioEnv';
import { BUYER_TIERS } from '../../data/buyers';
import { hasPerk } from '../../data/character';
import { useEffect, useMemo, useState } from 'react';
import { fmt, ladderDown, ladderUp, snap, snapDown } from '../../game/economy/money';
import { availableRugs, tutorialAllows, useGame } from '../../game/state/store';
import { getActions, prefsFor, suggestedAsk, tierOf, canQuickSell, quickPrice, type ActionId } from '../../game/systems/negotiation';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { Scene, InfoBand } from './Scene';
import { usePlayback } from '../BuyerDialogue/usePlayback';
import { Icon } from '../Icon';
import { rugSrc } from '../RugViewer/rugArt';
import { RugViewer } from '../RugViewer/RugViewer';
import { audio } from '../../game/audio/engine';

export function StallEncounter({ onGoto, onLeaveAudience }: { onGoto?: (t: 'supplier') => void; onLeaveAudience?: () => void }) {
  const g = useGame();
  const enc = g.encounter;
  const [offset, setOffset] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
  const [dial, setDial] = useState<number | null>(null);
  const atCourt = !!enc?.venue;
  useAudioEnv(atCourt ? 'palace' : null, atCourt ? 'palace' : undefined);
  // at court you can only show the rugs your caravan carried there
  const avail = atCourt ? availableRugs(g).filter((i) => !i.stored) : availableRugs(g);
  const shown = avail.length <= 3 ? avail : [...avail, ...avail].slice(offset % avail.length, (offset % avail.length) + 3);
  const presented = enc?.presented ? g.inventory.find((i) => i.uid === enc.presented) : undefined;
  const resetKey = `${g.day}-${g.visitIdx}-${enc?.buyerId ?? 'none'}`;
  const log = useMemo(() => enc?.log ?? [], [enc?.log]);
  const { view, skip } = usePlayback(log, resetKey, enc?.buyerId ?? '');
  const rel = enc ? g.relationships[enc.buyerId] : undefined;
  const tier = rel ? tierOf(rel) : { idx: 0, name: 'New' as const };
  const buyer = enc ? BUYERS[enc.buyerId] : null;
  const priorities = buyer && enc ? [...prefsFor(enc).roomPriorities, ...buyer.priorities.drawn].filter((p) => enc.revealed.includes(p.id)) : [];
  const tut = !!enc?.tutorial && !g.tutorial.done;
  // the deal done, the customer takes their leave: the next one comes on their own unless you are
  // quicker (a plain timer, so a phone with its sound off is not kept waiting on a voice line)
  const autoNext = !!enc?.outcome && !atCourt && !tut;
  useEffect(() => {
    if (!autoNext) return;
    const t = window.setTimeout(() => { setDial(null); useGame.getState().nextVisit(); }, 8000);
    return () => window.clearTimeout(t);
  }, [autoNext]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = g.tutorial.step;

  const ctx = { inventory: g.inventory, upgrades: g.upgrades, reputation: g.reputation, rel: rel ?? { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng: Math.random };
  const actions = enc ? getActions(enc, ctx) : [];

  const onAction = (id: ActionId) => {
    audio.sfx('tap');
    if (id === 'name_price' && presented && enc) {
      const start = enc.askPrice ? ladderDown(enc.askPrice) : suggestedAsk(presented, enc.concession);
      setDial(Math.max(5, start));
      return;
    }
    g.act(id);
  };

  const onRug = (uid: string) => {
    if (!enc || enc.outcome) {
      setInspect(uid);
      return;
    }
    if (enc.presented === uid && !enc.prompt) {
      setInspect(uid);
      g.inspectorOpened();
      audio.sfx('brush');
      return;
    }
    setDial(null);
    g.present(uid);
  };

  const rugGlow = (uid: string) => {
    if (!tut) return false;
    const it = g.inventory.find((i) => i.uid === uid);
    if (step === 'rug') return it?.typeId === 'desert-star';
    if (step === 'inspect') return enc?.presented === uid;
    return false;
  };

  const est = (uid: string) => {
    const it = g.inventory.find((i) => i.uid === uid);
    if (!it) return '';
    const t = RUGS[it.typeId];
    const exact = g.upgrades.includes('ledgerbook') || hasPerk(g.skills?.appraisal, 'appraisal', 5);
    const lo = exact ? t.valueBand[0] : snapDown(t.valueBand[0] * 0.85);
    const hi = exact ? t.valueBand[1] : snap(t.valueBand[1] * 1.15);
    return `Paid ${fmt(it.paid)} · Est. ${fmt(lo)}–${fmt(hi)}`;
  };

  const isLast = g.visitIdx >= g.queue.length;

  return (
    <div className="stall" data-testid="stall">
      <Scene enc={enc} presented={presented} view={view} onSkip={skip} onCat={g.pet} upgrades={g.upgrades} />
      {enc && !enc.outcome && !enc.tutorial && !enc.venue && (
        <button className="step-away" onClick={() => g.stepAway()} data-testid="step-away">⟵ Step away<small>they wait an hour</small></button>
      )}
      {tut && enc && !enc.outcome && (
        <button className="step-away" onClick={() => g.skipTutorial()} data-testid="skip-lesson">Skip the lesson<small>sell it your own way</small></button>
      )}
      <InfoBand enc={enc} presented={presented} view={view} tierName={tier.name} priorities={priorities} />

      <div className="rugstrip" data-testid="rugstrip">
        {[0, 1, 2].map((k) => {
          const it = shown[k];
          if (!it) return <div key={k} className="rugcard empty">Empty space</div>;
          const t = RUGS[it.typeId];
          const isP = enc?.presented === it.uid;
          const cat = enc?.saffronOn === it.uid;
          const disabledByTut = tut && (step === 'room' || ((step === 'argue' || step === 'price' || step === 'counter') && !isP));
          return (
            <button
              key={it.uid}
              className={`rugcard ${isP ? 'presented' : ''} ${rugGlow(it.uid) ? 'glow' : ''}`}
              onClick={() => onRug(it.uid)}
              disabled={disabledByTut}
              data-testid={`rug-${t.id}`}
              aria-label={`${t.name}${isP ? ', on the table. Tap to inspect' : ''}`}
            >
              <div className="thumb">
                <img src={rugSrc(t)} alt="" style={it.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.75)' } : undefined} />
              </div>
              {it.condition !== 'Good' && <span className="badge">{it.condition}</span>}
              {cat && (
                <span className="paw" title="Saffron is sleeping on this rug">
                  <Icon name="paw" />
                </span>
              )}
              {isP && <span className="hint">Inspect</span>}
              <span className="nm">{t.name}</span>
              <span className="meta">
                {t.origin.split(',')[0].replace('Said to be ', '')} · {t.material.split(' ')[0]} · {t.age}
              </span>
            </button>
          );
        })}
        <div style={{ display: 'grid', gap: 6, gridTemplateRows: '1fr 1fr' }}>
          <button className="side-btn" onClick={() => presented && onRug(presented.uid)} disabled={!presented || (tut && step !== 'inspect' && step !== 'inspect2')} aria-label="Inspect rug" data-testid="inspect-btn">
            <Icon name="search" />
            Inspect
          </button>
          <button className="side-btn" onClick={() => setOffset((o) => o + 3)} disabled={avail.length <= 3 || tut} aria-label="Change rugs" data-testid="change-rugs">
            <Icon name="swap" />
            Change
          </button>
        </div>
      </div>

      <div className="actions" data-testid="actions">
        {enc?.outcome ? (
          <div className={`result ${enc.outcome}`} data-testid="result">
            <div className="r-main">
              {enc.outcome === 'sold' ? (
                <>
                  <b>Sold for {fmt(enc.salePrice ?? 0)}{enc.saleCost !== undefined ? ` · profit ${fmt((enc.salePrice ?? 0) - enc.saleCost)}` : ''}</b>
                  <span>
                    {buyer?.royal ? `${buyer.royal.warrant} · ` : `${buyer?.name} is now ${tierOf(g.relationships[enc.buyerId]).name} · `}Reputation {g.reputation}
                  </span>
                </>
              ) : (
                <>
                  <b>{buyer?.name} walked away</b>
                  <span>
                    {enc.mocked
                      ? `Nothing on your stall is at their level. They want ${['', 'Common', 'Fine', 'Exceptional', 'Legendary'][BUYER_TIERS[enc.buyerId]?.[0] ?? (buyer?.royal ? 3 : 2)]} rugs or better.`
                      : enc.groomed === 'smell' && enc.patience <= 0
                        ? 'You smelled of the road. A visit to the hammam would have helped.'
                      : enc.embellishCaught
                      ? 'They caught the story. Claim only what you know.'
                      : enc.insulted
                        ? 'The price offended them. Watch the budget they gave you.'
                        : enc.patience <= 0
                          ? 'Their patience ran out. Fewer repeats, more listening.'
                          : 'Nothing you showed matched what they value.'}
                  </span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {atCourt ? (
                <button className="btn primary" onClick={() => { setDial(null); g.endAudience(); onLeaveAudience?.(); }} data-testid="leave-audience">
                  Leave the audience
                </button>
              ) : (
                <button className={`btn primary${autoNext ? ' auto-next' : ''}`} onClick={() => { setDial(null); g.nextVisit(); }} data-testid="next-visit">
                  {isLast ? 'End of day' : 'Next customer'}
                  {autoNext && <i className="auto-bar" aria-hidden="true" />}
                </button>
              )}
              {onGoto && !atCourt && !isLast && avail.length <= 3 && (
                <button className="btn" onClick={() => onGoto('supplier')} data-testid="goto-rashid">
                  Restock at Rashid's
                </button>
              )}
            </div>
          </div>
        ) : dial !== null && presented ? (
          <div className="dial" data-testid="price-dial">
            <div className="dial-btns">
              <button onClick={() => setDial((d) => ladderDown(d ?? 5, 4))} aria-label="Lower a lot">«</button>
              <button onClick={() => setDial((d) => ladderDown(d ?? 5))} aria-label="Lower">−{fmt(dial - ladderDown(dial))}</button>
            </div>
            <div className="price">
              <b data-testid="dial-value" data-pt={dial}>{fmt(dial)}</b>
              <small>{est(presented.uid)}{enc?.buyerOffer ? ` · ${enc.finalOffered ? 'Final offer' : 'Offer'} ${fmt(enc.buyerOffer)}` : ''}</small>
              {enc?.budgetKnown && dial > enc.budgetKnown[1] && <small className="warn" data-testid="dial-warn">Above the budget {buyer?.name} gave you</small>}
            </div>
            <div className="dial-btns">
              <button onClick={() => setDial((d) => ladderUp(d ?? 5))} aria-label="Raise">+{fmt(ladderUp(dial) - dial)}</button>
              <button onClick={() => setDial((d) => ladderUp(d ?? 5, 4))} aria-label="Raise a lot">»</button>
            </div>
            <div className="dial-foot">
              <button className="btn" onClick={() => setDial(null)}>Back</button>
              <button
                className="btn primary"
                data-testid="offer-price"
                onClick={() => {
                  g.act('name_price', dial);
                  setDial(null);
                }}
              >
                Ask {fmt(dial)}
              </button>
            </div>
          </div>
        ) : !enc ? (
          <div className="act-note">The lane is quiet.</div>
        ) : atCourt && avail.length === 0 ? (
          <div className="act-note">You carried no rugs here. Pack rugs for the road in your Stock before travelling. <button className="btn" onClick={() => { g.endAudience(); onLeaveAudience?.(); }} data-testid="leave-audience">Take your leave</button></div>
        ) : actions.length === 0 ? (
          <div className="act-note">{enc.presented ? 'Choose what to say.' : 'Tap a rug to lay it on the table.'}</div>
        ) : (
          <>
            {canQuickSell(enc, presented) && presented && (
              <button className="quick-sale" onClick={() => onAction('quick_sale')} data-testid="quick-sale">
                <Icon name="coin" /> Quick sale · {fmt(quickPrice(enc, presented))}<small>a Common rug, no haggling</small>
              </button>
            )}
            {actions.map((a) => {
              const allowed = tutorialAllows(g, a.id);
              const glow = tut && allowed;
              return (
                <button key={a.id} className={`act ${glow ? 'glow' : ''}`} disabled={!allowed || a.disabled} onClick={() => onAction(a.id)} data-testid={`act-${a.id}`}>
                  <Icon name={a.icon} />
                  <span>
                    <span className="t">{a.label}</span>
                    <span className="s">{a.sub}</span>
                  </span>
                </button>
              );
            })}
            {!enc.presented && (enc.stage === 'qualification' || (tut && step === 'rug')) && actions.length < 4 && <div className="act-note" style={{ gridColumn: 'auto' }}>Or tap a rug to present it</div>}
          </>
        )}
      </div>

      {inspect && (
        <RugViewer
          uid={inspect}
          onClose={() => {
            setInspect(null);
            g.inspectorClosed();
          }}
        />
      )}
    </div>
  );
}
