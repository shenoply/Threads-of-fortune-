// The stall with a big stock: a buyer above your stock's level walks away and "Next customer" really
// moves on (she does not come straight back); every rug can be seen in one list, sorted by what it
// usually sells for, and any of them goes on the table; each rug shows that value, at the stall and in Stock.
//   PORT=5173 SHOTS=/tmp/malek node tests/stall-picker.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import('/src/game/state/store.ts'); return new Function('get', src)(m.useGame.getState); }, fn);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['nabil', 'cohen', 'malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 10 }); s.reputation = 33;
    const types = ['desert-star', 'cairo-garden', 'fayoum-hearth', 'delta-house', 'red-medina', 'village-kilim-canal'];
    for (let k = 0; k < 9; k++) s.inventory.push({ uid: 'x' + k, typeId: types[k % types.length], condition: ['Good', 'Worn', 'Excellent'][k % 3], restored: false, provenance: 'Likely', paid: 100 + k * 20, notes: [] });
    s.queue = ['shivakiar', 'yusuf']; s.arrivals = [10.05, 10.1]; s.visitIdx = 0; s.encounter = null;`);
  await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForTimeout(1500);
  const first = await game(`const e = get().encounter; return e && { who: e.buyerId, outcome: e.outcome, idx: get().visitIdx }`);
  await p.click('[data-testid=next-visit]'); await p.waitForTimeout(1200);
  if (await has('stall-wait')) await p.click('[data-testid=stall-wait]');
  await p.waitForTimeout(1200);
  const second = await game(`const e = get().encounter; return e && { who: e.buyerId, outcome: e.outcome ?? null, idx: get().visitIdx }`);
  console.log('1. walked on arrival:', JSON.stringify(first), '-> Next customer:', JSON.stringify(second));

  // 2. all the rugs, by value
  const n = await game(`return get().inventory.length`);
  console.log('2. tray button:', (await p.locator('[data-testid=change-rugs]').textContent()).trim(), '| rugs', n, '| value on each card', await p.locator('[data-testid=rugcard-value]').count());
  await p.click('[data-testid=change-rugs]'); await p.waitForSelector('[data-testid=rug-picker]');
  const vals = async () => (await p.locator('[data-testid=rug-value]').allTextContents()).map((t) => Math.round(parseFloat(t.replace(/[^\d.]/g, '')) * 100));
  const hi = await vals();
  await p.click('[data-testid=rug-sort-low]'); const lo = await vals();
  console.log('   listed', hi.length, '| high first', hi.every((v, i) => !i || v <= hi[i - 1]), '| low first', lo.every((v, i) => !i || v >= lo[i - 1]), '|', hi.slice(0, 4).join(','), '...');
  await p.screenshot({ path: `${S}/rug-picker.png` });
  const last = await p.locator('[data-testid^=rug-pick-]').last().getAttribute('data-testid');
  await p.click(`[data-testid=${last}]`); await p.waitForTimeout(500);
  const pres = await game(`return get().encounter?.presented`);
  console.log('   picked', last.replace('rug-pick-', ''), '-> on the table', pres, '| front of the counter:', (await p.locator('.rugcard').first().getAttribute('class')).includes('presented'));
  // 3. Stock
  await p.click('[data-testid=nav-inventory]').catch(() => {}); await p.waitForTimeout(600);
  console.log('3. Stock values:', await p.locator('[data-testid=stock-value]').count(), '|', (await p.locator('[data-testid=stock-value]').first().textContent()));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/picker-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
