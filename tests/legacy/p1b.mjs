import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const dismiss = async () => { for (let i = 0; i < 4; i++) for (const t of ['tip-ok', 'mission-ok', 'guide-skip']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {}); };
const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'rashid', 'stock', 'audience'];
Object.assign(s.world, { at: 'giza', hour: 9, x: 146.9, y: 443.7 }); s.visitIdx = 0; s.encounter = null; s.dayOver = false; s.arrivals = [9.9, 16, 17.5]; s.queue = s.queue.slice(0, 3);
s.onboard = { news: true, radio: true }; s.buyersSeen = ['samira', 'yusuf', 'mariam']; s.ledger = [...s.ledger, { label: 'Bought X from Rashid' }];
await p.goto('http://localhost:4173/');
await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(1200); await dismiss();
const shot = (n) => p.screenshot({ path: `/home/claude/shots/p1b-${n}.png` });
await shot('start');
// open the stall by zooming in over it
await p.click('[data-testid=poi-stall]'); await p.waitForTimeout(2500); await shot('sheet');
await p.waitForTimeout(4000);
console.log('encounter screen?', await p.locator('[data-testid=buyer-plate]').count());
await shot('sale');
// zoom out: world with chapter
await b.close();
console.log('errors', errors);
