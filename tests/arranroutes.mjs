// Arran's Sinai and Port Said books, end to end by ordinary travel (playtest notes, items 1–4 and 8–9):
// the notebook's errand card → "Travel to …" opens a route preview (never the remote town) → walk on
// the map → the Sinai pass card (and on the way back, with the folio's effect shown) → the named
// institution (with "Wait until 08:00" if early) → buy a copy with visible cost → it shows in Stock →
// walk back → give it to Arran → the follow-up unlocks and is visible (pass risk, papers for cargo).
//   PORT=5173 node tests/arranroutes.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const st = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
// read the saved state (the app writes it on every change), not a module import that hot reload can split
const live = () => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('threads-of-fortune-save')).state; return { at: s.world.at, hour: s.world.hour, day: s.day, food: s.world.party.food, cash: s.cash }; });
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const toLab = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]'); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(500);
};
// walk until we are in `town`, handling the pass card, nightfall and anything else that stops the caravan
const walkTo = async (town, label) => {
  for (let i = 0; i < 4000; i++) {
    const l = await live();
    if (l.at === town) return true;
    if (await has('pass-card')) {
      console.log(`   [${label}] pass card: ${(await p.locator('.pass-card__body > p').first().textContent()).slice(0, 90)}`);
      if (await has('pass-folio')) console.log(`   [${label}] folio shown: ${await p.locator('[data-testid=pass-folio]').textContent()}`);
      console.log(`   [${label}] choices: ${(await p.locator('.pass-choice').allInnerTexts()).map((t) => t.split('\n')[0] + ' / ' + (t.match(/Risk: \w+/) ?? [''])[0]).join(' | ')}`);
      if (!(await has('pass-outcome'))) await p.click('[data-testid=pass-escort]');
      await p.waitForSelector('[data-testid=pass-outcome]');
      console.log(`   [${label}] crossing: ${(await p.locator('[data-testid=pass-outcome]').textContent()).slice(0, 80)}`);
      await p.screenshot({ path: `${S}/r-${label}-pass.png` });
      await p.click('[data-testid=pass-continue]');
    }
    for (const id of ['close-stall', 'march-on', 'food-go', 'encounter-leave', 'ambush-ok', 'event-ok', 'arrive-ok']) if (await has(id)) await p.click(`[data-testid=${id}]`).catch(() => {});
    if (await has('travel')) await p.click('[data-testid=travel]').catch(() => {});
    if (await has('speed-4')) await p.click('[data-testid=speed-4]').catch(() => {});
    await p.waitForTimeout(500);
  }
  return false;
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-night-rule', 'march'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  // the playtester's save: Giza, 15:30, little money, 10 days of food, three errands asked for
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'giza', hour: 15.5 }); s.cash = 900; s.reputation = 2; s.world.party.food = 10; s.world.parties = []; s.world.party.animals = { falahi: 1 };
    s.arranBooks = { fibres: { phase: 'returned' }, provisions: { phase: 'returned' }, dyes: { phase: 'requested', day: 1 }, field_safety: { phase: 'requested', day: 1 }, restricted_records: { phase: 'requested', day: 1 } };
    s.labUnlocked = ['fibre', 'provisions']; s.arranVisit = { visitCount: 3, permitStage: 'letter' }; s.world.known = [...new Set([...s.world.known, 'alexandria', 'sinai', 'portsaid', 'suez'])];
    localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  console.log('chips on the map:', (await p.locator('[data-testid=side-tasks]').innerText()).replace(/\n+/g, ' | '));

  // 1. the lab opens on the lab, not on an event; the case file waits
  await toLab();
  console.log('1. entry: modal open?', await has('mummy-study'), '| scene line:', (await p.locator('[data-testid=arran-activity]').textContent()).slice(0, 70));
  await p.click('[data-testid=arran-tab-notebook]'); await p.waitForTimeout(200);
  console.log('   notebook scene line:', await p.locator('[data-testid=arran-activity]').textContent(), '| Arran:', await p.locator('[data-testid=arran-talk]').getAttribute('data-place'), await p.locator('[data-testid=arran-talk]').getAttribute('data-pose'));
  const card = p.locator('[data-testid=arran-errand-field_safety]');
  console.log('2. Sinai errand card:', (await card.innerText()).replace(/\n+/g, ' | ').slice(0, 520));
  await card.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${S}/r-errand-card.png` });
  if (await has('errand-buyfood-field_safety')) { await p.click('[data-testid=errand-buyfood-field_safety]'); console.log('   bought food:', await p.locator('[data-testid=errand-note-field_safety]').textContent(), '| food now', (await live()).food); }

  if (process.env.START === 'sinai') {
    await edit(`s.world.at = 'sinai'; const t = { x: 489.7, y: 460.9 }; s.world.x = t.x; s.world.y = t.y; s.day = 16; s.world.hour = 6.5; s.crossings = { 'giza>sinai:1': { choice: 'escort', risk: 40, outcome: { kind: 'hard', text: '', fatigue: 18, foodLost: 2, cashLost: 0, cargoLost: false, extraDays: 0 } } };`);
    await reload(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
    console.log('   (resumed at St Catherine\'s; the outward walk was verified in a full run: arrived day 16, 25 March)');
  } else {
  // travel: a route preview, not the remote town
  await p.click('[data-testid=errand-travel-field_safety]'); await p.waitForTimeout(1200);
  console.log('   after "Travel to": remote town panel open?', await has('town-menu'), '| plan card with Travel button?', await has('travel'), '| still at', (await live()).at);
  await p.screenshot({ path: `${S}/r-route-preview.png` });
  const t0 = await live();
  const got = await walkTo('sinai', 'out');
  const t1 = await live();
  console.log('   arrived at St Catherine\'s:', got, `| day ${t0.day} ${t0.hour.toFixed(1)}h → day ${t1.day} ${t1.hour.toFixed(1)}h | food ${t0.food} → ${t1.food}`);
  }

  // the institution: open the town, go to the records room; wait for the doors if early
  await edit(`s.world.hour = 6.5;`); await reload(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (!(await has('town-menu'))) { await p.locator('[data-testid=place-sinai]').dispatchEvent('click'); await p.waitForTimeout(1200); if (!(await has('town-menu')) && (await has('town-menu-open'))) await p.click('[data-testid=town-menu-open]'); }
  await p.waitForSelector('[data-testid=town-menu]'); await p.waitForTimeout(1200); await p.click('[data-testid=menu-library]'); await p.waitForSelector('[data-testid=library]');
  console.log('3. at 06:30:', await p.locator('[data-testid=library-closed]').innerText().then((t) => t.replace(/\n+/g, ' | ')));
  await p.click('[data-testid=library-wait]'); await p.waitForTimeout(200);
  console.log('   waited: hour', (await live()).hour, '| closed card still?', await has('library-closed'));
  await p.click('[data-testid=library-search-field_safety]'); await p.waitForTimeout(200);
  const c0 = (await live()).cash;
  await p.click('[data-testid=library-copy-field_safety]'); await p.waitForTimeout(300);
  console.log('   copy:', (await p.locator('[data-testid=library-note]').textContent()).slice(0, 80), '| paid', c0 - (await live()).cash, '| duplicate offered?', await has('library-dup-field_safety'));
  await p.screenshot({ path: `${S}/r-library.png` });
  await p.click('[data-testid=library-leave]');
  await p.click('[data-testid=nav-inventory]'); await p.waitForTimeout(300);
  console.log('   in Stock:', await p.locator('[data-testid=inv-papers]').innerText().then((t) => t.replace(/\n+/g, ' | ')));

  // back to Giza through the passes
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
  if (await has('menu-leave')) await p.click('[data-testid=menu-leave]');
  await p.locator('[data-testid=place-giza]').dispatchEvent('click'); await p.waitForTimeout(800);
  const back = await walkTo('giza', 'back');
  console.log('   back in Giza:', back);
  await toLab(); await p.click('[data-testid=arran-tab-notebook]');
  await p.click('[data-testid=arran-return-field_safety]'); await p.waitForTimeout(300);
  let s = await st();
  console.log('4. delivered:', s.arranBooks.field_safety.phase, '| unlocked', JSON.stringify(s.labUnlocked), '| papers', s.papers.length);
  await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(200);
  console.log('   follow-up: cargo checks open?', await has('arran-cargo-checkbtn-powder'), '| blasting charge buyable?', await p.locator('[data-testid=cabinet-buy-charge]').textContent());
  await p.click('[data-testid=arran-leave]');

  // 5. Port Said: the customs ledger, then carry restricted cargo lawfully vs not
  await toLab(); await p.click('[data-testid=arran-tab-notebook]');
  await p.click('[data-testid=errand-travel-restricted_records]'); await p.waitForTimeout(1200);
  console.log('5. Port Said route preview:', await has('travel'), '| remote panel?', await has('town-menu'));
  const ok2 = await walkTo('portsaid', 'portsaid');
  console.log('   arrived at Port Said:', ok2, '| hour', (await live()).hour.toFixed(1));
  await edit(`s.world.hour = 9;`); await reload(); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(800);
  if (!(await has('town-menu'))) { await p.locator('[data-testid=place-portsaid]').dispatchEvent('click'); await p.waitForTimeout(1200); if (!(await has('town-menu')) && (await has('town-menu-open'))) await p.click('[data-testid=town-menu-open]'); }
  await p.waitForTimeout(1200); await p.click('[data-testid=menu-library]'); await p.waitForSelector('[data-testid=library]');
  await p.click('[data-testid=library-search-restricted_records]'); await p.click('[data-testid=library-copy-restricted_records]'); await p.waitForTimeout(200);
  console.log('   extract bought:', (await st()).arranBooks.restricted_records.phase);
  await p.click('[data-testid=library-leave]');
  await p.click('[data-testid=nav-map]'); await p.waitForTimeout(600);
  if (await has('menu-leave')) await p.click('[data-testid=menu-leave]');
  await p.locator('[data-testid=place-giza]').dispatchEvent('click'); await p.waitForTimeout(800);
  console.log('   back in Giza:', await walkTo('giza', 'home2'));
  await toLab(); await p.click('[data-testid=arran-tab-notebook]'); await p.click('[data-testid=arran-return-restricted_records]'); await p.waitForTimeout(200);
  await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(200);
  console.log('   follow-up: papers offered for powder?', await has('arran-cargo-licensed-powder'));
  // patrol reasons: one lawful, one without papers, at a checkpoint (Suez → Sinai; Giza → Tarabin via Suez is not a checkpoint)
  await p.click('[data-testid=arran-cargo-licensed-powder]'); await p.waitForTimeout(150);
  await p.click('[data-testid=arran-cargo-take-sheep_dip]'); await p.waitForTimeout(150);
  await p.click('[data-testid=arran-leave]');
  await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); const g = m.useGame; g.setState((s) => ({ cargo: s.cargo.map((c) => ({ ...c, collected: true, to: c.jobId === 'sheep_dip' ? 'bedouin' : c.to })) })); g.getState().arriveAt('suez'); });
  const pat = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); const s = m.useGame.getState(); return { note: s.jobNote, patrols: s.patrols }; });
  console.log('6. patrol at Suez:', pat.note);
  await toLab(); await p.click('[data-testid=arran-tab-road]'); await p.waitForTimeout(200);
  await p.locator('[data-testid=arran-patrols]').scrollIntoViewIfNeeded().catch(() => {});
  console.log('   in the lab:', await p.locator('[data-testid=arran-patrols]').innerText().then((t) => t.replace(/\n+/g, ' | ')).catch(() => 'none'), '| watch:', await p.locator('[data-testid=arran-attention]').textContent());
  await p.screenshot({ path: `${S}/r-patrols.png` });
} catch (e) {
  console.log('FAILED', e.message.split('\n')[0]);
  await p.screenshot({ path: `${S}/r-fail.png` });
}
console.log('errors', JSON.stringify(errs));
await b.close();
