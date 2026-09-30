import { useRef, useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { MISSIONS, MAIN_ORDER } from '../../data/missions';
import { useEffect } from 'react';
import { GIVER_VOICE } from '../../data/jobs';
import { BOOKS, BOOK_ORDER, LIBRARIES, bookPhase } from '../../game/systems/arranBooks';
import { dateFor } from '../../game/economy/economy';
import { settlementById } from '../../game/systems/world';
import { CARGO_JOBS, midSentence } from '../../game/systems/fieldwork';
import { voice, quotes } from '../../game/audio/voice';

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
              <p className="mission-reward">+£{(m.reward.cash / 100).toFixed(2)} · reputation +{m.reward.rep} · Rashid's trust +{m.reward.trust}</p>
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

/** One objective at a time, in one line under the top bar: new mission news first, then the mission, then the first-hour step, then a job. */
export function ObjectiveBar({ onGo, firstHour }: { onGo: (target?: string) => void; firstHour?: { text: string; btn: string; go: () => void } | null }) {
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
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button>{done ? <><p>{nm.reward.text}</p><p className="mission-reward">+£{(nm.reward.cash / 100).toFixed(2)} · reputation +{nm.reward.rep}</p></> : <><p>{nm.brief}</p><p className="mission-lock">{nm.locks}</p></>}</div>}
      </div>
    );
  }
  if (activeId) {
    const m = MISSIONS[activeId];
    const hint = m.hint ? m.hint(g) : m.steps[0];
    return (
      <div ref={barRef} className={`objective-bar ${open ? 'open' : ''}`} data-testid="mission-banner">
        <div className="ob-row">
          <button className="ob-text" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="mission-expand">
            <small>Objective</small>
            <b>{hint}</b>
            <Icon name={open ? 'up' : 'down'} />
          </button>
          {m.target && <button className="btn ob-btn" onClick={() => onGo(m.target)} data-testid="objective-go">{g.world.at === m.target ? 'Go' : 'Map'}</button>}
        </div>
        {open && <div className="ob-more"><button className="ob-x" onClick={() => setOpen(false)} aria-label="Close" data-testid="ob-close">×</button><p><b>{m.title}.</b> {m.brief}</p><ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol></div>}
      </div>
    );
  }
  if (firstHour) {
    return (
      <div className="objective-bar" data-testid="first-hour">
        <div className="ob-row">
          <span className="ob-text"><small>Objective</small><b>{firstHour.text}</b></span>
          {firstHour.btn && <button className="btn ob-btn" onClick={firstHour.go} data-testid="first-hour-go">{firstHour.btn}</button>}
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
  return (
    <div className="side-tasks" data-testid="side-tasks">
      {items.map((t) => (
        <button key={t.id} className="side-task" onClick={() => t.target && onGo(t.target)} data-testid={`side-task-${t.id}`}>
          <span aria-hidden="true">◆</span>{t.text}
        </button>
      ))}
    </div>
  );
}
