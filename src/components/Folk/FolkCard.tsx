import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGame } from '../../game/state/store';
import { person, houseOf, TRAIT_WORD, type Person } from '../../game/systems/population';
import { relWord, topicWord, type Topic } from '../../game/systems/folkTalk';
import { settlementById } from '../../game/systems/world';
import { audio } from '../../game/audio/engine';
import { FolkFace } from './FolkFace';
import './folk.css';

/** open a page of the encyclopedia from anywhere */
export const openEncy = (kind: 'person' | 'house' | 'place' | 'rug' | 'band', id: string) => window.dispatchEvent(new CustomEvent('tof:ency', { detail: { kind, id } }));

/** A name that opens its page */
export function PersonLink({ id, children }: { id: string; children?: ReactNode }) {
  const p = person(id);
  if (!p) return <>{children}</>;
  return <button className="ency-link" onClick={(e) => { e.stopPropagation(); openEncy('person', id); }}>{children ?? p.name}</button>;
}

export function RelBar({ p }: { p: Person }) {
  const f = useGame((s) => s.folk);
  const met = f?.met[p.id] !== undefined;
  const v = f?.rel[p.id] ?? 0;
  return (
    <span className={`folk-rel ${v >= 30 ? 'good' : v <= -6 ? 'bad' : ''}`} data-testid="folk-rel">
      <i><u style={{ left: `${50 + Math.min(0, v) / 2}%`, width: `${Math.abs(v) / 2}%` }} /></i>
      <small>{relWord(v, met)}{met ? ` · ${v > 0 ? '+' : ''}${v}` : ''}</small>
    </span>
  );
}

/** Stop and talk with one of the world's people: a greeting that knows you, then the topics. `extra`:
 *  buttons for what else can be done with them here (trade with a caravan, the market). */
export function FolkCard({ id, onClose, extra }: { id: string; onClose: () => void; extra?: ReactNode }) {
  const p = person(id);
  const g = useGame();
  const greet = useMemo(() => (p ? useGame.getState().folkTalk(p.id, 'greet').text : ''), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [said, setSaid] = useState<{ topic: Topic; text: string; mentions: string[] }[]>([]);
  const [asked, setAsked] = useState<Topic[]>([]);
  useEffect(() => { audio.sfx('tap'); }, []);
  if (!p) return null;
  const h = p.house ? houseOf(p.house) : undefined;
  const ask = (t: Topic) => {
    const r = useGame.getState().folkTalk(p.id, t);
    setSaid((x) => [...x, { topic: t, ...r }]);
    setAsked((x) => [...x, t]);
    audio.sfx('tap');
  };
  const topics: Topic[] = ['news', 'trade', 'family', 'gossip', 'self'];
  const met = g.folk?.met[p.id] !== undefined;
  return (
    <div className="overlay folk-overlay" onClick={onClose} data-testid="folk-card">
      <div className="modal-card folk-card" onClick={(e) => e.stopPropagation()}>
        <div className="folk-head">
          <FolkFace p={p} size={76} />
          <div>
            <b><button className="ency-link big" onClick={() => openEncy('person', p.id)} data-testid="folk-name">{p.name}</button></b>
            <small>{p.title}</small>
            {h && <small>Of <button className="ency-link" onClick={() => openEncy('house', h.id)}>{h.name.replace(/^The /, 'the ')}</button></small>}
            <RelBar p={p} />
          </div>
        </div>
        {met && <p className="folk-traits">{p.traits.map((t) => TRAIT_WORD[t]).join(' · ')}</p>}
        <p className="folk-say" data-testid="folk-greet">{greet}</p>
        {said.map((s, i) => (
          <div key={i} className="folk-reply">
            <small>{topicWord(s.topic, p)}</small>
            <p>{s.text}</p>
            {s.mentions.length > 0 && <div className="folk-mentions">{s.mentions.map((m) => <PersonLink key={m} id={m} />)}</div>}
          </div>
        ))}
        <div className="folk-topics">
          {topics.filter((t) => !asked.includes(t)).map((t) => <button key={t} className="btn" onClick={() => ask(t)} data-testid={`folk-${t}`}>{topicWord(t, p)}</button>)}
          {extra}
          <button className="ghost-btn" onClick={onClose} data-testid="folk-bye">Go in peace</button>
        </div>
      </div>
    </div>
  );
}

/** a short row for a person in a list: face, name, title, how they feel */
export function FolkRow({ p, onTalk }: { p: Person; onTalk?: () => void }) {
  return (
    <button className="folk-row" onClick={onTalk ?? (() => openEncy('person', p.id))} data-testid={`folk-row-${p.id}`}>
      <FolkFace p={p} size={48} />
      <span><b>{p.name}</b><small>{p.title}</small><RelBar p={p} /></span>
      <span className="talk">{onTalk ? 'Talk' : '›'}</span>
    </button>
  );
}

export const placeName = (id: string) => settlementById(id)?.name ?? id;
