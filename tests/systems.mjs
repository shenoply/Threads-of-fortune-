import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const load = async (mut) => {
  const d = JSON.parse(JSON.stringify(base)); mut(d.state);
  await p.goto('http://localhost:4173/');
  await p.evaluate((s) => { localStorage.setItem('threads-of-fortune-save', s); localStorage.setItem('tof-intro-seen-v2', '1'); }, JSON.stringify(d));
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(500);
};
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const dismiss = async () => { for (let i = 0; i < 5; i++) { if (await p.locator('[data-testid=tip-ok]').count()) await p.click('[data-testid=tip-ok]'); if (await p.locator('[data-testid=mission-ok]').count()) await p.click('[data-testid=mission-ok]'); } };
// 1. Auctions are covered by tests/auction2.mjs
// 2. Monthly bill: day 22 -> day 23 is April 1st (10 Mar + 22 = 1 Apr)
await load((s) => { s.day = 22; Object.assign(s.world, { at: 'giza', x: 146.9, y: 443.7 }); s.cash = 5000; s.missionNews = undefined; s.dayOver = true; s.visitIdx = 9; });
await dismiss();
if (await p.locator('[data-testid=close-stall]').count()) await p.click('[data-testid=close-stall]');
await p.waitForTimeout(500);
await p.screenshot({ path: '/home/claude/shots/sys-morning-bill.png' });
let st = await S(); console.log('after April 1st cash', st.cash, 'bills', JSON.stringify(st.bills), 'last ledger', JSON.stringify(st.ledger.slice(-2)));
// 3. Rival mission start
await load((s) => { s.missions = { alexandria: 'done', farid: 'done' }; s.missionNews = undefined; s.dayOver = true; s.visitIdx = 9; Object.assign(s.world, { at: 'giza', x: 146.9, y: 443.7 }); });
await dismiss();
if (await p.locator('[data-testid=close-stall]').count()) await p.click('[data-testid=close-stall]');
await p.waitForTimeout(500);
if (await p.locator('[data-testid=open-stall]').count()) await p.click('[data-testid=open-stall]');
await p.waitForTimeout(400);
await p.screenshot({ path: '/home/claude/shots/sys-rival.png' });
st = await S(); console.log('missions', JSON.stringify(st.missions), 'news', st.missionNews);
// 4. Merchant page, Me
await p.click('[data-testid=mission-ok]').catch(() => {});
await p.click('[data-testid=nav-ledger]'); await p.waitForTimeout(400); await dismiss();
await p.screenshot({ path: '/home/claude/shots/sys-merchant.png' });
console.log('errors', errors);
await b.close();
