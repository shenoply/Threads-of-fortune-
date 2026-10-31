// The stories on screen (systems/stories.ts): a beat as a card where it reaches you (in a letter, at the
// stall, on a town's menu, or under Progress for the Courier's items), with its choices as plain buttons;
// and the Stories list under Progress: each tale begun, where it stands, and what you chose.
import { useState } from 'react';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { pendingAll, choicesOf, beatText, beatTitle, beatWho, storyList, type Pending } from '../../game/systems/stories';
import { Fold } from '../Fold/Fold';
import './stories.css';

function Face({ src, name }: { src?: string; name: string }) {
  const [gone, setGone] = useState(false);
  void name;
  return <span className="sto-face">{src && !gone ? <img src={src} alt="" loading="lazy" onError={() => setGone(true)} /> : <Icon name="scroll" />}</span>;
}

/** The choices of a beat, with what happened once one is taken. `bare`: no heading (inside a letter). */
export function StoryBeat({ arc, bare = false, onDone }: { arc: string; bare?: boolean; onDone?: () => void }) {
  const g = useGame();
  const [msg, setMsg] = useState('');
  const p = pendingAll(g).find((x) => x.arc.id === arc);
  if (!p) return msg ? <p className="sto-msg" role="status" data-testid={`story-msg-${arc}`}>{msg}</p> : null;
  const who = beatWho(p);
  const pick = (id: string) => { const m = g.storyAct(arc, id); setMsg(m); if (m && onDone) window.setTimeout(onDone, 50); };
  return (
    <div className={`sto-beat ${bare ? 'bare' : ''}`} data-testid={`story-${arc}`}>
      {!bare && (
        <div className="sto-top">
          {(p.beat.via === 'stall' || p.beat.via === 'letter') && <Face src={p.beat.face} name={who ?? p.arc.title} />}
          <div className="sto-head">
            <small>{p.arc.title.toUpperCase()}</small>
            <b>{beatTitle(p)}</b>
          </div>
        </div>
      )}
      {!bare && <p className="sto-text">{beatText(p)}</p>}
      <Choices p={p} onPick={pick} />
      {msg && <p className="sto-msg" role="status">{msg}</p>}
    </div>
  );
}

function Choices({ p, onPick }: { p: Pending; onPick: (id: string) => void }) {
  const g = useGame();
  const views = choicesOf(p);
  return (
    <div className="sto-choices">
      {views.map((v) => (
        <button key={v.id} className="btn sto-choice" disabled={!!v.blocked} title={v.blocked} onClick={() => onPick(v.id)} data-testid={`story-${p.arc.id}-${v.id}`}>
          <span>{v.label}</span>
          {v.cost ? <small className={g.cash < v.cost ? 'short' : ''}>{fmt(v.cost)}</small> : null}
          {v.blocked && !v.cost && <small className="short">{v.blocked}</small>}
        </button>
      ))}
      {p.beat.expires !== undefined && p.run.shown !== undefined && (
        <p className="sto-due">Answer by {dateFor(p.run.shown + p.beat.expires).short}, or it is decided for you.</p>
      )}
    </div>
  );
}

/** A beat waiting at the stall or on a town's menu, as a card. */
export function StoryCards({ via, town }: { via: 'stall' | 'town'; town?: string }) {
  const g = useGame();
  const list = pendingAll(g).filter((p) => p.beat.via === via && (via === 'stall' || (typeof p.beat.town === 'function' ? p.beat.town(p.c) : p.beat.town) === town));
  const [done, setDone] = useState<string[]>([]);
  const arcs = [...new Set([...list.map((p) => p.arc.id), ...done])];
  if (!arcs.length) return null;
  return <div className="sto-cards" data-testid={`story-cards-${via}`}>{arcs.map((id) => <StoryBeat key={id} arc={id} onDone={() => setDone((d) => [...new Set([...d, id])])} />)}</div>;
}

/** Progress: the stories, each with where it stands and what you chose */
export function StoriesFold() {
  const g = useGame();
  const list = storyList(g);
  if (!list.length) return null;
  const waiting = list.filter((x) => x.pending);
  return (
    <Fold id="pr-stories" title="Stories" gist={waiting.length ? `${waiting.length} waiting for you` : `${list.filter((x) => x.run.status === 'done').length} of ${list.length} over`} attention={waiting.some((x) => x.arc.beats[x.run.beat]?.via === 'courier' || x.arc.beats[x.run.beat]?.via === 'letter')} testid="stories-fold" className="sto-fold">
      <div className="sto-list" data-testid="stories">
        {list.map(({ arc, run, where, pending }) => {
          const via = arc.beats[run.beat]?.via;
          return (
            <div key={arc.id} className={`sto-item ${run.status}`} data-testid={`stories-${arc.id}`}>
              <div className="sto-item-head">
                <b>{arc.title}</b>
                <span className={`sto-state ${run.status === 'done' ? 'done' : pending ? 'now' : ''}`}>{run.status === 'done' ? 'Over' : pending ? 'Your move' : 'Going on'}</span>
              </div>
              <p className="sto-where">{where}</p>
              {pending && (via === 'courier' || via === 'letter') && <StoryBeat arc={arc.id} />}
              {run.picks.length > 0 && (
                <details className="sto-picks">
                  <summary>What you chose · {run.picks.length}</summary>
                  <ol>{run.picks.map((pk, i) => <li key={i}><small>{dateFor(pk.day).short}</small> <b>{pk.label.replace(/ \(you did not answer\)$/, '')}</b>{pk.label.endsWith('(you did not answer)') ? ' (not answered)' : ''}. {pk.text}</li>)}</ol>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </Fold>
  );
}
