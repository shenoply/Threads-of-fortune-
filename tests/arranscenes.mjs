// Arran's twenty scenes: one per visit, chosen from game state, shown as his opening line with
// "Ask Arran about it" and "Look around the lab" (no blocking popup).
//   PORT=5173 node tests/arranscenes.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800); };
const visit = async (label, setup) => {
  await edit(`Object.assign(s.world, { at: 'giza', hour: 10 }); ${setup}`); await reload();
  await p.click('[data-testid=nav-stall]'); await p.waitForSelector('[data-testid=district]'); await p.waitForTimeout(300);
  if (await has('stall-sheet-close')) await p.click('[data-testid=stall-sheet-close]');
  await p.locator('[data-testid=poi-lab]').scrollIntoViewIfNeeded(); await p.click('[data-testid=poi-lab]');
  await p.waitForSelector('[data-testid=arran-door]'); await p.click('[data-testid=arran-enter]'); await p.waitForTimeout(600);
  const n = await p.locator('[data-testid=arran-scene]').getAttribute('data-scene').catch(() => null);
  const reason = await p.locator('[data-testid=arran-scene-talk]').getAttribute('data-reason').catch(() => null);
  const line = await p.locator('[data-testid=arran-scene-talk] p').textContent().catch(() => '');
  const btns = (await p.locator('[data-testid=arran-scene-talk] button').allTextContents()).join(' | ');
  console.log(`${label}: scene ${n} (${reason}) | modal? ${await has('mummy-study')} | tabs usable? ${await p.locator('[data-testid=arran-tab-notebook]').isEnabled()}\n   ${line}\n   [${btns}]`);
  await p.screenshot({ path: `${S}/sc-${label}.png` });
};
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; s.cash = 900; localStorage.setItem('tof-skip-chapters', '1');`);
  await visit('first', `s.arranVisit = { visitCount: 0 }; s.arranBooks = {}; s.papers = [];`);
  await p.click('[data-testid=arran-scene-ask]'); await p.waitForTimeout(150);
  console.log('   ask →', await p.locator('[data-testid=arran-scene-talk] p').textContent());
  await p.click('[data-testid=arran-scene-leave]'); await p.waitForTimeout(200);
  console.log('   look around → scene gone?', !(await has('arran-scene')), '| room figure back?', await has('arran-talk'));
  await visit('book', `s.arranVisit = { visitCount: 3 }; s.arranBooks = { dyes: { phase: 'copy_acquired', copyId: 'c1', day: s.day } }; s.papers = [{ id: 'c1', bookId: 'dyes', kind: 'copy', title: 'x', from: 'alexandria', day: s.day }];`);
  await p.click('[data-testid=arran-scene-give]'); await p.waitForTimeout(300);
  const st = JSON.parse(await p.evaluate(() => localStorage.getItem('threads-of-fortune-save'))).state;
  console.log('   gave the copy →', st.arranBooks.dyes.phase, JSON.stringify(st.labUnlocked));
  await visit('book-not-carried', `s.arranVisit = { visitCount: 3 }; s.arranBooks = { dyes: { phase: 'copy_acquired', copyId: 'gone', day: s.day } }; s.papers = [];`);
  await visit('ledger', `s.arranVisit = { visitCount: 3 }; s.arranBooks = { restricted_records: { phase: 'copy_acquired', copyId: 'c2', day: s.day } }; s.papers = [{ id: 'c2', bookId: 'restricted_records', kind: 'copy', title: 'x', from: 'portsaid', day: s.day }];`);
  await visit('mummy', `s.arranBooks = {}; s.papers = []; s.arranVisit = { visitCount: 4, permitStage: 'granted', permitDay: s.day };`);
  await visit('sinai', `s.arranVisit = { visitCount: 5, mummyIntroductionSeen: true }; s.arranBooks = { field_safety: { phase: 'requested', day: s.day } }; s.labUnlocked = [];`);
  await visit('crate', `s.arranBooks = {}; s.cargo = [{ id: 'k1', jobId: 'powder', label: 'Powder', cls: 'restricted_material', to: 'sinai', paperwork: 'none', fee: 1, takenDay: s.day, collected: true }];`);
  await visit('case', `s.cargo = []; s.arranVisit = { visitCount: 6, mummyIntroductionSeen: true };`);
  await visit('evening', `s.world.hour = 19.5;`);
} catch (e) {
  console.log('FAILED', e.message.split('\n')[0]);
  await p.screenshot({ path: `${S}/sc-fail.png` });
}
console.log('errors', JSON.stringify(errs));
await b.close();
