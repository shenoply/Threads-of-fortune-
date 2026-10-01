import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const dismiss = async () => { for (let i = 0; i < 4; i++) for (const t of ['tip-ok', 'mission-ok', 'guide-skip']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); };
const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'rashid', 'stock', 'audience'];
Object.assign(s.world, { at: 'giza', hour: 9, x: 146.9, y: 443.7 }); s.visitIdx = 0; s.encounter = null; s.dayOver = false; s.arrivals = [19, 19.5, 19.8]; s.queue = s.queue.slice(0, 3);
await p.goto('http://localhost:4173/');
await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); localStorage.setItem('tof-skip-chapters', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(1200); await dismiss();
const L = () => p.getAttribute('[data-testid=campaign]', 'data-layer');
const shot = (n) => p.screenshot({ path: `/home/claude/shots/p1c-${n}.png` });
for (let i = 0; i < 6; i++) { await p.click('button[aria-label="Zoom out"]'); await p.waitForTimeout(120); }
await p.waitForTimeout(200); await shot('mid-out');
await p.waitForTimeout(600); console.log('after out', await L()); await shot('world-near');
for (let i = 0; i < 3; i++) { await p.click('button[aria-label="Zoom out"]'); await p.waitForTimeout(150); }
await p.click('[data-testid=clock-2]'); await p.waitForTimeout(1500); await shot('world-far');
await p.click('[data-testid=clock-0]');
for (let i = 0; i < 8; i++) { await p.click('[data-testid=world-zoom-in]').catch(() => {}); await p.waitForTimeout(150); }
await p.waitForTimeout(700); console.log('after in', await L()); await shot('back-in');
for (let i = 0; i < 6; i++) { await p.click('[data-testid=district-zoom-in]').catch(() => {}); await p.waitForTimeout(150); }
await p.waitForTimeout(700); console.log('sheet', await p.locator('[data-testid=stall-sheet]').count());
console.log('errors', errors);
await b.close();
