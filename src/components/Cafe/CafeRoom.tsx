// Inside Bilgin's coffee house: the room as a painting, seen whole (his counter, or the chess corner
// at the back; switch between them), with what you can do here underneath: talk to him, or sit down
// to chess or tawla.
import { useState } from 'react';
import './cafe.css';

type View = 'corner' | 'counter';
const IMG: Record<View, string> = { corner: 'art/cafe/bilgin-chess.webp', counter: 'art/cafe/bilgin-cafe-working.webp' };

export function CafeRoom({ onTalk, onPlay, onLeave, onFilm, note, onNote }: {
  onTalk: () => void; onPlay: (game: 'chess' | 'tawla') => void; onLeave: () => void; onFilm?: () => void; note?: string; onNote?: () => void;
}) {
  const [view, setView] = useState<View>('corner');
  return (
    <div className="cafe-room" data-testid="cafe-room" data-view={view}>
      <div className="cafe-room__head">
        <b>Bilgin's coffee house</b>
        {onFilm && <button className="btn small" onClick={onFilm} data-testid="abuhamid-film-again">▶ Film</button>}
        <button className="btn small" onClick={onLeave} data-testid="cafe-room-leave" aria-label="Leave">✕</button>
      </div>
      <div className="cafe-room__pic">
        <img className="cafe-room__bg" src={IMG[view]} alt="" aria-hidden="true" />
        <img className="cafe-room__img" src={IMG[view]} alt={view === 'corner' ? 'Bilgin at the chess table' : 'Bilgin at his counter'} />
        <button className="btn small cafe-room__view" onClick={() => setView(view === 'corner' ? 'counter' : 'corner')} data-testid="cafe-room-view">
          {view === 'corner' ? '☕ His counter' : '♞ The chess corner'}
        </button>
      </div>
      <div className="cafe-room__acts">
        <button className="btn cafe-act" onClick={() => onPlay('chess')} data-testid="cafe-play"><b>♞</b>Play chess</button>
        <button className="btn cafe-act" onClick={() => onPlay('tawla')} data-testid="cafe-play-tawla"><b>⚅</b>Play tawla</button>
        <button className="btn cafe-act" onClick={onTalk} data-testid="cafe-hot-bilgin"><b>☕</b>Talk to Bilgin</button>
      </div>
      {note && <div className="cafe-room__note" data-testid="cafe-room-note"><p>{note}</p><button className="btn small" onClick={onNote}>OK</button></div>}
    </div>
  );
}
