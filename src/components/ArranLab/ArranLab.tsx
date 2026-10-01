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
import { RoadPanel } from './RoadPanel';
import { pickArranScene, type ScenePick } from '../../game/systems/arranScenes';
import { ErrandCard } from './ErrandCard';
import './ArranLab.css';

/**
 * Arran Embleton's textile laboratory, Giza 1925. The painted room is a picture, not a control
 * panel: its labels light up on the instrument in use and the camera turns to it. Everything you do
 * happens in the panel below: pick a rug, then a test. Results come from the rug's hidden lab
 * profile (src/game/systems/arranLab.ts); books he asks for unlock his tests (arranBooks.ts).
 */
type Spot = 'microscope' | 'dye' | 'balance' | 'notebook' | 'board';
type Tab = 'test' | 'notebook' | 'road' | 'board';
type Topic = 'fibre' | 'indigo' | 'mineral';

// positions are percentages of the 1536×1024 room painting (13-lab-room)
const SPOTS: Record<Spot, { label: string; x: number; y: number; fx: number; fy: number }> = {
  microscope: { label: 'Microscope', x: 57, y: 36.5, fx: 60, fy: 36 },
  dye: { label: 'Dye cards', x: 78.5, y: 43, fx: 74, fy: 38 },
  balance: { label: 'Balance', x: 67.5, y: 31, fx: 67.5, fy: 34 },
  notebook: { label: 'Notebook', x: 27.5, y: 43, fx: 30, fy: 40 },
  board: { label: 'Board', x: 75.5, y: 36, fx: 75.5, fy: 20 },
};
const SERVICE_SPOT: Record<LabService, Spot> = { fibre: 'microscope', dye: 'dye', fastness: 'dye', wash: 'dye', metal: 'balance', provisions: 'notebook', cargo: 'balance' };
const TESTS: LabService[] = ['fibre', 'dye', 'fastness', 'wash'];
const WHAT: Record<LabService, string> = {
  fibre: 'What it is made of: wool, cotton or silk',
  dye: 'Natural or synthetic dyes, against the stated age',
  fastness: 'Does colour come off on a damp cloth? Nothing is cut.',
  wash: 'Does the colour run when a sample is washed?',
  metal: '',
  provisions: '',
  cargo: '',
};
// which station Arran is working at (x: percent across the 1536×1024 room, for station plates)
const FIGURE: Record<'microscope' | 'dye' | 'desk' | 'cabinet' | 'board', { x: number; caption: string }> = {
  microscope: { x: 47, caption: 'At the microscope' },
  dye: { x: 70, caption: 'At the dye bench' },
  desk: { x: 30, caption: 'At his desk' },
  cabinet: { x: 88, caption: 'At the cabinet' },
  board: { x: 66, caption: 'At the board' },
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
  const [confirm, setConfirm] = useState<{ uid: string; service: LabService } | null>(null);
  const [msg, setMsg] = useState('');
  const [speech, setSpeech] = useState('');
  const [read, setRead] = useState<BookId | null>(null);
  const [catalogue, setCatalogue] = useState(false);
  const [activity, setActivity] = useState<ArranActivity | null>(null);
  const [mummy, setMummy] = useState(false);
  // this visit's scene: a picture and Arran's opening line, until you look around the lab
  const [scene, setScene] = useState<ScenePick | null>(null);
  const [sceneAsk, setSceneAsk] = useState(false);
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

  const goTab = (t: Tab) => { setScene(null); setTab(t); setView(null); setAsk(null); setConfirm(null); setMsg(''); setSpot(t === 'board' ? 'board' : t === 'notebook' ? 'notebook' : null); audio.sfx('tap'); if (t === 'board' && tab !== 'board') playArranVoice('lab'); };
  const rugs = g.inventory.filter((i) => RUGS[i.typeId]);
  const rug = rugs.find((i) => i.uid === rugId) ?? null;
  // step inside: find him at today's activity; he greets you (this tap is the user gesture browsers want)
  const enter = () => {
    setDoor(false);
    audio.sfx('tap');
    preloadArranVoice();
    const act = g.arranEnterLab();
    setActivity(act);
    // the linen study announces itself on the desk; it never opens over the lab by itself
    const sp = ACTIVITY_SCENE[act].spot;
    if (sp) setSpot(sp);
    // one scene per visit, chosen from what is really going on; its line is his greeting
    const st = useGame.getState();
    const pick = pickArranScene({ ...st, hour: st.world.hour });
    setScene(pick); setSceneAsk(false);
    playArranVoice({ id: `arran-scene-${String(pick.scene.n).padStart(2, '0')}`, noSubtitle: true });
  };
  const leaveScene = () => { setScene(null); setSceneAsk(false); stopArranVoice(); };
  // tapping Arran: something that fits what is on screen
  const talk = () => {
    const wantsMatthews = ['requested', 'located', 'copy_acquired'].includes(bookPhase(g.arranBooks, 'fibres'));
    playArranVoice(tab === 'notebook' && wantsMatthews ? { id: 'arran-books-01' } : tab === 'test' && rug ? 'rug-inspection' : 'lab');
  };
  const run = (uid: string, service: LabService, cut = false) => {
    setSpot(SERVICE_SPOT[service]);
    const r = useGame.getState().arranExamine(uid, service, cut);
    setConfirm(null);
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

  const askItem = ask && g.inventory.find((i) => i.uid === ask.uid);
  // Arran in the room: where he stands follows the instrument in use, else today's activity
  // where he stands and what the line under the room says follow the task you chose; the entrance
  // activity only describes the room until you pick something
  const busy = tab === 'test' && !!(view || ask || confirm);
  const place: keyof typeof FIGURE = tab === 'notebook' ? 'desk' : tab === 'road' ? 'cabinet' : tab === 'board' ? 'board'
    : spot === 'microscope' || spot === 'balance' ? 'microscope' : spot === 'dye' ? 'dye' : spot === 'notebook' ? 'desk'
    : activity === 'dye_notes' ? 'dye' : activity === 'books' || activity === 'provisions' || activity === 'mummy_linen' ? 'desk' : 'microscope';
  const pose = said?.npcId === 'arran' ? labPortraitFor(said.mood) : busy || (tab === 'test' && rug) ? '11-lab-inspect' : '12-lab-explain';
  const sceneLine = tab === 'notebook' ? 'Arran pulls his notebook across the desk to go through your errands with you.'
    : tab === 'road' ? 'Arran unlocks the cabinet by the door and opens his order book.'
    : tab === 'board' ? 'Arran picks up the chalk.'
    : busy ? (confirm ? `Arran waits for your answer before he starts: ${LAB_SERVICES[confirm.service].label.toLowerCase()}.` : view ? 'Arran writes the result into his notebook.' : 'Arran turns the rug over and looks for a loose thread.')
    : rug ? `Arran looks over your ${RUGS[rug.typeId]!.name}.`
    : activity ? ACTIVITY_SCENE[activity].text : '';
  const figCaption = FIGURE[place].caption;
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
          <button type="button" className="btn primary" onClick={() => { setConfirm({ uid: i.uid, service: sv }); setSpot(SERVICE_SPOT[sv]); setMsg(''); audio.sfx('tap'); }} data-testid={`arran-test-${sv}-${i.uid}`}>{fmt(svc.price)} · {hours(svc.minutes)}</button>
        )}
      </div>
    );
  };

  return (
    <section className="arran-lab" aria-label="Arran's textile laboratory" data-testid="arran-lab">
      <header className="arran-lab__header">
        <div><strong>Arran's textile laboratory</strong><small>Giza · 1925 · {clock}</small></div>
        <span className="arran-lab__cash" data-testid="arran-cash">{fmt(g.cash)}</span>
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
        {scene && (
          <img className="arran-scene" src={scene.scene.img ?? `${BASE}13-lab-room.webp`} alt={`Arran: ${scene.scene.title}`} draggable={false} data-testid="arran-scene" data-scene={scene.scene.n} />
        )}
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
        {/* Arran as a framed portrait, not a cut-out in the room: the painted bench stands against the
            wall, so there is nowhere in the painting a waist-up figure could stand. Replace with room
            plates that have him painted in at each station when that art arrives. */}
        <button type="button" className="arran-figure" onClick={talk} aria-label="Talk to Arran" data-testid="arran-talk" data-place={place} data-pose={pose}>
          <span className="arran-figure__frame"><img src={`${BASE}${pose}.webp`} alt="Arran Embleton in a laboratory coat" draggable={false} /></span>
          <span className="arran-figure__cap">{figCaption}</span>
        </button>
        <div className="arran-lab__light" style={{ transform: `translate(${px.x * 22}px, ${px.y * 12}px)` }} aria-hidden="true" />
        <ArranSubtitle />
      </div>

      {sceneLine && !scene && (
        <p className="arran-activity" data-testid="arran-activity" data-activity={activity ?? ''}>
          {sceneLine}
        </p>
      )}
      {mummyPermitted(g.arranVisit, g.day) && scene?.scene.n !== 7 && (
        <button type="button" className="arran-casefile" onClick={() => setMummy(true)} data-testid="arran-mummy-open">
          <b>{g.arranVisit?.mummyIntroductionSeen ? 'Case file: the museum linen thread' : 'New case file: the museum linen thread'}</b>
          <small>{g.arranVisit?.mummyIntroductionSeen ? 'Read the study again' : 'Hamza Effendi has brought one detached thread. Open when you are ready.'}</small>
        </button>
      )}
      <nav className="arran-lab__tabs" role="tablist" aria-label="In the laboratory">
        {([['test', 'Test a rug'], ['notebook', errands.length ? `Notebook · ${errands.length}` : 'Notebook'], ['road', 'Supplies'], ['board', 'Board']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`arran-lab__tab ${tab === id ? 'is-on' : ''}`} onClick={() => goTab(id)} data-testid={`arran-tab-${id}`}>{label}</button>
        ))}
        <button type="button" className="arran-lab__tab arran-lab__tab--book" onClick={() => { setCatalogue(true); audio.sfx('pen'); }} data-testid="arran-catalogue-open">
          <img src="art/arran/cat/fibre.webp" alt="" aria-hidden="true" />Catalogue
        </button>
      </nav>

      <div className="arran-lab__panel" aria-live="polite" data-testid="arran-panel">
        <div className="arran-lab__card">
          {scene && (
            <div className="arran-scene-talk" data-testid="arran-scene-talk" data-reason={scene.reason}>
              <p><b className="arran-scene-talk__who">Arran</b> {sceneAsk ? scene.scene.ask : `"${scene.scene.line}"`}</p>
              <div className="arran-btns">
                {scene.book && g.arranBooks?.[scene.book]?.phase === 'copy_acquired' && (
                  <button type="button" className="btn primary" onClick={() => { const r = g.arranReturnBook(scene.book!); leaveScene(); setTab('notebook'); setSpeech(r.message); if (r.ok) playArranVoice({ id: 'arran-books-02' }); }} data-testid="arran-scene-give">Give him the copy</button>
                )}
                {scene.scene.n === 7 && <button type="button" className="btn primary" onClick={() => { leaveScene(); setMummy(true); }} data-testid="arran-scene-case">Open the case file</button>}
                {(scene.scene.n === 5 || scene.scene.n === 8) && <button type="button" className="btn primary" onClick={() => goTab('notebook')} data-testid="arran-scene-route">The route and your food</button>}
                {scene.scene.n === 9 && <button type="button" className="btn primary" onClick={() => goTab('road')} data-testid="arran-scene-papers">Papers and patrols</button>}
                {!sceneAsk && <button type="button" className="btn" onClick={() => { setSceneAsk(true); audio.sfx('tap'); playArranVoice({ id: `arran-scene-${String(scene.scene.n).padStart(2, '0')}-ask`, noSubtitle: true }); }} data-testid="arran-scene-ask">Ask Arran about it</button>}
                <button type="button" className="btn" onClick={() => { leaveScene(); audio.sfx('tap'); }} data-testid="arran-scene-leave">Look around the lab</button>
              </div>
            </div>
          )}
          {msg && <p className="arran-msg" data-testid="arran-msg">{msg}</p>}

          {/* ---- test a rug: pick a rug, then a test ---- */}
          {tab === 'test' && !view && !ask && !confirm && (
            <>
              {!rugs.length && <p>"Bring me a rug and I will see what it will tell us." You have no rugs.</p>}
              {!rug && (
                <button type="button" className="arran-bookcard" onClick={() => { setCatalogue(true); audio.sfx('pen'); }} data-testid="arran-catalogue-link">
                  <img src="art/arran/cat/microscope.webp" alt="" aria-hidden="true" />
                  <span><b>The Embleton Catalogue</b><small>Every test and service, signed reports, instruments, remedies and supplies, and the books he wants, each with its price</small></span>
                  <i aria-hidden="true">Open ›</i>
                </button>
              )}
              {!rug && (
                <button type="button" className="arran-bookcard" onClick={() => goTab('road')} data-testid="arran-cabinet-link">
                  <img src="art/arran/cat/vat.webp" alt="" aria-hidden="true" />
                  <span><b>Arran's cabinet</b><small>Tonics, a poison for moth, and powder goods through licensed men: rockets, cartridges, a revolver, a blasting charge</small></span>
                  <i aria-hidden="true">Supplies ›</i>
                </button>
              )}
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

          {confirm && (() => {
            const it = g.inventory.find((i) => i.uid === confirm.uid);
            if (!it) return null;
            const svc = LAB_SERVICES[confirm.service];
            const cut = svc.needsThread && !hasLooseThread(it);
            const short = g.cash < svc.price;
            const t = g.world.hour + svc.minutes / 60;
            const lateOk = t <= LAB_HOURS[1];
            return (
              <div className="arran-confirm" data-testid="arran-confirm">
                <h2>{svc.label}: {RUGS[it.typeId]!.name}</h2>
                <p className="arran-confirm__q">{svc.question}</p>
                <dl>
                  <dt>Cost</dt><dd data-testid="arran-confirm-cost">{fmt(svc.price)} <small>(you have {fmt(g.cash)})</small></dd>
                  <dt>Time</dt><dd>{hours(svc.minutes)}, done about {String(Math.floor(t)).padStart(2, '0')}:{String(Math.floor((t % 1) * 60)).padStart(2, '0')}</dd>
                  <dt>Uses up</dt><dd data-testid="arran-confirm-uses">{cut ? `No loose thread: three knots cut from the back. The rug goes from ${it.condition} to ${conditionAfterCut(it.condition)}.` : svc.consumes}</dd>
                  <dt>Can tell you</dt><dd>{svc.can}</dd>
                  <dt>Cannot tell you</dt><dd>{svc.cannot}</dd>
                </dl>
                <div className="arran-btns">
                  <button type="button" className="btn primary" disabled={short || !lateOk} onClick={() => run(confirm.uid, confirm.service, cut)} data-testid="arran-confirm-pay">{short ? 'Not enough money' : !lateOk ? 'Too late today' : cut ? `Cut and pay ${fmt(svc.price)}` : `Pay ${fmt(svc.price)}`}</button>
                  <button type="button" className="btn" onClick={() => { setConfirm(null); setSpot(null); }} data-testid="arran-confirm-cancel">Not now</button>
                </div>
              </div>
            );
          })()}

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
              {(() => {
                const card = (id: BookId) => (
                  <ErrandCard key={id} id={id}
                    onAsk={() => { g.arranRequestBook(id); setSpeech(BOOKS[id].ask); if (id === 'fibres') playArranVoice({ id: 'arran-books-01' }); }}
                    onReturn={() => { const r = g.arranReturnBook(id); setSpeech(r.message); if (r.ok) playArranVoice({ id: 'arran-books-02' }); }}
                    onRead={() => setRead(id)} />
                );
                const active = BOOK_ORDER.filter((id) => !['unknown', 'returned'].includes(bookPhase(g.arranBooks, id)));
                const fresh = BOOK_ORDER.filter((id) => bookPhase(g.arranBooks, id) === 'unknown');
                const done = BOOK_ORDER.filter((id) => bookPhase(g.arranBooks, id) === 'returned');
                return (
                  <>
                    {active.map(card)}
                    {fresh.map((id) => (
                      <details key={id} className="errand-offer" data-testid={`errand-offer-${id}`}>
                        <summary><b>{BOOKS[id].author.split(',')[0]}</b>&nbsp;· {settlementById(LIBRARIES[BOOKS[id].library].town).name} · tap for the route</summary>
                        {card(id)}
                      </details>
                    ))}
                    {done.map(card)}
                  </>
                );
              })()}
              {g.arranVisit?.permitStage === 'letter' && <p className="arran-msg" data-testid="arran-letter-note">You carry Arran's letter to Hamza Effendi at the museum store in Cairo. Nothing is studied until he agrees.</p>}
              {g.arranVisit?.mummyIntroductionSeen && (
                <>
                  <div className="section-label">STUDIES</div>
                  <button type="button" className="arran-row" onClick={() => setMummy(true)} data-testid="arran-mummy-replay">
                    <b>A linen thread from the museum store</b>
                    <small>With Hamza Effendi's permission · one detached thread · replay</small>
                  </button>
                </>
              )}
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

          {tab === 'road' && !view && <RoadPanel onBook={() => goTab('notebook')} onSpot={(sp) => setSpot(sp)} />}

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
          onService={(sv) => { setCatalogue(false); if (sv === 'provisions' || sv === 'cargo') { goTab('road'); return; } setTab('test'); setView(null); setAsk(null); setSpot(SERVICE_SPOT[sv]); setMsg(`${LAB_SERVICES[sv].label}: choose a rug below.`); }}
        />
      )}
    </section>
  );
}
