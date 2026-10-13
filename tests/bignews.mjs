// Big news is told once in the morning even if the player never opens the paper: the card names the
// event and what it means for trade, offers the paper, and does not come back once noted. The calendar
// is marked in the top bar.
//   PORT=5173 node tests/bignews.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync(SHOTS, { recursive: true });
const K = 'threads-of-fortune-save';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(BASE);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'), localStorage.setItem('tof-news', '1')));
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
check((await p.locator('[data-testid=map-clock] svg').count()) > 0, 'the clock carries a calendar mark');
await p.click('[data-testid=hud-calendar]'); await p.waitForTimeout(500);
check((await p.locator('[data-testid=calendar]').count()) > 0, 'tapping it opens the calendar');
// the morning the new Parliament's arrival begins (18 March 1925 = day 9)
const save = await p.evaluate((k) => localStorage.getItem(k), K);
await p.goto('about:blank');
await p.goto(BASE);
await p.evaluate(([k, raw]) => { const d = JSON.parse(raw); Object.assign(d.state, { day: 9, tutorial: { done: true, step: 'done', inspected: true }, tipsSeen: [...(d.state.tipsSeen || []), 'first-hour'], newsSeen: [], lastSummary: undefined, missionNews: undefined }); localStorage.setItem(k, JSON.stringify(d)); }, [K, save]);
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(2000);
const card = p.locator('[data-testid=big-news]');
check((await card.count()) > 0, 'the news card shows that morning');
const txt = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
check(/Parliament/.test(txt) && /For your trade/.test(txt), `it names the event and what it means: "${txt.slice(0, 120)}"`);
await p.screenshot({ path: `${SHOTS}/bignews.png` });
await p.click('[data-testid=big-news-ok]'); await p.waitForTimeout(500);
check((await card.count()) === 0, 'Noted puts it away');
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(1500);
check((await card.count()) === 0, 'and it does not come back');
console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
