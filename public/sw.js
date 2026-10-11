// Keeps the game's pictures, sounds and code on the phone after the first visit, so the next one
// opens at once instead of downloading everything again. The page itself always comes fresh from the
// network (so an update shows at once); the code files have new names on every update; pictures and
// sounds are served from the phone and quietly refreshed in the background.
const CACHE = 'tof-v1';
const KEEP = /\/(assets|art|audio\/(fx|amb|music|arran|feras|malek|intro)|video\/[^/]*poster)[/.-]/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return; // voice lines and films are read in pieces: leave those to the browser
  const url = new URL(r.url);
  if (url.origin !== location.origin || !KEEP.test(url.pathname) || url.search.includes('r=')) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r);
    const fresh = fetch(r).then((res) => { if (res.ok && res.status === 200) c.put(r, res.clone()); return res; });
    if (hit) { if (!/\/assets\//.test(url.pathname)) e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  }));
});
