// Recorded dialogue. Every line in the game has a stable id (speaker + text).
// Clips are packed one file per character ("audio sprites"), described by voices/manifest.json:
//   { "sprites": { "samira": { "file": "voices/samira.mp3", "clips": { "1a2b3c4d": [start, dur], "9f8e7d6c.a": [...], "num-120": [...] } } } }
// Missing clips fall back to captions. Lines never overlap.
//
// Each line is fetched on its own with an HTTP Range request (a few KB: the bytes for its stretch of
// the file) and decoded just before it is spoken. Nobody downloads a character's whole file (2 to 8
// MB) any more just to hear their first line; a server that ignores Range sends the whole file once,
// and it is kept and sliced as before. Each line is decoded on its own just before it is spoken. Decoding a whole file up front is what it replaced: half an
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

const CLIP_CACHE = 40;
/** every recording is 32 kbit/s MP3 (4,000 bytes a second); a file made at another rate is caught by clip() */
const RATE_GUESS = 4000; // recent lines kept decoded; a few seconds each

/** speakers whose price lines are voiced without the number (it stays on screen) */
const SILENT_NUMBERS = new Set(['seller']);

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
  /** bytes per second of each character's file, once a fetched line has shown it differs from RATE_GUESS */
  private rates: Record<string, number> = {};
  private clips = new Map<string, Promise<{ buf: AudioBuffer; lead: number } | null>>();
  private loading: Promise<void> | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private current: AudioBufferSourceNode | null = null;
  private token = 0;
  enabled = true;
  private _playing = false;
  /** told when a line starts and stops, so the street and music can step back (set by the audio engine) */
  onPlaying: ((on: boolean) => void) | null = null;
  get playing() { return this._playing; }
  set playing(v: boolean) { if (v !== this._playing) { this._playing = v; this.onPlaying?.(v); } }
  count = 0;
  volume = 1;

  load() {
    if (this.loading) return this.loading;
    // revalidated each time (a 304 when unchanged) rather than downloaded afresh: it is a quarter of a megabyte
    this.loading = fetch('voices/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { sprites?: Record<string, Sprite> }) => {
        this.sprites = j.sprites ?? {};
        this.loadedOnce = true;
        this.count = Object.values(this.sprites).reduce((s, sp) => s + Object.keys(sp.clips).length, 0);
        if (!this.count) this.retry();
      })
      .catch(() => { this.retry(); });
    return this.loading;
  }
  /** a failed manifest (a dropped connection on the phone) is fetched again a little later, not given up on */
  private retries = 0;
  private retry() {
    if (this.retries++ > 4) return;
    window.setTimeout(() => { this.loading = null; void this.load(); }, 1500 * this.retries);
  }

  private audioCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** the file's address, versioned by its clip table: a re-recorded file never meets an old copy in a cache */
  private url(sp: string) {
    const s = this.sprites[sp];
    let h = 0;
    for (const [id, [st, d]] of Object.entries(s.clips)) for (const c of `${id}:${st}:${d};`) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
    return `${s.file}?v=${h.toString(36)}`;
  }

  /** Bytes [from, to) of a character's file. A 206 is just those bytes; a 200 is the whole file, kept. */
  private async range(sp: string, from: number, to: number): Promise<{ bytes: Uint8Array; offset: number } | null> {
    const whole = this.files[sp];
    if (whole instanceof Uint8Array) return { bytes: whole.slice(from, to), offset: from };
    try {
      const r = await fetchMedia(this.url(sp), { headers: { Range: `bytes=${from}-${Math.max(from, to - 1)}` } });
      const b = new Uint8Array(await r.arrayBuffer());
      if (r.status === 206) return { bytes: b, offset: from };
      this.files[sp] = b; // the server sent everything: keep it
      return { bytes: b.slice(from, to), offset: from };
    } catch {
      return null;
    }
  }

  /** The file's byte rate: what its fetched lines have shown, or the rate all the recordings are made at. */
  private rateOf(sp: string) {
    return this.rates[sp] ?? RATE_GUESS;
  }

  /** Nothing to fetch ahead any more: the byte rate is no longer read from the file before the first
   *  line (every line's own bytes carry it), so a character's first line is a single request. */
  preload(_speakers: string[]) {
    void this.load();
  }

  isLoading(_speaker: string) {
    if (!this.enabled) return false;
    return !!this.loading && !Object.keys(this.sprites).length && this.count === 0 && !this.loadedOnce;
  }
  loadedOnce = false;

  /** Resolves once a character's voice file is ready (or cannot be loaded). */
  async whenReady(_speaker: string, _timeoutMs = 4000) {
    await this.load();
  }

  private segments(speaker: string, text: string): [number, number][] | null {
    const own = this.segmentsOf(speaker, text);
    if (own) return own;
    // a renamed rug keeps its recordings until the line is recorded again under the new name
    const old = text.replace(/Constantinople Tulip/g, 'Istanbul Tulip');
    return old !== text ? this.segmentsOf(speaker, old) : null;
  }

  private segmentsOf(speaker: string, text: string, depth = 0): [number, number][] | null {
    const sp = this.sprites[speaker];
    if (!sp) return null;
    const whole = sp.clips[lineId(speaker, text)];
    if (whole) return [whole];
    // a line made of lines: a buyer's "Hm." recorded on its own in front of a sentence recorded on its
    // own. The longest recorded opening is taken, and the rest found the same way.
    const parts = depth < 4 ? text.split(/(?<=[.!?…])\s+/) : [];
    if (parts.length > 1) {
      for (let i = parts.length - 1; i >= 1; i--) {
        const head = sp.clips[lineId(speaker, parts.slice(0, i).join(' '))];
        if (!head) continue;
        const rest = this.segmentsOf(speaker, parts.slice(i).join(' '), depth + 1);
        if (rest) return [head, ...rest];
      }
    }
    const { template, n } = templateOf(text);
    if (n === undefined) return null;
    const tid = lineId(speaker, template);
    const a = sp.clips[`${tid}.a`], num = sp.clips[`num-${n}`], b = sp.clips[`${tid}.b`];
    // a line that opens on the price has no first half
    const lead = template.trim().startsWith('{price}');
    // Hassan's own voice says his half of the line; the figure itself is only shown on screen (a
    // synthetic voice reading the number in the middle of his would break it)
    if (SILENT_NUMBERS.has(speaker)) return a || b ? [...(a ? [a] : []), ...(b ? [b] : [])] : null;
    if ((!a && !lead) || !num) return null;
    return [...(a ? [a] : []), num, ...(b ? [b] : [])];
  }

  has(speaker: string, text: string) {
    if (!this.enabled) return false;
    const ok = !!this.segments(speaker, text);
    if (ok) this.preload([speaker]);
    return ok;
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
    const p = (async () => {
      const margin = 0.3;
      const fetchAt = (rate: number) => this.range(speaker, Math.max(0, Math.floor((seg[0] - margin) * rate)), Math.ceil((seg[0] + seg[1] + margin) * rate));
      let rate = this.rateOf(speaker);
      let got = await fetchAt(rate);
      if (!got || !got.bytes.length) return null;
      // cut at a frame boundary so the decoder starts cleanly
      let cut = syncFrom(got.bytes, 0);
      // the frame there says what the file's byte rate really is; a file recorded at another rate
      // is fetched again at the right place (once: the rate is then known for that character)
      const real = frameAt(got.bytes, cut)?.bytesPerSec;
      if (real && real !== rate) {
        this.rates[speaker] = rate = real;
        got = await fetchAt(rate);
        if (!got || !got.bytes.length) return null;
        cut = syncFrom(got.bytes, 0);
      }
      const from = got.offset + cut;
      try {
        const buf = await this.audioCtx().decodeAudioData(got.bytes.slice(cut).buffer);
        // the decoder's own priming delay puts the sound a few ms later than the bytes say
        return { buf, lead: Math.max(0, seg[0] - from / rate - 0.02) };
      } catch {
        return null;
      }
    })();
    this.clips.set(key, p);
    // a line that failed to fetch or decode is tried afresh next time, not silent for the rest of the session
    void p.then((r) => { if (!r && this.clips.get(key) === p) this.clips.delete(key); });
    if (this.clips.size > CLIP_CACHE) this.clips.delete(this.clips.keys().next().value!);
    return p;
  }

  /** wake the sound device (made on the first touch, so the phone lets it run) */
  wake() {
    if (!this.enabled) return;
    if (!this.ctx || this.ctx.state !== 'running') this.audioCtx();
  }

  /** True when this line will actually be heard: recorded, loaded, and the sound device running. */
  audible(speaker: string, text: string) {
    return this.has(speaker, text) && this.ctx?.state === 'running';
  }

  /** Play a line. Resolves when it finishes (at once if there is no recording yet). */
  say(speaker: string, text: string): Promise<void> {
    this.stop();
    if (!this.enabled || filmLock.active) return Promise.resolve();
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
        // a few ms of fade at each end: a cut that lands mid-sound, or the first breath of the next
        // line in the file, would otherwise be heard as a click
        const fade = ctx.createGain();
        const t0 = ctx.currentTime, len = seg[1];
        fade.gain.setValueAtTime(0, t0);
        fade.gain.linearRampToValueAtTime(1, t0 + 0.012);
        fade.gain.setValueAtTime(1, t0 + Math.max(0.02, len - 0.06));
        fade.gain.linearRampToValueAtTime(0, t0 + len);
        src.connect(fade);
        fade.connect(this.gain!);
        let ended = false;
        const end = () => { if (ended) return; ended = true; window.clearTimeout(guard); fade.disconnect(); next(); };
        src.onended = end;
        // if the sound device is held (the phone paused it, or it never got going) the line must not
        // hold the conversation up: it is let go a little after it would have finished
        const guard = window.setTimeout(() => { if (my === this.token) { try { src.stop(); } catch { /* */ } end(); } }, (len + 1.5) * 1000);
        this.current = src;
        src.start(0, c.lead, len);
      };
      next();
    });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
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

/** A film or cutscene has the stage: while any is open, no character voice, Arabic phrase or narrator may start under it. */
export const filmLock = {
  n: 0,
  get active() { return this.n > 0; },
  on() { this.n += 1; },
  off() { this.n = Math.max(0, this.n - 1); },
};

export const voice = new Voice();

// Phones hold a sound device until the player touches the screen, and may hold it again after the
// screen locks or the app is put aside. Every touch wakes the voices' device if it has been held, so
// a conversation never plays on in silence.
if (typeof window !== 'undefined') {
  const wake = () => voice.wake();
  window.addEventListener('pointerdown', wake, { capture: true, passive: true });
  window.addEventListener('keydown', wake, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
}
if (typeof window !== 'undefined') (window as unknown as { __tofVoice: Voice }).__tofVoice = voice;
