// The compass needle on the travel map: a damped spring that swings to its mark, overshoots a little and
// settles, the way a needle on a pivot does. Angles in radians, 0 = north (up), clockwise positive.

/** the shortest turn from a to b, in (-PI, PI] */
export function turnBetween(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** The bearing from one map point to another (map y grows downwards): 0 north, PI/2 east. */
export const bearing = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.x - from.x, -(to.y - from.y));

export class Needle {
  /** where the needle points now */
  a = 0;
  /** how fast it is turning (rad/s) */
  v = 0;
  /** where it is drawn to */
  target = 0;
  // stiffness and damping: under-damped (damping ratio about 0.3), so it swings past once or twice and settles
  constructor(public k = 16, public c = 2.4) {}
  setTarget(t: number) { this.target = this.a + turnBetween(this.a, t); }
  /** move on by dt seconds (taken in small steps, so a slow frame does not throw the needle about) */
  step(dt: number) {
    let left = Math.min(0.25, Math.max(0, dt));
    while (left > 0) {
      const h = Math.min(1 / 120, left);
      const d = this.target - this.a;
      this.v += (this.k * d - this.c * this.v) * h;
      this.a += this.v * h;
      left -= h;
    }
    return this.a;
  }
  /** at rest on its mark */
  get settled() { return Math.abs(this.target - this.a) < 0.003 && Math.abs(this.v) < 0.003; }
  /** the needle's angle folded into [0, 2PI) */
  get shown() { const t = Math.PI * 2; return ((this.a % t) + t) % t; }
}
