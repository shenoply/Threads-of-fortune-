// A new player's first hour, played the way a newcomer would: from a clean browser, always taking the
// most prominent thing the game asks for (a highlighted tour target, the big primary button, the
// objective's "Go" button). Every step is screenshotted and logged with the clock, cash and the words
// on screen, so the review can see where a newcomer stalls, reads too much, or can't tell what to do.
//   PORT=5173 SHOTS=/tmp/fh STEPS=60 W=390 H=844 node tests/firsthour.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT ?? '4173';
const S = process.env.SHOTS ?? '/tmp/fh';
mkdirSync(S, { recursive: true });
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const state = () => p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('threads-of-fortune-save')).state; return `day ${s.day} ${String(Math.floor(s.world.hour)).padStart(2, '0')}:${String(Math.floor((s.world.hour % 1) * 60)).padStart(2, '0')} · ${s.world.at ?? 'road'} · £${(s.cash / 100).toFixed(2)} · rep ${s.reputation} · sales ${s.totalSales ?? 0} · rugs ${s.inventory.length}`; } catch { return 'no save'; } });
// the most prominent call to action a newcomer would press
const banned = new Set();
const pick = () => p.evaluate((ban) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 20 && r.height > 16 && r.bottom > 0 && r.top < innerHeight && st.visibility !== 'hidden' && st.pointerEvents !== 'none' && !e.disabled; };
  const topmost = (e) => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit && (hit === e || e.contains(hit)); };
  const all = [...document.querySelectorAll('button, [role=button], a.btn')].filter((e) => vis(e) && topmost(e));
  const score = (e) => {
    const c = `${e.className}`; const t = (e.textContent || '').trim();
    let s = 0;
    if (/tour-target|beckon/.test(c)) s += 50;
    if (/\bglow\b/.test(c)) s += 80; // the tutorial's own highlight
    if (/^[▶■❚]/.test(t) || /gramophone|record/i.test(c)) s -= 80;
    if (/\bact\b/.test(c)) s += 12;
    if (/big-btn|big\b/.test(c)) s += 30;
    if (/primary/.test(c)) s += 20;
    if (/Go to|Serve|Continue|Begin|Next|Start|Open your stall|Buy|Sell|Accept|Deal|Agree|Show|Travel|Enter|Take|Pay/i.test(t)) s += 10;
    if (/Skip|Leave|Close|Not now|Back|Cancel|Settings|Step away|Turn back|New game|×|✕/i.test(t)) s -= 40;
    if (/^nav-/.test(e.dataset.testid || '')) s -= 20;
    if (e.getBoundingClientRect().top < 48) s -= 60; // the header strip: clock, paper, radio, settings
    if (/paper|radio|Courier|calendar/i.test(t)) s -= 60;
    if (ban.includes(t)) s -= 200;
    return s;
  };
  all.sort((a, b2) => score(b2) - score(a));
  const e = all[0];
  if (!e) return null;
  const id = `fh-${Math.random().toString(36).slice(2)}`; e.setAttribute('data-fh', id);
  return { id, text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), raw: (e.textContent || '').trim(), score: score(e), n: all.length };
}, [...banned]);
const words = () => p.evaluate(() => document.body.innerText.split(/\s+/).filter(Boolean).length);
const heading = () => p.evaluate(() => { const h = document.querySelector('[role=dialog] h1, [role=dialog] h2, h1, h2, .obj-text, [data-testid=objective] '); return (h?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80); });
try {
  await p.goto(`http://localhost:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  let last = '';
  const steps = +(process.env.STEPS ?? 60);
  for (let i = 1; i <= steps; i++) {
    const c = await pick();
    const st = await state();
    const w = await words();
    const hd = await heading();
    await p.screenshot({ path: `${S}/fh-${String(i).padStart(2, '0')}.png` });
    if (!c) { console.log(`${i}. [${st}] nothing to press | "${hd}" | ${w} words`); break; }
    console.log(`${i}. [${st}] "${hd}" | ${w} words on screen | press: "${c.text}" (${c.n} buttons)`);
    const key = `${c.text}|${st}`;
    if (key === last) { console.log('   (same button again: the newcomer is stuck here; trying something else next)'); banned.add(c.raw); }
    last = key;
    await p.click(`[data-fh="${c.id}"]`, { timeout: 5000 }).catch((e) => console.log('   click failed:', e.message.split('\n')[0]));
    await p.waitForTimeout(1600);
  }
} catch (e) { console.log('FAILED', e.message.split('\n')[0]); }
console.log('errors', JSON.stringify(errs));
await b.close();
