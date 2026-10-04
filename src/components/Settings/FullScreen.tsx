// Full screen with no address bar. Where the browser allows it (Android Chrome, desktop) this is the
// Fullscreen API; on an iPhone the only way is to add the game to the home screen, so we say so.
import { useEffect, useState } from 'react';

const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
const canApi = !!(el.requestFullscreen || el.webkitRequestFullscreen);
const isFull = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Chrome hands us its install offer; we keep it and show our own "Install the game" button instead
type InstallEvt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let offer: InstallEvt | null = null;
const fans = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offer = e as InstallEvt; fans.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { offer = null; fans.forEach((f) => f()); });

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const WHY = 'Installed, it opens from its own icon, full screen with no address bar, and keeps your save.';

/** "Install the game": Chrome's own install on Android; on iPhone (and Android browsers without it) the steps */
export function InstallButton({ className = 'btn' }: { className?: string }) {
  const [, bump] = useState(0);
  const [steps, setSteps] = useState(false);
  useEffect(() => { const f = () => bump((n) => n + 1); fans.add(f); return () => { fans.delete(f); }; }, []);
  if (installed()) return null;
  const how = isIOS
    ? 'On iPhone: in Safari tap Share (the square with the arrow), then “Add to Home Screen”, then Add. Play from the new icon.'
    : isAndroid
      ? 'On Android: tap the browser menu (⋮), then “Install app” or “Add to Home screen”, then Install. Play from the new icon.'
      : null;
  if (!offer && !how) return null;
  const go = async () => {
    const o = offer;
    if (!o) { setSteps((v) => !v); return; }
    await o.prompt(); const r = await o.userChoice.catch(() => null); if (r?.outcome === 'accepted') offer = null; fans.forEach((f) => f());
  };
  return (
    <span className="install-offer">
      <button className={className} onClick={go} data-testid="install-btn">⤓ Install the game</button>
      <small data-testid="install-why">Tip: {WHY}</small>
      {steps && how && <small className="install-steps" data-testid="install-steps">{how}</small>}
    </span>
  );
}

export function toggleFullScreen() {
  if (isFull()) { (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc); return; }
  try { const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.(); (r as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed here */ }
}

export function FullScreenButton({ className = 'btn' }: { className?: string }) {
  const [on, setOn] = useState(isFull());
  useEffect(() => { const f = () => setOn(isFull()); document.addEventListener('fullscreenchange', f); document.addEventListener('webkitfullscreenchange', f); return () => { document.removeEventListener('fullscreenchange', f); document.removeEventListener('webkitfullscreenchange', f); }; }, []);
  if (!canApi) return null;
  return (
    <>
      <button className={className} onClick={toggleFullScreen} data-testid="fullscreen-btn">{on ? 'Exit full screen' : '⛶ Full screen'}</button>
    </>
  );
}
