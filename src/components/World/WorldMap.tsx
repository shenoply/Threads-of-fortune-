import { venueFor } from '../../data/venues';
import { PassCard, PASS_TOWNS, needsPass } from './PassCard';
import { Tip } from '../Tips/Tip';
import { MISSIONS, MAIN_ORDER } from '../../data/missions';
import { fmt } from '../../game/economy/money';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { SETTLEMENTS, type Settlement } from '../../data/world';
import { TROOPS, MARKETS } from '../../data/caravan';
import { ROAD_LINES } from '../../data/terrain';
import { routeDanger,
  MAP_W, MAP_H, findPath, routeLeg, routeThrough, pathLength, pathDays, terrainAt, terrainSpeed, TERRAIN_LABEL, pathGround, along, isWaterPx, isExplored, dist, seaRoutesFrom, motorRoutesFrom, railJourney,
  settlementById, type Pt, type Party,
} from '../../game/systems/world';
import { drawWorld, fogCanvas, milesPx, onPaintedMap, paintedMap } from '../../game/systems/mapRender';
import { animalCount, speedInfo, strength, partySize, foodDaysLeft, dailyFood } from '../../game/systems/caravan';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';
import { useAudioEnv } from '../../game/audio/useAudioEnv';
import { SettlementPanel, type SetTab } from './Settlement';
import { openJobs } from '../../data/jobs';
import { RUGS } from '../../data/rugs';
import { BREEDS } from '../../data/animals';
import { Objectives } from '../Objectives/Objectives';
import { Ambush } from './Ambush';
import { CampScreen, NightPasses } from './Camp';
import { dateLine } from '../../game/economy/newspaper';
import { dateFor } from '../../game/economy/economy';
import { CaravanStrip } from './CaravanPanels';
import { milesPerDay } from './CaravanScreen';
import { StallOverhead } from './StallOverhead';
import { newsMarks, khamsinZones, inKhamsin, partyGoods, NEWS_ICON, NEWS_TIP, KHAMSIN_R } from '../../game/systems/mapNews';

export const DAYS_PER_SECOND = 1 / 24; // one game hour per second at 1x (a day in 24 s; 6 s at 4x), on the road or standing still
const MAJOR = ['home', 'city', 'port'];
/** The season of a game day, for the date on the map bar (day 1 = 10 March 1925). */
function seasonOf(day: number) {
  const m = new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth();
  return m < 2 || m === 11 ? 'Winter' : m < 5 ? 'Spring' : m < 8 ? 'Summer' : 'Autumn';
}

const kindIcon: Record<string, string> = { home: 'store', city: 'star', town: 'room', village: 'room', oasis: 'sun', port: 'anchor', monastery: 'book', camp: 'camel' };

interface Plan {
  to: Pt;
  settlement?: Settlement;
  path: Pt[] | null;
  days: number;
  train?: { days: number; fare: number; stops: string[] };
  ships: { to: string; days: number; fare: number }[];
  motor: { to: string; days: number; fare: number }[];
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

export function WorldMap({ onStall, onDistrict, openPanel, openTab, planFor, scale, setScale, frozen, startZoom, onZoomGiza }: { onStall: () => void; onDistrict?: () => void; openPanel?: string; openTab?: SetTab; planFor?: string; scale?: number; setScale?: (n: number) => void; frozen?: boolean; startZoom?: number; onZoomGiza?: () => void }) {
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
  type Moving = { path: Pt[]; done: number; train: boolean; dest?: string; pxPerDay?: number; mode?: 'ship' | 'motor' };
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
    const hours = Math.max(1, Math.round(days * 24));
    return `about ${hours} h, arrives ${dateFor(d).weekday.slice(0, 3)} ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
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
  const [nightfall, setNightfall] = useState(false);
  const [camp, setCamp] = useState<{ dest?: string } | null>(null);
  const [partyOpen, setPartyOpen] = useState(false);
  const nightAsked = useRef(-1);
  // what to do when night falls on a walk: ask each time, or the player's standing order
  const [nightRule, setNightRuleRaw] = useState<'ask' | 'camp' | 'march'>(() => { try { return (localStorage.getItem('tof-night-rule') as 'ask' | 'camp' | 'march') || 'ask'; } catch { return 'ask'; } });
  const setNightRule = (r: 'ask' | 'camp' | 'march') => { setNightRuleRaw(r); try { localStorage.setItem('tof-night-rule', r); } catch { /* private mode */ } };
  const nightRuleRef = useRef(nightRule); nightRuleRef.current = nightRule;
  const [sleeping, setSleeping] = useState(false); // the night passing in a short camp, then on at dawn
  const [rememberNight, setRememberNight] = useState(false);
  useEffect(() => { if (timeScale > 0) setNightfall(false); }, [timeScale]);
  const [report, setReport] = useState<string>('');
  // a town's own screen opens only where you actually are; a shortcut to anywhere else plans the route instead
  const [panel, setPanel] = useState<string | null>(openPanel && openPanel === w.at ? openPanel : null);
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

  const base = Math.max(size.w / MAP_W, size.h / MAP_H);
  const s = base * z;
  const sRef = useRef(s);
  sRef.current = s;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const sp = speedInfo(w.party, g.inventory);
  // the map figure leads a camel only once you own one
  const hasCamel = Object.entries(w.party.animals ?? {}).some(([id, n]) => n > 0 && BREEDS[id]?.kind === 'camel');
  const jobs = openJobs(g.jobsDone, g.reputation);
  const visits = (g.visits ?? []).filter((v) => v.until >= g.day);
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
  /** Paint the map at the live camera (panRef), not the last committed one; the travel loop calls this every frame. */
  const paintRef = useRef<() => void>(() => {});
  paintRef.current = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const sz = sizeRef.current;
    const W = Math.max(1, sz.w), H = Math.max(1, sz.h);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const p = panRef.current;
    drawWorld(c.getContext('2d')!, { w: W, h: H, s: sRef.current, tx: p.x, ty: p.y, dpr }, { fog: fogImg, roads });
  };
  useEffect(() => {
    const raf = requestAnimationFrame(() => paintRef.current());
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
    (p: Pt, sc = s) => ({ x: Math.min(0, Math.max(size.w - MAP_W * sc, p.x)), y: Math.min(0, Math.max(size.h - MAP_H * sc, p.y)) }),
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
    nz = Math.max(1, Math.min(4.5, nz));
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
    const from = { x: w.x, y: w.y };
    const target = st ? { x: st.x, y: st.y } : to;
    const ships = here && st ? seaRoutesFrom(here.id).filter((r) => r.to === st.id) : [];
    const motor = here && st ? motorRoutesFrom(here.id).filter((r) => r.to === st.id) : [];
    if (!st && (isWaterPx(to) || terrainAt(to) === 'mountains')) {
      const p0: Plan = { to, path: null, days: 0, ships: [], motor: [], from: here };
      setPlan(p0);
      return p0;
    }
    const path = st && isWaterPx(st) && !findPath(from, target) ? null : findPath(from, target);
    const days = path ? pathDays(path, sp.pxPerDay) : 0;
    const train = here && st ? railJourney(here.id, st.id) ?? undefined : undefined;
    // the same check setOff() warns about in text, done here too so the route line itself can go red
    const risky = !!path && routeDanger(path, w.parties) > strength(w.party);
    const p: Plan = { to: target, settlement: st, path, days, train, ships, motor, from: here, risky };
    setPlan(p);
    audio.sfx('tap');
    return p;
  };
  /** Tap and go: the caravan sets off at once. Faster ways (train, ferry, ship) stay offered on the card while you walk. */
  const goTo = (to: Pt, st?: Settlement) => {
    // Giza and Cairo face each other across the river: the ferry takes an hour and a half, never days on foot
    if (st && ((w.at === 'giza' && st.id === 'cairo') || (w.at === 'cairo' && st.id === 'giza')) && !moving) {
      const note = g.ferry(st.id as 'giza' | 'cairo');
      setReport(note);
      if (useGame.getState().world.at === st.id) { if (st.id === 'giza' && onDistrict) onDistrict(); else setPanel(st.id); }
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
  // leaving a town short of food: offer to buy what the road needs, in one tap, before setting off.
  // Shared by the tap-and-go path above and the plan card's own "Travel" button below (opened from
  // the Objectives panel or the objective banner's Map button) — without this in both places, only
  // one of the two ways to start walking actually caught a caravan that could not make the distance.
  const offerFoodShort = (p: Plan) => {
    const need = Math.ceil(Math.max(1, p.days) * dailyFood(w.party)) - w.party.food;
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
    const danger = routeDanger(p.path, now.parties);
    const mine = strength(now.party);
    setReport(danger > mine ? `Warning: raiders ride this road, about ${danger} strong. Your strength is ${mine}. Hire guards, or risk your cash and packed rugs.` : foodDaysLeft(now.party) < p.days ? 'Not enough food for the whole journey. Buy some in a town.' : '');
    audio.sfx('step');
  };  // a chapter can send you here with a journey already planned
  useEffect(() => {
    const target = planFor ?? (openPanel && openPanel !== w.at ? openPanel : undefined);
    if (!target || w.at === target) return;
    const st = SETTLEMENTS.find((x) => x.id === target);
    if (st) setTimeout(() => planTo(st, st), 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


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
      if (sand) speed *= 0.6;
      if (sand && !inSand) setReport('A khamsin is blowing: the caravan slows.');
      inSand = sand;
      const days = dt * DAYS_PER_SECOND * scaleRef.current;
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
        paintRef.current();
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
          if (nightRuleRef.current === 'camp') { setTimeScale(0); setSleeping(true); }
          else if (nightRuleRef.current === 'ask') { setTimeScale(0); setNightfall(true); }
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
          useGame.getState().arriveAt(dest);
          if (dest === 'giza' && onDistrict) onDistrict();
          else setPanel(dest);
          setReport('');
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
    // tap anywhere to go there, even mid-journey: the caravan simply turns
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
  const routeRisky = plan ? plan.risky : moving && !moving.train && !moving.mode ? routeDanger(moving.path, w.parties) > strength(w.party) : false;
  const hh = Math.floor(w.hour), mm = Math.floor((w.hour % 1) * 60);
  const caravanLine = `${partySize(w.party)} ${partySize(w.party) === 1 ? 'person' : 'people'} · ${animalCount(w.party)} animal${animalCount(w.party) === 1 ? '' : 's'} · ${foodDaysLeft(w.party) < 1 ? 'no food: buy some in a town' : `food ${foodDaysLeft(w.party)} days`} · load ${Math.round(sp.load)}/${Math.round(sp.cap)} · strength ${strength(w.party)}`;
  const status = moving ? (moving.mode === 'ship' ? 'At sea' : moving.mode === 'motor' ? 'Crossing the desert' : moving.train ? 'On the train' : timeScale === 0 ? 'Paused on the road' : 'On the road') : here ? `In ${here.name}` : 'Halted on the road';
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
            setHoverBlocked(!nearSettlement && (isWaterPx(mp) || terrainAt(mp) === 'mountains'));
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
          <svg className="world-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: MAP_W * s, height: MAP_H * s }}>
            {routeSvg && <polyline points={routeSvg.map((p) => `${p.x},${p.y}`).join(' ')} className={`route ${moving ? 'live' : ''} ${routeRisky ? 'danger' : ''}`} />}
            {plan && !plan.path && <circle cx={plan.to.x} cy={plan.to.y} r="6" className="route-bad" />}
          </svg>
          {SETTLEMENTS.filter((st) => w.known.includes(st.id)).map((st) => (
            <button
              key={st.id}
              className={`place kind-${st.kind} ${w.at === st.id ? 'here' : ''} ${plan?.settlement?.id === st.id ? 'sel' : ''} ${missionTarget === st.id ? 'mission' : ''}`}
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
                if (moving?.train) { if (raid) setReport(`${p.name} watch the train pass, out of reach from the tracks.`); return; }
                if (dist(p, w) < 18) { setMoving(null); setEncounter(p); } else goTo({ x: p.x, y: p.y });
              }}>
                {raid && <i className="pring" style={{ width: 44 * s, height: 44 * s }} aria-hidden="true" />}
                <span className="pbadge"><Icon name={p.kind === 'raiders' ? 'sword' : p.kind === 'pilgrims' ? 'people' : p.kind === 'mercenaries' ? 'shield' : 'camel'} /></span>
                {raid ? (
                  <span className="pname" data-testid={`raid-label-${p.id}`}>{hunting ? 'Hunting you · ' : ''}{p.name} · {p.strength} vs {mine}</span>
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
              // you and the camel on foot: two painted steps that alternate while you walk
              <span className={`me-walk ${hasCamel ? '' : 'solo'}`} aria-hidden="true">
                {[1, 2].map((k) => <img key={k} src={`art/world/party-${hasCamel ? 'walk' : 'solo'}-${k}.webp`} alt="" draggable={false} />)}
              </span>
            )}
            {z >= 3 && <span className="pname me-name">You · {partySize(w.party)}</span>}
          </span>
        </div>

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
                  <button key={k} className={timeScale === k ? 'on' : ''} onClick={() => setTimeScale(k)} aria-label={k ? `${k} times speed` : 'Pause'} data-testid={`speed-${k}`}>{k === 0 ? '❚❚' : k === 1 ? '▶︎' : k === 2 ? '▶︎▶︎' : '▶︎▶︎▶︎'}</button>
                ))}
              </span>
            ) : <span className="bl-still">{here ? here.name : 'Halted'}</span>}
            <button className={`bl-night ${nightRule}`} onClick={() => setNightRule(nightRule === 'ask' ? 'camp' : nightRule === 'camp' ? 'march' : 'ask')} title="What to do when night falls on the road" data-testid="night-rule"><Icon name="moon" />{nightRule === 'ask' ? 'Ask' : nightRule === 'camp' ? 'Camp' : 'March'}</button>
            {moving && <span className="bl-pace" data-testid="pace">{g.dayOver ? 'Paused · tap Next day to set off' : moving.mode === 'ship' ? 'By ship' : moving.mode === 'motor' ? 'By motor car' : moving.train ? 'By train' : timeScale === 0 ? 'Paused' : `${milesPerDay(sp.pxPerDay)} mi/day`}</span>}
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
          <button className="jobs-btn" onClick={() => setJobsOpen((o) => !o)} aria-label="Objectives: story, jobs and visitors" data-testid="jobs-btn"><Icon name="scroll" />{jobs.length + visits.length > 0 && <b>{jobs.length + visits.length}</b>}</button>
        </div>
      </div>

      <div className="world-card" data-testid="world-card">
        {report && <p className="world-report" data-testid="world-report">{report}</p>}
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
            <label className="nf-remember"><input type="checkbox" checked={rememberNight} onChange={(e) => setRememberNight(e.target.checked)} data-testid="night-remember" /> Do the same every night (change it with the moon button)</label>
          </div>
        )}
        {moving ? (
          <div className="wc-row">
            <div className="wc-main">
              <b>{moving.dest ? `To ${settlementById(moving.dest).name}` : 'Travelling'}</b>
              <span>
                {moving.mode === 'ship' ? 'At sea' : moving.mode === 'motor' ? 'Nairn desert car' : moving.train ? 'Egyptian State Railways' : `${milesPerDay(sp.pxPerDay)} mi a day${sp.over ? ', overloaded' : ''}${sp.hungry ? ', hungry' : ''} · food for ${foodDaysLeft(w.party)} days`}
              </span>
            </div>
            <button className="btn" onClick={() => { setAlt(null); setNightfall(false); stop('You halt on the road.'); }} data-testid="stop" disabled={!!moving.mode}>Stop</button>
          </div>
        ) : null}
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
              <button className="btn" onClick={() => { const to = alt.settlement!.id as 'giza' | 'cairo'; setMoving(null); setAlt(null); setReport(g.ferry(to)); if (to === 'giza' && onDistrict) onDistrict(); else setPanel(to); }} data-testid="ferry">Nile ferry · £0.01</button>
            )}
            {alt.train && <button className="btn" onClick={() => { setMoving(null); start(true, alt); }} data-testid="train">Train · {fmt(alt.train.fare)}</button>}
            {alt.ships.map((r) => <button key={r.to} className="btn sail-btn" onClick={() => { setMoving(null); startSea(r, 'ship', alt.from); }} data-testid="ship">⚓ Ship · {fmt(r.fare)}</button>)}
          </div>
        )}
        {moving ? null : plan ? (
          plan.path ? (
            <div className="wc-col">
              <div className="wc-main">
                <b>{plan.settlement ? plan.settlement.name : isExplored(w.fog, plan.to) ? 'Open country' : 'Unexplored land'}</b>
                <span>
                  {plan.days < 0.1 ? 'A short walk' : `On foot: ${plan.days.toFixed(1)} days at ${milesPerDay(sp.pxPerDay)} mi a day`}{groundLine(plan.path)} · needs {Math.ceil(Math.max(1, plan.days) * dailyFood(w.party))} rations{foodDaysLeft(w.party) < plan.days ? ' · not enough food' : ''}
                </span>
                {(() => {
                  // what the walk leaves for the way home, and a job there that needs a rug packed here
                  const need = Math.ceil(Math.max(1, plan.days) * dailyFood(w.party)), left = w.party.food - need;
                  const job = w.at === 'giza' && plan.settlement ? openJobs(g.jobsDone, g.reputation).find((j) => j.target === plan.settlement!.id && j.need?.packedTier) : undefined;
                  const tier = job?.need?.packedTier ?? 0;
                  const unpacked = job && !g.inventory.some((i) => !i.stored && (RUGS[i.typeId]?.tier ?? 1) >= tier);
                  const lines = [
                    plan.days >= 1 && left >= 0 && left < need ? (left === 0 ? 'You would arrive with no food for the way back.' : `You would arrive with only ${left} ration${left === 1 ? '' : 's'} for the way back.`) : '',
                    unpacked ? `${job!.title} needs a ${['', 'rug', 'Fine rug', 'Exceptional rug', 'Legendary rug'][tier]} packed for the road. Pack it in Stock before you leave: rugs can only be packed at your Giza stall.` : '',
                  ].filter(Boolean);
                  return lines.length ? <span className="warn" data-testid="plan-warn">{lines.join(' ')}</span> : null;
                })()}
              </div>
              <div className="wc-btns">
                {((w.at === 'giza' && plan.settlement?.id === 'cairo') || (w.at === 'cairo' && plan.settlement?.id === 'giza')) ? (
                  <button className="btn primary sail-btn faster" onClick={() => { const to = plan.settlement!.id as 'giza' | 'cairo'; setReport(g.ferry(to)); setPlan(null); if (to === 'giza' && onDistrict) onDistrict(); else setPanel(to); }} data-testid="ferry">⛴ Nile ferry · £0.01 · 1½ h · fastest way there</button>
                ) : (
                  <button className="btn primary" onClick={() => start(false)} data-testid="travel">Travel</button>
                )}
                {((w.at === 'giza' && plan.settlement?.id === 'cairo') || (w.at === 'cairo' && plan.settlement?.id === 'giza')) && (
                  <button className="btn" onClick={() => start(false)} data-testid="travel">Walk instead · {plan.days.toFixed(1)} d</button>
                )}
                {plan.train && <button className="btn" onClick={() => start(true)} data-testid="train">Train · {fmt(plan.train.fare)} · {arrivalLabel(plan.train.days)}</button>}
                {plan.ships.map((r) => (
                  <button key={r.to} className={`btn sail-btn${r.days < plan.days ? ' faster' : ''}`} onClick={() => startSea(r, 'ship', plan.from)} data-testid="ship">⚓ Ship · {fmt(r.fare)} · {r.days} d{r.days < plan.days ? ' · fastest way there' : ''}</button>
                ))}
                {plan.motor.map((r) => (
                  <button key={r.to} className={`btn sail-btn${r.days < plan.days ? ' faster' : ''}`} onClick={() => startSea(r, 'motor', plan.from)} data-testid="motor">🚚 Nairn motor car · {fmt(r.fare)} · {r.days} d{r.days < plan.days ? ' · fastest way there' : ''}</button>
                ))}
                <button className="btn" onClick={() => setPlan(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="wc-row">
              <div className="wc-main">
                <b>{plan.settlement ? plan.settlement.name : terrainAt(plan.to) === 'mountains' ? 'Mountains' : 'Open water'}</b>
                <span>{plan.ships.length || plan.train ? 'Not reachable on foot from here.' : plan.settlement ? 'Not reachable on foot. Go to a port or a railway station.' : terrainAt(plan.to) === 'mountains' ? 'No caravan can cross these mountains. Follow a road through the passes.' : 'You cannot walk on water. Find a port and take a ship.'}</span>
              </div>
              {plan.train && <button className="btn primary" onClick={() => start(true)}>Train · {fmt(plan.train.fare)}</button>}
              {plan.ships.map((r) => (
                <button key={r.to} className="btn primary sail-btn" data-testid="ship" onClick={() => startSea(r, 'ship', plan.from)}>⚓ Ship · {fmt(r.fare)}</button>
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
          onResume={(dest) => { setCamp(null); const st = settlementById(dest); planTo(st, st); }}
        />
      )}
      {encounter && encounter.kind === 'raiders' && (
        <Ambush
          party={encounter}
          onDone={(msg) => { setReport(msg); setEncounter(null); }}
          onTurnBack={() => { setMoving(null); setEncounter(null); }}
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
            setMoving(null);
            setEncounter(null);
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
      {panel && panel === w.at && <SettlementPanel id={panel} tab={panel === openPanel ? openTab : undefined} onClose={() => setPanel(null)} onStall={onStall} />}
    </div>
  );
}

function EncounterCard({ party, onDone, onTurnBack }: { party: Party; onDone: (m: string) => void; onTurnBack: () => void }) {
  const g = useGame();
  const [msg, setMsg] = useState('');
  const mine = strength(g.world.party);
  const men = Object.entries(g.world.party.troops).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${n > 1 ? TROOPS[id].plural.toLowerCase() : TROOPS[id].name.toLowerCase()}`).join(', ');
  const text = useMemo(() => {
    switch (party.kind) {
      case 'caravan': return `A string of camels comes over the rise: the ${party.name.toLowerCase()}. The caravan master raises a hand in greeting.`;
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
