// A well beside the road: the caravan stops, you fill the waterskins (an hour), and the sim switches work
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = async (s) => (await p.locator(s).count()) > 0;
const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); const s = d.state; s.tutorial = { done: true, step: 'done', inspected: true }; s.introSeen = ['malek', 'arran', 'abuhamid', 'bilgin-chess', 'rashid', 'nabil', 'cohen']; s.cash = 900; s.world.known.push('suez', 'sinai'); s.world.party.food = 40; s.condition = { ...(s.condition || {}), fatigue: 10, fed: 80, water: 40 }; Object.assign(s.world, { at: 'cairo', hour: 6, x: 214.3, y: 413.7, parties: [] }); localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('tof-skip-chapters', '1'); localStorage.setItem('tof-night-rule', 'march'); });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(600);
await p.click('[data-testid=nav-map]'); await p.waitForTimeout(400);
if (await has('[data-testid=district-world]')) await p.click('[data-testid=district-world]');
await p.evaluate(() => window.dispatchEvent(new CustomEvent('tof:plan-trip', { detail: 'suez' }))); await p.waitForTimeout(500); await p.locator('[data-testid=travel]').dispatchEvent('click');
await p.locator('[data-testid=speed-4]').dispatchEvent('click');
let stopped = false;
for (let i = 0; i < 400 && !stopped; i++) { if (await has('[data-testid=well-stop]')) stopped = true; else await p.waitForTimeout(250); if (await has('[data-testid=settlement]')) break; }
check(stopped, 'the caravan stops at the well on the Suez road');
if (stopped) {
  const before = await S();
  await p.click('[data-testid=well-fill]'); await p.waitForTimeout(400);
  const after = await S();
  check(after.condition.water === 100, `waterskins full (water ${before.condition.water} -> ${after.condition.water})`);
  check(!(await has('[data-testid=well-stop]')), 'the card closes and the caravan goes on');
}
// the simulation switches
await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); const g = m.useGame.getState(); g.setSim({ illness: false, injuries: false, needs: false }); useGame_set(m); function useGame_set(m){ m.useGame.setState({ illnesses: [{ id: 'flu', since: 1, until: 9 }], condition: { fatigue: 90, fed: 5, water: 5 } }); m.useGame.getState().setSim({ illness: false, injuries: false, needs: false }); } });
const st = await S();
check((st.illnesses ?? []).length === 0, 'turning illness off clears an illness');
check(st.condition.fatigue <= 15 && st.condition.fed >= 60 && st.condition.water >= 60, 'turning needs off tops the meters up');
const hurt = await p.evaluate(async () => { const m = await import('/src/game/state/store.ts'); return m.useGame.getState().hurt('fight'); });
check(hurt === '', 'injuries off: a fight leaves no wound');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
