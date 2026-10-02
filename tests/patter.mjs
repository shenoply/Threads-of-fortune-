// The merchant's patter at the stall: Bend the truth offers three lies (with his words), Pay a compliment
// three compliments; the buyer answers each; two sales offer different choices.
//   PORT=5173 SHOTS=/tmp/patter node tests/patter.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5173', S = process.env.SHOTS ?? '/tmp/patter';
mkdirSync(S, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const has = (id) => p.locator(`[data-testid="${id}"]`).count();
const edit = (fn) => p.evaluate((src) => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); new Function('s', 'd', src)(d.state, d); localStorage.setItem(k, JSON.stringify(d)); }, fn);
const reload = async () => { await p.reload(); if (await has('continue')) await p.click('[data-testid=continue]'); await p.waitForTimeout(900); };
const game = (fn) => p.evaluate(async (src) => { const m = await import('/src/game/state/store.ts'); return new Function('g', 'set', 'get', src)(m.useGame.getState(), m.useGame.setState, m.useGame.getState); }, fn);
const opts = async () => p.evaluate(() => [...document.querySelectorAll('[data-testid^="act-lie_"],[data-testid^="act-praise_"]')].map((e) => `${e.getAttribute('data-testid').replace('act-', '')}: ${e.querySelector('.s').textContent.slice(0, 60)}`));
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await edit(`s.tutorial = { done: true, step: 'done', inspected: true }; s.missionNews = undefined; s.levelUps = []; s.titleNews = []; localStorage.setItem('tof-skip-chapters', '1');
    Object.assign(s.world, { at: 'giza', hour: 9 }); s.queue = ['yusuf', 'mariam']; s.arrivals = [9.05, 9.1]; s.visitIdx = 0;`);
  await reload();
  for (const round of [1, 2]) {
    await p.click('[data-testid=nav-stall]'); await p.waitForTimeout(600);
    await p.click('[data-testid=stall-wait]'); await p.waitForSelector('[data-testid=actions]', { timeout: 20000 }); await p.waitForTimeout(2500);
    const buyer = await p.evaluate(() => document.querySelector('.buyer-name, [data-testid=buyer-name]')?.textContent ?? '');
    if (await has('act-saffron_move')) await p.click('[data-testid=act-saffron_move]');
    if (await has('act-ask_room')) { await p.click('[data-testid=act-ask_room]'); await p.waitForTimeout(800); }
    await p.click('[data-testid=act-praise_menu]'); await p.waitForTimeout(300);
    const praise = await opts();
    if (round === 1) await p.screenshot({ path: `${S}/praise.png` });
    await p.locator('[data-testid^="act-praise_"]').first().click(); await p.waitForTimeout(1500);
    await p.locator('[data-testid^="rug-"]').first().click(); await p.waitForTimeout(1500);
    if (await has('act-saffron_move')) { await p.click('[data-testid=act-saffron_move]'); await p.waitForTimeout(800); }
    await p.click('[data-testid=act-lie_menu]'); await p.waitForTimeout(300);
    const lies = await opts();
    if (round === 1) await p.screenshot({ path: `${S}/lies.png` });
    await p.locator('[data-testid^="act-lie_"]').first().click(); await p.waitForTimeout(3000);
    const save = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.encounter);
    console.log(`SALE ${round} ${save?.buyerId}\n  compliments: ${praise.join(' || ')}\n  lies: ${lies.join(' || ')}\n  state: ${JSON.stringify({ lies: save?.liesTold, boost: save?.lieBoost, caught: save?.embellishCaught, praise: save?.praiseUsed, trust: save?.trust, interest: save?.interest })}\n  ${(save?.log ?? []).slice(-5).map((l) => l.speaker + ': ' + l.text.slice(0, 90)).join('\n  ')}`);
    if (round === 1) await p.screenshot({ path: `${S}/after.png` });
    await edit(`s.encounter = null; s.visitIdx = 1;`); await reload();
  }
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); await p.screenshot({ path: `${S}/fail.png` }); }
console.log('errors', JSON.stringify(errs));
await b.close();
