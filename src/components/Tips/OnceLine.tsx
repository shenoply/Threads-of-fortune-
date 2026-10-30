import { useEffect, useRef, type ReactNode } from 'react';
import { useGame } from '../../game/state/store';
import { openingStep } from '../../game/opening';
import { ONCE } from '../../data/tips';
import './once.css';

// A word said once, at the moment it matters: a line set into the screen (never a popup), shown the
// first time its moment comes and kept for as long as that screen stays open. It is marked as told in
// tipsSeen straight away, so it never comes back, and it waits while the opening guide is running.

/** true while this line is being told: the first time `when` holds, for as long as the caller stays mounted */
export function useOnce(id: string, when = true): boolean {
  const eligible = useGame((g) => when && g.started && g.tutorial.done && !openingStep(g) && !(g.tipsSeen ?? []).includes(id));
  const shown = useRef(false);
  if (eligible) shown.current = true;
  useEffect(() => { if (eligible) useGame.getState().seeTip(id); }, [eligible, id]);
  return shown.current;
}

/** the line itself, from ONCE in data/tips.ts unless given; `who` is the speaker, shown in bold before it */
export function OnceLine({ id, when = true, who, as: Tag = 'p', children }: { id: string; when?: boolean; who?: string; as?: 'p' | 'div'; children?: ReactNode }) {
  const on = useOnce(id, when);
  if (!on) return null;
  const said = ONCE[id];
  const by = who ?? said?.who;
  return (
    <Tag className="once-line" role="note" data-testid={`once-${id}`}>
      {by && <b>{by}: </b>}{children ?? said?.text}
    </Tag>
  );
}
