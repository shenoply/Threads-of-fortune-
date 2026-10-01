import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:760} });
await p.goto('http://localhost:4173/'); await p.evaluate(()=>(localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload();
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{const s=document.querySelector('.scene'); const c=document.querySelector('.cam'); return {h:s.clientHeight,w:s.clientWidth,t:c.style.transform, band:document.querySelector('.band').clientHeight}}));
await b.close();
