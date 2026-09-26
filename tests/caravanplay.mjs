import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.cash=600; d.state.world.known.push('suez','sinai'); localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(300);
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const has = async (s) => (await p.locator(s).count()) > 0;
let n=0; const shot=(t)=>p.screenshot({path:`/home/claude/shots/c-${String(++n).padStart(2,'0')}-${t}.png`});
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400); if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]'); await p.waitForTimeout(300); await shot('map');
// zoom in on Giza for the bird's-eye view
for (let i=0;i<3;i++) await p.click('[data-testid=world-zoom-in]');
await p.waitForTimeout(600); await shot('zoom-giza');
console.log('overhead pin', await has('[data-testid=overhead-pin]'));
for (let i=0;i<3;i++) await p.click('button[aria-label="Zoom out"]');
await p.click('[data-testid=enter]'); await p.waitForTimeout(500); if (await has('[data-testid=district]')) { await p.click('[data-testid=poi-stall]').catch(()=>{}); } await shot('giza-panel');
await p.click('[data-testid=buy-food-days]'); await p.click('[data-testid=buy-falahi]').catch(()=>{});
console.log('note', await p.textContent('[data-testid=supply-note]').catch(()=>'-'));
if (await has('[data-testid=hire-fellah]')) await p.click('[data-testid=hire-fellah]');
await p.locator('[data-testid=town-supplies]').scrollIntoViewIfNeeded(); await shot('supplies');
let st=await S(); console.log('party', JSON.stringify(st.world.party));
await p.click('[data-testid=leave-settlement]');
// go to Cairo, hire guards
await p.click('[data-testid=place-cairo]'); await p.click('[data-testid=travel]');
await p.waitForTimeout(700);
{ const box = await p.locator('[data-testid=world-map]').boundingBox(); const x0 = (await S()).world.x;
  await p.mouse.click(box.x+60, box.y+box.height-60); await p.waitForTimeout(150); await p.mouse.click(box.x+60, box.y+box.height-60); await p.waitForTimeout(400);
  const x1 = (await S()).world.x; await p.waitForTimeout(600); const x2 = (await S()).world.x;
  console.log('double-tap stop:', !(await has('[data-testid=stop]')), 'still after stop:', x1 === x2, '|', await p.textContent('[data-testid=world-report]').catch(()=>'')); }
if (!(await has('[data-testid=settlement]'))) { await p.click('[data-testid=place-cairo]'); await p.click('[data-testid=travel]'); }
const loop = async () => { for (let i=0;i<300 && !(await has('[data-testid=settlement]'));i++){ if (await has('[data-testid=road-encounter]')) { const h=await p.textContent('[data-testid=road-encounter] h2'); await shot('enc'); const o = (await has('[data-testid=enc-fight]')) ? '[data-testid=enc-fight]' : (await has('[data-testid=enc-hire]')) ? '[data-testid=enc-hire]' : '[data-testid=road-encounter] .btn >> nth=0'; await p.click(o); console.log(' ENC', h, '->', await p.textContent('[data-testid=encounter-result]')); await p.click('[data-testid=encounter-continue]'); } await p.waitForTimeout(120);} };
await loop();
await p.click('[data-testid=hire-guard]').catch(()=>console.log('no guards today'));
await p.click('[data-testid=hire-guard]').catch(()=>{});
await p.click('[data-testid=buy-baladi_h]').catch(()=>{});
await p.click('[data-testid=buy-food-days]');
st=await S(); console.log('in cairo party', JSON.stringify(st.world.party), 'cash', st.cash);
await p.click('[data-testid=leave-settlement]');
// head into Sinai, where raiders ride
await p.click('[data-testid=place-suez]'); await p.click('[data-testid=travel]'); await loop();
await p.click('[data-testid=leave-settlement]');
// walk into the desert toward the monastery (raiders)
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); if(!d.state.world.known.includes('sinai')) d.state.world.known.push('sinai'); localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(300);
await p.click('[data-testid=place-sinai]'); await p.click('[data-testid=travel]'); await loop();
st=await S(); console.log('at', st.world.at, 'day', st.day, 'party', JSON.stringify(st.world.party), 'cash', st.cash, 'rep', st.reputation);
await shot('sinai');
console.log('errors', errs);
await b.close();
