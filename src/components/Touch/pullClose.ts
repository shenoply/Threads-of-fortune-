// Pull a sheet down by its head to close it, as on a phone: the sheet follows the finger down; let go
// far enough (or flick) and it slides away and closes as its own Close button would; short of that it
// settles back. Only the head starts a pull (the sheet's header, or the top strip of a card that has
// none, while the card is scrolled to its top), so the lists, sliders and maps inside keep their own
// touch. A sheet whose Close is held back (the lesson's "Look closer first") does not move.
//
// One listener for the whole game (installed once from main), so every sheet, old and new, has it.
import { buzz, reducedMotion } from '../../game/feel';

const SHEETS = [
  '.stall-sheet', '.admin-sheet', '.rugpick__sheet', '.modal-card', '.malek-sheet__card', '.radio-sheet',
  '.poi-sheet', '.ency', '.cal', '.paper', '.paper-pov', '[data-pull-sheet]', '.overlay',
].join(', ');
const HEADS = '.sheet-head, .overlay-head, .adm-head, .rugpick__head, .big-card-head, .ency-head, .cal-head, [data-pull-head]';
const CLOSERS = [
  '[data-pull-close]', '.sheet-x', '[data-testid$="-close"]', '.poi-sheet__close', 'button.close',
  'button[aria-label^="Close" i]', 'button[aria-label^="Back" i]',
].join(', ');
const NEVER = 'input, select, textarea, canvas, .rugscroll, [data-nopull], .world-map, .mapwrap, .district-canvas, .cv-stage, .inspector-stage';
const TOP_STRIP = 56;
const FAR = 96;

function closerOf(sheet: HTMLElement): HTMLButtonElement | null {
  for (const b of sheet.querySelectorAll<HTMLButtonElement>(CLOSERS)) {
    if (b.closest(SHEETS) !== sheet || b.disabled || b.getClientRects().length === 0) continue;
    return b;
  }
  return null;
}

/** the sheet this touch would pull, if it began on a head */
function sheetAt(target: HTMLElement, y: number): HTMLElement | null {
  if (target.closest(NEVER)) return null;
  const sheet = target.closest<HTMLElement>(SHEETS);
  if (!sheet || sheet.closest('[data-nopull]')) return null;
  const head = target.closest<HTMLElement>(HEADS);
  if (head && head.closest(SHEETS) === sheet) return sheet;
  // a card without a head: its top strip, while it is scrolled to the top
  if (sheet.matches('.overlay')) return null;
  const r = sheet.getBoundingClientRect();
  if (y - r.top <= TOP_STRIP && sheet.scrollTop <= 1) return sheet;
  return null;
}

function close(sheet: HTMLElement): void {
  const b = closerOf(sheet);
  if (b) { b.click(); return; }
  // no button: the backdrop around it closes it (most cards close on a tap outside)
  const back = sheet.parentElement;
  if (back && back !== document.body && back.matches('.overlay, .rugpick, [role=dialog], [class*=backdrop], [class*=-back], [class*=scrim]')) back.click();
  window.setTimeout(() => {
    if (sheet.isConnected) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  }, 30);
}

let installed = false;
export function installPullClose() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  let p: { sheet: HTMLElement; x: number; y: number; t: number; dy: number; on: boolean; id: number } | null = null;

  const reset = (sheet: HTMLElement, ease: boolean) => {
    sheet.style.transition = ease && !reducedMotion() ? 'translate .26s cubic-bezier(.2,.7,.2,1)' : '';
    sheet.style.translate = '';
    sheet.removeAttribute('data-pulling');
    window.setTimeout(() => { sheet.style.transition = ''; }, 280);
  };

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { if (p) { reset(p.sheet, true); p = null; } return; }
    const t = e.touches[0];
    const sheet = sheetAt(e.target as HTMLElement, t.clientY);
    p = sheet ? { sheet, x: t.clientX, y: t.clientY, t: e.timeStamp, dy: 0, on: false, id: t.identifier } : null;
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (e) => {
    if (!p) return;
    const t = [...e.changedTouches].find((x) => x.identifier === p!.id);
    if (!t) return;
    const mx = t.clientX - p.x, my = t.clientY - p.y;
    if (!p.on) {
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my)) { p = null; return; }
      if (my < -6) { p = null; return; }
      if (my < 10) return;
      // nothing to pull with: the Close is held back
      const sh = p.sheet;
      if ([...sh.querySelectorAll(CLOSERS)].some((b) => b.closest(SHEETS) === sh) && !closerOf(sh)) { p = null; return; }
      p.on = true;
      p.sheet.setAttribute('data-pulling', '');
      p.sheet.style.transition = 'none';
    }
    if (e.cancelable) e.preventDefault();
    p.dy = Math.max(0, my);
    // it follows the finger, a little heavier the further it goes
    const shown = p.dy < 140 ? p.dy : 140 + (p.dy - 140) * 0.45;
    p.sheet.style.translate = `0 ${shown}px`;
  }, { passive: false, capture: true });

  const end = (e: TouchEvent) => {
    if (!p) return;
    const cur = p;
    if ([...e.touches].some((x) => x.identifier === cur.id)) return;
    p = null;
    if (!cur.on) return;
    const v = cur.dy / Math.max(1, e.timeStamp - cur.t);
    if (e.type === 'touchend' && (cur.dy > FAR || (cur.dy > 44 && v > 0.6))) {
      buzz(8);
      const sheet = cur.sheet;
      if (reducedMotion()) { reset(sheet, false); close(sheet); return; }
      sheet.style.transition = 'translate .2s ease-in, opacity .2s ease-in';
      sheet.style.translate = `0 ${Math.max(cur.dy + 60, window.innerHeight * 0.6)}px`;
      sheet.style.opacity = '0';
      window.setTimeout(() => {
        close(sheet);
        // if it is still there (it would not close), it comes back
        window.setTimeout(() => { if (sheet.isConnected) { sheet.style.opacity = ''; reset(sheet, true); } }, 120);
      }, 190);
    } else reset(cur.sheet, true);
  };
  document.addEventListener('touchend', end, { capture: true });
  document.addEventListener('touchcancel', end, { capture: true });
}
