import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
for (const [vw, vh, tag] of [[390, 760, 'phone'], [1280, 760, 'wide']]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.tutorial = { done: true, step: 'done', inspected: true }; d.state.guideSeen = true; d.state.world.fog = '1'.repeat(d.state.world.fog.length); localStorage.setItem(k, JSON.stringify(d)); });
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (await p.locator('[data-testid=guide-skip]').count()) await p.locator('[data-testid=guide-skip]').first().click();
  if (await p.locator('[data-testid=district-world]').count()) await p.locator('[data-testid=district-world]').first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/home/claude/shots/pm-${tag}-1.png` });
  for (let i = 0; i < 6; i++) await p.click('button[aria-label="Zoom out"]').catch(() => {});
  await p.waitForTimeout(800);
  await p.screenshot({ path: `/home/claude/shots/pm-${tag}-2.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();
