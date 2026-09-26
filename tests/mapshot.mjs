import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [vw, vh, tag] of [[390, 760, 'phone'], [1280, 760, 'wide']]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'))); await p.reload();
  await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
  await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; d.state.world.fog='1'.repeat(177*113); localStorage.setItem(k, JSON.stringify(d)); });
  await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(900);
  await p.screenshot({ path: `/home/claude/shots/m-${tag}-1.png` });
  await p.click('button[aria-label="Zoom out"]'); await p.click('button[aria-label="Zoom out"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `/home/claude/shots/m-${tag}-0.png` });
  for (let i=0;i<5;i++) await p.click('[data-testid=world-zoom-in]'); await p.waitForTimeout(700);
  await p.screenshot({ path: `/home/claude/shots/m-${tag}-2.png` });
  console.log(tag, errs);
  await p.close();
}
await b.close();
