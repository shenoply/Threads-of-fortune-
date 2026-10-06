import { DISEASE } from './game/systems/disease';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { OPEN_UPGRADES, UpgradeNudge, UpgradesSheet } from './components/Inventory/StallUpgrades';
import { MALEK_EVENT, PLAN_EVENT, openMalek, planTrip } from './game/nav';
import { eventsStarting, laneDay } from './game/economy/life';
import { CourierTeaser, isEventNote } from './components/Newspaper/CourierTeaser';
import { fmt } from './game/economy/money';
import { radio } from './game/radio/player';
import { START_WARDROBE, fullSrc, stallSrc } from './data/wardrobe';
import { preload, buyerArt, STALL_ART } from './game/preload';
import { SecretCode } from './components/Settings/SecretCode';
import { FullScreenButton, InstallButton } from './components/Settings/FullScreen';
import { HowItPlays, openHowItPlays } from './components/Guide/HowItPlays';
import { useGame, dateFor, clock, forceSave } from './game/state/store';
import { StallIdle } from './components/StallEncounter/StallIdle';
import { audio, DEFAULT_VOLUMES, type Channel, type Volumes } from './game/audio/engine';
import { voice } from './game/audio/voice';
import { JOBS, GIVER_VOICE } from './data/jobs';
import { Icon } from './components/Icon';
import { StallEncounter } from './components/StallEncounter/StallEncounter';
import { Documentary, DayOneCard, introSeen, markIntroSeen } from './components/Documentary/Documentary';
import { Supplier } from './components/Supplier/Supplier';
import { Inventory } from './components/Inventory/Inventory';
import { Guide, guidePage } from './components/Guide/Guide';
import { ObjectiveBar, SideTasks } from './components/Mission/Mission';
import { firstHourStep } from './components/Tips/FirstHour';
import { CaravanScreen } from './components/World/CaravanScreen';
import { Campaign, openStallNext, type MapIntent, type Target } from './components/World/Campaign';
import type { SetTab } from './components/World/Settlement';
import { Tip } from './components/Tips/Tip';
import { Rumours } from './components/Rumours/Rumours';
import { levelOf } from './data/character';
import { Merchant, progressScore, type MerchantSub } from './components/Merchant/Merchant';
import { settlementById } from './game/systems/world';
import { RUGS } from './data/rugs';
import { rentFor } from './data/suppliers';
import { paintedMap } from './game/systems/mapRender';
import { Atmosphere } from './components/Atmosphere/Atmosphere';
import { preloadStall } from './components/StallEncounter/stallArt';
import { FinancePanel } from './components/World/Finance';
import { overdue, ruinRisk, RUIN_STEPS } from './game/systems/finance';
import { SLOT_COUNT, readSlots, saveToSlot, loadFromSlot, clearSlot, slotLabel, type SlotInfo } from './game/state/slots';
// screens opened later (the paper, the wireless, the gramophone, the calendar, your character) load
// when first opened, so a phone starts the game without downloading and parsing them
const Newspaper = lazy(() => import('./components/Newspaper/Newspaper').then((m) => ({ default: m.Newspaper })));
const Radio = lazy(() => import('./components/Radio/Radio').then((m) => ({ default: m.Radio })));
const Gramophone = lazy(() => import('./components/Radio/Gramophone').then((m) => ({ default: m.Gramophone })));
const Calendar = lazy(() => import('./components/Calendar/Calendar').then((m) => ({ default: m.Calendar })));
const HeroHub = lazy(() => import('./components/Hero/HeroHub').then((m) => ({ default: m.HeroHub })));

type Tab = 'stall' | 'supplier' | 'inventory' | 'ledger' | 'map' | 'caravan' | 'hero';
const TITLE_BGS: { src: string; place: string; pos?: string }[] = [
  { src: 'art/title/caravan.webp', place: 'The canal road · 1925' },
  { src: 'art/title/ambush.webp', place: 'Trouble in the cane' },
  { src: 'art/title/bandit.webp', place: 'Stop. Who goes there?' },
  { src: 'art/stall-seller.jpg', place: 'Giza · the stall', pos: '50% 30%' },
  { src: 'art/world/stall-top.jpg', place: 'Giza · the stall' },
  { src: 'art/world/giza-district.jpg', place: 'Giza · the district' },
  { src: 'art/world/city-alexandria.jpg', place: 'Alexandria' },
  { src: 'art/world/city-damascus.jpg', place: 'Damascus' },
  { src: 'art/world/city-istanbul.jpg', place: 'Istanbul' },
  { src: 'art/world/city-baghdad.jpg', place: 'Baghdad' },
  { src: 'art/world/city-jerusalem.jpg', place: 'Jerusalem' },
  { src: 'art/world/city-amman.jpg', place: 'Amman' },
  { src: 'art/royal/abdeen-exterior.jpg', place: 'Abdeen Palace, Cairo' },
  { src: 'art/events/camp-night.webp', place: 'A night on the road' },
  { src: 'art/events/hospitality-tea.webp', place: 'Tea with a stranger' },
  { src: 'art/cities/alexandria-arrival-poster.webp', place: 'Alexandria · arrival' },
];

type Phase = 'title' | 'documentary' | 'dayone' | 'game';

export default function App() {
  const g = useGame();
  // the save: zustand writes it to localStorage on every change; this is only so the player can see
  // that, keep a copy as a file, and bring a copy back
  const [savedAt, setSavedAt] = useState('');
  const [finance, setFinance] = useState(false);
  // money trouble shows in the top bar: an empty purse, a late bill, a loan past due, the creditors
  const inDebt = g.started && ((g.ruin?.stage ?? 0) > 0 || overdue(g.cash, g.bills?.due ?? 0, (g.bills?.due ?? 0) > 0 && g.day - (g.bills?.since ?? 0) >= 5, g.loans ?? [], g.day) > 0);
  // the creditors' road, once a lawyer's letter has gone out: 0 at the letter, 100 the moment the
  // court would declare you bankrupt. A second bankruptcy ends the game for good, so that one gets
  // the starkest framing.
  const ruin = g.ruin ?? { stage: 0, since: 0 };
  const risk = g.started ? ruinRisk(ruin, g.day) : 0;
  const daysToCourt = Math.max(0, RUIN_STEPS.court - (g.day - ruin.since));
  const finalStrike = (g.bankruptcies ?? 0) > 0;
  // only the "last saved" label follows autosave's own on/off switch — Save now and the slots
  // update it through their own handlers regardless
  useEffect(() => useGame.subscribe(() => { if (useGame.getState().autosaveOn !== false) setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); }), []);
  const downloadSave = () => {
    forceSave(); // autosave may be off: make sure the file reflects where you actually are
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
  // three in-browser save slots: a quicker alternative to downloading/loading a file, for a few
  // separate games on one phone. Read fresh whenever the picker might be open, since a slot can be
  // written from the title screen (no game loaded) as well as from Settings mid-game.
  const [slots, setSlots] = useState<(SlotInfo | null)[]>(() => readSlots());
  const refreshSlots = () => setSlots(readSlots());
  const slotSave = (n: number) => { forceSave(); if (saveToSlot(n)) { refreshSlots(); audio.sfx('tap'); } };
  const slotLoad = (n: number, info: SlotInfo) => {
    if (!window.confirm(`Load the save from day ${info.day}? Your current game will be replaced.`)) return;
    if (loadFromSlot(n)) window.location.reload();
  };
  const slotClear = (n: number) => {
    if (!window.confirm('Clear this save slot? This cannot be undone.')) return;
    clearSlot(n); refreshSlots();
  };
  // the stall, the merchant and the next few customers are fetched ahead, so nobody pops in late
  useEffect(() => { if (g.started) preloadStall(g.queue.slice(g.visitIdx, g.visitIdx + 3)); }, [g.started, g.queue, g.visitIdx]);
  const [phase, setPhase] = useState<Phase>('title');
  const [confirmIron, setConfirmIron] = useState(false);
  const [titleOpts, setTitleOpts] = useState(false);
  const [titleBg, setTitleBg] = useState(() => TITLE_BGS[Math.floor(Math.random() * TITLE_BGS.length)]);
  // the map is home; the stall screen is only for a sale in progress and for the first day's lesson
  const [tab, setTab] = useState<Tab>('map');
  const [settings, setSettings] = useState(false);
  useEffect(() => { if (settings) refreshSlots(); }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const [msub, setMsub] = useState<MerchantSub>('customers');
  const [guide, setGuide] = useState(false);
  const [guideAt, setGuideAt] = useState(0);
  // a "?" anywhere opens How to play on its page
  useEffect(() => {
    const on = (e: Event) => { setGuideAt(guidePage((e as CustomEvent<string | undefined>).detail)); setGuide(true); };
    window.addEventListener('tof-guide', on);
    return () => window.removeEventListener('tof-guide', on);
  }, []);
  // How it plays: the feature clips
  const [how, setHow] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setHow((e as CustomEvent<string | undefined>).detail ?? '');
    window.addEventListener('tof-how', on);
    return () => window.removeEventListener('tof-how', on);
  }, []);
  const howView = how !== null && <HowItPlays start={how || undefined} onClose={() => setHow(null)} />;
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
  // the stall upgrades sheet: opened from the stall, Stock, or the reminder chip
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  useEffect(() => {
    const on = () => setUpgradesOpen(true);
    window.addEventListener(OPEN_UPGRADES, on);
    return () => window.removeEventListener(OPEN_UPGRADES, on);
  }, []);
  const mapGo = (m: Omit<MapIntent, 'n'>) => { setMapIntent({ ...m, n: Date.now() }); setTab('map'); };
  // a deep screen (Arran's notebook, an errand card) asks for a route to a town: show the map with it planned
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<string | { town: string; go?: boolean }>).detail; const t = typeof d === 'string' ? d : d?.town; const go = typeof d === 'object' && !!d?.go; if (t) mapGo(useGame.getState().world.at === t ? (t === 'giza' ? { view: 'district' } : { view: 'world', panel: t, tab: 'town' }) : { view: 'world', plan: t, go }); };
    window.addEventListener(PLAN_EVENT, on);
    return () => window.removeEventListener(PLAN_EVENT, on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // "Lunch at Malek's": show the district; it opens his shop
  useEffect(() => {
    const on = () => mapGo({ view: 'district' });
    window.addEventListener(MALEK_EVENT, on);
    return () => window.removeEventListener(MALEK_EVENT, on);
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
  const [loadOpen, setLoadOpen] = useState(false);
  const toastTimer = useRef<number>();
  const toast = (m: string) => {
    if (!m) return;
    setToast(m);
    window.clearTimeout(toastTimer.current);
    // any note that moves money without the player choosing to (a visitor buying a packed rug, a
    // completed job, a delivered parcel, an insurance claim, a checkpoint "fee") is easy to miss if
    // it flashes by at the usual reading pace — doubly so arriving somewhere fast, like the ferry —
    // so anything naming an amount gets extra time on screen, not just the "buys" sale wording
    const money = /£/.test(m);
    toastTimer.current = window.setTimeout(() => setToast(''), Math.max(money ? 5000 : 2600, m.length * (money ? 85 : 55)));
  };
  const tutorialActive = !g.tutorial.done;
  // the first-day tour points at the button to press next
  const tourStep = g.tutorial.done ? (['buyers', 'news', 'radio', 'rashid', 'map'] as const).find((k) => !g.onboard?.[k]) : undefined;
  const tourNav: Record<string, string> = { buyers: 'ledger', rashid: 'supplier', map: 'map' };
  useEffect(() => {
    // the music follows where you are (in a town, or out on the road), not which screen is open:
    // looking at the map or your stock does not change the score
    audio.setScene(g.world.at ? 'market' : 'road');
  }, [g.world.at]);
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
    if (phase === 'game' && g.started && !g.encounter && !g.dayOver && !g.journey && g.world.at === 'giza' && (tab === 'stall' || tab === 'map') && !frozen) {
      // the stall day ends at eight in the evening, not when the last customer has been
      // served — but not while you're already on the road out of Giza (g.journey): the
      // evening-strip would otherwise snap down mid-journey and freeze travel in place,
      // with no obvious way out ("stuck, won't move").
      if (g.world.hour >= 20) useGame.setState({ dayOver: true });
      // a customer who arrives waits at the stall; you choose when to serve them
    }
    // a sale is over: back to the lane, with the stall open
    if (phase === 'game' && tab === 'stall' && g.tutorial.done && !g.encounter && !g.dayOver) { if (!g.held) openStallNext(); setTab('map'); }
  }, [phase, g.started, g.encounter, g.dayOver, g.journey, g.visitIdx, g.queue.length, g, tab, g.world.hour]); // eslint-disable-line react-hooks/exhaustive-deps

  // the hero as he is dressed now, ready before the wardrobe or a mirror shows him
  useEffect(() => {
    if (phase !== 'game') return;
    const id = (g.wardrobe ?? START_WARDROBE).worn;
    preload([fullSrc(id), stallSrc(id)]);
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

  const soundOptions = (
    <>
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
    </>
  );

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
        <div className="bg" key={titleBg.src} style={{ backgroundImage: `url(${titleBg.src})`, backgroundPosition: titleBg.pos ?? '50% 45%' }} />
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
          {!g.started && (
            <label className={`iron-toggle ${g.ironman ? 'on' : ''}`} data-testid="ironman-toggle">
              <input type="checkbox" checked={!!g.ironman} onChange={(e) => g.setIronman(e.target.checked)} />
              <span><b>Ironman mode</b><small>A new game with one life. If Hassan dies, from sickness, a wound or a fight, the game is over. No save slots.</small></span>
            </label>
          )}
          <button className="ghost-btn opt-toggle" onClick={() => setTitleOpts((o) => !o)} aria-expanded={titleOpts} data-testid="title-options">{titleOpts ? 'Hide options' : '⚙ Options · sound and volume'}</button>
          {titleOpts && <div className="title-opts modal-card-like" data-testid="title-options-panel">{soundOptions}</div>}
          {g.started && g.ironman && <div className="iron-badge" data-testid="ironman-badge">⚔ Ironman · one life</div>}
          <div className="row">
            {g.started ? (
              <>
                <button className="big-btn" onClick={enterGame} data-testid="continue">
                  Continue · Day {g.day}
                </button>
                {confirmReset ? (
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>Erase this save?</span>
                    <button className="btn" onClick={() => { forceSave(); saveToSlot(slots.findIndex((s) => !s) + 1 || 1); g.reset(); setConfirmReset(false); refreshSlots(); }} data-testid="confirm-reset-keep">Save it to a slot, then erase</button>
                    <button className="btn" onClick={() => { g.reset(); setConfirmReset(false); }} data-testid="confirm-reset">Just erase</button>
                    <button className="ghost-btn" onClick={() => setConfirmReset(false)}>Keep</button>
                  </span>
                ) : (
                  <button className="ghost-btn" onClick={() => setConfirmReset(true)} data-testid="new-game">New game</button>
                )}
                {confirmIron ? (
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--parchment)', fontSize: 16 }}>Start a new Ironman game? This save will be erased.</span>
                    <button className="btn" onClick={() => { forceSave(); saveToSlot(slots.findIndex((x) => !x) + 1 || 1); g.reset(); g.setIronman(true); setConfirmIron(false); refreshSlots(); }} data-testid="confirm-iron-keep">Save it to a slot, then start</button>
                    <button className="btn" onClick={() => { g.reset(); g.setIronman(true); setConfirmIron(false); }} data-testid="confirm-iron">Just erase and start</button>
                    <button className="ghost-btn" onClick={() => setConfirmIron(false)}>Keep</button>
                  </span>
                ) : (
                  <button className="ghost-btn" onClick={() => setConfirmIron(true)} data-testid="new-ironman">☠ New Ironman game</button>
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
            <div className="title-links">
            <button className="ghost-btn" onClick={() => openHowItPlays()} data-testid="title-how">▶ How it plays</button>
            <InstallButton className="ghost-btn" />
            <FullScreenButton className="ghost-btn" />
            {slots.some((s) => s) && (
              <button className="ghost-btn" onClick={() => { refreshSlots(); setLoadOpen((o) => !o); }} data-testid="title-load-toggle">
                {loadOpen ? 'Hide saves' : 'Load a save'}
              </button>
            )}
            </div>
          </div>
          {loadOpen && (
            <div className="slot-list" data-testid="title-slot-list">
              {slots.map((info, i) => info && (
                <div className="slot-row" key={i} data-testid={`title-slot-${i + 1}`}>
                  <span className="slot-info">{slotLabel(info)}</span>
                  <span className="slot-btns">
                    <button className="btn small" onClick={() => slotLoad(i + 1, info)} data-testid={`title-slot-load-${i + 1}`}>Load</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="title-place" onClick={() => setTitleBg((c) => { let n = c; while (n === c) n = TITLE_BGS[Math.floor(Math.random() * TITLE_BGS.length)]; return n; })} title="Show another picture" data-testid="title-shuffle">⟳ {titleBg.place}</button>
        <div className="title-foot">TRADE · PEOPLE · STORIES</div>
        {howView}
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

      {g.started && ruin.stage > 0 && !(tab === 'stall' && g.encounter) && (
        <button className={`ruin-banner ${finalStrike ? 'final' : ''}`} onClick={() => setFinance(true)} data-testid="ruin-banner">
          <div className="ruin-banner-text">
            <b>{finalStrike ? 'FINAL WARNING — ' : ''}{ruin.stage === 1 ? 'A lawyer has written' : 'The bailiff has been'}</b>
            <span>
              {ruin.stage === 1
                ? `The bailiff comes to the stall in ${Math.max(0, RUIN_STEPS.bailiff - (g.day - ruin.since))} day${Math.max(0, RUIN_STEPS.bailiff - (g.day - ruin.since)) === 1 ? '' : 's'} unless you pay.`
                : `The court declares you bankrupt in ${daysToCourt} day${daysToCourt === 1 ? '' : 's'} unless you pay.`}
              {finalStrike ? ' This bankruptcy ends your father’s business for good.' : ''}
            </span>
          </div>
          <div className="ruin-meter" aria-hidden="true"><i style={{ width: `${risk}%` }} /></div>
        </button>
      )}

      {g.started && (g.illnesses ?? []).length > 0 && !(tab === 'stall' && g.encounter) && (
        <div className="ill-banner" data-testid="ill-banner">
          {(g.illnesses ?? []).map((il) => { const d = DISEASE(il.id); return d ? <span key={il.id}><b>{d.name}</b> · about {Math.max(1, il.until - g.day)} day{il.until - g.day === 1 ? '' : 's'} left. {d.symptom}</span> : null; })}
        </div>
      )}

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
      {phase === 'game' && !tutorialActive && !(tab === 'stall' && g.encounter) && <UpgradeNudge />}
      {phase === 'game' && tutorialActive && tab !== 'map' && !(tab === 'stall' && g.encounter) && (
        <button className="skip-lesson" onClick={() => g.skipTutorial()} data-testid="skip-lesson-nav">Skip the first-sale lesson and unlock everything</button>
      )}
      {upgradesOpen && <UpgradesSheet onClose={() => setUpgradesOpen(false)} />}
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
        {tab === 'hero' && <Suspense fallback={null}><HeroHub /></Suspense>}
        {tab === 'caravan' && <CaravanScreen onGo={chapterGo} />}
        {tab === 'map' && <Campaign key={mapIntent?.n ?? 0} intent={mapIntent} onGo={chapterGo} frozen={frozen} clearIntent={() => setMapIntent(null)} />}
        {cal && <Suspense fallback={null}><Calendar onClose={() => setCal(false)} onPaper={(d) => setPaper(d)} /></Suspense>}
        {howView}
        {guide && <Guide start={guideAt} onClose={() => { setGuide(false); setGuideAt(0); g.markGuide(); }} />}
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
              {/* the rug margin less what the day cost you so far (deliveries, repairs) */}
              {(() => { const net = g.dayStats.gross - g.dayStats.expenses; return <span><i>Profit</i> <em className={net > 0 ? 'pos' : net < 0 ? 'neg' : ''}>{fmt(net)}</em></span>; })()}
              {g.bills?.due ? <span><i>Owed</i> {fmt(g.bills.due)}</span> : null}
            </span>
          </span>
          {tab !== 'supplier' && <button className="btn" onClick={() => setTab('supplier')} data-testid="visit-rashid-evening">Rashid</button>}
          {g.world.at === 'giza' && g.world.hour < 21 && <button className="btn" onClick={() => openMalek()} data-testid="malek-evening">Supper at Malek's</button>}
          <button className="btn primary" onClick={() => { g.endDay(); setMapIntent(useGame.getState().journey ? { view: 'world', n: Date.now() } : { view: 'district', n: Date.now() }); setTab('map'); }} data-testid="close-stall">
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
            <p data-testid="save-status">{g.autosaveOn === false ? 'Autosave is off — use Save now, or a save slot, to keep your progress.' : 'Your game saves itself after everything you do, in this browser on this device.'} {savedAt ? `Last saved ${savedAt}.` : ''}</p>
            <div className="toggle-row">
              <span>
                Autosave
                <small>Save after everything you do. Turn off to only save when you choose to.</small>
              </span>
              <button className="switch" role="switch" aria-checked={g.autosaveOn !== false} aria-label="Autosave" onClick={() => g.setAutosave(!(g.autosaveOn !== false))} data-testid="toggle-autosave" />
            </div>
            <div className="save-row">
              <button className="btn primary" onClick={() => { forceSave(); setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); audio.sfx('tap'); }} data-testid="save-now">Save now</button>
              <button className="btn" onClick={downloadSave} disabled={!!g.ironman} data-testid="save-download">Download a save file</button>
              <label className="btn" data-testid="save-load">Load a save file<input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSave(f); e.target.value = ''; }} /></label>
            </div>
            <p className="dim">A save file keeps a copy you can bring back, or open on another phone or computer.</p>
            {g.ironman && <p className="dim"><b>Ironman:</b> one life, one save. The game saves itself as you play. Save slots and save files are switched off, so a death cannot be undone.</p>}
            <h3>Save slots</h3>
            <p className="dim">Keep up to {SLOT_COUNT} games side by side on this phone or computer, without downloading a file.</p>
            <div className="slot-list" data-testid="slot-list">
              {slots.map((info, i) => {
                const n = i + 1;
                return (
                  <div className="slot-row" key={n} data-testid={`slot-${n}`}>
                    <span className="slot-info">{info ? slotLabel(info) : 'Empty slot'}</span>
                    <span className="slot-btns">
                      <button className="btn small" disabled={!!g.ironman} onClick={() => slotSave(n)} data-testid={`slot-save-${n}`}>{info ? 'Overwrite' : 'Save here'}</button>
                      {info && <button className="btn small" onClick={() => slotLoad(n, info)} data-testid={`slot-load-${n}`}>Load</button>}
                      {info && <button className="btn small ghost-btn" onClick={() => slotClear(n)} data-testid={`slot-clear-${n}`}>Clear</button>}
                    </span>
                  </div>
                );
              })}
            </div>
            {soundOptions}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => { setSettings(false); setGuide(true); }} data-testid="guide-btn">How to play</button>
              <button className="btn" onClick={() => { setSettings(false); openHowItPlays(); }} data-testid="how-btn">▶ How it plays</button>
              <InstallButton />
              <FullScreenButton />
              <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setSettings(false)}>Close</button>
            </div>
            <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => { audio.stopAll(); setSettings(false); setPhase('title'); }} data-testid="menu-btn">⌂ Return to main menu <small style={{ opacity: 0.7 }}>(progress is saved)</small></button>
            <SecretCode />
          </div>
        </div>
      )}




      {finance && <FinancePanel onClose={() => setFinance(false)} />}
      {g.ended && phase === 'game' && (
        <div className="overlay ending" data-testid="ending">
          <div className="modal-card ending-card">
            <small>THE EGYPTIAN GAZETTE · {dateFor(g.ended.day).long.toUpperCase()}</small>
            <h2>{g.ended.cause === 'death' ? 'Hassan is dead' : 'A Giza carpet stall closes'}</h2>
            <p>{g.ended.text}</p>
            <p className="dim">You traded for {g.ended.day} days, sold {g.ledger.filter((l) => l.kind === 'sale').length} rugs and reached reputation {g.reputation}.</p>
            {g.ended.cause === 'death' && <p className="dim">{g.ironman ? 'Ironman: there is no second life. The run is over.' : ''}</p>}
            <button className="btn primary" onClick={() => { audio.stopAll(); g.reset(); setPhase('title'); }} data-testid="ending-restart">{g.ended.cause === 'death' ? 'Start a new life' : 'Begin again'}</button>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        {paper !== null && <Newspaper day={paper} onClose={() => setPaper(null)} />}
        {radioOpen && <Radio onClose={() => setRadioOpen(false)} />}
        {gramophoneOpen && <Gramophone onClose={() => setGramophoneOpen(false)} />}
      </Suspense>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

