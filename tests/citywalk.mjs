import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
const pos = { alexandria: [86.4, 387.2], jerusalem: [403.3, 341.1], damascus: [486.9, 291], istanbul: [167.1, 49], amman: [452.3, 339.9], baghdad: [823.9, 266.2] };
for (const [c, [x, y]] of Object.entries(pos)) {
  await p.evaluate(([c, x, y]) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.guideSeen = true; Object.assign(d.state.world, { at: c, x, y }); localStorage.setItem(k, JSON.stringify(d)); }, [c, x, y]);
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
  if (await p.locator('[data-testid=enter]').count()) await p.click('[data-testid=enter]');
  await p.waitForTimeout(400);
  const has = await p.locator('[data-testid=walk-city]').count();
  if (c === 'damascus') await p.screenshot({ path: `/home/claude/shots/cw-${c}-town.png` });
  await p.click('[data-testid=walk-city]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/home/claude/shots/cw-${c}.png` });
  const mk = p.locator('[data-testid=vpoi-souq], [data-testid=vpoi-hamidiyya], [data-testid=vpoi-bazaar]').first();
  await mk.click(); await p.waitForTimeout(4500);
  const tab = await p.locator('[role=tab][aria-selected=true]').textContent().catch(() => '?');
  console.log(c, 'walk button', has, 'after market walk tab =', tab);
}
console.log('errors', errors);
await b.close();
