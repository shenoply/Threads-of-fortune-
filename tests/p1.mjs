import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const dismiss = async () => { for (let i = 0; i < 4; i++) for (const t of ['tip-ok', 'mission-ok', 'guide-skip']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); };
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'rashid', 'stock', 'audience'];
Object.assign(s.world, { at: 'giza', hour: 9, x: 146.9, y: 443.7 }); s.visitIdx = 0; s.encounter = null; s.dayOver = false; s.arrivals = [15, 16, 17.5]; s.queue = s.queue.slice(0, 3);
await p.goto('http://localhost:4173/');
await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-skip-chapters', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(1500); await dismiss();
const shot = (n) => p.screenshot({ path: `/home/claude/shots/p1-${n}.png` });
console.log('layer', await p.getAttribute('[data-testid=campaign]', 'data-layer'), 'clock', await p.textContent('[data-testid=map-clock]'));
await shot('district');
await p.waitForTimeout(3000);
console.log('clock after 3s', await p.textContent('[data-testid=map-clock]'), 'arrival', (await S()).arrivals);
// zoom out to the world
for (let i = 0; i < 6; i++) { await p.click('button[aria-label="Zoom out"]').catch(() => {}); await p.waitForTimeout(150); }
await p.waitForTimeout(700);
console.log('layer', await p.getAttribute('[data-testid=campaign]', 'data-layer'));
await shot('world');
await p.click('[data-testid=clock-4]'); await p.waitForTimeout(1200);
await shot('world2');
console.log('after 4x: campaign?', await p.locator('[data-testid=campaign]').count(), 'hour', (await S()).world.hour, 'enc', !!(await S()).encounter);
console.log('errors', errors.slice(0, 5));
await b.close();
