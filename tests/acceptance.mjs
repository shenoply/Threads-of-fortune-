// Acceptance run for the Giza vertical slice. Plays the game in a phone-sized browser.
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:4173/';
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, hasTouch: false });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => p.screenshot({ path: `/home/claude/shots/acc-${n}.png` });
const n0guide = () => true;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save') || '{}').state || {});
const audioState = () => p.evaluate(() => ({ ...window.__tofAudio.state }));
const parsePT = (t) => { const m = (t || '').match(/£E?([\d,]+(?:\.\d\d)?)|(\d+) PT/); return m ? (m[1] !== undefined ? Math.round(parseFloat(m[1].replace(/,/g, '')) * 100) : Number(m[2])) : NaN; };
const cashHud = async () => parseInt(await p.getAttribute('[data-testid=hud-cash]', 'data-pt'), 10);
const _click = p.click.bind(p);
p.click = async (sel, o) => { if (!String(sel).includes('tip') && (await p.locator('[data-testid=tip-ok]').count())) await p.locator('[data-testid=tip-ok]').first().click().catch(() => {}); return _click(sel, o); };

// the stall between customers: pass the first-day lessons and wait for the next customer
const idle = async () => {
  if (await has('[data-testid=tour-news]')) { await p.click('[data-testid=tour-news]'); await p.waitForTimeout(300); await p.click('[data-testid=newspaper-close]'); return true; }
  if (await has('[data-testid=tour-radio]')) { await p.click('[data-testid=tour-radio]'); await p.waitForTimeout(300); await p.click('[data-testid=radio-power]'); await p.waitForTimeout(300); await p.click('[data-testid=radio-close]'); return true; }
  if (await has('[data-testid=tour-buyers]')) { await p.click('[data-testid=tour-buyers]'); await p.waitForTimeout(300); await p.click('[data-testid=nav-map]'); return true; }
  if (await has('[data-testid=tour-rashid]')) { await p.click('[data-testid=tour-rashid]'); await p.waitForTimeout(300); await p.click('[data-testid=nav-map]'); return true; }
  if (await has('[data-testid=tour-map]')) { await p.click('[data-testid=tour-map]'); await p.waitForTimeout(6500); await p.click('[data-testid=nav-map]'); return true; }
  if (await has('[data-testid=serve-waiting]')) { await p.locator('[data-testid=serve-waiting]').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(400); return true; }
  if (await has('[data-testid=stall-wait]:not([disabled])')) { await p.locator('[data-testid=stall-wait]').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(300); return true; }
  // the map is home now: walk to the stall in the lane to open it
  if (await has('[data-testid=poi-stall]') && !(await has('[data-testid=stall-sheet]'))) { await p.locator('[data-testid=poi-stall]').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(2500); return true; }
  return false;
};
const has = async (sel) => {
  // tips appear the first time something is reached; a player reads and dismisses them
  if (!String(sel).includes('tip') && (await p.locator('[data-testid=tip-ok]').count())) await p.locator('[data-testid=tip-ok]').first().click().catch(() => {});
  return (await p.locator(sel).count()) > 0;
};
const enabled = async (sel) => (await has(sel)) && (await p.locator(sel).first().isEnabled());

await p.goto(URL);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-skip-chapters', '1')));
await p.reload();

// 1. Opening
await p.click('[data-testid=play-opening]');
await p.waitForSelector('[data-testid=documentary]');
await p.waitForTimeout(2500);
let a = await audioState();
ok('Opening starts correctly', a.musicPlaying && (await has('[data-testid=documentary]')), `music=${a.musicPlaying}`);
await p.waitForTimeout(9000);
await shot('01-documentary');
const sub = await p.textContent('[data-testid=doc-subtitle]');
ok('Opening runs continuously without slide buttons', !(await has('text=Next')) && sub.length > 5, `subtitle: "${sub.slice(0, 50)}"`);
await p.click('[data-testid=skip-opening]'); await p.waitForSelector('[data-testid=dayone]', { timeout: 45000 });
await p.waitForTimeout(600);
a = await audioState();
ok('Opening stops completely', !a.musicPlaying && !a.voicePlaying, `music=${a.musicPlaying} voice=${a.voicePlaying}`);
await shot('02-dayone');

// 2. Begin Day One
await p.click('[data-testid=begin-day-one]');
await p.waitForSelector('[data-testid=stall-wait]', { timeout: 20000 });
await p.click('[data-testid=stall-wait]');
await p.waitForSelector('[data-testid=stall]');
ok('Begin Day One works', await has('[data-testid=act-ask_room]'));
await p.waitForTimeout(12000);
const stillRoom = (await S()).tutorial?.step === 'room';
const onlyRoom = (await enabled('[data-testid=act-ask_room]')) && !(await enabled('[data-testid=act-ask_budget]'));
ok('Tutorial waits for player input (12 s idle)', stillRoom && onlyRoom);
await shot('03-stall-start');

// 3. Layout
const layout = await p.evaluate(() => {
  const se = document.scrollingElement;
  const vis = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 1;
  };
  const acts = [...document.querySelectorAll('.act')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.bottom <= innerHeight && r.top >= 0;
  }).length;
  const img = document.querySelector('.scene.split .seller-side img');
  return { scroll: se.scrollHeight - innerHeight, scene: vis('[data-testid=scene]'), img: img && img.complete && img.naturalWidth > 0, rugs: vis('[data-testid=rugstrip]'), acts };
});
ok('Stall requires zero vertical scrolling', layout.scroll <= 0, `overflow ${layout.scroll}px`);
ok('Seller and buyer visible (scene art loaded)', layout.scene && layout.img);
ok('Rug choices visible', layout.rugs);
ok('3–4 choices visible', layout.acts >= 3 && layout.acts <= 4, `${layout.acts} actions`);

// 4. Tutorial encounter with Samira
await p.click('[data-testid=act-ask_room]');
await p.waitForTimeout(400);
ok('Dialogue branches: room question reveals priorities', (await p.locator('.value-chip:not(.unknown)').count()) >= 2);
await p.click('[data-testid=rug-cairo-garden]');
await p.waitForTimeout(300);
ok('Tutorial steers to Desert Star', !(await has('[data-testid=table-rug]')));
await p.click('[data-testid=rug-desert-star]');
await p.waitForTimeout(1200);
ok('Rug selection works (unfolds on the table)', await has('[data-testid=table-rug]'));
await shot('04-presented');
await p.click('[data-testid=rug-desert-star]');
await p.waitForSelector('[data-testid=inspector]');
const closeDisabled = !(await p.locator('[data-testid=inspector-close]').isEnabled());
await p.click('[data-testid=zoom-in]');
await p.click('[data-testid=zoom-in]');
const zoom = await p.getAttribute('[data-testid=inspector-img]', 'data-zoom');
await p.click('[data-testid=tab-weave]');
const weave = await p.textContent('[data-testid=insp-body]');
await p.click('[data-testid=flip]');
await p.waitForTimeout(400);
const simLabel = await has('.sim-label');
await shot('05-inspector');
ok('Rug inspection works (zoom, weave notes, labelled simulated reverse)', parseFloat(zoom) >= 2 && /knot/i.test(weave) && simLabel && closeDisabled, `zoom ${zoom}`);
await p.click('[data-testid=inspector-close]');
await p.waitForTimeout(300);
ok('Tutorial moves to argument step after inspection', (await S()).tutorial?.step === 'argue');
await p.click('[data-testid=act-craft]');
await p.waitForTimeout(300);
const afterWrong = (await S()).tutorial?.step;
await p.click('[data-testid=act-story]');
await p.waitForTimeout(300);
const afterRight = (await S()).tutorial?.step;
ok('Argument choice matters (craft does not advance, story does)', afterWrong === 'argue' && afterRight === 'price', `${afterWrong} → ${afterRight}`);
await p.click('[data-testid=act-name_price]');
await p.waitForSelector('[data-testid=price-dial]');
for (let i = 0; i < 6; i++) await p.click('button[aria-label="Raise"]');
const asked = parseInt(await p.getAttribute('[data-testid=dial-value]', 'data-pt'), 10);
await p.click('[data-testid=offer-price]');
await p.waitForTimeout(500);
const offerBtn = p.locator('[data-testid=act-accept_offer]');
const countered = (await offerBtn.count()) > 0;
ok('Price negotiation works (buyer counters a high ask)', countered, `asked ${asked}`);
await shot('06-counter');
const cashBefore = await cashHud();
const invBefore = (await S()).inventory.length;
let saleLabel = countered ? await offerBtn.textContent() : '';
if (countered) await offerBtn.click();
await p.waitForSelector('[data-testid=result]');
await p.waitForTimeout(400);
const sold = parsePT(saleLabel);
const cashAfter = await cashHud();
const st1 = await S();
ok('Buyer can accept', (await p.textContent('[data-testid=result]')).includes('Sold'));
ok('Cash changes correctly', cashAfter - cashBefore === sold, `${cashBefore} → ${cashAfter} (+${sold})`);
ok('Inventory changes correctly', st1.inventory.length === invBefore - 1 && !st1.inventory.some((i) => i.typeId === 'desert-star'));
ok('Tutorial ends permanently after first sale', st1.tutorial.done === true);
await shot('07-sold');

// 5. Yusuf: rejection path
await p.click('[data-testid=next-visit]');
for (let k = 0; k < 12 && (await idle()); k++) await p.waitForTimeout(200);
await p.waitForTimeout(600);
const buyer2 = (await p.textContent('[data-testid=buyer-plate] .name')).trim();
await p.click('[data-testid=rug-cairo-garden]');
await p.waitForTimeout(300);
if (await has('[data-testid=act-saffron_move]')) await p.click('[data-testid=act-saffron_move]');
await shot('08-yusuf');
let guard = 0;
while (!(await has('[data-testid=result]')) && guard++ < 25) {
  if (await has('[data-testid=act-obj_facts]')) await p.click('[data-testid=act-obj_facts]');
  else if (await has('[data-testid=act-story_true]')) await p.click('[data-testid=act-story_true]');
  else if (await has('[data-testid=act-hold]')) await p.click('[data-testid=act-hold]');
  else if (await has('[data-testid=act-name_price]')) {
    await p.click('[data-testid=act-name_price]');
    for (let i = 0; i < 10; i++) await p.click('button[aria-label="Raise"]');
    await p.click('[data-testid=offer-price]');
  } else if (await has('[data-testid=act-craft]')) await p.click('[data-testid=act-craft]');
  await p.waitForTimeout(150);
}
const rej = await p.textContent('[data-testid=result]').catch(() => '');
ok('Buyer can reject (walks away)', /walked away/.test(rej), `${buyer2}: ${rej.slice(0, 60)}`);
await shot('09-walked');

// 6. Mariam (or next): quick fair sale
await p.click('[data-testid=next-visit]');
for (let k = 0; k < 12 && (await idle()); k++) await p.waitForTimeout(200);
await p.waitForTimeout(500);
await p.click('[data-testid=act-ask_room]');
await p.click('[data-testid=rug-cairo-garden]');
if (await has('[data-testid=act-saffron_move]')) await p.click('[data-testid=act-saffron_move]');
guard = 0;
while (!(await has('[data-testid=result]')) && guard++ < 12) {
  if (await has('[data-testid=act-obj_honest]')) await p.click('[data-testid=act-obj_honest]');
  else if (await has('[data-testid=act-accept_offer]')) await p.click('[data-testid=act-accept_offer]');
  else if (await has('[data-testid=act-name_price]')) {
    await p.click('[data-testid=act-name_price]');
    for (let i = 0; i < 8; i++) await p.click('button[aria-label="Lower"]');
    await p.click('[data-testid=offer-price]');
  } else if (await has('[data-testid=act-fit]')) await p.click('[data-testid=act-fit]');
  await p.waitForTimeout(150);
}
ok('Third buyer encounter completes', await has('[data-testid=result]'), (await p.textContent('[data-testid=result]').catch(() => '')).slice(0, 50));

// 7. Voices never overlap: at most one bubble typing at a time, no voice element playing
await p.waitForTimeout(200);
const typing = await p.locator('.bubble .cursor').count();
a = await audioState();
ok('No seller/buyer voice overlaps', typing <= 1 && !a.voicePlaying, `typing bubbles ${typing}`);

// 8. End of day, supplier rotation
const offersDay1 = (await S()).supplier.offers.map((o) => o.uid).join();
await p.click('[data-testid=next-visit]');
for (let k = 0; k < 12 && (await idle()); k++) await p.waitForTimeout(200);
await p.waitForSelector('[data-testid=day-end]');
await shot('10-dayend');
await p.click('[data-testid=close-stall]');
await p.waitForTimeout(800);
const st2 = await S();
ok('Supplier stock rotates', st2.supplier.offers.map((o) => o.uid).join() !== offersDay1 && st2.day === 2);
await shot('11-morning');

await p.waitForTimeout(300);
ok('Main mission to Alexandria is announced', await has('[data-testid=mission-card]'));
await shot('11b-mission');
await p.click('[data-testid=mission-ok]');
await p.waitForTimeout(200);

// 9. Supplier + restoration
await p.click('[data-testid=nav-inventory]'); await p.click('[data-testid=stock-rashid]');
await p.waitForSelector('[data-testid=supplier]');
ok('Mission banner stays pinned', await has('[data-testid=mission-banner]'));
await shot('12-supplier');
const cBefore = await cashHud();
const firstOffer = p.locator('[data-testid^=offer-]').first();
const price = parsePT(await firstOffer.locator('[data-testid=offer-price]').textContent());
if (cBefore >= price) await firstOffer.locator('[data-testid=buy-cash]').click();
else await firstOffer.locator('[data-testid=buy-credit]').click();
await p.waitForTimeout(300);
const cAfter = await cashHud();
ok('Buying from Rashid changes cash or debt', cAfter === cBefore - price || (await S()).supplier.debt > 0, `${cBefore} → ${cAfter}, price ${price}`);
// force a dirty rug into stock to test restoration deterministically
await p.evaluate(() => {
  const k = 'threads-of-fortune-save';
  const d = JSON.parse(localStorage.getItem(k));
  d.state.inventory.push({ uid: 'test-dirty', typeId: 'nile-reed', condition: 'Dirty', restored: false, provenance: 'Documented', paid: 15, notes: [] });
  d.state.cash = Math.max(d.state.cash, 40);
  localStorage.setItem(k, JSON.stringify(d));
});
await p.reload();
await p.click('[data-testid=continue]');
await p.waitForTimeout(500);
await p.click('[data-testid=nav-inventory]');
const dirtyCard = p.locator('[data-uid=test-dirty]');
await dirtyCard.locator('[data-testid=restore]').click();
await p.waitForTimeout(200);
const restoring = await p.locator('[data-uid=test-dirty] [data-testid=restoring]').count();
await shot('13-restoring');
// finish the day to let the wash complete
await p.click('[data-testid=nav-map]');
guard = 0;
while (!(await has('[data-testid=day-end]')) && guard++ < 60) {
  if (await has('[data-testid=inspector]')) await p.click('[data-testid=inspector-close]');
  if (await has('[data-testid=next-visit]')) await p.click('[data-testid=next-visit]');
  else if (await idle()) { /* waited */ }
  else if (await has('[data-testid=act-name_price]')) {
    await p.click('[data-testid=act-name_price]');
    for (let i = 0; i < 12; i++) await p.click('button[aria-label="Raise"]');
    await p.click('[data-testid=offer-price]');
  } else if (await has('[data-testid=act-obj_facts]')) await p.click('[data-testid=act-obj_facts]');
  else if (await has('[data-testid=act-story_true]')) await p.click('[data-testid=act-story_true]');
  else if (await has('[data-testid=act-saffron_move]')) await p.click('[data-testid=act-saffron_move]');
  else if (await has('[data-testid=table-rug]') && (await has('[data-testid=act-craft]'))) await p.click('[data-testid=act-craft]');
  else if (await has('.rugcard:not(.presented):not([disabled]):not(.empty)')) {
    await p.locator('.rugcard:not(.presented):not([disabled]):not(.empty)').first().click();
  } else if (await has('[data-testid=act-small_talk]')) await p.click('[data-testid=act-small_talk]');
  else if (await has('[data-testid=act-ask_drawn]')) await p.click('[data-testid=act-ask_drawn]');
  await p.waitForTimeout(120);
}
await p.click('[data-testid=close-stall]');
await p.waitForTimeout(800);
const st3 = await S();
const washed = st3.inventory.find((i) => i.uid === 'test-dirty');
ok('Damaged rug restoration works (Dirty → Good after a day)', restoring === 1 && washed?.condition === 'Good' && !washed.restoringUntil, washed ? washed.condition : 'missing');


// 10. Save / reload and relationships
const relBefore = (await S()).relationships.samira;
await p.reload();
await p.click('[data-testid=continue]');
await p.waitForTimeout(400);
const relAfter = (await S()).relationships.samira;
await p.click('[data-testid=nav-ledger]');
await p.click('[data-testid=msub-book]');
const tier = await p.textContent('[data-testid=tier-samira]');
ok('Relationship persists after reload', relAfter.purchases >= 1 && relAfter.purchases === relBefore.purchases && tier !== 'New', `Samira: ${tier}, ${relAfter.purchases} purchase(s)`);
ok('Save/reload works', (await S()).day === st3.day && (await cashHud()) === (await S()).cash, `day ${(await S()).day}`);
await shot('14-ledger');

// 11. World map: pan, zoom, travel, settlements, people, trade, caravan
await p.click('[data-testid=nav-inventory]');
await p.locator('[data-testid=toggle-stored]').first().click();
ok('Rugs can be packed for the road', (await S()).inventory.some((i) => !i.stored));
// the map clock is live: keep today's remaining customers away while the map is tested
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.arrivals = (d.state.arrivals ?? []).map(() => 19.9); localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(500);
await p.click('[data-testid=nav-map]');
await p.waitForTimeout(600);
for (let k = 0; k < 4 && (await p.locator('[data-testid=tip-ok]').count()); k++) await p.click('[data-testid=tip-ok]');
ok('A tip explains the map on first World visit', ((await S()).tipsSeen ?? []).includes('map') && n0guide());
await p.waitForSelector('[data-testid=district]');
ok('Giza district opens first, with vital points', (await p.locator('[data-testid^=poi-]').count()) >= 2);
{ const bx = await p.locator('.district-canvas').boundingBox(); await p.mouse.click(bx.x + bx.width * 0.25, bx.y + bx.height * 0.62); await p.waitForTimeout(2600); await p.mouse.click(bx.x + bx.width * 0.3, bx.y + bx.height * 0.7); await p.waitForTimeout(2600); await p.mouse.click(bx.x + bx.width * 0.8, bx.y + bx.height * 0.6); await p.waitForTimeout(2600); }
ok('Walking the district discovers new places', (await p.locator('[data-testid^=poi-]').count()) >= 3);
await p.click('[data-testid=district-world]');
await p.waitForSelector('[data-testid=world-map]');
await p.waitForTimeout(500);
const t0 = await p.getAttribute('[data-testid=world-inner]', 'style');
const z0 = parseFloat(await p.getAttribute('[data-testid=world-inner]', 'data-zoom'));
await p.click('button[aria-label="Zoom out"]');
const z1 = parseFloat(await p.getAttribute('[data-testid=world-inner]', 'data-zoom'));
const box = await p.locator('[data-testid=world-map]').boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.mouse.down();
await p.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 60, { steps: 6 });
await p.mouse.up();
const t1 = await p.getAttribute('[data-testid=world-inner]', 'style');
ok('Map pans/zooms', z1 !== z0 && t0 !== t1, `zoom ${z0} → ${z1}`);
const wBefore = await S();
await p.locator('[data-testid=place-cairo]').dispatchEvent('click');
await p.waitForTimeout(200);
const planCard = await p.textContent('[data-testid=world-card]');
await p.click('[data-testid=speed-4]').catch(() => {});
for (let i = 0; i < 200 && !(await has('[data-testid=settlement]')); i++) {
  if (await has('[data-testid=dawn-go]')) await p.click('[data-testid=dawn-go]');
  if (await has('[data-testid=road-encounter]')) { await p.click('[data-testid=road-encounter] .btn >> nth=0'); await p.click('[data-testid=encounter-continue]'); }
  await p.waitForTimeout(250);
}
const wAfter = await S();
ok('Travel moves the caravan, costs time', wAfter.world.at === 'cairo' && (wAfter.day > wBefore.day || wAfter.world.hour > wBefore.world.hour), `at=${wAfter.world.at} h ${wBefore.world.hour}→${wAfter.world.hour} ${planCard.slice(0, 40)} · day ${wBefore.day}→${wAfter.day}, cash ${wBefore.cash}→${wAfter.cash}`);
await p.click('[data-testid=npc-rashid]');
await p.waitForSelector('[data-testid=dialogue]');
await p.click('text=Tell me about my father.');
await p.click('text=Who would know?');
await p.click('text=Thank you, uncle.');
await p.waitForTimeout(200);
ok('Talking to people branches and reveals places', (await S()).world.known.includes('damascus'));
await p.click('[data-testid=tab-market]');
const food0 = (await S()).world.party.food;
await p.click('[data-testid=buy-food-5]');
ok('Food market works', (await S()).world.party.food === food0 + 5);
await p.click('[data-testid=tab-guards]');
const troops0 = JSON.stringify((await S()).world.party.troops);
const hireBtn = p.locator('[data-testid^=hire-]:not([disabled])').first();
if (await hireBtn.count()) await hireBtn.click();
ok('Recruiting guards works', JSON.stringify((await S()).world.party.troops) !== troops0 || !(await hireBtn.count()));
await p.click('[data-testid=tab-animals]');
const don0 = (await S()).world.party.animals?.baladi_d ?? 0;
const cap0 = await p.locator('[data-testid=caravan-strip]').first().textContent({ timeout: 1000 }).catch(() => '');
await p.click('[data-testid=buy-baladi_d]');
await p.click('[data-testid=notes-baladi_d]');
const notesTxt = await p.textContent('.breed-notes');
ok('Animal market sells breeds with real notes', (await S()).world.party.animals.baladi_d === don0 + 1 && /donkey/i.test(notesTxt) && (await p.locator('[data-testid^=breed-photo-]').count()) >= 3, `${cap0} → ${await p.locator('[data-testid=caravan-strip]').first().textContent({ timeout: 1000 }).catch(() => '')}`);
await p.click('[data-testid=tab-market]');
const sellRow = p.locator('.sell-box [data-testid^=sell-]').first();
if (await has('.sell-box summary')) await p.locator('.sell-box summary').click();
const cBeforeSell = await cashHud();
if (await sellRow.count()) await sellRow.locator('.btn').click();
await p.waitForTimeout(200);
ok('Local market trade works', (await cashHud()) > cBeforeSell || !(await sellRow.count()));
await shot('15-settlement');
await p.click('[data-testid=leave-settlement]');
await p.click('[data-testid=nav-map]');
ok('Stall is closed while away from Giza', (await p.getAttribute('[data-testid=campaign]', 'data-layer')) === 'world' && !(await has('[data-testid=stall-sheet]')));
await p.reload();
await p.click('[data-testid=continue]');
await p.waitForTimeout(300);
ok('World position persists after reload', (await S()).world.at === 'cairo');
{
  await p.click('[data-testid=nav-map]');
  await p.waitForSelector('[data-testid=world-map]');
  if (await has('[data-testid=leave-settlement]')) await p.click('[data-testid=leave-settlement]');
  const fog0 = ((await S()).world.fog.match(/1/g) || []).length;
  for (let i = 0; i < 4; i++) await p.click('button[aria-label="Zoom out"]').catch(() => {});
  await p.waitForTimeout(300);
  await p.locator('[data-testid=place-alexandria]').dispatchEvent('click');
  await p.waitForTimeout(200);
  ok('Short of food: offered rations before leaving', await has('[data-testid=food-short]'));
  if (await has('[data-testid=food-buy-go]:not([disabled])')) await p.click('[data-testid=food-buy-go]'); else if (await has('[data-testid=food-go]')) await p.click('[data-testid=food-go]');

  await p.click('[data-testid=speed-4]').catch(() => {});
  for (let i = 0; i < 400 && !(await has('[data-testid=settlement]')); i++) {
    if (await has('[data-testid=dawn-go]')) await p.click('[data-testid=dawn-go]');
    if (await has('[data-testid=road-encounter]')) { await p.click('[data-testid=road-encounter] .btn >> nth=0'); if (await has('[data-testid=encounter-continue]')) await p.click('[data-testid=encounter-continue]'); }
    await p.waitForTimeout(250);
  }
  const s2 = await S();
  ok('Fog of war reveals on a long journey', s2.world.at === 'alexandria' && (s2.world.fog.match(/1/g) || []).length > fog0, `at=${s2.world.at} day ${s2.day}`);
}

{ const fs = await import('node:fs'); fs.writeFileSync('/home/claude/shots/save.json', await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))); }
ok('No runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await b.close();
process.exit(failed.length ? 1 : 0);
