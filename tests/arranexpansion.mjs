// Arran expansion acceptance playthroughs (docs/handoff: live-test fixes + restore the expansion).
//   PORT=5173 W=360 H=780 TAG=p360 node tests/arranexpansion.mjs
// 1. rub vs wash: an old v17 "fastness" result is renamed to the rub without a charge; wash is its own test
// 2. provisions: McCarrison returned → Road tab → confirm card (cost, time, can/cannot) → report; road diet
// 3. tonic: bought at the Cairo chemist, drunk → alert today, crash tomorrow, dependence recorded
// 4. Sinai pass: walking to St Catherine's asks how to cross, with time, cost and risk; resolved once
// 5. cargo: hazard check, take with and without papers; a patrol at Jaffa, resolved once per visit
// 6. mummy: book returned → letter → museum store in Cairo → permission → linen study next day, replay
// Every step checks tap targets ≥44px in the lab and that nothing overflows the phone width.
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844), tag = process.env.TAG ?? 'phone';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const store = (fn, arg) => p.evaluate(async ([src, a]) => { const m = await import('/src/game/state/store.ts'); return new Function('g', 'a', src)(m.useGame.getState(), a); }, [fn, arg]);
const toLab = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]', { timeout: 20000 }); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(500);
  if (await has('mummy-later')) { console.log('   (the linen study is waiting: permission has come through)'); await p.click('[data-testid=mummy-later]'); }
};
const toTown = async (town) => {
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(500);
  await p.locator(`[data-testid=place-${town}]`).dispatchEvent('click'); await p.waitForTimeout(600);
  if (!(await has('town-menu')) && (await has('town-menu-open'))) await p.click('[data-testid=town-menu-open]');
  await p.waitForSelector('[data-testid=town-menu]');
};
// phone checks: page does not scroll sideways; every visible button in the lab panel is at least 44px tall
const phone = async (where) => {
  const r = await p.evaluate(() => {
    const over = document.documentElement.scrollWidth > window.innerWidth + 1;
    const small = [...document.querySelectorAll('.arran-lab__card button, .arran-lab__tabs button, .pass-card button, .arran-lab__header button')]
      .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44 && !e.classList.contains('linklike'))
      .map((e) => `${e.dataset.testid || e.textContent.trim().slice(0, 20)}=${Math.round(e.getBoundingClientRect().height)}`);
    return { over, small };
  });
  console.log(`  [${where}] sideways scroll: ${r.over} | taps under 44px: ${r.small.length ? r.small.join(', ') : 'none'}`);
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  // a v17 save with an old "fastness" result on the canal kilim, which really does lose colour
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'giza', hour: 9 }); s.cash = 5000; s.queue = []; s.visitIdx = 0; s.world.party.food = 4;
    s.inventory = s.inventory.slice(0, 2);
    s.inventory.push({ uid: 'kilim-t', typeId: 'village-kilim-canal', condition: 'Good', restored: false, provenance: 'Uncertain', paid: 100, notes: [], stored: true });
    s.arranFindings = [{ id: 'kilim-t:fastness', subjectId: 'kilim-t', service: 'fastness', verdict: 'inconsistent', confidence: 'moderate', claim: 'Colour-fast when washed', evidence: ['The red ran pink onto the cloth.'], limitations: [], day: 1 }];
    s.labUnlocked = ['fibre', 'dye']; s.arranBooks = { fibres: { phase: 'returned' }, dyes: { phase: 'returned' } };
    s.arranVisit = { visitCount: 3 }; d.version = 17; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  let s = await st();
  const f = s.arranFindings[0];
  console.log('1. migrated rub:', f.claim, '|', f.evidence[0], '| procedure', f.procedure, '| cash still', s.cash, '| wash unlocked', s.labUnlocked.includes('wash'), '| condition', JSON.stringify(s.condition));
  await toLab();
  await p.screenshot({ path: `${S}/x-${tag}-room.png` });
  console.log('   Arran in the room:', await p.locator('[data-testid=arran-talk]').getAttribute('data-place'), await p.locator('[data-testid=arran-talk]').getAttribute('data-pose'));
  await p.click('[data-testid=arran-rug-kilim-t]'); await p.waitForTimeout(300);
  console.log('   tests offered:', (await p.locator('.arran-test b').allTextContents()).join(' / '));
  await p.click('[data-testid=arran-test-wash-kilim-t]'); await p.waitForSelector('[data-testid=arran-confirm]');
  await p.screenshot({ path: `${S}/x-${tag}-wash-confirm.png` });
  await phone('wash confirm');
  const c0 = (await st()).cash;
  await p.click('[data-testid=arran-confirm-pay]'); await p.waitForSelector('[data-testid=arran-finding]');
  console.log('   wash result:', await p.locator('[data-testid=arran-verdict]').textContent(), '| charged', c0 - (await st()).cash);
  await p.click('[data-testid=arran-back]');

  // 2. provisions
  await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(300);
  console.log('2. road tab locked provisions:', await has('arran-road-book-provisions'), '| cargo locked:', await has('arran-road-book-cargo'));
  await edit(`s.arranBooks.provisions = { phase: 'copy_acquired', copyId: 'pv1', day: s.day }; s.papers = [{ id: 'pv1', bookId: 'provisions', kind: 'copy', title: 'x', from: 'cairo', day: s.day }];`);
  await reload(); await toLab();
  await p.click('[data-testid=arran-tab-notebook]'); await p.click('[data-testid=arran-return-provisions]'); await p.waitForTimeout(300);
  await p.click('[data-testid=arran-tab-road]');
  await p.click('[data-testid=arran-provisions]'); await p.waitForSelector('[data-testid=arran-confirm]');
  console.log('   confirm:', (await p.locator('[data-testid=arran-confirm]').innerText()).replace(/\n+/g, ' | ').slice(0, 200));
  const c1 = (await st()).cash;
  await p.click('[data-testid=arran-confirm-pay]'); await p.waitForSelector('[data-testid=arran-provisions-report]');
  await p.screenshot({ path: `${S}/x-${tag}-provisions.png` });
  console.log('   report:', (await p.locator('[data-testid=arran-provisions-report]').innerText()).replace(/\n+/g, ' | ').slice(0, 220), '| charged', c1 - (await st()).cash);
  await p.click('[data-testid=arran-diet]'); await p.waitForTimeout(200);
  console.log('   diet until day', (await st()).condition.dietUntil);
  await phone('road');

  // 3. tonic from the Cairo chemist
  await p.click('[data-testid=arran-leave]');
  await edit(`s.world.at = 'cairo'; s.condition = { ...s.condition, fatigue: 60 };`); await reload();
  await toTown('cairo');
  await p.click('[data-testid=menu-chemist]'); await p.waitForSelector('[data-testid=cairo-chemist]');
  await p.click('[data-testid=cairo-buy-tonic]'); await p.click('[data-testid=cairo-take-tonic]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${S}/x-${tag}-chemist.png` });
  s = await st();
  console.log('3. tonic: day', s.day, '| alert', s.condition.alertDay, '| crash', s.condition.crashDay, '| dependence', s.condition.dependence, '|', await p.locator('[data-testid=cairo-chemist-note]').textContent());
  const fx = await p.evaluate(async (d) => { const m = await import('/src/game/systems/fieldwork.ts'); const c = { fatigue: 60, alertDay: d, crashDay: d + 1, dependence: 1 }; return [m.fatigueEffect(c, d), m.fatigueEffect(c, d + 1)]; }, s.day);
  console.log('   at the stall today', JSON.stringify(fx[0]), '| tomorrow', JSON.stringify(fx[1]));
  await p.click('[data-testid=cairo-chemist-leave]');

  // 6 (part). the permission letter: return the dye book earlier → letter
  await edit(`s.arranVisit = { visitCount: 4, permitStage: 'letter' };`); await reload();
  await toTown('cairo');
  console.log('6. museum menu:', await p.locator('[data-testid=menu-museum]').textContent());
  await p.click('[data-testid=menu-museum]'); await p.click('[data-testid=cairo-deliver-letter]'); await p.waitForTimeout(200);
  s = await st();
  console.log('   permit:', s.arranVisit.permitStage, 'from day', s.arranVisit.permitDay, '(today', s.day, ')');
  await p.click('[data-testid=cairo-museum-leave]');

  // 7. Arran's cabinet: remedies, a poison for moth, licensed powder goods
  await edit(`s.world.at = 'giza'; s.world.hour = 10; s.world.party.troops = { bedouin: 2 };`); await reload();
  await toLab(); await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(200);
  console.log('7. cabinet:', (await p.locator('[data-testid^=cabinet-] b').allTextContents()).join(' / '));
  console.log('   charge before the folio:', await p.locator('[data-testid=cabinet-buy-charge]').textContent());
  const s0 = (await st()).world.party;
  for (const id of ['khamsin', 'rockets', 'cartridges', 'revolver', 'moth', 'restorative']) {
    await p.click(`[data-testid=cabinet-buy-${id}]`); await p.waitForSelector('[data-testid=arran-confirm]');
    if (id === 'moth') { console.log('   moth card:', (await p.locator('[data-testid=arran-confirm]').innerText()).replace(/\n+/g, ' | ').slice(0, 260)); await p.screenshot({ path: `${S}/x-${tag}-cabinet-confirm.png` }); }
    await p.click('[data-testid=arran-confirm-pay]'); await p.waitForTimeout(200);
  }
  await p.click('[data-testid=cabinet-use-restorative]'); await p.waitForTimeout(150);
  s = await st();
  console.log('   held', JSON.stringify(s.cabinet), '| khamsin until', s.khamsinUntil, '| arms', s.world.party.arms, '| mothproof', s.inventory.every((i) => i.mothproof), '| fatigue', s.condition.fatigue);
  await p.locator('[data-testid=cabinet-moth]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${S}/x-${tag}-cabinet.png` });
  await phone('cabinet');
  await p.click('[data-testid=arran-leave]');

  // 4. the Sinai pass (field-safety errand requested), walking from Suez
  await edit(`s.world.at = 'suez'; s.world.hour = 8; s.arranBooks.field_safety = { phase: 'requested', day: s.day }; s.world.party.food = 40; s.world.known = [...new Set([...(s.world.known ?? []), 'sinai', 'suez', 'bedouin'])];`); await reload();
  console.log('4. side tasks:', (await p.locator('[data-testid=side-tasks]').innerText()).replace(/\n+/g, ' | '));
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
  await p.locator('[data-testid=place-sinai]').dispatchEvent('click'); await p.waitForTimeout(700);
  if (await has('food-go')) await p.click('[data-testid=food-go]');
  if (!(await has('pass-card')) && (await has('travel'))) await p.click('[data-testid=travel]');
  // the caravan walks to the narrows; the card comes up there, part way along
  for (let i = 0; i < 120 && !(await has('pass-card')); i++) { if (await has('speed-4')) await p.click('[data-testid=speed-4]').catch(() => {}); for (const id of ['close-stall', 'march-on']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {}); await p.waitForTimeout(500); }
  if (await has('pass-card')) {
    await p.screenshot({ path: `${S}/x-${tag}-pass.png` });
    console.log('   kit:', await p.locator('[data-testid=pass-kit]').textContent().catch(() => 'none'));
    console.log('   choices:', (await p.locator('.pass-choice').allInnerTexts()).map((t) => t.replace(/\n+/g, ' / ')).join(' || '));
    await phone('pass');
    await p.click('[data-testid=pass-guide]'); await p.waitForSelector('[data-testid=pass-outcome]');
    const k = Object.keys((await st()).crossings)[0];
    console.log('   used up:', JSON.stringify((await st()).cabinet));
    const o1 = (await st()).crossings[k];
    console.log('   outcome:', o1.outcome.kind, '|', o1.outcome.text.slice(0, 70));
    const again = await store('return g.crossPass(a, "proceed")', k);
    console.log('   second resolution returns the stored one:', again.repeated, again.outcome.kind === o1.outcome.kind);
    await p.screenshot({ path: `${S}/x-${tag}-pass-outcome.png` });
    await p.click('[data-testid=pass-continue]');
  } else console.log('   PASS CARD NOT SHOWN');

  // 5. cargo: unlock the folio and the ledger, check, take with and without papers
  await p.goto('about:blank'); await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(300); // stop the walk before editing the save
  await edit(`s.world.at = 'giza'; s.world.hour = 9; s.labUnlocked = [...s.labUnlocked, 'cargo', 'records']; s.cargo = []; s.cargoChecks = []; s.attention = 0;`); await reload();
  await toLab(); await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(200);
  await p.click('[data-testid=arran-cargo-checkbtn-cocaine]'); await p.waitForSelector('[data-testid=arran-confirm]');
  await p.click('[data-testid=arran-confirm-pay]'); await p.waitForTimeout(300);
  console.log('5. check:', await p.locator('[data-testid=arran-cargo-check-cocaine]').textContent());
  await p.click('[data-testid=arran-cargo-licensed-cocaine]'); await p.waitForTimeout(200);
  await p.click('[data-testid=arran-cargo-take-powder]'); await p.waitForTimeout(200);
  await p.locator('[data-testid=arran-cargo-powder]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${S}/x-${tag}-cargo.png` });
  s = await st();
  console.log('   cargo:', s.cargo.map((c) => `${c.jobId}:${c.paperwork}:${c.collected ? 'loaded' : 'to collect'}`).join(', '), '| attention', s.attention);
  console.log('   law notes shown:', await p.locator('[data-testid=arran-law] li').count());
  await phone('cargo');
  await p.click('[data-testid=arran-leave]');
  // arrive at Port Said (collect), then Jaffa (patrol + delivery); each patrol keyed so a reload cannot reroll it
  await store('g.arriveAt("portsaid")');
  const afterPS = await store('const s = g; return { cargo: s.cargo, note: s.jobNote, patrols: s.patrols }');
  console.log('   at Port Said:', afterPS.cargo.map((c) => `${c.jobId}:${c.collected}`).join(', '), '| patrols', JSON.stringify(afterPS.patrols), '|', (afterPS.note || '').slice(0, 90));
  await store('g.arriveAt("jaffa")');
  const afterJ = await store('return { cargo: g.cargo, note: g.jobNote, patrols: g.patrols, cash: g.cash }');
  console.log('   at Jaffa:', afterJ.cargo.map((c) => c.jobId).join(', ') || 'delivered', '| patrols', JSON.stringify(afterJ.patrols), '|', (afterJ.note || '').slice(0, 120));
  const pk = Object.keys(afterJ.patrols)[0];
  await store('g.arriveAt("jaffa")');
  const again = await store('return g.patrols');
  console.log('   same visit, no reroll:', JSON.stringify(again[pk]) === JSON.stringify(afterJ.patrols[pk]));

  // 6. the linen study the day after permission
  await edit(`s.world.at = 'giza'; s.world.hour = 10; s.arranVisit = { ...s.arranVisit, permitStage: 'granted', permitDay: s.day, mummyIntroductionSeen: false, lastActivityDay: undefined };`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]'); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(800);
  console.log('   entry is the plain lab (no modal):', !(await has('mummy-study')), '| case file offered:', (await has('arran-mummy-open')) + (await has('arran-scene-case')));
  console.log('   offered in his greeting:', await has('arran-scene-case'));
  await p.click((await has('arran-scene-case')) ? '[data-testid=arran-scene-case]' : '[data-testid=arran-mummy-open]'); await p.waitForSelector('[data-testid=mummy-study]');
  await p.screenshot({ path: `${S}/x-${tag}-mummy.png` });
  for (let i = 0; i < 12 && (await has('mummy-next')); i++) { await p.click('[data-testid=mummy-next]'); await p.waitForTimeout(250); }
  console.log('   study seen:', (await st()).arranVisit.mummyIntroductionSeen);
  await p.click('[data-testid=arran-tab-notebook]'); await p.waitForTimeout(200);
  console.log('   replay in notebook:', await has('arran-mummy-replay'));
  await phone('notebook');
} catch (e) {
  console.log('FAILED', e.message.split('\n')[0]);
  await p.screenshot({ path: `${S}/x-${tag}-fail.png` });
}
console.log('errors', JSON.stringify(errs));
await b.close();
