// The chance to win a road fight (tactics.winChance), worked out without freezing the screen: in a Web Worker
// where there is one, otherwise a few runs at a time between frames. The same fight asked twice (the ambush
// card, then the deployment screen) is worked out once.
import { winChanceSteps, type Battle, type Style } from './tactics';

/** what decides the odds; the day's luck is left out because the runs spread it over its whole range */
const keyOf = (b: Battle, style: Style, runs: number) => JSON.stringify([
  style, runs, b.seed, b.field, b.turn, b.maxTurns, b.initiative, b.cmd, b.commanded, b.focus, b.holdLine, b.heroDown, b.leaderDown, b.over?.result, b.cells.join(''),
  b.squads.map((s) => [s.id, s.kind, s.side, s.n, s.per, s.hp, s.maxHp, s.x, s.y, s.morale, s.gone, s.moved, s.acted, s.held, s.hit]),
]);

const cache = new Map<string, Promise<number>>();
let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, (p: number) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./oddsWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; p: number }>) => { const f = waiting.get(e.data.id); waiting.delete(e.data.id); f?.(e.data.p); };
    worker.onerror = () => { worker = null; for (const [id, f] of waiting) { waiting.delete(id); f(-1); } };
  } catch { worker = null; }
  return worker;
}

/** on the page, a few runs per slice, giving the frame back in between */
function inSlices(b: Battle, style: Style, runs: number): Promise<number> {
  return new Promise((ok) => {
    const g = winChanceSteps(b, style, runs);
    const slice = () => {
      const t0 = performance.now();
      let r = g.next();
      while (!r.done && performance.now() - t0 < 8) r = g.next();
      if (r.done) ok(r.value); else setTimeout(slice, 0);
    };
    setTimeout(slice, 0);
  });
}

function viaWorker(b: Battle, style: Style, runs: number): Promise<number> {
  const w = getWorker();
  if (!w) return inSlices(b, style, runs);
  return new Promise<number>((ok) => {
    const id = nextId++;
    waiting.set(id, ok);
    try { w.postMessage({ id, b, style, runs }); } catch { waiting.delete(id); ok(-1); }
  }).then((p) => (p < 0 ? inSlices(b, style, runs) : p));
}

/** the chance to win, in percent, if the men fight it out from here (resolves later; never blocks the page) */
export function winChanceAsync(b: Battle, style: Style = 'steady', runs = 60): Promise<number> {
  const k = keyOf(b, style, runs);
  let p = cache.get(k);
  if (!p) {
    p = viaWorker(b, style, runs);
    cache.set(k, p);
    if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  }
  return p;
}
/** start the worker early (while the ambush card is drawn) so the first answer does not wait for it to load */
export const warmOdds = () => { getWorker(); };
