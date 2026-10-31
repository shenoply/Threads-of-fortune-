// The PC layer: wide layouts, the mouse and the keyboard. The same game and the same screens as on the
// phone; on a wide screen with a mouse (and always in the desktop app) <html> carries the class `pc` and
// src/platform/pc.css lays the screens out for it. Nothing here changes what the game does, only how it
// is reached: hover tips, right-click to inspect, keyboard shortcuts.
//
// The layout can be forced in Settings (Auto / Wide / Phone); 'tof-layout' in localStorage keeps the choice.
import { useSyncExternalStore } from 'react';
import { desktop, isDesktopApp } from './platform';
import { toggleFullScreen } from '../components/Settings/FullScreen';

export type LayoutPref = 'auto' | 'pc' | 'phone';
const PREF = 'tof-layout';
const WIDE = '(min-width: 1200px) and (min-height: 640px) and (hover: hover) and (pointer: fine)';

const readPref = (): LayoutPref => { try { const v = localStorage.getItem(PREF); return v === 'pc' || v === 'phone' ? v : 'auto'; } catch { return 'auto'; } };
let pref: LayoutPref = readPref();
const subs = new Set<() => void>();
let on = false;

const wideMq = typeof window !== 'undefined' ? window.matchMedia(WIDE) : null;
function compute(): boolean {
  if (pref === 'pc') return true;
  if (pref === 'phone') return false;
  return isDesktopApp || !!wideMq?.matches;
}
function apply() {
  const now = compute();
  if (now === on && document.documentElement.classList.contains('pc') === now) return;
  on = now;
  document.documentElement.classList.toggle('pc', on);
  document.documentElement.classList.toggle('desktop-app', isDesktopApp);
  subs.forEach((f) => f());
}

export const isPc = () => on;
export const layoutPref = () => pref;
export function setLayoutPref(v: LayoutPref) {
  pref = v;
  try { if (v === 'auto') localStorage.removeItem(PREF); else localStorage.setItem(PREF, v); } catch { /* private mode */ }
  apply();
}
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** whether the PC layout is on (re-renders when the window is resized across the line or Settings changes it) */
export const usePc = () => useSyncExternalStore(sub, isPc, () => false);
export const useLayoutPref = () => useSyncExternalStore(sub, layoutPref, () => 'auto' as LayoutPref);

/** The keyboard shortcuts, as listed in Settings. Each one presses the button the player would press. */
export const SHORTCUTS: [string, string][] = [
  ['M', 'Map'], ['S', 'Your stall'], ['C', 'Caravan'], ['I', 'Stock'], ['H', 'Me'],
  ['Space', 'Pause or carry on travelling'], ['1 – 4', 'Travel speed'],
  ['Esc', 'Close what is open, or back'], ['F11', 'Full screen'],
  ['Mouse wheel', 'Zoom the map'], ['Right-click', 'Look closer at a rug or a buyer'],
];

const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).offsetParent !== null && !(el as HTMLButtonElement).disabled;
const press = (sel: string) => { const b = [...document.querySelectorAll(sel)].filter(visible).pop(); if (b) { b.click(); return true; } return false; };

// typing in a field, or a dialogue/film asking for keys of its own: the shortcuts keep out of the way
const typing = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); };

let lastSpeed = 'speed-1';
function onKey(e: KeyboardEvent) {
  if (e.key === 'F11') {
    e.preventDefault();
    if (desktop) desktop.toggleFullscreen(); else toggleFullScreen();
    return;
  }
  if (!on || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
  // nothing behind a dialog that is open (a buyer's card, settings): Esc is theirs, the rest waits
  const modal = document.querySelector('[role=dialog][aria-modal=true], [role=alertdialog]');
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const tabs: Record<string, string> = { m: 'map', s: 'stall', c: 'caravan', i: 'inventory', h: 'hero' };
  if (tabs[k] && !modal) { if (press(`[data-testid=nav-${tabs[k]}]`)) e.preventDefault(); return; }
  if (modal) return;
  if (k === ' ') {
    const speeds = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^=speed-]')].filter(visible);
    if (!speeds.length) return;
    e.preventDefault();
    const cur = speeds.find((b) => b.classList.contains('on'));
    if (cur && cur.dataset.testid !== 'speed-0') { lastSpeed = cur.dataset.testid!; press('[data-testid=speed-0]'); }
    else if (!press(`[data-testid=${lastSpeed}]`)) press('[data-testid=speed-1]');
    return;
  }
  if (/^[1-4]$/.test(k)) {
    const speeds = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^=speed-]')].filter(visible).filter((b) => b.dataset.testid !== 'speed-0');
    if (!speeds.length) return;
    e.preventDefault();
    const b = speeds[Math.min(Number(k), speeds.length) - 1];
    b.click(); lastSpeed = b.dataset.testid!;
  }
}

// ---- hover tips: the game's own labels, shown as a small card by the pointer ----
let tip: HTMLDivElement | null = null;
let tipFor: HTMLElement | null = null;
let tipTimer = 0;
const TIP_SEL = '[data-tip], [title], button[aria-label], [role=button][aria-label], a[aria-label]';
function tipText(el: HTMLElement): string {
  const t = el.dataset.tip ?? el.dataset.tipTitle ?? el.getAttribute('title') ?? el.getAttribute('aria-label') ?? '';
  // a button that already says what its label says needs no tip
  const shown = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!el.dataset.tip && t && shown && (t === shown || t.startsWith(shown) && t.length - shown.length < 4)) return '';
  return t.trim();
}
function hideTip() {
  window.clearTimeout(tipTimer);
  if (tipFor?.dataset.tipTitle !== undefined) { tipFor.setAttribute('title', tipFor.dataset.tipTitle); delete tipFor.dataset.tipTitle; }
  tipFor = null;
  if (tip) tip.classList.remove('on');
}
function placeTip(x: number, y: number) {
  if (!tip) return;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 18;
  if (left + r.width > innerWidth - 8) left = Math.max(8, x - r.width - 10);
  if (top + r.height > innerHeight - 8) top = Math.max(8, y - r.height - 12);
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
function onOver(e: PointerEvent) {
  if (!on || e.pointerType !== 'mouse') return;
  const el = (e.target as HTMLElement | null)?.closest?.(TIP_SEL) as HTMLElement | null;
  if (el === tipFor) return;
  hideTip();
  if (!el) return;
  const text = tipText(el);
  if (!text) return;
  // the browser's own tip would show as well: keep the title aside while ours is up
  if (el.hasAttribute('title')) { el.dataset.tipTitle = el.getAttribute('title')!; el.removeAttribute('title'); }
  tipFor = el;
  const x = e.clientX, y = e.clientY;
  tipTimer = window.setTimeout(() => {
    if (tipFor !== el || !document.contains(el)) return;
    if (!tip) { tip = document.createElement('div'); tip.className = 'pc-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = text;
    tip.classList.add('on');
    placeTip(lastX || x, lastY || y);
  }, 380);
}
let lastX = 0, lastY = 0;
function onMove(e: PointerEvent) { lastX = e.clientX; lastY = e.clientY; if (tip?.classList.contains('on')) placeTip(lastX, lastY); }

// ---- right-click: look closer ----
function onContext(e: MouseEvent) {
  if (!on) return;
  const t = e.target as HTMLElement | null;
  if (typing(t)) return;
  // cards with a press-and-hold (rugs) answer the right button themselves (Touch/RugScroll longPress)
  if (t?.closest('[data-hold]')) { e.preventDefault(); return; }
  const el = t?.closest<HTMLElement>('[data-inspect]');
  if (el) {
    e.preventDefault();
    const sel = el.dataset.inspect;
    const target = sel ? document.querySelector<HTMLElement>(sel) : el;
    (target ?? el).click();
    return;
  }
  // in the desktop app there is no browser menu to offer (Back, Reload, View source)
  if (isDesktopApp) e.preventDefault();
}

let installed = false;
export function installPc() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  apply();
  wideMq?.addEventListener?.('change', apply);
  window.addEventListener('keydown', onKey);
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerdown', hideTip, { passive: true, capture: true });
  document.addEventListener('wheel', hideTip, { passive: true, capture: true });
  window.addEventListener('blur', hideTip);
  document.addEventListener('contextmenu', onContext);
}
