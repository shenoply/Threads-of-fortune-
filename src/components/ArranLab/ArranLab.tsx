import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { RUGS } from '../../data/rugs';
import { LAB_SERVICES, LAB_HOURS, conditionAfterCut, examineBlock, hasLooseThread, verdictWord, type LabFinding, type LabService } from '../../game/systems/arranLab';
import { BOOKS, BOOK_ORDER, LIBRARIES, bookPhase, serviceBook, type BookId } from '../../game/systems/arranBooks';
import { settlementById } from '../../game/systems/world';
import { BookReader } from './Library';
import { ArranCatalogue } from './ArranCatalogue';
import { ArranSubtitle, MummyStudy, labPortraitFor } from './ArranVoiceUI';
import { playArranVoice, preloadArranVoice, stopArranVoice, useSubtitle } from '../../game/audio/arranVoice';
import { ACTIVITY_SCENE, mummyPermitted, type ArranActivity } from '../../game/systems/arranVisits';
import './ArranLab.css';

/**
 * Arran Embleton's textile laboratory, Giza 1925. The painted room is a picture, not a control
 * panel: its labels light up on the instrument in use and the camera turns to it. Everything you do
 * happens in the panel below: pick a rug, then a test. Results come from the rug's hidden lab
 * profile (src/game/systems/arranLab.ts); books he asks for unlock his tests (arranBooks.ts).
 */
type Spot = 'microscope' | 'dye' | 'balance' | 'notebook' | 'board';
type Tab = 'test' | 'notebook' | 'board';
type Topic = 'fibre' | 'indigo' | 'mineral';

// positions are percentages of the 1536×1024 room painting (13-lab-room)
const SPOTS: Record<Spot, { label: string; x: number; y: number; fx: number; fy: number }> = {
  microscope: { label: 'Microscope', x: 57, y: 36.5, fx: 60, fy: 36 },
  dye: { label: 'Dye cards', x: 78.5, y: 43, fx: 74, fy: 38 },
  balance: { label: 'Balance', x: 67.5, y: 31, fx: 67.5, fy: 34 },
  notebook: { label: 'Notebook', x: 27.5, y: 43, fx: 30, fy: 40 },
  board: { label: 'Board', x: 75.5, y: 36, fx: 75.5, fy: 20 },
};
const SERVICE_SPOT: Record<LabService, Spot> = { fibre: 'microscope', dye: 'dye', fastness: 'dye', metal: 'balance' };
const TESTS: LabService[] = ['fibre', 'dye', 'fastness'];
const WHAT: Record<LabService, string> = {
  fibre: 'What it is made of: wool, cotton or silk',
  dye: 'Natural or synthetic dyes, against the stated age',
  fastness: 'Will a colour run if the rug is washed?',
  metal: '',
};

const TOPICS: Record<Topic, { title: string; formula: string; explanation: string }> = {
  fibre: {
    title: 'Wool and cotton',
    formula: 'Cotton cellulose: (C₆H₁₀O₅)ₙ',
    explanation: 'Wool is keratin, a protein; cellulose is the main polymer in cotton. Under the microscope wool shows scales and cotton a flat twisted ribbon. That tells you what a rug is made of. It does not tell you its date.',
  },
  indigo: {
    title: 'Indigo in the vat',
    formula: 'Leucoindigo + oxygen → blue indigo',
    explanation: 'This is a simplified oxidation: the yarn comes out of the vat yellow-green and turns blue in the air. Plant indigo and synthetic indigo give the same main pigment, so the colour alone does not prove where a rug comes from.',
  },
  mineral: {
    title: 'A carbonate sample',
    formula: 'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂ + H₂O',
    explanation: 'A tiny mineral sample fizzes in acid. Arran would never put acid on a valuable rug. This is a demonstration on chalk.',
  },
};

const BASE = 'art/arran/';
const hours = (m: number) => (m >= 60 ? `${m / 60} h` : `${m} min`);

export function ArranLab({ onLeave }: { onLeave: () => void }) {
  const g = useGame();
  const [door, setDoor] = useState(true);
  const [tab, setTab] = useState<Tab>('test');
  const [rugId, setRugId] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic>('fibre');
  const [spot, setSpot] = useState<Spot | null>(null);
  const [px, setPx] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<LabFinding | null>(null);
  const [ask, setAsk] = useState<{ uid: string; service: LabService } | null>(null);
  const [msg, setMsg] = useState('');
  const [speech, setSpeech] = useState('');
  const [read, setRead] = useState<BookId | null>(null);
  const [catalogue, setCatalogue] = useState(false);
  const [activity, setActivity] = useState<ArranActivity | null>(null);
  const [mummy, setMummy] = useState(false);
  const said = useSubtitle((s) => s.active);
  // leaving the lab silences him
  useEffect(() => () => stopArranVoice(), []);
  const vp = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const findings = g.arranFindings ?? [];
  const unlocked = g.labUnlocked ?? [];
  const first = !findings.length && !Object.keys(g.arranBooks ?? {}).length;
  const open = g.world.hour >= LAB_HOURS[0] && g.world.hour < LAB_HOURS[1];

  useLayoutEffect(() => {
    const el = vp.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [door]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onLeave(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLeave]);

  // camera: the room covers the viewport at 3:2 and turns to the instrument in use
  const narrow = box.w > 0 && box.w < 700;
  const cover = Math.max(box.w / 1.5, box.h) || 1;
  const zoom = narrow ? (spot ? 1.45 : 1.15) : spot && spot !== 'notebook' ? 1.12 : 1;
  const H = cover * zoom, W = H * 1.5;
  const focus = spot ? { x: SPOTS[spot].fx, y: SPOTS[spot].fy } : { x: narrow ? 64 : 50, y: 30 };
  const ox = Math.min(0, Math.max(box.w - W, box.w / 2 - (focus.x / 100) * W));
  const oy = Math.min(0, Math.max(box.h - H, box.h * 0.45 - (focus.y / 100) * H));
  const world: CSSProperties = { width: W, height: H, transform: `translate(${ox + px.x * 8}px, ${oy + px.y * 5}px)`, ['--ww' as string]: `${W}px` };

  const goTab = (t: Tab) => { setTab(t); setView(null); setAsk(null); setMsg(''); setSpot(t === 'board' ? 'board' : t === 'notebook' ? 'notebook' : null); audio.sfx('tap'); if (t === 'board' && tab !== 'board') playArranVoice('lab'); };
  const rugs = g.inventory.filter((i) => RUGS[i.typeId]);
  const rug = rugs.find((i) => i.uid === rugId) ?? null;
  // step inside: find him at today's activity; he greets you (this tap is the user gesture browsers want)
  const enter = () => {
    setDoor(false);
    audio.sfx('tap');
    preloadArranVoice();
    const act = g.arranEnterLab();
    setActivity(act);
    if (act === 'mummy_linen') { setMummy(true); return; }
    const sp = ACTIVITY_SCENE[act].spot;
    if (sp) setSpot(sp);
    playArranVoice('greeting');
  };
  // tapping Arran: something that fits what is on screen
  const talk = () => {
    const wantsMatthews = ['requested', 'located', 'copy_acquired'].includes(bookPhase(g.arranBooks, 'fibres'));
    playArranVoice(tab === 'notebook' && wantsMatthews ? { id: 'arran-books-01' } : tab === 'test' && rug ? 'rug-inspection' : 'lab');
  };
  const run = (uid: string, service: LabService, cut = false) => {
    setSpot(SERVICE_SPOT[service]);
    const r = useGame.getState().arranExamine(uid, service, cut);
    if (r.ok) { setView(r.finding); setAsk(null); setMsg(''); playArranVoice(r.finding.verdict === 'inconsistent' ? 'discovery' : 'reaction'); return; }
    if (r.needsCut) { setAsk({ uid, service }); setMsg(''); playArranVoice('warning'); return; }
    setMsg(r.message);
  };

  const hh = Math.floor(g.world.hour), mm = Math.floor((g.world.hour % 1) * 60);
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  if (door) {
    return (
      <div className="arran-lab arran-door" role="dialog" aria-label="Arran's laboratory door" data-testid="arran-door">
        <img className="arran-door__art" src={`${BASE}13-lab-room-sm.webp`} alt="" draggable={false} />
        <div className="arran-door__card">
          <img src={`${BASE}${first ? '02-surprise' : '10-listening'}.webp`} alt="Arran Embleton in shirt sleeves and a waistcoat" draggable={false} />
          <div>
            <small>Giza · a first-floor room above the lane · open {LAB_HOURS[0]}:00–{LAB_HOURS[1]}:00</small>
            <h2>Arran's laboratory</h2>
            <p>{!open
              ? 'The shutters are closed and the lamp is out. A card on the door: "Back at seven. A. E."'
              : first
                ? 'A young Englishman opens the door, a loupe still in one hand. "Arran Embleton. Textile chemist, late of the Yorkshire mills, now in Giza for the dyes. Bring me a rug and I will tell you what I can prove about it, and nothing I cannot."'
                : '"Back again? Come in. I will put my coat on."'}</p>
            <div className="arran-btns">
              {open && <button type="button" className="btn primary" onClick={enter} data-testid="arran-enter">Step inside</button>}
              <button type="button" className={`btn ${open ? '' : 'primary'}`} onClick={onLeave} data-testid="arran-door-leave">{open ? 'Not now' : 'Come back later'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const portrait = said?.npcId === 'arran' ? labPortraitFor(said.mood) : tab === 'test' && (view || ask || rug) ? '11-lab-inspect' : activity === 'microscope' && tab === 'test' ? '11-lab-inspect' : '12-lab-explain';
  const askItem = ask && g.inventory.find((i) => i.uid === ask.uid);
  const errands = BOOK_ORDER.filter((id) => bookPhase(g.arranBooks, id) !== 'unknown' && bookPhase(g.arranBooks, id) !== 'returned');

  // one test row: done → open the result; locked → the book he needs; otherwise run it
  const testButton = (i: (typeof rugs)[number], sv: LabService) => {
    const done = findings.find((f) => f.id === `${i.uid}:${sv}`);
    const svc = LAB_SERVICES[sv];
    const book = serviceBook(sv);
    const locked = !!book && !unlocked.includes(sv);
    return (
      <div className={`arran-test ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''}`} key={sv}>
        <div>
          <b>{svc.label}</b>
          <small>{locked ? `Needs his ${BOOKS[book!].title}` : WHAT[sv]}</small>
        </div>
        {done ? (
          <button type="button" className="btn" onClick={() => { setSpot(SERVICE_SPOT[sv]); setView(done); }} data-testid={`arran-open-${sv}-${i.uid}`}>
            <em className={`v-${done.verdict}`}>{verdictWord[done.verdict]}</em> · read
          </button>
        ) : locked ? (
          <button type="button" className="btn" onClick={() => goTab('notebook')} data-testid={`arran-locked-${sv}-${i.uid}`}>The book</button>
        ) : (
          <button type="button" className="btn primary" onClick={() => run(i.uid, sv)} data-testid={`arran-test-${sv}-${i.uid}`}>{fmt(svc.price)} · {hours(svc.minutes)}</button>
        )}
      </div>
    );
  };

  return (
    <section className="arran-lab" aria-label="Arran's textile laboratory" data-testid="arran-lab">
      <header className="arran-lab__header">
        <div><strong>Arran's textile laboratory</strong><small>Giza · 1925 · {clock}</small></div>
        <span className="arran-lab__cash" data-testid="arran-cash">{fmt(g.cash)}</span>
        <button type="button" className="btn" onClick={() => { setCatalogue(true); audio.sfx('pen'); }} data-testid="arran-catalogue-open">Price book</button>
        <button type="button" className="btn" onClick={onLeave} data-testid="arran-leave">Leave</button>
      </header>

      <div
        className="arran-lab__viewport"
        ref={vp}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
          const r = e.currentTarget.getBoundingClientRect();
          setPx({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
        }}
        onPointerLeave={() => setPx({ x: 0, y: 0 })}
      >
        <div className="arran-lab__world" style={world} data-testid="arran-world">
          <img className="arran-lab__room" src={`${BASE}13-lab-room.webp`} alt="A 1925 textile laboratory: a long workbench with a microscope, a balance, bottles and dye samples, and a slate board" draggable={false} />
          <div className="arran-lab__board" aria-label="Chemistry board" data-testid="arran-board">
            <b>{TOPICS[topic].title}</b>
            <span>{TOPICS[topic].formula}</span>
          </div>
          {(['microscope', 'dye', 'balance', 'notebook'] as Spot[]).map((id) => (
            <span key={id} className={`arran-tag ${spot === id ? 'is-on' : ''}`} style={{ left: `${SPOTS[id].x}%`, top: `${SPOTS[id].y}%` }} aria-hidden="true" data-testid={`arran-tag-${id}`}>{SPOTS[id].label}</span>
          ))}
        </div>
        <div className="arran-lab__light" style={{ transform: `translate(${px.x * 22}px, ${px.y * 12}px)` }} aria-hidden="true" />
        <ArranSubtitle />
      </div>

      {activity && (
        <p className="arran-activity" data-testid="arran-activity" data-activity={activity}>
          {ACTIVITY_SCENE[activity].text}
          {activity === 'mummy_linen' || (g.arranVisit?.mummyIntroductionSeen && mummyPermitted(g.arranVisit, g.day)) ? <button type="button" className="linklike" onClick={() => setMummy(true)} data-testid="arran-mummy-open">{g.arranVisit?.mummyIntroductionSeen ? 'The linen study' : 'Join them'}</button> : null}
        </p>
      )}
      <nav className="arran-lab__tabs" role="tablist" aria-label="In the laboratory">
        {([['test', 'Test a rug'], ['notebook', errands.length ? `Notebook · ${errands.length}` : 'Notebook'], ['board', 'The board']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`arran-lab__tab ${tab === id ? 'is-on' : ''}`} onClick={() => goTab(id)} data-testid={`arran-tab-${id}`}>{label}</button>
        ))}
      </nav>

      <div className="arran-lab__panel" aria-live="polite" data-testid="arran-panel">
        <button type="button" className="arran-lab__talk" onClick={talk} aria-label="Talk to Arran" data-testid="arran-talk">
          <img className="arran-lab__portrait" src={`${BASE}${portrait}.webp`} alt="Arran Embleton in a plain laboratory coat" draggable={false} />
        </button>
        <div className="arran-lab__card">
          {msg && <p className="arran-msg" data-testid="arran-msg">{msg}</p>}

          {/* ---- test a rug: pick a rug, then a test ---- */}
          {tab === 'test' && !view && !ask && (
            <>
              {!rugs.length && <p>"Bring me a rug and I will see what it will tell us." You have no rugs.</p>}
              {!rug && <p className="dim small">What each test does and costs is in his <button type="button" className="linklike" onClick={() => setCatalogue(true)} data-testid="arran-catalogue-link">price book</button>.</p>}
              {rugs.length > 0 && <p className="arran-step">{rug ? `${RUGS[rug.typeId]!.name}: choose a test` : 'Choose a rug'}</p>}
              <div className="arran-rugs" role="listbox" aria-label="Your rugs">
                {rugs.map((i) => {
                  const t = RUGS[i.typeId]!;
                  const n = findings.filter((f) => f.subjectId === i.uid).length;
                  return (
                    <button key={i.uid} type="button" role="option" aria-selected={rugId === i.uid} className={`arran-rugcard ${rugId === i.uid ? 'is-on' : ''}`} onClick={() => { if (rugId !== i.uid) playArranVoice('rug-inspection'); setRugId(i.uid); setMsg(''); audio.sfx('tap'); }} data-testid={`arran-rug-${i.uid}`}>
                      <img src={t.art.kind === 'photo' ? t.art.src : ''} alt="" draggable={false} loading="lazy" />
                      <b>{t.name}</b>
                      <small>{i.condition}{n ? ` · ${n} tested` : ''}</small>
                    </button>
                  );
                })}
              </div>
              {rug && (() => {
                const block = examineBlock(rug, g.day);
                return (
                  <div className="arran-tests" data-testid="arran-tests">
                    <small className="dim">{RUGS[rug.typeId]!.material} · {RUGS[rug.typeId]!.age} · {hasLooseThread(rug) ? 'has a loose thread to sample' : 'no loose thread: a sample would need cutting'}</small>
                    {block ? <p className="dim">{block}</p> : TESTS.map((sv) => testButton(rug, sv))}
                  </div>
                );
              })()}
            </>
          )}

          {ask && askItem && (
            <div data-testid="arran-ask">
              <h2>Cut a sample?</h2>
              <p>"There is no loose thread on your {RUGS[askItem.typeId]?.name}. I can cut three knots from the back, where a buyer will never look. But a cut is a cut: a careful buyer will find it."</p>
              <p className="arran-msg">The rug goes from {askItem.condition} to {conditionAfterCut(askItem.condition)}. The test costs {fmt(LAB_SERVICES[ask.service].price)}.</p>
              <div className="arran-btns">
                <button type="button" className="btn primary" onClick={() => run(ask.uid, ask.service, true)} data-testid="arran-cut-yes">Cut and test</button>
                <button type="button" className="btn" onClick={() => setAsk(null)} data-testid="arran-cut-no">Leave the rug whole</button>
              </div>
            </div>
          )}

          {view && (
            <div className="arran-finding" data-testid="arran-finding">
              <h2>{LAB_SERVICES[view.service].label}</h2>
              <p className="arran-finding__head">
                <em className={`v-${view.verdict}`} data-testid="arran-verdict">{verdictWord[view.verdict]}</em>
                <small>with "{view.claim}" · {view.confidence}{view.cut ? ' · sample cut' : ''}</small>
              </p>
              <ul>{view.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              <div className="section-label">WHAT IT DOES NOT PROVE</div>
              <ul className="dim">{view.limitations.map((e) => <li key={e}>{e}</li>)}</ul>
              <button type="button" className="btn" onClick={() => { setView(null); setSpot(null); }} data-testid="arran-back">Back</button>
            </div>
          )}

          {/* ---- notebook: errands, results, books ---- */}
          {tab === 'notebook' && !view && (
            <>
              {speech && <p className="arran-say" data-testid="arran-say">{speech}</p>}
              <div className="section-label">BOOKS HE NEEDS</div>
              {BOOK_ORDER.map((id) => {
                const b = BOOKS[id];
                const ph = bookPhase(g.arranBooks, id);
                const st = g.arranBooks?.[id];
                const carried = (g.papers ?? []).find((x) => x.id === st?.copyId);
                const town = settlementById(LIBRARIES[b.library].town).name;
                return (
                  <div className={`arran-errand ph-${ph}`} key={id} data-testid={`arran-errand-${id}`}>
                    <div>
                      <b>{b.author}, <i>{b.title}</i></b>
                      <small>
                        {ph === 'unknown' && `For: ${b.unlockLabel.toLowerCase()}`}
                        {ph === 'requested' && `Find it in ${town}. ${b.hint}`}
                        {ph === 'located' && `Found in ${town}, ${b.shelf}. Get a copy you may keep.`}
                        {ph === 'copy_acquired' && (carried ? 'You have a copy. Give it to him.' : `Your copy is lost. The library in ${town} can make another.`)}
                        {ph === 'returned' && `On his shelf. Unlocked: ${b.unlockLabel.toLowerCase()}.`}
                      </small>
                    </div>
                    {ph === 'unknown' && <button type="button" className="btn primary" onClick={() => { g.arranRequestBook(id); setSpeech(b.ask); if (id === 'fibres') playArranVoice({ id: 'arran-books-01' }); }} data-testid={`arran-ask-${id}`}>Offer to fetch it</button>}
                    {ph === 'copy_acquired' && carried && <button type="button" className="btn primary" onClick={() => { const r = g.arranReturnBook(id); setSpeech(r.message); if (r.ok) playArranVoice({ id: 'arran-books-02' }); }} data-testid={`arran-return-${id}`}>Give him the copy</button>}
                    {ph === 'returned' && <button type="button" className="btn" onClick={() => setRead(id)} data-testid={`arran-read-${id}`}>Read</button>}
                  </div>
                );
              })}
              <div className="section-label">RESULTS</div>
              {!findings.length && <p className="dim">No results yet.</p>}
              <ul className="arran-list">
                {[...findings].reverse().map((f) => {
                  const it = g.inventory.find((i) => i.uid === f.subjectId);
                  return (
                    <li key={f.id}>
                      <button type="button" className="arran-row" onClick={() => setView(f)} data-testid={`arran-note-${f.id}`}>
                        <b>{it ? RUGS[it.typeId]?.name : 'A rug you no longer have'}</b>
                        <small>{LAB_SERVICES[f.service].label} · <em className={`v-${f.verdict}`}>{verdictWord[f.verdict]}</em></small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* ---- the board ---- */}
          {tab === 'board' && (
            <>
              <div className="arran-lab__topics">
                {(Object.keys(TOPICS) as Topic[]).map((id) => (
                  <button key={id} type="button" className="btn" aria-pressed={topic === id} onClick={() => setTopic(id)} data-testid={`arran-topic-${id}`}>{TOPICS[id].title}</button>
                ))}
              </div>
              <p>{TOPICS[topic].explanation}</p>
            </>
          )}
        </div>
      </div>
      {read && <BookReader id={read} onClose={() => setRead(null)} />}
      {mummy && <MummyStudy onClose={() => { setMummy(false); setActivity((a) => (a === 'mummy_linen' ? 'microscope' : a)); }} />}
      {catalogue && (
        <ArranCatalogue
          onClose={() => setCatalogue(false)}
          onService={(sv) => { setCatalogue(false); setTab('test'); setView(null); setAsk(null); setSpot(SERVICE_SPOT[sv]); setMsg(`${LAB_SERVICES[sv].label}: choose a rug below.`); }}
        />
      )}
    </section>
  );
}
