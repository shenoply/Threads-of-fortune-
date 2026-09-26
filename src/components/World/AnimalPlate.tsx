import type { Breed } from '../../data/animals';

// Naturalist plates drawn from per-breed proportions: a side profile on parchment,
// with near and far legs, breed-specific head profile, tail carriage, markings and tack.

type P = [number, number];
const GROUND = 146;

/** Closed Catmull-Rom spline through points, as an SVG path. */
function closed(pts: P[], t = 0.5) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
function open(pts: P[], t = 0.5) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A tapered limb along a spine of [x, y, width] points. */
function limb(spine: [number, number, number][]) {
  const L: P[] = [], R: P[] = [];
  spine.forEach(([x, y, w], i) => {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    dx /= m; dy /= m;
    L.push([x - dy * w * 0.5, y + dx * w * 0.5]);
    R.push([x + dy * w * 0.5, y - dx * w * 0.5]);
  });
  return closed([...L, ...R.reverse()], 0.35);
}

interface Shape {
  kind: 'camel' | 'equid';
  xs: number; // shoulder x
  len: number; // body length
  depth: number; // body depth
  leg: number; // ground to belly
  neck: number;
  head: number;
  hump?: number;
  profile?: number; // + convex (ram) / - dished face
  ears?: number;
  tailHigh?: boolean;
  mane?: 'flow' | 'heavy' | 'brush' | 'none';
  legW?: number;
  gear?: 'pack' | 'saddle' | 'camelSaddle' | 'bags';
  cross?: boolean; // donkey shoulder cross and dorsal stripe
  mealy?: boolean;
  socks?: boolean;
  blaze?: boolean;
  dapple?: boolean;
}

const SHAPES: Record<string, Shape> = {
  falahi: { kind: 'camel', xs: 88, len: 84, depth: 38, leg: 50, neck: 50, head: 22, hump: 28, legW: 1.05, gear: 'bags' },
  maghrabi: { kind: 'camel', xs: 86, len: 92, depth: 43, leg: 49, neck: 52, head: 23, hump: 32, legW: 1.2, gear: 'pack' },
  bishari: { kind: 'camel', xs: 90, len: 80, depth: 32, leg: 60, neck: 54, head: 20, hump: 24, legW: 0.85, gear: 'camelSaddle' },
  anafi: { kind: 'camel', xs: 92, len: 76, depth: 29, leg: 62, neck: 52, head: 19, hump: 20, legW: 0.78 },
  arabian: { kind: 'equid', xs: 86, len: 80, depth: 36, leg: 50, neck: 48, head: 25, profile: -1, ears: 9, tailHigh: true, mane: 'flow', legW: 0.9, dapple: true },
  baladi_h: { kind: 'equid', xs: 86, len: 80, depth: 36, leg: 46, neck: 42, head: 28, profile: 0.2, ears: 10, mane: 'heavy', legW: 1, gear: 'saddle', blaze: true },
  barb: { kind: 'equid', xs: 86, len: 84, depth: 38, leg: 48, neck: 44, head: 29, profile: 1.2, ears: 10, mane: 'heavy', legW: 1.05, socks: true },
  baladi_d: { kind: 'equid', xs: 96, len: 66, depth: 33, leg: 38, neck: 30, head: 30, profile: 0.4, ears: 22, mane: 'brush', legW: 0.85, cross: true, mealy: true, gear: 'bags' },
  hassawi: { kind: 'equid', xs: 90, len: 74, depth: 34, leg: 46, neck: 36, head: 31, profile: 0.3, ears: 23, mane: 'brush', legW: 0.9, mealy: true, gear: 'saddle' },
  cyprus_mule: { kind: 'equid', xs: 88, len: 78, depth: 37, leg: 46, neck: 40, head: 31, profile: 0.6, ears: 17, mane: 'brush', legW: 1.05, mealy: true, gear: 'pack' },
};

function equid(s: Shape) {
  const bellyY = GROUND - s.leg, topY = bellyY - s.depth, xs = s.xs, xr = xs + s.len, H = s.head, N = s.neck;
  const poll: P = [xs - N * 0.5, topY - N * 0.9];
  const mz: P = [poll[0] - H * 0.92, poll[1] + H * 0.72];
  const pf = s.profile ?? 0;
  const body: P[] = [
    poll,
    [xs - N * 0.12, topY - N * 0.45 - (s.mane === 'flow' ? 4 : 1)], // crest
    [xs + 10, topY - 4], // withers
    [xs + s.len * 0.45, topY + 2], // back
    [xr - 8, topY - 2], // croup
    [xr + 5, topY + 5], // tail head
    [xr + 8, topY + s.depth * 0.45], // buttock
    [xr - 2, bellyY - 1], // stifle
    [xr - s.len * 0.28, bellyY + 1], // flank
    [xs + s.len * 0.42, bellyY + 4], // belly
    [xs + 4, bellyY + 1], // elbow
    [xs - 9, topY + s.depth * 0.48], // chest
    [xs - 12, topY + s.depth * 0.1],
    [xs - N * 0.4 - 6, topY - N * 0.28], // front of neck
    [poll[0] + H * 0.12, poll[1] + H * 0.62], // throat
    [poll[0] - H * 0.32, poll[1] + H * 0.72], // jaw
    [mz[0] + H * 0.14, mz[1] + H * 0.14], // chin
    mz,
    [mz[0] + H * 0.02, mz[1] - H * 0.22], // nose
    [poll[0] - H * 0.52 - pf * 2.4, poll[1] + H * 0.3 - pf * 1.4], // face (dished or convex)
    [poll[0] - H * 0.22, poll[1] + H * 0.04], // forehead
  ];
  const w = s.legW ?? 1;
  const fore = (x: number): [number, number, number][] => [
    [x, bellyY - 8, 13 * w], [x + 1, bellyY + s.leg * 0.2, 9 * w], [x + 1.5, bellyY + s.leg * 0.48, 7 * w],
    [x + 0.5, GROUND - 9, 5 * w], [x - 1.5, GROUND - 4, 6 * w], [x - 2.5, GROUND - 0.5, 8 * w],
  ];
  const hind = (x: number): [number, number, number][] => [
    [x, bellyY - 10, 17 * w], [x + 4, bellyY + s.leg * 0.12, 11 * w], [x + 7, bellyY + s.leg * 0.45, 6.5 * w],
    [x + 4, GROUND - 9, 5 * w], [x + 1.5, GROUND - 4, 6 * w], [x + 0.5, GROUND - 0.5, 8 * w],
  ];
  return {
    body: closed(body),
    farLegs: [limb(fore(xs + 6)), limb(hind(xr - 12))],
    nearLegs: [limb(fore(xs - 1)), limb(hind(xr - 4))],
    hooves: [xs - 3.5, xs + 3.5, xr - 3.5, xr - 11.5],
    poll, mz, topY, bellyY, xr,
    eye: [poll[0] - H * 0.28, poll[1] + H * 0.26] as P,
    tailBase: [xr + 5, topY + 5] as P,
  };
}

function camel(s: Shape) {
  const bellyY = GROUND - s.leg, topY = bellyY - s.depth, xs = s.xs, xr = xs + s.len, H = s.head, N = s.neck, hump = s.hump ?? 20;
  const poll: P = [xs - N * 0.8, topY - N * 0.42];
  const mz: P = [poll[0] - H * 1.05, poll[1] + H * 0.32];
  const body: P[] = [
    [poll[0] + 2, poll[1] - 1],
    [xs - N * 0.55, topY + 2], // back of neck, dipping
    [xs - N * 0.2, topY + s.depth * 0.12],
    [xs + 4, topY - 1], // withers
    [xs + s.len * 0.28, topY - hump * 0.7],
    [xs + s.len * 0.5, topY - hump], // hump
    [xs + s.len * 0.72, topY - hump * 0.6],
    [xr - 4, topY + 3], // croup
    [xr + 5, topY + s.depth * 0.42], // rump
    [xr - 3, bellyY - 1],
    [xr - s.len * 0.3, bellyY + 1],
    [xs + s.len * 0.3, bellyY + 5], // belly and chest pad
    [xs + 2, bellyY + 3],
    [xs - 7, topY + s.depth * 0.7],
    [xs - N * 0.3, topY + s.depth * 0.62], // underside of neck, lowest point
    [xs - N * 0.62, topY + s.depth * 0.2],
    [poll[0] + H * 0.1, poll[1] + H * 0.5], // throat
    [poll[0] - H * 0.4, poll[1] + H * 0.55], // jaw
    [mz[0] + H * 0.16, mz[1] + H * 0.22], // droopy lip
    mz,
    [mz[0] + H * 0.12, mz[1] - H * 0.2],
    [poll[0] - H * 0.4, poll[1] - H * 0.12],
  ];
  const w = s.legW ?? 1;
  const fore = (x: number): [number, number, number][] => [
    [x, bellyY - 6, 12 * w], [x + 1, bellyY + s.leg * 0.25, 7 * w], [x + 1.5, bellyY + s.leg * 0.5, 7.5 * w],
    [x + 0.5, bellyY + s.leg * 0.72, 4.8 * w], [x - 1, GROUND - 5, 5.5 * w], [x - 3, GROUND - 0.8, 11 * w],
  ];
  const hind = (x: number): [number, number, number][] => [
    [x, bellyY - 10, 15 * w], [x + 5, bellyY + s.leg * 0.18, 8 * w], [x + 6, bellyY + s.leg * 0.5, 6.5 * w],
    [x + 3, bellyY + s.leg * 0.75, 4.8 * w], [x + 1, GROUND - 5, 5.5 * w], [x - 1, GROUND - 0.8, 11 * w],
  ];
  return {
    body: closed(body),
    farLegs: [limb(fore(xs + 7)), limb(hind(xr - 13))],
    nearLegs: [limb(fore(xs)), limb(hind(xr - 5))],
    hooves: [] as number[],
    poll, mz, topY, bellyY, xr,
    knees: [[xs + 1.5, bellyY + s.leg * 0.5], [xs + 8.5, bellyY + s.leg * 0.5]] as P[],
    eye: [poll[0] - H * 0.2, poll[1] + H * 0.14] as P,
    tailBase: [xr + 3, topY + 6] as P,
    humpX: xs + s.len * 0.5,
    humpTop: topY - hump,
  };
}

const INK = '#2e1d10';
const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export function AnimalPlate({ breed, size = 120 }: { breed: Breed; size?: number }) {
  const s = SHAPES[breed.id] ?? SHAPES[breed.kind === 'camel' ? 'falahi' : 'baladi_h'];
  // hand-tinted engraving: the coat colour washed thinly over sepia ink work
  const coat = mix(breed.coat[0], '#e2cfa6', 0.42), shade = mix(breed.coat[1], '#6a4a2a', 0.35);
  const gid = `coat-${breed.id}`;
  const isCamel = s.kind === 'camel';
  const g = isCamel ? camel(s) : equid(s);
  const pale = parseInt(coat.slice(1, 3), 16) > 200;
  const line = pale ? '#6a543a' : INK;
  const far = `url(#${gid}-far)`;

  // Tail
  const tb = g.tailBase;
  let tail: JSX.Element;
  if (isCamel) {
    tail = (
      <g>
        <path d={open([tb, [tb[0] + 5, tb[1] + 12], [tb[0] + 5, tb[1] + 32]])} stroke={shade} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d={`M${tb[0] + 3} ${tb[1] + 30} l2 9 l3 -9 Z`} fill={shade} stroke={line} strokeWidth="0.6" />
      </g>
    );
  } else if (s.mane === 'brush') {
    tail = (
      <g>
        <path d={open([tb, [tb[0] + 6, tb[1] + 10], [tb[0] + 6, tb[1] + 34]])} stroke={shade} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={closed([[tb[0] + 4, tb[1] + 30], [tb[0] + 9, tb[1] + 32], [tb[0] + 8, tb[1] + (breed.kind === 'mule' ? 56 : 46)], [tb[0] + 3, tb[1] + (breed.kind === 'mule' ? 54 : 44)]])} fill={breed.kind === 'mule' ? shade : INK} opacity="0.9" />
      </g>
    );
  } else {
    const hi = s.tailHigh;
    tail = (
      <path
        d={closed(
          hi
            ? [tb, [tb[0] + 12, tb[1] - 8], [tb[0] + 20, tb[1] + 4], [tb[0] + 18, tb[1] + 36], [tb[0] + 22, tb[1] + 62], [tb[0] + 13, tb[1] + 54], [tb[0] + 11, tb[1] + 20], [tb[0] + 6, tb[1] + 6]]
            : [tb, [tb[0] + 8, tb[1] + 4], [tb[0] + 12, tb[1] + 26], [tb[0] + 13, tb[1] + 62], [tb[0] + 5, tb[1] + 58], [tb[0] + 4, tb[1] + 26], [tb[0] - 1, tb[1] + 8]],
          0.6,
        )}
        fill={pale ? '#cfc9bd' : shade}
        stroke={line}
        strokeWidth="0.7"
      />
    );
  }

  // Mane along the crest
  let mane: JSX.Element | null = null;
  if (!isCamel && s.mane !== 'none') {
    const p = g.poll, xs = s.xs, top = g.topY;
    const crest: P[] = [[p[0] + 2, p[1] + 1], [xs - s.neck * 0.12 + 2, top - s.neck * 0.45 + 2], [xs + 10, top - 2]];
    if (s.mane === 'brush') {
      mane = <path d={open(crest)} stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="1.2 1.6" opacity="0.85" />;
    } else {
      const heavy = s.mane === 'heavy';
      const locks: P[] = [[crest[0][0] + 3, crest[0][1] + 10], [crest[1][0] + 7, crest[1][1] + (heavy ? 14 : 10)], [xs + 9, top + (heavy ? 8 : 5)]];
      mane = <path d={closed([...crest, ...locks.reverse()], 0.5)} fill={pale ? '#cfc9bd' : shade} stroke={line} strokeWidth="0.6" />;
    }
  }

  // Ears
  const ears: JSX.Element[] = [];
  if (isCamel) {
    ears.push(<path key="e" d={`M${g.poll[0] + 1} ${g.poll[1] + 1} l3 -6 l2 6 Z`} fill={coat} stroke={line} strokeWidth="0.8" />);
  } else {
    const e = s.ears ?? 10, p = g.poll;
    for (const [dx, k] of [[3, far], [0, coat]] as [number, string][]) {
      ears.push(<path key={dx} d={closed([[p[0] + dx - 2, p[1] + 3], [p[0] + dx + e * 0.08, p[1] - e * 0.55], [p[0] + dx + e * 0.12, p[1] - e], [p[0] + dx + 3, p[1] - e * 0.4], [p[0] + dx + 4, p[1] + 3]], 0.4)} fill={k} stroke={line} strokeWidth="0.8" />);
    }
  }

  // Tack and loads
  let gear: JSX.Element | null = null;
  const bx = s.xs + s.len * 0.5;
  if (s.gear === 'pack' || s.gear === 'bags') {
    const top = isCamel ? (g as ReturnType<typeof camel>).humpTop : g.topY;
    const big = s.gear === 'pack';
    gear = (
      <g stroke={INK} strokeWidth="0.8">
        <rect x={bx - (big ? 26 : 18)} y={top + (isCamel ? 8 : 2)} width={big ? 52 : 36} height={big ? 22 : 16} rx="5" fill="#8a6a44" />
        <rect x={bx - (big ? 22 : 15)} y={top + (isCamel ? 10 : 4)} width={big ? 20 : 14} height={big ? 26 : 20} rx="4" fill="#b98f55" />
        <rect x={bx + 2} y={top + (isCamel ? 10 : 4)} width={big ? 20 : 14} height={big ? 26 : 20} rx="4" fill="#a3713c" />
        <path d={`M${bx - (big ? 18 : 12)} ${top + (isCamel ? 22 : 14)} h${big ? 36 : 24}`} stroke="#4a3018" strokeWidth="1.2" />
        {big && <ellipse cx={bx} cy={top + (isCamel ? 6 : 0)} rx="16" ry="6" fill="#7a7a52" />}
      </g>
    );
  } else if (s.gear === 'camelSaddle') {
    const cg = g as ReturnType<typeof camel>;
    gear = (
      <g stroke={INK} strokeWidth="0.8">
        <path d={`M${cg.humpX - 20} ${cg.humpTop + 8} Q${cg.humpX} ${cg.humpTop - 6} ${cg.humpX + 20} ${cg.humpTop + 8} L${cg.humpX + 18} ${cg.humpTop + 20} Q${cg.humpX} ${cg.humpTop + 10} ${cg.humpX - 18} ${cg.humpTop + 20} Z`} fill="#8a4a3a" />
        <path d={`M${cg.humpX - 16} ${cg.humpTop + 3} l-3 -12 M${cg.humpX + 16} ${cg.humpTop + 3} l3 -12`} strokeWidth="2.2" stroke="#5a3a1c" />
        {[-14, -7, 0, 7, 14].map((d) => <line key={d} x1={cg.humpX + d} y1={cg.humpTop + 16 + Math.abs(d) * 0.1} x2={cg.humpX + d} y2={cg.humpTop + 24} stroke="#c9974a" strokeWidth="1.2" />)}
      </g>
    );
  } else if (s.gear === 'saddle') {
    const x0 = s.xs + 14;
    gear = (
      <g stroke={INK} strokeWidth="0.8">
        <path d={`M${x0} ${g.topY + 1} Q${x0 + 18} ${g.topY + 6} ${x0 + 36} ${g.topY} L${x0 + 34} ${g.topY + 22} L${x0 + 2} ${g.topY + 22} Z`} fill={breed.id === 'hassawi' ? '#4a5470' : '#8a4a3a'} />
        <path d={`M${x0 + 2} ${g.topY + 22} L${x0 + 34} ${g.topY + 22}`} stroke="#c9974a" strokeWidth="1.6" />
        <path d={`M${x0 + 6} ${g.topY - 1} Q${x0 + 18} ${g.topY + 5} ${x0 + 30} ${g.topY - 2} L${x0 + 28} ${g.topY + 8} L${x0 + 8} ${g.topY + 8} Z`} fill="#5a3a1c" />
        <line x1={x0 + 16} y1={g.topY + 8} x2={x0 + 16} y2={g.bellyY + 2} stroke="#5a3a1c" strokeWidth="1.6" />
      </g>
    );
  }

  const shadowX = s.xs + s.len * 0.45;
  return (
    <svg width={size} height={size * 0.68} viewBox="0 0 240 160" role="img" aria-label={`${breed.name}, side view`} className="animal-plate">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={coat} />
          <stop offset="0.55" stopColor={coat} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={`${gid}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade} />
          <stop offset="1" stopColor={shade} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${gid}-paper`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#f5ead0" />
          <stop offset="1" stopColor="#dcc69a" />
        </radialGradient>
        <pattern id={`${gid}-hatch`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={INK} strokeWidth="0.6" />
        </pattern>
        <pattern id={`${gid}-h1`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <line x1="0" y1="0" x2="0" y2="2.6" stroke={INK} strokeWidth="0.55" />
        </pattern>
        <pattern id={`${gid}-h2`} width="2.8" height="2.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
          <line x1="0" y1="0" x2="0" y2="2.8" stroke={INK} strokeWidth="0.5" />
        </pattern>
        <linearGradient id={`${gid}-sh1`} x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.42" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id={`${gid}-sh2`} x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.72" stopColor="#000" />
          <stop offset="1" stopColor="#bbb" />
        </linearGradient>
        <mask id={`${gid}-m1`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="160">
          <path d={g.body} fill={`url(#${gid}-sh1)`} />
          {g.nearLegs.map((d, i) => <path key={i} d={d} fill="#666" />)}
          {g.farLegs.map((d, i) => <path key={i} d={d} fill="#fff" />)}
        </mask>
        <mask id={`${gid}-m2`} maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="160">
          <path d={g.body} fill={`url(#${gid}-sh2)`} />
          {g.farLegs.map((d, i) => <path key={i} d={d} fill="#aaa" />)}
        </mask>
        <radialGradient id={`${gid}-fox`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a07840" stopOpacity="0.18" />
          <stop offset="1" stopColor="#a07840" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-dapple`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="238" height="158" rx="3" fill={`url(#${gid}-paper)`} stroke="#7a5a34" strokeWidth="1.5" />
      <rect x="6" y="6" width="228" height="148" rx="2" fill="none" stroke="#7a5a34" strokeOpacity="0.45" />
      {[[40, 40, 22], [200, 120, 18], [150, 30, 12], [70, 130, 14]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={`url(#${gid}-fox)`} />)}
      {/* ground: a few tufts and pebbles */}
      <path d={`M14 ${GROUND + 0.5} H226`} stroke="#8a6a42" strokeOpacity="0.55" />
      <ellipse cx={shadowX} cy={GROUND + 1} rx={s.len * 0.75} ry="3.6" fill="#5a4024" opacity="0.28" />
      <path d={`M24 ${GROUND} l2 -5 l1 5 M30 ${GROUND} l-1 -4 M200 ${GROUND} l2 -4 l1 4 M214 ${GROUND} l-2 -5`} stroke="#8a6a42" strokeWidth="0.8" fill="none" opacity="0.7" />

      <g strokeLinejoin="round">
        {g.farLegs.map((d, i) => <path key={i} d={d} fill={far} stroke={line} strokeWidth="0.9" />)}
        {tail}
        {g.nearLegs.map((d, i) => <path key={i} d={d} fill={`url(#${gid})`} stroke={line} strokeWidth="1" />)}
        <path d={g.body} fill={`url(#${gid})`} stroke={line} strokeWidth="1.2" />
        {/* engraved shading: single hatch in the half-tones, cross-hatch in the deepest shadow */}
        <rect x="0" y="0" width="240" height="160" fill={`url(#${gid}-h1)`} mask={`url(#${gid}-m1)`} opacity="0.75" />
        <rect x="0" y="0" width="240" height="160" fill={`url(#${gid}-h2)`} mask={`url(#${gid}-m2)`} opacity="0.7" />
        {/* anatomy: shoulder, ribs, thigh and neck folds */}
        <g stroke={INK} strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round">
          <path d={open([[s.xs + 2, g.topY + s.depth * 0.25], [s.xs + 10, g.topY + s.depth * 0.55], [s.xs + 6, g.bellyY - 2]])} />
          <path d={open([[g.xr - 16, g.topY + s.depth * 0.2], [g.xr - 22, g.topY + s.depth * 0.55], [g.xr - 14, g.bellyY - 3]])} />
          {[0.36, 0.46, 0.56].map((f) => <path key={f} d={open([[s.xs + s.len * f, g.topY + s.depth * 0.45], [s.xs + s.len * f + 3, g.topY + s.depth * 0.75], [s.xs + s.len * f + 2, g.bellyY]])} opacity="0.6" />)}
          {!isCamel && <path d={open([[g.poll[0] + s.head * 0.3, g.poll[1] + s.head * 0.9], [s.xs - s.neck * 0.25, g.topY - s.neck * 0.05], [s.xs - 4, g.topY + s.depth * 0.3]])} />}
          {isCamel && <path d={open([[s.xs - s.neck * 0.5, g.topY + s.depth * 0.4], [s.xs - s.neck * 0.25, g.topY + s.depth * 0.5], [s.xs - 4, g.topY + s.depth * 0.6]])} />}
        </g>
        {'hooves' in g && g.hooves.map((x, i) => <rect key={i} x={x - 1} y={GROUND - 3.5} width="8" height="3.5" rx="1" fill={i < 2 ? INK : '#3d2a18'} opacity={i < 2 ? 0.9 : 0.7} />)}
        {isCamel && (g as ReturnType<typeof camel>).knees.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.6" ry="2.6" fill={shade} opacity="0.75" />)}
        {s.socks && [s.xs - 1, s.xs + s.len - 4].map((x) => <rect key={x} x={x - 3} y={GROUND - 14} width="8" height="10" rx="2" fill="#f1ece2" opacity="0.92" />)}
        {s.dapple && [[0.3, 0.3], [0.55, 0.45], [0.75, 0.3], [0.45, 0.7]].map(([fx, fy], i) => <circle key={i} cx={s.xs + s.len * fx} cy={g.topY + s.depth * fy} r="7" fill={`url(#${gid}-dapple)`} />)}
        {s.cross && (
          <g stroke={INK} strokeOpacity="0.55" strokeWidth="2.2" fill="none" strokeLinecap="round">
            <path d={open([[s.xs + 10, g.topY - 2], [s.xs + s.len * 0.45, g.topY + 3], [s.xs + s.len - 6, g.topY]])} />
            <path d={`M${s.xs + 10} ${g.topY - 2} L${s.xs + 5} ${g.topY + 14}`} />
          </g>
        )}
        {mane}
        {ears}
        {s.mealy && <ellipse cx={g.mz[0] + s.head * 0.12} cy={g.mz[1] - s.head * 0.02} rx={s.head * 0.2} ry={s.head * 0.16} fill="#efe6d4" opacity="0.85" />}
        {s.blaze && <path d={`M${g.poll[0] - s.head * 0.35} ${g.poll[1] + s.head * 0.2} L${g.mz[0] + s.head * 0.12} ${g.mz[1] - s.head * 0.12}`} stroke="#f1ece2" strokeWidth="3" strokeLinecap="round" />}
        <ellipse cx={g.eye[0]} cy={g.eye[1]} rx="1.9" ry="1.5" fill="#150b05" />
        <path d={`M${g.eye[0] - 2.6} ${g.eye[1] - 1.8} q2.6 -1.6 5.2 0`} stroke={line} strokeWidth="0.7" fill="none" />
        <ellipse cx={g.mz[0] + 2.5} cy={g.mz[1] - 1.5} rx="1.3" ry="0.9" fill="#150b05" opacity="0.8" />
        {gear}
      </g>
      <text x="224" y="22" textAnchor="end" fontFamily="'Noto Naskh Arabic', 'Amiri', serif" fontSize="13" fill="#5a3d20">{breed.arabic}</text>
      <text x="16" y="152" fontFamily="Georgia, serif" fontStyle="italic" fontSize="7.5" fill="#6a4d2c" opacity="0.85">{{ camel: 'Camelus dromedarius', horse: 'Equus caballus', donkey: 'Equus asinus', mule: 'E. asinus × E. caballus' }[breed.kind]}</text>
      <text x="224" y="152" textAnchor="end" fontFamily="Georgia, serif" fontStyle="italic" fontSize="7.5" fill="#6a4d2c" opacity="0.85">{breed.origin}</text>
    </svg>
  );
}
