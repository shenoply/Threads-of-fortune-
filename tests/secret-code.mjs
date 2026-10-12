// The owner's code in Settings adds money; a wrong code does nothing.
//   PORT=5173 node tests/secret-code.mjs
import { chromium } from 'playwright';
import { PORT as __PORT } from './_env.mjs';
const PORT = __PORT;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */ await p.waitForTimeout(500);
const cash = () => p.evaluate(async () => (await import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/state/store.ts')) ?? '/src/game/state/store.ts')).useGame.getState().cash);
const c0 = await cash();
await p.click('[data-testid=settings-btn]'); await p.click('[data-testid=code-open]');
await p.fill('[data-testid=code-input]', 'wrong'); await p.click('[data-testid=code-go]'); await p.waitForTimeout(300);
const c1 = await cash();
await p.fill('[data-testid=code-input]', 'Bilgin1925'); await p.click('[data-testid=code-go]'); await p.waitForTimeout(300);
const c2 = await cash(); const msg = await p.locator('[data-testid=code-msg]').textContent();
console.log(c0, c1, c2, msg);
console.log(c1 === c0 && c2 === c0 + 10000 && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs));
await b.close();
