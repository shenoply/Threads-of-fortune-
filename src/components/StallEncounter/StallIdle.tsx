import { SeasonLine } from '../Season/SeasonReport';
import { goalLabel, goalProgress, showProgress } from '../../game/systems/weekGoal';
import { omenToday, WATCH_COST } from '../../game/systems/omens';
import { RIVAL_FIRST, rivalOf, rivalProgress, yourStall } from '../../game/systems/laneRival';
import { MarketLine } from '../Market/MarketLine';
import { NextOnRoad } from '../Road/Road';
import { SKILLS, SKILL_ORDER, levelOf, xpFor } from '../../data/character';
import { useAtStall } from '../Radio/Gramophone';
import { openingDone } from '../../game/opening';
import { lookUps, sceneIdFor, sceneSmall } from '../../game/stallScenes';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { AuctionBoard } from '../Auction/AuctionBoard';
import type { Target } from '../World/Campaign';
import { BUYERS } from '../../data/buyers';
import { RUGS } from '../../data/rugs';
import { useGame, arrivalAt, clock } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { useFilmSound } from '../../game/audio/useFilmSound';
import { laneDay } from '../../game/economy/life';
import { affordableUpgrades, openUpgrades } from '../Inventory/StallUpgrades';
import { openMalek } from '../../game/nav';
import { fedOf, shopOpen as malekOpen } from '../../game/systems/malek';
import { ShopBoyCard } from './ShopBoyCard';
import { UPGRADES } from '../../data/suppliers';
import { fmt } from '../../game/economy/money';

/** The stall between customers: the road ahead, the next customer, and the auction calendar. */
export function StallIdle({ onGo }: { onGo: (t: Target) => void }) {
  useAtStall();
  const g = useGame();
  const [board, setBoard] = useState(false);
  const [tidy, setTidy] = useState(false);
  // the stall's lesser things, folded away; open once and they stay open
  const [more, setMore] = useState(() => { try { return localStorage.getItem('tof-idle-more') === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('tof-idle-more', more ? '1' : '0'); } catch { /* private mode */ } }, [more]);
  const canBuy = affordableUpgrades(g);
  const h = g.world.hour;
  const left = Math.max(0, g.queue.length - g.visitIdx);
  const next = left ? arrivalAt(g, g.visitIdx) : null;
  const mins = next !== null ? Math.max(0, Math.round((next - h) * 60)) : 0;
  const midday = next !== null && next >= 15 && h < 15;
  const friday = next !== null && laneDay(g.day).late && h < 13;
  // Malek's grill is two minutes away: a meal word for the hour, and a nudge when you are hungry
  const malekHere = g.world.at === 'giza' && malekOpen(h);
  const meal = h < 11 ? 'Breakfast' : h < 17 ? 'Lunch' : 'Supper';
  const hungry = fedOf(g.condition) < 20;
  // the day is over (the last customer has gone, or you shut early): waiting for a customer would do nothing
  const shut = g.dayOver && !g.held;

  return (
    <div className="screen idle" data-testid="stall-idle">
      <div className="idle-scene" aria-hidden="true">
        <img src={sceneSmall(sceneIdFor(lookUps(g)))} alt="" draggable={false} data-testid="idle-stall-pic" />
        <span className="idle-clock-chip">{clock(h)}</span>
      </div>
      <div className="idle-next" data-testid="idle-next">
        {shut ? <p>The stall is shut for the evening. Count the day's takings below, have supper, or start the next day.</p> : g.held ? <p><b>{BUYERS[g.held.encounter.buyerId]?.name} is still waiting for you.</b></p> : next === null ? <p>No more customers today.</p> : friday ? <p>It is Friday. The lane is quiet until after the noon prayer. Customers come from <b>{clock(next)}</b>.</p> : midday ? <p>The lane is empty in the midday heat. Customers come back around <b>{clock(next)}</b>.</p> : mins === 0 ? <p><b>Someone is walking up to your stall.</b></p> : <p>Next customer <b>{clock(next)}</b> · in {mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}</p>}
        {!shut && <OmenLine />}
      </div>
      {/* once the stall is shut for the day the big button is the evening's own: it turns the page to
          the next morning, the same as Next day on the ledger slip below */}
      <button className="btn primary big" onClick={() => {
        audio.sfx('tap');
        if (shut) { const nd = document.querySelector<HTMLElement>('[data-testid="close-stall"]'); if (nd) nd.click(); else g.endDay(); return; }
        g.waitForCustomer();
      }} data-testid="stall-wait">{shut ? 'Start the next day' : g.held ? 'Go back to them' : next === null ? 'Close up for the evening' : mins === 0 ? 'Serve them' : `Wait for the customer (${clock(next)})`}</button>
      <div className="idle-next idle-info">
        {!shut && <TodaysChance />}
        {!shut && <MarketLine where="stall" />}
        {!shut && <StallDream />}
        {!shut && <RivalLine />}
        {!shut && <WeekLine />}
        {!shut && <SeasonLine />}
        {!shut && <SkillGoal />}
        {malekHere && hungry && !(next !== null && mins >= 60) && (
          <p className="idle-hungry" data-testid="idle-hungry">You are hungry, and a hungry seller gives discounts. <button className="btn small" onClick={() => openMalek()} data-testid="idle-malek-hungry">{meal} at Malek's</button></p>
        )}
      </div>
      <div className="idle-next idle-next--after">
        {!shut && !g.held && next !== null && mins >= 60 && (
          <div className="idle-wait" data-testid="idle-wait">
            <p>While you wait (be back by {clock(next)}):</p>
            <div className="idle-wait__row">
              {malekHere && <button className="btn small" onClick={() => openMalek()} data-testid="idle-wait-malek"><Icon name="tea" /> {meal} at Malek's{hungry ? ' (you are hungry)' : ''}</button>}
              <button className="btn small" onClick={() => onGo('supplier')} data-testid="idle-wait-supplier"><Icon name="bag" /> Stock up at Rashid's</button>
              {g.world.at === 'giza' && <button className="btn small" onClick={() => onGo('district')} data-testid="idle-wait-district"><Icon name="map" /> Walk Giza (Arran's lab)</button>}
              <button className="btn small" onClick={() => onGo('paper')} data-testid="idle-wait-paper"><Icon name="book" /> Read the paper</button>
            </div>
          </div>
        )}
        {/* the flying-carpet dream, on demand (components/Dream) */}
        <button className="btn small idle-dream" onClick={() => window.dispatchEvent(new CustomEvent('tof:dream', { detail: 'nap' }))} data-testid="idle-dream"><Icon name="moon" /> Doze with Saffron</button>
        {g.visitIdx > 0 && g.journal.some((j) => j.day === g.day && j.text.includes('found it empty')) && <p className="idle-missed">You missed a customer while you were away.</p>}
      </div>

      {/* the next thing worth working for, once the opening's own steps are done */}
      {/* the other things to do at the stall: Improve, and the rest folded away so the one big button stands out */}
      <div className="idle-more">
        <button className={`btn small idle-improve ${canBuy.length ? 'has-new' : ''}`} onClick={() => { audio.sfx('tap'); openUpgrades(); }} data-testid="idle-improve" title={canBuy.length ? `You can afford: ${canBuy[0].name}` : undefined}>
          <Icon name="star" /> Improve{canBuy.length ? <b className="idle-badge">{canBuy.length}</b> : null}
        </button>
        <button className={`btn small idle-more-toggle ${more ? 'on' : ''}`} onClick={() => setMore((m) => !m)} aria-expanded={more} data-testid="idle-more-toggle">More {more ? '▴' : '▾'}</button>
      </div>
      {more && (
        <>
          <div className="idle-more">
            <button className="btn small" onClick={() => setBoard(true)} data-testid="idle-auctions"><Icon name="calendar" /> Auctions</button>
            <button className="btn small idle-tidy" onClick={() => { audio.sfx('tap'); setTidy(true); }} data-testid="idle-tidy">Tidy up</button>
            {!shut && <button className="btn small" onClick={() => useGame.setState({ dayOver: true })} data-testid="stall-close-early"><Icon name="lock" /> Shut the stall</button>}
          </div>
          <ShopBoyCard />
        </>
      )}
      {tidy && <TidyFilm onClose={() => setTidy(false)} />}
      {board && <AuctionBoard onClose={() => setBoard(false)} onMap={() => { setBoard(false); onGo('map'); }} />}
    </div>
  );
}

/** The tidying film, over the whole screen (not inside the stall sheet, which clipped it to a black
 *  box), with its first frame showing while it loads; if the phone will not play it with sound it
 *  plays silent, and if it will not play at all it closes rather than leaving a black screen. */
function TidyFilm({ onClose }: { onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  // its sound (the cloth and the street, no speech) follows the effects slider and switch
  useFilmSound(v, 'sfx');
  useEffect(() => {
    const el = v.current; if (!el) return;
    el.play().catch(() => { el.muted = true; el.play().catch(onClose); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="tidy-film" role="dialog" aria-label="Tidying the stall" onClick={onClose} data-testid="tidy-film">
      <video ref={v} poster="video/stall-tidy-poster.webp" playsInline preload="auto" onPlaying={() => setReady(true)} onEnded={onClose}>
        {/* WebM first for browsers without the H.264 licence (some Chromium builds); MP4 for Safari */}
        <source src="video/stall-tidy.webm" type="video/webm" />
        <source src="video/stall-tidy.mp4" type="video/mp4" onError={onClose} />
      </video>
      <small>{ready ? 'Tap to close' : 'Loading…'}</small>
    </div>,
    document.body,
  );
}

// what the day holds worth knowing: who is coming next and what pleases them, and Rashid's rug for
// today only. A line or two of the information the game already has, so each morning has its hook.
const LIKES: Record<string, string> = {
  restrained: 'quiet patterns', story: 'a rug with a story', fineWeave: 'a fine weave', antique: 'age', warm: 'warm colours', bold: 'bold patterns',
  ornate: 'ornate work', silk: 'silk', hardwearing: 'a rug that wears well', darkField: 'a dark ground', lightField: 'a light ground', humble: 'plain village work',
  rare: 'something rare', flatweave: 'kilims', geometric: 'geometric designs', floral: 'flowers', tribal: 'tribal work', large: 'a large carpet', small: 'a small rug',
};
const COLOUR: Record<string, string> = { indigo: 'indigo', ivory: 'ivory', crimson: 'red', gold: 'gold', mixed: 'many colours' };
function TodaysChance() {
  const g = useGame();
  const id = g.queue[g.visitIdx];
  const b = id ? BUYERS[id] : undefined;
  const lines: string[] = [];
  if (b) {
    const likes = Object.entries(b.values ?? {}).filter(([k, v]) => v >= 2 && LIKES[k]).sort((a, c) => c[1] - a[1]).map(([k]) => LIKES[k]).slice(0, 2);
    const col = Object.entries(b.colourPref ?? {}).sort((a, c) => c[1] - a[1])[0];
    const colour = col && col[1] > 0 ? COLOUR[col[0]] : '';
    const want = [...likes, ...(colour ? [colour] : [])];
    if (want.length) lines.push(`Next at the stall: ${b.name}, who looks for ${want.length > 1 ? `${want.slice(0, -1).join(', ')} and ${want[want.length - 1]}` : want[0]}.`);
  }
  const deal = g.supplier?.offers?.find((o) => o.tag === 'Limited');
  if (deal) lines.push(`Uncle Rashid has ${RUGS[deal.typeId]?.name ?? 'a rug'} at a price for today only.`);
  if (!lines.length) return null;
  return <p className="idle-chance" data-testid="todays-chance"><b>Today</b> {lines.join(' ')}</p>;
}

/** The nearest perk in reach: which skill, the level it comes at, and how far there is to go. */
/** What the money is for: the next stall, what it would bring, and how far the purse is from it. */
const STALL_PULL: Record<string, string> = {
  mat: 'A place of your own. Buyers trust you more.',
  bazaar: 'A canopy and a counter. Better households start to stop.',
  khan: 'A shop in the Khan. Collectors, and purses a quarter deeper.',
};
function WeekLine() {
  const wg = useGame((s) => s.weekGoal);
  const ledger = useGame((s) => s.ledger);
  if (!wg) return null;
  const n = goalProgress({ ledger }, wg);
  const pct = Math.max(0, Math.min(1, n / wg.target));
  return (
    <p className={`skill-goal week-goal ${wg.paid ? 'done' : ''}`} data-testid="week-goal">
      <span>THIS WEEK</span> {goalLabel(wg)} · <b>{wg.paid ? 'done' : showProgress(wg, n)}</b>
      <i><em style={{ width: `${Math.round(pct * 100)}%` }} /></i>
    </p>
  );
}

function OmenLine() {
  const omen = useGame((s) => omenToday(s));
  const hire = useGame((s) => s.hireWatch);
  if (!omen) return null;
  return (
    <p className={`omen-line ${omen.guarded ? 'safe' : ''}`} data-testid="omen-line">
      <span>TONIGHT</span> {omen.guarded ? 'A watchman will sit by your stall. The thief will find nothing.' : 'A thief is working the lane. Watch your stall, or lose a rug.'}
      {!omen.guarded && <button className="btn small" onClick={() => hire()} data-testid="hire-watch">Pay a watchman {fmt(WATCH_COST)}</button>}
    </p>
  );
}

function RivalLine() {
  const lane = useGame((s) => s.lane);
  const day = useGame((s) => s.day);
  const last = lane?.last;
  if (!last || last.day < day - 1 || last.kind === 'quiet') return null;
  return <p className={`rival-line ${last.kind}`} data-testid="rival-line"><span>ACROSS THE LANE</span> {last.text}</p>;
}

function StallDream() {
  const cash = useGame((s) => s.cash);
  const rep = useGame((s) => s.reputation);
  const ups = useGame((s) => s.upgrades);
  const lane = useGame((s) => s.lane);
  const next = UPGRADES.find((u) => u.stall && !ups.includes(u.id) && (!u.after || ups.includes(u.after)));
  if (!next) return null;
  const pct = Math.max(0, Math.min(1, cash / next.cost));
  const rival = rivalOf({ lane });
  const you = yourStall(ups);
  const racing = rival.stall >= you;
  const short = next.cost - cash;
  const repShort = (next.rep ?? 0) - rep;
  const ready = short <= 0 && repShort <= 0;
  return (
    <button className={`stall-dream ${ready ? 'ready' : ''}`} onClick={() => { audio.sfx('tap'); openUpgrades(); }} data-testid="stall-dream">
      <span className="sd-k">{ready ? 'WITHIN REACH' : 'NEXT STALL'}</span>
      <b>{next.name}</b>
      <small>{STALL_PULL[next.id] ?? next.effect}</small>
      <i><em style={{ width: `${Math.round(pct * 100)}%` }} /></i>
      {racing && (
        <span className="sd-rival" data-testid="rival-race">
          <small>{rival.stall > you ? `${RIVAL_FIRST} already has a better stall` : RIVAL_FIRST}</small>
          {rival.stall <= you && <i><em style={{ width: `${Math.round(rivalProgress(rival) * 100)}%` }} /></i>}
        </span>
      )}
      <small className="sd-need">{ready ? 'You can buy it now' : short > 0 ? `${fmt(short)} still to find${repShort > 0 ? ` · ${repShort} more reputation` : ''}` : `${repShort} more reputation`}</small>
    </button>
  );
}

function SkillGoal() {
  const skills = useGame((s) => s.skills);
  let best: { name: string; perk: string; level: number; lv: number; pct: number } | null = null;
  for (const k of SKILL_ORDER) {
    const xp = skills?.[k] ?? 0, lv = levelOf(xp);
    const p = SKILLS[k].perks.find((x) => x.level > lv);
    if (!p) continue;
    const pct = (xp - xpFor(lv)) / Math.max(1, xpFor(p.level) - xpFor(lv));
    if (!best || pct > best.pct) best = { name: SKILLS[k].name, perk: p.name, level: p.level, lv, pct };
  }
  if (!best) return null;
  return (
    <p className="skill-goal" data-testid="skill-goal">
      <span>SKILL</span> {best.name} {best.lv} → {best.level}: <b>{best.perk}</b>
      <i><em style={{ width: `${Math.round(best.pct * 100)}%` }} /></i>
    </p>
  );
}
