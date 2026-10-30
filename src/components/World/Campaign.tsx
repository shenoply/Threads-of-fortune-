import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useDialogEscape } from '../useDialogEscape';
import { Icon } from '../Icon';
import { useGame } from '../../game/state/store';
import { BUYERS } from '../../data/buyers';
import { dateFor } from '../../game/economy/economy';
import { District } from './District';
// the wider world (with its ambushes and battles) is a large part of the code and is not on screen on
// day one: it comes in its own file, fetched once the title is up (main.tsx), so it does not hold up the start
// Once it is in, the map is used directly (a lazy screen still waits a beat before showing, even when
// its file is already here).
let worldMapReady: (typeof import('./WorldMap'))['WorldMap'] | null = null;
export const loadWorldMap = () => import('./WorldMap').then((m) => { worldMapReady = m.WorldMap; return m; });
const LazyWorldMap = lazy(() => loadWorldMap().then((m) => ({ default: m.WorldMap })));
import { StallIdle } from '../StallEncounter/StallIdle';
import type { SetTab } from './Settlement';
import { audio } from '../../game/audio/engine';

/** Places a button can send you to: a screen, a town, or a yard in the district. */
export type Target = 'buyers' | 'paper' | 'radio' | 'supplier' | 'map' | 'district' | 'cairo' | 'auction' | 'animals' | 'guards' | 'alexandria' | (string & {});
export type MapIntent = { view?: 'district' | 'world'; panel?: string; tab?: SetTab; plan?: string; go?: boolean | 'train'; stall?: boolean; n: number };

// remembered between visits to other screens, so coming back finds you where you were
const memo = { layer: 'giza' as 'giza' | 'world', stall: false, scale: 1, intent: 0 };
export const openStallNext = () => { memo.layer = 'giza'; memo.stall = true; };

/** One continuous map: the region, zoom in to Giza's lanes, zoom in again to your stall. One clock runs through all of it. */
export function Campaign({ intent, frozen, onGo, clearIntent }: { intent?: MapIntent | null; frozen: boolean; onGo: (t: Target) => void; clearIntent?: () => void }) {
  const at = useGame((s) => s.world.at);
  // picked once, so the map is not drawn afresh when its file arrives part way through
  const [WorldMap] = useState(() => worldMapReady ?? LazyWorldMap);
  const [layer, setLayerRaw] = useState<'giza' | 'world'>(() => {
    if (intent?.view === 'world' || at !== 'giza') return 'world';
    if (intent?.view === 'district') return 'giza';
    return memo.layer;
  });
  const [anim, setAnim] = useState<'in' | 'out' | null>(null);
  // a request already acted on (the map shown again after another tab) is not a new one: the town you
  // were in (and its view) is kept rather than the old request's town and tab
  const [fresh] = useState(() => !!intent && intent.n > memo.intent);
  useEffect(() => { if (intent) memo.intent = Math.max(memo.intent, intent.n); }, [intent]);
  const [stall, setStallRaw] = useState(() => layer === 'giza' && (intent?.stall ?? (intent ? false : memo.stall)));
  const [scale, setScaleRaw] = useState(memo.scale);
  const setScale = (n: number) => { memo.scale = n; setScaleRaw(n); };
  const setStall = (v: boolean) => { memo.stall = v; setStallRaw(v); };
  const setLayer = (l: 'giza' | 'world', a: 'in' | 'out') => { memo.layer = l; setAnim(a); setLayerRaw(l); if (l === 'world') setStall(false); audio.sfx('step'); };
  // the first look at the wider world counts as having opened the map
  useEffect(() => {
    if (layer !== 'world' || useGame.getState().onboard?.map) return;
    const t = setTimeout(() => useGame.setState({ onboard: { ...(useGame.getState().onboard ?? {}), map: true } }), 1200);
    return () => clearTimeout(t);
  }, [layer]);
  // Escape and the phone's Back fold the stall sheet away, back to the lane
  const sheet = useRef<HTMLDivElement>(null);
  useDialogEscape(sheet, () => setStall(false), stall && layer === 'giza');

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
          <Suspense fallback={<div className="campaign-wait" data-testid="campaign-wait" />}>
          <WorldMap
            key={`${intent?.panel ?? ''}-${intent?.plan ?? ''}-${intent?.go ? intent.n : ''}`}
            onStall={() => { setLayer('giza', 'in'); setStall(true); }}
            onDistrict={() => setLayer('giza', 'in')}
            openPanel={intent?.panel}
            openTab={intent?.tab}
            planFor={intent?.plan}
            goFastest={intent?.go}
            resume={!fresh}
            frozen={frozen}
            startZoom={anim === 'out' ? 4.3 : undefined}
            // the speed (and a pause) is kept here, so it survives a trip to another screen and back
            scale={scale}
            setScale={setScale}
            onZoomGiza={() => setLayer('giza', 'in')}
          />
          </Suspense>
        )}
      </div>
      {stall && layer === 'giza' && (
        <div className="stall-sheet" role="dialog" aria-label="Your stall" data-testid="stall-sheet" ref={sheet}>
          <div className="sheet-head"><b>Your stall</b><button className="sheet-x" onClick={() => setStall(false)} aria-label="Back to the lane" data-testid="stall-sheet-close"><Icon name="x" /></button></div>
          <div className="sheet-body"><StallIdle onGo={onGo} /></div>
        </div>
      )}
    </div>
  );
}
