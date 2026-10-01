// A standalone preview of Malek's grill for review before merging: the real shop, store and save
// (same rules, same localStorage key as the game, version 19), with a few test controls the game
// itself does not have: set the hour, go to the next day (the game's own night rollover), add money,
// and reset. Built by vite.preview.config.ts into dist-preview/.
import { StrictMode, Suspense, lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGame, clock } from '../src/game/state/store';
import { fmt } from '../src/game/economy/money';
import { malekItem } from '../src/data/malekMenu';
import { MALEK_START, STORY, TAB_PLATES, fedOf, storyReady, waterOf, wellFedNow } from '../src/game/systems/malek';
import '../src/styles.css';
import './malek-preview.css';

const MalekShop = lazy(() => import('../src/components/Malek/MalekShop'));

function setup() {
  const g = useGame.getState();
  if (!g.started || g.world.at !== 'giza') {
    useGame.setState({ started: true, openingSeen: true, tutorial: { ...g.tutorial, done: true, step: 'done' }, cash: Math.max(g.cash, 500), world: { ...g.world, at: 'giza', hour: 12.5 } });
  }
}

function Preview() {
  const g = useGame();
  const [inside, setInside] = useState(false);
  const setHour = (h: number) => useGame.setState({ world: { ...useGame.getState().world, hour: h } });
  const now = g.day * 24 + g.world.hour;
  const c = g.condition;
  const st = g.malek?.story;
  return (
    <div className="mp">
      <header>
        <h1>Malek's grill · preview</h1>
        <p>The real shop from the branch <code>claude/migrate-game-artifact-82ytiq</code>. It saves in this browser like the game does.</p>
      </header>
      <section className="mp-state" data-testid="mp-state">
        <div><b>Day {g.day}</b> · {clock(g.world.hour)} · {fmt(g.cash)}</div>
        <div>Fed {fedOf(c)}/100 · Water {waterOf(c)}/100 · Fatigue {c?.fatigue ?? 0}{wellFedNow(c, now) ? ` · Well fed +${wellFedNow(c, now) * 2} patience` : ''}</div>
        <div>Parcels: {(g.parcels ?? []).length ? (g.parcels ?? []).map((p) => `${malekItem(p.item).name} (${p.servings}, until day ${p.spoilsDay})`).join('; ') : 'none'}</div>
        <div>Visits to Malek: {g.malek?.visits ?? 0}{g.malek?.lastScene ? ` · last picture: ${g.malek.lastScene}` : ''}{g.malek?.rug ? ` · your rug is on his floor · tab: ${g.malek.tab ?? 0} plates` : ''}</div>
        <div>Story: {storyReady() ? `next stage ${st?.nextStage ?? 1}` : `off: stages ${STORY.filter((s) => !s.art).map((s) => s.n).join(', ')} have no art yet`}</div>
      </section>
      <button className="btn primary big" onClick={() => setInside(true)} data-testid="mp-enter">Walk into Malek's</button>
      <section className="mp-controls">
        <p>Test controls (not in the game):</p>
        <div className="mp-row">
          <button className="btn" onClick={() => setHour(6)}>06:00 closed</button>
          <button className="btn" onClick={() => setHour(8.5)}>08:30 morning</button>
          <button className="btn" onClick={() => setHour(13)}>13:00 midday</button>
          <button className="btn" onClick={() => setHour(17.5)}>17:30</button>
          <button className="btn" onClick={() => setHour(20.5)}>20:30 cold grill</button>
        </div>
        <div className="mp-row">
          <button className="btn" onClick={() => { useGame.getState().endDay(); setHour(12.5); }} data-testid="mp-next-day">Next day (the game's night rollover)</button>
          <button className="btn" onClick={() => useGame.setState({ cash: useGame.getState().cash + 500 })}>Add £5</button>
          <button className="btn" onClick={() => { const s = useGame.getState(); const m = s.malek ?? MALEK_START; useGame.setState({ malek: { ...m, visits: Math.max(1, m.visits), stallLastDay: s.day, stallOutcome: 'sold', stallNoted: false, rug: s.inventory[0]?.typeId ?? 'desert-star', rugDay: s.day, tab: (m.tab ?? 0) + TAB_PLATES } }); }} data-testid="mp-sold-rug">Malek buys a rug at your stall</button>
          <button className="btn" onClick={() => { const s = useGame.getState(); useGame.setState({ condition: { ...(s.condition ?? { fatigue: 10, dependence: 0 }), fed: 5, fatigue: 55 } }); }}>Make me hungry and tired</button>
          <button className="btn" onClick={() => { try { localStorage.removeItem('threads-of-fortune-save'); } catch { /* private mode */ } location.reload(); }}>Reset</button>
        </div>
        <p className="mp-note">Drag to turn the room, pinch or scroll to zoom. Order, take parcels, then use Next day to see them age and the shop restock. In the game Malek comes to your stall on his own once you have eaten at his place; the rug button stands in for that visit here. Try Talk to Malek for his six topics.</p>
      </section>
      {inside && <Suspense fallback={<div className="malek-boot">Walking over to Malek's…</div>}><MalekShop onLeave={() => setInside(false)} /></Suspense>}
    </div>
  );
}

setup();
useGame.persist?.onFinishHydration?.(() => setup());
createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>);
