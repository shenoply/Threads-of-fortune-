import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const dismiss = async () => { for (let i = 0; i < 4; i++) for (const t of ['tip-ok', 'mission-ok', 'guide-skip']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); };
async function run(cash, house, tag, bidMode) {
  const d = JSON.parse(JSON.stringify(base)); const s = d.state;
  Object.assign(s.world, { at: 'cairo', x: 214.3, y: 413.7 }); s.day = 15; s.cash = cash; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
  s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours'];
  await p.goto('http://localhost:4173/');
  await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-skip-chapters', '1'); }, JSON.stringify(d));
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(500);
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500); await dismiss();
  if (await p.locator('[data-testid=enter]').count()) await p.click('[data-testid=enter]');
  await p.waitForTimeout(400); await dismiss();
  await p.locator('[data-testid=auction-houses]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `/home/claude/shots/a2-${tag}-town.png` });
  await p.click(`[data-testid=house-${house}]`); await p.waitForTimeout(1200); await dismiss();
  await p.screenshot({ path: `/home/claude/shots/a2-${tag}-venue.png` });
  await p.click('[data-testid=vpoi-floor]'); await p.waitForTimeout(4500); await dismiss();
  await p.screenshot({ path: `/home/claude/shots/a2-${tag}-cat.png` });
  await p.click('[data-testid=auction-sit]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `/home/claude/shots/a2-${tag}-floor.png` });
  let lotsDone = 0;
  for (let k = 0; k < 20 && !(await p.locator('[data-testid=auction-recap]').count()); k++) {
    for (let i = 0; i < 90 && !(await p.locator("[data-testid=bid-result]").count()); i++) {
      const canRaise = await p.locator('[data-testid=bid-raise]:not([disabled])').count();
      if (bidMode && canRaise && k === 0) await p.click('[data-testid=bid-raise]');
      else if (await p.locator('[data-testid=bid-hold]:not([disabled])').count()) await p.click('[data-testid=bid-hold]');
      await p.waitForTimeout(700);
      if (k === 0 && i === 2) await p.screenshot({ path: `/home/claude/shots/a2-${tag}-bidding.png` });
    }
    console.log(tag, 'lot', k + 1, ':', await p.textContent('[data-testid=bid-result]'));
    if (k === 0) await p.screenshot({ path: `/home/claude/shots/a2-${tag}-result.png` });
    lotsDone++;
    await p.click('[data-testid=next-lot]'); await p.waitForTimeout(300);
    if (k === 1 && !bidMode) break;
  }
  if (await p.locator('[data-testid=auction-recap]').count()) await p.screenshot({ path: `/home/claude/shots/a2-${tag}-recap.png` });
  const st = await S();
  console.log(tag, 'cash', st.cash, 'intel', Object.keys(st.intel ?? {}).length, 'won', st.stats?.auctionsWon, 'reoffers', (st.reoffers ?? []).length);
}
await run(120, 'cairo-garden-city', 'poor', false);
await run(20000, 'cairo-khan', 'rich', true);
console.log('errors', errors);
await b.close();
