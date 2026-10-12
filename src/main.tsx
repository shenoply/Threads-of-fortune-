import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installSaveGuard } from './game/state/saveGuard';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

// watch the save for failed writes and for another tab writing it (src/game/state/saveGuard.ts)
installSaveGuard();

// keep the pictures and sounds on the phone after the first visit (public/sw.js)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// On a patchy phone connection a picture can fail to download once and stay broken. Retry any
// failed <img> a few times (with a cache-busting suffix) before giving up.
window.addEventListener('error', (e) => {
  const im = e.target as HTMLImageElement | null;
  if (!im || im.tagName !== 'IMG') return;
  const n = Number(im.dataset.retry ?? 0);
  if (n >= 4 || !im.src || im.src.startsWith('data:')) return;
  im.dataset.retry = String(n + 1);
  const url = im.src.replace(/[?&]r=\d+$/, '');
  window.setTimeout(() => { im.src = `${url}${url.includes('?') ? '&' : '?'}r=${n + 1}`; }, 1200 * (n + 1));
}, true);

// the loading bar in index.html goes once the game has drawn its first screen
requestAnimationFrame(() => requestAnimationFrame(() => {
  const l = document.getElementById('boot'); if (!l) return;
  l.classList.add('done'); window.setTimeout(() => l.remove(), 400);
}));
