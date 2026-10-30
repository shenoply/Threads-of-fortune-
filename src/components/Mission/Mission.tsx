import { waitsTurn, useHeld } from '../../game/cardTurn';
import { useRef, useState } from 'react';
import { useStallSheetOpen } from '../World/Campaign';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { useShallow } from 'zustand/react/shallow';
import { MISSIONS, MAIN_ORDER, type MissionState } from '../../data/missions';
import { useEffect } from 'react';
import { GIVER_VOICE } from '../../data/jobs';
import { BOOKS, BOOK_ORDER, LIBRARIES, bookPhase } from '../../game/systems/arranBooks';
import { dateFor } from '../../game/economy/economy';
import { settlementById } from '../../game/systems/world';
import { CARGO_JOBS, midSentence } from '../../game/systems/fieldwork';
import { voice, quotes } from '../../game/audio/voice';
import '../../game/missionRules';
import { HouseEnding } from './HouseEnding';
import './mission-scene.css';
import { countdown, firstDue, dueDate } from '../../game/firstWeek';
import { fmt } from '../../game/economy/money';

/** Rashid's first-week instalment, as a short countdown at the end of the objective line; a tap opens his
 *  page at your father's debt. Nothing once it is paid. */
function WeekDue({ onGo }: { onGo: (target?: string) => void }) {
  const [family, day] = useGame(useShallow((s) => [s.family, s.day] as const));
  const wk = firstDue(family, day);
  if (!wk) return null;
  // his page opens at the top; bring the debt into view once it is there
  const go = () => {
    onGo('supplier');
    let n = 0;
    const find = () => { const el = document.querySelector('[data-testid="family-debt"]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); else if (++n < 20) setTimeout(find, 100); };
    setTimeout(find, 650); // after the opening's guide has brought its own button into view
  };
  return <button className={`ob-due ${wk.days <= 1 ? 'near' : ''}`} onClick={go} data-testid="week-due" title="Uncle Rashid wants this towards your father's debt">{countdown(wk.owed, wk.days)}</button>;
}
import { MILESTONES, MILESTONE_ORDER, activeMilestone } from '../../data/milestones';
import { openUpgrades } from '../Inventory/StallUpgrades';
import { swipeProps, useSwipeAway } from '../Touch/SwipeAway';

/** "+£3.00 · reputation +3": only the parts there are */
export const rewardLine = (r: { cash: number; rep: number; trust?: number }, trust = false) =>
  [r.cash ? `+£${(r.cash / 100).toFixed(2)}` : '', r.rep ? `reputation +${r.rep}` : '', trust && r.trust ? `Rashid's trust +${r.trust}` : ''].filter(Boolean).join(' · ');

/** The active main mission, pinned under the top bar. */
export function MissionBanner({ onMap }: { onMap: () => void }) {
  const g = useGame();
  const id = MAIN_ORDER.find((m) => g.missions?.[m] === 'active');
  if (!id) return <div className="mission-slot" />;
  const m = MISSIONS[id];
  const there = !!m.target && g.world.at === m.target;
  return (
    <button className="mission-banner" onClick={onMap} data-testid="mission-banner">
      <i><Icon name="star" /></i>
      <span><b>{m.title}</b></span>
      <u>{m.target ? (there ? 'Go' : 'Map') : 'Open'}</u>
    </button>
  );
}

/** Announces a new or finished main mission: one line at the bottom, tap it to read the rest. */
export function MissionCard({ onMap }: { onMap: () => void }) {
  const g = useGame();
  const news = g.missionNews;
  const [open, setOpen] = useState(false);
  // the giver says the quoted words aloud
  useEffect(() => {
    const mm = news ? MISSIONS[news.replace('-done', '')] : undefined;
    const sp = mm && GIVER_VOICE[mm.giver];
    if (!mm || !sp) return;
    const said = quotes(news!.endsWith('-done') ? mm.reward.text : mm.brief);
    if (!said.length) return;
    let live = true;
    voice.whenReady(sp).then(async () => { for (const q of said) { if (!live) return; await voice.say(sp, q); } });
    return () => { live = false; voice.stop(); };
  }, [news]);
  if (!news) return null;
  const done = news.endsWith('-done');
  const m = MISSIONS[news.replace('-done', '')];
  if (!m) return null;
  const close = () => { setOpen(false); g.clearMissionNews(); };
  return (
    <div className={`mission-strip ${open ? 'open' : ''}`} role="status" data-testid="mission-card">
      {open && (
        <div className="ms-more">
          <small>{m.giver}</small>
          {done ? (
            <>
              <p>{m.reward.text}</p>
              <p className="mission-reward">{rewardLine(m.reward, true)}</p>
            </>
          ) : (
            <>
              <p>{m.brief}</p>
              <ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <p className="mission-lock">{m.locks}</p>
            </>
          )}
        </div>
      )}
      <div className="ms-row">
        <button className="ms-line" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
          <small>{done ? 'MISSION DONE' : 'NEW MISSION'}</small>
          <b>{m.title}</b>
          <Icon name={open ? 'down' : 'up'} />
        </button>
        {!done && m.target && open && <button className="btn primary" onClick={() => { close(); onMap(); }} data-testid="mission-go">Map</button>}
        <button className="btn" onClick={close} data-testid="mission-ok">{done ? 'Good' : 'Noted'}</button>
      </div>
    </div>
  );
}

/** a mission's goals as bars, in the objective's drop-down */
function Goals({ m }: { m: (typeof MISSIONS)[string] }) {
  // read as plain strings, so the drop-down only re-renders when a count moves
  const keys = useGame(useShallow((s) => (m.goals?.(s as unknown as MissionState) ?? []).map((x) => JSON.stringify([x.label, x.have, x.need]))));
  const gs = keys.map((k) => { const [label, have, need] = JSON.parse(k) as [string, number, number]; return { label, have, need }; });
  if (!gs?.length) return <ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>;
  return (
    <ul className="ob-goals" data-testid="ob-goals">
      {gs.map((x) => <li key={x.label} className={x.have >= x.need ? 'done' : ''}><span>{x.label}</span><em>{x.need > 1 ? `${x.have} of ${x.need}` : x.have >= x.need ? '✓' : 'not yet'}</em><i><u style={{ width: `${Math.min(100, (x.have / Math.max(1, x.need)) * 100)}%` }} /></i></li>)}
    </ul>
  );
}

/** Follow an objective's button. Stock is a screen of its own, not a place: its tab is in the bottom bar. */
export function goObjective(go: string, onGo: (target?: string) => void) {
  if (go === 'stock') document.querySelector<HTMLElement>('[data-testid="nav-inventory"]')?.click();
  else if (go === 'improve') openUpgrades();
  else if (go) onGo(go);
}

type GS = ReturnType<typeof useGame.getState>;
const objectiveView = (s: GS) => {
  const st = s as unknown as MissionState;
  const activeId = MAIN_ORDER.find((m) => s.missions?.[m] === 'active');
  const am = activeId ? MISSIONS[activeId] : undefined;
  const msId = activeMilestone(s.missions);
  const ms = msId ? MILESTONES[msId] : undefined;
  const msNext = ms?.next?.(st);
  const mNext = am?.next?.(st);
  return {
    news: s.missionNews, day: s.day, missionTold: s.missionTold, at: s.world.at, due: !!firstDue(s.family, s.day), dueOwed: firstDue(s.family, s.day)?.owed ?? 0, dueBy: firstDue(s.family, s.day)?.by ?? 0, dueShort: (firstDue(s.family, s.day)?.owed ?? 0) > s.cash,
    activeId, msId, mWaits: !!am?.waits?.(st),
    msHint: ms?.hint(st), msNextGo: msNext?.go, msNextBtn: msNext?.btn,
    mHint: am?.hint(st), mNextGo: mNext?.go, mNextBtn: mNext?.btn,
  };
};

/** One objective at a time, in one line under the top bar: new mission news first, then the mission, then the first-hour step, then a job. */
export function ObjectiveBar({ onGo, firstHour, onMenu }: { onGo: (target?: string) => void; firstHour?: { text: string; btn: string; go: () => void; n?: number; of?: number; label?: string; skip?: () => void } | null; onMenu?: () => void }) {
  // what the line shows, worked out from the store as plain values (the clock moving on the road does not re-render it)
  const g = useGame(useShallow(objectiveView));
  const sheetUp = useStallSheetOpen();
  const [open, setOpen] = useState(false);
  // Skip asks once, in the bar itself (no pop-up): a second tap within a few seconds skips
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = window.setTimeout(() => setSure(false), 4000); return () => window.clearTimeout(t); }, [sure]);
  const news = g.news;
  useEffect(() => {
    const mm = news ? MISSIONS[news.replace('-done', '')] : undefined;
    const sp = mm && GIVER_VOICE[mm.giver];
    if (!mm || !sp) return;
    const said = quotes(news!.endsWith('-done') ? mm.reward.text : mm.brief);
    if (!said.length) return;
    let live = true;
    voice.whenReady(sp).then(async () => { for (const q of said) { if (!live) return; await voice.say(sp, q); } });
    return () => { live = false; voice.stop(); };
  }, [news]);
  // the full objective drops down over the page (nothing below jumps); a tap anywhere else closes it
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!barRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  // mission news is read once: opened and closed again, or left until the next morning, it clears
  // itself (the mission stays in the objective line and in Progress); it never sits there for days
  const newsDay = useRef<{ id: string; day: number } | null>(null);
  const seenOpen = useRef(false);
  useEffect(() => {
    if (!news || news === 'house-done') { newsDay.current = null; seenOpen.current = false; return; }
    if (newsDay.current?.id !== news) { newsDay.current = { id: news, day: g.day }; seenOpen.current = false; return; }
    if (g.day > newsDay.current.day) useGame.getState().clearMissionNews();
  }, [news, g.day]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!news || news === 'house-done') return;
    if (open) seenOpen.current = true;
    else if (seenOpen.current) { seenOpen.current = false; useGame.getState().clearMissionNews(); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // the news line is pushed aside with a finger, as Noted does
  const newsSw = useSwipeAway(() => { setOpen(false); useGame.getState().clearMissionNews(); }, true, news);
  const activeId = g.activeId;
  const nm = news ? MISSIONS[news.replace('-done', '')] : undefined;
  // the last chapter gets a proper ending, not a one-line strip
  if (news === 'house-done') return <HouseEnding onMenu={onMenu} />;
  if (nm) {
    const done = news!.endsWith('-done');
    return (
      <div ref={barRef} className={`objective-bar news ${open ? 'open' : ''}`} data-testid="mission-banner">
        <div className="ob-row" data-testid="mission-card" {...swipeProps(newsSw)}>
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
            <small>{done ? 'Mission done' : 'New mission'}</small>
            <b>{nm.title}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          <button className="btn ob-btn" onClick={() => { setOpen(false); useGame.getState().clearMissionNews(); }} data-testid="mission-ok">{done ? 'Good' : 'Noted'}</button>
        </div>
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button>{done ? <><p>{g.missionTold?.[nm.id] ? `${g.missionTold[nm.id]} ` : ''}{nm.reward.text}</p><p className="mission-reward">{rewardLine(nm.reward)}</p></> : <><p>{nm.brief}</p><ol>{nm.steps.map((x) => <li key={x}>{x}</li>)}</ol>{nm.locks && <p className="mission-lock">{nm.locks}</p>}</>}</div>}
      </div>
    );
  }
  // the opening comes first: one step at a time, ahead of Rashid's errand (which it finishes)
  if (firstHour) {
    return (
      <div className="objective-bar opening" data-testid="first-hour">
        <div className="ob-row">
          <span className="ob-text"><span className="ob-eye"><small>{firstHour.label ?? (firstHour.n ? `Step ${firstHour.n} of ${firstHour.of}` : 'Objective')}</small><WeekDue onGo={onGo} /></span><b>{firstHour.text}</b></span>
          {firstHour.btn && <button className="btn ob-btn" onClick={firstHour.go} data-testid="first-hour-go">{firstHour.btn}</button>}
          {firstHour.skip && <button className={`ob-skip ${sure ? 'sure' : ''}`} onClick={() => { if (sure) { setSure(false); firstHour.skip!(); } else setSure(true); }} data-testid="first-hour-skip" aria-label={sure ? 'Tap again to skip the lessons' : 'Skip the lessons'}>{sure ? 'Skip all?' : 'Skip'}</button>}
        </div>
      </div>
    );
  }
  // the current milestone takes the line when there is no main mission, or the main mission is only
  // waiting on reputation; otherwise it is one line in the drop-down
  const msId = g.msId;
  const ms = msId ? MILESTONES[msId] : undefined;
  if (ms && (!activeId || g.mWaits)) {
    const nx = g.msNextGo !== undefined ? { go: g.msNextGo, btn: g.msNextBtn! } : null;
    return (
      <div ref={barRef} className={`objective-bar goal ${open ? 'open' : ''}`} data-testid="milestone-bar">
        <div className="ob-row">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="milestone-expand">
            <small>Goal {MILESTONE_ORDER.indexOf(msId!) + 1}/{MILESTONE_ORDER.length}</small>
            <b>{g.msHint}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          {nx && <button className="btn ob-btn" onClick={() => goObjective(nx.go, onGo)} data-testid="milestone-go">{nx.btn}</button>}
        </div>
        {open && (
          <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button>
            <p><b>{ms.title}.</b> {ms.brief}</p>
            <ol>{ms.steps.map((x) => <li key={x}>{x}</li>)}</ol>
            <p className="mission-reward">Reward: {ms.opens}.</p>
            {activeId && <p className="mission-lock">Main mission: {MISSIONS[activeId].title}. {g.mHint}</p>}
          </div>
        )}
      </div>
    );
  }
  if (activeId) {
    const m = MISSIONS[activeId];
    const hint = g.mHint;
    // a step that has to come first (pack the rug, hire the guards) gets its own button instead of the Map
    const nx = g.mNextGo !== undefined ? { go: g.mNextGo, btn: g.mNextBtn! } : null;
    return (
      <div ref={barRef} className={`objective-bar ${open ? 'open' : ''}`} data-testid="mission-banner">
        <div className="ob-row">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
            <span className="ob-eye"><small>Objective</small><WeekDue onGo={onGo} /></span>
            <b>{hint}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          {nx ? <button className="btn ob-btn" onClick={() => goObjective(nx.go, onGo)} data-testid="objective-go">{nx.btn}</button>
            : m.target && <button className="btn ob-btn" onClick={() => onGo(m.target)} data-testid="objective-go">{g.at === m.target ? 'Go' : 'Map'}</button>}
        </div>
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button><p><b>{m.title}.</b> {m.brief}</p><Goals m={m} />{ms && <p className="mission-lock" data-testid="ob-goal">Goal {MILESTONE_ORDER.indexOf(msId!) + 1}/{MILESTONE_ORDER.length}, {ms.title}: {g.msHint} Reward: {ms.opens}.</p>}</div>}
      </div>
    );
  }
  // nothing else in hand: Rashid's instalment is the objective
  if (g.due) {
    const short = g.dueShort;
    return (
      <div className="objective-bar" data-testid="week-bar">
        <div className="ob-row">
          <span className="ob-text"><span className="ob-eye"><small>Objective</small><WeekDue onGo={onGo} /></span><b>{short ? `Sell rugs: Rashid wants ${fmt(g.dueOwed)} by ${dueDate(g.dueBy)}.` : `Pay Rashid ${fmt(g.dueOwed)} at his warehouse.`}</b></span>
          {!(short && sheetUp) && <button className="btn ob-btn" onClick={() => onGo(short ? 'stall' : 'supplier')} data-testid="week-go">{short ? 'Your stall' : 'Go to Rashid'}</button>}
        </div>
      </div>
    );
  }
  return null;
}

/**
 * Side tasks pinned under the objective, one compact line each: Arran's book errand and an open order
 * for Cohen. The main objective stays in charge; these only keep a promise in sight.
 */
export function SideTasks({ onGo, only }: { onGo: (target: string) => void; only?: 'arran' }) {
  const g = useGame(useShallow((s) => ({ arranBooks: s.arranBooks, arranVisit: s.arranVisit, cargo: s.cargo, cohen: s.cohen, at: s.world.at })));
  const [sideOpen, setSideOpen] = useState(false);
  const items: { id: string; text: string; target?: string }[] = [];
  for (const id of BOOK_ORDER) {
    const ph = bookPhase(g.arranBooks, id);
    const lib = LIBRARIES[BOOKS[id].library];
    const where = `${settlementById(lib.town).name} ${lib.name.replace(/^The /, '')}`;
    if (ph === 'requested' || ph === 'located') items.push({ id: `book-${id}`, text: `Arran's book · ${where}`, target: lib.town });
    else if (ph === 'copy_acquired') items.push({ id: `book-${id}`, text: id === 'fibres' || id === 'dyes' ? 'Take the manual to Arran' : 'Take the copy to Arran', target: 'giza' });
  }
  if (g.arranVisit?.permitStage === 'letter') items.push({ id: 'permit', text: 'Arran\'s letter · Hamza Effendi, museum store, Cairo', target: 'cairo' });
  for (const c of only === 'arran' ? [] : g.cargo ?? []) {
    const job = CARGO_JOBS.find((j) => j.id === c.jobId);
    if (!job) continue;
    items.push(c.collected
      ? { id: `cargo-${c.id}`, text: `Cargo · ${c.label} to ${settlementById(c.to).name}${c.paperwork === 'none' && c.cls !== 'ordinary' ? ' (no papers)' : ''}`, target: c.to }
      : { id: `cargo-${c.id}`, text: `Cargo · collect ${midSentence(c.label)} in ${settlementById(job.from).name}`, target: job.from });
  }
  const o = g.cohen?.order;
  if (only !== 'arran' && o?.status === 'accepted') items.push({ id: 'cohen', text: `Cohen's order: two corridor rugs by ${dateFor(o.dueDay).short}`, target: 'giza' });
  if (!items.length) return null;
  // one line at a time: the errand that matters most (one for the town you are in first), the rest behind "+N"
  const at = g.at;
  const ordered = [...items.filter((t) => t.target === at), ...items.filter((t) => t.target !== at)];
  const shown = sideOpen ? ordered : ordered.slice(0, 1);
  return (
    <div className="side-tasks" data-testid="side-tasks">
      {ordered.length > 1 && <button className="side-task more" onClick={() => setSideOpen((o) => !o)} aria-expanded={sideOpen} data-testid="side-tasks-more">{sideOpen ? 'Fewer' : `+${ordered.length - 1} more`}</button>}
      {shown.map((t) => (
        <button key={t.id} className="side-task" onClick={() => t.target && onGo(t.target)} data-testid={`side-task-${t.id}`}>
          <span aria-hidden="true">◆</span>{t.text}
        </button>
      ))}
    </div>
  );
}

/** A milestone just reached: one short notice above the bottom bar for a few seconds, nothing to tap. */
export function MilestoneNotice() {
  const id = useGame((s) => s.milestoneNews);
  // it waits while a card or a fight has the screen (game/cardTurn.ts)
  const busy = useGame((s) => waitsTurn(s));
  const hold = useHeld();
  const wait = busy || hold;
  useEffect(() => {
    if (!id || wait) return;
    const t = window.setTimeout(() => useGame.setState({ milestoneNews: undefined }), 6500);
    return () => window.clearTimeout(t);
  }, [id, wait]);
  const sw = useSwipeAway(() => useGame.setState({ milestoneNews: undefined }), true, id);
  const m = id ? MILESTONES[id] : undefined;
  if (!m || wait) return null;
  return (
    <div className="levelup milestone" role="status" data-testid="milestone-notice" onClick={() => useGame.setState({ milestoneNews: undefined })} {...swipeProps(sw)}>
      <small>GOAL REACHED · {MILESTONE_ORDER.indexOf(m.id) + 1}/{MILESTONE_ORDER.length}</small>
      <b>{m.title}</b>
      <span>{m.opens}</span>
      <span className="ms-line">{m.speaker}: {m.reward.text}</span>
    </div>
  );
}

/** A mission's closing scene: who, what happens, and a choice that decides how it ends. It comes only
 *  when you have done what the mission asked, and closes the mission when you choose. */
export function MissionScene() {
  // the whole store is read only while a scene is up
  const id = useGame((s) => s.missionScene);
  const [told, setTold] = useState<string | null>(null);
  const [pic, setPic] = useState(true);
  if (!id) return null;
  return <SceneCard id={id} told={told} setTold={setTold} pic={pic} setPic={setPic} />;
}

function SceneCard({ id, told, setTold, pic, setPic }: { id: string; told: string | null; setTold: (t: string | null) => void; pic: boolean; setPic: (p: boolean) => void }) {
  const g = useGame();
  const m = id ? MISSIONS[id] : undefined;
  // gone stale (the rug sold before the choice, a reload): put it away until the condition holds again
  useEffect(() => { if (id && m && !told && !(m.check?.(g as unknown as MissionState) ?? true)) useGame.setState({ missionScene: undefined }); });
  if (!id || !m?.scene) return null;
  // the frontier or a fall in the street first (game/cardTurn.ts)
  if (waitsTurn(g, 'scene')) return null;
  const sc = m.scene;
  const choices = sc.choices.filter((c) => !c.when || c.when(g));
  return (
    <div className="mscene" role="dialog" aria-label={sc.title} data-testid="mission-scene" data-mission={id}>
      <div className="mscene-card">
        {sc.art && pic && <img className="mscene-art" src={sc.art} alt="" onError={() => setPic(false)} />}
        <small className="mscene-who">{sc.who}</small>
        <h2>{sc.title}</h2>
        <p className="mscene-text">{sc.text(g)}</p>
        <div className="mscene-choices">
          {choices.map((c, i) => (
            <button key={c.id} className={`mscene-choice ${i === 0 ? 'primary' : ''}`} onClick={() => setTold(useGame.getState().sceneChoose(id, c.id))} data-testid={`scene-${c.id}`}>
              <b>{c.label}</b><small>{c.note}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
