// Strategic player: restocks, matches rugs to buyers, bargains sensibly. Plays 3 days and reports.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
let n = 0; const shot = (t) => p.screenshot({ path: `/home/claude/shots/p2-${String(++n).padStart(2,'0')}-${t}.png` });
const has = async (s) => (await p.locator(s).count()) > 0;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const enc = () => p.evaluate(() => window.__tofStore?.getState().encounter);
const tap = async (s) => { await p.click(s); await p.waitForTimeout(150); if (await has('.skip-hint')) { await p.click('.skip-hint'); await p.click('.skip-hint').catch(()=>{}); } };
// tutorial fast
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await tap('[data-testid=act-ask_room]'); await tap('[data-testid=rug-desert-star]'); await tap('[data-testid=rug-desert-star]');
await p.click('[data-testid=zoom-in]'); await p.click('[data-testid=inspector-close]');
await tap('[data-testid=act-story]'); await p.click('[data-testid=act-name_price]'); await tap('[data-testid=offer-price]');
await tap('[data-testid=act-halfway]'); if (await has('[data-testid=act-accept_offer]')) await tap('[data-testid=act-accept_offer]');
await shot('tut-done');
const hasRestock = await has('[data-testid=goto-rashid]');
console.log('restock button after tutorial:', hasRestock);
await p.click('[data-testid=goto-rashid]'); await p.waitForTimeout(300); await shot('rashid');
console.log('rashid offers:', (await p.locator('.offer h3').allTextContents()).join(', '));
await p.click('[data-testid=offer-red-medina] [data-testid=haggle]'); await p.waitForTimeout(200);
console.log('haggle ->', await p.textContent('[data-testid=rashid-line]'));
await p.click('[data-testid=offer-red-medina] [data-testid=buy-cash]');
await p.click('[data-testid=offer-nile-reed] [data-testid=buy-cash]');
await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(300);

async function playBuyer(tag) {
  const st = await S();
  const name = (await p.textContent('[data-testid=buyer-plate] .name')).trim();
  const lines = [];
  // discovery
  for (const a of ['ask_room', 'ask_drawn']) if (await has(`[data-testid=act-${a}]`)) await tap(`[data-testid=act-${a}]`);
  // choose best rug by name heuristics
  const pref = { Samira: ['Sapphire Night','Desert Star','Cairo Garden','Nile Reed'], Yusuf: ['Red Medina','Nile Reed','Desert Star'], Mariam: ['Red Medina','Desert Star','Nile Reed'] }[name] || [];
  let cards = await p.locator('.rugcard .nm').allTextContents();
  for (let k = 0; k < 3 && !pref.some((x) => cards.includes(x)); k++) { if (await p.locator('[data-testid=change-rugs]').isEnabled()) { await p.click('[data-testid=change-rugs]'); cards = await p.locator('.rugcard .nm').allTextContents(); } }
  const pick = pref.find((x) => cards.includes(x)) || cards[0];
  await tap(`.rugcard:has(.nm:text-is("${pick}"))`);
  if (await has('[data-testid=act-saffron_stay]')) await tap(name === 'Yusuf' ? '[data-testid=act-saffron_move]' : '[data-testid=act-saffron_stay]');
  const argOrder = name === 'Yusuf' ? ['durability','fit','craft'] : ['fit','story','durability'];
  let g = 0;
  while (!(await has('[data-testid=result]')) && g++ < 14) {
    if (await has('[data-testid=act-obj_honest]')) { await tap('[data-testid=act-obj_honest]'); continue; }
    if (await has('[data-testid=act-story_true]')) { await tap('[data-testid=act-story_true]'); continue; }
    const e = await p.locator('.act:not([disabled]) .s').allTextContents();
    const used = await p.locator('.act .s').allTextContents();
    let did = false;
    if (!(await has('[data-testid=act-accept_offer]')) && (await p.locator('.value-chip.offer').count()) === 0) {
      for (const a of argOrder) {
        const btn = p.locator(`[data-testid=act-${a}]`);
        if ((await btn.count()) && !/Already/.test(await btn.locator('.s').textContent()) && g < 4) { await tap(`[data-testid=act-${a}]`); did = true; break; }
      }
    }
    if (did) continue;
    if (await has('[data-testid=act-accept_offer]')) {
      const offer = parseInt((await p.textContent('[data-testid=act-accept_offer] .t')).replace(/\D/g,''),10);
      const half = await has('[data-testid=act-halfway]');
      if (half && g < 9) await tap('[data-testid=act-halfway]'); else await tap('[data-testid=act-accept_offer]');
      continue;
    }
    if (await has('[data-testid=act-name_price]')) { await p.click('[data-testid=act-name_price]'); if (await has('[data-testid=dial-warn]')) { for (let i=0;i<6 && await has('[data-testid=dial-warn]');i++) await p.click('button[aria-label="Lower by 10"]'); } await tap('[data-testid=offer-price]'); continue; }
  }
  const res = await p.textContent('[data-testid=result]').catch(() => 'NO RESULT');
  const meters = await p.evaluate(() => [...document.querySelectorAll('.meter')].map((m) => m.dataset.value).join('/'));
  console.log(`[${tag}] ${name} with ${pick}: ${res.replace(/Next customer|End of day|Restock at Rashid's/g,'').trim()} | I/P/T ${meters}`);
  await shot(`${tag}-${name}`);
}
for (let day = 1; day <= 6; day++) {
  let guard = 0;
  while (!(await has('[data-testid=day-end]')) && guard++ < 8) {
    if (await has('[data-testid=next-visit]')) { await p.click('[data-testid=next-visit]'); await p.waitForTimeout(200); continue; }
    await playBuyer('d' + day);
  }
  await shot(`d${day}-end`);
  const st = await S();
  console.log(`DAY ${day} end: cash ${st.cash}, rep ${st.reputation}, stock ${st.inventory.map(i=>i.typeId+':'+i.condition).join(', ')}`);
  await p.click('[data-testid=close-stall]'); await p.waitForSelector('[data-testid=morning]');
  console.log('morning:', (await p.textContent('[data-testid=morning]')).slice(0, 220));
  await p.click('[data-testid=open-stall]'); await p.waitForTimeout(200);
  // restock
  await p.click('[data-testid=nav-supplier]'); await p.waitForTimeout(200);
  const offers = await p.locator('.offer').count();
  for (let i = 0; i < offers; i++) { const o = p.locator('.offer').first(); const btn = o.locator('[data-testid=buy-cash]'); if (await btn.isEnabled() && (await S()).cash > 120) await btn.click(); else break; }
  await p.click('[data-testid=nav-inventory]');
  for (let k = 0; k < 4; k++) { const r = p.locator('[data-testid=restore]:not([disabled])').first(); if (await r.count()) await r.click(); else break; }
  for (const u of ['mat','tea','bazaar']) { const b2 = p.locator(`[data-testid=upgrade-${u}]:not([disabled])`); if (await b2.count()) { await b2.click(); console.log('bought upgrade', u); } }
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(200);
}
const st = await S();
console.log('FINAL', st.day, st.cash, st.reputation, JSON.stringify(Object.fromEntries(Object.entries(st.relationships).map(([k,v])=>[k,[v.visits,v.purchases,v.affinity]]))));
console.log('commissions', JSON.stringify(st.commissions));
console.log('errors', errs);
await b.close();
