// A khamsin over the scene: a yellow-brown haze and a slow drift of sand. Only on the days a khamsin
// blows over the town you stand in (calendar1925.ts); nothing to tap.
import './dust.css';
import { useGame } from '../../game/state/store';
import { dustToday } from '../../game/economy/seasons';

export function DustHaze() {
  const on = useGame((s) => { const e = dustToday(s.day); return !!e && !!s.world.at && !!e.dust?.includes(s.world.at); });
  if (!on) return null;
  return <div className="dust-haze" aria-hidden="true" data-testid="dust-haze"><i /></div>;
}
