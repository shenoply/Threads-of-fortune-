// Audio: recorded ambience for each kind of place, recorded one-shot sounds, and rendered music themes
// that change with the place and the hour and cross-fade into each other.
// Dialogue plays recorded clips only. With no clip, captions carry the line.
import { voice } from './voice';

export type Channel = 'dialogue' | 'music' | 'sfx' | 'ambience';
type Toggles = Record<Channel, boolean>;

/** Where the player is, as far as the ears are concerned. */
export type Env = 'market' | 'port' | 'palace' | 'auction-small' | 'auction-grand' | 'road';
/** Which set of music themes fits the moment. */
export type MusicCtx = 'documentary' | 'stall' | 'evening' | 'road' | 'town' | 'istanbul' | 'palace' | 'auction-small' | 'auction-grand';

interface FxClip { file: string; dur: number }
interface Bank { fx: Record<string, FxClip[]>; beds: Record<string, { file: string; dur: number }> }

const LEVELS: Record<Channel, number> = { dialogue: 1, music: 0.5, sfx: 0.7, ambience: 0.55 };

const PLAYLISTS: Record<MusicCtx, string[]> = {
  documentary: ['title-hijaz'],
  stall: ['khan-bayati', 'khan-rast', 'khan-kurd'],
  evening: ['evening-saba', 'evening-bayati'],
  road: ['road-hijaz', 'road-bayati'],
  town: ['khan-rast', 'khan-kurd', 'khan-bayati'],
  istanbul: ['istanbul-ussak', 'khan-kurd'],
  palace: ['palace-rast', 'palace-nahawand'],
  'auction-small': ['auction'],
  'auction-grand': ['salon-waltz', 'auction'],
};

/** Sounds that happen now and then in each place: [clip set, weight, gain, distance 0 near .. 1 far]. */
const EVENTS: Record<Env, [string, number, number, number][]> = {
  market: [['footsteps', 3, 0.5, 0.3], ['laughing', 2, 0.35, 0.6], ['coughing', 1.5, 0.3, 0.5], ['pouring_water', 1.5, 0.35, 0.4], ['drinking_sipping', 1, 0.3, 0.2], ['hen', 1.2, 0.3, 0.7], ['rooster', 0.6, 0.25, 0.85], ['dog', 1, 0.25, 0.9], ['sheep', 1, 0.28, 0.8], ['crow', 0.8, 0.25, 0.8], ['chirping_birds', 1.5, 0.25, 0.6], ['door_wood_creaks', 1, 0.3, 0.5], ['cow', 0.4, 0.22, 0.9]],
  port: [['footsteps', 2, 0.45, 0.3], ['laughing', 1.5, 0.3, 0.6], ['coughing', 1, 0.28, 0.5], ['chirping_birds', 1, 0.22, 0.6], ['dog', 0.8, 0.22, 0.9], ['door_wood_creaks', 1, 0.28, 0.5], ['pouring_water', 1, 0.3, 0.4]],
  palace: [['footsteps', 3, 0.35, 0.5], ['door_wood_creaks', 1.2, 0.25, 0.6], ['coughing', 0.8, 0.18, 0.7], ['laughing', 0.6, 0.16, 0.8], ['chirping_birds', 1.2, 0.18, 0.85], ['pouring_water', 0.6, 0.18, 0.8]],
  'auction-small': [['coughing', 2.5, 0.3, 0.4], ['laughing', 1.2, 0.3, 0.5], ['footsteps', 1.5, 0.3, 0.5], ['door_wood_creaks', 1.2, 0.25, 0.5], ['drinking_sipping', 0.8, 0.22, 0.3]],
  'auction-grand': [['coughing', 2, 0.22, 0.6], ['footsteps', 1.5, 0.25, 0.6], ['laughing', 0.8, 0.18, 0.7], ['door_wood_creaks', 0.8, 0.18, 0.7]],
  road: [['sheep', 1.5, 0.25, 0.85], ['crow', 1.5, 0.28, 0.8], ['chirping_birds', 1.2, 0.22, 0.7], ['dog', 0.6, 0.2, 0.95], ['footsteps', 1, 0.3, 0.3]],
};
const INDOOR: Env[] = ['palace', 'auction-small', 'auction-grand'];

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  gains = {} as Record<Channel, GainNode>;
  toggles: Toggles = { dialogue: true, music: true, sfx: true, ambience: true };
  musicOn = false;
  ambienceOn = false;
  private voice: HTMLAudioElement | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private hall: ConvolverNode | null = null;
  private bank: Bank | null = null;
  private bankLoading: Promise<Bank | null> | null = null;
  private bufs = new Map<string, Promise<AudioBuffer | null>>();
  state = { musicPlaying: false, ambiencePlaying: false, voicePlaying: false, lastSfx: '', env: 'market' as Env, music: '' as string, track: '' };
  scene: 'market' | 'road' = 'market';

  // ---------- setup ----------
  ensure() {
    voice.load();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    (Object.keys(LEVELS) as Channel[]).forEach((c) => {
      const g = this.ctx!.createGain();
      g.gain.value = this.toggles[c] ? LEVELS[c] : 0;
      g.connect(this.master);
      this.gains[c] = g;
    });
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // a shared room for indoor one-shots
    const sr = this.ctx.sampleRate, n = Math.floor(sr * 1.8);
    const ir = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    this.hall = this.ctx.createConvolver();
    this.hall.buffer = ir;
    const hg = this.ctx.createGain(); hg.gain.value = 0.35;
    this.hall.connect(hg).connect(this.gains.ambience);
    this.loadBank();
    return true;
  }

  setToggles(t: Toggles) {
    this.toggles = { ...t };
    voice.enabled = t.dialogue;
    if (!t.dialogue) voice.stop();
    if (!this.ctx) return;
    (Object.keys(LEVELS) as Channel[]).forEach((c) => this.gains[c].gain.setTargetAtTime(t[c] ? LEVELS[c] : 0, this.ctx!.currentTime, 0.1));
    if (this.voice) this.voice.muted = !t.dialogue;
  }

  /** Lower the music while the radio announcer speaks. */
  duckMusic(on: boolean) {
    if (!this.ctx) return;
    this.gains.music.gain.setTargetAtTime(this.toggles.music ? LEVELS.music * (on ? 0.18 : 1) : 0, this.ctx.currentTime, 0.4);
    this.gains.ambience.gain.setTargetAtTime(this.toggles.ambience ? LEVELS.ambience * (on ? 0.5 : 1) : 0, this.ctx.currentTime, 0.4);
  }

  private loadBank() {
    if (!this.bankLoading) this.bankLoading = fetch('audio/soundbank.json').then((r) => r.json()).then((b: Bank) => (this.bank = b)).catch(() => null);
    return this.bankLoading;
  }
  private buffer(url: string): Promise<AudioBuffer | null> {
    if (!this.bufs.has(url)) {
      const c = this.ctx!;
      this.bufs.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); }).then((b) => c.decodeAudioData(b)).catch(() => null));
      // keep memory in check: forget the oldest music buffers
      const music = [...this.bufs.keys()].filter((k) => k.includes('/music/'));
      if (music.length > 5) this.bufs.delete(music[0]);
    }
    return this.bufs.get(url)!;
  }

  // ---------- one-shots ----------
  private lastClip: Record<string, number> = {};
  /** Play one recording from a set, never the same one twice in a row. */
  private async clip(set: string, opts: { gain?: number; far?: number; dest?: AudioNode; rate?: number; offset?: number; dur?: number; indoor?: boolean } = {}) {
    if (!this.ctx) return;
    const bank = this.bank ?? (await this.loadBank());
    const list = bank?.fx[set];
    if (!list?.length) return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.lastClip[set]) i = (i + 1) % list.length;
    this.lastClip[set] = i;
    const buf = await this.buffer(list[i].file);
    if (!buf || !this.ctx) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 0.94 + Math.random() * 0.12;
    const far = opts.far ?? 0;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 12000 - far * 9500;
    const g = c.createGain();
    g.gain.value = (opts.gain ?? 0.4) * (1 - far * 0.45);
    const pan = c.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * (0.3 + far * 0.5);
    src.connect(lp).connect(g).connect(pan).connect(opts.dest ?? this.gains.ambience);
    if (opts.indoor && this.hall) pan.connect(this.hall);
    const off = opts.offset ?? 0;
    const dur = opts.dur ? Math.min(opts.dur, buf.duration - off) : undefined;
    if (dur) {
      const t = c.currentTime;
      g.gain.setValueAtTime(g.gain.value, t + dur - 0.06);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.start(t, off, dur);
    } else src.start(c.currentTime, off);
  }

  private noise(dur: number, dest: AudioNode, opts: { type?: BiquadFilterType; f?: number; q?: number; gain?: number; attack?: number; f2?: number; delay?: number } = {}) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = c.createBiquadFilter();
    filt.type = opts.type ?? 'bandpass';
    filt.frequency.value = opts.f ?? 1000;
    filt.Q.value = opts.q ?? 1;
    const g = c.createGain();
    const t = c.currentTime + (opts.delay ?? 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.5, t + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (opts.f2) filt.frequency.exponentialRampToValueAtTime(opts.f2, t + dur);
    src.connect(filt).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** A coin: a short noise strike through a few inharmonic resonances, every coin a little different. */
  private coin(delay: number, gain = 0.1) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const base = 2400 + Math.random() * 1600;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const strike = c.createGain();
    strike.gain.setValueAtTime(0.0001, t);
    strike.gain.exponentialRampToValueAtTime(1, t + 0.002);
    strike.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    src.connect(strike);
    [1, 1.52, 2.33, 3.11].forEach((m, k) => {
      const bpf = c.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = base * m * (0.99 + Math.random() * 0.02);
      bpf.Q.value = 60 + k * 30;
      const g = c.createGain();
      g.gain.setValueAtTime(gain * (k === 0 ? 6 : 3.5 / (k + 1)), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 - k * 0.06);
      strike.connect(bpf).connect(g).connect(this.gains.sfx);
    });
    src.start(t, Math.random());
    src.stop(t + 0.4);
  }

  sfx(name: string) {
    if (!this.ensure() || !this.toggles.sfx) return;
    this.state.lastSfx = name;
    const d = this.gains.sfx;
    switch (name) {
      case 'unfold':
        this.noise(0.55, d, { type: 'bandpass', f: 300, f2: 2400, q: 0.7, gain: 0.45, attack: 0.08 });
        this.noise(0.35, d, { type: 'lowpass', f: 900, gain: 0.3, attack: 0.02, delay: 0.38 });
        break;
      case 'page':
        this.noise(0.3, d, { type: 'bandpass', f: 2500, f2: 5000, q: 0.8, gain: 0.25, attack: 0.04 });
        break;
      case 'paper':
        this.noise(0.45, d, { type: 'bandpass', f: 900, f2: 3600, q: 0.6, gain: 0.35, attack: 0.06 });
        this.noise(0.3, d, { type: 'highpass', f: 3000, gain: 0.18, attack: 0.02, delay: 0.3 });
        break;
      case 'brush':
        this.noise(0.25, d, { type: 'highpass', f: 2500, gain: 0.22, attack: 0.05 });
        break;
      case 'coins': {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.coin(i * (0.05 + Math.random() * 0.07), 0.09);
        break;
      }
      case 'coin':
        this.coin(0, 0.1);
        break;
      case 'pen':
        for (let i = 0; i < 4; i++) this.noise(0.06, d, { type: 'highpass', f: 5000, gain: 0.1, delay: i * 0.07 });
        break;
      case 'tea':
      case 'water':
        this.clip('pouring_water', { gain: 0.35, dest: d, dur: 1.6 });
        break;
      case 'meow':
        this.clip('cat', { gain: 0.45, dest: d, rate: 1 });
        break;
      case 'purr':
        for (let i = 0; i < 10; i++) this.noise(0.09, d, { type: 'lowpass', f: 180, gain: 0.25, delay: i * 0.095 });
        break;
      case 'step':
        this.clip('footsteps', { gain: 0.45, dest: d, offset: Math.random() * 2, dur: 0.9 });
        break;
      case 'arrive':
        // a few steps and a door, not a bell
        this.clip('footsteps', { gain: 0.4, dest: d, offset: Math.random() * 1.5, dur: 1.4 });
        if (Math.random() < 0.5) setTimeout(() => this.clip('door_wood_creaks', { gain: 0.25, dest: d, dur: 1.5 }), 700);
        break;
      case 'train':
        this.clip('train', { gain: 0.4, dest: d, dur: 3.5 });
        break;
      case 'gavel':
        this.clip('door_wood_knock', { gain: 0.6, dest: d, dur: 0.35, rate: 0.9 });
        break;
      case 'applause':
        this.clip('clapping', { gain: 0.3, dest: d, dur: 3, indoor: true });
        break;
      case 'chest':
        this.noise(0.2, d, { type: 'lowpass', f: 380, gain: 0.45 });
        this.noise(0.12, d, { type: 'bandpass', f: 1200, q: 3, gain: 0.12, delay: 0.03 });
        break;
      case 'bell':
        // kept for old call sites: a soft, varied brass chime rather than the same bell every time
        this.coin(0, 0.06);
        break;
      case 'tap':
        this.noise(0.05, d, { type: 'bandpass', f: 1600 + Math.random() * 500, q: 2, gain: 0.1 });
        break;
      case 'sold':
        this.sfx('coins');
        break;
    }
  }

  // ---------- ambience ----------
  private hour = 10;
  private dayOver = false;
  private bedLayers = new Map<string, { gain: GainNode; timer: number | null; alive: boolean }>();
  private eventTimer: number | null = null;
  private envStack: { key: string; env: Env; music?: MusicCtx }[] = [];
  private baseEnv: Env = 'market';
  private baseMusic: MusicCtx = 'stall';

  private get night() { return this.hour >= 20 || this.hour < 5; }
  private currentEnv(): Env { return this.envStack.length ? this.envStack[this.envStack.length - 1].env : this.baseEnv; }
  private currentMusic(): MusicCtx {
    for (let i = this.envStack.length - 1; i >= 0; i--) if (this.envStack[i].music) return this.envStack[i].music!;
    return this.baseMusic;
  }

  /** Start a looping bed that never repeats plainly: overlapping slices from random points of the recording. */
  private startBed(key: string, level: number) {
    if (!this.ctx || !this.bank) return;
    const info = this.bank.beds[key];
    if (!info) return;
    const c = this.ctx;
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.gains.ambience);
    gain.gain.setTargetAtTime(level, c.currentTime, 1.2);
    const layer = { gain, timer: null as number | null, alive: true };
    this.bedLayers.set(key, layer);
    this.buffer(info.file).then((buf) => {
      if (!buf || !layer.alive || !this.ctx) return;
      const grain = (first: boolean) => {
        if (!layer.alive || !this.ctx) return;
        const now = this.ctx.currentTime;
        const len = 14 + Math.random() * 16, fade = 3;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 0.97 + Math.random() * 0.06;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(first ? 0.9 : 0.0001, now);
        if (!first) g.gain.exponentialRampToValueAtTime(0.9, now + fade);
        g.gain.setValueAtTime(0.9, now + len - fade);
        g.gain.exponentialRampToValueAtTime(0.0001, now + len);
        src.connect(g).connect(gain);
        src.start(now, Math.random() * Math.max(1, buf.duration - len - 1), len);
        layer.timer = window.setTimeout(() => grain(false), (len - fade) * 1000);
      };
      grain(true);
    });
  }
  private stopBed(key: string) {
    const l = this.bedLayers.get(key);
    if (!l || !this.ctx) return;
    l.alive = false;
    if (l.timer) clearTimeout(l.timer);
    l.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
    const g = l.gain;
    setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 4000);
    this.bedLayers.delete(key);
  }

  /** Bring the beds in line with where we are and what hour it is. */
  private syncAmbience() {
    if (!this.ambienceOn || !this.ctx) return;
    if (!this.bank) { this.loadBank().then(() => this.syncAmbience()); return; }
    const env = this.currentEnv();
    this.state.env = env;
    const want = new Map<string, number>();
    want.set(env, env === 'market' && (this.dayOver || this.night) ? 0.45 : 1);
    if (this.night && !INDOOR.includes(env)) want.set('night', 1);
    for (const k of [...this.bedLayers.keys()]) if (!want.has(k)) this.stopBed(k);
    for (const [k, lvl] of want) {
      const l = this.bedLayers.get(k);
      if (l) l.gain.gain.setTargetAtTime(lvl, this.ctx.currentTime, 1);
      else this.startBed(k, lvl);
    }
  }

  private scheduleEvents() {
    if (this.eventTimer) clearTimeout(this.eventTimer);
    const tick = () => {
      if (!this.ambienceOn || !this.ctx) return;
      const env = this.currentEnv();
      const busy = env === 'market' && !this.night && !this.dayOver;
      let list = EVENTS[env].filter(([set]) => !(set === 'rooster' && this.hour > 10) && !((set === 'hen' || set === 'crow' || set === 'chirping_birds') && this.night));
      if (this.night && !INDOOR.includes(env)) list = list.filter(([set]) => ['dog', 'footsteps', 'door_wood_creaks', 'coughing'].includes(set));
      if (list.length) {
        const total = list.reduce((s, e) => s + e[1], 0);
        let r = Math.random() * total;
        const pick = list.find((e) => (r -= e[1]) <= 0) ?? list[0];
        this.clip(pick[0], { gain: pick[2], far: pick[3], indoor: INDOOR.includes(env), dur: 4 });
      }
      const gap = busy ? 3000 + Math.random() * 7000 : 6000 + Math.random() * 14000;
      this.eventTimer = window.setTimeout(tick, gap);
    };
    this.eventTimer = window.setTimeout(tick, 3500);
  }

  startAmbience() {
    if (!this.ensure() || this.ambienceOn) return;
    this.ambienceOn = true;
    this.state.ambiencePlaying = true;
    this.syncAmbience();
    this.scheduleEvents();
  }

  stopAmbience() {
    this.ambienceOn = false;
    this.state.ambiencePlaying = false;
    if (this.eventTimer) clearTimeout(this.eventTimer);
    for (const k of [...this.bedLayers.keys()]) this.stopBed(k);
  }

  /** The base place: the stall and towns, or the road. */
  setScene(scene: 'market' | 'road') {
    this.scene = scene;
    this.baseEnv = scene === 'road' ? 'road' : 'market';
    this.baseMusic = scene === 'road' ? 'road' : this.dayOver || this.hour >= 18 ? 'evening' : 'stall';
    this.syncAmbience();
    this.syncMusic();
  }

  /** The clock matters: roosters in the morning, crickets at night, evening music after the stall closes. */
  setClock(hour: number, dayOver: boolean) {
    const changed = (hour >= 20 || hour < 5) !== this.night || dayOver !== this.dayOver || (hour >= 18) !== (this.hour >= 18);
    this.hour = hour;
    this.dayOver = dayOver;
    if (changed) this.setScene(this.scene);
  }

  /** A screen that brings its own place (a town, a palace, a sale room) on top of the base. */
  pushEnv(key: string, env: Env, music?: MusicCtx) {
    this.envStack = this.envStack.filter((e) => e.key !== key);
    this.envStack.push({ key, env, music });
    this.syncAmbience();
    this.syncMusic();
  }
  popEnv(key: string) {
    const before = this.envStack.length;
    this.envStack = this.envStack.filter((e) => e.key !== key);
    if (this.envStack.length !== before) { this.syncAmbience(); this.syncMusic(); }
  }

  // ---------- music ----------
  private musicCtx: MusicCtx | null = null;
  private track: { name: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private musicTimer: number | null = null;
  private recent: string[] = [];

  private chooseTrack(ctx: MusicCtx) {
    const list = PLAYLISTS[ctx];
    const fresh = list.filter((n) => !this.recent.includes(n));
    const pool = fresh.length ? fresh : list.filter((n) => n !== this.recent[this.recent.length - 1]);
    return (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
  }

  private fadeOutTrack(secs = 3) {
    if (!this.track || !this.ctx) return;
    const { src, gain } = this.track;
    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + secs);
    try { src.stop(this.ctx.currentTime + secs + 0.1); } catch { /* stopped */ }
    this.track = null;
    this.state.track = '';
  }

  private async playTrack(name: string, fadeIn = 2.5) {
    if (!this.ctx || !this.musicOn) return;
    const want = this.musicCtx;
    const buf = await this.buffer(`audio/music/${name}.mp3`);
    if (!buf || !this.ctx || !this.musicOn || this.musicCtx !== want) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.linearRampToValueAtTime(1, c.currentTime + fadeIn);
    src.connect(gain).connect(this.gains.music);
    src.start();
    this.track = { name, src, gain };
    this.state.track = name;
    this.recent = [...this.recent.filter((n) => n !== name), name].slice(-3);
    src.onended = () => {
      if (this.track?.src !== src) return;
      this.track = null;
      this.state.track = '';
      // a pause of just the room between pieces, then the next one
      const gap = this.musicCtx === 'documentary' ? 800 : 15000 + Math.random() * 30000;
      if (this.musicTimer) clearTimeout(this.musicTimer);
      this.musicTimer = window.setTimeout(() => this.musicCtx && this.playTrack(this.chooseTrack(this.musicCtx)), gap);
    };
  }

  private syncMusic() {
    if (!this.musicOn || !this.ctx) return;
    const next = this.currentMusic();
    if (next === this.musicCtx) return;
    this.musicCtx = next;
    this.state.music = next;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    // the piece already playing may suit the new place too
    if (this.track && PLAYLISTS[next].includes(this.track.name)) return;
    const had = !!this.track;
    this.fadeOutTrack(3);
    this.musicTimer = window.setTimeout(() => this.playTrack(this.chooseTrack(next)), had ? 2000 : 600);
  }

  /** Kept for the opening film and the first morning. */
  startMusic(mode: 'documentary' | 'stall' = 'stall') {
    if (!this.ensure()) return;
    this.musicOn = true;
    this.state.musicPlaying = true;
    if (mode === 'documentary') this.pushEnv('documentary', this.currentEnv(), 'documentary');
    else this.popEnv('documentary');
    this.musicCtx = null;
    this.syncMusic();
  }

  stopMusic() {
    this.musicOn = false;
    this.state.musicPlaying = false;
    this.popEnvSilently('documentary');
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.fadeOutTrack(1.2);
    this.musicCtx = null;
    this.state.music = '';
  }
  private popEnvSilently(key: string) { this.envStack = this.envStack.filter((e) => e.key !== key); }

  // ---------- dialogue ----------
  playVoice(url?: string) {
    this.stopVoice();
    if (!url || !this.toggles.dialogue) return;
    const a = new Audio(url);
    this.voice = a;
    this.state.voicePlaying = true;
    a.onended = () => { this.state.voicePlaying = false; };
    a.play().catch(() => { this.state.voicePlaying = false; });
  }

  stopVoice() {
    if (this.voice) { this.voice.pause(); this.voice = null; }
    this.state.voicePlaying = false;
  }

  stopAll() {
    voice.stop();
    this.stopMusic();
    this.stopVoice();
    this.stopAmbience();
  }
}

export const audio = new AudioEngine();
if (typeof window !== 'undefined') (window as unknown as { __tofAudio: AudioEngine }).__tofAudio = audio;
