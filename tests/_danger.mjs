import { chromium } from 'playwright';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const d = JSON.parse(JSON.stringify(base)); const s = d.state; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
Object.assign(s.world, { at: 'cairo', hour: 9, x: 214.3, y: 413.7 }); s.world.party.troops = {}; s.world.known = [...new Set([...s.world.known, 'suez', 'sinai'])]; d.version = 11;
await p.goto('http://localhost:4173/');
await p.evaluate((x) => { localStorage.setItem('threads-of-fortune-save', x); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); localStorage.setItem('tof-skip-chapters', '1'); }, JSON.stringify(d));
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(900);
for (const t of ['suez', 'jerusalem']) { await p.locator(`[data-testid=place-${t}]`).dispatchEvent('click'); await p.waitForTimeout(500); console.log(t, await p.textContent('[data-testid=world-report]').catch(() => '-')); await p.click('[data-testid=stop]').catch(() => {}); }
await p.screenshot({ path: '/home/claude/shots/prog-danger.png' });
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')));
console.log('version', st.version, st.state.world.parties.filter((x) => x.kind === 'raiders').map((x) => `${x.id}@${Math.round(x.x)},${Math.round(x.y)} s${x.strength}`).join(' '));
await b.close();
