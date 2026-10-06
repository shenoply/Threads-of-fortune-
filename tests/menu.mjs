// The title menu after the audit: Ironman is explained before it starts; New game offers all three modes
// (Sandbox too) and starts the chosen one at once after asking about keeping the current game; Sandbox
// has no guided start and shows its badge; Ironman's autosave cannot be switched off; replacing a save
// slot asks first; save labels say mode, character and place; settings close from the top and Esc.
//   PORT=5173 node tests/menu.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
const has = (s) => p.locator(s).count();
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('threads-of-fortune-save'))?.state);
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => (localStorage.clear(), localStorage.setItem('tof-intro-seen-v2', '1'), localStorage.setItem('tof-films-once', '1'))); await p.reload(); await p.waitForTimeout(900);
await p.click('[data-testid=open-ironman]');
const txt = await p.locator('[data-testid=mode-ironman]').innerText();
check(/run is over/i.test(txt) && /cannot be turned off/i.test(txt), 'Ironman is explained before starting');
await p.click('[data-testid=mode-close]');
await p.click('[data-testid=skip-to-day]'); await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(900);
// a campaign game exists; back to the menu
await p.evaluate(() => localStorage.setItem('tof-intro-seen-v2', '1')); await p.reload(); await p.waitForTimeout(900);
check((await has('[data-testid=continue]')) > 0 && (await has('[data-testid=new-game]')) > 0, 'returning menu: Continue and New game');
await p.click('[data-testid=new-game]');
check((await has('[data-testid=mode-sandbox]')) > 0, 'New game still offers Sandbox');
await p.click('[data-testid=start-sandbox]');
check((await has('[data-testid=mode-keep]')) > 0, 'asks about keeping the current game first');
await p.click('[data-testid=keep-and-start]'); await p.waitForTimeout(400);
check((await has('[data-testid=sandbox-choose]')) > 0, 'and goes straight on to the sandbox (no detour to the menu)');
const slots = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('slot')).map((k) => JSON.parse(localStorage.getItem(k)).meta));
check(slots.length === 1 && slots[0].mode === 'Campaign' && slots[0].hero === 'Hassan', `the old game was kept in a slot, labelled (${JSON.stringify(slots[0])})`);
await p.click('[data-testid=play-as-hassan]'); await p.waitForTimeout(400);
if (await has('[data-testid=begin-day-one]')) await p.click('[data-testid=begin-day-one]'); await p.waitForTimeout(1000);
check((await has('[data-testid=hud-sandbox]')) > 0, 'Sandbox badge in the game');
check((await has('[data-testid=first-hour]')) === 0, 'no guided opening in the sandbox');
// settings: close at the top, Esc, storage note, replace asks
await p.click('[aria-label="Settings"], [data-testid=settings-btn], [data-testid=hud-settings]').catch(() => {});
await p.waitForTimeout(400);
if (await has('[data-testid=settings]')) {
  check((await has('[data-testid=settings-close]')) > 0 && (await has('[data-testid=save-where]')) > 0, 'settings: Close at the top and where saves are kept');
  let asked = false; p.once('dialog', (d) => { asked = true; d.dismiss(); });
  await p.click('[data-testid=slot-save-1]'); await p.waitForTimeout(200);
  check(asked, 'replacing a filled slot asks first');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check((await has('[data-testid=settings]')) === 0, 'Esc closes the settings');
} else check(false, 'settings opened');
// Ironman: autosave locked on
await p.evaluate(() => { const k = 'threads-of-fortune-save'; const d = JSON.parse(localStorage.getItem(k)); d.state.ironman = true; d.state.playMode = undefined; localStorage.setItem(k, JSON.stringify(d)); });
await p.reload(); if (await has('[data-testid=continue]')) await p.click('[data-testid=continue]'); await p.waitForTimeout(800);
await p.click('[aria-label="Settings"], [data-testid=settings-btn], [data-testid=hud-settings]').catch(() => {}); await p.waitForTimeout(300);
check(await p.locator('[data-testid=toggle-autosave]').isDisabled(), 'Ironman: autosave cannot be switched off');
console.log(out.join('\n'));
console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close(); process.exit(ok ? 0 : 1);
