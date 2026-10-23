/**
 * Small engraved-style map icons: how you are travelling (train, steamer, felucca, motor car, camels,
 * donkey, on foot) and who else is on the road (raiders, traders, riders for hire, pilgrims, Bedouin).
 * Each is drawn once, in ink on parchment inside a brass (or, for a hostile band, red) ring, onto an
 * offscreen canvas and kept as a PNG data URL, so the map shows a cached bitmap and never rebuilds a path
 * per frame. All drawing is done here in code: no outside art.
 */
export type TravelMode = 'train' | 'steamer' | 'felucca' | 'motor' | 'camels' | 'donkey' | 'foot';
export type BandIcon = 'blades' | 'bale' | 'rifle' | 'tent' | 'pilgrim';

const RES = 96; // px of each cached icon: sharp at ~30 css px on a 3x screen
const INK = '#2b1a0c';
const PAPER = '#efe1bd';
const PAPER_SHADE = '#dcc89a';

type Ctx = CanvasRenderingContext2D;
const cache = new Map<string, string>();

/** A brass (or red) ringed disc with an ink icon inside, as a data URL; drawn once per key. */
function medal(key: string, draw: (c: Ctx) => void, ring: 'brass' | 'red' | 'steel'): string {
  const k = `${ring}:${key}`;
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = RES;
  const c = cv.getContext('2d');
  if (!c) return '';
  const R = RES / 2;
  // outer dark edge, then the metal band (a faint top-lit sheen, no more), then the parchment field
  const edge = ring === 'red' ? '#4a120a' : ring === 'steel' ? '#2c2a26' : '#5a3d1a';
  const [hi, mid, lo] = ring === 'red' ? ['#d0533b', '#a8321f', '#6e1c10'] : ring === 'steel' ? ['#b9b4a6', '#8d877a', '#5e594f'] : ['#e7bd6e', '#c9974a', '#8a6330'];
  c.fillStyle = edge;
  c.beginPath(); c.arc(R, R, R - 1, 0, Math.PI * 2); c.fill();
  const g = c.createLinearGradient(0, 0, 0, RES);
  g.addColorStop(0, hi); g.addColorStop(0.55, mid); g.addColorStop(1, lo);
  c.fillStyle = g;
  c.beginPath(); c.arc(R, R, R - 3.5, 0, Math.PI * 2); c.fill();
  const fr = R - 11;
  const pg = c.createRadialGradient(R - fr * 0.3, R - fr * 0.35, fr * 0.1, R, R, fr);
  pg.addColorStop(0, PAPER); pg.addColorStop(1, PAPER_SHADE);
  c.fillStyle = pg;
  c.beginPath(); c.arc(R, R, fr, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(43,26,12,0.7)'; c.lineWidth = 2;
  c.stroke();
  // the icon, drawn on a 24-unit grid inside the field
  c.save();
  c.beginPath(); c.arc(R, R, fr - 1, 0, Math.PI * 2); c.clip();
  const u = (fr * 2 * 0.94) / 24;
  c.translate(R - 12 * u, R - 12 * u);
  c.scale(u, u);
  c.strokeStyle = INK; c.fillStyle = INK;
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 1.25;
  draw(c);
  c.restore();
  const url = cv.toDataURL('image/png');
  cache.set(k, url);
  return url;
}

// ---------- engraving helpers ----------
/** fine parallel hatching inside the current path (the engraver's shading) */
function hatch(c: Ctx, x0: number, y0: number, x1: number, y1: number, gap = 1.1) {
  c.save();
  c.clip();
  c.lineWidth = 0.45;
  c.beginPath();
  for (let x = x0 - (y1 - y0); x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0); }
  c.stroke();
  c.restore();
}
const line = (c: Ctx, pts: number[], w?: number) => {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (w) c.lineWidth = w;
  c.stroke();
};
const circle = (c: Ctx, x: number, y: number, r: number, fill = false) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) c.fill(); else c.stroke(); };
const waves = (c: Ctx, y: number, x0 = 2, x1 = 22) => {
  c.lineWidth = 0.8;
  c.beginPath();
  for (let x = x0; x < x1; x += 4) { c.moveTo(x, y); c.quadraticCurveTo(x + 1, y - 1.1, x + 2, y); c.quadraticCurveTo(x + 3, y + 1.1, x + 4, y); }
  c.stroke();
};

/** a one-humped camel, nose to the right, feet on y=0 */
function camel(c: Ctx, x: number, y: number, k: number, load = true) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.beginPath();
  c.moveTo(-5.2, -5.6);
  c.quadraticCurveTo(-5.6, -8.2, -2.4, -8.6); // rump to hump
  c.quadraticCurveTo(-0.4, -12.2, 1.8, -8.8); // the hump
  c.quadraticCurveTo(3.4, -8.4, 4.2, -7.4);
  c.quadraticCurveTo(5.4, -9.8, 6.0, -11.4); // neck up
  c.lineTo(8.4, -11.0); c.lineTo(8.3, -10.2); c.lineTo(6.9, -10.1); // head
  c.quadraticCurveTo(6.4, -7.4, 4.6, -5.0);
  c.quadraticCurveTo(0, -4.4, -5.2, -5.6);
  c.closePath();
  c.fill();
  c.lineWidth = 0.95;
  line(c, [-4.4, -5.4, -4.9, -2.6, -4.6, 0]);
  line(c, [-3.0, -5.0, -2.8, -2.4, -3.1, 0]);
  line(c, [2.6, -5.0, 2.9, -2.4, 2.6, 0]);
  line(c, [3.9, -5.4, 4.3, -2.6, 4.1, 0]);
  line(c, [-5.2, -6.6, -6.1, -4.4], 0.7); // tail
  if (load) {
    // a bale on the hump, roped, light against the dark body
    c.fillStyle = PAPER;
    c.beginPath(); c.rect(-2.6, -11.6, 3.6, 2.2); c.fill();
    c.lineWidth = 0.55; c.stroke();
    line(c, [-1.6, -11.6, -1.6, -9.4], 0.45); line(c, [0, -11.6, 0, -9.4], 0.45);
    c.fillStyle = INK;
  }
  c.restore();
}
/** a donkey with panniers, nose to the right, feet on y=0 */
function donkey(c: Ctx, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.beginPath();
  c.moveTo(-5, -4.4);
  c.quadraticCurveTo(-5.4, -7.6, -2, -7.4);
  c.lineTo(3.2, -7.4);
  c.quadraticCurveTo(4.4, -8.2, 5.0, -9.6); // neck
  c.lineTo(7.6, -8.2); c.lineTo(7.4, -7.2); c.lineTo(5.8, -7.4); // muzzle
  c.quadraticCurveTo(5.0, -5.6, 3.6, -4.4);
  c.closePath();
  c.fill();
  // the long ears
  c.lineWidth = 0.9; line(c, [5.1, -9.5, 4.4, -12.0]); line(c, [5.6, -9.4, 5.6, -12.0]);
  c.lineWidth = 0.95;
  line(c, [-4.2, -4.4, -4.4, 0]); line(c, [-2.8, -4.2, -2.6, 0]); line(c, [2.2, -4.2, 2.0, 0]); line(c, [3.4, -4.4, 3.7, 0]);
  line(c, [-5, -6.6, -6.2, -4.2], 0.7);
  // panniers: two baskets slung over the back
  c.fillStyle = PAPER;
  c.beginPath(); c.rect(-3.2, -9.4, 4.8, 3.6); c.fill(); c.lineWidth = 0.6; c.stroke();
  c.beginPath(); c.rect(-3.2, -9.4, 4.8, 3.6); hatch(c, -3.2, -9.4, 1.6, -5.8, 1.3);
  c.fillStyle = INK;
  c.restore();
}
/** a walking man in a robe and headcloth, with a staff, facing right, feet on y=0 */
function walker(c: Ctx, x: number, y: number, k: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  circle(c, 0.4, -15.2, 1.7, true);
  // headcloth falling behind
  c.beginPath(); c.moveTo(-1.2, -16); c.lineTo(-2.4, -12.4); c.lineTo(-0.6, -13.2); c.closePath(); c.fill();
  // the robe, wider at the hem
  c.beginPath();
  c.moveTo(-1.4, -13.2); c.lineTo(1.8, -13.2);
  c.quadraticCurveTo(2.6, -8, 3.6, -4.2);
  c.lineTo(-3.4, -4.2);
  c.quadraticCurveTo(-2.2, -8.6, -1.4, -13.2);
  c.closePath(); c.fill();
  // striding legs
  c.lineWidth = 1.1; line(c, [-1.2, -4.4, -2.8, 0]); line(c, [1.2, -4.4, 2.8, 0]);
  // arm forward to the staff
  line(c, [1.0, -12, 3.4, -9.2], 0.9);
  line(c, [4.4, -16.6, 3.2, 0], 0.8);
  c.restore();
}

// ---------- the travel icons ----------
const MODE: Record<TravelMode, (c: Ctx) => void> = {
  train: (c) => {
    // a tank engine on the rails, smoke from the funnel
    c.beginPath(); c.rect(4, 9.5, 10.5, 5.2); c.fill(); // boiler
    c.beginPath(); c.rect(14, 6.4, 5.4, 8.3); c.fill(); // cab
    c.fillStyle = PAPER; c.fillRect(15.2, 7.6, 3, 2.6); c.fillStyle = INK; // cab window
    line(c, [13.4, 6.2, 20.2, 6.2], 1.1); // cab roof
    c.beginPath(); c.moveTo(5.6, 9.5); c.lineTo(5.2, 5.6); c.lineTo(8.0, 5.6); c.lineTo(7.6, 9.5); c.closePath(); c.fill(); // funnel
    c.beginPath(); c.arc(10.2, 9.6, 1.3, Math.PI, 0); c.fill(); // dome
    line(c, [3.2, 14.2, 2.4, 16.2, 4.4, 16.2], 0.9); // cow-catcher
    c.lineWidth = 0.8;
    circle(c, 4.6, 3.6, 1.1); circle(c, 2.6, 2.0, 0.8); circle(c, 1.2, 0.6, 0.5); // smoke
    c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 1;
    for (const [x, r] of [[6.6, 1.8], [10.8, 1.8], [16.6, 2.0]] as const) { c.beginPath(); c.arc(x, 16.0, r, 0, Math.PI * 2); c.fill(); c.stroke(); circle(c, x, 16, 0.4, true); }
    c.fillStyle = INK;
    line(c, [1, 18.5, 23, 18.5], 1.1); // the rail
    c.lineWidth = 0.7;
    for (let x = 2; x < 23; x += 2.6) line(c, [x, 18.5, x - 0.6, 20.4]); // sleepers
  },
  steamer: (c) => {
    // a coastal steamer: black hull, white house, two funnels, smoke astern
    c.beginPath(); c.moveTo(1.6, 13.4); c.lineTo(22.4, 13.4); c.lineTo(19.6, 17.4); c.lineTo(4.2, 17.4); c.closePath(); c.fill();
    c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 0.8;
    c.beginPath(); c.rect(6, 10.4, 11, 3); c.fill(); c.stroke();
    for (let x = 7.4; x < 16.5; x += 1.8) circle(c, x, 11.9, 0.35, true);
    c.fillStyle = INK;
    c.beginPath(); c.rect(9, 5.4, 2.2, 5); c.fill();
    c.beginPath(); c.rect(13.2, 5.4, 2.2, 5); c.fill();
    c.fillStyle = PAPER; c.fillRect(9, 6.6, 2.2, 0.8); c.fillRect(13.2, 6.6, 2.2, 0.8); c.fillStyle = INK;
    line(c, [3.6, 13.4, 3.6, 6.4], 0.7); line(c, [20.2, 13.4, 20.2, 7.4], 0.7); // masts
    line(c, [3.6, 6.4, 9, 5.4], 0.4); line(c, [15.4, 5.4, 20.2, 7.4], 0.4); // stays
    c.lineWidth = 0.7; circle(c, 7.6, 3.6, 1.1); circle(c, 5.2, 2.6, 0.8);
    waves(c, 19.8); waves(c, 22, 4, 20);
  },
  felucca: (c) => {
    // a Nile felucca: the long slanting yard and the great lateen sail
    c.beginPath(); c.moveTo(3, 15.4); c.quadraticCurveTo(12, 19.6, 21.4, 14.6); c.lineTo(19.6, 15.4); c.lineTo(4.6, 15.6); c.closePath(); c.fill();
    line(c, [11.6, 15.4, 11.6, 6.0], 0.9); // mast
    c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(3.2, 13.2); c.lineTo(20.2, 1.6); c.quadraticCurveTo(16.4, 9.6, 13.6, 14.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(3.2, 13.2); c.lineTo(20.2, 1.6); c.quadraticCurveTo(16.4, 9.6, 13.6, 14.6); c.closePath(); hatch(c, 3, 1.6, 20.2, 14.6, 1.6);
    c.fillStyle = INK;
    line(c, [2.2, 13.9, 21.2, 0.9], 1.2); // the yard
    waves(c, 19.2); waves(c, 21.6, 5, 19);
  },
  motor: (c) => {
    // an open touring car of the Nairn line: canvas hood on posts, long bonnet, running board
    c.beginPath();
    c.moveTo(2.4, 15.2); c.lineTo(2.6, 10.6); c.lineTo(14.4, 10.6); c.lineTo(15.2, 11.4); c.lineTo(21.4, 11.8);
    c.lineTo(21.8, 15.2); c.closePath(); c.fill(); // tub and bonnet
    c.lineWidth = 1.2; line(c, [2.0, 6.8, 13.6, 6.8]); // the hood
    c.lineWidth = 0.7; line(c, [3.0, 6.8, 3.0, 10.6]); line(c, [8.4, 6.8, 8.4, 10.6]); line(c, [13.4, 6.8, 14.4, 10.6]); // hood posts
    line(c, [15.0, 10.8, 15.8, 8.2], 0.8); // windscreen
    c.fillStyle = PAPER; c.fillRect(16.2, 12.4, 4.4, 0.7); c.fillStyle = INK; // bonnet louvre
    c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 1.1;
    for (const x of [6.2, 17.6]) { c.beginPath(); c.arc(x, 15.8, 2.6, 0, Math.PI * 2); c.fill(); c.stroke(); circle(c, x, 15.8, 0.6, true); }
    c.fillStyle = INK;
    c.lineWidth = 0.6; for (let x = 1; x < 23; x += 2.4) line(c, [x, 19.2, x + 1.2, 19.2]); // the desert track
    c.lineWidth = 0.5; circle(c, 0.9, 13.2, 0.6); // a puff of dust
  },
  camels: (c) => {
    // a string of camels, nose to tail, the lead rope between them
    camel(c, 15.6, 18.2, 0.92);
    camel(c, 5.6, 18.6, 0.74);
    c.lineWidth = 0.5; line(c, [11.6, 9.6, 13.6, 11.6]);
    c.lineWidth = 0.6; for (let x = 1; x < 23; x += 3) line(c, [x, 19.6, x + 1.6, 19.6]);
  },
  donkey: (c) => {
    walker(c, 18.2, 19.2, 0.78);
    donkey(c, 8.4, 19.2, 1.05);
    c.lineWidth = 0.5; line(c, [16.2, 11.0, 18.2, 11.8]); // the halter rope
    c.lineWidth = 0.6; for (let x = 1; x < 23; x += 3) line(c, [x, 20.4, x + 1.6, 20.4]);
  },
  foot: (c) => {
    walker(c, 12, 20.4, 1.05);
    c.lineWidth = 0.6; for (let x = 3; x < 22; x += 3) line(c, [x, 21.2, x + 1.6, 21.2]);
  },
};

// ---------- the band icons ----------
const BAND: Record<BandIcon, (c: Ctx) => void> = {
  blades: (c) => {
    // two crossed scimitars, blades up
    const sword = (flip: number) => {
      c.save(); c.translate(12, 12); c.scale(flip, 1);
      c.beginPath();
      c.moveTo(-7.0, 6.8); c.quadraticCurveTo(-1.6, 2.0, 6.6, -8.2); c.quadraticCurveTo(4.4, -0.6, -5.4, 8.8); c.closePath();
      c.fill();
      c.lineWidth = 1.2; line(c, [-8.6, 5.4, -4.4, 9.8]); // crossguard
      c.lineWidth = 1.6; line(c, [-7.2, 8.8, -9.2, 10.8]); // grip
      circle(c, -9.6, 11.2, 0.7, true);
      c.restore();
    };
    sword(1); sword(-1);
  },
  bale: (c) => {
    // a trader: one tall camel under its bales, its driver walking ahead with the rope
    camel(c, 8.6, 19.0, 0.98);
    walker(c, 20.6, 19.6, 0.62);
    c.lineWidth = 0.5; line(c, [15.2, 11.6, 19.6, 13.6]);
    c.lineWidth = 0.6; for (let x = 1; x < 23; x += 3) line(c, [x, 20.4, x + 1.6, 20.4]);
  },
  rifle: (c) => {
    // a long rifle laid diagonally, with a sling
    c.save(); c.translate(12, 12); c.rotate(-Math.PI / 4.4);
    c.beginPath(); c.moveTo(-10.4, -0.6); c.lineTo(-4.2, -1.0); c.lineTo(-3.4, 0.9); c.lineTo(-10.6, 2.6); c.closePath(); c.fill(); // stock
    c.beginPath(); c.rect(-3.8, -1.0, 7.2, 1.7); c.fill(); // fore-end
    c.lineWidth = 0.9; line(c, [3.2, -0.5, 10.8, -0.5]); // barrel
    c.lineWidth = 0.7; line(c, [-2.2, 0.7, -2.4, 2.2]); // trigger guard
    c.lineWidth = 0.5; c.beginPath(); c.moveTo(-8, 2.2); c.quadraticCurveTo(-1, 5.6, 5, 0.5); c.stroke(); // sling
    line(c, [10.4, -1.3, 10.4, -0.5], 0.8); // foresight
    c.restore();
  },
  tent: (c) => {
    // a black goat-hair tent, low and wide, on its poles
    c.beginPath(); c.moveTo(2.6, 16.4); c.lineTo(5.4, 9.6); c.quadraticCurveTo(12, 7.4, 18.6, 9.6); c.lineTo(21.4, 16.4); c.closePath(); c.fill();
    c.fillStyle = PAPER; c.beginPath(); c.moveTo(9.6, 16.4); c.lineTo(10.8, 11.2); c.lineTo(13.2, 11.2); c.lineTo(14.4, 16.4); c.closePath(); c.fill(); c.fillStyle = INK;
    c.lineWidth = 0.6; line(c, [2.6, 16.4, 1.0, 18.4]); line(c, [21.4, 16.4, 23, 18.4]); // guy ropes
    c.lineWidth = 0.6; for (let x = 1; x < 23; x += 3) line(c, [x, 18.4, x + 1.6, 18.4]);
  },
  pilgrim: (c) => {
    walker(c, 12, 20.6, 1.05);
    c.lineWidth = 0.6; for (let x = 3; x < 22; x += 3) line(c, [x, 21.4, x + 1.6, 21.4]);
  },
};

/** the round engraved badge for a way of travelling (a brass ring round an ink drawing) */
export const modeIconUrl = (m: TravelMode) => medal(`mode-${m}`, MODE[m], 'brass');
/** the medallion for a party on the road: red-ringed for raiders and thieves, brass or steel for the rest */
export const bandIconUrl = (icon: BandIcon, hostile: boolean, steel = false) => medal(`band-${icon}`, BAND[icon], hostile ? 'red' : steel ? 'steel' : 'brass');

export const MODE_LABEL: Record<TravelMode, string> = {
  train: 'By train', steamer: 'By steamer', felucca: 'By felucca', motor: 'By motor car', camels: 'With the camels', donkey: 'With the donkeys', foot: 'On foot',
};
