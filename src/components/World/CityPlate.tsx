// A city seen from the world map: zoom in on a town that has a painted street map and the painting
// opens out of its dot, with every place you can go in under its sign, before you have set foot in
// it. "Look at <town>" opens the whole painting over the map, to read it at leisure.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { VENUE_W, VENUE_H, type Venue, type VenuePoi } from '../../data/venues';
import './cityplate.css';

const BASE = import.meta.env.BASE_URL;
/** the places worth a pin on the map: everything you can go into, not the notes */
const shownPois = (def: Venue) => def.pois.filter((p) => p.kind === 'goto' || p.kind === 'audience' || (p.kind === 'exit' && /station/i.test(p.name)));

function Pin({ p, labels, on, onTap }: { p: VenuePoi; labels: boolean; on?: boolean; onTap?: () => void }) {
  const style = { left: `${(p.x / VENUE_W) * 100}%`, top: `${(p.y / VENUE_H) * 100}%` };
  const body = p.sign
    ? <i className={`cp-sign sign-${p.sign.shape}`} style={{ background: p.sign.color }}>{p.sign.mark}</i>
    : <i className="cp-sign cp-dot">{p.kind === 'exit' ? '⇣' : p.glyph}</i>;
  return onTap
    ? <button className={`cp-pin${on ? ' on' : ''}`} style={style} onClick={onTap} data-testid={`cp-pin-${p.id}`}>{body}{labels && <span>{p.name}</span>}</button>
    : <span className="cp-pin" style={style}>{body}{labels && <span>{p.name}</span>}</span>;
}

/** the painting on the world map, sized by the caller */
export function CityPlate({ def, width, dx = 0, dy = 0, onLook }: { def: Venue; width: number; dx?: number; dy?: number; onLook: () => void }) {
  const h = (width * VENUE_H) / VENUE_W;
  return (
    <div className="city-plate" style={{ width, height: h, marginLeft: -width / 2 + dx, marginTop: -h / 2 + dy }} data-testid={`city-plate-${def.settlement}`}>
      <img src={`${BASE}${def.map}`} alt="" draggable={false} />
      {shownPois(def).map((p) => <Pin key={p.id} p={p} labels={width >= 520} />)}
      <button className="cp-look" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onLook(); }} data-testid="city-plate-look">Look at {def.name} ›</button>
    </div>
  );
}

/** the whole painting over the map, every place under its sign; tap one to read what it is */
export function CityPreview({ def, here, onClose, onGo }: { def: Venue; here: boolean; onClose: () => void; onGo: () => void }) {
  const pois = shownPois(def);
  const [sel, setSel] = useState<string | null>(null);
  const p = pois.find((x) => x.id === sel);
  return createPortal(
    <div className="overlay city-preview" role="dialog" aria-label={`${def.name} from above`} data-testid="city-preview">
      <div className="overlay-head">
        <h2>{def.name}</h2>
        <span className="sub">{def.where}</span>
        <button className="btn close" onClick={onClose} data-testid="city-preview-close">Back to the map</button>
      </div>
      <div className="cpv-body">
        <div className="cpv-map">
          <img src={`${BASE}${def.map}`} alt={`Map of ${def.name}`} draggable={false} />
          {pois.map((x) => <Pin key={x.id} p={x} labels={x.id === sel} on={x.id === sel} onTap={() => setSel(x.id === sel ? null : x.id)} />)}
        </div>
        <p className="cpv-note" data-testid="city-preview-note">{p ? <><b>{p.name}</b> · {p.sub}</> : def.history}</p>
        <div className="cpv-list">
          {pois.map((x) => (
            <button key={x.id} className={`cpv-row${x.id === sel ? ' on' : ''}`} onClick={() => setSel(x.id)}>
              {x.sign ? <i className={`cp-sign sign-${x.sign.shape}`} style={{ background: x.sign.color }}>{x.sign.mark}</i> : <i className="cp-sign cp-dot">{x.kind === 'exit' ? '⇣' : x.glyph}</i>}
              <span><b>{x.name}</b><small>{x.sub}</small></span>
            </button>
          ))}
        </div>
        <div className="cpv-doors">
          <button className="btn primary" onClick={onGo} data-testid="city-preview-go">{here ? `Enter ${def.name}` : `Travel to ${def.name}`}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
