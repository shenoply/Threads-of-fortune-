import { chromium } from 'playwright';
import { PORT as __PORT, SHOTS as __SHOTS } from './_env.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:900,height:900}, deviceScaleFactor:1 });
await p.goto(`http://localhost:${__PORT}/`); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload(); // skip the opening film
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('threads-of-fortune-save')).state.started === true; } catch { return false; } }, null, { timeout: 10000 }).catch(() => {}); /* day one is on disk before the save is edited */
await p.waitForTimeout(500);
await p.evaluate(()=>{ const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true};
 d.state.inventory=['red-medina','nile-reed','sapphire-night'].map((t,i)=>({uid:'x'+i,typeId:t,condition:'Good',restored:false,provenance:'Likely',paid:10,notes:[]})); (window.__tofEdit = true, localStorage.setItem(k, JSON.stringify(d)), window.__tofEdit = false, (() => { /* hold the game's autosave off the edited save until the reload */ const w = Storage.prototype.setItem; if (w.__hold) return; const h = function (key, v) { if (key === 'threads-of-fortune-save' && !window.__tofEdit) return; return w.call(this, key, v); }; h.__hold = true; Storage.prototype.setItem = h; setTimeout(() => { if (Storage.prototype.setItem === h) Storage.prototype.setItem = w; }, 4000); })()); });
await p.reload(); await p.click('[data-testid=continue]'); await p.waitForTimeout(400);
await p.click('[data-testid=nav-inventory]'); await p.waitForTimeout(300);
await p.click('text=Inspect >> nth=2'); await p.waitForTimeout(500);
await p.screenshot({path:`${__SHOTS}/rug-sapphire.png`});
await b.close();
