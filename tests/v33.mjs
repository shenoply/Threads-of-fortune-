import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const dismiss = async () => { for (let i = 0; i < 4; i++) for (const t of ['tip-ok', 'mission-ok', 'guide-skip']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); };
const load = async (mut) => {
  const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'rashid', 'stock', 'audience'];
  mut(s);
  await p.goto('http://localhost:4173/');
  await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(700); await dismiss();
};
const shot = (n) => p.screenshot({ path: `/home/claude/shots/v33-${n}.png` });
// idle hub with the tour
await load((s) => { Object.assign(s.world, { at: 'giza', hour: 9 }); s.onboard = {}; s.encounter = null; s.dayOver = false; s.visitIdx = 1; });
await shot('idle-tour');
await p.click('[data-testid=tour-buyers]'); await p.waitForTimeout(500); await dismiss(); await shot('buyers');
await p.click('[data-testid^=cust-] >> nth=0'); await p.waitForTimeout(400); await shot('buyer-card');
await p.click('[data-testid=buyer-next]'); await p.waitForTimeout(300); await shot('buyer-card2');
await p.click('[data-testid=buyer-card-close]');
await p.click('[data-testid=nav-supplier]'); await p.waitForTimeout(500); await dismiss(); await shot('rashid');
await p.locator('[data-testid=family-debt]').scrollIntoViewIfNeeded(); await shot('rashid-debt');
const c0 = await p.getAttribute('[data-testid=hud-cash]', 'data-pt');
await p.click('[data-testid=pay-family]').catch((e) => console.log('pay fail', e.message)); await p.waitForTimeout(300);
console.log('cash', c0, '→', await p.getAttribute('[data-testid=hud-cash]', 'data-pt'), 'debt text', (await p.textContent('[data-testid=family-debt]')).slice(0, 80));
console.log('qty labels', await p.locator('[data-testid=offer-qty]').allTextContents());
// idle hub with everything done
await load((s) => { Object.assign(s.world, { at: 'giza', hour: 9 }); s.onboard = { news: true, radio: true, map: true, buyers: true, rashid: true }; s.visitIdx = 1; });
await shot('idle');
await p.click('[data-testid=idle-auctions]'); await p.waitForTimeout(400); await shot('board');
await p.click('[data-testid=board-close]');
await p.click('[data-testid=idle-animals]'); await p.waitForTimeout(900); await dismiss(); await shot('animals');
// auction venue doors and the floor
await load((s) => { Object.assign(s.world, { at: 'cairo', x: 214.3, y: 413.7 }); s.day = 15; s.cash = 50000; });
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500); await dismiss();
if (await p.locator('[data-testid=enter]').count()) await p.click('[data-testid=enter]');
await p.waitForTimeout(400); await dismiss();
await p.locator('[data-testid=auction-houses]').scrollIntoViewIfNeeded(); await shot('houses');
const house = await p.locator('[data-testid^=house-]').first().getAttribute('data-testid');
await p.click(`[data-testid=${house}]`); await p.waitForTimeout(1200); await dismiss(); await shot('venue');
await p.click('[data-testid=venue-enter-floor]'); await p.waitForTimeout(1500); await dismiss(); await shot('cat');
if (await p.locator('[data-testid=auction-sit]').count()) {
  await p.click('[data-testid=auction-sit]'); await p.waitForTimeout(800); await shot('floor');
  const calls = [];
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(1200); calls.push(await p.textContent("[data-testid=floor-call]") + " | " + await p.textContent(".floor-who")); }
  console.log(calls.join('\n')); await shot('floor2');
}
console.log('errors', errors);
await b.close();
