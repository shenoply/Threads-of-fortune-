import { useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
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
import { countdown, firstDue } from '../../game/firstWeek';

/** Rashid's first-week instalment, as a short countdown at the end of the objective line; a tap opens his
 *  page at your father's debt. Nothing once it is paid. */
function WeekDue({ onGo }: { onGo: (target?: string) => void }) {
  const g = useGame();
  const wk = firstDue(g.family, g.day);
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

/** Follow an objective's button. Stock is a screen of its own, not a place: its tab is in the bottom bar. */
export function goObjective(go: string, onGo: (target?: string) => void) {
  if (go === 'stock') document.querySelector<HTMLElement>('[data-testid="nav-inventory"]')?.click();
  else if (go === 'improve') openUpgrades();
  else if (go) onGo(go);
}

/** One objective at a time, in one line under the top bar: new mission news first, then the mission, then the first-hour step, then a job. */
export function ObjectiveBar({ onGo, firstHour, onMenu }: { onGo: (target?: string) => void; firstHour?: { text: string; btn: string; go: () => void; n?: number; of?: number; skip?: () => void } | null; onMenu?: () => void }) {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const news = g.missionNews;
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
  const activeId = MAIN_ORDER.find((m) => g.missions?.[m] === 'active');
  const nm = news ? MISSIONS[news.replace('-done', '')] : undefined;
  // the last chapter gets a proper ending, not a one-line strip
  if (news === 'house-done') return <HouseEnding onMenu={onMenu} />;
  if (nm) {
    const done = news!.endsWith('-done');
    return (
      <div ref={barRef} className={`objective-bar news ${open ? 'open' : ''}`} data-testid="mission-banner">
        <div className="ob-row" data-testid="mission-card">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
            <small>{done ? 'Mission done' : 'New mission'}</small>
            <b>{nm.title}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          <button className="btn ob-btn" onClick={() => { setOpen(false); g.clearMissionNews(); }} data-testid="mission-ok">{done ? 'Good' : 'Noted'}</button>
        </div>
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button>{done ? <><p>{nm.reward.text}</p><p className="mission-reward">{rewardLine(nm.reward)}</p></> : <><p>{nm.brief}</p><ol>{nm.steps.map((x) => <li key={x}>{x}</li>)}</ol><p className="mission-lock">{nm.locks}</p></>}</div>}
      </div>
    );
  }
  // the opening comes first: one step at a time, ahead of Rashid's errand (which it finishes)
  if (firstHour) {
    return (
      <div className="objective-bar opening" data-testid="first-hour">
        <div className="ob-row">
          <span className="ob-text"><span className="ob-eye"><small>{firstHour.n ? `Step ${firstHour.n} of ${firstHour.of}` : 'Objective'}</small><WeekDue onGo={onGo} /></span><b>{firstHour.text}</b></span>
          {firstHour.btn && <button className="btn ob-btn" onClick={firstHour.go} data-testid="first-hour-go">{firstHour.btn}</button>}
          {firstHour.skip && <button className="ob-skip" onClick={firstHour.skip} data-testid="first-hour-skip" aria-label="Skip the opening">Skip</button>}
        </div>
      </div>
    );
  }
  // the current milestone takes the line when there is no main mission, or the main mission is only
  // waiting on reputation; otherwise it is one line in the drop-down
  const msId = activeMilestone(g.missions);
  const ms = msId ? MILESTONES[msId] : undefined;
  if (ms && (!activeId || MISSIONS[activeId].waits?.(g as unknown as MissionState))) {
    const nx = ms.next?.(g as unknown as MissionState);
    return (
      <div ref={barRef} className={`objective-bar goal ${open ? 'open' : ''}`} data-testid="milestone-bar">
        <div className="ob-row">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="milestone-expand">
            <small>Goal {MILESTONE_ORDER.indexOf(msId!) + 1}/{MILESTONE_ORDER.length}</small>
            <b>{ms.hint(g as unknown as MissionState)}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          {nx && <button className="btn ob-btn" onClick={() => goObjective(nx.go, onGo)} data-testid="milestone-go">{nx.btn}</button>}
        </div>
        {open && (
          <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button>
            <p><b>{ms.title}.</b> {ms.brief}</p>
            <ol>{ms.steps.map((x) => <li key={x}>{x}</li>)}</ol>
            <p className="mission-reward">Reward: {ms.opens}.</p>
            {activeId && <p className="mission-lock">Main mission: {MISSIONS[activeId].title}. {MISSIONS[activeId].hint(g as unknown as MissionState)}</p>}
          </div>
        )}
      </div>
    );
  }
  if (activeId) {
    const m = MISSIONS[activeId];
    const hint = m.hint ? m.hint(g) : m.steps[0];
    // a step that has to come first (pack the rug, hire the guards) gets its own button instead of the Map
    const nx = m.next?.(g as unknown as MissionState);
    return (
      <div ref={barRef} className={`objective-bar ${open ? 'open' : ''}`} data-testid="mission-banner">
        <div className="ob-row">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
            <span className="ob-eye"><small>Objective</small><WeekDue onGo={onGo} /></span>
            <b>{hint}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          {nx ? <button className="btn ob-btn" onClick={() => goObjective(nx.go, onGo)} data-testid="objective-go">{nx.btn}</button>
            : m.target && <button className="btn ob-btn" onClick={() => onGo(m.target)} data-testid="objective-go">{g.world.at === m.target ? 'Go' : 'Map'}</button>}
        </div>
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button><p><b>{m.title}.</b> {m.brief}</p><ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>{ms && <p className="mission-lock" data-testid="ob-goal">Goal {MILESTONE_ORDER.indexOf(msId!) + 1}/{MILESTONE_ORDER.length}, {ms.title}: {ms.hint(g as unknown as MissionState)} Reward: {ms.opens}.</p>}</div>}
      </div>
    );
  }
  // nothing else in hand: Rashid's instalment is the objective
  if (firstDue(g.family, g.day)) {
    return (
      <div className="objective-bar" data-testid="week-bar">
        <div className="ob-row">
          <span className="ob-text"><span className="ob-eye"><small>Objective</small><WeekDue onGo={onGo} /></span><b>Your father's first instalment</b></span>
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
  const g = useGame();
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
  const at = g.world.at;
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
  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => useGame.setState({ milestoneNews: undefined }), 6500);
    return () => window.clearTimeout(t);
  }, [id]);
  const m = id ? MILESTONES[id] : undefined;
  if (!m) return null;
  return (
    <div className="levelup milestone" role="status" data-testid="milestone-notice">
      <small>GOAL REACHED · {MILESTONE_ORDER.indexOf(m.id) + 1}/{MILESTONE_ORDER.length}</small>
      <b>{m.title}</b>
      <span>{m.opens}</span>
      <span className="ms-line">{m.speaker}: {m.reward.text}</span>
    </div>
  );
}
