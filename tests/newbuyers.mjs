import { chromium } from 'playwright';
import fs from 'node:fs';
// Walks each new buyer to the stall, screenshots the figure, and plays one exchange.
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['salem', 'levy', 'antonios', 'wasif', 'hollister', 'martel', 'rustam', 'shivakiar', 'hassan', 'whitcombe', 'kasparian', 'benakis'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
for (const id of ids) {
  const d = JSON.parse(JSON.stringify(base));
  const s = d.state;
  Object.assign(s.world, { at: 'giza' });
  s.queue = [id]; s.visitIdx = 0; s.encounter = null; s.dayOver = false; s.reputation = 45; if (process.env.SMELLY) s.attire = { owned: ['galabiya'], worn: 'galabiya', clean: 10 };
  s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
  s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'stall', 'present', 'price', 'manner', 'stock', 'merchant'];
  await p.goto('http://localhost:4173/');
  await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
  await p.reload();
  if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
  await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { for (const t of ['tip-ok', 'mission-ok', 'open-stall']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); await p.waitForTimeout(250); }
  await p.waitForTimeout(1200);
  const who = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.encounter?.buyerId);
  const photo = await p.locator('.has-photo').count();
  await p.screenshot({ path: `/home/claude/shots/nb-${process.env.SMELLY ? 's-' : ''}${id}.png` });
  console.log(id, 'encounter', who, 'stall photo', photo);
}
console.log('errors', errors);
await b.close();
