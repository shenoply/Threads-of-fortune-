import { chromium } from 'playwright';
import { PORT as __PORT } from './_env.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:760} });
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(()=>(localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.click('[data-testid=stall-wait]'); await p.waitForSelector('.scene'); await p.waitForTimeout(1500);
const m = await p.evaluate(() => { const s = document.querySelector('.scene'); const band = document.querySelector('.band'); return { h: s.clientHeight, w: s.clientWidth, band: band ? band.clientHeight : null }; });
console.log(m);
if (!(m.h > 0 && m.w > 0)) console.log('FAIL stall scene has no size');
await b.close();
