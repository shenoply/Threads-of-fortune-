// Inside Bilgin's coffee house, seen from straight above: the counter down the left wall, the tables,
// and at the back the raised corner with his chess table and the tawla table. Tap Bilgin to talk, or
// tap a table: the view drops down onto it and the game is played on that table.
import { useState } from 'react';
import './cafe.css';

type Pt = [number, number];
type Game = 'chess' | 'tawla';
const IMG = 'art/cafe/cafe-birdseye.webp';
/** where things are in the painting (percent across, percent down) */
export const CAFE_SPOTS = {
  bilgin: [52, 9] as Pt,
  chess: [51, 18] as Pt,
  tawla: [71, 22] as Pt,
  door: [50, 87] as Pt,
};

export function CafeRoom({ onTalk, onPlay, onLeave, onFilm, note, onNote }: {
  onTalk: () => void; onPlay: (game: Game) => void; onLeave: () => void; onFilm?: () => void; note?: string; onNote?: () => void;
}) {
  // the drop onto a table before its game opens
  const [zoom, setZoom] = useState<Game | null>(null);
  const play = (g: Game) => {
    if (zoom) return;
    setZoom(g);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => { onPlay(g); setZoom(null); }, reduce ? 0 : 650);
  };
  const at = (p: Pt) => ({ left: `${p[0]}%`, top: `${p[1]}%` });
  const z = zoom ? CAFE_SPOTS[zoom] : null;
  return (
    <div className="cafe-room" data-testid="cafe-room">
      <div className="cafe-room__head">
        <b>Bilgin's coffee house</b>
        {onFilm && <button className="btn small" onClick={onFilm} data-testid="abuhamid-film-again">▶ Film</button>}
        <button className="btn small" onClick={onLeave} data-testid="cafe-room-leave" aria-label="Leave">✕</button>
      </div>
      <div className="cafe-room__pic">
        <img className="cafe-room__bg" src={IMG} alt="" aria-hidden="true" />
        <div className={`cafe-room__map${z ? ' is-zooming' : ''}`} style={z ? { transformOrigin: `${z[0]}% ${z[1]}%` } : undefined}>
          <img src={IMG} alt="Bilgin's coffee house from above" draggable={false} />
          <button className="cafe-spot" style={at(CAFE_SPOTS.bilgin)} onClick={onTalk} data-testid="cafe-spot-bilgin"><span>Talk to Bilgin</span></button>
          <button className="cafe-spot is-main" style={at(CAFE_SPOTS.chess)} onClick={() => play('chess')} data-testid="cafe-spot-chess"><span>Chess</span></button>
          <button className="cafe-spot" style={at(CAFE_SPOTS.tawla)} onClick={() => play('tawla')} data-testid="cafe-spot-tawla"><span>Tawla</span></button>
          <button className="cafe-spot" style={at(CAFE_SPOTS.door)} onClick={onLeave} data-testid="cafe-spot-door"><span>Way out</span></button>
        </div>
      </div>
      <div className="cafe-room__acts">
        <button className="btn cafe-act" onClick={() => play('chess')} data-testid="cafe-play"><b>♞</b>Play chess</button>
        <button className="btn cafe-act" onClick={() => play('tawla')} data-testid="cafe-play-tawla"><b>⚅</b>Play tawla</button>
        <button className="btn cafe-act" onClick={onTalk} data-testid="cafe-hot-bilgin"><b>☕</b>Talk to Bilgin</button>
      </div>
      {note && <div className="cafe-room__note" data-testid="cafe-room-note"><p>{note}</p><button className="btn small" onClick={onNote}>OK</button></div>}
    </div>
  );
}
