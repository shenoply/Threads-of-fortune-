import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
await p.goto('http://localhost:4173/'); await p.evaluate(() => localStorage.clear()); await p.reload();
await p.waitForTimeout(800);
await p.click('[data-testid=play-opening]');
await p.waitForTimeout(1500);
console.log('skip visible on first watch:', await p.locator('[data-testid=skip-opening]').isVisible());
await b.close();
