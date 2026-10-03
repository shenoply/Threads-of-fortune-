// Plays a bulletin through a warm, crackling wireless set. The music ducks while the announcer speaks.
import { audio } from '../audio/engine';
import { fetchMedia } from '../audio/cdn';
import type { Lang, Segment, Group } from './bulletin';

interface Manifest { [lang: string]: { [g: string]: { file: string; clips: Record<string, [number, number]> } } }

class RadioPlayer {
  private manifest: Manifest | null = null;
  private loading: Promise<Manifest | null> | null = null;
  private bufs = new Map<string, Promise<AudioBuffer | null>>();
  private src: AudioBufferSourceNode | null = null;
  private hiss: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  private runId = 0;
  playing = false;

  private load() {
    if (!this.loading) this.loading = fetch('audio/radio/manifest.json').then((r) => r.json()).then((m: Manifest) => (this.manifest = m)).catch(() => null);
    return this.loading;
  }
  private buffer(url: string) {
    const ctx = audio.ctx!;
    if (!this.bufs.has(url)) this.bufs.set(url, fetchMedia(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null));
    return this.bufs.get(url)!;
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
    const groups = new Set<Group>(segs.map((s) => s.group));
    for (const g of groups) if (m[lang]?.[g]) this.buffer(m[lang][g].file);
    await new Promise((r) => setTimeout(r, from > 0 ? 150 : 700));
    for (let i = Math.max(0, from); i < segs.length; i++) {
      if (run !== this.runId) return;
      const s = segs[i];
      const grp = m[lang]?.[s.group];
      const clip = grp?.clips[s.key];
      onLine(i);
      if (!grp || !clip) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      const buf = await this.buffer(grp.file);
      if (run !== this.runId) return;
      if (!buf) { await new Promise((r) => setTimeout(r, 1500)); continue; } // a piece that would not load: its caption shows, the rest goes on
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.out!);
        src.onended = () => resolve();
        src.start(ctx.currentTime + 0.05, clip[0], clip[1]);
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
