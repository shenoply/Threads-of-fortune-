// A new game must not inherit a pending rescue, illnesses or the Ironman/sim settings from the game left behind
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'), localStorage.setItem('tof-fullscreen', 'off'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const { useGame } = await import('/src/game/state/store.ts');
  useGame.setState({ rescue: { day: 3, from: 'cairo', reason: 'exhaustion', fare: 0, by: 'carry' }, illnesses: [{ id: 'cut', since: 1, until: 15 }], sim: { illness: false, injuries: false, needs: false }, condition: { fatigue: 99, fed: 5, water: 5 } });
  useGame.getState().reset();
  const s = useGame.getState();
  return { rescue: s.rescue, ill: s.illnesses, sim: s.sim, fat: s.condition?.fatigue, started: s.started };
});
check(!r.rescue, 'no rescue left over'); check(!(r.ill ?? []).length, 'no illness left over'); check(!r.sim, 'sim switches reset'); check(!r.started, 'game is not started');
console.log(out.join('\n')); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
