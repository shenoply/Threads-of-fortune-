import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useGame } from '../../game/state/store';
import { TIPS } from '../../data/tips';
import { lessonsOff } from '../../game/opening';
import { waitsTurn, useHeld } from '../../game/cardTurn';
import { useSwipeAway, swipeProps } from '../Touch/SwipeAway';
import { openGuide } from '../Guide/Guide';
import './once.css';

// A hint at the point of use (data/tips.ts): one line above the bottom bar the first time you reach a
// thing, lighting the control it is about. It is marked as told the moment it shows, so it never comes
// back; a tap or a sideways swipe puts it away, and it fades by itself after a while. It never covers
// the game: the screen under it keeps working. One at a time; the rest wait their turn.

let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const claim = (id: string) => { if (!current) { current = id; emit(); } return current === id; };
const release = (id: string) => { if (current === id) { current = null; emit(); } };
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const POINT = 'hint-point';
const SHOW_MS = 12000;

/** Shows hint `id` the first time its moment comes. `card`: it belongs to a card or fight, so it may show while one is up. */
export function Tip({ id, when = true, card = false }: { id: string; when?: boolean; card?: boolean }) {
  const t = TIPS[id];
  // the first sale is its own lesson: no hints until it is done
  const eligible = useGame((g) => !!t && when && g.started && g.tutorial.done && !lessonsOff(g) && !(g.tipsSeen ?? []).includes(id));
  // a buyer at the stall has the screen and the buttons at its foot: hints wait
  const busy = useGame((g) => waitsTurn(g) || (!!g.encounter && !g.encounter.outcome)
    // a title, a level or a goal being announced at the foot of the screen: the hint waits its turn
    || (g.titleNews ?? []).length > 0 || (g.levelUps ?? []).length > 0 || !!g.milestoneNews);
  const hold = useHeld();
  const wait = !card && (busy || hold);
  const showing = useSyncExternalStore(subscribe, () => current);
  const [on, setOn] = useState(false);
  const told = useRef(false);
  // take the floor once eligible and nothing else holds it; marked as told at once
  useEffect(() => {
    if (told.current || !eligible || wait || showing) return;
    // a beat after the screen opens, so the line does not jump in with the screen itself
    const k = window.setTimeout(() => {
      if (told.current || !claim(id)) return;
      told.current = true;
      useGame.getState().seeTip(id);
      setOn(true);
    }, 700);
    return () => window.clearTimeout(k);
  }, [eligible, wait, showing, id]);
  const close = () => { setOn(false); release(id); };
  // fades by itself; leaving the screen puts it away too
  useEffect(() => { if (!on) return; const k = window.setTimeout(close, SHOW_MS); return () => window.clearTimeout(k); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => release(id), [id]);
  // its place is left (another tab, the screen closed): it goes with it
  useEffect(() => { if (on && !when) close(); }, [on, when]); // eslint-disable-line react-hooks/exhaustive-deps
  // light the control it is about while it shows
  useEffect(() => {
    if (!on || !t?.point) return;
    const mark = () => document.querySelectorAll(t.point!).forEach((el) => el.classList.add(POINT));
    mark();
    const k = window.setInterval(mark, 500);
    return () => { window.clearInterval(k); document.querySelectorAll('.' + POINT).forEach((el) => el.classList.remove(POINT)); };
  }, [on, t]);
  const swipe = useSwipeAway(close);
  // a card or a buyer came up while it showed: it steps aside until the screen is clear
  if (!on || !t || wait) return null;
  return (
    <div className={`hint${card ? " in-card" : ""}`} role="note" data-testid={`tip-${id}`} {...swipeProps(swipe)} onClick={close}>
      <p>{t.who && <b>{t.who}: </b>}{t.text}</p>
      {t.guide && (
        <button className="hint-what" data-noswipe onClick={(e) => { e.stopPropagation(); close(); openGuide(t.guide); }} data-testid="tip-what">What's this?</button>
      )}
    </div>
  );
}
