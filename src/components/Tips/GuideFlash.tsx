// While a first-hour step is open, the buttons that do it pulse, wherever they are on screen: the place
// in the lane, the tab, the buy button. Screens come and go, so it looks again twice a second rather
// than wiring every component; it only ever adds or removes one class.
import { useEffect } from 'react';
import { useGame } from '../../game/state/store';
import { firstHourStep } from './FirstHour';

/** what to pulse for each step; for a list of buttons (Rashid's rugs) only the first one you can use */
export const GUIDE_TARGETS: Record<string, string[]> = {
  stall: ['[data-testid="poi-stall"]', '[data-testid="nav-stall"]'],
  rashid: ['[data-testid="nav-supplier"]', '[data-testid="goto-rashid"]', '[data-testid="stock-rashid"]', '[data-testid="visit-rashid-evening"]', 'first:[data-testid="buy-cash"]:not(:disabled)'],
  map: ['[data-testid="district-world"]', '[data-testid="nav-map"]'],
  cairo: ['[data-testid="poi-ferry"]', '[data-testid="place-cairo"]', '[data-testid="district-world"]'],
  alexandria: ['[data-testid="place-alexandria"]', '[data-testid="nav-map"]'],
};
const CLS = 'guide-flash';

export function GuideFlash() {
  const step = useGame((g) => firstHourStep(g)?.id ?? null);
  useEffect(() => {
    const clear = () => document.querySelectorAll('.' + CLS).forEach((el) => el.classList.remove(CLS));
    const sels = step ? GUIDE_TARGETS[step] : undefined;
    if (!sels) { clear(); return; }
    const mark = () => {
      const want = new Set<Element>();
      for (const s of sels) {
        if (s.startsWith('first:')) { const el = document.querySelector(s.slice(6)); if (el) want.add(el); }
        else document.querySelectorAll(s).forEach((el) => want.add(el));
      }
      document.querySelectorAll('.' + CLS).forEach((el) => { if (!want.has(el)) el.classList.remove(CLS); });
      want.forEach((el) => { el.classList.add(CLS); if (!el.closest('nav, .nav')) reveal(el); });
    };
    // a pulsing button below the fold is no use: bring each one into view once, the first time it appears
    const shown = new Set<Element>();
    const reveal = (el: Element) => {
      if (shown.has(el)) return; shown.add(el);
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight - 90) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    mark();
    const t = window.setInterval(mark, 500);
    return () => { window.clearInterval(t); clear(); };
  }, [step]);
  return null;
}
