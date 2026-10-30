// Strategic player: restocks, matches rugs to buyers, bargains sensibly. Plays 3 days and reports.
import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS, serveFirstCustomer } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
let n = 0; const shot = (t) => p.screenshot({ path: `${__SHOTS}/p2-${String(++n).padStart(2,'0')}-${t}.png` });
const has = async (s) => (await p.locator(s).count()) > 0;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
const enc = () => p.evaluate(() => window.__tofStore?.getState().encounter);
const tap = async (s) => { await p.click(s); await p.waitForTimeout(150); if (await has('.skip-hint')) { await p.click('.skip-hint', { timeout: 3000, force: true }).catch(()=>{}); await p.click('.skip-hint', { timeout: 1000, force: true }).catch(()=>{}); } };
// tutorial fast
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await serveFirstCustomer(p); // day one opens on the Giza district: start the first sale
await tap('[data-testid=act-ask_room]'); await tap('[data-testid=rug-desert-star]');
// a closer look (the strip may fold away once a rug is on the table)
await p.click('[data-testid=rug-desert-star]', { timeout: 5000 }).then(() => p.click('[data-testid=zoom-in]', { timeout: 5000 })).then(() => p.click('[data-testid=inspector-close]', { timeout: 5000 })).catch(() => console.log('  (inspector not reachable; skipped)'));
await tap('[data-testid=act-story]'); await p.click('[data-testid=act-name_price]'); await tap('[data-testid=offer-price]');
await tap('[data-testid=act-halfway]'); if (await has('[data-testid=act-accept_offer]')) await tap('[data-testid=act-accept_offer]');
await shot('tut-done');
const hasRestock = await has('[data-testid=goto-rashid]');
console.log('restock button after tutorial:', hasRestock);
await p.click('[data-testid=goto-rashid]'); await p.waitForTimeout(300); await shot('rashid');
console.log('rashid offers:', (await p.locator('.offer h3').allTextContents()).join(', '));
// Rashid's shelf changes with balance work: haggle over the first rug he offers, then buy what we can afford.
const offers = p.locator('.offer[data-testid^=offer-]');
await offers.first().locator('[data-testid=haggle]').click(); await p.waitForTimeout(200);
console.log('haggle ->', await p.textContent('[data-testid=rashid-line]'));
for (let i = 0; i < (await offers.count()) && i < 3; i++) {
  const buy = offers.nth(i).locator('[data-testid=buy-cash]');
  if ((await buy.count()) && (await buy.isEnabled())) { await buy.click(); await p.waitForTimeout(200); console.log('bought', await offers.nth(i).getAttribute('data-testid').catch(() => '(sold)')); }
}
await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(300);

async function playBuyer(tag) {
  const st = await S();
  await p.waitForSelector('[data-testid=buyer-plate] .name');
  const name = (await p.textContent('[data-testid=buyer-plate] .name')).trim();
  const lines = [];
  // discovery
  for (const a of ['ask_room', 'ask_drawn']) if (await has(`[data-testid=act-${a}]`)) await tap(`[data-testid=act-${a}]`);
  // choose best rug by name heuristics
  const pref = { Samira: ['Sapphire Night','Desert Star','Cairo Garden','Nile Reed'], Yusuf: ['Red Medina','Nile Reed','Desert Star'], Mariam: ['Red Medina','Desert Star','Nile Reed'] }[name] || [];
  const cards = await p.locator('.rugcard .nm').allTextContents();
  let pick = pref.find((x) => cards.includes(x));
  const tryClick = (sel) => p.click(sel, { timeout: 4000 }).then(() => true).catch(() => false);
  let picked = pick ? await tryClick(`.rugcard:has(.nm:text-is("${pick}"))`) : false;
  if (!picked && (await has('[data-testid=change-rugs]')) && (await tryClick('[data-testid=change-rugs]'))) {
    // "See all rugs" opens the picker: put the best-liked rug on the table from there
    await p.waitForSelector('[data-testid=rug-picker]');
    const rows = p.locator('[data-testid^=rug-pick-]'); const texts = await rows.allTextContents();
    let k = texts.findIndex((t) => pref.some((x) => t.includes(x))); if (k < 0) k = 0;
    pick = texts[k]?.slice(0, 30) ?? '?';
    picked = await rows.nth(k).click({ timeout: 4000 }).then(() => true).catch(() => false);
    if (!picked) await tryClick('[data-testid=rug-picker-close]');
  }
  if (!picked && cards.length) { pick = cards[0]; picked = await tryClick('.rugcard:not(.empty) >> nth=0'); }
  if (!picked) { console.log(`[${tag}] ${name}: nothing to show (stock ${cards.length}); letting them go`); if (await has('[data-testid=let-go]')) await tap('[data-testid=let-go]'); return; }
  await p.waitForTimeout(200); if (await has('.skip-hint')) await p.click('.skip-hint', { timeout: 2000, force: true }).catch(() => {});
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
    // nothing the bot knows how to say (e.g. the rug it chose is not for sale): put another rug out, else let them go
    const other = p.locator('.rugcard:not(.empty):not(.presented)');
    if (g < 6 && (await other.count()) && (await other.first().click({ timeout: 4000 }).then(() => true).catch(() => false))) { await p.waitForTimeout(300); continue; }
    if (await has('[data-testid=let-go]')) { await tap('[data-testid=let-go]'); break; }
  }
  const res = await p.textContent('[data-testid=result]').catch(() => 'NO RESULT');
  const meters = await p.evaluate(() => [...document.querySelectorAll('.meter')].map((m) => m.dataset.value).join('/'));
  console.log(`[${tag}] ${name} with ${pick}: ${res.replace(/Next customer|End of day|Restock at Rashid's/g,'').trim()} | I/P/T ${meters}`);
  await shot(`${tag}-${name}`);
}
for (let day = 1; day <= 6; day++) {
  let guard = 0;
  while (!(await has('[data-testid=day-end]')) && guard++ < 10) {
    if (await has('[data-testid=next-visit]')) { await p.click('[data-testid=next-visit]').catch(() => {}); await p.waitForTimeout(200); continue; }
    // between buyers the game shows the Giza district / stall view: call the next one
    if (!(await has('[data-testid=buyer-plate]'))) {
      if (!(await has('[data-testid=stall-wait]'))) await p.click('[data-testid=nav-stall]').catch(() => {});
      await serveFirstCustomer(p, '[data-testid=buyer-plate], [data-testid=day-end]');
      if (await has('[data-testid=day-end]')) break;
    }
    await playBuyer('d' + day);
  }
  if (!(await has('[data-testid=day-end]'))) { // the bot gave up on the day: shut the stall
    if (await has('[data-testid=step-away]')) await p.click('[data-testid=step-away]').catch(() => {});
    if (!(await has('[data-testid=stall-close-early]'))) await p.click('[data-testid=nav-stall]', { timeout: 4000 }).catch(() => {});
    await p.evaluate(() => { if (!document.querySelector('[data-testid=idle-auctions]')) document.querySelector('[data-testid=idle-more-toggle]')?.click(); }); await p.waitForTimeout(150); await p.click('[data-testid=stall-close-early]', { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(400);
  }
  await shot(`d${day}-end`);
  let st = await S();
  console.log(`DAY ${day} end: cash ${st.cash}, rep ${st.reputation}, stock ${st.inventory.map(i=>i.typeId+':'+i.condition).join(', ')}`);
  // evening: restock at Rashid's, mend and improve, then start the next day
  if (await has('[data-testid=visit-rashid-evening]')) {
    await p.click('[data-testid=visit-rashid-evening]'); await p.waitForTimeout(300);
    for (let i = 0; i < 6; i++) { const btn = p.locator('.offer [data-testid=buy-cash]:not([disabled])').first(); if ((await btn.count()) && (await S()).cash > 120) { await btn.click(); await p.waitForTimeout(150); } else break; }
  }
  if (await has('[data-testid=step-away]')) await p.click('[data-testid=step-away]'); // the nav bar hides during a sale on phones
  await p.click('[data-testid=nav-inventory]');
  for (let k = 0; k < 4; k++) { const r = p.locator('[data-testid=restore]:not([disabled])').first(); if (await r.count()) { await r.click(); await p.locator('[data-testid=treat-options] [data-testid^=treat-]:not([data-testid=treat-none]):not([disabled])').first().click(); } else break; }
  for (const u of ['mat','tea','bazaar']) { const b2 = p.locator(`[data-testid=upgrade-${u}]:not([disabled])`); if (await b2.count()) { await b2.click(); console.log('bought upgrade', u); } }
  await p.click('[data-testid=close-stall]'); await p.waitForTimeout(600);
  st = await S(); console.log(`  next day: ${st.day}`);
}
const st = await S();
console.log('FINAL', st.day, st.cash, st.reputation, JSON.stringify(Object.fromEntries(Object.entries(st.relationships).map(([k,v])=>[k,[v.visits,v.purchases,v.affinity]]))));
console.log('commissions', JSON.stringify(st.commissions));
console.log('errors', errs);
await b.close();
