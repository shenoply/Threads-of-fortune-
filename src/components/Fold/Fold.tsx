import { useState, type ReactNode } from 'react';
import './fold.css';

// Which sections the player left open or closed, kept for the session and (when the browser allows) across visits.
const KEY = 'tof-folds';
let memo: Record<string, boolean> | null = null;
function folds(): Record<string, boolean> {
  if (memo) return memo;
  try { memo = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { memo = {}; }
  return memo!;
}
/** open a section the next time it is drawn (a link that takes you to it) */
export const openFoldNext = (id: string) => remember(id, true);
function remember(id: string, open: boolean) {
  folds()[id] = open;
  try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch { /* private window: memory only */ }
}

/** A long section folded into one tappable row: its name, a one-line gist, and a chevron. Opens in place.
 *  The content stays in the page while closed (a <details>), so nothing inside it is lost. A section
 *  that needs attention starts open until the player has opened or closed it himself. */
export function Fold({ id, title, gist, attention = false, testid, rowTestid, className = '', children }: {
  id: string; title: ReactNode; gist?: ReactNode; attention?: boolean; testid?: string; rowTestid?: string; className?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(() => folds()[id] ?? attention);
  return (
    <details className={`fold ${attention ? 'fold-new' : ''} ${className}`} open={open} data-testid={testid ?? `fold-${id}`}
      onToggle={(e) => { const o = e.currentTarget.open; if (o !== open) { setOpen(o); remember(id, o); } }}>
      <summary className="fold-row" data-testid={rowTestid ?? `fold-row-${id}`}>
        <b>{title}</b>
        {gist != null && gist !== '' && <span className="fold-gist">{gist}</span>}
        <i className="fold-chev" aria-hidden="true" />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
