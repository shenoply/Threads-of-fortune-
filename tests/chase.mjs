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

const holdFor = async (ms) => { const bb = await p.locator('[data-testid=chase-hold]').boundingBox(); if (!bb) return; await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); };
const play = async (tag) => {
  for (let i = 0; i < 40 && !(await p.locator('[data-testid=chase-done]').count()); i++) { await holdFor(900); await p.waitForTimeout(500); if (i === 2) await p.screenshot({ path: S + `ch-${tag}-mid.png` }); }
  await p.waitForSelector('[data-testid=chase-done]', { timeout: 30000 });
  const log = await p.locator('[data-testid=chase-log] li').allTextContents();
  console.log(tag, 'log:', log.join(' | '));
  await p.screenshot({ path: S + `ch-${tag}-end.png` });
  await p.click('[data-testid=chase-done]');
};

{

await p.click('[data-testid=amb-fight]');
  // before the fight: the band, the ground and the men; then three rounds of orders (Clash.tsx)
  await p.waitForSelector('[data-testid=clash-prep]', { timeout: 5000 });
  console.log('odds:', (await p.textContent('[data-testid=clash-odds]')).replace(/\s+/g, ' '));
  await p.screenshot({ path: S + 'f-2-prep.png' });
  await p.click('[data-testid=clash-begin]');
  await p.evaluate(() => { window.__tofBattleSpeed = 6; }); await p.waitForSelector('[data-testid=clash-orders]'); await p.waitForTimeout(1500); await p.screenshot({ path: S + 'f-3-round.png' }); await p.click('[data-testid=grp-all]'); await p.click('[data-testid=ord-charge]');
  await p.waitForSelector('[data-testid=clash-over]', { timeout: 60000 }); await p.screenshot({ path: S + 'f-4-over.png' });
  console.log('battle:', await p.textContent('[data-testid=clash-banner]'));
  await p.click('[data-testid=clash-continue]');
  await p.waitForSelector('[data-testid=encounter-result]', { timeout: 10000 }); await p.screenshot({ path: S + 'f-6-result.png' });
  console.log('result:', await p.textContent('[data-testid=encounter-result]'));
  
  if (await p.locator('[data-testid=amb-pursue]').count()) {
    await p.click('[data-testid=amb-pursue]');
    await p.waitForSelector('[data-testid=chase]', { timeout: 5000 });
    await play('pursue');
    console.log('after pursue:', await p.textContent('[data-testid=encounter-result]'));
  } else console.log('nobody ran (no pursuit offered)');
}
console.log('errors', errs);
if (errs.length) { console.log('FAIL'); process.exitCode = 1; }
await b.close();

