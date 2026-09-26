import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/'); await p.evaluate(() => localStorage.clear()); await p.reload();
await p.waitForTimeout(800);
const start = p.locator('[data-testid=start-opening], [data-testid=begin], button:has-text("Begin"), button:has-text("Watch")').first();
if (await start.count()) await start.click();
const seen = new Set();
for (let i = 0; i < 90; i++) {
  await p.waitForTimeout(1000);
  const t = (await p.textContent('[data-testid=doc-subtitle]').catch(() => '')) || '';
  const key = t.slice(0, 20);
  if (/tiers|Fine rugs|Money is|Every choice|every skill|first task|The goal/.test(t) && !seen.has(key)) { seen.add(key); await p.waitForTimeout(3500); await p.screenshot({ path: `/home/claude/shots/doc-${seen.size}.png` }); }
  if (seen.size >= 5) break;
}
console.log('shots', seen.size, 'errors', errors);
await b.close();
