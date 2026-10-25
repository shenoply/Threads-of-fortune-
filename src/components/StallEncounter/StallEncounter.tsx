import { useAudioEnv } from '../../game/audio/useAudioEnv';
import { placedPieces } from '../../game/stallDressing';
import { createPortal } from 'react-dom';
import { IntroFilm, filmReady, type FilmId } from '../IntroFilm/IntroFilm';
import { STALL_FILMS } from '../IntroFilm/films';
import { RugPicker, rugNames, typicalSale, type BuyerTaste } from './RugPicker';
import { openGuide } from '../Guide/Guide';
import { BUYER_TIERS, CELEB_INFO } from '../../data/buyers';
import { hasPerk } from '../../data/character';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { stallFigure } from './stallArt';
import { fmt, ladderDown, ladderUp, snap, snapDown } from '../../game/economy/money';
import { availableRugs, tutorialAllows, useGame } from '../../game/state/store';
import { fitScore, getActions, prefsFor, suggestedAsk, tierOf, canQuickSell, quickPrice, type ActionId } from '../../game/systems/negotiation';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { Scene, InfoBand } from './Scene';
import { usePlayback } from '../BuyerDialogue/usePlayback';
import { Icon } from '../Icon';
import { rugThumb } from '../RugViewer/rugArt';
import { RugViewer } from '../RugViewer/RugViewer';
import { audio } from '../../game/audio/engine';
import './stall-fixes.css';

// the most height the talk and the buttons under the stall picture have needed, per screen size
const REST_KEY = 'tof-stall-rest2';
let restMemo: Record<string, number> | null = null;
function restMost(key: string) {
  if (!restMemo) { try { restMemo = JSON.parse(localStorage.getItem(REST_KEY) || '{}'); } catch { restMemo = {}; } }
  const [w, h] = key.split('x').map(Number);
  // a first visit starts from a share of the screen that has room for the usual talk and buttons
  return restMemo![key] ?? (w < 600 ? Math.round(h * 0.5) : 0);
}
function keepRestMost(key: string, v: number) {
  restMemo = { ...(restMemo ?? {}), [key]: v };
  try { localStorage.setItem(REST_KEY, JSON.stringify(restMemo)); } catch { /* private mode */ }
}

/** buyers of everyday stock (not the famous, the courts or a story's buyers): a quick deal is offered */
const everyday = (id: string) => !CELEB_INFO[id as keyof typeof CELEB_INFO] && !BUYERS[id]?.royal && (BUYER_TIERS[id]?.[0] ?? 1) <= 1 && !['cohen', 'malek', 'nabil'].includes(id);

export function StallEncounter({ onGoto, onLeaveAudience }: { onGoto?: (t: 'supplier') => void; onLeaveAudience?: () => void }) {
  const g = useGame();
  const enc = g.encounter;
  const [offset, setOffset] = useState(0);
  const [inspect, setInspect] = useState<string | null>(null);
  const [dial, setDial] = useState<number | null>(null);
  // a buyer whose stature the counter would hide is first seen whole, once
  const [arrived, setArrived] = useState<string | null>(null);
  const atCourt = !!enc?.venue;
  // a special buyer's film the first time they come to the stall (Nabil, Cohen)
  const [filmDone, setFilmDone] = useState(false);
  const filmFor = enc && !enc.outcome && STALL_FILMS.includes(enc.buyerId as FilmId) && filmReady(enc.buyerId as FilmId) && !(g.introSeen ?? []).includes(enc.buyerId) && !filmDone ? (enc.buyerId as FilmId) : null;
  // Selim Kassab undercutting you is only worth a different tune at your own stall, while that mission is live
  const rivalActive = !atCourt && g.missions?.rival === 'active';
  useAudioEnv(atCourt ? 'palace' : rivalActive ? 'market' : null, atCourt ? 'palace' : rivalActive ? 'rivalry' : undefined);
  // at court you can only show the rugs your caravan carried there
  const avail = atCourt ? availableRugs(g, enc?.buyerId).filter((i) => !i.stored) : availableRugs(g, enc?.buyerId);
  // a rug picked from the full list comes to the front of the counter
  const [front, setFront] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const names = useMemo(() => rugNames(g.inventory), [g.inventory]);
  // what you have learned of this buyer: asked about their room or taste, or met them before
  const relNow = enc ? g.relationships[enc.buyerId] : undefined;
  const learned = !!enc && (enc.revealed.length > 0 || (relNow?.visits ?? 0) > 0);
  const taste: BuyerTaste | undefined = enc && learned && BUYERS[enc.buyerId] ? {
    name: BUYERS[enc.buyerId].name,
    fit: (it) => fitScore(prefsFor(enc), RUGS[it.typeId], it),
    minTier: BUYER_TIERS[enc.buyerId]?.[0] ?? (BUYERS[enc.buyerId].royal ? 3 : 1),
  } : undefined;
  const ordered = front && avail.some((i) => i.uid === front) ? [avail.find((i) => i.uid === front)!, ...avail.filter((i) => i.uid !== front)] : avail;
  const shown = ordered.length <= 3 ? ordered : [...ordered, ...ordered].slice(offset % ordered.length, (offset % ordered.length) + 3);
  const presented = enc?.presented ? g.inventory.find((i) => i.uid === enc.presented) : undefined;
  // the rug tray starts open; its handle (a tap, or a swipe down/up) folds it away and back, and the
  // choice holds from one buyer to the next
  const [tray, setTray] = useState(() => { try { return localStorage.getItem('tof-rug-tray') !== 'shut'; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem('tof-rug-tray', tray ? 'open' : 'shut'); } catch { /* no storage */ } }, [tray]);
  const [swipe, setSwipe] = useState<number | null>(null);
  const talking = !!enc && !enc.outcome;
  // During the talk the picture gets exactly the height the rest leaves free, and never more than its
  // own shape (taller would zoom in and crop the people out). Measured, because grid sizing alone
  // squeezes the talk and the buttons before it gives up any of the picture.
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !talking) return;
    // The talk under the picture (the line, the narrator, the buyer's plate) takes the height of the
    // longest it has been this visit, so the picture does not jump with every line; any height the
    // band is given beyond its words is kept between the line and the buyer's plate.
    let bandMost = 0, bandSeen = 0, spare = 0;
    const locked = { key: '', enc: '', h: 0 };
    const fit = () => {
      let rest = 0, bandNow = bandMost;
      for (const c of Array.from(el.children) as HTMLElement[]) {
        if (c.classList.contains('scene') || c.classList.contains('stall-toolbar')) continue;
        if (getComputedStyle(c).position === 'absolute' || getComputedStyle(c).position === 'fixed') continue;
        if (c.classList.contains('band')) {
          const st = getComputedStyle(c);
          const kids = (Array.from(c.children) as HTMLElement[]).filter((k) => getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed' && k.getBoundingClientRect().height > 0);
          const own = kids.reduce((a, k) => a + k.getBoundingClientRect().height, 0) + Math.max(0, kids.length - 1) * (parseFloat(st.rowGap) || 0)
            + parseFloat(st.paddingTop) + parseFloat(st.paddingBottom) + parseFloat(st.borderTopWidth) + parseFloat(st.borderBottomWidth);
          // from the first line on, room is kept for a usual exchange (three lines said) so the picture is sized once and does not shrink as the talk fills in
          let floor = 0;
          // (on a tall phone only: a short one keeps every pixel it can for the picture)
          if (el.clientWidth < 600 && el.clientHeight > 680) {
            const plate = c.querySelector('.plate-buyer') as HTMLElement | null;
            floor = (plate?.getBoundingClientRect().height ?? 0) + 15.5 * 1.3 * 3 + 18 + 4 + 2 * (parseFloat(st.rowGap) || 0)
              + parseFloat(st.paddingTop) + parseFloat(st.paddingBottom);
          }
          bandMost = Math.max(bandMost, Math.ceil(own), Math.ceil(floor));
          spare = Math.max(0, bandMost - Math.max(Math.ceil(own), bandSeen));
          bandSeen = Math.max(bandSeen, Math.ceil(own));
          bandNow = Math.ceil(own);
          rest += bandMost;
          continue;
        }
        rest += c.getBoundingClientRect().height;
      }
      // a phone held upright gives the picture all the height the rest leaves (the scene crops the
      // painting at the sides and keeps both people in view); a wide panel keeps the painting's shape
      const natural = el.clientWidth < 600 ? el.clientWidth * 1.45 : el.clientWidth * 470 / 780;
      // on a short phone the picture never gives up its own shape's height to a line said earlier:
      // there it follows the talk as it is now
      const shape = el.clientWidth * 470 / 780;
      void bandNow; void shape;
      // The picture keeps one size for the whole conversation: it is sized once, for the most room
      // the talk and the buttons have ever needed on this screen size (remembered between visits), so
      // asking, showing a rug or haggling never makes it jump. Only turning or resizing the screen
      // sizes it again.
      const key = `${el.clientWidth}x${el.clientHeight}`;
      // the picture never shrinks to a sliver: at least about a third of the screen (heads, the counter, the rug)
      const minScene = Math.min(natural, Math.max(200, el.clientHeight * 0.33));
      // what was remembered from earlier visits can never claim more than the picture can spare
      const most = Math.min(Math.max(rest, restMost(key)), el.clientHeight - minScene);
      if (most > restMost(key)) keepRestMost(key, most);
      if (locked.key !== key || locked.enc !== enc?.id) {
        locked.key = key; locked.enc = enc?.id ?? '';
        // the room kept ahead for longer lines never squeezes the picture below 200px (heads and all)
        locked.h = Math.max(minScene, Math.min(natural, el.clientHeight - most), Math.min(natural, el.clientHeight - (most - spare), 200));
      }
      // never at the cost of the buttons: if the talk has grown past what was kept for it, give way
      if (el.clientHeight - locked.h < rest - 1) locked.h = Math.max(Math.min(minScene, 200), el.clientHeight - rest);
      el.style.setProperty('--scene-h', `${Math.floor(locked.h)}px`);
    };
    fit();
    // Set up once per conversation (and when the rug tray folds), not on every render: the dialogue
    // re-renders for each typed character. The observers catch everything else — the window or a row
    // changing size, a row (the price dial, Cohen's help link) appearing or going.
    const ro = new ResizeObserver(fit);
    // the band is stretched to its row, so the lines inside it are watched as well
    const band = () => el.querySelector(':scope > .band');
    const watch = () => {
      ro.disconnect(); ro.observe(el);
      for (const c of Array.from(el.children)) ro.observe(c);
      for (const c of Array.from(band()?.children ?? [])) ro.observe(c);
    };
    watch();
    const mo = new MutationObserver(() => { watch(); fit(); });
    mo.observe(el, { childList: true });
    const b = band();
    if (b) mo.observe(b, { childList: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [talking, enc?.id, tray]);
  // Keyed on the encounter's own stamped id, not visitIdx: visitIdx advances the instant a sale
  // closes (settle() runs inside act(), before the player has seen the result screen or clicked
  // "Next customer"), so keying the dialogue-playback reset on it replayed the whole conversation
  // — including the buyer's opening line — while the "Sold" banner was still on screen.
  // while a first-meeting film plays, the conversation waits (no voice under the narrator), then starts
  const resetKey = `${g.day}-${enc?.id ?? 'none'}${filmFor ? '-film' : ''}`;
  const log = useMemo(() => (filmFor ? [] : enc?.log ?? []), [enc?.log, filmFor]);
  const { view, skip } = usePlayback(log, resetKey, enc?.buyerId ?? '');
  // The narrator's line belongs to the moment it was said: once the talk moves to another stage, or
  // ends, it is dropped rather than left standing over the bargaining, the sale or the walk-away.
  // A line said at the new stage (the lesson's notes, the restock reminder after a sale) still shows.
  const stageKey = enc ? `${enc.id}|${enc.stage}|${enc.outcome ?? ''}` : '';
  // The same goes for a stage direction ("Yusuf comes in fast...").
  const narrMark = useRef({ text: '', at: '' });
  const capMark = useRef({ text: '', at: '' });
  if (view.narrator !== narrMark.current.text) narrMark.current = { text: view.narrator, at: stageKey };
  if (view.caption !== capMark.current.text) capMark.current = { text: view.caption, at: stageKey };
  const staleNarr = !!view.narrator && narrMark.current.at !== stageKey;
  const staleCap = !!view.caption && capMark.current.at !== stageKey;
  const bandView = staleNarr || staleCap ? { ...view, narrator: staleNarr ? '' : view.narrator, caption: staleCap ? '' : view.caption } : view;
  // A buyer who walks away says their last line first; the result card waits until it is written
  // out (a tap on the picture hurries it), and never more than a few seconds.
  const lastTalk = enc?.outcome === 'walked' ? [...log].reverse().find((l) => l.speaker === 'buyer' || l.speaker === 'seller') : undefined;
  const lineDone = !lastTalk || ((lastTalk.speaker === 'buyer' ? view.buyer : view.seller) === lastTalk.text && (view.active?.text !== lastTalk.text || view.typed >= lastTalk.text.length));
  const [lateFor, setLateFor] = useState('');
  useEffect(() => {
    if (enc?.outcome !== 'walked') return;
    const id = enc.id;
    const t = window.setTimeout(() => setLateFor(id), 4000);
    return () => window.clearTimeout(t);
  }, [enc?.outcome, enc?.id]);
  const showResult = !!enc?.outcome && (lineDone || lateFor === enc.id);
  const rel = enc ? g.relationships[enc.buyerId] : undefined;
  const tier = rel ? tierOf(rel) : { idx: 0, name: 'New' as const };
  const buyer = enc ? BUYERS[enc.buyerId] : null;
  const priorities = buyer && enc ? [...prefsFor(enc).roomPriorities, ...buyer.priorities.drawn].filter((p) => enc.revealed.includes(p.id)) : [];
  const tut = !!enc?.tutorial && !g.tutorial.done;
  // a customer who walks away: the next one comes on their own unless you are quicker (a plain
  // timer, so a phone with its sound off is not kept waiting). A sale waits for your tap, so the
  // receipt stays up as long as you want to read it.
  // ...and a walk-away that still leaves you a choice (put the rug aside for them) waits for a tap too,
  // or the choice would vanish before it could be read
  const reserveLeft = !!reserveChoice(g);
  const autoNext = showResult && enc?.outcome !== 'sold' && !atCourt && !tut && !reserveLeft;
  useEffect(() => {
    if (!autoNext) return;
    const t = window.setTimeout(() => { setDial(null); useGame.getState().nextVisit(); }, 8000);
    return () => window.clearTimeout(t);
  }, [autoNext]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = g.tutorial.step;

  const ctx = { inventory: g.inventory, upgrades: g.upgrades, dressing: placedPieces(g), reputation: g.reputation, rel: rel ?? { visits: 0, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] }, rng: Math.random, nabil: g.nabil, cohen: g.cohen, findings: g.arranFindings ?? [], day: g.day };
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
    return <><span className="nw">Paid {fmt(it.paid)}</span> · <span className="nw">Est. {fmt(lo)}–{fmt(hi)}</span></>;
  };

  const isLast = g.visitIdx >= g.queue.length;
  // the lesson's first sale ends with the narrator sending you to Uncle Rashid, so his is the big button
  const restockFirst = !!enc?.tutorial && enc.outcome === 'sold' && !!onGoto && !atCourt && !isLast;
  const net = enc?.saleCost !== undefined ? (enc.salePrice ?? 0) - enc.saleCost : null;

  return (
    <div ref={root} className={`stall${talking ? ' in-talk' : ''}${tray ? '' : ' tray-shut'}${enc?.outcome ? ' has-result' : ''}`} data-testid="stall">
      {filmFor && createPortal(<IntroFilm id={filmFor} onDone={() => { useGame.getState().markIntroSeen(filmFor); setFilmDone(true); }} />, document.body)}
      {((enc && !enc.outcome && !enc.tutorial && !enc.venue) || (tut && enc && !enc.outcome)) && (
        <div className="stall-toolbar">
          {enc && !enc.outcome && !enc.tutorial && !enc.venue && (
            <button className="step-away" onClick={() => g.stepAway()} data-testid="step-away">⟵ Step away<small>they wait an hour</small></button>
          )}
          {enc && !enc.outcome && !enc.tutorial && !enc.venue && (
            <button className="step-away" onClick={() => g.letGo()} data-testid="let-go">Let them go<small>next customer</small></button>
          )}
          {tut && enc && !enc.outcome && (
            <button className="step-away" onClick={() => g.skipTutorial()} data-testid="skip-lesson">Skip the lesson<small>sell it your own way</small></button>
          )}
        </div>
      )}
      <Scene enc={enc} presented={presented} view={bandView} onSkip={skip} onCat={g.pet} upgrades={g.upgrades} />
      {enc && enc.buyerId === 'nabil' && !enc.outcome && !enc.presented && (rel?.visits ?? 0) === 0 && arrived !== enc.id && (
        <div className="arrival-card" role="dialog" aria-label={`${buyer?.name} arrives`} data-testid="arrival-card">
          <img src={stallFigure('nabil').src} alt="Nabil al-Khatib, a short, bald, bearded merchant in a grey three-piece suit, a leather portfolio under his arm" draggable={false} />
          <div>
            <small>A new buyer</small>
            <h2>{buyer?.name}</h2>
            <p>{buyer?.role}. {buyer?.bio}</p>
            <button className="btn primary" onClick={() => { setArrived(enc.id); audio.sfx('tap'); }} data-testid="arrival-ok">Greet him</button>
          </div>
        </div>
      )}
      <InfoBand enc={enc} presented={presented} view={bandView} tierName={tier.name} priorities={priorities} onSkip={skip} />

      {enc?.buyerId === 'cohen' && !enc.outcome && <button className="help-link" onClick={() => openGuide('cohen')} data-testid="help-cohen">How Cohen's orders work?</button>}
      {talking && (
        <button
          className="tray-handle"
          onClick={() => setTray((t) => !t)}
          onPointerDown={(e) => setSwipe(e.clientY)}
          onPointerUp={(e) => { if (swipe !== null && Math.abs(e.clientY - swipe) > 24) { setTray(e.clientY < swipe); } setSwipe(null); }}
          aria-expanded={tray}
          data-testid="tray-handle"
        >
          <i aria-hidden="true" />
          {tray ? 'Hide the rugs' : presented ? <>Rugs · <b>{names[presented.uid] ?? RUGS[presented.typeId].name}</b> on the table</> : 'Show the rugs'}
          <span aria-hidden="true">{tray ? '▾' : '▴'}</span>
        </button>
      )}
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
              aria-label={`${names[it.uid] ?? t.name}${isP ? ', on the table. Tap to inspect' : ''}`}
            >
              <div className="thumb">
                <img src={rugThumb(t)} alt="" style={it.condition === 'Dirty' ? { filter: 'sepia(0.5) brightness(0.75)' } : undefined} />
              </div>
              {it.condition !== 'Good' && <span className="badge">{it.condition}</span>}
              {cat && (
                <span className="paw" title="Saffron is sleeping on this rug">
                  <Icon name="paw" />
                </span>
              )}
              {isP && <span className="hint">Inspect</span>}
              <span className={`nm t-tier-${t.tier ?? 1}`}>{names[it.uid] ?? t.name}</span>
              {/* what you paid and what it usually fetches, side by side: the margin at a glance */}
              <span className="val" data-testid="rugcard-value"><em className="paid">{it.paid ? `paid ${fmt(it.paid)}` : 'a gift'}</em> → ≈ {fmt(typicalSale(it))}</span>
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
          <button className="side-btn" onClick={() => setPicker(true)} disabled={avail.length <= 3 || tut} aria-label={`See all ${avail.length} rugs`} data-testid="change-rugs">
            <Icon name="swap" />
            All {avail.length}
          </button>
          {picker && <RugPicker rugs={avail} names={names} taste={taste} presented={enc?.presented} onClose={() => setPicker(false)} onPick={(uid) => { setPicker(false); setFront(uid); setOffset(0); if (enc?.presented !== uid) onRug(uid); }} />}
        </div>
      </div>

      <div className="actions" data-testid="actions">
        {/* the money on the table, where the buttons are: what you asked, what they offer */}
        {enc && !enc.outcome && (enc.buyerOffer || enc.askPrice) ? (
          <div className={`offer-bar ${enc.finalOffered ? 'final' : ''}`} data-testid="offer-bar">
            {enc.askPrice ? <span>You ask <b>{fmt(enc.askPrice)}</b></span> : <span />}
            {enc.buyerOffer ? <span className="theirs" data-testid={enc.finalOffered ? 'final-offer' : undefined}>{enc.finalOffered ? 'Final offer' : `${buyer?.name.split(' ')[0] ?? 'They'} offers`} <b data-testid="offer-amount">{fmt(enc.buyerOffer)}</b></span> : <span className="theirs dim">No offer yet</span>}
            {/* what their offer means for you: the profit on what the rug cost, and the stars it would earn */}
            {presented && enc.buyerOffer ? (() => {
              const cost = presented.paid, gain = enc.buyerOffer - cost, pct = cost > 0 ? Math.round((gain / cost) * 100) : 100;
              const stars = cost <= 0 ? 2 : pct >= 75 ? 3 : pct >= 25 ? 2 : 1;
              return <span className={`margin ${gain < 0 ? 'neg' : stars === 3 ? 'top' : ''}`} data-testid="offer-margin">{gain >= 0 ? '+' : '−'}{fmt(Math.abs(gain))} <i>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</i></span>;
            })() : null}
          </div>
        ) : null}
        {enc?.outcome && !showResult ? (
          <div className="result-wait" aria-hidden="true" />
        ) : enc?.outcome ? (
          <div className={`result ${enc.outcome}`} data-testid="result">
            <div className="r-main">
              {enc.outcome === 'sold' ? (
                <>
                  <b>
                    Sold for <span className="nw">{fmt(enc.salePrice ?? 0)}</span>
                    {net !== null && (net < 0
                      ? <> · <span className="r-loss" data-testid="sale-loss">a loss of <span className="nw">{fmt(-net)}</span></span></>
                      : <> · net profit <span className="nw">{fmt(net)}</span></>)}
                  </b>
                  <span>
                    {buyer?.royal ? (g.court?.warrants?.includes(enc.buyerId) ? `${buyer.royal.warrant} · ` : 'No warrant this time: it needs a court-grade rug at a fair price · ') : `${buyer?.name} is now ${tierOf(g.relationships[enc.buyerId]).name} · `}Reputation {g.reputation}
                  </span>
                </>
              ) : (
                <>
                  <b>{buyer?.name} {enc.letGo ? 'left' : 'walked away'}</b>
                  <span>
                    {enc.mocked
                      ? `Nothing on your stall is at their level. They want ${['', 'Common', 'Fine', 'Exceptional', 'Legendary'][BUYER_TIERS[enc.buyerId]?.[0] ?? (buyer?.royal ? 3 : 2)]} rugs or better.`
                      : enc.groomed === 'smell' && enc.patience <= 0
                        ? 'You smelled of the road. A visit to the hammam would have helped.'
                      : enc.malekUnsure
                        ? 'He agreed the price and still would not buy: Malek only buys when he is completely convinced. He liked it, though. Keep it aside and he may come back for it.'
                      : enc.letGo
                        ? 'You let them go without a sale. No harm done.'
                      : enc.nabilAngry
                      ? 'He heard the same pitch, or a bluff, one time too many. Answer his question plainly next time; he will be back in a week or so.'
                      : enc.embellishCaught
                      ? 'They caught the story. Claim only what you know.'
                      : enc.insulted
                        ? (enc.budgetKnown ? 'The price offended them. Watch the budget they gave you.' : 'The price was too high for them.')
                        : enc.patience <= 0
                          ? 'Their patience ran out. Fewer repeats, more listening.'
                          : 'Nothing you showed matched what they value.'}
                  </span>
                </>
              )}
            </div>
            <div className="r-btns">
              {restockFirst && (
                <button className="btn primary" onClick={() => onGoto?.('supplier')} data-testid="goto-rashid">
                  Restock at Rashid's
                </button>
              )}
              {atCourt ? (
                <button className="btn primary" onClick={() => { setDial(null); g.endAudience(); onLeaveAudience?.(); }} data-testid="leave-audience">
                  Leave the audience
                </button>
              ) : (
                <button className={`btn${restockFirst ? '' : ' primary'}${autoNext ? ' auto-next' : ''}`} onClick={() => { setDial(null); g.nextVisit(); }} data-testid="next-visit">
                  {isLast ? 'End of day' : 'Next customer'}
                  {autoNext && <i className="auto-bar" aria-hidden="true" />}
                </button>
              )}
              <ReserveAfter />
              {onGoto && !atCourt && !isLast && !restockFirst && avail.length <= 3 && (
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
              <button className="nw" onClick={() => setDial((d) => ladderDown(d ?? 5))} aria-label="Lower">−{fmt(dial - ladderDown(dial))}</button>
            </div>
            <div className="price">
              <b data-testid="dial-value" data-pt={dial}>{fmt(dial)}</b>
              <small>{presented.paid ? <>paid {fmt(presented.paid)} · <span className={dial - presented.paid >= 0 ? 'pos' : 'nw'}>{dial - presented.paid >= 0 ? '+' : '−'}{fmt(Math.abs(dial - presented.paid))}</span> · </> : null}{est(presented.uid)}{enc?.buyerOffer ? <> · <span className="nw">{enc.finalOffered ? 'Final offer' : 'Offer'} {fmt(enc.buyerOffer)}</span></> : null}</small>
              {enc?.budgetKnown && dial > enc.budgetKnown[1] && <small className="warn" data-testid="dial-warn">Above the budget {buyer?.name} gave you</small>}
            </div>
            <div className="dial-btns">
              <button className="nw" onClick={() => setDial((d) => ladderUp(d ?? 5))} aria-label="Raise">+{fmt(ladderUp(dial) - dial)}</button>
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
            {/* an everyday buyer: one tap lays out the plain rug that suits them best and sells it at a fair
                price, so the day's routine trade does not have to be haggled every time */}
            {!enc.presented && !enc.outcome && !tut && everyday(enc.buyerId) && (() => {
              const prefs = prefsFor(enc);
              const pick = avail.filter((i) => RUGS[i.typeId]?.tier === 1).sort((a, b) => fitScore(prefs, RUGS[b.typeId], b) - fitScore(prefs, RUGS[a.typeId], a))[0];
              if (!pick) return null;
              return (
                <button className="quick-sale" onClick={() => { g.present(pick.uid); window.setTimeout(() => { const e = useGame.getState().encounter; if (e && !e.outcome && e.presented === pick.uid) g.act('quick_sale'); }, 60); }} data-testid="quick-deal">
                  <Icon name="coin" /> Quick deal · {RUGS[pick.typeId].name}<small>the plain rug that suits them, a fair price, no haggling</small>
                </button>
              );
            })()}
            {canQuickSell(enc, presented) && presented && (() => {
              const qp = quickPrice(enc, presented);
              const cmp = enc.buyerOffer
                ? qp > enc.buyerOffer
                  ? `more than their ${fmt(enc.buyerOffer)} offer, no haggling`
                  : `matches their offer, no haggling`
                : 'a Common rug, no haggling';
              return (
                <button className="quick-sale" onClick={() => onAction('quick_sale')} data-testid="quick-sale">
                  <Icon name="coin" /> Quick sale · {fmt(qp)}<small>{cmp}</small>
                </button>
              );
            })()}
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

/** After a buyer walks away from a rug they liked: put it aside for them (hidden from everyone else). */
function reserveChoice(g: ReturnType<typeof useGame.getState>) {
  const enc = g.encounter;
  if (!enc || enc.outcome !== 'walked' || !enc.presented || enc.venue) return null;
  const item = g.inventory.find((i) => i.uid === enc.presented);
  const liked = enc.malekUnsure || enc.presentedFit >= 55;
  if (!item || !liked) return null;
  return { enc, item };
}

function ReserveAfter() {
  const g = useGame();
  const [done, setDone] = useState('');
  const c = reserveChoice(g);
  if (!c) return null;
  const { enc, item } = c;
  const name = BUYERS[enc.buyerId]?.name ?? 'them';
  if (done || item.reservedFor === enc.buyerId) return <small className="reserve-done" data-testid="reserve-done">{done || `Kept aside for ${name}.`}</small>;
  return (
    <button className="btn" onClick={() => setDone(useGame.getState().reserveRug(item.uid, enc.buyerId))} data-testid="reserve-after">
      Put the {RUGS[item.typeId].name} aside for {name}
    </button>
  );
}
