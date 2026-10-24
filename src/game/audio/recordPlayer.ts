// The gramophone's record, playing on whatever screen you are on: put a record on and it plays while
// you trade, until you pause it, change it or it ends (then the next of your records goes on). The
// game's own score steps aside while a record plays and comes back when it stops.
import { audio } from './engine';

type Listener = () => void;
const LEVEL = 0.85;

class RecordPlayer {
  current: string | null = null;
  playing = false;
  failed: string | null = null;
  private el: HTMLAudioElement | null = null;
  private queue: () => string[] = () => [];
  private subs = new Set<Listener>();
  /** the records to go on to when one ends (your shelf, in order) */
  setShelf(f: () => string[]) { this.queue = f; }
  subscribe(f: Listener) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  private emit() { for (const f of this.subs) f(); }

  private fade(el: HTMLAudioElement, from: number, to: number, ms: number, then?: () => void) {
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.setElLevel(el, from + (to - from) * k);
      if (k < 1) requestAnimationFrame(tick); else then?.();
    };
    tick();
  }
  private letGo(ms: number) {
    const el = this.el;
    this.el = null;
    if (!el) return;
    this.fade(el, LEVEL, 0, ms, () => { el.pause(); audio.detach(el); });
  }

  play(id: string) {
    audio.ensure();
    this.failed = null;
    this.letGo(300);
    audio.muteMusic(true, 1.1);
    const el = audio.attach(new Audio(`audio/music/${id}.mp3`), 'record', 0);
    this.el = el; this.current = id; this.playing = true;
    const mine = () => this.el === el;
    el.onended = () => { if (!mine()) return; this.next(); };
    const fail = () => { if (!mine()) return; this.el = null; audio.detach(el); this.playing = false; this.failed = id; audio.muteMusic(false); this.emit(); };
    el.onerror = fail;
    el.play().catch(fail);
    this.fade(el, 0, LEVEL, 1200);
    this.emit();
  }
  /** pause where it is (the score comes back) */
  pause() {
    if (!this.el || !this.playing) return;
    const el = this.el;
    this.playing = false;
    this.fade(el, LEVEL, 0, 350, () => { if (!this.playing) el.pause(); });
    audio.muteMusic(false);
    this.emit();
  }
  resume() {
    if (!this.el) { if (this.current) this.play(this.current); return; }
    const el = this.el;
    audio.muteMusic(true, 0.8);
    this.playing = true;
    el.play().catch(() => {});
    this.fade(el, 0, LEVEL, 600);
    this.emit();
  }
  toggle(id?: string) {
    if (id && id !== this.current) return this.play(id);
    if (this.playing) this.pause(); else this.resume();
  }
  /** the next record on your shelf */
  next() {
    const list = this.queue();
    if (!list.length) return this.stop();
    const i = this.current ? list.indexOf(this.current) : -1;
    this.play(list[(i + 1) % list.length]);
  }
  stop() {
    this.letGo(500);
    this.playing = false;
    this.current = null;
    audio.muteMusic(false);
    this.emit();
  }
}

export const recordPlayer = new RecordPlayer();
