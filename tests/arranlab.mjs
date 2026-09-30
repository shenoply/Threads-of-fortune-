// Arran's laboratory and his books. Walk to the lab in Giza; rug first, then a test; fibre is locked
// until his Matthews comes back. Fetch it: ask in the notebook, search the Cairo catalogue, buy a copy
// you may keep (borrowing is refused), reload, give it to Arran, and the fibre test opens. Also:
// charged once, cut consent, closed at night, lost copy, duplicate return, v13/v14 save migration.
//   PORT=5173 node tests/arranlab.mjs   (W/H/TAG set the viewport and screenshot names)
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
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(700); };
const toLab = async () => {
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(400);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]', { timeout: 20000 }); await p.waitForTimeout(300);
};
const toTown = async (town) => {
  await p.click('[data-testid=nav-map]').catch(() => {}); await p.waitForTimeout(500);
  await p.locator(`[data-testid=place-${town}]`).dispatchEvent('click'); await p.waitForTimeout(600);
  if (!(await has('town-menu')) && (await has('town-menu-open'))) await p.click('[data-testid=town-menu-open]');
  await p.waitForSelector('[data-testid=town-menu]');
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = [];
    Object.assign(s.world, { at: 'giza', hour: 2 }); s.cash = 800; s.queue = []; s.visitIdx = 0;
    s.inventory = s.inventory.slice(0, 3); s.inventory[0].condition = 'Excellent'; s.inventory[1].condition = 'Worn';
    s.inventory.push({ uid: 'kilim-t', typeId: 'village-kilim-canal', condition: 'Good', restored: false, provenance: 'Uncertain', paid: 100, notes: [], stored: true });
    delete s.arranFindings; delete s.arranBooks; delete s.papers; delete s.labUnlocked; d.version = 13; localStorage.setItem('tof-skip-chapters', '1');`);
  await reload();
  let s = await st();
  console.log('date day', s.day, '| migrated: findings', JSON.stringify(s.arranFindings), 'books', JSON.stringify(s.arranBooks), 'unlocked', JSON.stringify(s.labUnlocked));
  await toLab();
  console.log('02:00 door: enter button?', await has('arran-enter'), '| text:', (await p.locator('[data-testid=arran-door] p').textContent()).slice(0, 50));
  await p.click('[data-testid=arran-door-leave]');
  await edit(`s.world.hour = 9;`); await reload();
  await toLab(); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${S}/lab-${tag}-room.png` });
  const worn = s.inventory[1].uid, exc = s.inventory[0].uid;
  await p.click(`[data-testid=arran-rug-${worn}]`); await p.waitForTimeout(500);
  await p.screenshot({ path: `${S}/lab-${tag}-tests.png` });
  console.log('fibre locked:', await has(`arran-locked-fibre-${worn}`), '| rub open:', await has(`arran-test-fastness-${worn}`));
  const direct = await p.evaluate(async (uid) => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().arranExamine(uid, 'fibre'); }, worn);
  console.log('store refuses locked fibre:', JSON.stringify(direct));
  await p.click('[data-testid=arran-rug-kilim-t]'); await p.click('[data-testid=arran-test-fastness-kilim-t]'); await p.waitForSelector('[data-testid=arran-confirm]');
  console.log('confirm card before paying:', (await p.locator('[data-testid=arran-confirm]').innerText()).replace(/\n+/g, ' | ').slice(0, 260));
  await p.screenshot({ path: `${S}/lab-${tag}-confirm.png` });
  await p.click('[data-testid=arran-confirm-pay]'); await p.waitForSelector('[data-testid=arran-finding]');
  await p.screenshot({ path: `${S}/lab-${tag}-finding.png` });
  console.log('kilim rub:', await p.locator('[data-testid=arran-verdict]').textContent(), '| tag lit:', await p.locator('.arran-tag.is-on').textContent());
  await p.click('[data-testid=arran-back]');
  await p.click('[data-testid=arran-tab-notebook]'); await p.click('[data-testid=errand-offer-fibres] summary'); await p.click('[data-testid=arran-ask-fibres]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${S}/lab-${tag}-ask.png` });
  console.log('asked:', (await st()).arranBooks.fibres.phase, '|', (await p.locator('[data-testid=arran-say]').textContent()).slice(0, 60));
  await p.click('[data-testid=arran-leave]');
  // to Cairo (the route itself is the ordinary map journey; here the save is moved)
  await edit(`Object.assign(s.world, { at: 'cairo', hour: 10, x: 214.3, y: 413.7 });`); await reload();
  await toTown('cairo');
  await p.screenshot({ path: `${S}/lab-${tag}-menu.png` });
  console.log('library in menu:', await p.locator('[data-testid=menu-library]').textContent());
  await p.click('[data-testid=menu-library]'); await p.waitForSelector('[data-testid=library]');
  const c0 = await st();
  await p.click('[data-testid=library-search-fibres]'); await p.waitForTimeout(300);
  console.log('search:', await p.locator('[data-testid=library-note]').textContent(), '| hour', c0.world.hour.toFixed(2), '->', (await st()).world.hour.toFixed(2));
  await p.click('[data-testid=library-borrow-fibres]');
  console.log('borrow:', (await p.locator('[data-testid=library-note]').textContent()).slice(0, 60));
  await p.screenshot({ path: `${S}/lab-${tag}-library.png` });
  await p.click('[data-testid=library-copy-fibres]'); await p.waitForTimeout(300);
  const c1 = await st();
  console.log('copy: cash', c0.cash, '->', c1.cash, '| hour ->', c1.world.hour.toFixed(2), '| papers', c1.papers.length, c1.papers[0]?.kind, '| phase', c1.arranBooks.fibres.phase);
  const again = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().libraryAcquire('fibres', 'duplicate'); });
  console.log('second purchase refused:', again);
  await p.click('[data-testid=library-read-fibres]'); await p.waitForSelector('[data-testid=book-reader]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${S}/lab-${tag}-book.png` });
  await p.click('[data-testid=book-close]');
  await reload();
  const c2 = await st();
  console.log('after reload: cash', c2.cash === c1.cash, 'hour', c2.world.hour === c1.world.hour, 'paper', c2.papers.length, 'phase', c2.arranBooks.fibres.phase);
  // home, give the copy
  await edit(`Object.assign(s.world, { at: 'giza', hour: 9 }); s.day += 1;`); await reload();
  await toLab(); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(400);
  await p.click('[data-testid=arran-tab-notebook]'); await p.click('[data-testid=arran-return-fibres]'); await p.waitForTimeout(400);
  const r1 = await st();
  console.log('returned:', r1.arranBooks.fibres.phase, '| unlocked', JSON.stringify(r1.labUnlocked), '| papers', r1.papers.length, '|', (await p.locator('[data-testid=arran-say]').textContent()).slice(0, 40));
  const dup = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().arranReturnBook('fibres'); });
  console.log('duplicate return:', JSON.stringify(dup), '| unlocked still', JSON.stringify((await st()).labUnlocked));
  await p.click('[data-testid=arran-tab-test]'); await p.click(`[data-testid=arran-rug-${worn}]`);
  await p.click(`[data-testid=arran-test-fibre-${worn}]`); await p.click('[data-testid=arran-confirm-pay]'); await p.waitForSelector('[data-testid=arran-finding]');
  const f1 = await st();
  console.log('fibre now works:', await p.locator('[data-testid=arran-verdict]').textContent(), '| cash', r1.cash, '->', f1.cash);
  await p.click('[data-testid=arran-back]');
  await p.click(`[data-testid=arran-rug-${exc}]`); await p.click(`[data-testid=arran-test-fibre-${exc}]`); await p.waitForSelector('[data-testid=arran-confirm]');
  console.log('cut shown before paying:', await p.locator('[data-testid=arran-confirm-uses]').textContent(), '| button', await p.locator('[data-testid=arran-confirm-pay]').textContent(), '| nothing charged:', (await st()).cash === f1.cash);
  await p.click('[data-testid=arran-confirm-cancel]');
  // the price book
  await p.click('[data-testid=arran-catalogue-open]'); await p.waitForSelector('[data-testid=arran-catalogue]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${S}/lab-${tag}-cat-exam.png` });
  console.log('price book, examinations:', await p.locator('.cat__entry').count(), 'entries | fibre price', await p.locator('[data-testid=cat-price]').textContent());
  await p.click('[data-testid=cat-tab-goods]'); await p.click('[data-testid=cat-item-loupe]');
  const k0 = (await st()).cash;
  await p.click('[data-testid=cat-buy]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/lab-${tag}-cat-goods.png` });
  console.log('loupe:', (await st()).arranTools, '| cash', k0, '->', (await st()).cash, '| button now', await p.locator('[data-testid=cat-buy]').textContent());
  await p.click('[data-testid=cat-tab-reports]'); await p.waitForTimeout(200);
  await p.click(`[data-testid="cat-report-${worn}:fibre"]`); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/lab-${tag}-cat-report.png` });
  const rr = (await st()).inventory.find((i) => i.uid === worn);
  console.log('report on rug:', JSON.stringify(rr.labReports), '| offered again?', await has(`cat-report-${worn}:fibre`));
  const again2 = await p.evaluate(async (id) => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().arranBuy('report', id); }, `${worn}:fibre`);
  console.log('second report refused:', again2);
  const bonus = await p.evaluate(async () => { const m = await import('/src/game/systems/arranShop.ts'); return [m.labArgBonus('craft', ['fibre'], ['loupe'], ['fineWeave']), m.labArgBonus('durability', ['fibre'], [], []), m.labArgBonus('durability', ['fastness'], ['cloths'], ['washable'])]; });
  console.log('argument bonus craft(report+loupe), durability(no rub report), durability(rub report):', bonus.join(', '));
  await p.click('[data-testid=cat-tab-exam]'); await p.click('[data-testid=cat-item-fastness]'); await p.click('[data-testid=cat-use]'); await p.waitForTimeout(300);
  console.log('service -> test tab:', await has('arran-catalogue'), '(0 = closed) |', await p.locator('[data-testid=arran-msg]').textContent());
  // lost copy: dyes errand, copy vanishes, return fails, the archive can make another
  await edit(`s.arranBooks.dyes = { phase: 'copy_acquired', copyId: 'gone', day: s.day }; s.papers = [];`); await reload();
  const lost = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().arranReturnBook('dyes'); });
  console.log('return with lost copy:', JSON.stringify(lost), '| still locked dye:', !(await st()).labUnlocked.includes('dye'));
  await edit(`Object.assign(s.world, { at: 'alexandria', hour: 9 });`); await reload();
  const re = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().libraryAcquire('dyes', 'copy'); });
  console.log('archive makes another:', re.slice(0, 50), '| papers', (await st()).papers.length);
  // v14 save with a fibre finding keeps the fibre test
  await edit(`d.version = 14; delete s.labUnlocked; delete s.arranBooks; delete s.papers; s.arranFindings = [{ id: 'x:fibre', subjectId: 'x', service: 'fibre', verdict: 'consistent', confidence: 'strong', claim: 'Wool', evidence: [], limitations: [], day: 1 }];`); await reload();
  console.log('v14 migration unlocked:', JSON.stringify((await st()).labUnlocked), '| version', JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).version);
  console.log('errors', errs);
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/lab-${tag}-fail.png` }); }
await b.close();
