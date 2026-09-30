import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dateFor } from '../../game/economy/economy';
import { BOOKS, BOOK_ORDER, LIBRARIES, bookPhase, hasDuplicate, type BookId } from '../../game/systems/arranBooks';
import { settlementById } from '../../game/systems/world';
import './ArranLab.css';

const ART = 'art/arran/';

/**
 * One of Arran's books, open on the table. The page art is blank on purpose: title, formula and text
 * are HTML. On a wide screen the text sits on the painted pages; on a phone it is a card below.
 */
export function BookReader({ id, onClose }: { id: BookId; onClose: () => void }) {
  const b = BOOKS[id];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const left = (
    <>
      <small className="book-imprint">{b.author} · {b.imprint}</small>
      <h3>{b.title}</h3>
      <p className="book-heading">{b.page.heading}</p>
      <p className="book-eq">{b.page.equation}</p>
    </>
  );
  const right = (
    <>
      <p><b>You need:</b> {b.page.material}.</p>
      <p>{b.page.body}</p>
      <p className="book-limit">{b.page.limit}</p>
    </>
  );
  return (
    <div className="book-reader" role="dialog" aria-label={`Reading ${b.title}`} data-testid="book-reader">
      <div className="book-reader__stage">
        <img src={`${ART}15-open-reference-book.webp`} alt="An open reference book with engraved fibre and dye illustrations in the margins" draggable={false} />
        <div className="book-page book-page--left">{left}</div>
        <div className="book-page book-page--right">{right}</div>
      </div>
      <div className="book-reader__card">{left}{right}</div>
      <button type="button" className="btn primary book-reader__close" onClick={onClose} data-testid="book-close">Close the book</button>
    </div>
  );
}

/** A library in a town: the reading room scene above, the catalogue and the librarian's options below. */
export function LibraryView({ town, onClose }: { town: string; onClose: () => void }) {
  const g = useGame();
  const lib = LIBRARIES[town];
  const [note, setNote] = useState('');
  const [read, setRead] = useState<BookId | null>(null);
  if (!lib) return null;
  const here = BOOK_ORDER.filter((id) => BOOKS[id].library === town);
  const papers = g.papers ?? [];
  const hh = Math.floor(g.world.hour), mm = Math.floor((g.world.hour % 1) * 60);
  const open = g.world.hour >= lib.open[0] && g.world.hour < lib.open[1];
  const wanted = here.filter((id) => ['requested', 'located', 'copy_acquired'].includes(bookPhase(g.arranBooks, id)));

  return (
    <section className="arran-lab library" aria-label={lib.name} data-testid="library">
      <header className="arran-lab__header">
        <div><strong>{lib.name}</strong><small>{dateFor(g.day).short} · {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')} · open {lib.open[0]}:00–{lib.open[1]}:00</small></div>
        <span className="arran-lab__cash">{fmt(g.cash)}</span>
        <button type="button" className="btn" onClick={onClose} data-testid="library-leave">Leave</button>
      </header>
      <div className="library__scene"><img src={`${ART}14-cairo-library.webp`} alt="A tall reading room with card catalogues, long tables and brass lamps" draggable={false} /></div>
      <div className="library__cards">
        <p className="dim">{lib.blurb}</p>
        {note && <p className="arran-msg" data-testid="library-note">{note}</p>}
        {!wanted.length && (
          <div className="library-card">
            <b>The librarian</b>
            <p>"Reference only, effendi. What are you looking for?" You have no errand here yet.{here.some((id) => bookPhase(g.arranBooks, id) === 'unknown') ? ' Arran, the chemist in Giza, may send you one day.' : ''}</p>
          </div>
        )}
        {wanted.map((id) => {
          const b = BOOKS[id];
          const ph = bookPhase(g.arranBooks, id);
          const st = g.arranBooks?.[id];
          const carried = papers.find((x) => x.id === st?.copyId);
          return (
            <div className="library-card" key={id} data-testid={`library-book-${id}`}>
              <b>{b.author}, <i>{b.title}</i></b>
              <small>For Arran · unlocks: {b.unlockLabel}</small>
              {ph === 'requested' && (
                <>
                  <p>The catalogue fills a wall of small drawers. The librarian points you to the technical section.</p>
                  <button type="button" className="btn primary" disabled={!open} onClick={() => setNote(g.librarySearch(id))} data-testid={`library-search-${id}`}>Search the catalogue · 20 min</button>
                </>
              )}
              {(ph === 'located' || (ph === 'copy_acquired' && !carried)) && (
                <>
                  <p>{ph === 'located' ? `Found: ${b.shelf}, ${b.imprint}.` : 'Your copy is gone. The library can make you another.'} The library's own copy may not leave the room.</p>
                  <div className="arran-btns">
                    <button type="button" className="btn" onClick={() => setNote('"Borrow it? No, effendi. It is a reference book; it stays in this room. The copyist can write out what you need."')} data-testid={`library-borrow-${id}`}>Borrow it</button>
                    <button type="button" className="btn primary" disabled={!open} onClick={() => setNote(g.libraryAcquire(id, 'copy'))} data-testid={`library-copy-${id}`}>{b.copy.label} · {fmt(b.copy.price)} · {b.copy.minutes / 60} h</button>
                    {hasDuplicate(id) && <button type="button" className="btn primary" disabled={!open} onClick={() => setNote(g.libraryAcquire(id, 'duplicate'))} data-testid={`library-dup-${id}`}>{b.duplicate.label} · {fmt(b.duplicate.price)}</button>}
                  </div>
                </>
              )}
              {ph === 'copy_acquired' && carried && (
                <>
                  <p className="fin-line ok">You carry {carried.kind === 'copy' ? 'the copied chapters' : 'the withdrawn duplicate'}. Take it to Arran in Giza.</p>
                  <button type="button" className="btn" onClick={() => setRead(id)} data-testid={`library-read-${id}`}>Read it</button>
                </>
              )}
            </div>
          );
        })}
        {!open && (() => {
          // closed: wait here for the doors, with the time it costs, rather than hunting for a clock
          const h = g.world.hour;
          const early = h < lib.open[0];
          const hours = early ? lib.open[0] - h : 24 - h + lib.open[0];
          const hm = `${Math.floor(hours)} h${Math.round((hours % 1) * 60) ? ` ${Math.round((hours % 1) * 60)} min` : ''}`;
          return (
            <div className="library-card library-wait" data-testid="library-closed">
              <p>Closed. {early ? `The doors open at ${lib.open[0]}:00.` : `Closed for the day at ${lib.open[1]}:00; open again tomorrow at ${lib.open[0]}:00.`}</p>
              <button type="button" className="btn primary" onClick={() => {
                if (early) g.passTime(hours * 60);
                else { const t = settlementById(lib.town); g.travelStep({ x: t.x, y: t.y }, hours / 24, true); g.arriveAt(lib.town); }
                setNote(early ? `You wait on the steps until ${lib.open[0]}:00.` : `You take a room nearby and come back at ${lib.open[0]}:00.`);
              }} data-testid="library-wait">{early ? `Wait until ${lib.open[0]}:00 · ${hm}` : `Rest until ${lib.open[0]}:00 tomorrow · ${hm}`}</button>
            </div>
          );
        })()}
      </div>
      {read && <BookReader id={read} onClose={() => setRead(null)} />}
    </section>
  );
}
