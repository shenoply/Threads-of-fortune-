import { CROSSINGS } from '../../data/barriers';
import './worldmap-fixes.css';
import { venueFor } from '../../data/venues';
import { PassCard, PASS_TOWNS, needsPass } from './PassCard';
import { BorderCard, TripMoney, TripPapers } from './BorderCard';
import { Tip } from '../Tips/Tip';
import { MISSIONS, MAIN_ORDER } from '../../data/missions';
import { fmt } from '../../game/economy/money';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame, ferryFare } from '../../game/state/store';
import { SETTLEMENTS, ROAD_WELLS, type Settlement } from '../../data/world';
import { waterOf } from '../../game/systems/malek';
import { TROOPS, MARKETS } from '../../data/caravan';
import { ROAD_LINES } from '../../data/terrain';
import { routeDanger, tripEstimate, durationLabel, type FareLine,
  MAP_W, MAP_H, findPath, routeLeg, routeThrough, pathLength, pathDays, terrainAt, terrainSpeed, TERRAIN_LABEL, isBlockedPx, placeNameAt, pathGround, along, isWaterPx, isExplored, dist, seaRoutesFrom, motorRoutesFrom, railJourney,
  settlementById, type Pt, type Party,
} from '../../game/systems/world';
import { drawWorld, fogCanvas, milesPx, onPaintedMap, paintedMap } from '../../game/systems/mapRender';
import { animalCount, speedInfo, strength, partySize, foodDaysLeft, dailyFood, troopCount, morale as moraleOf } from '../../game/systems/caravan';
import { MenTalk } from './Troops';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';
import { useAudioEnv } from '../../game/audio/useAudioEnv';
import { SettlementPanel, type SetTab } from './Settlement';
import { openJobs } from '../../data/jobs';
import { RUGS } from '../../data/rugs';
import { BREEDS, withArticle } from '../../data/animals';
import { threatForParty } from '../../data/travelThreats1925';
import { PASS_CHOICES } from '../../game/systems/fieldwork';
import { Objectives } from '../Objectives/Objectives';
import { Ambush } from './Ambush';
import { CampScreen, NightPasses } from './Camp';
import { dateLine } from '../../game/economy/dateLine';
import { warmOdds } from '../../game/systems/odds';
import { dateFor } from '../../game/economy/economy';
import { CaravanStrip } from './CaravanPanels';
import { milesPerDay } from './CaravanScreen';
import { StallOverhead } from './StallOverhead';
import { cityLocked, lockedWhy, openingStep } from '../../game/opening';
import { guideTarget } from '../../game/guide';
import { newsMarks, khamsinZones, inKhamsin, partyGoods, NEWS_ICON, NEWS_TIP, KHAMSIN_R, KHAMSIN_PACE, floodPace, seasonPathMult } from '../../game/systems/mapNews';
import { ferryHours, SEASON_NOW } from '../../game/economy/calendar1925';

export const DAYS_PER_SECOND = 1 / 24; // one game hour per second at 1x (a day in 24 s; 6 s at 4x), on the road or standing still
const MAJOR = ['home', 'city', 'port'];
/** The season of a game day, for the date on the map bar (day 1 = 10 March 1925). */
function seasonOf(day: number) {
  const m = new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth();
  return m < 2 || m === 11 ? 'Winter' : m < 5 ? 'Spring' : m < 8 ? 'Summer' : 'Autumn';
}

/** "1 day", "3 days" */
const daysWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
/** A name in the middle of a sentence: lower case, but places and peoples keep their capital
 *  ("the Aleppo wool caravan", "2 Cairo sentinels", "the salt traders from the oases"). */
const PROPER = /^(Aleppo|Persian|Syrian|Egyptian|Cairo|Giza|Alexandria|Bedouin|Arnaut|Circassian|Tarabin|Sufi|Baghdad|Damascus)\b/;
const midName = (s: string) => (PROPER.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
/** What a band on the map is called: the same name its ambush card gives it. */
const bandName = (p: Party, day: number) => (p.kind === 'raiders' ? threatForParty(p, day).displayName : p.name);
/** "3 people × £0.25 + 2 camels and horses, freight × £0.50": what a fare is made of */
const billLine = (bill: FareLine[]) => bill.map((l) => `${l.n} ${l.label} × ${fmt(l.each)}`).join(' + ');

/** The Nile ferry between Giza and Cairo: an hour and a half, a piastre (the fare is the store's ferry()). */
// an hour and a half across, a little more against the flood (calendar1925.ts)
const ferryDays = () => ferryHours(SEASON_NOW.day) / 24;

const kindIcon: Record<string, string> = { home: 'store', city: 'star', town: 'room', village: 'room', oasis: 'sun', port: 'anchor', monastery: 'book', camp: 'camel' };

interface Plan {
  to: Pt;
  settlement?: Settlement;
  path: Pt[] | null;
  days: number;
  train?: { days: number; fare: number; stops: string[]; bill?: FareLine[] };
  ships: { to: string; days: number; fare: number; bill?: FareLine[] }[];
  motor: { to: string; days: number; fare: number; bill?: FareLine[] }[];
  /** the port or town this plan was made from, so a ship can still be booked from it even after
   *  you've since set off on foot and world.at has gone back to null on the road */
  from?: Settlement;
  /** true when raiders on this path could outmatch your caravan: colours the route line red
   *  instead of waiting for the text warning after you commit */
  risky?: boolean;
}

function tint(hour: number) {
  if (hour >= 20 || hour < 5) return 'rgba(24,34,72,0.26)';
  if (hour >= 18) return `rgba(120,50,20,${0.12 + (hour - 18) * 0.12})`;
  if (hour < 7) return `rgba(120,60,30,${0.3 - (hour - 5) * 0.14})`;
  return 'rgba(0,0,0,0)';
}

/** "· mostly road" / "· much of it open desert": the ground a walk crosses, which sets its pace. */
function groundLine(path: Pt[]) {
  const g = Object.entries(pathGround(path)).sort((x, y) => y[1] - x[1]);
  if (!g.length) return '';
  const [kind, share] = g[0];
  return ` · ${share > 0.7 ? 'mostly' : share > 0.4 ? 'much of it' : 'partly'} ${TERRAIN_LABEL[kind as keyof typeof TERRAIN_LABEL]}`;
}

/** What a closed place on the map is, for the card that says you cannot go there. */
function blockedTitle(p: Pt) {
  const k = terrainAt(p);
  const name = placeNameAt(p);
  return k === 'mountains' ? 'Mountains' : k === 'river' ? (name ?? 'A river') : k === 'canal' ? 'The Suez Canal' : k === 'lake' ? 'A lake' : 'Open water';
}
function blockedText(p: Pt) {
  const k = terrainAt(p);
  if (k === 'mountains') return 'No caravan can cross these mountains. Follow a road through the passes.';
  if (k === 'river') return 'Too deep and too wide to wade. Cross at a bridge or a ford: the route will find one.';
  if (k === 'canal') return 'Cross the canal at Kantara or by the Ismailia ferry.';
  if (k === 'lake') return 'A lake. Go round it.';
  return 'You cannot walk on water. Find a port and take a ship.';
}

/** The town whose panel was open when the map last went off screen (another tab, a screen of its own):
 *  coming back to the map without a new place to go finds you still in that town, not on the map. */
const openTown = { at: null as string | null };

export function WorldMap({ onStall, onDistrict, openPanel, openTab, planFor, goFastest, scale, setScale, frozen, startZoom, onZoomGiza, resume }: { onStall: () => void; onDistrict?: () => void; openPanel?: string; openTab?: SetTab; planFor?: string; goFastest?: boolean | 'train'; scale?: number; setScale?: (n: number) => void; frozen?: boolean; startZoom?: number; onZoomGiza?: () => void; resume?: boolean }) {
  const g = useGame();
  const w = g.world;
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 500 });
  const [z, setZ] = useState(startZoom ?? 1.8);
  const [pan, setPanState] = useState<Pt>({ x: 0, y: 0 });
  const [live, setLive] = useState<Pt | null>(null);
  // panRef is the live camera: the travel loop moves it every frame and writes the transform straight to the DOM;
  // React state only catches up on each commit, so the big map re-renders a few times a second, not every frame
  const panRef = useRef(pan);
  const setPan = useCallback((p: Pt) => { panRef.current = p; setPanState(p); }, []);
  const innerRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<HTMLSpanElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [alt, setAlt] = useState<Plan | null>(null);
  const [altFerry, setAltFerry] = useState(false);
  const [short, setShort] = useState<{ plan: Plan; need: number; price: number } | null>(null);
  const [pass, setPass] = useState<{ key: string } | null>(null);
  // a trip into or out of the Sinai: where along the path the narrows are, and the key the crossing is stored under
  const passTrip = useRef<{ key: string; atPx: number } | null>(null);
  const planState = plan;
  const dawnSeen = useRef(useGame.getState().day);
  type Moving = { path: Pt[]; done: number; train: boolean; dest?: string; pxPerDay?: number; mode?: 'ship' | 'motor' | 'ferry' };
  // resume a journey already under way, from where the caravan actually is along its path
  const [moving, setMovingRaw] = useState<null | Moving>(() => {
    const j = useGame.getState().journey;
    if (!j) return null;
    const here = { x: useGame.getState().world.x, y: useGame.getState().world.y };
    let best = j.done, bestD = Infinity, run = 0;
    for (let i = 1; i < j.path.length; i++) {
      const a = j.path[i - 1], b = j.path[i], len = dist(a, b) || 1;
      const t = Math.max(0, Math.min(1, ((here.x - a.x) * (b.x - a.x) + (here.y - a.y) * (b.y - a.y)) / (len * len)));
      const d = dist(here, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (d < bestD) { bestD = d; best = run + len * t; }
      run += len;
    }
    return { ...j, done: Math.max(j.done, best) };
  });
  // every change is saved: a paid ticket is never lost to a new day or a rebuilt screen. Setting off
  // also closes a finished stall day, so the journey is not frozen behind the day's ledger.
  /** "about 35 h, arrives Fri 04:00": the same clock the journey will run on */
  const arrivalLabel = (days: number) => {
    const t = g.world.hour + days * 24;
    const d = g.day + Math.floor(t / 24), h = t % 24;
    return `${durationLabel(days)}, arrives ${dateFor(d).weekday.slice(0, 3)} ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  };
  const setMoving = (m: null | Moving) => {
    setMovingRaw(m);
    const st = useGame.getState();
    useGame.setState({ journey: m ?? undefined, ...(m && st.dayOver ? { dayOver: false } : {}) });
  };
  // under way by ship or Nairn desert car gets its own music instead of whatever the base scene (road/town) was playing;
  // there's no dedicated "open sea" ambience yet, so a ship borrows the harbour's gulls-and-timber sound
  useAudioEnv(
    moving?.mode === 'ship' ? 'port' : moving?.mode === 'motor' ? 'road' : null,
    moving?.mode === 'ship' ? 'port' : moving?.mode === 'motor' ? 'desert' : undefined,
  );
  const [ownScale, setOwnScale] = useState(1);
  const timeScale = scale ?? ownScale;
  const setTimeScale = setScale ?? setOwnScale;
  const [encounter, setEncounter] = useState<Party | null>(null);
  // camping is a choice: nightfall on the road pauses the walk and asks; a camp is full screen
  const guideCity = useGame((s) => (s.started ? guideTarget(s)?.city : undefined));
  const [nightfall, setNightfall] = useState(false);
  // a well or oasis beside the road: stop to fill the waterskins, or carry on
  const [well, setWell] = useState<null | { id: string; name: string }>(null);
  const wellsSeen = useRef<Set<string>>(new Set());
  useEffect(() => { if (!moving) { wellsSeen.current = new Set(); setWell(null); } }, [moving]);
  const [camp, setCamp] = useState<{ dest?: string } | null>(null);
  const [partyOpen, setPartyOpen] = useState(false);
  const nightAsked = useRef(-1);
  // what to do when night falls on a walk: ask each time, or the player's standing order
  const [nightRule, setNightRuleRaw] = useState<'ask' | 'camp' | 'march'>(() => { try { return (localStorage.getItem('tof-night-rule') as 'ask' | 'camp' | 'march') || 'ask'; } catch { return 'ask'; } });
  const setNightRule = (r: 'ask' | 'camp' | 'march') => { setNightRuleRaw(r); try { localStorage.setItem('tof-night-rule', r); } catch { /* private mode */ } };
  const nightRuleRef = useRef(nightRule); nightRuleRef.current = nightRule;
  /** The walk as the map will run it: nights in camp unless you march through them, the wait for an
   *  escort at the Sinai narrows, and a day's rations for everyone at each midnight on the road. */
  const estimate = (walkDays: number, dest?: string, fromAt: string | null | undefined = useGame.getState().world.at) => {
    const st0 = useGame.getState();
    return tripEstimate({
      walkDays, startHour: st0.world.hour, camp: nightRuleRef.current !== 'march', perDay: dailyFood(st0.world.party),
      waitDays: needsPass(fromAt ?? undefined, dest) ? PASS_CHOICES.escort.extraDays : 0,
    });
  };
  const [sleeping, setSleeping] = useState(false); // the night passing in a short camp, then on at dawn
  const [rememberNight, setRememberNight] = useState(false);
  // the night's choice is made on the card, never by a tap on the speed buttons; a journey that ends
  // (arrival, a halt, a fight) takes the question with it
  useEffect(() => { if (!moving) setNightfall(false); }, [moving]);
  const [report, setReport] = useState<string>('');
  // your men stop you on the road when the bread is nearly gone or their patience is wearing thin
  // (once a day for each reason), so you can deal with it before someone walks
  const [menStop, setMenStop] = useState(false);
  const stopSeen = useRef<string>('');
  const pfood = foodDaysLeft(w.party), pmor = moraleOf(w.party), pmen = troopCount(w.party);
  useEffect(() => {
    if (!moving || moving.train || moving.mode || !pmen) return;
    const why = pfood < 2 ? 'food' : pmor <= 40 ? 'patience' : '';
    if (!why) return;
    const k = `${g.day}:${why}`;
    if (stopSeen.current === k) return;
    stopSeen.current = k;
    // a halt, not the end of the journey: the clock stops while you talk, and "Carry on" walks on
    setTimeScale(0);
    setMenStop(true);
  }, [pfood, pmor, pmen, moving, g.day]); // eslint-disable-line react-hooks/exhaustive-deps
  // a town's own screen opens only where you actually are; a shortcut to anywhere else plans the route instead
  // (an old request seen again on a return to the map does not count: the town you were last in does)
  const [panel, setPanel] = useState<string | null>(() => resume ? (openTown.at && openTown.at === w.at ? openTown.at : null) : openPanel && openPanel === w.at ? openPanel : null);
  const resumed = useRef(resume && !!panel);
  useEffect(() => { if (panel) openTown.at = panel; }, [panel]);
  useEffect(() => { if (openTown.at && openTown.at !== w.at) openTown.at = null; }, [w.at]);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const pts = useRef(new Map<number, Pt>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  // a mouse hovering open water or mountains, away from any settlement, shows "you can't walk there"
  // before the tap — not just the card that explains it afterwards
  const [hoverBlocked, setHoverBlocked] = useState(false);
  const follow = useRef(true);
  const lastTap = useRef(0);
  const scaleRef = useRef(1);
  scaleRef.current = timeScale;
  const lastScale = useRef(1);
  if (timeScale > 0) lastScale.current = timeScale;

  // zoom 1 is the map filling the screen; on a tall phone that shows only the Delta, so you can zoom
  // out further, down to the whole map fitted on screen with dark margins round it
  const base = Math.max(size.w / MAP_W, size.h / MAP_H);
  const minZ = Math.min(1, Math.min(size.w / MAP_W, size.h / MAP_H) / base);
  const s = base * z;
  const sRef = useRef(s);
  sRef.current = s;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const sp = speedInfo(w.party, g.inventory);
  // the map figure leads a camel only once you own one
  // who walks behind you on the map: the strongest guards first, then the animals, one token each
  const train = useMemo(() => {
    const toks: { src: string; kind: 'man' | 'beast' }[] = [];
    Object.entries(w.party.troops ?? {}).filter(([, n]) => n > 0).sort((a, b) => (TROOPS[b[0]]?.strength ?? 0) - (TROOPS[a[0]]?.strength ?? 0))
      .forEach(([id, n]) => { for (let i = 0; i < n; i++) toks.push({ src: `art/troops/${id}.jpg`, kind: 'man' }); });
    Object.entries(w.party.animals ?? {}).filter(([id, n]) => n > 0 && BREEDS[id])
      .forEach(([id, n]) => { for (let i = 0; i < n; i++) toks.push({ src: `art/animals/${id}.jpg`, kind: 'beast' }); });
    const MAX = 12;
    return { shown: toks.slice(0, MAX), more: Math.max(0, toks.length - MAX) };
  }, [w.party.troops, w.party.animals]);
  const jobs = openJobs(g.jobsDone, g.reputation);
  const visits = (g.visits ?? []).filter((v) => v.until >= g.day && (v.heard ?? 0) <= g.day);
  const [jobsOpen, setJobsOpen] = useState(false);
  const missionTarget = MAIN_ORDER.map((id) => (g.missions?.[id] === 'active' ? MISSIONS[id].target : undefined)).find(Boolean) ?? null;

  // a trunk route (both ends a city, port or your home) draws heavier than a local track to a village,
  // oasis, monastery or camp — so the map reads "this is the way between places that matter" at a glance
  const MAJOR_KIND = new Set(['home', 'city', 'town', 'port']);
  const roads = useMemo(() => ROAD_LINES.map((r) => ({
    pts: r.pts.map(([x, y]) => ({ x, y })),
    major: MAJOR_KIND.has(settlementById(r.a).kind) && MAJOR_KIND.has(settlementById(r.b).kind),
  })), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogImg = useMemo(() => fogCanvas(w.fog), [w.fog]);
  const [artTick, setArtTick] = useState(0);
  useEffect(() => { paintedMap(); return onPaintedMap(() => setArtTick((t) => t + 1)); }, []);
  // bands wait on the roads: have the fight-odds worker loaded (12 KB, idle) before the first ambush card opens
  useEffect(() => { const t = window.setTimeout(warmOdds, 4000); return () => window.clearTimeout(t); }, []);
  /** Paint the map at the live camera (panRef), not the last committed one; the travel loop calls this every frame.
   *  On the move the map is drawn once at 1x with a margin round the screen and slid under CSS (a GPU move,
   *  no repaint) until the camera nears the margin; whole-canvas redraws at 2x every frame cost ~100 ms a frame on
   *  a phone. A moment after the camera stops it is drawn again, sharp. */
  const paintRef = useRef<(travel?: boolean) => void>(() => {});
  const drawn = useRef({ x: 0, y: 0, s: 0, m: 0, w: 0, h: 0, fog: null as unknown, art: -1, at: 0 });
  const travelAt = useRef(0);
  const lastTravelPan = useRef({ x: NaN, y: NaN });
  const sharpTimer = useRef<number | undefined>(undefined);
  const artTickRef = useRef(artTick);
  artTickRef.current = artTick;
  useEffect(() => () => window.clearTimeout(sharpTimer.current), []);
  paintRef.current = (travel = false) => {
    const c = canvasRef.current;
    if (!c) return;
    const sz = sizeRef.current;
    const W = Math.max(1, sz.w), H = Math.max(1, sz.h);
    const p = panRef.current, sc = sRef.current, now = performance.now();
    const d = drawn.current;
    if (travel) {
      const lp = lastTravelPan.current;
      // the camera has not moved (a halt with the loop still running): leave the sharp map as it is
      if (Math.abs(lp.x - p.x) < 0.05 && Math.abs(lp.y - p.y) < 0.05 && d.s === sc) return;
      lastTravelPan.current = { x: p.x, y: p.y };
      travelAt.current = now;
      window.clearTimeout(sharpTimer.current);
      sharpTimer.current = window.setTimeout(() => { lastTravelPan.current = { x: NaN, y: NaN }; travelAt.current = 0; paintRef.current(false); }, 300);
      const ox = p.x - d.x, oy = p.y - d.y;
      // newly seen country may wait a little over a second for the next redraw
      const fresh = (d.fog === fogImg || now - d.at < 1200) && d.art === artTickRef.current;
      if (d.m > 0 && fresh && d.s === sc && d.w === W && d.h === H && Math.abs(ox) <= d.m - 4 && Math.abs(oy) <= d.m - 4) {
        c.style.transform = `translate(${ox}px, ${oy}px)`;
        return;
      }
    }
    const dpr = travel ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const M = travel ? 160 : 0;
    const cw = W + 2 * M, ch = H + 2 * M;
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
    }
    if (M) Object.assign(c.style, { left: `${-M}px`, top: `${-M}px`, width: `${cw}px`, height: `${ch}px`, transform: 'translate(0px, 0px)', willChange: 'transform' });
    else Object.assign(c.style, { left: '', top: '', width: '', height: '', transform: '', willChange: '' });
    drawWorld(c.getContext('2d')!, { w: cw, h: ch, s: sc, tx: p.x + M, ty: p.y + M, dpr }, { fog: fogImg, roads });
    drawn.current = { x: p.x, y: p.y, s: sc, m: M, w: W, h: H, fog: fogImg, art: artTickRef.current, at: now };
  };
  useEffect(() => {
    // while the travel loop is drawing, a React update (the view synced a few times a second) slides the map too
    const raf = requestAnimationFrame(() => paintRef.current(performance.now() - travelAt.current < 250));
    return () => cancelAnimationFrame(raf);
  }, [pan.x, pan.y, s, size.w, size.h, fogImg, roads, artTick]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clampPan = useCallback(
    // a map narrower (or shorter) than the screen sits in the middle of it instead of sliding about
    (p: Pt, sc = s) => ({
      x: MAP_W * sc <= size.w ? (size.w - MAP_W * sc) / 2 : Math.min(0, Math.max(size.w - MAP_W * sc, p.x)),
      y: MAP_H * sc <= size.h ? (size.h - MAP_H * sc) / 2 : Math.min(0, Math.max(size.h - MAP_H * sc, p.y)),
    }),
    [s, size],
  );
  const clampRef = useRef(clampPan);
  clampRef.current = clampPan;
  const centreOn = useCallback((p: Pt, sc = s) => setPan(clampPan({ x: size.w / 2 - p.x * sc, y: size.h / 2 - p.y * sc }, sc)), [clampPan, s, size, setPan]);

  useEffect(() => {
    centreOn({ x: w.x, y: w.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  const zoomTo = (nz: number) => {
    // zooming past the closest view over Giza, while you are there, takes you down into the district
    if (nz > 4.5 && onZoomGiza && w.at === 'giza' && !moving) {
      const gz = settlementById('giza');
      const gx = gz.x * s + pan.x, gy = gz.y * s + pan.y;
      if (Math.abs(gx - size.w / 2) < size.w * 0.4 && Math.abs(gy - size.h / 2) < size.h * 0.4) { onZoomGiza(); return; }
    }
    nz = Math.max(minZ, Math.min(4.5, nz));
    const cx = size.w / 2, cy = size.h / 2;
    const ns = base * nz;
    const cur = panRef.current;
    setPan(clampPan({ x: cx - ((cx - cur.x) / s) * ns, y: cy - ((cy - cur.y) / s) * ns }, ns));
    setZ(nz);
  };

  const here = w.at ? settlementById(w.at) : undefined;
  // while travelling the map takes the whole screen: the mission banner and extras step aside
  useEffect(() => {
    document.body.classList.toggle('travelling', !!moving);
    return () => document.body.classList.remove('travelling');
  }, [moving]);

  const planTo = (to: Pt, st?: Settlement, reroute = false): Plan | undefined => {
    if (moving && !reroute) return;
    // the opening keeps the wider world shut until the first errand is done
    if (st && cityLocked(useGame.getState(), st.id)) { setPlan(null); setReport(`${st.name}: ${lockedWhy(useGame.getState(), st.id)}`); audio.sfx('tap'); return; }
    const from = { x: w.x, y: w.y };
    const target = st ? { x: st.x, y: st.y } : to;
    const fp = { people: partySize(w.party), animals: w.party.animals ?? {} };
    const ships = here && st ? seaRoutesFrom(here.id, fp).filter((r) => r.to === st.id) : [];
    const motor = here && st ? motorRoutesFrom(here.id, fp).filter((r) => r.to === st.id) : [];
    if (!st && isBlockedPx(to)) {
      const p0: Plan = { to, path: null, days: 0, ships: [], motor: [], from: here };
      setPlan(p0);
      return p0;
    }
    const path = st && isWaterPx(st) && !findPath(from, target) ? null : findPath(from, target);
    const days = path ? pathDays(path, sp.pxPerDay) * seasonPathMult(g.day, path) : 0;
    const train = here && st ? railJourney(here.id, st.id, fp) ?? undefined : undefined;
    // the same check setOff() warns about in text, done here too so the route line itself can go red
    const risky = !!path && routeDanger(path, w.parties, g.day) > strength(w.party);
    const p: Plan = { to: target, settlement: st, path, days, train, ships, motor, from: here, risky };
    setPlan(p);
    audio.sfx('tap');
    return p;
  };
  /** Tap and go: the caravan sets off at once. Faster ways (train, ferry, ship) stay offered on the card while you walk. */
  const goTo = (to: Pt, st?: Settlement) => {
    // a city the opening keeps shut: say why, and nothing more
    if (st && cityLocked(useGame.getState(), st.id)) { setPlan(null); setReport(`${st.name}: ${lockedWhy(useGame.getState(), st.id)}`); audio.sfx('tap'); return; }
    // already under way: a tap never turns the caravan by itself. Ask first, or say why it cannot turn.
    if (moving) { askReroute(to, st); return; }
    // while the opening guides a new player, a stray tap on a city must not send the caravan off:
    // show the trip card, and let them choose how to go from there
    if (st && openingStep(useGame.getState())) { planTo(to, st); return; }
    // Giza and Cairo face each other across the river: the ferry takes an hour and a half, never days on foot
    if (st && ((w.at === 'giza' && st.id === 'cairo') || (w.at === 'cairo' && st.id === 'giza'))) {
      startFerry(st.id as 'giza' | 'cairo');
      return;
    }
    const p = planTo(to, st, true);
    if (!p || !p.path) return; // water or no road: the card explains and offers boats and trains
    // a port, a desert-car route or a railway gets you there faster than walking: show the card so
    // that choice is in view, rather than pricing a walking-food shortfall for a trip the player is
    // about to take by train (which has its own, usually much smaller, food needs)
    if (p.ships.length || p.motor.length || p.train) return;
    if (offerFoodShort(p)) return;
    setOff(p);
  };
  // a tap on the map while travelling: on foot you may change course (after a look at the food);
  // a train, ship, motor car or ferry keeps to its route, so that only tells you so
  const [reroute, setReroute] = useState<null | { to: Pt; st?: Settlement; path: Pt[] | null; days: number; elapsed: number; need: number; fixed: boolean }>(null);
  useEffect(() => { if (!moving) setReroute(null); }, [moving]);
  const askReroute = (to: Pt, st?: Settlement) => {
    if (!moving) return;
    if (st && st.id === moving.dest) { setReport(`You are already on your way to ${st.name}.`); audio.sfx('tap'); return; }
    const fixed = !!(moving.train || moving.mode);
    // a stray tap on open ground from a train or boat is not worth a question
    if (fixed && !st) return;
    const now = useGame.getState().world;
    const from = live ?? { x: now.x, y: now.y };
    const target = st ? { x: st.x, y: st.y } : to;
    const path = fixed || (!st && isBlockedPx(to)) ? null : findPath(from, target);
    const days = path ? pathDays(path, sp.pxPerDay) * seasonPathMult(g.day, path) : 0;
    const est = path ? estimate(days, st?.id, null) : null;
    setReroute({ to, st, path, days, elapsed: est?.elapsedDays ?? 0, need: est?.rations ?? 0, fixed });
    audio.sfx('tap');
  };
  const changeCourse = () => {
    const r = reroute;
    setReroute(null);
    if (!r || !r.path || !moving) return;
    const p: Plan = { to: r.st ? { x: r.st.x, y: r.st.y } : r.to, settlement: r.st, path: r.path, days: r.days, ships: [], motor: [], risky: routeDanger(r.path, w.parties, g.day) > strength(w.party) };
    setAlt(null);
    setOff(p);
  };
  // leaving a town short of food: offer to buy what the road needs, in one tap, before setting off.
  // Shared by the tap-and-go path above and the plan card's own "Travel" button below (opened from
  // the Objectives panel or the objective banner's Map button) — without this in both places, only
  // one of the two ways to start walking actually caught a caravan that could not make the distance.
  const offerFoodShort = (p: Plan) => {
    const need = estimate(p.days, p.settlement?.id).rations - w.party.food;
    if (need > 0 && w.at && MARKETS[w.at] && !moving) {
      setShort({ plan: p, need, price: Math.ceil(need * MARKETS[w.at].food) });
      setPlan(null);
      return true;
    }
    return false;
  };
  const setOff = (p: Plan, crossed = false) => {
    setShort(null);
    if (!p.path) return;
    // the Sinai passes: the caravan stops at the narrows, part way along, and you choose how to cross there
    void crossed;
    // setting off again from the road after the narrows were already crossed on this trip: do not ask twice
    const dest = p.settlement?.id ?? '';
    const today = useGame.getState().day;
    const crossedThisTrip = !w.at && Object.keys(useGame.getState().crossings ?? {}).some((k) => k.includes(`>${dest}:`) && today - Number(k.split(':').pop()) <= 30);
    passTrip.current = !crossedThisTrip && needsPass(w.at ?? undefined, p.settlement?.id)
      ? { key: `${w.at ?? 'road'}>${p.settlement!.id}:${useGame.getState().day}`, atPx: pathLength(p.path) * (PASS_TOWNS.includes(p.settlement!.id) ? 0.6 : 0.4) }
      : null;
    { const h = useGame.getState().world.hour, d = useGame.getState().day; if (h >= 20) nightAsked.current = d; else if (h < 5) nightAsked.current = d - 1; }
    setNightfall(false);
    follow.current = true;
    setMoving({ path: p.path, done: 0, train: false, dest: p.settlement?.id });
    setPlan(null);
    const ferry = (w.at === 'giza' && p.settlement?.id === 'cairo') || (w.at === 'cairo' && p.settlement?.id === 'giza');
    setAlt(p.train || p.ships.length || p.motor.length || ferry ? p : null);
    setAltFerry(ferry);
    const now = useGame.getState().world;
    const danger = routeDanger(p.path, now.parties, useGame.getState().day);
    const mine = strength(now.party);
    setReport(danger > mine ? `Warning: raiders ride this road, about ${danger} strong. Your strength is ${mine}. Hire guards, or risk your cash and packed rugs.` : now.party.food < estimate(p.days, p.settlement?.id).rations ? 'Not enough food for the whole journey. Buy some in a town.' : '');
    audio.sfx('step');
  };  // a chapter can send you here with a journey already planned
  useEffect(() => {
    const target = planFor ?? (openPanel && openPanel !== w.at ? openPanel : undefined);
    if (!target || w.at === target) return;
    const st = SETTLEMENTS.find((x) => x.id === target);
    if (st) setTimeout(() => {
      // set off once, however many times this effect runs
      if (goFastest) { if (!setOffOnce.current) { setOffOnce.current = true; travelFastest(st); } } else planTo(st, st);
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const setOffOnce = useRef(false);
  /** Set off at once by the quickest way there you can afford: train, ship, motor car, or on foot. */
  const travelFastest = (st: Settlement) => {
    const at = useGame.getState().world.at;
    if ((at === 'giza' && st.id === 'cairo') || (at === 'cairo' && st.id === 'giza')) { startFerry(st.id as 'giza' | 'cairo'); return; }
    const p = planTo(st, st, true);
    if (!p) return;
    const cash = useGame.getState().cash;
    // a ticket bought at the station's board: the train, nothing else
    if (goFastest === 'train' && p.train && cash >= p.train.fare) { start(true, p); return; }
    const ways: { days: number; go: () => void }[] = [];
    if (p.path) ways.push({ days: estimate(p.days, st.id).elapsedDays, go: () => start(false, p) });
    if (p.train && cash >= p.train.fare) ways.push({ days: p.train.days, go: () => start(true, p) });
    for (const r of p.ships) if (cash >= r.fare) ways.push({ days: r.days, go: () => startSea(r, 'ship', p.from) });
    for (const r of p.motor) if (cash >= r.fare) ways.push({ days: r.days, go: () => startSea(r, 'motor', p.from) });
    ways.sort((a, b) => a.days - b.days)[0]?.go();
  };

  /** Turned back on the road: retrace the way you came, back to the place you set out from
   *  (or the nearest town to it), on foot from where you stand. */
  const turnBack = (msg: string) => {
    const m = moving;
    const st0 = useGame.getState();
    const here0 = { x: st0.world.x, y: st0.world.y };
    if (!m) { setReport(msg); return; }
    // the way already walked, from the start of the route to where you are, turned round
    const back: Pt[] = [here0];
    let run = 0;
    for (let i = 1; i < m.path.length; i++) {
      const seg = dist(m.path[i - 1], m.path[i]);
      if (run + seg >= m.done) break;
      run += seg;
      back.splice(1, 0, m.path[i]);
    }
    back.push(m.path[0]);
    const startPt = m.path[0];
    const home = SETTLEMENTS.filter((x) => w.known.includes(x.id) && !x.gateway).map((x) => ({ x, d: dist(x, startPt) })).sort((a, b) => a.d - b.d)[0];
    const homeSt = home && home.d < 14 ? home.x : undefined;
    // a train, a ship or a car does not turn round: you get down and walk back
    const path = back.length > 1 && dist(back[0], back[back.length - 1]) > 0.5 ? back : null;
    passTrip.current = null;
    setAlt(null);
    setNightfall(false);
    if (!path) { setMoving(null); setTimeScale(1); setReport(msg); return; }
    follow.current = true;
    setMoving({ path, done: 0, train: false, dest: homeSt?.id });
    setTimeScale(lastScale.current || 1);
    setReport(`${msg}${homeSt ? ` Back to ${homeSt.name}.` : ''}`);
    audio.sfx('step');
  };
  const stop = (why = '') => {
    setMoving(null);
    setTimeScale(1);
    if (why) setReport(why);
    audio.sfx('tap');
  };

  const start = (train: boolean, given?: Plan | null) => {
    const plan = given ?? planState;
    if (!plan) return;
    setAlt(null);
    if (train && plan.train) {
      if (g.cash < plan.train.fare) return setReport('You cannot afford the train fare.');
      useGame.setState((st) => ({ cash: st.cash - plan.train!.fare, ledger: [...st.ledger, { day: st.day, kind: 'expense', label: `Third-class tickets to ${plan.settlement?.name}`, amount: -plan.train!.fare }] }));
      const path = routeThrough(plan.train.stops.map((id) => { const x = settlementById(id); return { x: x.x, y: x.y }; }), 'rail');
      follow.current = true;
      setMoving({ path, done: 0, train: true, dest: plan.settlement?.id, pxPerDay: pathLength(path) / plan.train.days });
      setPlan(null);
      setReport(`By rail: ${plan.train.stops.map((id) => settlementById(id).name).join(' – ')}.`);
      audio.sfx('train');
      return;
    }
    if (!plan.path) return;
    if (!train && offerFoodShort(plan)) return;
    if (!train) { setOff(plan); return; } // walking goes through setOff, which asks about the Sinai passes
    follow.current = true;
    setMoving({ path: plan.path, done: 0, train, dest: plan.settlement?.id });
    setPlan(null);
    setReport('');
    audio.sfx(train ? 'train' : 'step');
  };

  /** Book passage by sea or by the Nairn desert car: pay now, then watch the ship or motor car
   *  actually cross the map along the route, the same way the train does, instead of jumping there. */
  const startSea = (r: { to: string; days: number; fare: number }, mode: 'ship' | 'motor', origin?: Settlement) => {
    if (g.cash < r.fare) { setReport('You cannot afford the fare.'); return; }
    const from = origin ?? here;
    if (!from) return;
    const dest = settlementById(r.to);
    useGame.setState((st) => ({
      cash: st.cash - r.fare,
      ledger: [...st.ledger, { day: st.day, kind: 'expense', label: mode === 'motor' ? `Nairn desert car to ${dest.name}` : `Deck passage to ${dest.name}`, amount: -r.fare }],
    }));
    const path = routeLeg({ x: from.x, y: from.y }, { x: dest.x, y: dest.y }, mode === 'motor' ? 'motor' : 'ship');
    follow.current = true;
    setMoving({ path, done: 0, train: true, dest: r.to, pxPerDay: pathLength(path) / Math.max(0.1, r.days), mode });
    setPlan(null);
    setAlt(null);
    setReport(mode === 'motor' ? `By Nairn motor car across the desert to ${dest.name}.` : `By ship to ${dest.name}.`);
    audio.sfx('tap');
  };

  /** The Nile ferry between Giza and Cairo: the one crossing in the game that used to just snap the
   *  view to the far bank the instant it was booked, with no boat, no river, nothing to watch — unlike
   *  every other way of travelling. Now it runs through the same moving-marker loop as a ship or train,
   *  just over a much shorter, much faster leg, so you actually see the crossing. The fare, the hour and
   *  the journal line are still applied by g.ferry() itself, once the crossing lands. */
  const startFerry = (toId: 'giza' | 'cairo') => {
    const st = useGame.getState();
    if (st.cash < 1) { setReport('The ferryman wants a piastre.'); return; }
    const fromId = st.world.at === 'giza' ? 'giza' : 'cairo';
    if (fromId === toId) return;
    const from = settlementById(fromId);
    const dest = settlementById(toId);
    // straight across the river, bank to bank (a sea route between the two wound a long way round)
    const path = [{ x: from.x, y: from.y }, { x: dest.x, y: dest.y }];
    follow.current = true;
    setMoving({ path, done: 0, train: true, dest: toId, pxPerDay: pathLength(path) / ferryDays(), mode: 'ferry' });
    setPlan(null);
    setAlt(null);
    setReport('The ferry noses out across the brown river.');
    audio.sfx('tap');
  };

  // Standing still, time stands still too: it only runs while you travel.

  // Travel loop: runs by itself until you arrive, stop, or something finds you on the road.
  useEffect(() => {
    if (!moving || encounter || frozen) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastCommit = performance.now();
    let done = moving.done;
    let stepAudio = 0;
    let livePos = along(moving.path, done).pos;
    let lastView = performance.now();
    let inSand = false;
    // the frame-by-frame view goes straight to the DOM; React hears about it only a few times a second
    const syncView = () => { setLive(livePos); setPan(panRef.current); };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st0 = useGame.getState();
      let speed = moving.train ? moving.pxPerDay ?? 220 : speedInfo(st0.world.party, st0.inventory).pxPerDay;
      // the ground underfoot: quick on a road, slow in sand and hills
      if (!moving.train && !moving.mode) speed *= terrainSpeed(livePos) || 1;
      // a khamsin blowing over the road: sand in the eyes, the camels keep their heads down
      const sand = !moving.train && inKhamsin(st0.day, livePos);
      if (sand) speed *= KHAMSIN_PACE;
      // the Nile in flood: the Delta's low roads are under water
      if (!moving.train && !moving.mode) speed *= floodPace(st0.day, livePos);
      if (sand && !inSand) setReport('A khamsin is blowing: the caravan slows.');
      inSand = sand;
      let days = dt * DAYS_PER_SECOND * scaleRef.current;
      // the ferry is an hour and a half on the clock, but you watch it cross: about six seconds
      if (moving.mode === 'ferry') days = (dt / 6) * ferryDays();
      done += days * speed;
      acc += days;
      const { pos, done: arrived } = along(moving.path, done);
      livePos = pos;
      // reaching the narrows: stop, and the crossing is chosen here, on the road
      const pt = passTrip.current;
      if (pt && !moving.train && !moving.mode && done >= pt.atPx && !useGame.getState().crossings?.[pt.key]) {
        passTrip.current = null;
        lastScale.current = scaleRef.current || lastScale.current;
        setTimeScale(0);
        setMoving({ ...moving, done });
        setPass({ key: pt.key });
        setReport('The narrows of the Sinai passes. Decide how to cross.');
        // keep the loop alive at a standstill (time scale 0): the route has not changed, so nothing
        // else would restart it once the crossing is chosen and the caravan sets off again
        raf = requestAnimationFrame(loop);
        return;
      }
      // smooth every frame: the caravan glides and the camera eases after it
      const sc = sRef.current;
      if (follow.current) {
        const sz = sizeRef.current, cur = panRef.current;
        const target = { x: sz.w / 2 - pos.x * sc, y: sz.h / 2 - pos.y * sc };
        const k = Math.min(1, dt * 4);
        panRef.current = clampRef.current({ x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k });
        if (innerRef.current) innerRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px)`;
        paintRef.current(true);
      }
      if (meRef.current) {
        // the figure faces the way you are walking
        const dx = pos.x - parseFloat(meRef.current.dataset.px ?? String(pos.x));
        if (Math.abs(dx) > 0.02) meRef.current.dataset.facing = dx < 0 ? 'left' : 'right';
        meRef.current.dataset.px = String(pos.x);
        meRef.current.style.left = `${pos.x * sc}px`; meRef.current.style.top = `${pos.y * sc}px`;
      }
      if (now - lastView > 140) { lastView = now; syncView(); }
      stepAudio += dt * scaleRef.current;
      if (stepAudio > 0.6 && !moving.train && scaleRef.current > 0) {
        stepAudio = 0;
        audio.sfx('step');
      }
      if ((now - lastCommit > 140 && acc > 0) || arrived) {
        lastCommit = now;
        syncView();
        const notes = useGame.getState().travelStep(pos, acc, moving.train);
        acc = 0;
        if (notes.length) setReport(notes.slice(-3).join(' '));
        const today = useGame.getState().day;
        if (today > dawnSeen.current) { dawnSeen.current = today; setReport(`A new day on the road: ${dateLine(today)}.`); }
        // night falls on a walk: stop and ask, once a night (the night of day d runs 20:00 to 05:00)
        const hr = useGame.getState().world.hour;
        const nightOf = hr >= 20 ? today : hr < 5 ? today - 1 : -1;
        if (!moving.train && !moving.mode && !arrived && nightOf >= 0 && nightAsked.current !== nightOf) {
          nightAsked.current = nightOf;
          if (nightRuleRef.current === 'camp') { setTimeScale(0); setSleeping(true); setReport('Night: camping, as you set. Change it under "Nights" on the clock bar.'); }
          else if (nightRuleRef.current === 'ask') { setTimeScale(0); setNightfall(true); }
        }
        // the opening's robbers: on the way to Alexandria, whatever the means, a small band stops you once
        // (on the railway, a log across the line near Tanta). Sized to lose to you and your guard.
        {
          const st = useGame.getState();
          if (openingStep(st)?.step.id === 'bandits' && moving.dest === 'alexandria' && !moving.mode && done >= pathLength(moving.path) * 0.4) {
            const band = st.spawnOpeningBandits(pos);
            setMoving({ ...moving, done });
            setReport(moving.train ? 'The train jolts to a halt: robbers have dragged a log across the line near Tanta.' : 'Men step out onto the road ahead.');
            setEncounter(band);
            audio.sfx('chest');
            return;
          }
        }
        if (!moving.train && !moving.mode) {
          const st = useGame.getState();
          const needsOn = !st.sim || st.sim.needs || !!st.ironman;
          const wl = needsOn && waterOf(st.condition) < 85 ? [...ROAD_WELLS, ...SETTLEMENTS.filter((x) => ['oasis', 'camp'].includes(x.kind))].find((x) => x.id !== moving.dest && !wellsSeen.current.has(x.id) && dist(x, pos) < 22) : undefined;
          if (wl) {
            wellsSeen.current.add(wl.id);
            lastScale.current = scaleRef.current || lastScale.current;
            setTimeScale(0);
            setMoving({ ...moving, done });
            setWell({ id: wl.id, name: wl.name });
            setReport(`${wl.name}: there is a well beside the road.`);
            audio.sfx('water');
            raf = requestAnimationFrame(loop);
            return;
          }
        }
        if (!moving.train) {
          const st = useGame.getState();
          // only raiders stop you; everyone else you can tap on the map if you want to talk
          const hit = st.world.parties.find((p) => p.kind === 'raiders' && dist(p, pos) < 5 && (p.cooldownUntil ?? 0) < st.day);
          if (hit) {
            const mine = strength(st.world.party);
            if (hit.kind === 'raiders' && hit.strength && mine >= hit.strength * 2) {
              useGame.setState({ world: { ...st.world, parties: st.world.parties.map((p) => (p.id === hit.id ? { ...p, cooldownUntil: st.day + 1 } : p)) } });
              setReport('Raiders watched your guards from the ridge and thought better of it.');
            } else {
              setMoving({ ...moving, done });
              setEncounter(hit);
              audio.sfx(hit.kind === 'raiders' ? 'chest' : 'arrive');
              return;
            }
          }
        }
      }
      if (arrived) {
        setMoving(null);
        setTimeScale(1);
        const dest = moving.dest;
        if (dest) {
          // the ferry fare, the hour and a half, and the journal line are g.ferry()'s own job, not
          // the generic arriveAt() every other arrival uses
          setReport(moving.mode === 'ferry' ? useGame.getState().ferry(dest as 'giza' | 'cairo', true) : (useGame.getState().arriveAt(dest), ''));
          if (dest === 'giza' && onDistrict) onDistrict();
          else setPanel(dest);
        } else {
          const near = SETTLEMENTS.find((x) => dist(x, pos) < 10);
          if (near) useGame.getState().arriveAt(near.id);
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); syncView(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving?.path, encounter, frozen]);

  const onPointerUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const now = performance.now();
    void now; void lastTap;
    // tap anywhere to go there; mid-journey, goTo asks before the caravan turns
    const r = wrap.current!.getBoundingClientRect();
    const mp = { x: (e.clientX - r.left - panRef.current.x) / s, y: (e.clientY - r.top - panRef.current.y) / s };
    const st = SETTLEMENTS.filter((x) => w.known.includes(x.id)).map((x) => ({ x, d: dist(x, mp) })).filter((o) => o.d * s < 22).sort((a, b) => a.d - b.d)[0]?.x;
    if (st && st.id === w.at && !moving) { setPanel(st.id); return; }
    goTo(mp, st);
  };

  // anyone within a day's sight of the caravan is seen, fog or not; raiders further off once the land is known
  const visibleParties = w.parties.filter((p) => isExplored(w.fog, p) || dist(p, moving && live ? live : w) < (p.kind === 'raiders' ? 48 : 30));
  const news = newsMarks(g.day);
  const sandZones = khamsinZones(g.day);
  const routeSvg = plan?.path ?? (moving ? moving.path : null);
  // the planned route colours red the moment it's drawn; an already-under-way walk (not train/ship/motor,
  // which don't run into raiders the same way) checks the same thing live, since the danger along it can
  // change as parties move
  const routeRisky = plan ? plan.risky : moving && !moving.train && !moving.mode ? routeDanger(moving.path, w.parties, g.day) > strength(w.party) : false;
  const hh = Math.floor(w.hour), mm = Math.floor((w.hour % 1) * 60);
  const caravanLine = `${partySize(w.party)} ${partySize(w.party) === 1 ? 'person' : 'people'} · ${animalCount(w.party)} animal${animalCount(w.party) === 1 ? '' : 's'} · ${foodDaysLeft(w.party) < 1 ? 'no food: buy some in a town' : `food for ${daysWord(foodDaysLeft(w.party))}`} · load ${Math.round(sp.load)}/${Math.round(sp.cap)} · strength ${strength(w.party)}`;
  const status = moving ? (moving.mode === 'ship' ? 'At sea' : moving.mode === 'motor' ? 'Crossing the desert' : moving.mode === 'ferry' ? 'Crossing the Nile' : moving.train ? 'On the train' : timeScale === 0 ? 'Paused on the road' : 'On the road') : here ? `In ${here.name}` : 'Halted on the road';
  const giza = settlementById('giza');
  const gizaScreen = { x: giza.x * s + pan.x, y: giza.y * s + pan.y };
  // where you are on screen: when the map has been dragged away from you, a labelled button points back
  const mePt = moving && live ? live : { x: w.x, y: w.y };
  const meScreen = { x: mePt.x * s + pan.x, y: mePt.y * s + pan.y };
  const meOff = size.w > 0 && (meScreen.x < 24 || meScreen.x > size.w - 24 || meScreen.y < 24 || meScreen.y > size.h - 24);
  const meAngle = Math.atan2(meScreen.y - size.h / 2, meScreen.x - size.w / 2) * 180 / Math.PI;
  const showOverhead = z >= 3 && gizaScreen.x > -60 && gizaScreen.x < size.w + 60 && gizaScreen.y > -60 && gizaScreen.y < size.h + 60 && !moving;

  return (
    <div className="world" data-testid="world">
      <div
        className="world-map"
        ref={wrap}
        data-testid="world-map"
        onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }}
        onWheel={(e) => zoomTo(z * (e.deltaY < 0 ? 1.15 : 0.87))}
        onPointerDown={(e) => {
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
            drag.current = null;
          } else drag.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y, moved: false };
        }}
        onPointerMove={(e) => {
          // a bare hover (mouse, no button down, not dragging the map): check what's under the cursor
          // so open water or mountains shows "can't walk there" before the tap, not just after it
          if (e.pointerType === 'mouse' && !pts.current.has(e.pointerId)) {
            const r = wrap.current!.getBoundingClientRect();
            const mp = { x: (e.clientX - r.left - panRef.current.x) / s, y: (e.clientY - r.top - panRef.current.y) / s };
            const nearSettlement = SETTLEMENTS.some((x) => w.known.includes(x.id) && dist(x, mp) * s < 22);
            setHoverBlocked(!nearSettlement && isBlockedPx(mp));
            return;
          }
          if (!pts.current.has(e.pointerId)) return;
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            zoomTo(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
          } else if (drag.current) {
            const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
            if (Math.abs(dx) + Math.abs(dy) > 6) {
              drag.current.moved = true;
              follow.current = false;
            }
            if (drag.current.moved) setPan(clampPan({ x: drag.current.px + dx, y: drag.current.py + dy }));
          }
        }}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { drag.current = null; setHoverBlocked(false); }}
        style={hoverBlocked ? { cursor: 'not-allowed' } : undefined}
      >
        <canvas ref={canvasRef} className="world-canvas" aria-label="Map of Egypt and the Levant in 1925" />
        <div className="world-inner" ref={innerRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, width: MAP_W * s, height: MAP_H * s }} data-testid="world-inner" data-zoom={z.toFixed(2)}>
          <div className="daynight" style={{ background: tint(w.hour) }} />
          {sandZones.map((c, i) => (
            <div key={i} className="sand-haze" style={{ left: (c.x - KHAMSIN_R) * s, top: (c.y - KHAMSIN_R) * s, width: KHAMSIN_R * 2 * s, height: KHAMSIN_R * 2 * s }} data-testid="sand-haze" />
          ))}
          {/* where a river or the canal can be crossed: a bridge, or a slow ford or ferry */}
          {z >= 1.6 && CROSSINGS.map((c) => (
            <span key={c.name} className={`xing xing-${c.kind}`} style={{ left: c.x * s, top: c.y * s }} title={`${c.name}${c.kind === 'ford' ? ' (slow)' : ''}`} aria-hidden="true">{c.kind === 'bridge' ? '⌒' : '≈'}</span>
          ))}
          <svg className="world-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: MAP_W * s, height: MAP_H * s }}>
            {routeSvg && <polyline points={routeSvg.map((p) => `${p.x},${p.y}`).join(' ')} className={`route ${moving ? 'live' : ''} ${routeRisky ? 'danger' : ''}`} />}
            {moving && reroute?.path && <polyline points={reroute.path.map((p) => `${p.x},${p.y}`).join(' ')} className="route reroute-line" />}
            {plan && !plan.path && <circle cx={plan.to.x} cy={plan.to.y} r="6" className="route-bad" />}
          </svg>
          {SETTLEMENTS.filter((st) => w.known.includes(st.id)).map((st) => (
            <button
              key={st.id}
              className={`place kind-${st.kind} ${w.at === st.id ? 'here' : ''} ${plan?.settlement?.id === st.id ? 'sel' : ''} ${missionTarget === st.id ? 'mission' : ''} ${guideCity === st.id && w.at !== st.id ? 'guide-here' : ''} ${cityLocked(g, st.id) ? 'locked' : ''}`}
              title={cityLocked(g, st.id) ? lockedWhy(g, st.id) : undefined}
              style={{ left: st.x * s, top: st.y * s }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); if (w.at === st.id && !moving) setPanel(st.id); else goTo(st, st); }}
              data-testid={`place-${st.id}`}
            >
              <span className="pdot"><Icon name={kindIcon[st.kind] ?? 'pin'} /></span>
              {missionTarget === st.id && <span className="pmission" data-testid="mission-pin"><Icon name="star" /> Mission</span>}
              {missionTarget !== st.id && visits.some((v) => v.city === st.id) ? <span className="pjob visit" data-testid={`visit-pin-${st.id}`}><Icon name="hourglass" /> {visits.find((v) => v.city === st.id)!.who}</span>
                : missionTarget !== st.id && jobs.some((j) => j.target === st.id) && <span className="pjob" data-testid={`job-pin-${st.id}`}><Icon name="scroll" /> {jobs.find((j) => j.target === st.id)!.title}</span>}
              {venueFor(st.id) && <span className="pcrown" title="Royal court" data-testid={`crown-${st.id}`}><Icon name="crown" /></span>}
              {news[st.id] && (
                <span className="pnews" data-testid={`news-pin-${st.id}`}>
                  {news[st.id].map((m) => <i key={m} className={`pn-${m}`} title={NEWS_TIP[m]} aria-label={NEWS_TIP[m]}><Icon name={NEWS_ICON[m]} /></i>)}
                </span>
              )}
              {(venueFor(st.id) || MAJOR.includes(st.kind) || z >= 2.4 || plan?.settlement?.id === st.id || w.at === st.id) && <span className="plbl">{st.name}</span>}
            </button>
          ))}
          {visibleParties.map((p) => {
            const mine = strength(w.party);
            const raid = p.kind === 'raiders' && !!p.strength;
            const d = dist(p, moving && live ? live : w);
            const hunting = raid && d < 22 && mine < (p.strength ?? 0) * 1.4;
            const threat = raid ? ((p.strength ?? 0) > mine ? 'strong' : 'weak') : '';
            const gd = partyGoods(p);
            return (
              <span key={p.id} className={`party party-${p.kind} ${threat ? `threat-${threat}` : ''} ${hunting ? 'hunting' : ''}`} style={{ left: p.x * s, top: p.y * s }} data-testid={`party-${p.kind}`} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => {
                e.stopPropagation();
                // Train, ship and motor journeys are meant to be the safe way through — the road's own
                // ambush/thief rolls already skip themselves for these (see travelStep's `safe` flag).
                // A tap on a party marker glimpsed out the window used to reach past that and pull the
                // player into the same standard road encounter anyway; keep it inert while under way.
                if (moving?.train) { if (raid) setReport(`${bandName(p, g.day)} watch the train pass, out of reach from the tracks.`); return; }
                if (dist(p, w) < 18) { setMoving(null); setEncounter(p); } else goTo({ x: p.x, y: p.y });
              }}>
                {raid && <i className="pring" style={{ width: 44 * s, height: 44 * s }} aria-hidden="true" />}
                <span className="pbadge"><Icon name={p.kind === 'raiders' ? 'sword' : p.kind === 'pilgrims' ? 'people' : p.kind === 'mercenaries' ? 'shield' : 'camel'} /></span>
                {raid ? (
                  <span className="pname" data-testid={`raid-label-${p.id}`}>{hunting ? 'Hunting you · ' : ''}{bandName(p, g.day)} · {p.strength} vs {mine}</span>
                ) : p.kind === 'caravan' || p.kind === 'bedouin' ? (
                  <span className="pgoods" data-testid={`goods-${p.id}`}><Icon name={gd?.icon ?? 'camel'} />{gd ? `Trader · ${gd.label}` : 'Trader'}</span>
                ) : z >= 2.2 ? <span className="pname">{p.name}{p.size ? ` · ${p.size}` : ''}</span> : null}
              </span>
            );
          })}
          <span ref={meRef} className={`me ${moving && timeScale ? 'moving' : ''}`} style={{ left: (moving && live ? live.x : w.x) * s, top: (moving && live ? live.y : w.y) * s }} data-testid="me" data-x={Math.round(w.x)} data-y={Math.round(w.y)}>
            {moving && (moving.train || moving.mode) ? (
              <span className="pbadge me-badge"><Icon name="camel" /></span>
            ) : (
              // you on foot, two painted steps that alternate while you walk, and behind you, Bannerlord
              // style, the caravan that follows: your guards and every animal you own, each as its own token
              <span className="me-row">
                <span className="me-train" aria-hidden="true" data-testid="me-train">
                  {train.shown.map((t, k) => <img key={k} className={`me-tok ${t.kind}`} src={t.src} alt="" draggable={false} style={{ ['--k' as string]: k }} />)}
                  {train.more > 0 && <i className="me-more" style={{ ['--k' as string]: train.shown.length }}>+{train.more}</i>}
                </span>
                <span className="me-walk solo" aria-hidden="true">
                  {[1, 2].map((k) => <img key={k} src={`art/world/party-solo-${k}.webp`} alt="" draggable={false} />)}
                </span>
              </span>
            )}
            {z >= 3 && <span className="pname me-name">You · {partySize(w.party)}</span>}
          </span>
        </div>

        {menStop && <MenTalk stopped onClose={() => { setMenStop(false); if (moving && !nightfall && !sleeping && !camp) setTimeScale(lastScale.current || 1); }} />}
        {showOverhead && (
          <div className="overhead-pin" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} style={{ left: Math.min(size.w - 100, Math.max(100, gizaScreen.x)), top: Math.max(100, gizaScreen.y - 110) }} data-testid="overhead-pin">
            <StallOverhead compact onOpen={() => (w.at === 'giza' ? onStall() : planTo(giza, giza))} />
            <span className="overhead-cap">{w.at === 'giza' ? 'Your stall. Tap to open it.' : 'Your stall in Giza'}</span>
          </div>
        )}

        {frozen === undefined && (
          <div className="world-hud">
            <span><b>{status}</b> · Day {g.day}, {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</span>
            <CaravanStrip />
          </div>
        )}
        {/* Bannerlord-style bar along the foot of the map: the date and the hour on a sun-and-moon
            dial with the travel speeds, and beside it what the caravan carries */}
        <div className="bl-bar" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} data-testid="bl-bar">
          <div className="bl-time" role="group" aria-label="Date and travel speed" data-testid="map-speed">
            <span className="bl-date" data-testid="bl-date"><small>{seasonOf(g.day)}</small>{dateFor(g.day).short}</span>
            {/* the dial is also the way home: a tap brings the map back to your caravan */}
            <button type="button" className={`bl-dial ${w.hour >= 6 && w.hour < 19 ? 'day' : 'night'}`} style={{ ['--turn' as string]: `${(w.hour / 24) * 360 - 180}deg` }} onClick={() => { follow.current = true; centreOn(moving && live ? live : { x: w.x, y: w.y }); audio.sfx('tap'); }} aria-label={`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}. Tap to find your caravan on the map`} data-testid="find-me">
              <i aria-hidden="true"><Icon name={w.hour >= 6 && w.hour < 19 ? 'sun' : 'moon'} /></i>
              <b>{String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</b>
            </button>
            {moving ? (
              <span className="bl-speeds">
                {[0, 1, 2, 4].map((k) => (
                  <button key={k} className={timeScale === k ? 'on' : ''} onClick={() => {
                    // a question on the card (nightfall, a well, the narrows) is answered there, not by the clock
                    if (k > 0 && (nightfall || pass)) { setReport(nightfall ? 'Night has fallen: make camp or march on first.' : 'Choose how to cross the narrows first.'); audio.sfx('tap'); return; }
                    // at a well, going on is the same as "Carry on"
                    if (k > 0 && well) setWell(null);
                    setTimeScale(k); audio.sfx('tap');
                  }} aria-label={k ? `${k} times speed` : 'Pause'} data-testid={`speed-${k}`}>{k === 0 ? '❚❚' : k === 1 ? '▶︎' : k === 2 ? '▶︎▶︎' : '▶︎▶︎▶︎'}</button>
                ))}
              </span>
            ) : <span className="bl-still">{here ? here.name : 'Halted'}</span>}
            <span className="bl-nights" role="group" aria-label="What to do when night falls on the road" data-testid="night-rule">
              <small>Nights</small>
              {(['ask', 'camp', 'march'] as const).map((r) => (
                <button key={r} className={`bl-n ${r} ${nightRule === r ? 'on' : ''}`} aria-pressed={nightRule === r} onClick={() => { setNightRule(r); audio.sfx('tap'); }} data-testid={`night-${r}`}>{r === 'ask' ? 'Ask' : r === 'camp' ? 'Camp' : 'March'}</button>
              ))}
            </span>
            {moving && <span className="bl-pace" data-testid="pace">{g.dayOver ? 'Paused · tap Next day to set off' : moving.mode === 'ship' ? 'By ship' : moving.mode === 'motor' ? 'By motor car' : moving.mode === 'ferry' ? 'By ferry' : moving.train ? 'By train' : timeScale === 0 ? 'Paused' : `${milesPerDay(sp.pxPerDay)} mi/day`}</span>}
          </div>
          {/* small on the map; a tap opens it larger, with each number named */}
          <button type="button" className={`bl-party ${partyOpen ? 'open' : ''}`} onClick={() => setPartyOpen((o) => !o)} aria-expanded={partyOpen} aria-label="Your caravan: tap for details" data-testid="bl-party">
            <span title="Money"><Icon name="coin" />{fmt(g.cash)}<em>Money</em></span>
            <span title="People: you and your men"><Icon name="people" />{partySize(w.party)}<em>People</em></span>
            <span className={foodDaysLeft(w.party) < 2 ? 'warn' : ''} title="Days of food at today's rate"><Icon name="bag" />{foodDaysLeft(w.party)}d<em>Food</em></span>
            <span title="Animals"><Icon name="camel" />{animalCount(w.party)}<em>Animals</em></span>
            <span className={sp.over ? 'warn' : ''} title="Load / what you can carry"><Icon name="scale" />{Math.round(sp.load)}/{Math.round(sp.cap)}<em>Load</em></span>
            <span title="Fighting strength"><Icon name="shield" />{strength(w.party)}<em>Strength</em></span>
            <span className={sp.hungry || sp.over ? 'warn' : ''} title={`Travel speed on foot${sp.over ? ', overloaded' : ''}${sp.hungry ? ', hungry' : ''}`} data-testid="bl-speed"><Icon name="run" />{milesPerDay(sp.pxPerDay)}<small>mi/d</small><em>Speed{sp.hungry ? ', hungry' : sp.over ? ', overloaded' : ''}</em></span>
          </button>
        </div>
        {meOff && (
          <button type="button" className="find-me-pill" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={() => { follow.current = true; centreOn(mePt); audio.sfx('tap'); }} data-testid="find-me-pill">
            <i style={{ transform: `rotate(${meAngle}deg)` }} aria-hidden="true">➜</i> Back to your caravan
          </button>
        )}
        <div className="scalebar" aria-hidden="true"><i style={{ width: milesPx(s) }} /><span>100 miles</span></div>
        <div className="map-tools" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <button onClick={() => zoomTo(z + 0.6)} aria-label="Zoom in" data-testid="world-zoom-in">+</button>
          <button onClick={() => zoomTo(z - 0.6)} aria-label="Zoom out">−</button>
          <button onClick={() => { follow.current = true; centreOn(moving && live ? live : { x: w.x, y: w.y }); }} aria-label="Centre on your caravan" title="Back to your caravan" data-testid="world-recenter"><Icon name="locate" /><small className="tool-cap">You</small></button>
          <button className="jobs-btn" onClick={() => setJobsOpen((o) => !o)} aria-label="Objectives" title="Objectives" data-testid="jobs-btn"><Icon name="scroll" />{jobs.length + visits.length > 0 && <b>{jobs.length + visits.length}</b>}</button>
        </div>
      </div>

      <div className="world-card" data-testid="world-card">
        {report && <p className="world-report" data-testid="world-report">{report}</p>}
        {moving && well && !nightfall && (
          <div className="wc-col nightfall" data-testid="well-stop">
            <div className="wc-main">
              <b>{well.name}: a well</b>
              <span>Stop for an hour and fill every waterskin, or keep going. Water now: {Math.round(waterOf(useGame.getState().condition))} of 100.</span>
            </div>
            <div className="wc-btns">
              <button className="btn primary" onClick={() => { useGame.getState().fillWater(); setWell(null); setTimeScale(lastScale.current || 1); audio.sfx('water'); }} data-testid="well-fill">Fill the waterskins · 1 hour</button>
              <button className="btn" onClick={() => { setWell(null); setTimeScale(lastScale.current || 1); }} data-testid="well-skip">Carry on</button>
            </div>
          </div>
        )}
        {moving && nightfall && (
          <div className="wc-col nightfall" data-testid="nightfall">
            <div className="wc-main">
              <b>Night falls on the road</b>
              <span>Make camp and sleep, or march on through the dark: you gain time, but raiders favour the night.</span>
            </div>
            <div className="wc-btns">
              <button className="btn primary" onClick={() => { if (rememberNight) setNightRule('camp'); const dest = moving.dest; setNightfall(false); setMoving(null); setTimeScale(1); setAlt(null); setCamp({ dest }); audio.sfx('tap'); }} data-testid="make-camp">Make camp</button>
              <button className="btn" onClick={() => { if (rememberNight) setNightRule('march'); setNightfall(false); setTimeScale(lastScale.current || 1); }} data-testid="march-on">March on</button>
            </div>
            <label className="nf-remember"><input type="checkbox" checked={rememberNight} onChange={(e) => setRememberNight(e.target.checked)} data-testid="night-remember" /> Do this every night. Change it any time under "Nights" on the clock bar.</label>
          </div>
        )}
        {moving ? (
          <div className="wc-row">
            <div className="wc-main">
              <b>{moving.dest ? `To ${settlementById(moving.dest).name}` : 'Travelling'}</b>
              <span>
                {moving.mode === 'ship' ? 'At sea' : moving.mode === 'motor' ? 'Nairn desert car' : moving.mode === 'ferry' ? 'The Nile ferry' : moving.train ? 'Egyptian State Railways' : `${milesPerDay(sp.pxPerDay)} mi a day${sp.over ? ', overloaded' : ''}${sp.hungry ? ', hungry' : ''} · food for ${daysWord(foodDaysLeft(w.party))}`}
              </span>
            </div>
            <button className="btn" onClick={() => { setAlt(null); setNightfall(false); stop('You halt on the road.'); }} data-testid="stop" disabled={!!moving.mode}>Stop</button>
          </div>
        ) : null}
        {moving && reroute && (() => {
          const destName = moving.dest ? settlementById(moving.dest).name : '';
          const name = reroute.st ? reroute.st.name : 'this spot';
          if (reroute.fixed) {
            const by = moving.mode === 'ferry' ? 'the ferry' : moving.mode === 'ship' ? 'a ship' : moving.mode === 'motor' ? 'the Nairn motor car' : 'the train';
            const why = moving.mode === 'ferry' ? 'The ferry only crosses the river and back' : moving.mode === 'ship' ? 'A ship keeps to its course' : moving.mode === 'motor' ? 'The motor car keeps to its route' : 'A train keeps to its line';
            return (
              <div className="wc-col reroute" data-testid="reroute">
                <div className="wc-main">
                  <b>{name}</b>
                  <span>You are on {by}{destName ? ` to ${destName}` : ''}. {why}: you cannot change course on the way. Plan the trip to {name} once you arrive.</span>
                </div>
                <div className="wc-btns">
                  <button className="btn primary" onClick={() => setReroute(null)} data-testid="reroute-keep">Keep going</button>
                </div>
              </div>
            );
          }
          const short = reroute.path && reroute.need > w.party.food;
          return (
            <div className="wc-col reroute" data-testid="reroute">
              <div className="wc-main">
                <b>{reroute.path ? `Change course to ${name}?` : name}</b>
                <span>You are walking{destName ? ` to ${destName}` : ''}. {reroute.path
                  ? `From here to ${name}: ${reroute.days < 0.1 ? 'a short walk' : `about ${durationLabel(reroute.elapsed)} on foot`}, needing ${reroute.need} ration${reroute.need === 1 ? '' : 's'}. You carry ${Math.floor(w.party.food)}.`
                  : `There is no way to ${name} on foot from here.`}</span>
                {short && <span className="warn" data-testid="reroute-food">Not enough food for that journey, and no market out here to buy more.</span>}
              </div>
              <div className="wc-btns">
                <button className="btn primary" onClick={() => setReroute(null)} data-testid="reroute-keep">Keep going{destName ? ` to ${destName}` : ''}</button>
                {reroute.path && <button className="btn" onClick={changeCourse} data-testid="reroute-go">{short ? 'Change course anyway' : 'Change course'}</button>}
              </div>
            </div>
          );
        })()}
        <BorderCard onDone={(t) => setPanel(t)} />
        {pass && <PassCard tripKey={pass.key} onCancel={() => { setPass(null); stop('You halt below the narrows. Turn back, or set off again when you are ready.'); }} onGo={() => { setPass(null); setTimeScale(lastScale.current || 1); }} />}
        {short && !moving && (
          <div className="wc-col" data-testid="food-short">
            <div className="wc-main">
              <b>Short of food for {short.plan.settlement ? short.plan.settlement.name : 'the road'}</b>
              <span>The journey needs {short.need} more ration{short.need === 1 ? '' : 's'} than you carry.</span>
            </div>
            <div className="wc-btns">
              <button className="btn primary" disabled={g.cash < short.price} onClick={() => { setReport(g.buyFood(short.need)); setOff(short.plan); }} data-testid="food-buy-go">Buy {short.need} ration{short.need === 1 ? '' : 's'} · {fmt(short.price)} and go</button>
              <button className="btn" onClick={() => setOff(short.plan)} data-testid="food-go">Go anyway</button>
            </div>
          </div>
        )}
        {moving && alt && !moving.train && (
          <div className="wc-alt" data-testid="alt-routes">
            <span>Faster:</span>
            {altFerry && alt.settlement && (
              <button className="btn" onClick={() => startFerry(alt.settlement!.id as 'giza' | 'cairo')} data-testid="ferry">Nile ferry · {fmt(ferryFare(g).total)} · {durationLabel(ferryDays())}</button>
            )}
            {alt.train && <button className="btn" onClick={() => { setMoving(null); start(true, alt); }} data-testid="train">Train · {fmt(alt.train.fare)} · {durationLabel(alt.train.days)}</button>}
            {alt.ships.map((r) => <button key={r.to} className="btn sail-btn" onClick={() => { setMoving(null); startSea(r, 'ship', alt.from); }} data-testid="ship">⚓ Ship · {fmt(r.fare)} · {durationLabel(r.days)}</button>)}
          </div>
        )}
        {moving ? null : plan ? (
          plan.path ? (() => {
            // every number on this card comes from what the journey will actually do: the walk with its
            // nights and any wait at the narrows, and each fare for the whole party
            const est = estimate(plan.days, plan.settlement?.id);
            const perDay = dailyFood(w.party);
            const camping = nightRule !== 'march';
            const ferry = (w.at === 'giza' && plan.settlement?.id === 'cairo') || (w.at === 'cairo' && plan.settlement?.id === 'giza');
            const ways = [
              ...(ferry ? [{ key: 'ferry', days: ferryDays(), ok: g.cash >= ferryFare(g).total }] : []),
              ...(plan.train ? [{ key: 'train', days: plan.train.days, ok: g.cash >= plan.train.fare }] : []),
              ...plan.ships.map((r) => ({ key: 'ship' + r.to, days: r.days, ok: g.cash >= r.fare })),
              ...plan.motor.map((r) => ({ key: 'motor' + r.to, days: r.days, ok: g.cash >= r.fare })),
              { key: 'walk', days: est.elapsedDays, ok: true },
            ];
            // the quickest way you can pay for leads the card and is the only one called fastest
            const lead = ways.filter((x) => x.ok).sort((a, b) => a.days - b.days)[0]?.key ?? 'walk';
            const fast = (k: string) => (lead === k && ways.length > 1 ? ' · fastest' : '');
            const bills = [
              plan.train?.bill && { k: 'Train', bill: plan.train.bill },
              ...plan.ships.map((r) => r.bill && { k: 'Ship', bill: r.bill }),
              ...plan.motor.map((r) => r.bill && { k: 'Motor car', bill: r.bill }),
            ].filter((x): x is { k: string; bill: FareLine[] } => !!x && (x.bill.length > 1 || x.bill[0].n > 1));
            return (
            <div className="wc-col">
              <div className="wc-main">
                <b>{plan.settlement ? plan.settlement.name : isExplored(w.fog, plan.to) ? 'Open country' : 'Unexplored land'}</b>
                <span data-testid="plan-walk">
                  {plan.days < 0.1 ? 'A short walk' : `On foot: about ${durationLabel(est.elapsedDays)} (${plan.days.toFixed(1)} days' march at ${milesPerDay(sp.pxPerDay)} mi a day, ${camping ? `camping at night${nightRule === 'ask' ? ' if you choose to' : ''}` : 'marching through the night'}${est.waitDays ? `, and ${daysWord(est.waitDays)} waiting for an escort at the narrows` : ''})`}{groundLine(plan.path)} · needs {est.rations} ration{est.rations === 1 ? '' : 's'} ({perDay} a day){w.party.food < est.rations ? ' · not enough food' : ''}
                </span>
                {(() => {
                  // what the walk leaves for the way home, and a job there that needs a rug packed here
                  const need = est.rations, left = Math.floor(w.party.food) - need;
                  const job = w.at === 'giza' && plan.settlement ? openJobs(g.jobsDone, g.reputation).find((j) => j.target === plan.settlement!.id && j.need?.packedTier) : undefined;
                  const tier = job?.need?.packedTier ?? 0;
                  const unpacked = job && !g.inventory.some((i) => !i.stored && (RUGS[i.typeId]?.tier ?? 1) >= tier);
                  // the food warning is about walking: a ferry, train or boat that the card leads with
                  // gets you there in hours, so it is left out then
                  const lines = [
                    lead === 'walk' && need > 0 && left >= 0 && left < need ? (left === 0 ? 'You would arrive with no food for the way back.' : `You would arrive with only ${left} ration${left === 1 ? '' : 's'} for the way back.`) : '',
                    unpacked ? `${job!.title} needs ${withArticle(['', 'rug', 'Fine rug', 'Exceptional rug', 'Legendary rug'][tier])} packed for the road. Pack it in Stock before you leave: rugs can only be packed at your Giza stall.` : '',
                  ].filter(Boolean);
                  return lines.length ? <span className="warn" data-testid="plan-warn">{lines.join(' ')}</span> : null;
                })()}
                <TripMoney from={w.at} to={plan.settlement?.id} />
                <TripPapers from={w.at} to={plan.settlement?.id} onOffice={() => { if (w.at === 'cairo') { setPlan(null); setPanel('cairo'); } else { const c = settlementById('cairo'); planTo({ x: c.x, y: c.y }, c); } }} />
                {bills.length > 0 && (
                  <span className="fare-bill" data-testid="fare-bill">
                    {bills.map((x) => <i key={x.k}>{x.k}: {billLine(x.bill)}</i>)}
                  </span>
                )}
              </div>
              <div className="wc-btns">
                {ferry && (
                  <button className={`btn sail-btn${lead === 'ferry' ? ' primary faster' : ''}`} onClick={() => startFerry(plan.settlement!.id as 'giza' | 'cairo')} data-testid="ferry">⛴ Nile ferry · {fmt(ferryFare(g).total)} · {durationLabel(ferryDays())}{fast('ferry')}</button>
                )}
                {plan.train && <button className={`btn${lead === 'train' ? ' primary' : ''}`} onClick={() => start(true)} data-testid="train">Train · {fmt(plan.train.fare)} · {arrivalLabel(plan.train.days)}{fast('train')}</button>}
                {plan.ships.map((r) => (
                  <button key={r.to} className={`btn sail-btn${lead === 'ship' + r.to ? ' primary faster' : ''}`} onClick={() => startSea(r, 'ship', plan.from)} data-testid="ship">⚓ Ship · {fmt(r.fare)} · {arrivalLabel(r.days)}{fast('ship' + r.to)}</button>
                ))}
                {plan.motor.map((r) => (
                  <button key={r.to} className={`btn sail-btn${lead === 'motor' + r.to ? ' primary faster' : ''}`} onClick={() => startSea(r, 'motor', plan.from)} data-testid="motor">🚚 Nairn motor car · {fmt(r.fare)} · {arrivalLabel(r.days)}{fast('motor' + r.to)}</button>
                ))}
                {lead === 'walk'
                  ? <button className="btn primary" onClick={() => start(false)} data-testid="travel">Travel</button>
                  : <button className="btn" onClick={() => start(false)} data-testid="travel">{ferry ? 'Walk instead' : 'Walk'} · {plan.days < 0.1 ? 'a short walk' : `about ${durationLabel(est.elapsedDays)}`}</button>}
                <button className="btn" onClick={() => setPlan(null)}>Cancel</button>
              </div>
            </div>
            );
          })() : (
            <div className="wc-row">
              <div className="wc-main">
                <b>{plan.settlement ? plan.settlement.name : blockedTitle(plan.to)}</b>
                <span>{plan.ships.length || plan.train ? 'Not reachable on foot from here.' : plan.settlement ? 'Not reachable on foot. Go to a port or a railway station.' : blockedText(plan.to)}</span>
                {[plan.train?.bill && { k: 'Train', bill: plan.train.bill }, ...plan.ships.map((r) => r.bill && { k: 'Ship', bill: r.bill })].filter((x): x is { k: string; bill: FareLine[] } => !!x && (x.bill.length > 1 || x.bill[0].n > 1)).map((x) => (
                  <span key={x.k} className="fare-bill" data-testid="fare-bill"><i>{x.k}: {billLine(x.bill)}</i></span>
                ))}
              </div>
              {plan.train && <button className="btn primary" onClick={() => start(true)} data-testid="train">Train · {fmt(plan.train.fare)} · {arrivalLabel(plan.train.days)}</button>}
              {plan.ships.map((r) => (
                <button key={r.to} className="btn primary sail-btn" data-testid="ship" onClick={() => startSea(r, 'ship', plan.from)}>⚓ Ship · {fmt(r.fare)} · {arrivalLabel(r.days)}</button>
              ))}
              <button className="btn" onClick={() => setPlan(null)}>OK</button>
            </div>
          )
        ) : here ? (
          <div className="wc-row">
            <div className="wc-main">
              <b>{here.name}</b>
              <span className={foodDaysLeft(w.party) < 1 ? 'warn' : ''}>{caravanLine}</span>
            </div>
            <button className="btn primary" onClick={() => (here.id === 'giza' && onDistrict ? onDistrict() : setPanel(here.id))} data-testid="enter">{here.id === 'giza' ? 'Zoom into Giza' : 'Enter'}</button>
          </div>
        ) : (
          <div className="wc-row">
            <div className="wc-main">
              <b>Halted on the road</b>
              <span className={foodDaysLeft(w.party) < 1 ? 'warn' : ''}>{caravanLine}</span>
            </div>
            {(w.hour >= 17 || w.hour < 6) && <button className="btn primary" onClick={() => { setCamp({}); audio.sfx('tap'); }} data-testid="make-camp">Make camp</button>}
          </div>
        )}
      </div>

      {sleeping && (
        <NightPasses
          fed={foodDaysLeft(w.party) >= 1}
          onDawn={() => {
            const st = useGame.getState();
            const h = st.world.hour;
            const hours = h < 6 ? 6 - h : 30 - h;
            const notes = st.travelStep({ x: live?.x ?? w.x, y: live?.y ?? w.y }, hours / 24, true);
            setReport(['You camp for the night and set off again at dawn.', ...notes.filter((n) => !n.startsWith('Day ')).slice(-2)].join(' '));
            setSleeping(false);
            setTimeScale(lastScale.current || 1);
          }}
          onWake={() => { setSleeping(false); setNightRule('ask'); setNightfall(true); }}
        />
      )}
      {camp && (
        <CampScreen
          dest={camp.dest}
          onClose={() => setCamp(null)}
          onResume={(dest) => {
            setCamp(null);
            // the same journey goes on from where you slept, straight away, not back to the trip card
            const st = settlementById(dest);
            const p = st ? planTo(st, st, true) : undefined;
            if (p?.path) { setOff(p); setTimeScale(lastScale.current || 1); }
          }}
        />
      )}
      {encounter && encounter.kind === 'raiders' && (
        <Ambush
          party={encounter}
          onDone={(msg) => { setReport(msg); setEncounter(null); if (useGame.getState().rescue) setMoving(null); }}
          onTurnBack={(msg) => { setEncounter(null); turnBack(msg); }}
        />
      )}
      {encounter && encounter.kind !== 'raiders' && (
        <EncounterCard
          party={encounter}
          onDone={(msg) => {
            setReport(msg);
            setEncounter(null);
          }}
          onTurnBack={() => {
            setEncounter(null);
            turnBack('You turn your animals around and go back the way you came.');
          }}
        />
      )}
      {jobsOpen && (
        <Objectives
          onClose={() => setJobsOpen(false)}
          onFocus={(id) => {
            setJobsOpen(false);
            const st = settlementById(id);
            if (!st) return;
            if (w.at === id) { useGame.getState().checkJobs(id); if (id === 'giza' && onDistrict) onDistrict(); else setPanel(id); return; }
            follow.current = false;
            centreOn({ x: st.x, y: st.y });
            planTo(st, st);
          }}
        />
      )}
      {panel && panel === w.at && <SettlementPanel id={panel} tab={resumed.current ? undefined : panel === openPanel ? openTab : undefined} resume={resumed.current} onClose={() => { resumed.current = false; openTown.at = null; setPanel(null); }} onStall={onStall} />}
    </div>
  );
}

function EncounterCard({ party, onDone, onTurnBack }: { party: Party; onDone: (m: string) => void; onTurnBack: () => void }) {
  const g = useGame();
  const [msg, setMsg] = useState('');
  const mine = strength(g.world.party);
  const men = Object.entries(g.world.party.troops).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${midName(n > 1 ? TROOPS[id].plural : TROOPS[id].name)}`).join(', ');
  const text = useMemo(() => {
    switch (party.kind) {
      case 'caravan': return `A string of camels comes over the rise: the ${midName(party.name)}. The caravan master raises a hand in greeting.`;
      case 'pilgrims': return `${party.name}, dusty and cheerful, stop to share the shade.`;
      case 'raiders': return `${party.size ?? 'Several'} riders come down off the ridge and block the track. Rifles across their saddles, not yet pointed at anyone.`;
      case 'mercenaries': return `${party.name}: four armed men resting their horses. Their leader looks your camels over and asks if you need protection.`;
      default: return 'Tarabin herders with goats and two thin camels. They watch you with interest.';
    }
  }, [party]);
  const odds = party.strength ? Math.round((mine / (mine + party.strength)) * 100) : 0;
  const opts: [string, string][] =
    party.kind === 'caravan' ? [['news', 'Ask for news'], ['trade', 'See what they carry'], ['move', 'Move on']]
    : party.kind === 'pilgrims' ? [['news', 'Ask about the road'], ['share', 'Share bread and water (£0.03)'], ['move', 'Move on']]
    : party.kind === 'raiders' ? [['fight', `Fight (${odds}% chance)`], ['toll', 'Pay what they ask'], ['talk', 'Talk your way through'], ['turn', 'Turn back']]
    : party.kind === 'mercenaries' ? [['hire', 'Hire all four (£4)'], ['news', 'Ask for news'], ['move', 'Move on']]
    : [['news', 'Ask for news'], ['move', 'Move on']];
  return (
    <div className="overlay" data-testid="road-encounter">
      <Tip id="road" />
      <div className="modal-card">
        <h2>{party.name}</h2>
        <p style={{ color: 'var(--parchment)' }}>{text}</p>
        {partyGoods(party) && <p className="enc-goods" data-testid="encounter-goods"><Icon name={partyGoods(party)!.icon} /> <b>Carrying {partyGoods(party)!.label}.</b> {partyGoods(party)!.note}</p>}
        {party.kind === 'raiders' && <p>Your side: strength {mine}{men ? ` (${men})` : ', just you'}. Theirs: about {party.strength}.</p>}
        {msg ? (
          <>
            <p style={{ color: 'var(--parchment)' }} data-testid="encounter-result">{msg}</p>
            <button className="btn primary" onClick={() => (msg.includes('turn back') ? onTurnBack() : onDone(msg))} data-testid="encounter-continue">Continue</button>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {opts.map(([id, label]) => (
              <button key={id} className="btn" onClick={() => { setMsg(g.partyChoice(party.id, id)); audio.sfx(id === 'fight' ? 'chest' : 'tap'); }} data-testid={`enc-${id}`}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
