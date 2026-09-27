// Recorded dialogue. Every line in the game has a stable id (speaker + text).
// Clips are packed one file per character ("audio sprites"), described by voices/manifest.json:
//   { "sprites": { "samira": { "file": "voices/samira.mp3", "clips": { "1a2b3c4d": [start, dur], "9f8e7d6c.a": [...], "num-120": [...] } } } }
// Missing clips fall back to captions. Lines never overlap.
//
// A character's file is kept as the compressed MP3 it came as (a few MB) and each line is decoded
// on its own just before it is spoken. Decoding a whole file up front is what it replaced: half an
// hour of speech comes to some 400 MB of raw samples, and six such files at once had iPhones
// reloading the page for want of memory.
import { fetchMedia } from './cdn';

interface Frame { len: number; bytesPerSec: number }

/** The MP3 frame header at byte i, or null if the bytes there are not one. */
function frameAt(b: Uint8Array, i: number): Frame | null {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const version = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3;
  const bitrateIdx = b[i + 2] >> 4, srIdx = (b[i + 2] >> 2) & 3, padding = (b[i + 2] >> 1) & 1;
  if (version === 1 || layer !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) return null;
  const v1 = version === 3;
  const kbps = (v1 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[bitrateIdx];
  const sr = (v1 ? [44100, 48000, 32000] : version === 2 ? [22050, 24000, 16000] : [11025, 12000, 8000])[srIdx];
  return { len: Math.floor(((v1 ? 144 : 72) * kbps * 1000) / sr) + padding, bytesPerSec: (kbps * 1000) / 8 };
}

/** The first frame boundary at or after byte i: a header whose length leads to another header. */
function syncFrom(b: Uint8Array, i: number): number {
  for (let p = Math.max(0, i); p < b.length - 4; p++) {
    const f = frameAt(b, p);
    if (f && (p + f.len >= b.length || frameAt(b, p + f.len))) return p;
  }
  return Math.max(0, i);
}

const CLIP_CACHE = 40; // recent lines kept decoded; a few seconds each

export function lineId(speaker: string, text: string) {
  let h = 0x811c9dc5;
  const s = `${speaker}|${text.trim()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The words someone says aloud inside a narrated line: every "quoted" stretch. */
export function quotes(text: string): string[] {
  return [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter((q) => q.split(/\s+/).length >= 4);
}

/** Lines with a price are recorded as two halves around a number clip. */
export function templateOf(text: string): { template: string; n?: number } {
  // Money is written "85 PT" or "£E4.50" / "£E1,250"; the number clip speaks the unit.
  // commas only between digit groups, so "£6, nephew" keeps its comma
  const money = text.match(/£E?(\d{1,3}(?:,\d{3})+(?:\.\d\d)?|\d+(?:\.\d\d)?)|(\d+) PT\b/);
  if (money) {
    const n = money[1] !== undefined ? Math.round(parseFloat(money[1].replace(/,/g, '')) * 100) : Number(money[2]);
    return { template: text.replace(money[0], '{price}'), n };
  }
  const m = text.match(/\d+/);
  if (!m) return { template: text };
  return { template: text.replace(m[0], '{price}'), n: Number(m[0]) };
}

interface Sprite { file: string; clips: Record<string, [number, number]> }

class Voice {
  private sprites: Record<string, Sprite> = {};
  private files: Record<string, Uint8Array | 'loading' | 'failed'> = {};
  private clips = new Map<string, Promise<{ buf: AudioBuffer; lead: number } | null>>();
  private loading: Promise<void> | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private current: AudioBufferSourceNode | null = null;
  private token = 0;
  enabled = true;
  playing = false;
  count = 0;
  volume = 1;

  load() {
    if (this.loading) return this.loading;
    this.loading = fetch(`voices/manifest.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { sprites?: Record<string, Sprite> }) => {
        this.sprites = j.sprites ?? {};
        this.loadedOnce = true;
        this.count = Object.values(this.sprites).reduce((s, sp) => s + Object.keys(sp.clips).length, 0);
      })
      .catch(() => {});
    return this.loading;
  }

  private audioCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Start fetching a character's voice file ahead of time. */
  preload(speakers: string[]) {
    for (const sp of speakers) {
      const s = this.sprites[sp];
      if (!s || this.files[sp]) continue;
      this.files[sp] = 'loading';
      fetchMedia(`${s.file}?v=${Object.keys(s.clips).length}`)
        .then((r) => r.arrayBuffer())
        .then((b) => { this.files[sp] = new Uint8Array(b); })
        .catch(() => { this.files[sp] = 'failed'; });
    }
  }

  isLoading(speaker: string) {
    if (!this.enabled) return false;
    if (this.loading && !Object.keys(this.sprites).length && this.count === 0 && !this.loadedOnce) return true;
    return this.files[speaker] === 'loading';
  }
  loadedOnce = false;

  /** Resolves once a character's voice file is ready (or cannot be loaded). */
  async whenReady(speaker: string, timeoutMs = 4000) {
    await this.load();
    if (!this.sprites[speaker]) return;
    this.preload([speaker]);
    const t0 = performance.now();
    while (this.files[speaker] === 'loading' && performance.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 80));
  }

  private segments(speaker: string, text: string): [number, number][] | null {
    const sp = this.sprites[speaker];
    if (!sp) return null;
    const whole = sp.clips[lineId(speaker, text)];
    if (whole) return [whole];
    const { template, n } = templateOf(text);
    if (n === undefined) return null;
    const tid = lineId(speaker, template);
    const a = sp.clips[`${tid}.a`], num = sp.clips[`num-${n}`], b = sp.clips[`${tid}.b`];
    // a line that opens on the price has no first half
    const lead = template.trim().startsWith('{price}');
    if ((!a && !lead) || !num) return null;
    return [...(a ? [a] : []), num, ...(b ? [b] : [])];
  }

  has(speaker: string, text: string) {
    if (!this.enabled) return false;
    const f = this.files[speaker];
    if (!f || f === 'loading' || f === 'failed') {
      if (!f) this.preload([speaker]);
      return false;
    }
    return !!this.segments(speaker, text);
  }

  /**
   * One line, decoded on its own: the bytes for its stretch of the file with a little margin on
   * each side, cut at a frame boundary so the decoder starts cleanly. `lead` is where in the
   * decoded sound the line begins. Kept for a while in case the line comes round again.
   */
  private clip(speaker: string, seg: [number, number]) {
    const key = `${speaker}:${seg[0]}`;
    const hit = this.clips.get(key);
    if (hit) return hit;
    const f = this.files[speaker];
    const p = (async () => {
      if (!f || f === 'loading' || f === 'failed') return null;
      const rate = frameAt(f, syncFrom(f, 0))?.bytesPerSec ?? 4000;
      const margin = 0.3;
      const from = syncFrom(f, Math.floor((seg[0] - margin) * rate));
      const to = Math.min(f.length, Math.ceil((seg[0] + seg[1] + margin) * rate));
      try {
        const buf = await this.audioCtx().decodeAudioData(f.slice(from, to).buffer);
        // the decoder's own priming delay puts the sound a few ms later than the bytes say
        return { buf, lead: Math.max(0, seg[0] - from / rate - 0.02) };
      } catch {
        return null;
      }
    })();
    this.clips.set(key, p);
    if (this.clips.size > CLIP_CACHE) this.clips.delete(this.clips.keys().next().value!);
    return p;
  }

  /** True when this line will actually be heard: recorded, loaded, and the sound device running. */
  audible(speaker: string, text: string) {
    return this.has(speaker, text) && this.ctx?.state === 'running';
  }

  /** Play a line. Resolves when it finishes (at once if there is no recording yet). */
  say(speaker: string, text: string): Promise<void> {
    this.stop();
    if (!this.enabled) return Promise.resolve();
    const f = this.files[speaker];
    if (!f) this.preload([speaker]);
    if (!f || f === 'loading' || f === 'failed') return Promise.resolve();
    const segs = this.segments(speaker, text);
    if (!segs) return Promise.resolve();
    const ctx = this.audioCtx();
    const my = ++this.token;
    this.playing = true;
    // the next segment decodes while this one plays
    if (segs[1]) this.clip(speaker, segs[1]);
    return new Promise((resolve) => {
      let i = 0;
      const next = async () => {
        if (my !== this.token) return resolve();
        const seg = segs[i++];
        if (!seg) {
          this.playing = false;
          this.current = null;
          return resolve();
        }
        const c = await this.clip(speaker, seg);
        if (my !== this.token) return resolve();
        if (!c) return next();
        if (segs[i]) this.clip(speaker, segs[i]);
        const src = ctx.createBufferSource();
        src.buffer = c.buf;
        src.connect(this.gain!);
        src.onended = next;
        this.current = src;
        src.start(0, c.lead, seg[1] + 0.02);
      };
      next();
    });
  }

  stop() {
    this.token++;
    if (this.current) {
      this.current.onended = null;
      try {
        this.current.stop();
      } catch {
        /* already stopped */
      }
      this.current = null;
    }
    this.playing = false;
  }
}

export const voice = new Voice();
if (typeof window !== 'undefined') (window as unknown as { __tofVoice: Voice }).__tofVoice = voice;
