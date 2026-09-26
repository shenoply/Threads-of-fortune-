import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
for (const day of process.argv.slice(2).map(Number)) {
  const d = JSON.parse(JSON.stringify(base)); d.state.day = day; d.state.missionNews = undefined; d.state.levelUps = []; d.state.titleNews = [];
  await p.goto('http://localhost:4173/');
  await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'); }, JSON.stringify(d));
  await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(600);
  for (const t of ['tip-ok', 'mission-ok']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {});
  await p.screenshot({ path: `/home/claude/shots/hud-${day}.png` });
  await p.click('[data-testid=paper-btn]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `/home/claude/shots/paper-${day}.png` });
  await p.locator('[data-testid=paper-coming]').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: `/home/claude/shots/paper-${day}b.png` });
  console.log(day, (await p.textContent('[data-testid=paper-lead] h2')));
  await p.click('[data-testid=newspaper-close]');
}
console.log('errors', errors);
await b.close();
