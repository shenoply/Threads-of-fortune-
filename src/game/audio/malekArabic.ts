// Plays one of Malek's Arabic clips at the dialogue volume, one at a time. Nothing waits on it: if the
// browser will not play yet (no tap so far) or dialogue is off, the words on screen are enough.
import { ARABIC_BY_ID } from '../../data/malekArabic';
import { dialogueVolume } from './arranVoice';
import { audio } from './engine';
import { filmLock } from './voice';
import { stopArranVoice } from './arranVoice';

let current: HTMLAudioElement | null = null;
/** for tests: the last clip asked for */
export const malekArabicDebug = { last: '' };

/** Play the clip. The promise settles when it has finished (or was stopped, or never started), so
 *  whatever he says next in English can wait for it instead of talking over it. */
export function sayMalekArabic(phraseId: string, rnd = Math.random): Promise<void> {
  const p = ARABIC_BY_ID[phraseId];
  if (!p) return Promise.resolve();
  const clip = p.clips[Math.floor(rnd() * p.clips.length)] ?? p.clips[0];
  malekArabicDebug.last = clip;
  const vol = dialogueVolume();
  if (vol <= 0 || typeof Audio === 'undefined' || filmLock.active) return Promise.resolve();
  if (current) { const prev = current; current = null; prev.pause(); audio.detach(prev); }
  const a = audio.attach(new Audio(`audio/malek/ar-${clip}.mp3`), 'dialogue');
  current = a;
  audio.duckForVoice(true);
  return new Promise<void>((resolve) => {
    // a clip that never reports back (a stalled download) does not hold up the English for long
    const guard = window.setTimeout(() => resolve(), 4000);
    const done = () => { clearTimeout(guard); resolve(); if (current === a) { current = null; audio.duckForVoice(false); } };
    a.onended = done;
    a.onerror = done;
    a.onpause = done; // stopped by the dialogue switch, a slider at zero, or stopMalekArabic()
    a.play().catch(done);
  });
}
export function stopMalekArabic() {
  if (current) { const a = current; current = null; a.pause(); audio.detach(a); audio.duckForVoice(false); }
}
