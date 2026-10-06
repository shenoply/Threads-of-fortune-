import { chromium } from 'playwright';
const S = '/tmp/w/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); const s=d.state; s.tutorial={done:true,step:'done',inspected:true}; s.missionNews=undefined; s.levelUps=[]; s.titleNews=[];
  Object.assign(s.world, { at: 'cairo', hour: 9, x: 214.3, y: 413.7 }); s.world.party.troops = { guard: 3, fellah: 2, bedouin: 1 }; s.world.party.animals = { falahi: 2, arabian: 1 }; s.world.party.food = 20; s.cash = 3000;
  s.world.known = [...new Set([...s.world.known, 'suez'])]; const rb = s.world.parties.find((q) => q.id === 'rb0'); Object.assign(rb, { x: s.world.x + 4, y: s.world.y + 3, speed: 0, cooldownUntil: 0, size: 5, strength: 10 }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters','1'); });
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]').catch(()=>{}); await p.waitForTimeout(500);
for (const el of await p.locator('[data-testid=party-raiders]').all()) { await el.dispatchEvent('pointerup'); if (await p.locator('[data-testid=road-encounter]').count()) break; }
await p.waitForSelector('[data-testid=road-encounter]', { timeout: 5000 });
await p.waitForTimeout(500); await p.screenshot({ path: S + 'f-1-standoff.png' });
await p.click('[data-testid=amb-fight]');
await p.waitForSelector('[data-testid=tactical-battle]', { timeout: 5000 });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'f-2-tactical.png' });
// scouts saw them first: place the squads, then begin
if (await p.locator('[data-testid=tac-begin]').count()) { console.log('deploy odds:', await p.textContent('[data-testid=tac-odds]').catch(() => null)); await p.click('[data-testid=tac-begin]'); }
// play a turn by hand: pick a rifle squad, move it, end the turn
const first = await p.locator('.tk.s-me.k-rifle').first();
if (await first.count()) { await first.click(); const go = p.locator('.tc.go'); if (await go.count()) await go.first().click(); }
await p.click('[data-testid=tac-endturn]').catch(() => {});
await p.waitForTimeout(9000);
// then let the men fight it out
await p.click('[data-testid=tac-auto]').catch(() => {}); await p.click('[data-testid=auto-steady]').catch(() => {});
await p.waitForSelector('[data-testid=tac-result]', { timeout: 90000 }); await p.screenshot({ path: S + 'f-3-over.png' });
console.log('battle:', await p.textContent('.tac-end h3'));
await p.click('[data-testid=tac-continue]');
await p.waitForSelector('[data-testid=encounter-result]', { timeout: 10000 }); await p.screenshot({ path: S + 'f-6-result.png' });
console.log('result:', await p.textContent('[data-testid=encounter-result]'));
console.log('errors', errs);
await b.close();
