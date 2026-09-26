import { useMemo } from 'react';
import { Icon } from '../Icon';
import { paperFor } from '../../game/economy/newspaper';
import { eventsStarting } from '../../game/economy/life';

/** Morning notes that the paper already reports. */
export const isEventNote = (note: string, day: number) => eventsStarting(day).some((e) => note.startsWith(`${e.name}.`));

/** The folded paper on the morning card: today's headline, tap to read. */
export function CourierTeaser({ day, onOpen }: { day: number; onOpen: () => void }) {
  const p = useMemo(() => paperFor(day), [day]);
  return (
    <button className="courier-teaser" onClick={onOpen} data-testid="courier-teaser">
      <span className="ico" aria-hidden><Icon name="news" /></span>
      <span><small>THE GIZA COURIER · {p.date.toUpperCase()}</small><b>{p.lead.headline}</b>{p.comingUp[0] && <small style={{ marginTop: 3 }}>Coming up: {p.comingUp[0].text}</small>}</span>
    </button>
  );
}
