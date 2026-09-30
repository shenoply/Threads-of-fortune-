import { useEffect, useRef, useState } from 'react';
import { PLAN_EVENT, planTrip } from './game/nav';
import { Newspaper } from './components/Newspaper/Newspaper';
import { Radio } from './components/Radio/Radio';
import { Gramophone } from './components/Radio/Gramophone';
import { eventsStarting, laneDay } from './game/economy/life';
import { CourierTeaser, isEventNote } from './components/Newspaper/CourierTeaser';
import { fmt } from './game/economy/money';
import { radio } from './game/radio/player';
import { START_WARDROBE, baseSrc, layerSrc, coverSrc, wornIds } from './data/wardrobe';
import { preload, buyerArt, STALL_ART } from './game/preload';
import { useGame, dateFor, clock } from './game/state/store';
import { StallIdle } from './components/StallEncounter/StallIdle';
import { audio, DEFAULT_VOLUMES, type Channel, type Volumes } from './game/audio/engine';
import { voice } from './game/audio/voice';
import { JOBS, GIVER_VOICE } from './data/jobs';
import { Icon } from './components/Icon';
import { StallEncounter } from './components/StallEncounter/StallEncounter';
import { Documentary, DayOneCard, introSeen, markIntroSeen } from './components/Documentary/Documentary';
import { Supplier } from './components/Supplier/Supplier';
import { Inventory } from './components/Inventory/Inventory';
import { Guide } from './components/Guide/Guide';
import { ObjectiveBar, SideTasks } from './components/Mission/Mission';
import { firstHourStep } from './components/Tips/FirstHour';
import { CaravanScreen } from './components/World/CaravanScreen';
import { Campaign, openStallNext, type MapIntent, type Target } from './components/World/Campaign';
import type { SetTab } from './components/World/Settlement';
import { Tip } from './components/Tips/Tip';
import { Rumours } from './components/Rumours/Rumours';
import { levelOf } from './data/character';
import { HeroHub } from './components/Hero/HeroHub';
import { Merchant, progressScore, type MerchantSub } from './components/Merchant/Merchant';
import { Calendar } from './components/Calendar/Calendar';
import { settlementById } from './game/systems/world';
import { RUGS } from './data/rugs';
import { rentFor } from './data/suppliers';
import { paintedMap } from './game/systems/mapRender';
import { Atmosphere } from './components/Atmosphere/Atmosphere';
import { preloadStall } from './components/StallEncounter/stallArt';
import { FinancePanel } from './components/World/Finance';
import { overdue } from './game/systems/finance';

type Tab = 'stall' | 'supplier' | 'inventory' | 'ledger' | 'map' | 'caravan' | 'hero';
type Phase = 'title' | 'documentary' | 'dayone' | 'game';

export default function App() {
  const g = useGame();
  // the save: zustand writes it to localStorage on every change; this is only so the player can see
  // that, keep a copy as a file, and bring a copy back
  const [savedAt, setSavedAt] = useState('');
  const [finance, setFinance] = useState(false);
  // money trouble shows in the top bar: an empty purse, a late bill, a loan past due, the creditors
  const inDebt = g.started && ((g.ruin?.stage ?? 0) > 0 || overdue(g.cash, g.bills?.due ?? 0, (g.bills?.due ?? 0) > 0 && g.day - (g.bills?.since ?? 0) >= 5, g.loans ?? [], g.day) > 0);
  useEffect(() => useGame.subscribe(() => setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))), []);
  const downloadSave = () => {
    const raw = localStorage.getItem('threads-of-fortune-save');
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `threads-of-fortune-day-${useGame.getState().day}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const loadSave = (f: File) => {
    f.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!d?.state || typeof d.state.day !== 'number') throw new Error('not a save');
        if (!window.confirm(`Load the save from day ${d.state.day}? Your current game will be replaced.`)) return;
        localStorage.setItem('threads-of-fortune-save', txt);
        window.location.reload();
      } catch { window.alert('That file is not a Threads of Fortune save.'); }
    });
  };
  // the stall, the merchant and the next few customers are fetched ahead, so nobody pops in late
  useEffect(() => { if (g.started) preloadStall(g.queue.slice(g.visitIdx, g.visitIdx + 3)); }, [g.started, g.queue, g.visitIdx]);
  const [phase, setPhase] = useState<Phase>('title');
  // the map is home; the stall screen is only for a sale in progress and for the first day's lesson
  const [tab, setTab] = useState<Tab>('map');
  const [settings, setSettings] = useState(false);
  const [msub, setMsub] = useState<MerchantSub>('customers');
  const [guide, setGuide] = useState(false);
  const [cal, setCal] = useState(false);
  const [toastMsg, setToast] = useState('');
  const [paper, setPaperRaw] = useState<number | null>(null);
  const setPaper = (d: number | null) => { setPaperRaw(d); if (d !== null && !useGame.getState().onboard?.news) useGame.setState({ onboard: { ...(useGame.getState().onboard ?? {}), news: true } }); };
  const openPaper = () => { const st = useGame.getState(); setPaper(st.day); if ((st.paperSeen ?? 0) < st.day) { useGame.setState({ paperSeen: st.day }); st.passTime(15); } };
  const [radioOpen, setRadioOpen] = useState(false);
  const [gramophoneOpen, setGramophoneOpen] = useState(false);
  const [mapIntent, setMapIntent] = useState<MapIntent | null>(null);
  // the map clock stops while you read, listen, or look at a menu
  const frozen = radioOpen || gramophoneOpen || paper !== null || settings || cal || guide || g.dayOver;
  const mapGo = (m: Omit<MapIntent, 'n'>) => { setMapIntent({ ...m, n: Date.now() }); setTab('map'); };
  // a deep screen (Arran's notebook, an errand card) asks for a route to a town: show the map with it planned
  useEffect(() => {
    const on = (e: Event) => { const t = (e as CustomEvent<string>).detail; if (t) mapGo(useGame.getState().world.at === t ? (t === 'giza' ? { view: 'district' } : { view: 'world', panel: t, tab: 'town' }) : { view: 'world', plan: t }); };
    window.addEventListener(PLAN_EVENT, on);
    return () => window.removeEventListener(PLAN_EVENT, on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /** Take the player straight to what a chapter step, or a stall button, asks for. */
  const chapterGo = (t: Target) => {
    const at = useGame.getState().world.at;
    audio.sfx('tap');
    switch (t) {
      case 'buyers': setMsub('customers'); setTab('ledger'); break;
      case 'paper': openPaper(); break;
      case 'radio': setRadioOpen(true); break;
      case 'supplier': setTab('supplier'); break;
      case 'map': mapGo({ view: 'world' }); break;
      case 'district': mapGo(at === 'giza' ? { view: 'district' } : { view: 'world', plan: 'giza' }); break;
      case 'cairo': mapGo(at === 'cairo' ? { view: 'world', panel: 'cairo' } : { view: 'world', plan: 'cairo' }); break;
      case 'auction': mapGo(at === 'cairo' ? { view: 'world', panel: 'cairo' } : { view: 'world', plan: 'cairo' }); break;
      case 'alexandria': mapGo(at === 'alexandria' ? { view: 'world', panel: 'alexandria' } : { view: 'world', plan: 'alexandria' }); break;
      case 'animals': case 'guards': { const tab = t as 'animals' | 'guards'; mapGo(at === 'giza' ? { view: 'district', tab } : at ? { view: 'world', panel: at, tab } : { view: 'world' }); break; }
      // any other target is a settlement id (a mission's, job's or visitor's town, e.g. 'suez',
      // 'damascus', 'tanta') that has no special screen of its own: open the world map and plan a
      // route there, the same way the Objectives panel's own "Show" button does.
      default: mapGo(at === t ? { view: 'world', panel: t } : { view: 'world', plan: t }); break;
    }
  };
  const [confirmReset, setConfirmReset] = useState(false);
  const toastTimer = useRef<number>();
  const toast = (m: string) => {
    if (!m) return;
    setToast(m);
    window.clearTimeout(toastTimer.current);
    // a sale the player did not choose (a visitor buying a rug they packed days ago) is easy to miss
    // if it flashes by at the usual reading pace, so it gets extra time on screen
    const money = /\bbuys? your\b|\bbuys? the\b/.test(m);
    toastTimer.current = window.setTimeout(() => setToast(''), Math.max(money ? 5000 : 2600, m.length * (money ? 85 : 55)));
  };
  const tutorialActive = !g.tutorial.done;
  // the first-day tour points at the button to press next
  const tourStep = g.tutorial.done ? (['buyers', 'news', 'radio', 'rashid', 'map'] as const).find((k) => !g.onboard?.[k]) : undefined;
  const tourNav: Record<string, string> = { buyers: 'ledger', rashid: 'supplier', map: 'map' };
  useEffect(() => {
    audio.setScene(tab === 'map' ? 'road' : 'market');
  }, [tab, g.world.at]);
  useEffect(() => {
    audio.setClock(g.world.hour, g.dayOver);
  }, [g.world.hour, g.dayOver]);
  useEffect(() => { audio.setLane(laneDay(g.day).level); }, [g.day]);
  // other screens can ask for the paper or the radio
  useEffect(() => {
    const p = () => { const st = useGame.getState(); setPaper(st.day); if ((st.paperSeen ?? 0) < st.day) useGame.setState({ paperSeen: st.day }); };
    const r = () => setRadioOpen(true);
    const gr = () => setGramophoneOpen(true);
    window.addEventListener('tof:paper', p); window.addEventListener('tof:radio', r); window.addEventListener('tof:gramophone', gr);
    return () => { window.removeEventListener('tof:paper', p); window.removeEventListener('tof:radio', r); window.removeEventListener('tof:gramophone', gr); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // map jobs speak up when you arrive
  useEffect(() => {
    if (!g.jobNote) return;
    toast(g.jobNote);
    // the giver speaks the job's 'done' line, when they have a voice
    const job = JOBS.find((j) => GIVER_VOICE[j.giver] && g.jobNote!.startsWith('Job done:') && g.jobNote!.endsWith(j.done));
    if (job) voice.whenReady(GIVER_VOICE[job.giver]).then(() => voice.say(GIVER_VOICE[job.giver], job.done));
    useGame.setState({ jobNote: undefined });
  }, [g.jobNote]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new day brings a new paper: shout the headline if something happened
  const lastDay = useRef(g.day);
  useEffect(() => {
    if (g.day === lastDay.current) return;
    lastDay.current = g.day;
    const big = eventsStarting(g.day)[0];
    void big; // the paper button glows; no shouting
  }, [g.day]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    audio.setToggles(g.settings);
    audio.setVolumes({ ...DEFAULT_VOLUMES, ...(g.volumes ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a customer reached the stall while you were on the map: the sale opens. This overrides
  // whatever the player just tapped (Map, another tab), which otherwise looks like the button
  // silently did nothing; the customer walking up in the stall scene says why, without a pop-up over it.
  useEffect(() => {
    if (phase === 'game' && g.encounter && !g.encounter.venue && tab === 'map' && g.world.at === 'giza') {
      setTab('stall');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.encounter, tab, phase]);
  // Resume a saved game: bring the next buyer in.
  useEffect(() => {
    // at the stall, a customer who has arrived walks straight up; otherwise the stall waits
    if (phase === 'game' && g.started && !g.encounter && !g.dayOver && g.world.at === 'giza' && (tab === 'stall' || tab === 'map') && !frozen) {
      // the stall day ends at eight in the evening, not when the last customer has been
      if (g.world.hour >= 20) useGame.setState({ dayOver: true });
      // a customer who arrives waits at the stall; you choose when to serve them
    }
    // a sale is over: back to the lane, with the stall open
    if (phase === 'game' && tab === 'stall' && g.tutorial.done && !g.encounter && !g.dayOver) { if (!g.held) openStallNext(); setTab('map'); }
  }, [phase, g.started, g.encounter, g.dayOver, g.visitIdx, g.queue.length, g, tab, g.world.hour]); // eslint-disable-line react-hooks/exhaustive-deps

  // the hero as he is dressed now, ready before the wardrobe or a mirror shows him
  useEffect(() => {
    if (phase !== 'game') return;
    const o = (g.wardrobe ?? START_WARDROBE).outfit;
    preload([baseSrc('wardrobe'), ...wornIds(o).map((id) => layerSrc('wardrobe', id)), ...(o.outer ? [coverSrc('wardrobe', o.outer)] : [])]);
  }, [phase, g.wardrobe]);

  // the wireless stays at the stall: leaving Giza switches it off
  useEffect(() => { if (g.world.at !== 'giza') radio.stop(); }, [g.world.at]);

  // today's customers: fetch their pictures before they walk up, the next one first
  useEffect(() => {
    if (phase !== 'game') return;
    preload(STALL_ART, true);
    const coming = g.queue.slice(g.visitIdx);
    preload(coming.slice(0, 1).flatMap(buyerArt), true);
    preload(coming.slice(1).flatMap(buyerArt));
  }, [phase, g.day, g.visitIdx, g.queue]);

  const enterGame = () => {
    audio.ensure();
    // warm the cache for the paintings shown first, so nothing pops in; a city's painting loads when you go there
    preload([...STALL_ART, ...g.queue.slice(g.visitIdx).flatMap(buyerArt)], true);
    voice.load().then(() => voice.preload(['seller', 'samira'])); // a 4 KB read each: lines are fetched one by one
    paintedMap(); // start loading the travel map so the World tab opens on it
    if (g.settings.ambience) audio.startAmbience();
    if (g.settings.music) setTimeout(() => audio.startMusic('stall'), 4000);
    setPhase('game');
    setTab('map');
  };

  const date = dateFor(g.day);
  const [cashFlash, setCashFlash] = useState(false);
  const prevCash = useRef(g.cash);
  useEffect(() => {
    if (g.cash !== prevCash.current) {
      setCashFlash(true);
      const t = setTimeout(() => setCashFlash(false), 900);
      prevCash.current = g.cash;
      return () => clearTimeout(t);
    }
  }, [g.cash]);

  if (phase === 'documentary') return <Documentary canSkip onEnd={() => { markIntroSeen(); setPhase('dayone'); }} />;
  if (phase === 'dayone')
    return (
      <DayOneCard
        onBegin={() => {
          g.beginDayOne();
          enterGame();
          setMapIntent({ view: 'district', stall: true, n: Date.now() });
          setTab('map');
        }}
      />
    );
  if (phase === 'title') {
    return (
      <div className="title-screen" data-testid="title">
        <div className="bg" style={{ backgroundImage: 'url(art/stall-seller.jpg)' }} />
        <Atmosphere hour={17.4} />
        <div className="title-card">
          <div className="eyebrow">GIZA · 1925</div>
          <h1>Threads of Fortune</h1>
          <div className="tag">A small stall. A wider world.</div>
          {g.started && (
            <div className="whatsnew" data-testid="whatsnew">
              <b>New · Royal courts</b>
              <span>Sell to King Fuad at Abdeen (Cairo), Queen Nazli at Ras el-Tin (Alexandria), Emir Abdullah in Amman, King Faisal in Baghdad and Mustafa Kemal at Çankaya (Ankara). Look for the crown on the World map, then open the town's Royal Court card.</span>
              <button className="ghost-btn" onClick={() => { enterGame(); setGuide(true); }} data-testid="take-tour">Take the quick tour</button>
            </div>
          )}
          <div className="row">
            {g.started ? (
              <>
                <button className="big-btn" onClick={enterGame} data-testid="continue">
                  Continue · Day {g.day}
                </button>
                {confirmReset ? (
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>Erase this save?</span>
                    <button className="btn" onClick={() => { g.reset(); setConfirmReset(false); }} data-testid="confirm-reset">Erase</button>
                    <button className="ghost-btn" onClick={() => setConfirmReset(false)}>Keep</button>
                  </span>
                ) : (
                  <button className="ghost-btn" onClick={() => setConfirmReset(true)} data-testid="new-game">New game</button>
                )}
              </>
            ) : (
              <>
                <button className="big-btn" onClick={() => { audio.ensure(); setPhase('documentary'); }} data-testid="play-opening">
                  {introSeen() ? 'Play Opening' : 'Begin · watch the opening'}
                </button>
                {introSeen() && (
                  <button className="ghost-btn" onClick={() => { audio.ensure(); setPhase('dayone'); }} data-testid="skip-to-day">
                    Skip to Day One
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="title-foot">TRADE · PEOPLE · STORIES</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hud">
        <button className="hud-place hud-cal" onClick={() => setCal(true)} aria-label="Open the calendar" data-testid="hud-calendar">
          <b>{g.world.at ? settlementById(g.world.at).name : 'Road'}</b>
          <span data-testid="map-clock">{clock(g.world.hour)} {dateFor(g.day).weekday.slice(0, 3)}</span>
        </button>
        <div className="hud-stats">
          <button className={`hud-chip ${cashFlash ? 'flash' : ''}`} title="Your money. Tap to see what you can buy" onClick={() => { const at = useGame.getState().world.at; audio.sfx('tap'); if (at && at !== 'giza') mapGo({ view: 'world', panel: at, tab: 'market' }); else setTab('supplier'); }} disabled={tutorialActive} data-testid="hud-cash" data-pt={g.cash}>
            <Icon name="coin" />{fmt(g.cash)}
          </button>
          {inDebt && <button className="hud-chip hud-debt" onClick={() => setFinance(true)} title="You owe money that is overdue" data-testid="hud-debt">Debts</button>}
          <button className="hud-chip hud-rep" title="Your character: reputation, manner and skills" onClick={() => setTab('hero')} data-testid="hud-rep">
            <Icon name="star" />{g.reputation}
          </button>
          <button className={`icon-btn buyers-btn ${tourStep === 'buyers' ? 'tour-target' : ''}`} onClick={() => { setMsub('customers'); setTab('ledger'); }} aria-label="Your buyers" disabled={tutorialActive} data-testid="buyers-btn"><Icon name="people" /></button>
          <button className={`icon-btn radio-btn ${(g.radioHeard ?? 0) < g.day ? 'nav-new' : ''} ${tourStep === 'radio' ? 'tour-target' : ''}`} onClick={() => setRadioOpen(true)} aria-label="The radio" data-testid="radio-btn"><Icon name="radio" /></button>
          <button className={`icon-btn paper-btn ${(g.paperSeen ?? 0) < g.day ? 'nav-new' : ''} ${tourStep === 'news' ? 'tour-target' : ''}`} onClick={() => { setPaper(g.day); if ((g.paperSeen ?? 0) < g.day) { useGame.setState({ paperSeen: g.day }); g.passTime(15); } }} aria-label="Today's newspaper" data-testid="paper-btn"><Icon name="news" /></button>
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Save, sound and settings" data-testid="settings-btn">
            <Icon name="gear" />
          </button>
        </div>
      </header>

      {phase === 'game' && !(tab === 'stall' && g.encounter) && (() => {
        const fh = firstHourStep(g);
        return (
          <ObjectiveBar
            onGo={(t) => t && chapterGo(t as Target)}
            firstHour={fh ? { text: fh.text, btn: fh.btn, go: () => (fh.go === 'stall' ? mapGo({ view: 'district', stall: true }) : chapterGo(fh.go as Target)) } : null}
          />
        );
      })()}
      {phase === 'game' && !(tab === 'stall' && g.encounter) && !tutorialActive && (() => {
        return <SideTasks onGo={(t) => planTrip(t)} />;
      })()}
      {phase === 'game' && tutorialActive && !(tab === 'stall' && g.encounter) && (
        <button className="skip-lesson" onClick={() => g.skipTutorial()} data-testid="skip-lesson-nav">Skip the first-sale lesson and unlock everything</button>
      )}
      <main style={{ minHeight: 0, display: 'grid' }}>
        {tab === 'stall' && (g.world.at === 'giza' ? (
          !g.encounter && !g.dayOver ? <StallIdle onGo={chapterGo} /> :
          <StallEncounter onGoto={(t) => setTab(t)} />
        ) : (
          <div className="screen away" data-testid="away">
            <div className="screen-head"><div>
              <div className="eyebrow">YOUR CORNER IS CLOSED</div>
              <h2>{g.world.at ? `You are in ${settlementById(g.world.at).name}` : 'You are on the road'}</h2>
              <p>Samira, Yusuf and Mariam can only find you in Giza. Rent, dues and household are still due on the 1st of the month.</p>
            </div></div>
            <button className="btn primary" onClick={() => setTab('map')} data-testid="goto-world">Open the world map</button>
          </div>
        ))}
        {tab === 'supplier' && <Supplier toast={toast} />}
        {tab === 'inventory' && <Inventory onRashid={() => setTab('supplier')} />}
        {tab === 'ledger' && <Merchant sub={msub} setSub={setMsub} />}
        {tab === 'hero' && <HeroHub />}
        {tab === 'caravan' && <CaravanScreen onGo={chapterGo} />}
        {tab === 'map' && <Campaign key={mapIntent?.n ?? 0} intent={mapIntent} onGo={chapterGo} frozen={frozen} clearIntent={() => setMapIntent(null)} />}
        {cal && <Calendar onClose={() => setCal(false)} onPaper={(d) => setPaper(d)} />}
        {guide && <Guide onClose={() => { setGuide(false); g.markGuide(); }} />}
        <Tip id="rashid" when={tab === 'supplier'} />
        <Tip id="stock" when={tab === 'inventory'} />
        <Tip id="map" when={tab === 'map'} />
        <Tip id="levelup" when={tab !== 'ledger' && tab !== 'stall' && Object.values(g.skills ?? {}).some((x) => levelOf(x ?? 0) >= 2)} />
      </main>

      {g.dayOver && (
        <div className="evening-strip" role="status" data-testid="day-end">
          {/* the day's page in the ledger, written up by lamplight */}
          <span className="es-text">
            <b>{dateFor(g.day).long}</b>
            <span className="es-lines">
              <span><i>Sales</i> {g.dayStats.sales}</span>
              <span><i>Takings</i> {fmt(g.dayStats.revenue)}</span>
              <span><i>Profit</i> <em className={g.dayStats.gross > 0 ? 'pos' : g.dayStats.gross < 0 ? 'neg' : ''}>{fmt(g.dayStats.gross)}</em></span>
              {g.bills?.due ? <span><i>Owed</i> {fmt(g.bills.due)}</span> : null}
            </span>
          </span>
          {tab !== 'supplier' && <button className="btn" onClick={() => setTab('supplier')} data-testid="visit-rashid-evening">Rashid</button>}
          <button className="btn primary" onClick={() => { g.endDay(); setMapIntent({ view: 'district', n: Date.now() }); setTab('map'); }} data-testid="close-stall">
            Next day
          </button>
        </div>
      )}
      <nav className="nav" aria-label="Screens">
        {(
          [
            ['map', 'Map', 'map'],
            ['stall', g.world.at === 'giza' && !g.dayOver ? 'Stall' : 'Stall', 'store'],
            ['caravan', 'Caravan', 'camel'],
            ['inventory', 'Stock', 'scroll'],
            ['hero', 'Me', 'face'],
            ['ledger', 'Progress', 'star'],
          ] as [Tab, string, string][]
        ).map(([id, label, icon]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { if (id === 'ledger' && tourStep === 'buyers') setMsub('customers'); if (id === 'stall') { if (g.encounter) setTab('stall'); else if (g.world.at === 'giza') mapGo({ view: 'district', stall: true }); else setTab('stall'); } else setTab(id); audio.sfx('tap'); }} disabled={tutorialActive && id !== 'map'} data-testid={`nav-${id}`} className={`${id === 'map' ? `nav-world ${!g.guideSeen && !tutorialActive ? 'beckon' : ''}` : id === 'ledger' && tab !== 'ledger' && progressScore(g) > (g.merchantSeen ?? 0) ? 'nav-new' : ''} ${tourStep && tourNav[tourStep] === id ? 'tour-target' : ''}`}>
            {icon === 'face' ? <img className="nav-face" src="art/hero/hero-face-reference.jpg" alt="" /> : <Icon name={icon} />}
            {label}
          </button>
        ))}
      </nav>

      {settings && (
        <div className="overlay" onClick={() => setSettings(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} data-testid="settings">
            <h2>Your game</h2>
            <p data-testid="save-status">Your game saves itself after everything you do, in this browser on this device. {savedAt ? `Last saved ${savedAt}.` : ''}</p>
            <div className="save-row">
              <button className="btn primary" onClick={() => { useGame.setState({}); setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); audio.sfx('tap'); }} data-testid="save-now">Save now</button>
              <button className="btn" onClick={downloadSave} data-testid="save-download">Download a save file</button>
              <label className="btn" data-testid="save-load">Load a save file<input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSave(f); e.target.value = ''; }} /></label>
            </div>
            <p className="dim">A save file keeps a copy you can bring back, or open on another phone or computer.</p>
            <h2>Sound</h2>
            <p>Voices play only where recorded lines exist. Everything else is captioned.</p>
            <div className="vol-sliders" data-testid="volume-sliders">
              {([['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects and ambience'], ['dialogue', 'Dialogue']] as [keyof Volumes, string][]).map(([k, l]) => {
                const v = (g.volumes ?? DEFAULT_VOLUMES)[k];
                return (
                  <label className="vol-row" key={k}>
                    <span>{l}</span>
                    <input type="range" min={0} max={100} step={5} value={Math.round(v * 100)} onChange={(e) => g.setVolume(k, Number(e.target.value) / 100)} aria-label={`${l} volume`} data-testid={`vol-${k}`} />
                    <b>{Math.round(v * 100)}</b>
                  </label>
                );
              })}
            </div>
            {(
              [
                ['dialogue', 'Dialogue', 'Recorded character voices'],
                ['music', 'Music', 'Oud and drone in maqam Hijaz'],
                ['sfx', 'Effects', 'Rugs, coins, tea, Saffron'],
                ['ambience', 'Ambience', 'Market crowd, birds, camels'],
              ] as [Channel, string, string][]
            ).map(([c, l, d]) => (
              <div className="toggle-row" key={c}>
                <span>
                  {l}
                  <small>{d}</small>
                </span>
                <button className="switch" role="switch" aria-checked={g.settings[c]} aria-label={l} onClick={() => g.setSetting(c, !g.settings[c])} data-testid={`toggle-${c}`} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => { setSettings(false); setGuide(true); }} data-testid="guide-btn">How to play</button>
              <button className="btn" onClick={() => { audio.stopAll(); setSettings(false); setPhase('title'); }}>Title screen</button>
              <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}




      {finance && <FinancePanel onClose={() => setFinance(false)} />}
      {g.ended && phase === 'game' && (
        <div className="overlay ending" data-testid="ending">
          <div className="modal-card ending-card">
            <small>THE EGYPTIAN GAZETTE · {dateFor(g.ended.day).long.toUpperCase()}</small>
            <h2>A Giza carpet stall closes</h2>
            <p>{g.ended.text}</p>
            <p className="dim">You traded for {g.ended.day} days, sold {g.ledger.filter((l) => l.kind === 'sale').length} rugs and reached reputation {g.reputation}.</p>
            <button className="btn primary" onClick={() => { audio.stopAll(); g.reset(); setPhase('title'); }} data-testid="ending-restart">Begin again</button>
          </div>
        </div>
      )}
      {paper !== null && <Newspaper day={paper} onClose={() => setPaper(null)} />}
      {radioOpen && <Radio onClose={() => setRadioOpen(false)} />}
      {gramophoneOpen && <Gramophone onClose={() => setGramophoneOpen(false)} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

