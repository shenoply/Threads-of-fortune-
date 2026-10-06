// Beaten senseless on the road: either you wake alone hours later, or a passer-by takes you to the nearest town
// (to Dr Feras if that is Cairo or Giza).   PORT=5199 SHOTS=/tmp/w/k node tests/knockout.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '5199', S = process.env.SHOTS ?? '/tmp/w/k'; mkdirSync(S, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
const run = (rnd, at, x, y) => p.evaluate(async ([rnd, at, x, y]) => {
  const { useGame } = await import('/src/game/state/store.ts');
  useGame.setState({ rescue: undefined, tutorial: { done: true, step: 'done', inspected: true }, world: { ...useGame.getState().world, at, x, y, hour: 10 } });
  const was = { hour: 10, fatigue: useGame.getState().condition?.fatigue ?? 0 };
  const orig = Math.random; Math.random = () => rnd;
  const msg = useGame.getState().knockedOut('test'); Math.random = orig;
  const s = useGame.getState();
  return { msg, hour: s.world.hour, at: s.world.at, rescue: s.rescue, fat: s.condition?.fatigue, was };
}, [rnd, at, x, y]);
const a = await run(0.1, null, 300, 330);
check(/wake in the dust/.test(a.msg) && a.hour > 10 && !a.rescue, `alone: "${a.msg}" (hour ${a.hour})`);
const c = await run(0.9, null, 300, 330);
check(c.rescue?.by === 'passerby' && c.at, `passer-by: taken to ${c.at} (clinic: ${c.rescue?.clinic})`);
await p.waitForTimeout(800); await p.screenshot({ path: `${S}/1-passerby.png` });
const txt = await p.locator('[data-testid=rescue-text]').innerText().catch(() => '');
check(txt.length > 0, `the scene shows: ${txt.slice(0, 50)}`);
for (let i = 0; i < 2; i++) { await p.click('[data-testid=rescue-next]').catch(() => {}); await p.waitForTimeout(250); }
await p.screenshot({ path: `${S}/2-end.png` });
await p.click('[data-testid=rescue-clinic]'); await p.waitForTimeout(700);
check((await p.locator('[data-testid=rescue]').count()) === 0, 'it closes');
// next to Cairo: he is taken to Dr Feras
const d = await run(0.9, 'cairo', 0, 0);
check(d.rescue?.clinic === true && d.at === 'cairo', 'in Cairo the passer-by takes you to the clinic');
await p.waitForTimeout(500);
for (let i = 0; i < 2; i++) { await p.click('[data-testid=rescue-next]').catch(() => {}); await p.waitForTimeout(250); }
await p.click('[data-testid=rescue-clinic]'); await p.waitForSelector('[data-testid=clinic]');
check(true, 'and the clinic opens');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
