import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 })).newPage();
const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4173/');
const save = fs.readFileSync('/home/claude/shots/save.json','utf8');
await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('tof-intro-seen-v2','1'); localStorage.setItem('threads-of-fortune-save', s); }, save);
await p.reload();
await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
const has = async s => (await p.locator(s).count())>0;
if (await has('[data-testid=nav-map]')) await p.click('[data-testid=nav-map]');
await p.waitForTimeout(600);
if (await has('[data-testid=leave-settlement]')) await p.click('[data-testid=leave-settlement]');
await p.waitForTimeout(400);
await p.screenshot({ path: '/home/claude/shots/look-map.png' });
if (await has('[data-testid=jobs-btn]')) { await p.click('[data-testid=jobs-btn]'); await p.waitForTimeout(400); await p.screenshot({ path: '/home/claude/shots/look-obj.png' }); if (await has('[data-testid=obj-tab-jobs]')) { await p.click('[data-testid=obj-tab-jobs]'); await p.waitForTimeout(300); await p.screenshot({ path: '/home/claude/shots/look-obj-jobs.png' }); } if (await has('[data-testid=obj-close]')) await p.click('[data-testid=obj-close]'); }
const paper = p.locator('button[aria-label*="ewspaper"], [data-testid=hud-paper], [data-testid=open-paper]').first();
if (await paper.count()) { await paper.click(); await p.waitForTimeout(700); await p.screenshot({ path: '/home/claude/shots/look-paper.png', fullPage: false }); }
console.log('errors', errs);
await b.close();
