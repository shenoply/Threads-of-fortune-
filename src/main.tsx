import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installSaveGuard } from './game/state/saveGuard';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';
import { STALL_ART } from './game/preload';

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

// The loading screen in index.html stays up until the game is ready to be played, not just drawn: the
// title picture, the fonts, and the first stall pictures are fetched behind it, so nothing pops in after
// it lifts. Its bar shows how many have arrived. On a later visit they come from the phone at once.
// It never waits longer than BOOT_MAX, however slow the line.
const BOOT_MAX = 20000;
const W = window as Window & { __bootP?: number };
const say = (t: string) => { const el = document.querySelector('#boot small'); if (el) el.textContent = t; };
const imgLoad = (src: string) => new Promise<void>((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => { (im.decode?.() ?? Promise.resolve()).catch(() => {}).finally(() => res()); }; im.onerror = () => res(); im.src = src; });
const capped = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => window.setTimeout(r, ms))]);
const titlePicture = () => new Promise<string>((res) => {
  const look = () => { const bg = document.querySelector<HTMLElement>('.title .bg, .bg'); const m = bg?.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/); if (m) res(m[1]); else window.setTimeout(look, 50); };
  look();
});
async function bootGate() {
  const t0 = Date.now();
  const jobs: Promise<unknown>[] = [];
  // each job counts by roughly how much it has to download, so the bar moves at an even pace
  let done = 0, total = 0;
  const track = (p: Promise<unknown>, weight = 1) => { total += weight; jobs.push(p.finally(() => { done += weight; W.__bootP = 30 + Math.round((done / total) * 68); })); };
  say('Unrolling the rugs…');
  track(capped(document.fonts?.ready ?? Promise.resolve(), 6000));
  track(capped(titlePicture().then(imgLoad), 15000), 4);
  // the first things the game shows after the title: the Giza lane and the stall
  for (const src of STALL_ART.slice(0, 6)) track(imgLoad(src), /\.jpg$/.test(src) ? 4 : 1);
  window.setTimeout(() => say('Opening the stall…'), 1500);
  await capped(Promise.all(jobs), BOOT_MAX);
  W.__bootP = 100;
  // a moment at full so the bar visibly completes, unless it was all already on the phone
  await new Promise((r) => window.setTimeout(r, Date.now() - t0 > 600 ? 250 : 0));
  const l = document.getElementById('boot'); if (!l) return;
  l.classList.add('done'); window.setTimeout(() => l.remove(), 400);
}
void bootGate();
