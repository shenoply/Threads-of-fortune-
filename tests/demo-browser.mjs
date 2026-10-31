// The Steam demo in the browser: the title's demo mark, a new game marked demo, a closed town's
// "in the full game" card, Sandbox shut, and the closing card after day ten (on a phone and at 1920x1080).
//   npx vite --mode demo --port 5196 ;  PORT=5196 node --import ./tests/_nohmr.mjs tests/demo-browser.mjs
// (on a server without demo mode it turns demo mode on through the address: ?demo=1)
import { chromium } from 'playwright';
import { PORT, SHOTS, visibleIds } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 800 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const has = (id) => p.locator(`[data-testid=${id}]`).count();
const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
try {
  await p.goto(`http://localhost:${PORT}/?demo=1`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tof-demo', '1'); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-films-once', '1'); });
  await p.reload(); await p.waitForSelector('[data-testid=title]');
  ok(await has('demo-badge'), 'the title says Demo');
  ok(!(await has('open-sandbox')) && (await has('open-sandbox-later')), 'Sandbox: in the full game');
  await p.screenshot({ path: `${SHOTS}/demo-title.png` });
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 15000 });
  ok((await save()).demo === true, 'the save is marked demo');
  // the opening behind us: Rashid's errand done
  await p.evaluate(() => { const t = window.tof; const s = t.state(); t.set({ tutorial: { ...s.tutorial, done: true, step: 'done' }, missions: { alexandria: 'done' }, missionNews: undefined, encounter: null }); });
  await p.waitForTimeout(500);
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(600);
  if (await has('district-world')) { await p.click('[data-testid=stall-sheet-close]').catch(() => {}); await p.click('[data-testid=district-world]').catch(() => {}); await p.waitForTimeout(1200); }
  await p.screenshot({ path: `${SHOTS}/demo-map.png` });
  if (!(await has('lock-damascus'))) console.log('  on screen:', await visibleIds(p));
  ok(await has('lock-damascus'), 'Damascus wears a lock on the map');
  ok(!(await has('lock-alexandria')) && !(await has('lock-cairo')), 'Cairo and Alexandria open');
  await p.locator('[data-testid=place-damascus]').dispatchEvent('click'); await p.waitForTimeout(500);
  const lock = await p.locator('[data-testid=lock-card]').textContent().catch(() => '');
  ok(/in the full game/i.test(lock) && !/skip the opening/i.test(lock), `lock card: "${lock.slice(0, 110)}"`);
  await p.screenshot({ path: `${SHOTS}/demo-lock.png` });
  // ten days on
  await p.evaluate(() => window.tof.skip(10));
  await p.waitForTimeout(800);
  for (const id of ['day-summary-ok', 'mission-ok', 'big-news-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {});
  await p.waitForSelector('[data-testid=demo-end]', { timeout: 8000 }).catch(() => {});
  ok(await has('demo-end'), `day ${(await save()).day}: the closing card`);
  const href = await p.locator('[data-testid=demo-wishlist]').getAttribute('href').catch(() => '');
  ok(/store\.steampowered\.com/.test(href ?? ''), `Wishlist on Steam -> ${href}`);
  console.log('  ' + (await p.locator('[data-testid=demo-done]').innerText().catch(() => '')).replace(/\n/g, '\n  '));
  await p.screenshot({ path: `${SHOTS}/demo-end-phone.png` });
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${SHOTS}/demo-end-wide.png` });
  await p.click('[data-testid=demo-aside]'); await p.waitForTimeout(300);
  ok(!(await has('demo-end')), 'set aside until the next morning');
} catch (e) { console.log('FAIL', e.message); fails++; }
ok(!errs.length, `no page errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
await b.close();
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
