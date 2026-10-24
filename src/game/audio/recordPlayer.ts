// The stall's record player. A record sounds only while you are at the stall (the stall scene, the
// stall sheet or the record shelf is on screen): leave for the map, the caravan, a dream or another app
// and it falls silent where it was, and picks up again when you come back to the stall. It plays until
// you pause it, change it or it ends (then the next of your records goes on). The game's own score
// steps aside only while a record is actually sounding.
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
  /** how many stall screens are showing; with none, the record is held silent */
  private here = 0;
  /** other reasons it must be silent: the app in the background, the flying carpet */
  private holds = new Set<string>();
  get held() { return this.here <= 0 || this.holds.size > 0; }
  /** a stall screen is showing (returns the call that says it has gone) */
  atStall() { this.here += 1; this.sync(); return () => { this.here = Math.max(0, this.here - 1); window.setTimeout(() => this.sync(), 60); }; }
  hold(why: string) { this.holds.add(why); this.sync(); }
  release(why: string) { this.holds.delete(why); this.sync(); }
  private quiet = false;
  /** silence or restore the element to match where you are, without changing what you chose */
  private sync() {
    const el = this.el;
    if (!el || !this.playing) return;
    if (this.held && !this.quiet) {
      this.quiet = true;
      this.fade(el, LEVEL, 0, 250, () => { if (this.quiet) el.pause(); });
      audio.muteMusic(false);
    } else if (!this.held && this.quiet) {
      this.quiet = false;
      audio.muteMusic(true, 0.8);
      el.play().catch(() => {});
      this.fade(el, 0, LEVEL, 600);
    }
  }
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
    this.el = el; this.current = id; this.playing = true; this.quiet = false;
    const mine = () => this.el === el;
    el.onended = () => { if (!mine()) return; this.next(); };
    const fail = () => { if (!mine()) return; this.el = null; audio.detach(el); this.playing = false; this.failed = id; audio.muteMusic(false); this.emit(); };
    el.onerror = fail;
    el.play().catch(fail);
    this.fade(el, 0, LEVEL, 1200);
    this.emit();
    if (this.held) { this.quiet = false; this.sync(); }
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
    this.playing = true;
    if (this.held) { this.quiet = true; this.emit(); return; }
    this.quiet = false;
    audio.muteMusic(true, 0.8);
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

// the app put aside (another app, the screen locked): the record falls silent, and comes back with you
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) recordPlayer.hold('hidden'); else recordPlayer.release('hidden'); });
}
