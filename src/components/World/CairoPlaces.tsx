import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { TONIC } from '../../game/systems/fieldwork';
import '../ArranLab/ArranLab.css';

/**
 * Two small Cairo places tied to Arran's side of the game: a chemist in the Muski who sells coca
 * wine over the counter (a stimulant: an alert day, then a crash, and a habit if you lean on it),
 * and the museum store where the conservator Hamza Effendi reads Arran's letter about the linen.
 */
export function CairoPlace({ place, onClose }: { place: 'chemist' | 'museum'; onClose: () => void }) {
  const g = useGame();
  const [note, setNote] = useState('');
  const stage = g.arranVisit?.permitStage;
  return (
    <section className="arran-lab library" aria-label={place === 'chemist' ? 'A chemist in the Muski' : 'The museum store'} data-testid={`cairo-${place}`}>
      <header className="arran-lab__header">
        <div><strong>{place === 'chemist' ? 'A chemist in the Muski' : 'The Egyptian Museum: conservation store'}</strong><small>Cairo · 1925</small></div>
        <span className="arran-lab__cash">{fmt(g.cash)}</span>
        <button type="button" className="btn" onClick={onClose} data-testid={`cairo-${place}-leave`}>Leave</button>
      </header>
      <div className="library__cards">
        {note && <p className="arran-msg" data-testid={`cairo-${place}-note`}>{note}</p>}
        {place === 'chemist' ? (
          <div className="library-card">
            <b>{TONIC.name}</b>
            <small>{fmt(TONIC.price)} a bottle · you have {g.tonics ?? 0}</small>
            <p>{TONIC.blurb}</p>
            <p className="dim">{TONIC.effect}</p>
            <div className="arran-btns">
              <button type="button" className="btn primary" onClick={() => setNote(g.buyTonic())} data-testid="cairo-buy-tonic">Buy a bottle · {fmt(TONIC.price)}</button>
              {(g.tonics ?? 0) > 0 && <button type="button" className="btn" onClick={() => setNote(g.takeTonic())} data-testid="cairo-take-tonic">Drink a glass</button>}
            </div>
            <p className="dim small">Behind the counter, locked: morphine, cocaine and laudanum, sold only against a doctor's prescription. "Not without the paper, effendi. Not since March."</p>
          </div>
        ) : (
          <div className="library-card">
            <b>Hamza Effendi, conservator</b>
            {stage === 'letter' ? (
              <>
                <p>A quiet man in a grey suit among shelves of numbered boxes. Arran's letter is in your pocket.</p>
                <button type="button" className="btn primary" onClick={() => setNote(g.deliverPermitLetter())} data-testid="cairo-deliver-letter">Give him Arran's letter</button>
              </>
            ) : stage === 'granted' ? (
              <p>"Tell Mr Embleton I will bring the thread myself. One thread, already detached. Nothing else."</p>
            ) : (
              <p>"The store is not open to visitors, effendi." Without an introduction there is nothing to do here.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
