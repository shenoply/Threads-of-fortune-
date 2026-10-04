// Full screen with no address bar. Where the browser allows it (Android Chrome, desktop) this is the
// Fullscreen API; on an iPhone the only way is to add the game to the home screen, so we say so.
import { useEffect, useState } from 'react';

const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
const canApi = !!(el.requestFullscreen || el.webkitRequestFullscreen);
const isFull = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
const installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

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
