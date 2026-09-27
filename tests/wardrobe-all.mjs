// Tries on every wardrobe piece in the real game at phone size, and every zoom step,
// and saves contact sheets to look over. Needs `npx vite preview --port 4173`.
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = '/home/claude/shots/all';
fs.mkdirSync(out, { recursive: true });
const d = JSON.parse(fs.readFileSync('/home/claude/shots/save.json', 'utf8'));
Object.assign(d.state.world, { at: 'cairo', x: 170, y: 470 });
d.state.cash = 99999; delete d.state.wardrobe; d.state.missionNews = undefined; d.state.levelUps = [];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:4173/');
await p.evaluate((s) => { localStorage.setItem('threads-of-fortune-save', s); localStorage.setItem('tof-intro-seen-v2', '1'); }, JSON.stringify(d));
await p.reload();
if (await p.locator('[data-testid=continue]').count()) await p.click('[data-testid=continue]');
await p.waitForTimeout(600);
await p.click('[data-testid=nav-hero]'); await p.waitForTimeout(500);
await p.click('[data-testid=hh-wardrobe]'); await p.waitForTimeout(800);
const stage = await p.locator('.wr-stage').boundingBox();
// zoom steps and a drag
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(450);
  await p.screenshot({ path: `${out}/zoom-${i}.png`, clip: stage });
  if (i < 3) await p.click('[data-testid=wr-zoom-in]');
}
await p.mouse.move(stage.x + 200, stage.y + 250); await p.mouse.down(); await p.mouse.move(stage.x + 200, stage.y - 150, { steps: 10 }); await p.mouse.up();
await p.waitForTimeout(400); await p.screenshot({ path: `${out}/zoom-drag.png`, clip: stage });
for (let i = 0; i < 3; i++) await p.click('[data-testid=wr-zoom-out]');
await p.waitForTimeout(400);
// every piece
const slots = ['head', 'top', 'outer', 'legs', 'feet', 'extras', 'weapon', 'carry'];
const shots = [];
for (const slot of slots) {
  await p.click(`[data-testid=wr-slot-${slot}]`); await p.waitForTimeout(150);
  const ids = await p.$$eval('[data-testid^=wr-piece-]', (els) => els.map((e) => e.dataset.testid.replace('wr-piece-', '')));
  for (const id of ids) {
    await p.click(`[data-testid=wr-piece-${id}]`); await p.waitForTimeout(350);
    await p.screenshot({ path: `${out}/p-${id}.png`, clip: stage });
    shots.push(id);
    const note = await p.locator('[data-testid=wr-note]').count() ? await p.locator('[data-testid=wr-note]').textContent() : '';
    if (note) console.log(id, '→', note);
    // extras toggle off again so they are seen one at a time
    if (slot === 'extras' || slot === 'weapon' || slot === 'carry') await p.click(`[data-testid=wr-piece-${id}]`);
  }
}
fs.writeFileSync(`${out}/list.json`, JSON.stringify(shots));
console.log('pieces tried:', shots.length, 'errors:', errors);
await b.close();
