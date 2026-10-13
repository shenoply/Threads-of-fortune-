// A well beside the road: the skins are filled on the move with a short notice, and the sim switches work
import { chromium } from 'playwright';
import { PORT as __PORT } from './_env.mjs';
const PORT = __PORT;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (s) => (await p.locator(s).count()) > 0;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.cash = 900; s.world.known.push('suez', 'sinai'); s.world.party.food = 40; s.condition = { ...(s.condition || {}), fatigue: 10, fed: 80, water: 40 }; Object.assign(s.world, { at: 'cairo', hour: 6, x: 214.3, y: 413.7, parties: [] }); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); localStorage.setItem('tof-skip-chapters', '1'); localStorage.setItem('tof-night-rule', 'march'); });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(600);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]');
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: 'suez' }))); await p.waitForTimeout(500); await p.locator('[data-testid=travel]').dispatchEvent('click');
await p.locator('[data-testid=speed-4]').dispatchEvent('click');
let seen = '';
for (let i = 0; i < 400 && !seen; i++) { const f = p.locator('[data-testid=road-flash]'); if (await f.count()) seen = (await f.textContent().catch(() => '')) || ''; else await p.waitForTimeout(150); if (await has('[data-testid=settlement]')) break; }
check(/Waterskins filled/.test(seen), `a short notice says the skins were filled (${seen})`);
if (seen) {
  const w = await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); return m.useGame.getState().condition.water; });
  check(w >= 95, `waterskins full on the move (water ${w})`);
  check(!(await has('[data-testid=well-stop]')), 'no card stops the caravan');
  check(await has('[data-testid=stop]'), 'the caravan is still under way');
}
// the simulation switches
await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); const g = m.useGame.getState(); g.setSim({ illness: false, injuries: false, needs: false }); useGame_set(m); function useGame_set(m){ m.useGame.setState({ illnesses: [{ id: 'flu', since: 1, until: 9 }], condition: { fatigue: 90, fed: 5, water: 5 } }); m.useGame.getState().setSim({ illness: false, injuries: false, needs: false }); } });
const st = await S();
check((st.illnesses ?? []).length === 0, 'turning illness off clears an illness');
check(st.condition.fatigue <= 15 && st.condition.fed >= 60 && st.condition.water >= 60, 'turning needs off tops the meters up');
const hurt = await p.evaluate(async () => { const m = await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts'); return m.useGame.getState().hurt('fight'); });
check(hurt === '', 'injuries off: a fight leaves no wound');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
