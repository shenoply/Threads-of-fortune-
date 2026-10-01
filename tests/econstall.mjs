import { chromium } from 'playwright';
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
Object.assign(d.state.world, { at: 'giza', x: 293.1, y: 447.5 });
d.state.inventory = [
  { uid: 'x1', typeId: 'sarouk', condition: 'Good', restored: false, provenance: 'Documented', paid: 1700, notes: [], stored: true },
  { uid: 'x2', typeId: 'kerdasa', condition: 'Good', restored: false, provenance: 'Documented', paid: 40, notes: [], stored: true },
  { uid: 'x3', typeId: 'cairo-garden', condition: 'Good', restored: false, provenance: 'Documented', paid: 450, notes: [], stored: true },
  { uid: 'x4', typeId: 'baluch', condition: 'Good', restored: false, provenance: 'Likely', paid: 260, notes: [], stored: true },
];
d.state.visitIdx = 0; d.state.queue = ['samira', 'yusuf', 'mariam']; d.state.dayOver = false;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/');
await p.evaluate((s) => { localStorage.setItem('threads-of-fortune-save', s); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
await p.reload();
if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(500);
await p.click('[data-testid=nav-stall]');
await p.waitForTimeout(1500);
const has = async (s) => (await p.locator(s).count()) > 0;
for (let i = 0; i < 150 && !(await has('[data-testid=price-dial]')); i++) {
  if (await has('[data-testid=close-stall]')) await p.click('[data-testid=close-stall]');
  else if (await has('[data-testid=open-stall]')) await p.click('[data-testid=open-stall]');
  else if (await has('[data-testid=next-visit]')) await p.click('[data-testid=next-visit]');
  else if (await has('[data-testid=inspector]')) await p.click('[data-testid=inspector-close]');
  else if (await has('[data-testid=act-name_price]')) await p.click('[data-testid=act-name_price]');
  else if (await has('.rugcard[data-uid=x3]:not(.presented)')) await p.locator('.rugcard[data-uid=x3]').click();
  else if (await has('.rugcard:not(.presented):not([disabled]):not(.empty)')) await p.locator('.rugcard:not(.presented):not([disabled]):not(.empty)').first().click();
  else await p.locator('[data-testid^=act-]').first().click().catch(() => {});
  await p.waitForTimeout(500);
}
await p.screenshot({ path: '/home/claude/shots/econ-dial.png' });
for (let i = 0; i < 3; i++) await p.click('button[aria-label="Raise"]');
await p.click('[data-testid=offer-price]');
await p.waitForTimeout(4500);
await p.screenshot({ path: '/home/claude/shots/econ-counter.png' });
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
console.log('errors', errors, 'cash', st.cash);
await b.close();
