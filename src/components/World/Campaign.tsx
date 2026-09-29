import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import { useGame, clock, arrivalAt } from '../../game/state/store';
import { BUYERS } from '../../data/buyers';
import { dateFor } from '../../game/economy/economy';
import { District } from './District';
import { WorldMap } from './WorldMap';
import { StallIdle } from '../StallEncounter/StallIdle';
import type { SetTab } from './Settlement';
import { audio } from '../../game/audio/engine';

/** Places a button can send you to: a screen, a town, or a yard in the district. */
export type Target = 'buyers' | 'paper' | 'radio' | 'supplier' | 'map' | 'district' | 'cairo' | 'auction' | 'animals' | 'guards' | 'alexandria' | (string & {});
export type MapIntent = { view?: 'district' | 'world'; panel?: string; tab?: SetTab; plan?: string; stall?: boolean; n: number };

// remembered between visits to other screens, so coming back finds you where you were
const memo = { layer: 'giza' as 'giza' | 'world', stall: false, scale: 1 };
export const openStallNext = () => { memo.layer = 'giza'; memo.stall = true; };

/** One continuous map: the region, zoom in to Giza's lanes, zoom in again to your stall. One clock runs through all of it. */
export function Campaign({ intent, frozen, onGo, clearIntent }: { intent?: MapIntent | null; frozen: boolean; onGo: (t: Target) => void; clearIntent?: () => void }) {
  const g = useGame();
  const at = g.world.at;
  const [layer, setLayerRaw] = useState<'giza' | 'world'>(() => {
    if (intent?.view === 'world' || at !== 'giza') return 'world';
    if (intent?.view === 'district') return 'giza';
    return memo.layer;
  });
  const [anim, setAnim] = useState<'in' | 'out' | null>(null);
  const [stall, setStallRaw] = useState(() => layer === 'giza' && (intent?.stall ?? (intent ? false : memo.stall)));
  const [scale, setScaleRaw] = useState(memo.scale);
  const setScale = (n: number) => { memo.scale = n; setScaleRaw(n); audio.sfx('tap'); };
  const setStall = (v: boolean) => { memo.stall = v; setStallRaw(v); };
  const setLayer = (l: 'giza' | 'world', a: 'in' | 'out') => { memo.layer = l; setAnim(a); setLayerRaw(l); if (l === 'world') setStall(false); audio.sfx('step'); };
  // the first look at the wider world counts as having opened the map
  useEffect(() => {
    if (layer !== 'world' || useGame.getState().onboard?.map) return;
    const t = setTimeout(() => useGame.setState({ onboard: { ...(useGame.getState().onboard ?? {}), map: true } }), 3000);
    return () => clearTimeout(t);
  }, [layer]);
  const hour = g.world.hour;
  // someone at the stall (or a sale you stepped away from) waits for you; nothing pulls you there
  const waiting = at === 'giza' && !g.encounter && !g.dayOver && !g.stallShut ? (g.held ? g.held.encounter.buyerId : g.visitIdx < g.queue.length && hour >= arrivalAt(g, g.visitIdx) ? g.queue[g.visitIdx] : null) : null;
  const night = hour >= 20 || hour < 5;
  const icon = night ? 'moon' : hour < 7 || hour >= 18 ? 'dawn' : 'sun';

  return (
    <div className="campaign" data-testid="campaign" data-layer={layer}>
      <div className={`campaign-layer ${anim ? `zoom-${anim}` : ''}`} key={layer} onAnimationEnd={() => setAnim(null)}>
        {layer === 'giza' ? (
          <District
            onStall={() => setStall(true)}
            onWorld={() => setLayer('world', 'out')}
            initialPanel={intent?.tab ?? null}
            onPanelClosed={clearIntent}
            frozen={frozen}
            onZoomOut={() => setLayer('world', 'out')}
            startZoomedOut={anim === 'in'}
          />
        ) : (
          <WorldMap
            key={`${intent?.panel ?? ''}-${intent?.plan ?? ''}`}
            onStall={() => { setLayer('giza', 'in'); setStall(true); }}
            onDistrict={() => setLayer('giza', 'in')}
            openPanel={intent?.panel}
            openTab={intent?.tab}
            planFor={intent?.plan}
            frozen={frozen}
            startZoom={anim === 'out' ? 4.3 : undefined}
            onZoomGiza={() => setLayer('giza', 'in')}
          />
        )}
      </div>
      {stall && layer === 'giza' && (
        <div className="stall-sheet" data-testid="stall-sheet">
          <div className="sheet-head"><b>Your stall</b><button className="sheet-x" onClick={() => setStall(false)} aria-label="Back to the lane" data-testid="stall-sheet-close"><Icon name="x" /></button></div>
          <div className="sheet-body"><StallIdle onGo={onGo} /></div>
        </div>
      )}
    </div>
  );
}
