import type { Npc } from '../../data/world';
import { PortraitOrCameo } from '../People/Person';
import { personFor } from '../../data/people';

/** Round portrait of a townsperson: a painted portrait if one has been added, otherwise a silhouette cameo. */
export function Portrait({ id, look, accent, size = 64 }: { id: string; look: Npc['look']; accent: string; size?: number }) {
  return <PortraitOrCameo id={id} spec={personFor(id, look, accent)} size={size} />;
}
