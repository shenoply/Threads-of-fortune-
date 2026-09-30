import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { audio } from '../../game/audio/engine';
import { RUGS } from '../../data/rugs';
import { LAB_SERVICES, conditionAfterCut, examineBlock, hasLooseThread, verdictWord, type LabFinding, type LabService } from '../../game/systems/arranLab';
import './ArranLab.css';

/**
 * Arran Embleton's textile laboratory, Giza 1925. A 2.5D room: the painted background, an HTML chalk
 * board on its blank slate, hotspots on the instruments, pointer parallax and a foreground light.
 * Arran's portrait lives in the lower panel, never in the room. Tests are paid once and kept in his
 * notebook; results come from the rug's hidden lab profile (src/game/systems/arranLab.ts).
 */
type Station = 'microscope' | 'dye' | 'balance' | 'notebook' | 'board';
type Topic = 'fibre' | 'indigo' | 'mineral';

// positions are percentages of the 1536×1024 room painting (13-lab-room); fx/fy is where the camera
// looks when the station is chosen (the board's dot sits on its frame so it never covers the chalk)
const STATIONS: Record<Station, { label: string; x: number; y: number; fx?: number; fy?: number; detail: string }> = {
  microscope: { label: 'Microscope', x: 57, y: 36.5, detail: 'One loose yarn under the lens. Wool, cotton and silk each look different; a mixture shows both.' },
  dye: { label: 'Dye cards', x: 78.5, y: 43, detail: 'A few fibres against his dye cards, or a damp cloth on the back to see whether a colour runs.' },
  balance: { label: 'Balance', x: 67.5, y: 36, detail: 'Weigh an antique in air and in water to estimate its density. Plating and hollow pieces can mislead it.' },
  notebook: { label: 'Notebook', x: 27.5, y: 43, detail: 'Every result he has written down for you, and the books he works from. Reading them again is free.' },
  board: { label: 'Board', x: 90.5, y: 31, fx: 75.5, fy: 20, detail: 'Arran explains the chemistry behind his tests.' },
};
const ORDER: Station[] = ['microscope', 'dye', 'balance', 'notebook', 'board'];

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

const SOURCES = [
  'J. Merritt Matthews, Laboratory Manual of Dyeing and Textile Chemistry (1909)',
  'Watson Smith, The Chemistry of Hat Manufacturing',
  'Michael Faraday, The Chemical History of a Candle (1861)',
  'Journal of the Society of Dyers and Colourists',
  'Proceedings of the Chemical Society of London',
];

const BASE = 'art/arran/';

export function ArranLab({ onLeave }: { onLeave: () => void }) {
  const g = useGame();
  const [door, setDoor] = useState(true);
  const [sel, setSel] = useState<Station | null>(null);
  const [topic, setTopic] = useState<Topic>('fibre');
  const [px, setPx] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<LabFinding | null>(null);
  const [ask, setAsk] = useState<{ uid: string; service: LabService } | null>(null);
  const [msg, setMsg] = useState('');
  const vp = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const findings = g.arranFindings ?? [];
  const first = !findings.length;

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

  // world transform: the room covers the viewport at 3:2; on a narrow screen it zooms in, and a
  // selected station pans to the middle. Board and hotspots are placed in room percentages inside
  // the same box, so they stay on the painting whatever the crop.
  const narrow = box.w > 0 && box.w < 700;
  const cover = Math.max(box.w / 1.5, box.h) || 1;
  const zoom = narrow ? (sel ? 1.55 : 1.2) : sel && sel !== 'notebook' ? 1.12 : 1;
  const H = cover * zoom, W = H * 1.5;
  const focus = sel ? { x: STATIONS[sel].fx ?? STATIONS[sel].x, y: STATIONS[sel].fy ?? STATIONS[sel].y } : { x: narrow ? 73 : 50, y: 30 };
  const clampX = (v: number) => Math.min(0, Math.max(box.w - W, v));
  const clampY = (v: number) => Math.min(0, Math.max(box.h - H, v));
  const ox = clampX(box.w / 2 - (focus.x / 100) * W);
  const oy = clampY(box.h * 0.45 - (focus.y / 100) * H);
  const world: CSSProperties = { width: W, height: H, transform: `translate(${ox + px.x * 8}px, ${oy + px.y * 5}px)`, ['--ww' as string]: `${W}px` };

  const pick = (s: Station) => { setSel(s); setView(null); setAsk(null); setMsg(''); audio.sfx('tap'); };
  const rugs = g.inventory.filter((i) => RUGS[i.typeId]);
  const run = (uid: string, service: LabService, cut = false) => {
    const r = useGame.getState().arranExamine(uid, service, cut);
    if (r.ok) { setView(r.finding); setAsk(null); setMsg(''); return; }
    if (r.needsCut) { setAsk({ uid, service }); setMsg(''); return; }
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
            <small>Giza · a first-floor room above the lane</small>
            <h2>Arran's laboratory</h2>
            <p>{first
              ? 'A young Englishman opens the door, a loupe still in one hand. "Arran Embleton. Textile chemist, late of the Yorkshire mills, now in Giza for the dyes. Bring me a loose thread and I will tell you what your rug is made of. I will not tell you what I cannot prove."'
              : '"Back again? Come in. I will put my coat on."'}</p>
            <div className="arran-btns">
              <button type="button" className="btn primary" onClick={() => { setDoor(false); audio.sfx('tap'); }} data-testid="arran-enter">Step inside</button>
              <button type="button" className="btn" onClick={onLeave} data-testid="arran-door-leave">Not now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const active = sel ? STATIONS[sel] : null;
  const portrait = sel === 'microscope' || sel === 'dye' || sel === 'balance' ? '11-lab-inspect' : '12-lab-explain';
  const services: LabService[] = sel === 'microscope' ? ['fibre'] : sel === 'dye' ? ['dye', 'fastness'] : [];
  const askItem = ask && g.inventory.find((i) => i.uid === ask.uid);

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
        <div className="arran-lab__world" style={world} data-testid="arran-world">
          <img className="arran-lab__room" src={`${BASE}13-lab-room.webp`} alt="A 1925 textile laboratory: a long workbench with a microscope, a balance, bottles and dye samples, and a blank slate board" draggable={false} />
          <div className="arran-lab__board" aria-label="Chemistry board" data-testid="arran-board">
            <b>{TOPICS[topic].title}</b>
            <span>{TOPICS[topic].formula}</span>
          </div>
          {ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`arran-lab__hotspot ${sel === id ? 'is-selected' : ''}`}
              style={{ left: `${STATIONS[id].x}%`, top: `${STATIONS[id].y}%` }}
              aria-label={`Examine ${STATIONS[id].label}`}
              onClick={() => pick(id)}
              data-testid={`arran-hot-${id}`}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="arran-lab__light" style={{ transform: `translate(${px.x * 22}px, ${px.y * 12}px)` }} aria-hidden="true" />
      </div>

      <nav className="arran-lab__stations" aria-label="Laboratory stations">
        {ORDER.map((id) => (
          <button key={id} type="button" className="btn" aria-pressed={sel === id} onClick={() => pick(id)} data-testid={`arran-st-${id}`}>{STATIONS[id].label}</button>
        ))}
      </nav>

      <div className={`arran-lab__panel ${sel ? '' : 'is-empty'}`} aria-live="polite" data-testid="arran-panel">
        {sel && <img className="arran-lab__portrait" src={`${BASE}${portrait}.webp`} alt="Arran Embleton in a plain laboratory coat" draggable={false} />}
        <div className="arran-lab__card">
          {!sel && (
            <>
              <h2>{first ? 'Where to begin' : 'The laboratory'}</h2>
              <p>Tap a station below, or a bright dot in the room. The microscope and the dye cards test your rugs; the board explains how the tests work.</p>
            </>
          )}

          {sel && active && !view && !ask && (
            <>
              <h2>{active.label}</h2>
              <p>{active.detail}</p>
              {msg && <p className="arran-msg" data-testid="arran-msg">{msg}</p>}

              {sel === 'board' && (
                <>
                  <div className="arran-lab__topics">
                    {(Object.keys(TOPICS) as Topic[]).map((id) => (
                      <button key={id} type="button" className="btn" aria-pressed={topic === id} onClick={() => setTopic(id)} data-testid={`arran-topic-${id}`}>{TOPICS[id].title}</button>
                    ))}
                  </div>
                  <p>{TOPICS[topic].explanation}</p>
                </>
              )}

              {sel === 'balance' && <p className="dim">"You have no brass, silver or gold antiques for me. A rug is no use on the balance." Metal antiques are not in the game yet.</p>}

              {sel === 'notebook' && (
                <>
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
                  <div className="section-label">HIS BOOKS</div>
                  <ul className="arran-sources">{SOURCES.map((s) => <li key={s}>{s}</li>)}</ul>
                </>
              )}

              {services.length > 0 && (
                <>
                  {!rugs.length && <p className="dim">You have no rugs to test.</p>}
                  <ul className="arran-list">
                    {rugs.map((i) => {
                      const t = RUGS[i.typeId]!;
                      const block = examineBlock(i, g.day);
                      return (
                        <li key={i.uid} className="arran-rug" data-testid={`arran-rug-${i.uid}`}>
                          <span>
                            <b>{t.name}</b>
                            <small>{i.condition}{i.stored ? ' · at the stall' : ' · packed'}{services.some((sv) => LAB_SERVICES[sv].needsThread) ? (hasLooseThread(i) ? ' · loose thread' : ' · no loose thread') : ''}</small>
                          </span>
                          <span className="arran-rug__btns">
                            {block ? <small className="dim">{block}</small> : services.map((sv) => {
                              const done = findings.find((f) => f.id === `${i.uid}:${sv}`);
                              return done ? (
                                <button key={sv} type="button" className="btn" onClick={() => setView(done)} data-testid={`arran-open-${sv}-${i.uid}`}>{sv === 'fastness' ? 'Rub' : sv === 'dye' ? 'Dyes' : 'Result'}: {verdictWord[done.verdict]}</button>
                              ) : (
                                <button key={sv} type="button" className="btn primary" onClick={() => run(i.uid, sv)} data-testid={`arran-test-${sv}-${i.uid}`}>{sv === 'fastness' ? 'Rub' : sv === 'dye' ? 'Dyes' : 'Fibre'} · {fmt(LAB_SERVICES[sv].price)}</button>
                              );
                            })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="dim small">{services.map((sv) => `${LAB_SERVICES[sv].label}: ${LAB_SERVICES[sv].blurb} About ${LAB_SERVICES[sv].minutes >= 60 ? `${LAB_SERVICES[sv].minutes / 60} hours` : `${LAB_SERVICES[sv].minutes} minutes`}.`).join(' ')}</p>
                </>
              )}
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
                <small>with the description "{view.claim}" · {view.confidence} · written on {view.day === g.day ? 'today' : `day ${view.day}`}{view.cut ? ' · sample cut' : ''}</small>
              </p>
              <ul>{view.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
              <div className="section-label">WHAT IT DOES NOT PROVE</div>
              <ul className="dim">{view.limitations.map((e) => <li key={e}>{e}</li>)}</ul>
              <button type="button" className="btn" onClick={() => setView(null)} data-testid="arran-back">Back</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
