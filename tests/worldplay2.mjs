import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.cash=400; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(300);
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const has = async (s) => (await p.locator(s).count()) > 0;
let n=0; const shot=(t)=>p.screenshot({path:`/home/claude/shots/x-${String(++n).padStart(2,'0')}-${t}.png`});
async function go(id, mode='travel') {
  if (await has('[data-testid=settlement]')) await p.click('[data-testid=leave-settlement]');
  await p.click(`[data-testid=place-${id}]`); await p.waitForTimeout(200);
  if (mode==='train' && await has('[data-testid=train]')) await p.click('[data-testid=train]');
  else if (mode==='ship' && await has('[data-testid=ship]')) await p.click('[data-testid=ship]');
  else await p.click('[data-testid=travel]');
  for (let i=0;i<200 && !(await has('[data-testid=settlement]'));i++){
    if (await has('[data-testid=road-encounter]')) { const h=await p.textContent('[data-testid=road-encounter] h2'); await shot('enc'); const opt = h.includes('Riders') ? '[data-testid=enc-talk]' : '[data-testid=road-encounter] .btn >> nth=0'; await p.click(opt); console.log('  encounter:', h, '->', await p.textContent('[data-testid=encounter-result]')); await p.click('[data-testid=encounter-continue]'); }
    await p.waitForTimeout(150);
  }
  const st=await S(); console.log(`at ${st.world.at} day ${st.day} ${st.world.hour.toFixed(0)}h cash ${st.cash}`);
}
async function talk(npc, ...labels){ await p.click(`[data-testid=npc-${npc}]`); await p.waitForSelector('[data-testid=dialogue]'); for (const l of labels){ await p.click(`[data-testid=dialogue] .act:has-text("${l}")`); await p.waitForTimeout(150);} const note=await p.textContent('[data-testid=set-note]').catch(()=> ''); console.log(`  talk ${npc}: ${note}`); }
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(300);
await p.click('[data-testid=enter]'); await talk('abuhamid','Where can I find rugs cheaper','Where is Fayoum','Thank you, I think');
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
await b.close();
