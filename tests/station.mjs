// Arriving in a city shows its main places, with the rest behind "More in …"; the station opens a
// departures board (towns, times, fares) and a ticket sets off by train at once. The street walk's
// station opens the same board.
//   PORT=5173 node tests/station.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync(SHOTS, { recursive: true });
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
const raw = await p.evaluate((k) => localStorage.getItem(k), K);
await p.goto('about:blank'); await p.goto(BASE);
await p.evaluate(([k, r]) => { const d = JSON.parse(r); Object.assign(d.state, { tutorial: { done: true, step: 'done', inspected: true }, cash: 5000, journey: undefined }); Object.assign(d.state.world, { at: 'cairo', x: 214.3, y: 413.7, hour: 10 }); d.state.guideSeen = true; localStorage.setItem(k, JSON.stringify(d)); }, [K, raw]);
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(800);
if (await p.locator('[data-testid=guide-skip]').count()) await p.click('[data-testid=guide-skip]');
if (await p.locator('[data-testid=enter]').count()) await p.click('[data-testid=enter]');
await p.waitForTimeout(600);
if (!(await p.locator('[data-testid=town-menu]').count()) && (await p.locator('[data-testid=town-menu-open]').count())) await p.click('[data-testid=town-menu-open]');
await p.waitForSelector('[data-testid=town-menu]', { timeout: 20000 });
const tiles = await p.locator('[data-testid=town-menu] .tm-item').count();
check(tiles <= 10, `Cairo's menu starts short (${tiles} buttons)`);
check((await p.locator('[data-testid=menu-more]').count()) > 0, 'with a More in Cairo button');
await p.screenshot({ path: `${SHOTS}/station-menu.png` });
await p.click('[data-testid=menu-station]'); await p.waitForTimeout(500);
check((await p.locator('[data-testid=station-board]').count()) > 0, 'the station opens its departures board');
const alex = (await p.locator('[data-testid=dep-alexandria]').innerText().catch(() => '')).replace(/\s+/g, ' ');
check(/Alexandria/.test(alex) && /h/.test(alex) && /£/.test(alex), `Alexandria with time and fare: "${alex}"`);
await p.screenshot({ path: `${SHOTS}/station-board.png` });
const cash0 = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state.cash, K);
await p.click('[data-testid=ticket-alexandria]'); await p.waitForTimeout(3000);
const s = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);
check(s.cash < cash0, `the ticket is paid (${cash0} → ${s.cash})`);
check((await p.locator('[data-testid=station-board]').count()) === 0 && (await p.locator('[data-testid=town-menu]').count()) === 0, 'and the train leaves: board and town closed');
console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
