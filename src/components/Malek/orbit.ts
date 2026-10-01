// The camera numbers and the WebGL check for Malek's room, kept apart from the 3D module so the
// shop can use them without pulling three.js into the main bundle.
export type Hotspot = 'malek' | 'menu' | 'tables' | 'exit';
/** camera angles: azimuth (0 = from the open front), polar from straight up, distance */
export interface Orbit { az: number; pol: number; r: number }
export const ORBIT_LIMITS = { az: [-1.2, 1.2], pol: [0.62, 1.25], r: [4.5, 15] } as const;
/** the opening view: from the front right, so the grill wall faces you; further back on a tall phone screen */
export const defaultOrbit = (aspect: number): Orbit => ({ az: 0.3, pol: 0.92, r: aspect < 0.8 ? 11.5 : aspect < 1.2 ? 10 : 8.6 });
/** a tall phone screen needs a wider lens to fit the room across */
export const fovFor = (aspect: number) => (aspect < 0.8 ? 66 : aspect < 1.2 ? 52 : 42);
export const clampOrbit = (o: Orbit): Orbit => ({
  az: Math.max(ORBIT_LIMITS.az[0], Math.min(ORBIT_LIMITS.az[1], o.az)),
  pol: Math.max(ORBIT_LIMITS.pol[0], Math.min(ORBIT_LIMITS.pol[1], o.pol)),
  r: Math.max(ORBIT_LIMITS.r[0], Math.min(ORBIT_LIMITS.r[1], o.r)),
});

/** camera input happened: the room (drawn on demand) should draw a frame */
export const INVALIDATE_EVENT = 'tof:malek-invalidate';

/** Is WebGL there at all? Checked before mounting the canvas so the fallback can show instead. */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

