// Dr Feras's medical book, set like a 1925 clinical handbook: a title page, a table of contents with
// dotted leaders, then one chapter per condition with a running head, a numbered plate and its caption,
// and the run-in headings of the period (Aetiology. Symptoms. Course. Prognosis. Treatment.). Each
// chapter ends with a short "note for the merchant" on what it does in the game.
import { useEffect, useRef, useState } from 'react';
import { DISEASES, type Disease, type Effects } from '../../game/systems/disease';
import './MedicalBook.css';

const ROMAN: [number, string][] = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export const roman = (n: number) => { let s = ''; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; };
const plate = (id: string) => `art/clinic/plates/${id}.webp`;
/** the book's order: diseases first, then injuries, as in the plates */
const ORDER = [...DISEASES.filter((d) => d.kind === 'disease'), ...DISEASES.filter((d) => d.kind === 'injury')];
export const chapterOf = (id: string) => ORDER.findIndex((d) => d.id === id) + 1;
/** each chapter is two pages in the printed book; the contents give where it starts */
const pageOf = (n: number) => 7 + (n - 1) * 2;

function prognosis(f: number): string {
  if (f <= 0) return 'Favourable. The condition is not in itself fatal.';
  const n = Math.max(2, Math.round(1 / f));
  if (f < 0.01) return `Favourable. Death is rare: perhaps one case in ${n.toLocaleString('en-GB')}.`;
  if (f < 0.05) return `Generally favourable, but about one case in ${n} ends fatally.`;
  if (f < 0.2) return `Guarded. About one case in ${n} ends in death, chiefly from complications.`;
  if (f < 0.5) return `Grave. Something like one patient in ${n} does not recover.`;
  return f >= 0.95 ? 'Hopeless once the signs are established. Prevention is everything.' : 'Very grave. More than half of those attacked die.';
}
const NOTES: [keyof Effects, (v: number) => string][] = [
  ['hours', (v) => `${v} hour${v === 1 ? '' : 's'} of the stall lost each day`],
  ['fatigue', (v) => `tiredness rises by ${v} a day`],
  ['focus', (v) => `${-v} less patience when haggling`],
  ['trust', (v) => `buyers trust you ${-v} less`],
  ['speed', (v) => `the caravan goes ${-v}% slower`],
  ['carry', (v) => `you carry ${-v}% less`],
  ['sight', (v) => `you judge a rug ${-v}% less well by eye`],
];
const merchantNote = (d: Disease) => NOTES.filter(([k]) => d.effects[k]).map(([k, f]) => f(d.effects[k]!));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Chapter({ d }: { d: Disease }) {
  const n = chapterOf(d.id);
  const [pic, setPic] = useState(true);
  const note = merchantNote(d);
  return (
    <article className="mb-page" data-testid={`book-page-${d.id}`}>
      <div className="mb-run"><span>{pageOf(n)}</span><span>{d.kind === 'injury' ? 'INJURIES' : 'DISEASES OF EGYPT AND THE LEVANT'}</span><span>{d.name.toUpperCase()}</span></div>
      <p className="mb-chap">CHAPTER {roman(n)}</p>
      <h3 className="mb-title">{d.name.toUpperCase()}</h3>
      {pic && (
        <figure className="mb-fig">
          <img src={plate(d.id)} alt="" onError={() => setPic(false)} />
          <figcaption><span className="sc">Plate {roman(n)}.</span> — {d.name}.</figcaption>
        </figure>
      )}
      <p className="mb-para"><span className="mb-h">Aetiology.</span> — {d.cause}</p>
      <p className="mb-para"><span className="mb-h">Symptoms.</span> — {d.symptom}</p>
      <p className="mb-para"><span className="mb-h">Course and Duration.</span> — {d.kind === 'injury' ? 'Recovery takes' : 'The illness runs'} from {d.days[0]} to {d.days[1]} days.</p>
      <p className="mb-para"><span className="mb-h">Prognosis.</span> — {prognosis(d.fatality)}</p>
      <p className="mb-para"><span className="mb-h">Treatment and Remarks.</span> — {d.doctor}</p>
      {note.length > 0 && <p className="mb-merchant"><span className="sc">Note for the merchant.</span> While it lasts: {note.map((x, i) => (i ? x : cap(x))).join('; ')}.</p>}
      <div className="mb-foot">{pageOf(n) + 1}</div>
    </article>
  );
}

function Contents({ onOpen }: { onOpen: (id: string) => void }) {
  const part = (kind: 'disease' | 'injury') => ORDER.filter((d) => d.kind === kind);
  return (
    <article className="mb-page mb-contents" data-testid="feras-book">
      <p className="mb-chap">CONTENTS</p>
      {(['disease', 'injury'] as const).map((k, pi) => (
        <section key={k}>
          <p className="mb-part">PART {roman(pi + 1)}. — {k === 'disease' ? 'DISEASES' : 'INJURIES'}</p>
          <ol className="mb-toc">
            {part(k).map((d) => {
              const n = chapterOf(d.id);
              return (
                <li key={d.id}>
                  <button onClick={() => onOpen(d.id)} data-testid={`book-${d.id}`}>
                    <span className="mb-num">{roman(n)}.</span><span className="mb-name">{d.name}</span><span className="mb-dots" /><span className="mb-pg">{pageOf(n)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </article>
  );
}

function TitlePage() {
  return (
    <article className="mb-page mb-titlepage">
      <p className="mb-tp-small">A HANDBOOK OF</p>
      <h2>THE DISEASES AND INJURIES<br />MET WITH IN EGYPT<br /><span>and</span> THE LEVANT</h2>
      <p className="mb-tp-small">FOR THE USE OF TRAVELLERS, MERCHANTS<br />AND THEIR MEN</p>
      <hr />
      <p className="mb-tp-by">BY</p>
      <p className="mb-tp-name">DR. FERAS</p>
      <p className="mb-tp-small">M.B., B.CH. (KASR EL-AINI)<br />PHYSICIAN, CAIRO</p>
      <p className="mb-tp-small">WITH FORTY-THREE PLATES</p>
      <hr />
      <p className="mb-tp-small">CAIRO<br />PRINTED FOR THE AUTHOR<br />1925</p>
    </article>
  );
}

/** the whole book: title page, contents, chapters; turn the pages or jump from the contents */
export function MedicalBook({ start }: { start?: string }) {
  // pages: 0 title, 1 contents, then one per chapter
  const [page, setPage] = useState(() => (start ? 1 + chapterOf(start) : 1));
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { top.current?.scrollIntoView({ block: 'nearest' }); }, [page]);
  const last = 1 + ORDER.length;
  const d = page >= 2 ? ORDER[page - 2] : null;
  return (
    <div className="mb" ref={top}>
      <div className="mb-nav">
        <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page" data-testid="book-prev">‹</button>
        <button className="btn small" onClick={() => setPage(1)} data-testid="book-back">Contents</button>
        <span className="mb-where">{page === 0 ? 'Title page' : page === 1 ? 'Contents' : `Chapter ${roman(page - 1)} of ${roman(ORDER.length)}`}</span>
        <button className="btn small" disabled={page === last} onClick={() => setPage(page + 1)} aria-label="Next page" data-testid="book-next">›</button>
      </div>
      {page === 0 ? <TitlePage /> : page === 1 ? <Contents onOpen={(id) => setPage(1 + chapterOf(id))} /> : <Chapter key={d!.id} d={d!} />}
    </div>
  );
}
