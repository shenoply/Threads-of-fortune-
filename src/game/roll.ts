// A carpet rolling up and unrolling, as geometry. The carpet lies along X (its length, 0 to 1) with
// its width across; the part already unrolled lies flat on the floor, the rest is wound in close
// layers round a small core at the end of the flat part, the roll growing as more cloth winds onto
// it (an Archimedean spiral: each turn one carpet-thickness smaller). Ported from the Unity carpet
// study (CarpetViewer.cs, DeformMesh), drawn here in slices on a 2D canvas.

/** carpet thickness and core radius, in carpet lengths */
export const THICK = 0.0046, CORE = 0.014;

export interface RollPoint { x: number; y: number }

/** where the point `u` along the carpet is, with `p` of it unrolled (1 = flat, 0 = all rolled) */
export function rollAt(u: number, p: number): RollPoint {
  const edge = p - 0.5; // the end of the flat part, the carpet running from -0.5 to 0.5
  if (u <= p || p >= 0.9999) return { x: u - 0.5, y: 0 };
  const remaining = 1 - p;
  const R = outerRadius(p);
  const wound = (u - p);
  const r = Math.sqrt(Math.max(CORE * CORE, R * R - (THICK * wound) / Math.PI));
  const a = (2 * Math.PI * (R - r)) / THICK;
  void remaining;
  return { x: edge + r * Math.sin(a), y: R - r * Math.cos(a) };
}

/** the outside radius of the roll with `p` unrolled */
export const outerRadius = (p: number) => Math.sqrt(CORE * CORE + (THICK * (1 - p)) / Math.PI);

/** the carpet's extent along X: from its far end to the front of the roll */
export function extent(p: number): [number, number] {
  const R = outerRadius(p);
  return [Math.min(-0.5, p - 0.5 - R), p >= 0.9999 ? 0.5 : p - 0.5 + R];
}

/**
 * A weighty spring towards a target: slow to start, a little overshoot that the floor or the roll
 * takes up as a settle. Critically under-damped (about 0.8), so it never wobbles more than once.
 */
export function springStep(x: number, v: number, target: number, dt: number, omega = 5.2, zeta = 0.8): [number, number] {
  // semi-implicit Euler in small steps keeps it stable at any frame rate
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -2 * zeta * omega * v - omega * omega * (x - target);
    v += a * h;
    x += v * h;
  }
  return [x, v];
}
