import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 } });
await p.goto('http://localhost:4173/'); await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]');
await p.evaluate(() => { const k='threads-of-fortune-save'; const d=JSON.parse(localStorage.getItem(k)); d.state.tutorial={done:true,step:'done',inspected:true}; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); await p.click('[data-testid=continue]'); await p.click('[data-testid=nav-map]'); await p.waitForTimeout(300);
await p.click('[data-testid=enter]'); await p.click('[data-testid=npc-abuhamid]');
const s=[]; for (let i=0;i<24;i++){ s.push(await p.evaluate(() => window.__tofVoice.playing)); await p.waitForTimeout(250); }
console.log('Abu Hamid speaking:', s.map(x=>x?'#':'.').join(''));
await b.close();
