// While a film is open no character voice may start under it; afterwards voices work again
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = []; let ok = true; const check = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) ok = false; };
await p.goto(`http://localhost:${PORT}/`);
const r = await p.evaluate(async () => {
  const v = await import('/src/game/audio/voice.ts'); const e = await import('/src/game/audio/engine.ts'); const m = await import('/src/game/audio/malekArabic.ts'); const a = await import('/src/game/audio/arranVoice.ts');
  const res = {};
  v.filmLock.on();
  e.audio.playVoice('audio/none.mp3'); res.engineDuring = e.audio.state.voicePlaying;
  m.sayMalekArabic('greeting'); res.arabicDuring = m.malekArabicDebug.last;
  res.arranDuring = a.playArranVoice({ id: 'x' }) ;
  res.say = await Promise.race([v.voice.say('malek', 'hello'), new Promise((r) => setTimeout(() => r('hung'), 500))]);
  res.lockOn = v.filmLock.active; v.filmLock.off(); res.lockOff = !v.filmLock.active;
  return res;
});
check(!r.engineDuring, 'no engine voice starts under a film'); check(r.say !== 'hung', 'character lines resolve at once under a film'); check(r.lockOn && r.lockOff, 'the lock is counted and released');
console.log(out.join('\n'), JSON.stringify(r)); console.log(ok && !errs.length ? 'PASS' : 'FAIL', errs);
await b.close();
