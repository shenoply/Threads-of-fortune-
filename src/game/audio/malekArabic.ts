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

export function sayMalekArabic(phraseId: string, rnd = Math.random) {
  const p = ARABIC_BY_ID[phraseId];
  if (!p) return;
  const clip = p.clips[Math.floor(rnd() * p.clips.length)] ?? p.clips[0];
  malekArabicDebug.last = clip;
  const vol = dialogueVolume();
  if (vol <= 0 || typeof Audio === 'undefined' || filmLock.active) return;
  if (current) { const prev = current; current = null; prev.pause(); audio.detach(prev); }
  const a = audio.attach(new Audio(`audio/malek/ar-${clip}.mp3`), 'dialogue');
  current = a;
  audio.duckForVoice(true);
  const done = () => { if (current === a) { current = null; audio.duckForVoice(false); } };
  a.onended = done;
  a.onerror = done;
  a.onpause = done; // stopped by the dialogue switch or a slider at zero
  a.play().catch(done);
}
export function stopMalekArabic() {
  if (current) { const a = current; current = null; a.pause(); audio.detach(a); audio.duckForVoice(false); }
}
