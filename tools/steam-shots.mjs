// Steam store screenshots at 1920x1080 (docs/steam/screenshots-plan.md), staged with the tester's sheet and
// the tester hook. JPEG, each under 1 MB, into docs/steam/shots/.
//   npx vite --port 5196 ;  PORT=5196 node --import ./tests/_nohmr.mjs tools/steam-shots.mjs [only...]
// The game is laid out for a phone; at 1920x1080 some screens keep a narrow column until the PC layout
// lands. Re-run this then. A shot that cannot be staged is logged and skipped.
import { chromium } from 'playwright';
import { statSync, mkdirSync } from 'node:fs';
import { BASE, serveFirstCustomer, tapPlace, fromTownMenu, visibleIds } from '../tests/_env.mjs';

const OUT = new URL('../docs/steam/shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on('dialog', (d) => d.accept());
p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = async (id) => (await p.locator(`[data-testid="${id}"]`).count()) > 0;
const waitId = (id, ms = 8000) => p.waitForSelector(`[data-testid="${id}"]`, { timeout: ms }).then(() => true).catch(() => false);
const idle = async () => { for (let i = 0; i < 60; i++) { if (!(await p.locator('.skip-hint').count())) return; await p.waitForTimeout(250); } };
const clearCards = async () => { for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) { const x = p.locator(`[data-testid=${id}]`); if (await x.count()) await x.first().click({ timeout: 1500 }).catch(() => {}); } };
const fresh = async () => { await p.reload(); if (await waitId('continue', 15000)) await p.click('[data-testid=continue]'); await waitId('nav-map', 15000); await p.waitForTimeout(800); await clearCards(); };
const openSheet = async () => { await clearCards(); await p.click('[data-testid=settings-btn]'); await p.locator('[data-testid=admin-open]').scrollIntoViewIfNeeded(); await p.click('[data-testid=admin-open]'); return waitId('admin-sheet', 5000); };
const press = async (sec, btn, settle = 2000) => {
  if (!(await has('admin-sheet'))) await openSheet();
  const d = p.locator(`[data-testid=adm-sec-${sec}]`);
  if (!(await d.evaluate((e) => e.open))) await p.click(`[data-testid=adm-row-${sec}]`);
  await p.click(`[data-testid=${btn}]`);
  for (let i = 0; i < 40 && (await has('admin-sheet')); i++) await p.waitForTimeout(150);
  if (await has('admin-sheet')) await p.click('[data-testid=admin-close]').catch(() => {});
  await p.waitForTimeout(settle);
};
const tof = (fn) => p.evaluate(fn);
const done = [];
async function shot(name, stage) {
  if (only.length && !only.some((o) => name.includes(o))) return;
  try {
    await stage();
    await idle(); await p.waitForTimeout(700);
    const path = `${OUT}${name}.jpg`;
    let q = 86;
    await p.screenshot({ path, type: 'jpeg', quality: q });
    while (statSync(path).size > 1_000_000 && q > 50) { q -= 8; await p.screenshot({ path, type: 'jpeg', quality: q }); }
    done.push(`${name} ${(statSync(path).size / 1024).toFixed(0)} KB`);
    console.log(`ok   ${name}`);
  } catch (e) { console.log(`skip ${name}: ${e.message.split('\n')[0]} | on screen: ${(await visibleIds(p)).slice(0, 300)}`); }
}

await p.goto(BASE);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-films-once', '1'); localStorage.setItem('tof-fullscreen', 'off'); });
await p.reload(); await waitId('title', 20000); await p.waitForTimeout(2500);

await shot('01-title', async () => {});

await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1500);

await shot('02-stall-buyer', async () => { await serveFirstCustomer(p); await idle(); await p.click('[data-testid=act-ask_room]'); await p.waitForTimeout(400); await idle(); });
await shot('03-haggle', async () => {
  await p.click('[data-testid=rug-desert-star]').catch(() => {}); await p.waitForTimeout(400); await idle();
  await p.click('[data-testid=act-story]').catch(() => {}); await p.waitForTimeout(400); await idle();
  await p.click('[data-testid=act-name_price]'); await p.waitForTimeout(600);
});
// finish the sale, then the opening behind us: everything open, some money and standing
await p.click('[data-testid=offer-price]').catch(() => {}); await p.waitForTimeout(500); await idle();
if (await has('act-accept_offer')) await p.click('[data-testid=act-accept_offer]').catch(() => {});
await p.waitForTimeout(800);
await tof(() => { const t = window.tof; const s = t.state(); t.set({ tutorial: { ...s.tutorial, done: true, step: 'done' }, tipsSeen: [...new Set([...(s.tipsSeen ?? []), 'first-hour', 'open-all'])], cash: s.cash + 40000, reputation: 14, encounter: null }); });
await fresh();

await shot('04-giza-district', async () => { await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600); if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]').catch(() => {}); await p.waitForTimeout(1200); });
await shot('05-world-map', async () => {
  if (await has('district-world')) await p.click('[data-testid=district-world]'); await p.waitForTimeout(1500);
  await tapPlace(p, 'alexandria'); await p.waitForTimeout(1200);
});
await shot('06-town-cairo', async () => { await fresh(); await tof(() => { const t = window.tof; const s = t.state(); t.set({ world: { ...s.world, at: 'cairo' } }); }); await fresh(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800); if (await has('district-world')) await p.click('[data-testid=district-world]'); await p.waitForTimeout(800); await tapPlace(p, 'cairo'); await p.waitForTimeout(1500); if (!(await has('town-menu')) && (await has('enter-town'))) await p.click('[data-testid=enter-town]'); await p.waitForTimeout(1200); });
await shot('07-road-fight', async () => { await fresh(); await press('fight', 'adm-fight-even', 3000); });
await shot('08-rashid', async () => { await fresh(); await tof(() => { const t = window.tof; const s = t.state(); t.set({ world: { ...s.world, at: 'giza' } }); }); await fresh(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600); if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]').catch(() => {}); await p.click('[data-testid=poi-rashid]'); await p.waitForTimeout(2000); if (await has('film-skip')) await p.click('[data-testid=film-skip]').catch(() => {}); await p.waitForTimeout(1500); await p.waitForFunction(() => [...document.images].filter((i) => i.offsetParent).every((i) => i.complete), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800); });
await shot('09-story', async () => { await fresh(); await press('stories', 'adm-st-start-forgery', 2500); });
await shot('10-knot-count', async () => {
  await fresh(); await press('games', 'adm-knots', 3000);
  // Arran's first visit may play his film first: walk on to the bench by hand
  for (let i = 0; i < 12 && !(await has('knotcount')); i++) {
    for (const sel of ['[data-testid=film-skip]', '[data-testid^=arran-knots-]', '[data-testid^=arran-rug-]', '[data-testid=arran-scene-leave]', '[data-testid=arran-enter]', '[data-testid=stall-sheet-close]', '[data-testid=poi-lab]']) {
      const l = p.locator(sel); if (await l.count()) { await l.first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(700); break; }
    }
  }
  if (!(await has('knotcount'))) throw new Error('the knot count never opened');
});
await shot('11-coffee-house', async () => { await fresh(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600); if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]').catch(() => {}); await p.click('[data-testid=poi-coffee]'); await p.waitForSelector('[data-testid=cafe-room], [data-testid=film-skip]'); if (await has('film-skip')) await p.click('[data-testid=film-skip]').catch(() => {}); await p.waitForTimeout(2000); });
await shot('12-persia', async () => { await fresh(); await press('persia', 'adm-persia-open', 800); await press('persia', 'adm-persia-kermanshah', 3000); });

console.log(done.join('\n'));
if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
await b.close();
