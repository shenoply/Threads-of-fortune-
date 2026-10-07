// With men in the caravan, passing out is looked after: near Cairo they carry you to Dr Feras, further off they nurse you
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
const run = (at, men) => p.evaluate(async ([at, men]) => {
  const { useGame } = await import('/src/game/state/store.ts');
  const s0 = useGame.getState();
  useGame.setState({ rescue: undefined, tutorial: { done: true, step: 'done', inspected: true }, world: { ...s0.world, at, hour: 10, party: { ...s0.world.party, troops: men ? { guard: 2 } : {} } }, condition: { fatigue: 99, fed: 5, water: 5 } });
  useGame.getState().collapse('exhaustion');
  const s = useGame.getState();
  return { rescue: s.rescue, at: s.world.at, fat: s.condition.fatigue, fed: s.condition.fed };
}, [at, men]);
const a = await run('giza', true); check(a.rescue?.by === 'men' && a.rescue.clinic && a.at === 'cairo', `men near Cairo carry him to the clinic (${a.at})`);
const c = await run('suez', true); check(c.rescue?.by === 'men' && !c.rescue.clinic && c.at === 'suez' && c.fed >= 45, `men far off nurse him where he fell (${c.at}, fed ${c.fed})`);
const d = await run('giza', false); check(d.rescue?.by === 'alone', 'no men: he comes to alone');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
