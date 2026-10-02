// Wardrobe: an old save converts to pieces, the hero shows in layers, pieces can be tried on, bought and worn.
// Needs `npx vite preview --port 4173` running and /home/claude/shots/save.json (a version-12 save).
import { chromium } from 'playwright';
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
Object.assign(d.state.world, { at: 'alexandria', x: 86.4, y: 387.2 });
d.state.cash = 3000;
d.state.attire = { owned: ['galabiya', 'stambouli'], worn: 'stambouli', clean: 90 };
d.state.missionNews = undefined; d.state.levelUps = [];
delete d.state.wardrobe;
const out = '/home/claude/shots';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/');
await p.evaluate((s) => { localStorage.setItem('threads-of-fortune-save', s); localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'); }, JSON.stringify(d));
await p.reload();
if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(600);
let st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
console.log('migrated wardrobe', JSON.stringify(st.wardrobe));

await p.click('[data-testid=nav-hero]'); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/wr-0-sheet.png` });
await p.click('[data-testid=hh-wardrobe]'); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/wr-1-open.png` });

await p.click('[data-testid=wr-slot-head]');
await p.click('[data-testid=wr-piece-qeleshe]');
await p.click('[data-testid=wr-slot-extras]');
await p.click('[data-testid=wr-piece-ring]');
await p.click('[data-testid=wr-piece-watch]');
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/wr-2-trying.png` });
await p.click('[data-testid=wr-buy]'); await p.waitForTimeout(400);
console.log('note:', await p.locator('[data-testid=wr-note]').textContent());
console.log('pose tabs outside fit mode:', await p.locator('[data-testid=wr-pose-profile]').count());
await p.click('[data-testid=wr-zoom-in]'); await p.click('[data-testid=wr-zoom-in]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/wr-3-zoom.png` });
await p.click('[data-testid=wr-fit-toggle]'); await p.click('[data-testid=wr-pose-wardrobe]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/wr-4-fit.png` });

st = await p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save')).state);
console.log('cash', st.cash, 'worn', JSON.stringify(st.wardrobe.outfit), 'legacy', st.attire.worn);
console.log('owns qeleshe/ring/watch', ['qeleshe', 'ring', 'watch'].map((x) => st.wardrobe.owned.includes(x)).join());
// a full city outfit, for the record
await p.click('[data-testid=wr-close]'); await p.waitForTimeout(300);
await p.click('[data-testid=hh-wardrobe]'); await p.waitForTimeout(500);
for (const [slot, id] of [['head', 'tarboosh'], ['top', 'dress-shirt'], ['outer', 'stambouli'], ['legs', 'wool-trousers'], ['feet', 'oxfords'], ['carry', 'briefcase']]) {
  await p.click(`[data-testid=wr-slot-${slot}]`); await p.click(`[data-testid=wr-piece-${id}]`);
}
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/wr-5-outfit.png` });
console.log('errors', errors);
await b.close();
