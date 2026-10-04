// The owner's code in Settings adds money; a wrong code does nothing.
//   PORT=5173 node tests/secret-code.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(500);
const cash = () => p.evaluate(async () => (await import('/src/game/state/store.ts')).useGame.getState().cash);
const c0 = await cash();
await p.click('[data-testid=settings-btn]'); await p.click('[data-testid=code-open]');
await p.fill('[data-testid=code-input]', 'wrong'); await p.click('[data-testid=code-go]'); await p.waitForTimeout(300);
const c1 = await cash();
await p.fill('[data-testid=code-input]', 'Bilgin1925'); await p.click('[data-testid=code-go]'); await p.waitForTimeout(300);
const c2 = await cash(); const msg = await p.locator('[data-testid=code-msg]').textContent();
console.log(c0, c1, c2, msg);
console.log(c1 === c0 && c2 === c0 + 10000 && !errs.length ? 'PASS' : 'FAIL', JSON.stringify(errs));
await b.close();
