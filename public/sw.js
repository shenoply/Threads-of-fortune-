// Keeps the game's pictures, sounds and code on the phone after the first visit, so the next one
// opens at once instead of downloading everything again. The page itself always comes fresh from the
// network (so an update shows at once); the code files have new names on every update and are never
// re-checked; pictures and sounds are served from the phone and re-checked in the background at most
// once a day each (not on every use, which re-downloaded every picture on every screen).
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const r = e.request;
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
