// Recorded dialogue. Every line in the game has a stable id (speaker + text).
// Clips are packed one file per character ("audio sprites"), described by voices/manifest.json:
//   { "sprites": { "samira": { "file": "voices/samira.mp3", "clips": { "1a2b3c4d": [start, dur], "9f8e7d6c.a": [...], "num-120": [...] } } } }
// Missing clips fall back to captions. Lines never overlap.
import { fetchMedia } from './cdn';

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
  private buffers: Record<string, AudioBuffer | 'loading' | 'failed'> = {};
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
      if (!s || this.buffers[sp]) continue;
      this.buffers[sp] = 'loading';
      const ctx = this.audioCtx();
      fetchMedia(`${s.file}?v=${Object.keys(s.clips).length}`)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { this.buffers[sp] = buf; })
        .catch(() => { this.buffers[sp] = 'failed'; });
    }
  }

  isLoading(speaker: string) {
    if (!this.enabled) return false;
    if (this.loading && !Object.keys(this.sprites).length && this.count === 0 && !this.loadedOnce) return true;
    return this.buffers[speaker] === 'loading';
  }
  loadedOnce = false;

  /** Resolves once a character's voice file is ready (or cannot be loaded). */
  async whenReady(speaker: string, timeoutMs = 4000) {
    await this.load();
    if (!this.sprites[speaker]) return;
    this.preload([speaker]);
    const t0 = performance.now();
    while (this.buffers[speaker] === 'loading' && performance.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 80));
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
    const buf = this.buffers[speaker];
    if (!buf || buf === 'loading' || buf === 'failed') {
      if (!buf) this.preload([speaker]);
      return false;
    }
    return !!this.segments(speaker, text);
  }

  /** True when this line will actually be heard: recorded, loaded, and the sound device running. */
  audible(speaker: string, text: string) {
    return this.has(speaker, text) && this.ctx?.state === 'running';
  }

  /** Play a line. Resolves when it finishes (at once if there is no recording yet). */
  say(speaker: string, text: string): Promise<void> {
    this.stop();
    if (!this.enabled) return Promise.resolve();
    const buf = this.buffers[speaker];
    if (!buf) this.preload([speaker]);
    if (!buf || buf === 'loading' || buf === 'failed') return Promise.resolve();
    const segs = this.segments(speaker, text);
    if (!segs) return Promise.resolve();
    const ctx = this.audioCtx();
    const my = ++this.token;
    this.playing = true;
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (my !== this.token) return resolve();
        const seg = segs[i++];
        if (!seg) {
          this.playing = false;
          this.current = null;
          return resolve();
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.gain!);
        src.onended = next;
        this.current = src;
        src.start(0, seg[0], seg[1]);
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
