// Keeps the game's pictures, sounds and code on the phone after the first visit, so the next one
// opens at once instead of downloading everything again. The page itself always comes fresh from the
// network (so an update shows at once); the code files have new names on every update and are never
// re-checked; pictures and sounds are served from the phone and re-checked in the background at most
// once a day each (not on every use, which re-downloaded every picture on every screen). Code files
// from earlier updates are removed once the current page no longer uses them.
const CACHE = 'tof-v1';
const KEEP = /\/(assets|art|audio\/(fx|amb|music|arran|feras|malek|intro)|video\/[^/]*poster)[/.-]/;
const DAY = 24 * 60 * 60 * 1000;
// when each file was last fetched, kept as one small JSON entry in the same cache
const STAMPS = new URL('__sw-stamps__', self.registration.scope).href;
let stamps = null;
let saving = null;

async function loadStamps(c) {
  if (stamps) return stamps;
  try { const r = await c.match(STAMPS); stamps = r ? await r.json() : {}; } catch { stamps = {}; }
  return stamps;
}
// record a fetch; writes are batched (one write covers every stamp made while it waits)
function stamp(c, url) {
  stamps[url] = Date.now();
  if (!saving) {
    saving = new Promise((ok) => setTimeout(ok, 500))
      .then(() => { saving = null; return c.put(STAMPS, new Response(JSON.stringify(stamps), { headers: { 'Content-Type': 'application/json' } })); })
      .catch(() => {});
  }
  return saving;
}

// Code files get a new name on every update, so the old ones would pile up in the cache for ever.
// After an update, keep only the /assets/ files the current page uses: the ones index.html names,
// and the ones those files name in turn (screens loaded later, their styles and pictures). If the page
// cannot be read (offline), nothing is removed.
const HASHED = /[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.(?:js|css|png|jpe?g|webp|avif|gif|svg|woff2?|ttf|otf|mp3|ogg|m4a|wav|json|wasm)/g;
let tidying = null;
let lastHtml = '';
async function tidyAssets() {
  const index = await fetch(new URL('./', self.registration.scope).href, { cache: 'no-store' });
  if (!index.ok) return;
  const html = await index.text();
  if (html === lastHtml) return; // same page as last time: nothing new to tidy
  const c = await caches.open(CACHE);
  const keep = new Set();
  const todo = [];
  const add = (txt) => { for (const n of txt.match(HASHED) || []) if (!keep.has(n)) { keep.add(n); if (/\.(js|css)$/.test(n)) todo.push(n); } };
  for (const m of html.matchAll(/assets\/([^"'?#\s>]+)/g)) add(m[1]);
  if (![...keep].some((n) => /\.js$/.test(n))) return; // not the game's page: leave the cache alone
  while (todo.length) {
    const url = new URL('assets/' + todo.pop(), self.registration.scope).href;
    // only files already kept here are read: a screen never opened is not downloaded just to be read
    const r = await c.match(url);
    if (!r) continue;
    add(await r.text());
  }
  for (const req of await c.keys()) {
    const path = new URL(req.url).pathname;
    if (!/\/assets\//.test(path)) continue;
    if (!keep.has(path.split('/').pop())) await c.delete(req);
  }
  lastHtml = html;
}
function tidy() {
  if (tidying) return tidying; // one at a time
  tidying = tidyAssets().catch(() => {}).finally(() => { tidying = null; });
  return tidying;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim().then(() => tidy())));

self.addEventListener('fetch', (e) => {
  const r = e.request;
  // the page itself is left to the browser (it always comes fresh); a new copy may name new code files
  if (r.mode === 'navigate') { e.waitUntil(new Promise((ok) => setTimeout(ok, 3000)).then(tidy)); return; }
  if (r.method !== 'GET' || r.headers.has('range')) return; // voice lines and films are read in pieces: leave those to the browser
  const url = new URL(r.url);
  if (url.origin !== location.origin || !KEEP.test(url.pathname) || url.search.includes('r=')) return;
  const hashed = /\/assets\//.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const [hit] = await Promise.all([c.match(r), loadStamps(c)]);
    const get = () => fetch(r).then((res) => { if (res.ok && res.status === 200) { c.put(r, res.clone()); const s = stamp(c, r.url); try { e.waitUntil(s); } catch { /* event already settled */ } } return res; });
    if (!hit) return get();
    // a file with a known fetch time under a day old is used as it is; otherwise one quiet re-check
    if (!hashed && !(Date.now() - (stamps[r.url] || 0) < DAY)) {
      stamps[r.url] = Date.now(); // one re-check per file at a time, even if it is asked for again meanwhile
      e.waitUntil(get().catch(() => {}));
    }
    return hit;
  }));
});
