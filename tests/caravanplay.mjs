import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, tapPlace, fromTownMenu } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
// skip the opening (it locks every town but Giza and Cairo); the souk, animal market and guards are already found in the district
await p.evaluate(() => { localStorage.setItem('tof-skip-chapters', '1'); const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.cash=600; d.state.world.known.push('suez','sinai');
  d.state.world.district = { x: 760, y: 468, fog: '', seen: ['stall', 'coffee', 'souk', 'animals', 'guards'] }; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(300);
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const has = async (s) => (await p.locator(s).count()) > 0;
let n=0; const shot=(t)=>p.screenshot({path:`${__SHOTS}/c-${String(++n).padStart(2,'0')}-${t}.png`});
const toWorld = async () => { if (!(await has('[data-testid=world-map]'))) { if (!(await has('[data-testid=district-world]'))) await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400); if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]'); await p.waitForTimeout(300); } };
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400); await toWorld(); await shot('map');
// zoom in on Giza for the bird's-eye view; zooming in past the closest view over Giza drops into the district
let pin = false;
for (let i=0;i<3 && (await has('[data-testid=world-zoom-in]'));i++) { pin ||= await has('[data-testid=overhead-pin]'); await p.click('[data-testid=world-zoom-in]'); await p.waitForTimeout(200); }
await p.waitForTimeout(600); await shot('zoom-giza');
const dropped = await has('[data-testid=district]');
console.log('overhead pin', pin || (await has('[data-testid=overhead-pin]')), '| zoomed into the district:', dropped);
if (dropped) console.log('  (as intended: zooming in over Giza walks down into the district)');
// Giza's market: the souk in the district
if (!dropped) { await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400); }
await p.click('[data-testid=poi-souk]'); await p.waitForSelector('[data-testid=buy-food-days]', { timeout: 15000 }); await shot('giza-panel');
await p.click('[data-testid=buy-food-days]'); await p.click('[data-testid=buy-falahi]', { timeout: 3000 }).catch(()=>{});
console.log('note', await p.locator('[data-testid=supply-note]').textContent({ timeout: 1000 }).catch(()=>'-'));
if (await has('[data-testid=hire-fellah]')) await p.click('[data-testid=hire-fellah]');
await p.locator('[data-testid=town-supplies]').scrollIntoViewIfNeeded().catch(() => {}); await shot('supplies');
let st=await S(); console.log('party', JSON.stringify(st.world.party));
await p.click('[data-testid=leave-settlement]').catch(() => {});
// go to Cairo on foot, and check a double tap on the map stops the caravan
await toWorld();
if (await has('[data-testid=night-camp]')) await p.click('[data-testid=night-camp]').catch(() => {}); // camp every night without asking
await tapPlace(p, 'cairo'); await p.waitForTimeout(400);
if (await has('[data-testid=travel]')) await p.click('[data-testid=travel]'); // (some taps set off at once)
await p.waitForTimeout(700);
{ // a tap mid-journey no longer stops the caravan (the old double tap); it asks before turning. Stop is a button.
  const box = await p.locator('[data-testid=world-map]').boundingBox();
  const before = await p.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid));
  await p.mouse.click(box.x+60, box.y+box.height-60); await p.waitForTimeout(400);
  const after = await p.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid));
  console.log('tap mid-journey shows:', [...new Set(after.filter((t) => !before.includes(t)))].join(' ') || '(nothing new)');
  for (const t of ['reroute-no', 'turn-no', 'keep-going']) if (await has(`[data-testid=${t}]`)) await p.click(`[data-testid=${t}]`).catch(() => {});
  if ((await has('[data-testid=stop]')) && (await p.locator('[data-testid=stop]').isEnabled())) {
    await p.click('[data-testid=stop]'); await p.waitForTimeout(400);
    const x1 = (await S()).world.x; await p.waitForTimeout(800); const x2 = (await S()).world.x;
    console.log('Stop button stops the caravan:', x1 === x2, '|', await p.locator('[data-testid=world-report]').textContent({ timeout: 1000 }).catch(()=>''));
    if (x1 !== x2) console.log('FAIL the caravan kept moving after Stop');
  } else console.log('  (Stop not available on this leg, e.g. aboard the Nile ferry)');
}
const loop = async (id) => { for (let i=0;i<500;i++){ const z = await S(); if (z.world.at === id && !z.journey && (await has('[data-testid=settlement]'))) return true;
  if (await has('[data-testid=road-encounter]')) { const h=await p.locator('[data-testid=road-encounter] h2, [data-testid=road-encounter] h3').first().textContent({ timeout: 1500 }).catch(() => ''); await shot('enc'); const o = (await has('[data-testid=enc-fight]')) ? '[data-testid=enc-fight]' : (await has('[data-testid=enc-hire]')) ? '[data-testid=enc-hire]' : '[data-testid=road-encounter] .btn >> nth=0'; await p.click(o); console.log(' ENC', h, '->', await p.locator('[data-testid=encounter-result]').textContent({ timeout: 2000 }).catch(() => '')); await p.click('[data-testid=encounter-continue]').catch(() => {}); }
  await p.waitForTimeout(150);} console.log(`  (did not reach ${id})`); return false; };
// on to Cairo, by train if there is one (walking is several days now)
if ((await S()).world.at !== 'cairo') { await tapPlace(p, 'cairo'); await p.waitForTimeout(400); if (await has('[data-testid=train]')) await p.click('[data-testid=train]'); else if (await has('[data-testid=travel]')) await p.click('[data-testid=travel]'); }
await loop('cairo');
await fromTownMenu(p, 'guards');
await p.click('[data-testid=hire-guard]', { timeout: 5000 }).catch(()=>console.log('no guards today'));
await p.click('[data-testid=hire-guard]', { timeout: 3000 }).catch(()=>{});
await p.click('[data-testid=buy-baladi_h]', { timeout: 3000 }).catch(()=>{});
await p.click('[data-testid=buy-food-days]', { timeout: 3000 }).catch(()=>{});
st=await S(); console.log('in cairo party', JSON.stringify(st.world.party), 'cash', st.cash);
await fromTownMenu(p, 'leave'); await p.click('[data-testid=leave-settlement]', { timeout: 3000 }).catch(() => {});
// head into Sinai, where raiders ride
await toWorld(); await tapPlace(p, 'suez'); await p.waitForTimeout(400); if (await has('[data-testid=train]')) await p.click('[data-testid=train]'); else if (await has('[data-testid=travel]')) await p.click('[data-testid=travel]'); await loop('suez');
await fromTownMenu(p, 'leave'); await p.click('[data-testid=leave-settlement]', { timeout: 3000 }).catch(() => {});
// walk into the desert toward the monastery (raiders)
await toWorld(); await tapPlace(p, 'sinai'); await p.waitForTimeout(400); if (await has('[data-testid=travel]')) await p.click('[data-testid=travel]'); await loop('sinai');
st=await S(); console.log('at', st.world.at, 'day', st.day, 'party', JSON.stringify(st.world.party), 'cash', st.cash, 'rep', st.reputation);
await shot('sinai');
if (errs.length) console.log('FAIL page errors');
console.log('errors', errs);
await b.close();
