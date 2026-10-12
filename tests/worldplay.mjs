import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, tapPlace, fromTownMenu, talk, serveFirstCustomer } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(400);
let n=0; const shot=(t)=>p.screenshot({path:`${__SHOTS}/w-${String(++n).padStart(2,'0')}-${t}.png`});
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(500);
// the map opens on the Giza district: zoom out to the world first
await p.click('[data-testid=district-world]'); await p.waitForTimeout(500); await shot('world');
await tapPlace(p, 'cairo'); await p.waitForTimeout(300); await shot('plan');
console.log('plan card:', (await p.textContent('[data-testid=world-card]')).trim());
const day0 = (await S()).day, cash0 = (await S()).cash;
// walking to Cairo now takes days of camping; take the train (as on the way back) when it is offered
if (await p.locator('[data-testid=train]').count()) await p.click('[data-testid=train]'); else await p.click('[data-testid=travel]');
await p.waitForTimeout(1500); await shot('moving');
for (let i=0;i<80;i++){ if (await p.locator('[data-testid=road-encounter]').count()) { await shot('encounter'); console.log('ENCOUNTER', await p.textContent('[data-testid=road-encounter] h2')); await p.click('[data-testid=road-encounter] .btn >> nth=0'); console.log(' ->', await p.textContent('[data-testid=encounter-result]')); await p.click('[data-testid=encounter-continue]'); }
  if (await p.locator('[data-testid=settlement]').count()) break; await p.waitForTimeout(300); }
await shot('cairo');
const st = await S(); console.log('arrived at', st.world.at, 'day', day0, '->', st.day, 'cash', cash0, '->', st.cash, 'hour', st.world.hour.toFixed(1));
await fromTownMenu(p, 'people'); // the town menu covers the town on arrival
await p.click('[data-testid=npc-rashid]'); await p.waitForTimeout(1500); await shot('talk');
console.log('dlg:', (await p.textContent('[data-testid=dlg-text]')).slice(0,80));
console.log('rashid:', JSON.stringify(await talk(p, ['Tell me about my father.', 'Who would know?'])));
console.log('note:', await p.textContent('[data-testid=set-note]').catch(()=>'-'));
await p.click('[data-testid=npc-hagop]'); await p.waitForTimeout(300);
console.log('hagop:', JSON.stringify(await talk(p, ['I am looking for a Kashan for a client.', 'I will look.'])));
await shot('after-talk');
// the market is a tile of the town menu now
if (await p.locator('.sell-box summary').count()) await p.locator('.sell-box summary').click(); else { await p.click('[data-testid=town-menu-open]'); await fromTownMenu(p, 'market'); }
await p.waitForTimeout(200); await shot('market');
const st2 = await S(); console.log('known', st2.world.known.join(','), 'quests', JSON.stringify(st2.world.quests), 'rumours', st2.world.rumours.length);
await p.click('[data-testid=leave-settlement]'); await p.waitForTimeout(300);
await tapPlace(p, 'giza'); await p.waitForTimeout(300);
console.log('back plan:', (await p.textContent('[data-testid=world-card]')).trim());
if (await p.locator('[data-testid=train]').count()) await p.click('[data-testid=train]'); else await p.click('[data-testid=travel]');
for (let i=0;i<30;i++){ if (await p.locator('[data-testid=road-encounter]').count()) { await p.click('[data-testid=road-encounter] .btn >> nth=0'); await p.click('[data-testid=encounter-continue]'); } if (await p.locator('[data-testid=settlement]').count()) break; await p.waitForTimeout(300); }
await shot('giza');
// back in Giza: open the stall (town menu tile, or the district's stall sheet) and call a buyer
await fromTownMenu(p, 'stall'); await serveFirstCustomer(p, '[data-testid=buyer-plate]'); await p.waitForTimeout(1500); await shot('stall-back');
console.log('stall visible', await p.locator('[data-testid=stall]').count(), 'buyer', await p.locator('[data-testid=buyer-plate] .name').textContent().catch(()=>'none'));
console.log('errors', errs);
if (errs.length) console.log('FAIL page errors');
await b.close();
