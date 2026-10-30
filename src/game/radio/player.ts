// Plays a bulletin through a warm, crackling wireless set. The music ducks while the announcer speaks.
import { audio } from '../audio/engine';
import { fetchMedia } from '../audio/cdn';
import { frameAt, syncFrom } from '../audio/voice';
import type { Lang, Segment, Group } from './bulletin';

interface Manifest { [lang: string]: { [g: string]: { file: string; clips: Record<string, [number, number]> } } }
/** one piece of the bulletin, decoded on its own; `lead` is where in it the piece begins */
interface Slice { buf: AudioBuffer; lead: number }
/** the bulletin files are 40 kbit/s MP3 (5,000 bytes a second); a file made at another rate is caught from its own frames */
const RATE_GUESS = 5000;
const SLICE_CACHE = 16;

class RadioPlayer {
  private manifest: Manifest | null = null;
  private loading: Promise<Manifest | null> | null = null;
  // Each piece is fetched on its own with an HTTP Range request (the bytes for its stretch of the
  // file, a few tens of KB) just before it is read, the next one while this one plays, rather than
  // three whole files (5 MB and more) the moment the set is switched on. A request already on its way
  // is shared, never made twice.
  private slices = new Map<string, Promise<Slice | null>>();
  private rates = new Map<string, number>();
  /** a server that ignores Range sends the whole file once: it is kept and sliced from then on */
  private whole = new Map<string, Uint8Array>();
  /** the first request to each file, so a second one waits to learn whether the server slices */
  private probes = new Map<string, Promise<unknown>>();
  private src: AudioBufferSourceNode | null = null;
  private hiss: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  private runId = 0;
  playing = false;

  private load() {
    if (!this.loading) this.loading = fetch('audio/radio/manifest.json').then((r) => r.json()).then((m: Manifest) => (this.manifest = m)).catch(() => null);
    return this.loading;
  }
  private async range(url: string, from: number, to: number): Promise<Uint8Array | null> {
    const probe = this.probes.get(url);
    if (probe) await probe.catch(() => {});
    const w = this.whole.get(url);
    if (w) return w.slice(from, to);
    const p = (async () => {
      const r = await fetchMedia(url, { headers: { Range: `bytes=${from}-${Math.max(from, to - 1)}` } });
      if (!r.ok) return null;
      const b = new Uint8Array(await r.arrayBuffer());
      if (r.status === 206) return b;
      this.whole.set(url, b);
      return b.slice(from, to);
    })().catch(() => null);
    if (!probe) this.probes.set(url, p);
    return p;
  }
  /** one piece: [start, dur] seconds into the file */
  private slice(url: string, clip: [number, number]): Promise<Slice | null> {
    const key = `${url}:${clip[0]}`;
    const hit = this.slices.get(key);
    if (hit) return hit;
    const ctx = audio.ctx!;
    const p = (async () => {
      const margin = 0.3;
      const at = (rate: number) => this.range(url, Math.max(0, Math.floor((clip[0] - margin) * rate)), Math.ceil((clip[0] + clip[1] + margin) * rate));
      let rate = this.rates.get(url) ?? RATE_GUESS;
      let bytes = await at(rate);
      if (!bytes?.length) return null;
      let cut = syncFrom(bytes, 0);
      const real = frameAt(bytes, cut)?.bytesPerSec;
      if (real && real !== rate) {
        this.rates.set(url, (rate = real));
        bytes = await at(rate);
        if (!bytes?.length) return null;
        cut = syncFrom(bytes, 0);
      }
      const from = Math.max(0, Math.floor((clip[0] - margin) * rate)) + cut;
      const buf = await ctx.decodeAudioData(bytes.slice(cut).buffer);
      return { buf, lead: Math.max(0, clip[0] - from / rate - 0.02) };
    })().catch(() => null);
    this.slices.set(key, p);
    void p.then((r) => { if (!r && this.slices.get(key) === p) this.slices.delete(key); });
    if (this.slices.size > SLICE_CACHE) this.slices.delete(this.slices.keys().next().value!);
    return p;
  }

  /** Play the bulletin; onLine is called with the index of each piece as it starts. `from` starts
   *  part-way through (skipping to the news, or a line you tapped). */
  async play(lang: Lang, segs: Segment[], onLine: (i: number) => void, onEnd: () => void, volume = 1, from = 0) {
    this.stop();
    if (!audio.ensure()) { onEnd(); return; }
    const run = ++this.runId;
    this.playing = true;
    const ctx = audio.ctx!;
    const m = await this.load();
    if (run !== this.runId) return;
    // no bulletin to read (the list would not load): the set is off again, and the screen is told
    if (!m) { this.stop(); onEnd(); return; }
    // the set warms up: a gentle hiss with the odd crackle
    this.out = ctx.createGain();
    this.out.gain.value = volume; // lower when it plays in the background at the stall
    this.out.connect(audio.gains.dialogue);
    const n = ctx.sampleRate * 3, hb = ctx.createBuffer(1, n, ctx.sampleRate), d = hb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.012 + (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.5 : 0);
    const hiss = ctx.createBufferSource(); hiss.buffer = hb; hiss.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2200; hp.Q.value = 0.6;
    hiss.connect(hp).connect(this.out); hiss.start(); this.hiss = hiss;
    audio.duckMusic(true);
    const pieceAt = (i: number) => { const s = segs[i]; const grp = s && m[lang]?.[s.group as Group]; const clip = grp?.clips[s.key]; return grp && clip ? { file: grp.file, clip } : null; };
    // the first piece is fetched while the set warms up
    { const p = pieceAt(Math.max(0, from)); if (p) void this.slice(p.file, p.clip); }
    await new Promise((r) => setTimeout(r, from > 0 ? 150 : 700));
    for (let i = Math.max(0, from); i < segs.length; i++) {
      if (run !== this.runId) return;
      const piece = pieceAt(i);
      onLine(i);
      if (!piece) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      const got = await this.slice(piece.file, piece.clip);
      if (run !== this.runId) return;
      if (!got) { await new Promise((r) => setTimeout(r, 1500)); continue; } // a piece that would not load: its caption shows, the rest goes on
      // the next piece comes in while this one is read
      { const nx = pieceAt(i + 1); if (nx) void this.slice(nx.file, nx.clip); }
      const len = piece.clip[1];
      await new Promise<void>((resolve) => {
        // one piece at a time: anything still sounding stops before the next starts
        if (this.src) { const prev = this.src; prev.onended = null; try { prev.stop(); } catch { /* ended */ } }
        const src = ctx.createBufferSource();
        src.buffer = got.buf;
        src.connect(this.out!);
        let done = false;
        const finish = () => { if (done) return; done = true; window.clearTimeout(guard); if (this.src === src) this.src = null; resolve(); };
        src.onended = finish;
        // a held sound device (phone locked) must not leave the set hanging mid-bulletin
        const guard = window.setTimeout(() => { try { src.stop(); } catch { /* ended */ } finish(); }, (len + 2) * 1000);
        src.start(ctx.currentTime + 0.05, got.lead, len);
        this.src = src;
      });
    }
    if (run !== this.runId) return;
    this.stop();
    onEnd();
  }

  stop() {
    this.runId++;
    this.playing = false;
    try { this.src?.stop(); } catch { /* done */ }
    try { this.hiss?.stop(); } catch { /* done */ }
    this.src = null; this.hiss = null;
    if (this.out) { const o = this.out; setTimeout(() => o.disconnect(), 200); this.out = null; }
    audio.duckMusic(false);
  }
}

export const radio = new RadioPlayer();
