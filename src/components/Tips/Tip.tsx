import { useEffect, useSyncExternalStore } from 'react';
import { useGame } from '../../game/state/store';
import { TIPS } from '../../data/tips';

// Only one tip at a time: the first to ask gets the floor; the rest wait their turn.
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const claim = (id: string) => { if (!current) { current = id; emit(); } };
const release = (id: string) => { if (current === id) { current = null; emit(); } };
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** Shows a tip the first time its moment comes. */
export function Tip({ id, when = true }: { id: string; when?: boolean }) {
  const g = useGame();
  const eligible = when && g.started && g.tutorial.done && !(g.tipsSeen ?? []).includes(id) && !!TIPS[id];
  const showing = useSyncExternalStore(subscribe, () => current);
  // tips no longer pop up over the game: they are marked as read quietly, and live in How to play
  useEffect(() => { if (eligible) g.seeTip(id); }, [eligible, id]); // eslint-disable-line react-hooks/exhaustive-deps
  void claim; void showing;
  if (eligible || !eligible) return null;
  const t = TIPS[id];
  return (
    <div className="tip" role="note" data-testid={`tip-${id}`}>
      <small>TIP</small>
      <b>{t.title}</b>
      {t.lines.map((l) => <p key={l}>{l}</p>)}
      <button className="btn" onClick={() => { g.seeTip(id); release(id); }} data-testid="tip-ok">Got it</button>
    </div>
  );
}
