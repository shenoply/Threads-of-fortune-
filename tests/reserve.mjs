// Putting a rug aside for a buyer: Malek agrees a price but is not convinced; you keep the rug for
// him; another buyer is not shown it (and cannot be); Malek comes back, finds it first and buys it.
// Then the Stock controls, and a hold that lapses with a note.
//   PORT=5173 SHOTS=/tmp/malek node tests/reserve.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173', S = process.env.SHOTS ?? '/tmp/malek';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import('/src/game/state/store.ts'); return new Function('g', 'set', 'get', src)(m.useGame.getState(), m.useGame.setState, m.useGame.getState); }, fn);
const serve = async (who) => {
  await edit(`s.queue = ['${who}']; s.arrivals = [s.world.hour + 0.05]; s.visitIdx = 0; s.encounter = null; s.dayOver = false;`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(800);
  await p.click('[data-testid=stall-wait]'); await p.waitForTimeout(1200);
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek']; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 10 }); s.cash = 300; s.relationships.yusuf = { ...(s.relationships.yusuf || {}), visits: 1, purchases: 0, spent: 0, affinity: 0, bad: 0, lastLines: [] };
    s.malek = { stockDay: s.day, sold: {}, visits: 1, firstDay: 1, lastVisitDay: s.day, orders: [], said: [], story: { nextStage: 6, lastStoryDay: 1, completed: [1,2,3,4,5] } };`);
  await reload();

  // 1. Malek: the price is agreed, he is not convinced (a stubborn day), you keep the rug for him
  await serve('malek');
  const uid = await game(`const e = g.encounter; if (!e || e.buyerId !== 'malek') return null; const u = g.inventory[0].uid; g.present(u); set({ encounter: { ...get().encounter, malekBar: 100 } }); return u;`);
  for (let i = 0; i < 5; i++) { const r = await game(`const e = get().encounter; if (!e || e.outcome) return 'done'; if (e.buyerOffer) { get().act('accept_offer'); return 'acc'; } get().act('name_price', 120); return 'ask';`); if (r === 'done') break; }
  console.log('1. outcome:', JSON.stringify(await game(`const e = get().encounter; return { outcome: e.outcome, unsure: e.malekUnsure, last: e.log.filter((l) => l.speaker === 'buyer').pop()?.text }`)));
  await p.waitForTimeout(400);
  console.log('   result text:', (await p.locator('[data-testid=result] .r-main span').textContent()).slice(0, 120));
  console.log('   reserve button:', (await p.locator('[data-testid=reserve-after]').textContent().catch(() => 'none')));
  await p.screenshot({ path: `${S}/reserve-after.png` });
  await p.click('[data-testid=reserve-after]'); await p.waitForTimeout(200);
  console.log('   ->', await p.locator('[data-testid=reserve-done]').textContent());
  let s = await game(`return { held: get().inventory.find((i) => i.uid === '${uid}'), wants: get().malek.wantsBack }`);
  console.log('   rug held for', s.held.reservedFor, 'until day', s.held.reservedUntil, '| Malek wants back', JSON.stringify(s.wants));
  await p.click('[data-testid=next-visit]'); await p.waitForTimeout(400);

  // 2. another buyer: not shown it, and cannot be shown it
  await edit(`s.day = s.day + 1; s.world.hour = 10;`);
  await serve('yusuf');
  const y = await game(`const e = get().encounter; get().present('${uid}'); const e2 = get().encounter; return { buyer: e.buyerId, onCounter: e.rugsShown.concat(e.displayed || []).includes('${uid}'), presented: e2.presented === '${uid}', note: e2.log[e2.log.length - 1].text }`);
  console.log('2. Yusuf:', JSON.stringify(y));
  await game(`get().letGo()`); await p.waitForTimeout(300);

  // 3. Malek comes back: the kept rug first, he notices, and buys more easily
  await edit(`s.day = s.day + 1; s.world.hour = 10;`);
  await serve('malek');
  const back = await game(`const e = get().encounter; return { first: (e.displayed || [])[0], ret: e.malekReturn, log: e.log.map((l) => l.text).filter((t) => /kept|aside|thought/i.test(t)) }`);
  console.log('3. Malek back:', JSON.stringify(back));
  await game(`get().present('${uid}')`);
  for (const a of ['ask_room', 'durability']) await game(`if (!get().encounter.outcome) get().act('${a}')`);
  for (let i = 0; i < 5; i++) { const r = await game(`const e = get().encounter; if (!e || e.outcome) return 'done'; if (e.buyerOffer) { get().act('accept_offer'); return 'acc'; } get().act('name_price', 150); return 'ask';`); if (r === 'done') break; }
  console.log('   haggle:', JSON.stringify(await game(`const e = get().encounter; return { stage: e.stage, presented: e.presented, interest: e.interest, trust: e.trust, fit: e.presentedFit, offer: e.buyerOffer, ask: e.askPrice, patience: e.patience, tail: e.log.slice(-4).map((l) => l.speaker + ': ' + l.text.slice(0, 70)) }`)));
  s = await game(`const e = get().encounter; return { outcome: e.outcome, price: e.salePrice, still: !!get().inventory.find((i) => i.uid === '${uid}'), rug: get().malek.rug, wants: get().malek.wantsBack ?? null }`);
  console.log('   ->', JSON.stringify(s));
  await p.screenshot({ path: `${S}/reserve-back.png` });
  await p.click('[data-testid=next-visit]').catch(() => {}); await p.waitForTimeout(300);

  // 4. Stock: put a rug aside for Yusuf, see it, free it
  await p.click('[data-testid=nav-inventory]').catch(() => {}); await p.waitForTimeout(700);
  const first = p.locator('[data-testid=reserve-select]').first();
  console.log('4. stock options:', (await first.locator('option').allTextContents()).join(', '));
  await first.selectOption('yusuf'); await p.waitForTimeout(300);
  console.log('   badge:', (await p.locator('[data-testid=reserved]').first().textContent()).trim());
  await p.locator('[data-testid=reserved]').first().screenshot({ path: `${S}/reserve-stock.png` }).catch(() => {});
  // 5. the hold lapses at the end of its last day, with a note
  await game(`const inv = get().inventory.map((i) => i.reservedFor ? { ...i, reservedUntil: get().day } : i); set({ inventory: inv });`);
  await game(`get().endDay()`); await p.waitForTimeout(300);
  const lapse = await game(`const s2 = get(); return { notes: (s2.lastSummary?.notes || []).filter((n) => /stop keeping/.test(n)), held: s2.inventory.filter((i) => i.reservedFor && (i.reservedUntil ?? 1e9) >= s2.day).length }`);
  console.log('5. lapse:', JSON.stringify(lapse));
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/reserve-fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
