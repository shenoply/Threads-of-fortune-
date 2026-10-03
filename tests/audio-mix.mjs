// The mixer after "Music test batch 1": ducking reasons stack and survive slider moves, overlapping
// music requests leave one source, Stop reaches every source, plain players follow the sliders.
//   PORT=5173 node tests/audio-mix.mjs
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '5173';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const a = window.__tofAudio; const out = {};
  a.ensure(); await a.ctx.resume();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = () => +a.gains.music.gain.value.toFixed(3);
  const full = a.level('music');
  a.duckForVoice(true); await wait(900); out.ducked = g() / full;
  a.setVolumes({ master: 1, music: 1, sfx: 1, dialogue: 1 }); await wait(600); out.duckAfterSlider = g() / full;
  a.duckMusic(true); await wait(1500); out.radioAndVoice = g() / full;
  a.duckForVoice(false); await wait(3500); out.radioAfterVoiceEnds = g() / full;
  a.duckMusic(false); a.muteMusic(true); await wait(1500); out.record = g();
  a.muteMusic(false); await wait(3500); out.backToFull = g() / full;
  // two requests at once: one source left
  a.musicOn = true; a.musicCtx = 'stall';
  await Promise.all([a.playTrack('khan-rast', 0.1), a.playTrack('khan-kurd', 0.1)]);
  await wait(300); out.liveAfterRace = a.live.size; out.track = a.state.track;
  a.stopMusic(); await wait(2200); out.liveAfterStop = a.live.size;
  // a plain player follows the sliders and the dialogue switch
  const el = a.attach(new Audio(), 'dialogue');
  a.setVolumes({ master: 0, music: 1, sfx: 1, dialogue: 1 }); out.elAtMaster0 = el.volume;
  a.setVolumes({ master: 1, music: 1, sfx: 1, dialogue: 0.5 }); out.elAtHalf = el.volume;
  const rec = a.attach(new Audio(), 'music', 0.85);
  a.setToggles({ dialogue: false, music: false, sfx: true, ambience: true }); out.recWithMusicOff = rec.volume; out.elDetachedWhenDialogueOff = !a.els.has(el);
  a.setToggles({ dialogue: true, music: true, sfx: true, ambience: true }); out.recBack = +rec.volume.toFixed(3);
  return out;
});
console.log(JSON.stringify(r, null, 1));
const ok = Math.abs(r.ducked - 0.45) < 0.03 && Math.abs(r.duckAfterSlider - 0.45) < 0.03 && Math.abs(r.radioAndVoice - 0.18) < 0.03 && Math.abs(r.radioAfterVoiceEnds - 0.18) < 0.03
  && r.record < 0.01 && r.backToFull > 0.97 && r.liveAfterRace === 1 && r.liveAfterStop === 0 && r.elAtMaster0 === 0 && r.elAtHalf === 0.5 && r.recWithMusicOff === 0 && r.elDetachedWhenDialogueOff && r.recBack === 0.85;
console.log(ok ? 'PASS' : 'FAIL', 'errors', JSON.stringify(errs));
await b.close();
