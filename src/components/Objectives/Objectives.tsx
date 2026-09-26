import { useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { MISSIONS, MAIN_ORDER, type MissionState } from '../../data/missions';
import { openJobs } from '../../data/jobs';
import { settlementById } from '../../game/systems/world';

type ObjTab = 'story' | 'jobs' | 'visitors';

const townName = (id?: string) => (id ? settlementById(id)?.name ?? id : '');
const daysLeft = (until: number, day: number) => (until - day <= 0 ? 'leaves today' : `${until - day} day${until - day > 1 ? 's' : ''} left`);

/** Everything you could be doing, in one place: the story, the jobs on the map, and visitors in town. */
export function Objectives({ onClose, onFocus, initial = 'story' }: { onClose: () => void; onFocus?: (town: string) => void; initial?: ObjTab }) {
  const g = useGame();
  const [tab, setTab] = useState<ObjTab>(initial);
  const activeId = MAIN_ORDER.find((id) => g.missions?.[id] === 'active');
  const nextId = activeId ?? MAIN_ORDER.find((id) => g.missions?.[id] !== 'done');
  const m = nextId ? MISSIONS[nextId] : undefined;
  const jobs = openJobs(g.jobsDone, g.reputation);
  const visits = (g.visits ?? []).filter((v) => v.until >= g.day);
  const here = g.world.at;
  const focus = (town?: string) => { if (town && onFocus) onFocus(town); };

  const tabs: [ObjTab, string, number][] = [['story', 'Story', m ? 1 : 0], ['jobs', 'Jobs', jobs.length], ['visitors', 'Visitors', visits.length]];

  return (
    <div className="objectives" role="region" aria-label="Objectives" data-testid="objectives" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div className="obj-head">
        <div className="obj-tabs" role="tablist">
          {tabs.map(([id, label, n]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} data-testid={`obj-tab-${id}`}>
              {label}{id !== 'story' && n > 0 && <b>{n}</b>}
            </button>
          ))}
        </div>
        <button className="obj-close" onClick={onClose} aria-label="Close" data-testid="obj-close"><Icon name="x" /></button>
      </div>

      <div className="obj-body">
        {tab === 'story' && (m ? (
          <div className="obj-story" data-testid="obj-story">
            <small>{activeId ? 'MAIN MISSION' : 'NEXT IN THE STORY'} · {m.giver.toUpperCase()}</small>
            <b>{m.title}</b>
            <p className="obj-hint">{activeId ? m.hint(g as unknown as MissionState) : 'This comes to you in a day or two. Keep selling at the stall.'}</p>
            <ol>{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            {m.target && (
              <button className="obj-row" onClick={() => focus(m.target)} disabled={!onFocus} data-testid="obj-story-go">
                <Icon name="pin" /><span>{townName(m.target)}{here === m.target ? ' · you are here' : ''}</span>{onFocus && <em>{here === m.target ? 'Open' : 'Show'}</em>}
              </button>
            )}
          </div>
        ) : <p className="obj-empty">The story is finished. The lane is yours.</p>)}

        {tab === 'jobs' && (
          <>
            {jobs.length === 0 && <p className="obj-empty">No jobs open just now. More come as your name grows.</p>}
            {jobs.map((j) => (
              <button key={j.id} className="obj-row" onClick={() => focus(j.target)} disabled={!onFocus} data-testid={`job-go-${j.id}`}>
                <Icon name="scroll" />
                <span><b>{j.title}</b><small>{townName(j.target)}{here === j.target ? ' · you are here' : ''} · from {j.giver}</small><small className="obj-text">{j.text}</small></span>
                {onFocus && <em>{here === j.target ? 'Hand over' : 'Show'}</em>}
              </button>
            ))}
          </>
        )}

        {tab === 'visitors' && (
          <>
            {visits.length === 0 && <p className="obj-empty">Nobody is asking for you in town. Visitors come and go every few days.</p>}
            {visits.map((v) => (
              <button key={v.id} className="obj-row" onClick={() => focus(v.city)} disabled={!onFocus} data-testid={`visit-go-${v.id}`}>
                <Icon name="hourglass" />
                <span><b>{v.who}</b><small>{townName(v.city)} · {daysLeft(v.until, g.day)}</small><small className="obj-text">{v.text}</small></span>
                {onFocus && <em>{here === v.city ? 'Offer a rug' : 'Show'}</em>}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
