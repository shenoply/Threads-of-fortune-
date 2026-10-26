import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const S = `${__SHOTS}/`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); const s=d.state; s.tutorial={done:true,step:'done',inspected:true}; s.missionNews=undefined; s.levelUps=[]; s.titleNews=[];
  Object.assign(s.world, { at: 'cairo', hour: 9, x: 214.3, y: 413.7 }); s.world.party.troops = { guard: 3, fellah: 2, bedouin: 1 }; s.world.party.animals = { falahi: 2, arabian: 1 }; s.world.party.food = 20; s.cash = 3000;
  s.world.known = [...new Set([...s.world.known, 'suez'])]; const rb = s.world.parties.find((q) => q.id === 'rb0'); Object.assign(rb, { x: s.world.x + 4, y: s.world.y + 3, speed: 0, cooldownUntil: 0, size: 5, strength: 10 }); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters','1'); });
await p.reload(); if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[data-testid=nav-map]').catch(()=>{}); await p.waitForTimeout(500);
for (const el of await p.locator('[data-testid=party-raiders]').all()) { await el.dispatchEvent('pointerup'); await el.dispatchEvent('pointerup').catch(() => {}); if (await p.locator('[data-testid=road-encounter]').count()) break; }
await p.waitForSelector('[data-testid=road-encounter]', { timeout: 5000 });
await p.waitForTimeout(500); await p.screenshot({ path: S + 'f-1-standoff.png' });
console.log('fight button:', (await p.textContent('[data-testid=amb-fight]')).replace(/\s+/g, ' '));
await p.click('[data-testid=amb-fight]');
// straight onto the field (no screen in between); the moments that turn the fight stop it and ask
await p.waitForSelector('[data-testid=clash-orders]', { timeout: 5000 });
await p.evaluate(() => { window.__tofBattleSpeed = 4; });
const moments = [];
for (let i = 0; i < 400 && !(await p.locator('[data-testid=encounter-result]').count()); i++) {
  if (await p.locator('[data-testid=fight-moment]').count()) {
    const m = await p.getAttribute('[data-testid=fight-moment]', 'data-moment');
    moments.push(m);
    if (moments.length === 1) await p.screenshot({ path: S + 'f-3-moment.png' });
    await p.locator('[data-testid=fight-moment] .fb-choice').first().click();
  }
  if (await p.locator('[data-testid=clash-over]').count() && !moments.includes('over')) { moments.push('over'); await p.screenshot({ path: S + 'f-4-over.png' }); }
  await p.waitForTimeout(150);
}
console.log('moments:', moments.join(', '));
await p.waitForSelector('[data-testid=encounter-result]', { timeout: 15000 }); await p.screenshot({ path: S + 'f-6-result.png' });
console.log('result:', await p.textContent('[data-testid=encounter-result]'));
console.log('errors', errs);
await b.close();
