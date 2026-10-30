// The lessons: hints at the point of use and the Settings switches (components/Tips/Tip.tsx, data/tips.ts).
// A hint is one line above the bottom bar, shown once, the first time its place is reached, after the
// first-sale lesson; it never covers the game (the screen under it still takes taps); a tap or a swipe
// puts it away; "What's this?" opens How to play at its page. Settings: "Skip the lessons" ends the
// opening and stops the hints; "Show the lessons again" brings both back on the first days. Sandbox has
// no hints unless asked for.
//   PORT=5186 node tests/lessons.mjs
import { chromium } from 'playwright';
import { BASE, SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 800 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let ok = true; const check = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (sel) => p.locator(sel).count();
const K = 'threads-of-fortune-save';
const st = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).state, K);
// the game's own store (the URL the page loaded, with Vite's stamp)
const G = (fn) => p.evaluate(async (f) => { const { useGame } = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); return new Function('g', 'set', f)(useGame.getState(), useGame.setState); }, fn);
const waitFor = async (sel, ms = 4000) => { await p.waitForSelector(sel, { timeout: ms }).catch(() => {}); return has(sel); };

await p.goto(BASE);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-films-once', '1'); localStorage.setItem('tof-fullscreen', 'off'); });
await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1500);

// 1. during the first-sale lesson: no hints
check(!(await has('.hint')), 'no hint during the first-sale lesson');

// 2. lesson done: the district hint, once
await G(`set({ tutorial: { done: true, step: 'done', inspected: true }, totalSales: 1, levelUps: [], titleNews: [], missionNews: undefined });`);
await p.click('[data-testid=stall-sheet-close]').catch(() => {});
check(await waitFor('[data-testid=tip-district]'), 'the district hint shows once the lesson is done');
const box = await p.locator('[data-testid=tip-district]').boundingBox();
const nav = await p.locator('nav.nav').boundingBox();
check(!!box && !!nav && box.y + box.height <= nav.y + 1 && box.height < 120, `a short line above the bottom bar (${JSON.stringify(box)})`);
check((await p.locator('[data-testid=tip-district]').evaluate((e) => getComputedStyle(e).fontSize)) >= '14px', 'its text is at least 14px');
const what = await p.locator('[data-testid=tip-what]').boundingBox();
check(!!what && what.height >= 44 && what.width >= 44, `"What's this?" is a full tap target (${what && Math.round(what.width)}x${what && Math.round(what.height)})`);
check(((await st()).tipsSeen ?? []).includes('district'), 'it is marked as told at once');
check(!(await has('[role=dialog] [data-testid^=tip-]')), 'not a dialog');
await p.screenshot({ path: `${SHOTS}/lessons-1-hint.png` });
// "What's this?" opens How to play at the map page
await p.click('[data-testid=tip-what]'); await p.waitForTimeout(500);
const gt = (await p.locator('[data-testid=guide] h2').innerText().catch(() => '')).trim();
check(/map is home/i.test(gt), `"What's this?" opens How to play at its page: "${gt}"`);
check(!(await has('.hint')), 'and the hint is gone');
await p.click('[data-testid=guide-skip]');

// 3. the next hint waits its turn; a swipe puts it away
await p.click('[data-testid=nav-inventory]');
check(await waitFor('[data-testid=tip-stock]'), 'Stock has its own hint');
const sb = await p.locator('[data-testid=tip-stock]').boundingBox();
if (sb) { await p.mouse.move(sb.x + 40, sb.y + sb.height / 2); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(sb.x + 40 + i * 30, sb.y + sb.height / 2); await p.mouse.up(); }
await p.waitForTimeout(500);
check(!(await has('[data-testid=tip-stock]')), 'a swipe puts it away');
// it does not come back
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400); await p.click('[data-testid=nav-inventory]'); await p.waitForTimeout(1500);
check(!(await has('[data-testid=tip-stock]')), 'and it does not come back');
// a tap on it puts it away
await p.click('[data-testid=nav-hero]');
check(await waitFor('[data-testid=tip-me]'), 'Me has its own hint');
await p.click('[data-testid=tip-me] p'); await p.waitForTimeout(300);
check(!(await has('[data-testid=tip-me]')), 'a tap puts it away');

// 4. Settings: skip the lessons
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(400);
check(await has('[data-testid=lessons-skip]') && await has('[data-testid=lessons-show]'), 'Settings has "Skip the lessons" and "Show the lessons again"');
await p.screenshot({ path: `${SHOTS}/lessons-2-settings.png` });
await p.click('[data-testid=lessons-skip]'); await p.waitForTimeout(300);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
if (await has('[data-testid=settings-btn]') && await has('.settings, [data-testid=settings]')) await p.keyboard.press('Escape');
check(!(await has('[data-testid=first-hour]')), 'skipped: the opening line is gone');
await p.click('[data-testid=nav-caravan]'); await p.waitForTimeout(1600);
check(!(await has('[data-testid=tip-caravan]')), 'and no hints');

// 5. show them again (day one): the opening and the hints come back
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
await p.click('[data-testid=settings-btn]'); await p.waitForTimeout(400);
await p.click('[data-testid=lessons-show]'); await p.waitForTimeout(300);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const s5 = await st();
check(!(s5.tipsSeen ?? []).includes('first-hour') && !(s5.tipsSeen ?? []).includes('district'), 'shown again: the opening and the told hints are cleared');
check(await waitFor('[data-testid=first-hour]'), 'the opening line is back on day one');

// 6. Sandbox: no hints unless asked
await G(`set({ playMode: 'sandbox', tipsSeen: [] });`);
await p.click('[data-testid=nav-inventory]'); await p.waitForTimeout(1600);
check(!(await has('.hint')), 'Sandbox: no hints by default');

console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
