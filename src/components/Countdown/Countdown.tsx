// A ticking clock for the next free thing: big brass digits that roll each second, and a thin ring
// that empties as the wait runs down. Used on Rashid's bale and the daily gift.
import { useEffect, useState } from 'react';
import './countdown.css';

const two = (n: number) => String(n).padStart(2, '0');

/** `until`: when it comes (ms); `span`: the whole wait, for the ring */
export function Countdown({ until, span, label, testid }: { until: number; span: number; label?: string; testid?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = Math.max(0, until - now);
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  const frac = span > 0 ? Math.min(1, left / span) : 0;
  const soon = left < 10 * 60000;
  const R = 15, C = 2 * Math.PI * R;
  return (
    <span className={`cd ${soon ? 'soon' : ''}`} data-testid={testid} role="timer" aria-label={`${label ?? 'Ready'} in ${h} hours ${m} minutes`}>
      <svg className="cd-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={R} className="cd-track" />
        <circle cx="18" cy="18" r={R} className="cd-fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <span className="cd-txt">
        {label && <small>{label}</small>}
        <b>
          <i key={`h${h}`}>{two(h)}</i><em>:</em><i key={`m${m}`}>{two(m)}</i><em>:</em><i key={`s${s}`} className="sec">{two(s)}</i>
        </b>
      </span>
    </span>
  );
}

/** the next local midnight, when the daily gift comes round */
export const nextMidnight = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
