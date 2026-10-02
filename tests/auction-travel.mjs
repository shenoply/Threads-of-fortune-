// The auction board: each sale says the quickest way there; Travel there sets off at once by it.
//   PORT=5173 SHOTS=/tmp/at node tests/auction-travel.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/at';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 7.3 }); s.cash = 3000; s.queue = []; s.visitIdx = 0; s.arrivals = [9.5, 10.5, 15.5, 17.5, 19];`);
  await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  await p.click('[data-testid=idle-auctions]'); await p.waitForSelector('[data-testid=auction-board]');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.board-row')].map((r) => `${r.querySelector('b').textContent} | ${r.querySelector('.board-reach').textContent} | ${r.querySelector('.board-go')?.textContent ?? '-'}`));
  console.log('board:\n  ' + rows.join('\n  '));
  await p.screenshot({ path: `${S}/board.png` });
  // pick a sale that is a train ride away
  const target = await p.evaluate(() => [...document.querySelectorAll('.board-row')].find((r) => /train/.test(r.querySelector('.board-go')?.textContent ?? ''))?.getAttribute('data-testid')?.replace('board-row-', ''));
  console.log('travelling to', target);
  const cash0 = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.cash);
  await p.click(`[data-testid=board-go-${target}]`); await p.waitForTimeout(2500);
  const report = await p.evaluate(() => document.body.innerText.match(/By rail:[^\n]*/)?.[0] ?? '');
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
  console.log('on the map:', await has('campaign'), '| report:', report, '| fare paid:', cash0 - st.cash);
  await p.screenshot({ path: `${S}/travelling.png` });
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
