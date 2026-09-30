// Arran's voice: one clip at a time, never overlapping any other speaker, always with a subtitle.
// Clips are pre-recorded files listed in public/audio/arran/manifest.json; a line with no file is
// a subtitle alone, so the game never depends on sound and never requests a file that is absent.
import { create } from 'zustand';
import { ARRAN_LINE, ARRAN_VOICE_LINES, type ArranVoiceContext, type ArranVoiceLine } from '../../data/arranVoice';
import { voice } from './voice';
import { audio } from './engine';

/** what is on screen now: the speaker label and the exact words */
export interface ActiveDialogue { npcId: string; speaker: string; text: string; voiceLineId?: string; mood?: ArranVoiceLine['mood'] }
export const useSubtitle = create<{ active: ActiveDialogue | null }>(() => ({ active: null }));

const RECENT = 3;
const recent: string[] = [];
const lastPlayed = new Map<string, number>();
const onceDone = new Set<string>();
let current: HTMLAudioElement | null = null;
let clearTimer: number | null = null;
let manifest: Record<string, string[]> | null = null;
let manifestLoading: Promise<void> | null = null;
const preloaded = new Map<string, HTMLAudioElement>();

function loadManifest() {
  if (manifest || manifestLoading) return manifestLoading ?? Promise.resolve();
  manifestLoading = fetch('audio/arran/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { lines: {} }))
    .then((j: { lines?: Record<string, string[]> }) => { manifest = j.lines ?? {}; })
    .catch(() => { manifest = {}; });
  return manifestLoading;
}

/** the file to play for a line in this browser, or null if it has not been recorded */
function srcFor(line: ArranVoiceLine) {
  const exts = manifest?.[line.id];
  if (!exts?.length) return null;
  const probe = typeof Audio !== 'undefined' ? new Audio() : null;
  const ogg = exts.includes('ogg') && probe?.canPlayType('audio/ogg; codecs="vorbis"');
  const ext = ogg ? 'ogg' : exts.includes('mp3') ? 'mp3' : exts[0];
  return `${line.file}.${ext}`;
}

/** effective dialogue level: master × dialogue, zero when dialogue is switched off */
export function dialogueVolume() {
  const v = audio.volumes;
  return audio.toggles.dialogue ? Math.max(0, Math.min(1, v.master * v.dialogue)) : 0;
}

/** Weighted pick among lines for a context, skipping the last three heard, lines cooling down and spent one-offs. */
export function pickArranLine(context: ArranVoiceContext, now = Date.now(), rnd = Math.random): ArranVoiceLine | null {
  const all = ARRAN_VOICE_LINES.filter((l) => l.contexts.includes(context) && !(l.once && onceDone.has(l.id)));
  if (!all.length) return null;
  const cool = all.filter((l) => !l.cooldownMs || now - (lastPlayed.get(l.id) ?? -Infinity) >= l.cooldownMs);
  const fresh = (cool.length ? cool : all).filter((l) => !recent.includes(l.id));
  const pool = fresh.length ? fresh : cool.length ? cool : all;
  const total = pool.reduce((s, l) => s + (l.weight ?? 1), 0);
  let r = rnd() * total;
  for (const l of pool) { r -= l.weight ?? 1; if (r <= 0) return l; }
  return pool[pool.length - 1];
}

export function stopArranVoice(clearSubtitle = true) {
  if (current) {
    current.onended = null;
    current.onerror = null;
    current.pause();
    current = null;
  }
  if (clearTimer) { window.clearTimeout(clearTimer); clearTimer = null; }
  if (clearSubtitle) useSubtitle.setState({ active: null });
}

/** keep a playing line in step with the volume sliders */
export function syncArranVolume() {
  if (current) current.volume = dialogueVolume();
}

/**
 * Say a line: by context (a fresh line is picked) or by id. Interrupts any Arran line and any other
 * character's voice. Call from a user action (a tap), so browsers allow the sound.
 */
export function playArranVoice(what: ArranVoiceContext | { id: string; noSubtitle?: boolean }): ArranVoiceLine | null {
  const line = typeof what === 'string' ? pickArranLine(what) : ARRAN_LINE[what.id] ?? null;
  if (!line) return null;
  stopArranVoice(false);
  voice.stop();
  audio.stopVoice();
  const now = Date.now();
  lastPlayed.set(line.id, now);
  if (line.once) onceDone.add(line.id);
  recent.push(line.id);
  while (recent.length > RECENT) recent.shift();
  // a line already written on screen (a scene's opening in the conversation panel) needs no second caption
  if (typeof what === 'string' || !what.noSubtitle) useSubtitle.setState({ active: { npcId: 'arran', speaker: 'Arran', text: line.text, voiceLineId: line.id, mood: line.mood } });

  // the subtitle stays long enough to read even in silence, and at least as long as the clip
  const readMs = Math.max(2600, 900 + line.text.split(/\s+/).length * 330);
  const hold = () => { if (clearTimer) window.clearTimeout(clearTimer); clearTimer = window.setTimeout(() => { if (useSubtitle.getState().active?.voiceLineId === line.id) useSubtitle.setState({ active: null }); }, 900); };
  clearTimer = window.setTimeout(() => { if (!current && useSubtitle.getState().active?.voiceLineId === line.id) useSubtitle.setState({ active: null }); }, readMs);

  const go = () => {
    const src = srcFor(line);
    const vol = dialogueVolume();
    if (!src || vol <= 0) return; // subtitle only
    const a = preloaded.get(src) ?? new Audio(src);
    preloaded.delete(src);
    a.currentTime = 0;
    a.volume = vol;
    current = a;
    a.onended = () => { if (current === a) { current = null; hold(); } };
    a.onerror = () => { if (current === a) current = null; };
    a.play().catch(() => { if (current === a) current = null; });
  };
  if (manifest) go();
  else void loadManifest().then(() => { if (useSubtitle.getState().active?.voiceLineId === line.id) go(); });
  return line;
}

/** Fetch the common lines ahead (greetings, inspection, warnings); rare scenes load when used. */
export function preloadArranVoice() {
  void loadManifest().then(() => {
    for (const l of ARRAN_VOICE_LINES) {
      if (!l.preload) continue;
      const src = srcFor(l);
      if (!src || preloaded.has(src)) continue;
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      preloaded.set(src, a);
    }
  });
}

/** for tests: forget what has been heard */
export function resetArranVoiceMemory() {
  recent.length = 0;
  lastPlayed.clear();
  onceDone.clear();
}

// read-only view for automated tests: is a clip playing, at what volume, from which file
if (typeof window !== 'undefined') {
  (window as unknown as { __arranVoice: object }).__arranVoice = {
    playing: () => !!current && !current.paused,
    volume: () => current?.volume ?? null,
    src: () => current?.src ?? null,
  };
}
