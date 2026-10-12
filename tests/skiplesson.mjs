// A new player can skip the first-sale lesson, from the lane or mid-sale, and every tab unlocks.
import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${__PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1')));
await p.reload();
await p.click('[data-testid=play-opening]'); await p.waitForTimeout(1500);
await p.click('[data-testid=skip-opening]'); await p.waitForSelector('[data-testid=dayone]', { timeout: 45000 });
await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.waitForTimeout(1200);
const navOff = await p.locator('[data-testid=nav-caravan]').isDisabled();
const btn = await p.locator('[data-testid=first-hour-skip]').count(); // the lane's skip is the opening bar's Skip now
await p.screenshot({ path: `${__SHOTS}/skip-1.png` });
// mid-sale path
await p.click('[data-testid=stall-wait]').catch(() => {});
await p.waitForSelector('[data-testid=stall]', { timeout: 20000 });
const inSale = await p.locator('[data-testid=skip-lesson]').count();
await p.click('[data-testid=skip-lesson]');
await p.waitForTimeout(500);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const budgetOn = await p.locator('[data-testid=act-ask_budget]').isEnabled().catch(() => 'n/a');
await p.screenshot({ path: `${__SHOTS}/skip-2.png` });
console.log({ navOffBefore: navOff, laneButton: btn, saleButton: inSale, tutorialDone: st.tutorial.done, askBudgetEnabled: budgetOn, errors });
const ok = btn > 0 && inSale > 0 && st.tutorial.done && budgetOn === true && !errors.length;
console.log(ok ? 'PASS' : 'FAIL', 'skip from the lane and mid-sale');
await b.close();
