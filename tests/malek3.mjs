// Malek in the flow of the game: he comes to your stall and buys a rug; the rug lies under his tables
// and puts plates on his tab; he greets you about it once; the talk topics; and the ways in from the
// stall's quiet hours and the evening strip.
//   PORT=5173 SHOTS=/tmp/malek node tests/malek3.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import('/src/game/state/store.ts'); return new Function('g', 'set', src)(m.useGame.getState(), m.useGame.setState); }, fn);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 12.9 }); s.cash = 300; s.condition = { fatigue: 10, dependence: 0, fed: 60, water: 70 };
    s.malek = { stockDay: s.day, sold: {}, visits: 1, lastVisitDay: s.day, orders: [], said: [], story: { nextStage: 1, lastStoryDay: null, completed: [] } };
    s.queue = ['malek']; s.arrivals = [13]; s.visitIdx = 0;`);
  await reload();

  // 1. at the stall: Malek buys a rug
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1500);
  // show him the darkest, toughest rug you have and take whatever he offers
  // this test is about what follows a sale, so play a Malek who is already convinced (how hard he is
  // to convince is measured in tests/malek-haggle.ts)
  const pick = await game(`const e = g.encounter; if (!e || e.buyerId !== 'malek') return 'no Malek'; const uid = g.inventory[0].uid; g.present(uid); return uid;`);
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); const e = m.useGame.getState().encounter; m.useGame.setState({ encounter: { ...e, malekBar: 0, interest: 95, trust: 80 } }); });
  for (let i = 0; i < 6; i++) {
    const r = await game(`const e = g.encounter; if (!e || e.outcome) return 'done'; if (e.buyerOffer) { g.act('accept_offer'); return 'accepted'; } g.act('name_price', 150); return 'asked';`);
    if (r === 'done') break;
  }
  await p.waitForTimeout(500);
  const enc = await game(`const e = g.encounter; return e ? { outcome: e.outcome, price: e.salePrice } : null;`);
  await p.screenshot({ path: `${S}/m3-stall-sale.png` });
  // the stall closes the visit when you move on
  if (await has('next-customer')) await p.click('[data-testid=next-customer]');
  else await game(`if (g.nextVisit) g.nextVisit();`);
  await p.waitForTimeout(600);
  let s = await st();
  console.log('1. stall:', JSON.stringify(enc), '| malek rug', s.malek.rug, 'tab', s.malek.tab, 'outcome', s.malek.stallOutcome, '| journal:', (s.journal.filter((j) => /Malek/.test(j.text)).pop()?.text ?? '').slice(0, 100));

  // 2. at his shop: he mentions the rug once, the rug is on his floor, the tab pays
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(500);
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(600);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-door]', { timeout: 20000 });
  console.log('2. greeting:', (await p.locator('.malek-say').textContent()).slice(0, 110));
  await p.click('[data-testid=malek-enter]'); await p.waitForSelector('[data-testid=malek-room]', { timeout: 20000 }); await p.waitForTimeout(1500);
  console.log('   rug on the floor:', await has('malek-rug'));
  await p.screenshot({ path: `${S}/m3-rug-room.png` });
  await p.click('[data-testid=malek-tab-menu]');
  console.log('   tab note on kofta:', await p.locator('[data-testid=malek-item-malek_kofta] .malek-tabnote').count(), '| on kebab:', await p.locator('[data-testid=malek-item-malek_kebab] .malek-tabnote').count());
  const cash0 = (await st()).cash;
  await p.click('[data-testid=malek-buy-malek_kofta]'); await p.waitForSelector('[data-testid=malek-confirm]');
  await p.screenshot({ path: `${S}/m3-tab-confirm.png` });
  await p.click('[data-testid=malek-pay-tab]'); await p.waitForTimeout(300);
  s = await st();
  console.log('   kofta on the tab: cash change', s.cash - cash0, '| tab left', s.malek.tab, '|', (await p.locator('[data-testid=malek-result] .malek-say').textContent()).slice(0, 90));
  await p.click('[data-testid=malek-result-ok]');
  // 3. talk topics
  await p.click('[data-testid=malek-talk]');
  const lines = [];
  for (const t of ['storeroom', 'storeroom', 'name', 'neighbours', 'road', 'rugs']) { await p.click(`[data-testid=malek-topic-${t}]`); await p.waitForTimeout(150); lines.push(`${t}: ${(await p.locator('[data-testid=malek-speech]').textContent()).replace('MALEK ', '').slice(0, 70)}`); }
  console.log('3. talk:\n   ' + lines.join('\n   '));
  await p.screenshot({ path: `${S}/m3-talk.png` });
  await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(400);
  // the second visit does not mention the sale again
  await p.locator('[data-testid=poi-malek]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-malek]');
  await p.waitForSelector('[data-testid=malek-door]', { timeout: 20000 });
  console.log('   second visit greeting:', (await p.locator('.malek-say').textContent()).slice(0, 90));
  await p.click('[data-testid=malek-leave]'); await p.waitForTimeout(400);

  // 4. from the stall's quiet hours, hungry
  await edit(`s.world.hour = 12; s.queue = ['samira', 'yusuf']; s.arrivals = [8, 15.5]; s.visitIdx = 1; s.condition = { ...s.condition, fed: 5 }; s.encounter = null;`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(900);
  console.log('4. idle: lunch button', await has('idle-wait-malek'), '|', (await p.locator('[data-testid=idle-wait-malek]').textContent().catch(() => '')).trim());
  await p.screenshot({ path: `${S}/m3-idle.png` });
  await p.click('[data-testid=idle-wait-malek]'); await p.waitForTimeout(1500);
  console.log('   opens the shop:', await has('malek-shop'), '| greeting (hungry):', (await p.locator('.malek-say').textContent().catch(() => '')).slice(0, 80));
  if (await has('malek-leave')) await p.click('[data-testid=malek-leave]');

  // 5. the evening strip
  await edit(`s.world.hour = 20.2;`); await reload();
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); m.useGame.setState({ dayOver: true }); });
  await p.waitForTimeout(500);
  console.log('5. evening: supper button', await has('malek-evening'));
  await p.click('[data-testid=malek-evening]'); await p.waitForTimeout(1500);
  console.log('   opens the shop:', await has('malek-shop'), '| scene', await p.locator('[data-testid=malek-door]').getAttribute('data-scene').catch(() => '-'));
  await p.screenshot({ path: `${S}/m3-evening.png` });
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/m3-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
