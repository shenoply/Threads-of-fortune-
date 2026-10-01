// Plays one of Malek's Arabic clips at the dialogue volume, one at a time. Nothing waits on it: if the
// browser will not play yet (no tap so far) or dialogue is off, the words on screen are enough.
import { ARABIC_BY_ID } from '../../data/malekArabic';
import { dialogueVolume } from './arranVoice';

let current: HTMLAudioElement | null = null;
/** for tests: the last clip asked for */
export const malekArabicDebug = { last: '' };

export function sayMalekArabic(phraseId: string, rnd = Math.random) {
  const p = ARABIC_BY_ID[phraseId];
  if (!p) return;
  const clip = p.clips[Math.floor(rnd() * p.clips.length)] ?? p.clips[0];
  malekArabicDebug.last = clip;
  const vol = dialogueVolume();
  if (vol <= 0 || typeof Audio === 'undefined') return;
  if (current) current.pause();
  const a = new Audio(`audio/malek/ar-${clip}.mp3`);
  a.volume = vol;
  current = a;
  a.onended = () => { if (current === a) current = null; };
  a.play().catch(() => { if (current === a) current = null; });
}
export function stopMalekArabic() {
  if (current) { current.pause(); current = null; }
}
