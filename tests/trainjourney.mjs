// A paid train survives a finished stall day and a reload mid-journey, and arrives when the button says.
//   OVER=1 H=16.75 node tests/trainjourney.mjs   (needs the dev server on 5173)
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1363, height: 900 } });
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = () => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('threads-of-fortune-save')).state; return `day ${s.day} ${s.world.hour.toFixed(2)}h at ${s.world.at} cash ${s.cash} dayOver ${s.dayOver}`; });
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
await p.goto('http://localhost:5173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-night-rule', 'march'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.world.hour = ${process.env.H ?? 7}; s.cash = 900; s.world.parties = []; ${process.env.OVER ? 's.dayOver = true;' : ''} localStorage.setItem('tof-skip-chapters', '1');`);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
if (await has('district-world')) { await p.click('[data-testid=district-world]'); await p.waitForTimeout(900); }
await p.locator('[data-testid=place-alexandria]').dispatchEvent('click'); await p.waitForTimeout(600);
console.log('train button:', await p.locator('[data-testid=train]').first().textContent());
await p.locator('[data-testid=train]').first().click(); await p.waitForTimeout(300);
console.log('start:', await st(), '| pace:', await p.locator('[data-testid=pace]').textContent().catch(() => '-'));
await p.waitForTimeout(4000);
await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(1200);
await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(1200);
console.log('after reload mid-journey:', await st(), '| travelling?', await has('pace'), await p.locator('[data-testid=pace]').textContent().catch(() => '-'));
for (let i = 0; i < 400; i++) { const s = await st(); if (s.includes('at alexandria')) break; if (await has('speed-4')) await p.click('[data-testid=speed-4]').catch(() => {}); if (await has('close-stall')) await p.click('[data-testid=close-stall]'); await p.waitForTimeout(500); }
console.log('end:', await st());
await b.close();
