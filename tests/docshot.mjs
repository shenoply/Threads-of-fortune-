import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload();
await p.waitForTimeout(800);
// The opening film starts from the title screen's "Play Campaign".
await p.click('[data-testid=play-opening]');
await p.waitForSelector('[data-testid=documentary]');
// Screenshot the first few distinct subtitle cards (wording may change; any new line counts).
const seen = new Set();
const sub = p.locator('[data-testid=doc-subtitle]');
for (let i = 0; i < 90 && seen.size < 5; i++) {
  await p.waitForTimeout(1000);
  if (!(await sub.count())) { if (await p.locator('[data-testid=dayone]').count()) break; continue; }
  const t = ((await sub.first().textContent().catch(() => '')) || '').trim();
  const key = t.slice(0, 30);
  if (t && !seen.has(key)) { seen.add(key); await p.waitForTimeout(1500); await p.screenshot({ path: `${__SHOTS}/doc-${seen.size}.png` }); }
}
console.log(seen.size ? 'PASS' : 'FAIL', 'subtitle cards seen', seen.size, [...seen], 'errors', errors);
if (errors.length) console.log('FAIL page errors');
await b.close();
