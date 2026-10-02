import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const d = JSON.parse(JSON.stringify(base)); d.state.missionNews = undefined; d.state.levelUps = []; d.state.attire = { owned: ['galabiya'], worn: 'galabiya', clean: 20 }; Object.assign(d.state.world, { at: 'giza' });
await p.goto('http://localhost:4173/'); await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(600); for (const t of ['tip-ok', 'mission-ok']) if (await p.locator(`[data-testid=${t}]`).count()) await p.click(`[data-testid=${t}]`).catch(() => {});
await p.click('[data-testid=nav-supplier]'); await p.waitForTimeout(600); if (await p.locator('[data-testid=tip-ok]').count()) await p.click('[data-testid=tip-ok]');
console.log('first:', await p.textContent('[data-testid=rashid-line]'));
await p.screenshot({ path: '/home/claude/shots/rashid.png' });
for (let i = 0; i < 3; i++) { await p.click('[data-testid=rashid-poke]'); await p.waitForTimeout(200); console.log('poke:', await p.textContent('[data-testid=rashid-line]')); }
await p.locator('[data-testid^=look-]').first().click(); await p.waitForTimeout(500);
console.log('inspector', await p.locator('[data-testid=inspector]').count());
await p.screenshot({ path: '/home/claude/shots/rashid-look.png' });
console.log('errors', errors); await b.close();
