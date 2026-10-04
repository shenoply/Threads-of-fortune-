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

export function InstallButton({ className = 'btn' }: { className?: string }) {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); fans.add(f); return () => { fans.delete(f); }; }, []);
  if (!offer || installed()) return null;
  const go = async () => { const o = offer; if (!o) return; await o.prompt(); const r = await o.userChoice.catch(() => null); if (r?.outcome === 'accepted') offer = null; fans.forEach((f) => f()); };
  return (
    <span className="install-offer">
      <button className={className} onClick={go} data-testid="install-btn">⤓ Install the game</button>
      <small data-testid="install-why">Tip: installed, it opens from its own icon, full screen with no address bar, and keeps your save.</small>
    </span>
  );
}

export function toggleFullScreen() {
  if (isFull()) { (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc); return; }
  try { const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.(); (r as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed here */ }
}

export function FullScreenButton({ className = 'btn' }: { className?: string }) {
  const [on, setOn] = useState(isFull());
  const [hint, setHint] = useState(false);
  useEffect(() => { const f = () => setOn(isFull()); document.addEventListener('fullscreenchange', f); document.addEventListener('webkitfullscreenchange', f); return () => { document.removeEventListener('fullscreenchange', f); document.removeEventListener('webkitfullscreenchange', f); }; }, []);
  if (installed() && !canApi) return null;
  return (
    <>
      <button className={className} onClick={() => (canApi ? toggleFullScreen() : setHint((h) => !h))} data-testid="fullscreen-btn">{on ? 'Exit full screen' : '⛶ Full screen'}</button>
      {hint && <p className="hint" style={{ fontSize: 13, opacity: 0.85 }} data-testid="fullscreen-hint">On iPhone: tap Share, then “Add to Home Screen”. Open the game from that icon and it runs full screen with no address bar.</p>}
    </>
  );
}
