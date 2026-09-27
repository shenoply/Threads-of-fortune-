// A new player can skip the first-sale lesson, from the lane or mid-sale, and every tab unlocks.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/');
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();
await p.click('[data-testid=play-opening]'); await p.waitForTimeout(1500);
await p.click('[data-testid=skip-opening]'); await p.waitForSelector('[data-testid=dayone]', { timeout: 45000 });
await p.click('[data-testid=begin-day-one]');
await p.waitForTimeout(1200);
const navOff = await p.locator('[data-testid=nav-caravan]').isDisabled();
const btn = await p.locator('[data-testid=skip-lesson-nav]').count();
await p.screenshot({ path: '/home/claude/shots/skip-1.png' });
// mid-sale path
await p.click('[data-testid=stall-wait]').catch(() => {});
await p.waitForSelector('[data-testid=stall]', { timeout: 20000 });
const inSale = await p.locator('[data-testid=skip-lesson]').count();
await p.click('[data-testid=skip-lesson]');
await p.waitForTimeout(500);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const budgetOn = await p.locator('[data-testid=act-ask_budget]').isEnabled().catch(() => 'n/a');
await p.screenshot({ path: '/home/claude/shots/skip-2.png' });
console.log({ navOffBefore: navOff, laneButton: btn, saleButton: inSale, tutorialDone: st.tutorial.done, askBudgetEnabled: budgetOn, errors });
await b.close();
