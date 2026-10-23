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

// Music is streamed: the player asks for it in pieces (Range requests), which the cache cannot answer
// as they come, so every session downloaded each track again (4-6 MB). The first time a track is
// played, the whole file is fetched once in the background and kept; after that the pieces the player
// asks for are cut from the kept file (206 Partial Content), and the file is re-checked once a day.
const STREAMED = /\/audio\/music\//;
const wholeAsked = new Set();
function fetchWhole(c, url) {
  if (wholeAsked.has(url)) return Promise.resolve();
  wholeAsked.add(url);
  return fetch(url)
    .then(async (res) => { if (res.ok && res.status === 200) { await c.put(url, res); await loadStamps(c); await stamp(c, url); } })
    .catch(() => {})
    .finally(() => wholeAsked.delete(url));
}
async function rangeOf(res, range) {
  const blob = await res.blob();
  const size = blob.size;
  const type = res.headers.get('Content-Type') || 'audio/mpeg';
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (!m || (m[1] === '' && m[2] === '')) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; } // the last n bytes
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1, type), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}
function streamed(e, url) {
  const key = url.href;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const [hit] = await Promise.all([c.match(key), loadStamps(c)]);
    if (!hit) {
      // this time the network plays it as it comes; the whole file is kept for next time
      e.waitUntil(fetchWhole(c, key));
      return fetch(e.request);
    }
    if (!(Date.now() - (stamps[key] || 0) < DAY)) { stamps[key] = Date.now(); e.waitUntil(fetchWhole(c, key)); }
    return rangeOf(hit, e.request.headers.get('range'));
  }).catch(() => fetch(e.request)));
}

// The daily re-check asks "has it changed?" (the kept copy's ETag / Last-Modified) instead of fetching the
// file again: an unchanged picture costs a few hundred bytes (304 Not Modified), not its whole size. Before,
// a player coming back each day re-downloaded every picture they had seen, a few megabytes on a phone plan.
function recheck(c, r, hit) {
  const h = new Headers();
  const tag = hit.headers.get('ETag'), mod = hit.headers.get('Last-Modified');
  if (tag) h.set('If-None-Match', tag);
  if (mod) h.set('If-Modified-Since', mod);
  if (!tag && !mod) return fetch(r).then((res) => { if (res.ok && res.status === 200) { c.put(r, res.clone()); return stamp(c, r.url); } });
  return fetch(r.url, { headers: h, cache: 'no-store', credentials: 'same-origin' }).then((res) => {
    if (res.status === 304) return stamp(c, r.url); // unchanged: the kept copy stays, its check time moves on
    if (res.ok && res.status === 200) { c.put(r, res.clone()); return stamp(c, r.url); }
  });
}

self.addEventListener('install', () => self.skipWaiting());
// Pictures replaced under the same name (the fictional cast's portraits, the court scenes, the stall
// poses and the carpet pictures) are dropped from the phone once, so the new ones are fetched instead
// of the kept old copies. Bump the mark when another set is replaced.
const REPLACED = { mark: 'replaced-2026-10-23', paths: /\/art\/(portraits|royal|rugs|stalls)\// };
async function dropReplaced() {
  const c = await caches.open(CACHE);
  const markUrl = new URL('__sw-' + REPLACED.mark + '__', self.registration.scope).href;
  if (await c.match(markUrl)) return;
  for (const req of await c.keys()) if (REPLACED.paths.test(new URL(req.url).pathname)) await c.delete(req);
  await c.put(markUrl, new Response('1'));
}
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim().then(() => dropReplaced()).catch(() => {}).then(() => tidy())));

self.addEventListener('fetch', (e) => {
  const r = e.request;
  // the page itself is left to the browser (it always comes fresh); a new copy may name new code files
  if (r.mode === 'navigate') { e.waitUntil(new Promise((ok) => setTimeout(ok, 3000)).then(tidy)); return; }
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (r.headers.has('range')) {
    // music is kept whole and cut to the piece asked for; voice lines and films are left to the browser
    if (url.origin === location.origin && STREAMED.test(url.pathname) && !url.search.includes('r=')) streamed(e, url);
    return;
  }
  if (url.origin !== location.origin || !KEEP.test(url.pathname) || url.search.includes('r=')) return;
  const hashed = /\/assets\//.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const [hit] = await Promise.all([c.match(r), loadStamps(c)]);
    const get = () => fetch(r).then((res) => { if (res.ok && res.status === 200) { c.put(r, res.clone()); const s = stamp(c, r.url); try { e.waitUntil(s); } catch { /* event already settled */ } } return res; });
    if (!hit) return get();
    // a file with a known fetch time under a day old is used as it is; otherwise one quiet re-check
    if (!hashed && !(Date.now() - (stamps[r.url] || 0) < DAY)) {
      stamps[r.url] = Date.now(); // one re-check per file at a time, even if it is asked for again meanwhile
      e.waitUntil(recheck(c, r, hit).catch(() => {}));
    }
    return hit;
  }));
});
