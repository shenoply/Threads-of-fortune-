import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, tapPlace, fromTownMenu, openBilgin, talk as talkThrough } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-skip-chapters', '1'))); await p.reload(); // skip the opening chapter, which locks every town but Giza and Cairo
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.cash=2000; /* fares, a frontier fine and Farid's 20 pt */ (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(300);
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const has = async (s) => (await p.locator(s).count()) > 0;
let n=0; const shot=(t)=>p.screenshot({path:`${__SHOTS}/x-${String(++n).padStart(2,'0')}-${t}.png`});
async function go(id, mode='train') { // the train where there is one; walking takes days of camping now
  if (await has('[data-testid=cafe-room-leave]')) await p.click('[data-testid=cafe-room-leave]');
  if (await has('[data-testid=town-menu]')) await fromTownMenu(p, 'leave');
  else if (await has('[data-testid=settlement]')) await p.click('[data-testid=leave-settlement]');
  if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]'); // Giza opens on the district
  if (!(await has('[data-testid=world-map]'))) { await p.click('[data-testid=nav-map]'); await p.waitForTimeout(300); if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]'); }
  if (await has('[data-testid=night-camp]')) await p.click('[data-testid=night-camp]').catch(() => {}); // camp every night without asking
  await tapPlace(p, id); await p.waitForTimeout(200);
  if (mode==='train' && await has('[data-testid=train]')) await p.click('[data-testid=train]');
  else if (mode==='ship' && await has('[data-testid=ship]')) await p.click('[data-testid=ship]');
  else await p.click('[data-testid=travel]');
  const arrived = async () => { const z = await S(); return z.world.at === id && !z.journey && (await has('[data-testid=settlement]')); };
  for (let i=0;i<400 && !(await arrived());i++){
    if (await has('[data-testid=road-encounter]')) { const h=await p.textContent('[data-testid=road-encounter] h2'); await shot('enc'); const opt = h.includes('Riders') ? '[data-testid=enc-talk]' : '[data-testid=road-encounter] .btn >> nth=0'; await p.click(opt); console.log('  encounter:', h, '->', await p.textContent('[data-testid=encounter-result]')); await p.click('[data-testid=encounter-continue]'); }
    // a frontier post on the road holds the caravan until it is answered: declare everything (or show the papers), then go on
    if (await has('[data-testid=border-card]')) {
      if (await has('[data-testid=border-continue]')) await p.click('[data-testid=border-continue]').catch(() => {});
      else if (await has('[data-testid=border-full]')) await p.click('[data-testid=border-full]').catch(() => {});
      else if (await has('[data-testid=border-none]')) await p.click('[data-testid=border-none]').catch(() => {});
    }
    await p.waitForTimeout(150);
  }
  const st=await S(); if (!st.world.at) await shot("stuck-"+id); console.log(`at ${st.world.at} day ${st.day} ${st.world.hour.toFixed(0)}h cash ${st.cash}`);
}
async function talk(npc, ...labels){ if (npc === 'abuhamid') await openBilgin(p); else { await fromTownMenu(p, 'people'); await p.click(`[data-testid=npc-${npc}]`); await p.waitForSelector('[data-testid=dialogue]'); } await talkThrough(p, labels); const note=await p.locator('[data-testid=set-note]').textContent({ timeout: 1000 }).catch(()=> ''); console.log(`  talk ${npc}: ${note}`); }
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(300);
await talk('abuhamid','Where can I find rugs cheaper','Where is Fayoum','Thank you, I think');
await go('fayoum'); await shot('fayoum');
await talk('ummsalah','Is there anything I can carry','I will carry it');
const buy = p.locator('[data-testid^=buy-] .btn').first(); if (await buy.count()) { await buy.click(); console.log('  bought:', await p.textContent('[data-testid=set-note]')); }
await go('cairo', 'train');
await talk('hagop','Salah from the telegraph office','Take the rug to Salah');
await go('fayoum', 'train');
await talk('ummsalah','Your son has the rug','Thank you, Umm Salah');
console.log('  quests', JSON.stringify((await S()).world.quests), 'friends', (await S()).world.friends);
await go('alexandria', 'train'); await shot('alex');
await talk('pericles','Where do your ships go?','Go in peace');
await go('jaffa', 'ship');
await go('damascus'); await shot('damascus');
await talk('farid','Look at this silk rug','Pay 20 pt and wait');
const dr = (await S()).inventory.find(i=>i.typeId==='damascus-rose'); console.log('  damascus rose provenance', dr?.provenance, dr?.notes.slice(-1));
await shot('farid');
console.log('known', (await S()).world.known.join(','));
console.log('errors', errs);
if (errs.length) console.log('FAIL page errors');
await b.close();
