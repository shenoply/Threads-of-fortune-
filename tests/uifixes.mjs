import { chromium } from 'playwright';
// Customers list (Nabil, Cohen), the map's "Back to your caravan" button, town tap targets, and the catalogue.
//   PORT=5173 SHOTS=/tmp node tests/uifixes.mjs
const S = process.env.SHOTS ?? '/tmp';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
await p.goto('http://localhost:5173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.world.hour = 10; s.cash = 5000; localStorage.setItem('tof-skip-chapters', '1');`);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
// customers list
await p.screenshot({ path: `${S}/u-start.png` });
console.log('navs:', await p.evaluate(() => [...document.querySelectorAll('[data-testid^=nav-]')].map((e) => e.dataset.testid).join(',')));
const nav = ['nav-me', 'nav-ledger'];
for (const n of nav) if (await has(n)) { await p.click(`[data-testid=${n}]`); break; }
await p.waitForTimeout(500);
if (!(await has('customers'))) { const t = p.getByText('Customers', { exact: false }).first(); if (await t.count()) await t.click(); await p.waitForTimeout(400); }
console.log('customers open:', await has('customers'), '| cohen:', await has('cust-cohen'), '| nabil:', await has('cust-nabil'));
if (await has('cust-cohen')) {
  const sec = await p.evaluate(() => ['cohen', 'nabil'].map((id) => document.querySelector(`[data-testid=cust-${id}]`)?.closest('section')?.querySelector('.section-label')?.textContent));
  console.log('  sections:', sec.join(' / '));
  await p.locator('[data-testid=cust-cohen]').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${S}/u-customers.png` });
}
// map: drag away and look for the pill
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
if (!(await has('world'))) { await p.locator('[data-testid=district-world]').scrollIntoViewIfNeeded().catch(() => {}); await p.click('[data-testid=district-world]').catch(() => {}); await p.waitForTimeout(900); }
console.log('pill before drag:', await has('find-me-pill'));
const box = await p.locator('[data-testid=world]').boundingBox();
await p.mouse.move(box.x + 200, box.y + 400); await p.mouse.down(); await p.mouse.move(box.x + 380, box.y + 100, { steps: 12 }); await p.mouse.up();
await p.mouse.move(box.x + 200, box.y + 400); await p.mouse.down(); await p.mouse.move(box.x + 380, box.y + 100, { steps: 12 }); await p.mouse.up();
await p.waitForTimeout(400);
console.log('pill after drag:', await has('find-me-pill'));
await p.screenshot({ path: `${S}/u-map-pill.png` });
if (await has('find-me-pill')) { await p.click('[data-testid=find-me-pill]'); await p.waitForTimeout(600); console.log('pill after tap:', await has('find-me-pill')); }
// town tap target: which element is on top at each town's dot centre
const tops = await p.evaluate(() => [...document.querySelectorAll('.place')].map((el) => { const r = el.querySelector('.pdot').getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null; const hit = document.elementFromPoint(x + 14, y + 10); return `${el.dataset.testid}:${hit?.closest('.place') === el ? 'ok' : hit?.className?.toString().slice(0, 20)}`; }).filter(Boolean));
console.log('towns tappable (dot +14,+10px):', tops.join(', '));
// catalogue
await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(400);
if (await has('mummy-later')) await p.click('[data-testid=mummy-later]');
await p.click('[data-testid=arran-catalogue-open]'); await p.waitForSelector('[data-testid=arran-catalogue]');
console.log('catalogue sections:', (await p.locator('.cat__tab').allTextContents()).join(' | '));
await p.click('[data-testid=cat-tab-cabinet]'); await p.waitForTimeout(200);
console.log('cabinet entries:', await p.locator('.cat__entry').count());
await p.click('[data-testid=cat-item-cab-khamsin]'); await p.click('[data-testid=cat-buy]'); await p.waitForTimeout(200);
console.log('bought from catalogue:', await p.locator('[data-testid=cat-note]').textContent(), '| button', await p.locator('[data-testid=cat-buy]').textContent());
await p.screenshot({ path: `${S}/u-catalogue.png` });
await p.click('[data-testid=cat-tab-library]'); console.log('books listed:', await p.locator('.cat__entry').count());
console.log('errors', errs);
await b.close();
