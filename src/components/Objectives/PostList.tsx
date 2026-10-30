import { useEffect, useState } from 'react';
import '../StallEncounter/stallhelp.css';
import { useGame } from '../../game/state/store';
import { dateFor } from '../../game/economy/economy';
import { arrived } from '../../game/systems/post';
import { readPost } from '../../game/systems/stallHelpActions';

/** Letters and telegrams that have reached you, newest first. Opening the list marks them read. */
export function PostList() {
  const g = useGame();
  const letters = arrived(g.post, g.day);
  // the ones new on opening keep their mark while the list is open
  const [fresh] = useState(() => new Set(letters.filter((l) => !l.read).map((l) => l.id)));
  useEffect(() => { readPost(); }, [letters.length]);
  if (!letters.length) return <p className="obj-empty" data-testid="post-empty">No letters yet. Orders and news come by post to your stall, a day or two after they are sent. In a town with a telegraph office you can wire Rashid or ask a dealer's prices.</p>;
  // the last week's post and the newest few stay open; anything older folds into one row
  const recent = letters.filter((l, i) => i < 5 || l.day > g.day - 7);
  const older = letters.slice(recent.length);
  const item = (l: (typeof letters)[number]) => (
    <div key={l.id} className={`post-item ${l.kind}${fresh.has(l.id) ? ' new' : ''}`} data-testid={`post-${l.kind}`}>
      <small>{l.kind === 'telegram' ? 'TELEGRAM' : 'LETTER'} · {dateFor(l.day).short} · {l.from}</small>
      <b>{l.title}</b>
      <p>{l.body}</p>
    </div>
  );
  return (
    <div className="post-list" data-testid="post-list">
      {recent.map(item)}
      {older.length > 0 && (
        <details className="post-older" data-testid="post-older">
          <summary>Older letters · {older.length}</summary>
          {older.map(item)}
        </details>
      )}
    </div>
  );
}
