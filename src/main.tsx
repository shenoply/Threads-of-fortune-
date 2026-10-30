import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installSaveGuard } from './game/state/saveGuard';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';
import './feel.css';
import './palette.css';
import './components/Touch/touch.css';
import { installPullClose } from './components/Touch/pullClose';
import { installImageFade } from './game/feel';
import { installRewards } from './game/rewards';
import { BOOT_ART, BOOT_LATER } from './game/bootArt';
import { loadWorldMap } from './components/World/Campaign';
import { installLookahead, keepTitle } from './game/preload';

// watch the save for failed writes and for another tab writing it (src/game/state/saveGuard.ts)
installSaveGuard();
// mark pictures as they arrive so the big ones fade in (src/feel.css)
installImageFade();
installPullClose();
// the coins, seals and stars on the moments that matter (src/game/rewards.ts)
installRewards();
// fetch ahead what the next screens show: the rugs' small pictures, the town ahead, the world map (src/game/preload.ts)
installLookahead();

// keep the pictures and sounds on the phone after the first visit (public/sw.js)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(keepFirstVisit).catch(() => {}); });
}
// On a first visit the code and the opening pictures arrive before the service worker is running, so it
// never sees them and the next visit asks the network for them again. Once it is running they are put
// in its store (the same one, 'tof-v1', and the same kinds of file it keeps), taken from what the
// browser already holds, so nothing is downloaded twice.
function keepFirstVisit() {
  if (navigator.serviceWorker.controller || !('caches' in window)) return; // already kept on an earlier visit
  const KEEP = /\/(assets|art)[/.-]/;
  window.setTimeout(() => {
    void navigator.serviceWorker.ready.then(async () => {
      const c = await caches.open('tof-v1');
      const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name))]
        .filter((u) => { try { const x = new URL(u); return x.origin === location.origin && !x.search && KEEP.test(x.pathname); } catch { return false; } });
      for (const u of urls) if (!(await c.match(u))) await c.add(u).catch(() => {});
    }).catch(() => {});
  }, 8000);
}

// In the built page the game's stylesheet no longer holds up the loading screen (vite.config marks it
// id="app-css" and lets it load alongside); the game itself is drawn only once it has arrived.
const appCss = document.getElementById('app-css') as HTMLLinkElement | null;
const cssReady = !appCss || appCss.media === 'all' ? Promise.resolve() : new Promise<void>((res) => {
  const done = () => { appCss.media = 'all'; res(); };
  appCss.addEventListener('load', done); appCss.addEventListener('error', done);
  if (appCss.sheet) done();
});
void cssReady.then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
));

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

// The loading screen in index.html stays up until the title is ready: the code, the fonts and the title's
// own picture. The stall pictures the title does not show follow once it is up, in a quiet moment (and
// at once on Play: App.tsx enterGame asks for them first). On a later visit they come from the phone at once.
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
  // (a title picture that has come in is noted, so a later visit opens on one already on the phone)
  track(capped(titlePicture().then((src) => imgLoad(src).then(() => keepTitle(src))), 15000), 4);
  window.setTimeout(() => say('Opening the stall…'), 1500);
  await capped(Promise.all(jobs), BOOT_MAX);
  W.__bootP = 100;
  // a moment at full so the bar visibly completes, unless it was all already on the phone
  await new Promise((r) => window.setTimeout(r, Date.now() - t0 > 600 ? 250 : 0));
  const l = document.getElementById('boot');
  if (l) { l.classList.add('done'); window.setTimeout(() => l.remove(), 400); }
  // once the title has been up a moment and the phone is idle: the first stall pictures (the Giza lane's
  // small copy first), then the full district painting, then the world map's code
  // (its own file: src/components/World/Campaign.tsx), one after another so they do not share the line
  const idle = (fn: () => void) => { const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }; if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 3000 }); else window.setTimeout(fn, 200); };
  window.setTimeout(() => idle(async () => {
    for (const src of [...BOOT_ART, ...BOOT_LATER]) await imgLoad(src);
    void loadWorldMap().catch(() => {});
  }), 1500);
}
void bootGate();
