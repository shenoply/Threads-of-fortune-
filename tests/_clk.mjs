import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.tipsSeen = ['map', 'town', 'auction', 'levelup', 'rumours', 'rashid', 'stock', 'audience'];
Object.assign(s.world, { at: 'giza', hour: 9 }); s.visitIdx = 0; s.encounter = null; s.dayOver = false; s.arrivals = [15, 16, 17.5];
await p.goto('http://localhost:4173/');
await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'); localStorage.setItem('tof-skip-chapters', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
for (let i = 0; i < 6; i++) { await p.waitForTimeout(1000); console.log(await p.textContent('[data-testid=map-clock]').catch(() => '-'), await p.locator('[data-testid=tip-ok]').count()); }
await b.close();
