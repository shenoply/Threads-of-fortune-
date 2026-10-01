// The stall's own controls: upgrades are reachable from the stall (with a badge when affordable), any
// customer can be let go without a sale, and a buyer finding nothing at their level always leaves.
//   PORT=5173 SHOTS=/tmp node tests/stallchecks.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
const toStall = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(1200); };
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.world.hour = 8.5; s.cash = 500; s.queue = ['samira']; s.visitIdx = 0; localStorage.setItem('tof-skip-chapters', '1');`);
  await toStall();
  console.log('1. upgrade note:', await p.locator('[data-testid=idle-upgrade-note]').textContent().catch(() => 'none'), '| button:', await p.locator('[data-testid=idle-improve]').textContent());
  await p.click('[data-testid=idle-improve]'); await p.waitForSelector('[data-testid=improve-sheet]');
  await p.screenshot({ path: `${S}/stall-improve.png` });
  await p.click('[data-testid=upgrade-tea]'); await p.waitForTimeout(200);
  console.log('   bought tea:', (await st()).upgrades, '| cash', (await st()).cash, '| badge now', await p.locator('.idle-badge').textContent().catch(() => 'none'));
  await p.click('[data-testid=improve-close]');
  // let a customer go
  await edit(`s.world.hour = 10; s.queue = ['samira', 'yusuf']; s.visitIdx = 0; s.encounter = null;`); await toStall();
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1200);
  console.log('2. let go offered:', await has('let-go'));
  await p.click('[data-testid=let-go]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${S}/stall-letgo.png` });
  await p.waitForSelector('[data-testid=next-visit]', { timeout: 8000 }).catch(() => {});
  console.log('   after letting go: next customer button:', await has('next-visit'), '| samira bad visits', (await st()).relationships.samira?.bad ?? 0);
  // Nabil with only common rugs
  await edit(`s.world.hour = 11; s.reputation = 30; s.queue = ['nabil']; s.visitIdx = 0; s.encounter = null; s.inventory = s.inventory.filter((i) => /fayoum/.test(i.typeId));`); await toStall();
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1500);
  if (await has('nabil-greet')) await p.click('[data-testid=nabil-greet]');
  else { const gb = p.getByText('Greet him'); if (await gb.count()) await gb.click(); }
  await p.waitForTimeout(1500);
  console.log('3. Nabil, nothing fine: next customer shown?', await has('next-visit'), '|', await p.locator('[data-testid=next-visit]').locator('xpath=../..').innerText().then((t) => t.replace(/\n+/g, ' | ').slice(0, 160)).catch(() => ''));
  await p.screenshot({ path: `${S}/stall-nabil.png` });
  // a long gap before the next customer suggests something useful to do in the meantime
  await edit(`s.encounter = null; s.held = null; s.dayOver = false; s.world.hour = 12; s.queue = ['samira', 'yusuf']; s.arrivals = [8, 15.5]; s.visitIdx = 1;`); await toStall();
  console.log('4. while-you-wait:', await has('idle-wait'), '|', (await p.locator('[data-testid=idle-next]').textContent().catch(() => '')).slice(0, 140));
  await p.screenshot({ path: `${S}/stall-wait.png` });
  if (await has('idle-wait-supplier')) { await p.click('[data-testid=idle-wait-supplier]'); await p.waitForTimeout(600); console.log('   supplier opens:', await has('nav-stall'), await p.locator('h1, h2').first().textContent().catch(() => '')); }
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); }
console.log('errors', JSON.stringify(errs));
await b.close();
