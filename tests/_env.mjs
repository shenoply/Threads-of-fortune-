// Shared settings for the browser tests.
//   PORT   game server port (default 5173, the Vite dev server)
//   BASE   full game URL (default http://localhost:$PORT/)
//   SHOTS  where screenshots go (default /dev/shm/tests-shots; never the repo)
import { mkdirSync } from 'node:fs';

export const PORT = process.env.PORT ?? '5173';
export const BASE = process.env.BASE ?? `http://localhost:${PORT}/`;
export const SHOTS = process.env.SHOTS ?? '/dev/shm/tests-shots';
try { mkdirSync(SHOTS, { recursive: true }); } catch { /* read-only or exists */ }

// Day one opens on the Giza district with "Wait for the customer". Tap it (again if the
// first tap only opened the stall view) until the first buyer's questions are showing. Also works for
// later buyers: it closes the morning's day summary and mission cards on the way.
export async function serveFirstCustomer(p, ready = '[data-testid=act-ask_room]') {
  for (let i = 0; i < 20; i++) {
    if (await p.locator(ready).count()) return;
    for (const ok of ['day-summary-ok', 'mission-ok', 'big-news-ok']) { const b = p.locator(`[data-testid=${ok}]`); if (await b.count()) await b.first().click({ timeout: 2000 }).catch(() => {}); }
    const w = p.locator('[data-testid=stall-wait]');
    if (await w.count()) await w.first().click({ timeout: 3000 }).catch(() => {});
    else if (i % 3 === 1) await p.locator('[data-testid=nav-stall]').click({ timeout: 2000 }).catch(() => {}); // stall sheet closed: open it
    await p.waitForTimeout(500);
  }
  await p.waitForSelector(ready, { timeout: 10000 }).catch(async (e) => {
    throw new Error(`serveFirstCustomer: ${ready} never showed. On screen: ${await visibleIds(p)}`);
  });
}

// The data-testids currently on screen, for failure messages.
export const visibleIds = (p) => p.evaluate(() => [...document.querySelectorAll('[data-testid]')]
  .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => e.dataset.testid).join(' ')).catch(() => '?');

// Tap a town on the world map even when the map is panned so it sits off screen
// (the marker's own click handler runs, as if the player had scrolled to it).
export const tapPlace = (p, id) => p.locator(`[data-testid=place-${id}]`).dispatchEvent('click');

// Arriving in a town opens its full-screen town menu over everything. Pick a tile from it
// (e.g. 'people', 'venues', 'walk', 'market', 'leave'; 'Everything in ...' when the town has no such
// tile); does nothing when the menu is not open.
export async function fromTownMenu(p, tile) {
  await settleBorder(p);
  await p.waitForSelector('[data-testid=town-menu]', { timeout: 1500 }).catch(() => {}); // it slides in on arrival
  if (!(await p.locator('[data-testid=town-menu]').count())) return;
  const t = p.locator(`[data-testid=menu-${tile}]`);
  await p.click((await t.count()) ? `[data-testid=menu-${tile}]` : '[data-testid=menu-all]'); // no such tile: the whole town
  await p.waitForTimeout(300);
}

// Talk through an open [data-testid=dialogue]: pick the options containing each wanted text in turn
// (a wording that is no longer offered is logged and skipped), then take the last option, which
// leaves, until the dialogue closes. Returns every option list seen.
export async function talk(p, wanted = [], max = 10) {
  const seen = []; const want = [...wanted];
  const dlg = p.locator('[data-testid=dialogue]');
  for (let i = 0; i < max && (await dlg.count()); i++) {
    const opts = dlg.locator('[data-testid^=opt-], [data-testid=dlg-done]');
    await opts.first().waitFor({ timeout: 8000 }).catch(() => {});
    const texts = (await opts.allTextContents()).map((t) => t.trim()); seen.push(texts);
    if (!texts.length) break;
    let k = -1;
    while (want.length && k < 0) { const w = want.shift(); k = texts.findIndex((t) => t.includes(w)); if (k < 0) console.log(`  (no "${w}" offered; options: ${texts.join(' / ')})`); }
    if (k < 0) k = texts.length - 1;
    await opts.nth(k).click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(600);
    // a tap while the line is still being typed only finishes the line: tap again if nothing moved on
    if ((await dlg.count()) && JSON.stringify((await opts.allTextContents()).map((t) => t.trim())) === JSON.stringify(texts)) { await opts.nth(k).click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(600); }
  }
  return seen;
}

// Giza district -> Bilgin's coffee house -> talk to Bilgin (skipping his short film on a first visit).
export async function openBilgin(p) {
  await p.click('[data-testid=poi-coffee]');
  await p.waitForSelector('[data-testid=cafe-room], [data-testid=film-skip]');
  if (await p.locator('[data-testid=film-skip]').count()) await p.click('[data-testid=film-skip]').catch(() => {});
  await p.click('[data-testid=cafe-hot-bilgin]');
  await p.waitForSelector('[data-testid=dialogue]');
}

// A frontier on the way: declare everything and carry on (the border card, src/components/World/BorderCard.tsx).
export async function settleBorder(p) {
  for (let i = 0; i < 4; i++) {
    if (!(await p.locator('[data-testid=border-card]').count())) return;
    const pick = ['border-full', 'border-none', 'border-continue'];
    let did = false;
    for (const id of pick) { const b = p.locator(`[data-testid=${id}]`); if (await b.count()) { await b.first().click({ timeout: 2000 }).catch(() => {}); did = true; break; } }
    if (!did) { const any = p.locator('[data-testid=border-card] button'); if (await any.count()) await any.first().click({ timeout: 2000 }).catch(() => {}); }
    await p.waitForTimeout(400);
  }
}
