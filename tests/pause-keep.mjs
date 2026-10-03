// A pause on the road stays a pause after looking at another screen and coming back.
//   PORT=5173 node tests/pause-keep.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const hour = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.world.hour);
let ok = false;
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 7.3 }); s.cash = 0; s.queue = []; s.visitIdx = 0; s.arrivals = [];`);
  await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  await p.click('[data-testid=idle-auctions]'); await p.waitForSelector('[data-testid=auction-board]');
  const target = await p.evaluate(() => [...document.querySelectorAll('.board-row')].find((r) => /on foot/i.test(r.querySelector('.board-go')?.textContent ?? ''))?.getAttribute('data-testid')?.replace('board-row-', ''));
  await p.click(`[data-testid=board-go-${target}]`); await p.waitForTimeout(2500);
  await p.click('[data-testid=speed-0]'); await p.waitForTimeout(600);
  const h0 = await hour();
  await p.click('[data-testid=nav-inventory]'); await p.waitForTimeout(800);
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  if (!(await has('speed-0'))) await p.click('[data-testid=nav-map]');
  await p.waitForTimeout(6000);
  const h1 = await hour();
  const pausedBtn = await p.locator('[data-testid=speed-0].on').count();
  console.log('walking to', target, '| hour', h0, '->', h1, '| pause still lit', pausedBtn);
  ok = Math.abs(h1 - h0) < 0.05 && pausedBtn === 1;
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); }
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
