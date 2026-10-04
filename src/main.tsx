import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
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
