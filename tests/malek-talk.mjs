// Talking to Malek: a conversation where he speaks (his own recordings) and you answer, his picture
// moving on every few turns; the stall shows Wait first and Auctions under it; the auction board says
// which sales you can still reach in time.
//   PORT=5173 SHOTS=/tmp/talk node tests/malek-talk.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/talk';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const heard = []; p.on('response', (r) => { if (/audio\/malek\/|voices\/malek/.test(r.url())) heard.push(r.url().split('/').pop()); });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 7.3 }); s.cash = 300; s.queue = []; s.visitIdx = 0; s.arrivals = [8.5, 10.5, 15.5, 17.5, 19];
    s.malek = { stockDay: s.day, sold: {}, visits: 1, firstDay: 1, lastVisitDay: s.day, orders: [], said: [], story: { nextStage: 6, lastStoryDay: 1, completed: [1,2,3,4,5] } };`);
  await reload();
  // 1. the stall: Wait first, Auctions right under it
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  const order = await p.evaluate(() => [...document.querySelectorAll('[data-testid=stall-idle] [data-testid]')].map((e) => e.getAttribute('data-testid')).filter((t) => /stall-wait|idle-auctions|idle-wait-|stall-close-early/.test(t)));
  console.log('1. stall order:', order.join(' > '));
  await p.screenshot({ path: `${S}/stall.png` });
  // 2. the auction board
  await p.click('[data-testid=idle-auctions]'); await p.waitForSelector('[data-testid=auction-board]');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.board-row')].map((r) => `${r.querySelector('b').textContent} | ${r.querySelector('em').textContent} | ${r.querySelector('.board-reach').textContent} | in time ${r.getAttribute('data-in-time')}`));
  console.log('2. board:\n   ' + rows.join('\n   '));
  await p.screenshot({ path: `${S}/board.png` });
  await p.click('[data-testid=board-close]');
  // 3. Malek: a conversation
  await edit(`s.world.hour = 12.5;`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-shop]', { timeout: 20000 });
  if (await has('malek-enter')) await p.click('[data-testid=malek-enter]');
  await p.waitForSelector('[data-testid=malek-room]');
  const scene0 = await p.locator('[data-testid=malek-room]').getAttribute('data-scene');
  await p.click('[data-testid=malek-talk]'); await p.waitForTimeout(400);
  const turns = [];
  for (let i = 0; i < 7; i++) {
    const said = (await has('malek-arabic')) ? `AR ${await p.locator('[data-testid=malek-arabic]').getAttribute('data-phrase')}` : (await has('malek-speech')) ? `EN ${(await p.locator('[data-testid=malek-speech]').textContent()).replace(/^MALEK\s*/, '').slice(0, 50)}` : '(nothing)';
    const replies = await p.locator('[data-testid=malek-reply]').allTextContents();
    if (!replies.length) { turns.push(`Malek: ${said} | (end)`); break; }
    const pick = replies[i % replies.length];
    turns.push(`Malek: ${said} | you: ${pick}`);
    if (i === 1) await p.screenshot({ path: `${S}/talk.png` });
    await p.locator('[data-testid=malek-reply]', { hasText: pick }).first().click(); await p.waitForTimeout(500);
    if (!(await has('malek-chat'))) { turns.push('(talk closed: ' + ((await has('malek-menubook')) || (await has('malek-menu')) ? 'menu open' : 'panel closed') + ')'); break; }
  }
  const scene1 = await p.locator('[data-testid=malek-room]').getAttribute('data-scene');
  console.log('3. talk:\n   ' + turns.join('\n   '));
  console.log('   picture:', scene0, '->', scene1, '| clips:', [...new Set(heard)].join(', '));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
