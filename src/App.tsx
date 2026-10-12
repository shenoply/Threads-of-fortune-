import { SimOptions } from './components/Title/SimOptions';
import { DaySummary } from './components/Ledger/DaySummary';
import { JobOffer } from './components/World/JobOffer';
import { afterFirstSale } from './game/preload';
import { openingStep } from './game/opening';
import { guideTarget } from './game/guide';
import { HealthStrip } from './components/Health/HealthStrip';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { OPEN_UPGRADES, UpgradeNudge, UpgradesSheet } from './components/Inventory/StallUpgrades';
import { MALEK_EVENT, PLAN_EVENT, CLINIC_EVENT, openMalek, planTrip } from './game/nav';
import { eventsStarting, laneDay } from './game/economy/life';
import { fmt } from './game/economy/money';
import { radio } from './game/radio/player';
import { START_WARDROBE, fullSrc, stallSrc } from './data/wardrobe';
import { lookFor } from './game/heroLook';
import { PlayAsYourself, SandboxChoose } from './components/Sandbox/PlayAsYourself';
import { ModeChooser, type Mode } from './components/Title/ModeChooser';
import { Rescue } from './components/World/Rescue';
import { preload, buyerArt, STALL_ART } from './game/preload';
import { SecretCode } from './components/Settings/SecretCode';
import { FullScreenButton, InstallButton } from './components/Settings/FullScreen';
import { HowItPlays, openHowItPlays } from './components/Guide/HowItPlays';
import { useGame, dateFor, clock, forceSave, FULL_SIM, SAVE_VERSION, FAMILY_GRACE, type SimSettings } from './game/state/store';
import * as storeModule from './game/state/store';
import { SAVE_KEY, BEFORE_LOAD_KEY, SAVE_FAILED_EVENT, SAVE_OK_EVENT, OTHER_TAB_EVENT, saveFailedNow, otherTabActive, blockSaves, memorySave, checkSave, readKey, writeKey } from './game/state/saveGuard';
import './components/SaveGuard.css';
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
import { firstHourStep, FIRST_HOUR_TIP } from './components/Tips/FirstHour';
import { GuideFlash } from './components/Tips/GuideFlash';
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
import { slotCrashed, crashedLabel, slotSaveText } from './game/state/crashedSlot';
import { SLOT_COUNT, readSlots, saveToSlot, loadFromSlot, clearSlot, slotLabel, slotIsIronman, type SlotInfo } from './game/state/slots';
// screens opened later (the paper, the wireless, the gramophone, the calendar, your character) load
// when first opened, so a phone starts the game without downloading and parsing them
// the paper and the radio wait for the researched wires (fetched after the title is up) so the day's news is complete
const withWires = <T,>(p: Promise<T>) => Promise.all([p, import('./data/daily1925').then((d) => d.loadWires()).catch(() => {})]).then(([m]) => m);
const Newspaper = lazy(() => withWires(import('./components/Newspaper/Newspaper')).then((m) => ({ default: m.Newspaper })));
const Radio = lazy(() => withWires(import('./components/Radio/Radio')).then((m) => ({ default: m.Radio })));
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
  { src: 'art/world/city-istanbul.jpg', place: 'Constantinople' },
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
  const inDebt = g.started && ((g.ruin?.stage ?? 0) > 0 || overdue(g.cash, g.bills?.due ?? 0, (g.bills?.due ?? 0) > 0 && g.day - (g.bills?.since ?? 0) >= 5, g.loans ?? [], g.day, (g.family?.due ?? 0) > 0 && g.day - (g.family?.since ?? 0) >= FAMILY_GRACE ? g.family!.due : 0) > 0);
  // the creditors' road, once a lawyer's letter has gone out: 0 at the letter, 100 the moment the
  // court would declare you bankrupt. A second bankruptcy ends the game for good, so that one gets
  // the starkest framing.
  const ruin = g.ruin ?? { stage: 0, since: 0 };
  const risk = g.started ? ruinRisk(ruin, g.day) : 0;
  const daysToCourt = Math.max(0, RUIN_STEPS.court - (g.day - ruin.since));
  const finalStrike = (g.bankruptcies ?? 0) > 0;
  // whether the last write of the save failed (storage full): the store tells us by an event, and
  // (when it has one) a lastSaveFailed() export; saveGuard watches the writes itself as well
  const failedNow = () => saveFailedNow(storeModule);
  const [saveFail, setSaveFail] = useState(() => failedNow());
  const [saveWarn, setSaveWarn] = useState(false);
  // another tab of this browser wrote the save: this one has stopped writing it
  const [otherTab, setOtherTab] = useState(() => otherTabActive());
  useEffect(() => {
    const bad = () => { setSaveFail(true); setSaveWarn(true); };
    const ok = () => { setSaveFail(false); setSaveWarn(false); };
    const tab = () => setOtherTab(true);
    window.addEventListener(SAVE_FAILED_EVENT, bad); window.addEventListener(SAVE_OK_EVENT, ok); window.addEventListener(OTHER_TAB_EVENT, tab);
    return () => { window.removeEventListener(SAVE_FAILED_EVENT, bad); window.removeEventListener(SAVE_OK_EVENT, ok); window.removeEventListener(OTHER_TAB_EVENT, tab); };
  }, []);
  const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // only the "last saved" label follows autosave's own on/off switch — Save now and the slots
  // update it through their own handlers regardless. The write happens just after the change, so
  // the label waits a moment and is only moved on when the write went through.
  useEffect(() => useGame.subscribe(() => {
    if (useGame.getState().autosaveOn === false) return;
    window.setTimeout(() => { if (failedNow()) { setSaveFail(true); return; } if (!otherTabActive()) setSavedAt(stamp()); }, 0);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  // the save as text: from disk, or from memory when the disk copy is out of date (a write failed)
  const liveSave = (): string | null => (failedNow() || !readKey(SAVE_KEY) ? memorySave(useGame.getState(), SAVE_VERSION) : readKey(SAVE_KEY));
  const saveFile = (raw: string, day: number) => {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `threads-of-fortune-day-${day}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const downloadSave = () => {
    forceSave(); // autosave may be off: make sure the file reflects where you actually are
    // in a tab that has stopped saving, the file is this tab's game, not the other tab's
    const raw = otherTabActive() ? memorySave(useGame.getState(), SAVE_VERSION) : liveSave();
    if (!raw) return;
    saveFile(raw, useGame.getState().day);
  };
  const FULL_MSG = 'Your game could not be saved: the storage on this phone is full.';
  const loadSave = (f: File) => {
    f.text().then((txt) => {
      const c = checkSave(txt, SAVE_VERSION);
      if (!c.ok) { window.alert(c.why); return; }
      if (!window.confirm(`Load the save from day ${c.day}? Your current game will be put aside first.`)) return;
      const put = () => {
        blockSaves(); // nothing from this page may write over the loaded save before the reload
        if (!writeKey(SAVE_KEY, txt)) window.alert(`${FULL_MSG} The backup file could not be opened. Empty a save slot, then try again.`);
        window.location.reload();
      };
      // keep the game being replaced: a copy to bring back if the file will not open, and a free slot
      const cur = useGame.getState();
      if (!cur.started) { put(); return; }
      forceSave();
      const raw = liveSave();
      let kept = '';
      if (raw && !cur.ironman) {
        writeKey(BEFORE_LOAD_KEY, raw);
        const free = readSlots().findIndex((x) => !x) + 1;
        if (free > 0 && saveToSlot(free, raw)) { kept = `Your current game was kept in save slot ${free}.`; refreshSlots(); }
      }
      if (kept) { window.alert(kept); put(); return; }
      if (!window.confirm('There is no free save slot to keep your current game. OK makes a backup file of it, then opens the new save. Cancel stops here and changes nothing.')) return;
      downloadSave();
      window.setTimeout(put, 1500); // let the file finish before the page reloads
    });
  };
  // three in-browser save slots: a quicker alternative to downloading/loading a file, for a few
  // separate games on one phone. Read fresh whenever the picker might be open, since a slot can be
  // written from the title screen (no game loaded) as well as from Settings mid-game.
  const [slots, setSlots] = useState<(SlotInfo | null)[]>(() => readSlots());
  const refreshSlots = () => setSlots(readSlots());
  const slotSave = (n: number) => {
    forceSave();
    const ok = saveToSlot(n, failedNow() ? memorySave(useGame.getState(), SAVE_VERSION) : undefined);
    refreshSlots();
    if (ok) audio.sfx('tap');
    else { toast(`Slot ${n} could not be kept: the storage on this phone is full. Make a backup file instead.`); setSaveWarn(true); }
  };
  // the game that stopped the page, kept by the crash screen: a backup file, never loaded from here
  const slotDownload = (n: number, info: SlotInfo) => { const raw = slotSaveText(n); if (raw) saveFile(raw, info.day); };
  const slotLoad = (n: number, info: SlotInfo) => {
    if (slotCrashed(info)) { window.alert('This slot holds a game that stopped the page. Loading it would most likely stop it again, so it can only be downloaded as a backup file.'); return; }
    if (useGame.getState().started && useGame.getState().ironman) { window.alert('An Ironman run cannot be swapped for a saved game.'); return; }
    if (info.mode === 'Ironman' || slotIsIronman(n)) { window.alert('This slot holds an Ironman run. An Ironman game has one life and cannot be loaded from a slot.'); return; }
    if (!window.confirm(`Load the save from day ${info.day}? Your current game will be replaced.`)) return;
    if (loadFromSlot(n)) { blockSaves(); window.location.reload(); }
    else window.alert('That slot could not be loaded. The storage on this phone may be full.');
  };
  const slotClear = (n: number) => {
    if (!window.confirm('Clear this save slot? This cannot be undone.')) return;
    clearSlot(n); refreshSlots();
  };
  // the stall, the merchant and the next few customers are fetched ahead, so nobody pops in late
  useEffect(() => { if (g.started) preloadStall(g.queue.slice(g.visitIdx, g.visitIdx + 3)); }, [g.started, g.queue, g.visitIdx]);
  const [phase, setPhase] = useState<Phase>('title');
  const [titleOpts, setTitleOpts] = useState(false);
  const [sbx, setSbx] = useState<'' | 'choose' | 'yourself'>('');
  // a Sandbox is always a new game: an existing save is kept in a free slot first
  // the new-game chooser: which mode was picked first ('any' opens it with none picked)
  const [chooser, setChooser] = useState<Mode | 'any' | null>(null);
  /** Copy the game in play into slot n. False if it could not be kept (storage full). An Ironman
   *  run is never copied: a copy could be loaded after a death. */
  const keepInSlot = (n: number): boolean => {
    if (useGame.getState().ironman) return false;
    forceSave();
    const ok = saveToSlot(n, failedNow() ? memorySave(useGame.getState(), SAVE_VERSION) : undefined) && !!readSlots()[n - 1];
    refreshSlots();
    return ok;
  };
  /** A new game in place of the one in play, with saving on (and Ironman set as chosen). */
  const freshGame = (ironman: boolean) => {
    const st = useGame.getState();
    if (st.started) st.reset();
    useGame.getState().setIronman(ironman);
    useGame.getState().setAutosave(true);
  };
  // returns a message when the game cannot start (the current one could not be kept)
  const startMode = (mode: Mode, keepIn: number | null, sim: SimSettings): string | void => {
    audio.ensure();
    if (keepIn && useGame.getState().started) {
      if (useGame.getState().ironman) return 'An Ironman run cannot be kept in a save slot. Start without keeping it, or go back.';
      if (!keepInSlot(keepIn)) { setSaveWarn(true); return "The storage on this phone is full: your game could not be kept. Make a backup file of it first, then start."; }
    }
    freshGame(mode === 'ironman');
    setChooser(null);
    useGame.getState().setSim(sim);
    if (mode === 'sandbox') setSbx('choose');
    else setPhase(introSeen() ? 'dayone' : 'documentary');
  };
  // a Sandbox is always a new game: a game still in play is kept in a free slot first (never over another one)
  const freshForSandbox = (): boolean => {
    const st = useGame.getState();
    if (!st.started) { freshGame(false); return true; }
    if (!st.ironman) {
      const free = readSlots().findIndex((x) => !x) + 1;
      if (!free || !keepInSlot(free)) { window.alert('Your game could not be kept: there is no free save slot, or the storage on this phone is full. Make a backup file of it first.'); return false; }
    }
    freshGame(false);
    return true;
  };
  const guideNext = g.started ? guideTarget(g as unknown as Parameters<typeof guideTarget>[0]) : null;
  const [titleBg, setTitleBg] = useState(() => TITLE_BGS[Math.floor(Math.random() * TITLE_BGS.length)]);
  // the map is home; the stall screen is only for a sale in progress and for the first day's lesson
  const [tab, setTab] = useState<Tab>('map');
  const [settings, setSettings] = useState(false);
  // the settings panel keeps the keyboard inside it (Tab cycles, Esc closes) and takes focus when it opens
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (settings) setTimeout(() => settingsRef.current?.querySelector<HTMLElement>('[data-testid=settings-close]')?.focus(), 0); }, [settings]);
  const trapSettings = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); setSettings(false); return; }
    if (e.key !== 'Tab' || !settingsRef.current) return;
    const f = [...settingsRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, a[href], [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
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
  const toastRef = useRef<((m: string) => void) | null>(null);
  // reading the day's paper takes a quarter of an hour, and the player is told so rather than finding the clock moved
  const openPaper = () => { const st = useGame.getState(); setPaper(st.day); if ((st.paperSeen ?? 0) < st.day) { useGame.setState({ paperSeen: st.day }); st.passTime(15); toastRef.current?.('You read the paper over a glass of tea: a quarter of an hour passes.'); } };
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
  // "See Dr Feras" while in Cairo: make sure Cairo's town is on screen; its panel opens the clinic when it sees the event
  useEffect(() => {
    const on = () => { window.setTimeout(() => { if (!document.querySelector('[data-testid=town-menu], [data-testid=settlement]')) { mapGo({ view: 'world', panel: 'cairo', tab: 'town' }); window.setTimeout(() => window.dispatchEvent(new CustomEvent(CLINIC_EVENT, { detail: 'now' })), 600); } }, 60); };
    const h = (e: Event) => { if ((e as CustomEvent).detail !== 'now') on(); };
    window.addEventListener(CLINIC_EVENT, h);
    return () => window.removeEventListener(CLINIC_EVENT, h);
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
  const [loadOpen, setLoadOpen] = useState(false);
  const toastTimer = useRef<number>();
  const illCount = useRef((g.illnesses ?? []).length);
  useEffect(() => {
    const n = (g.illnesses ?? []).length;
    if (n > illCount.current) toast('You have fallen ill. Tap the strip under the header, or see Dr Feras in Cairo.');
    illCount.current = n;
  }, [(g.illnesses ?? []).length]); // eslint-disable-line react-hooks/exhaustive-deps
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
  };  toastRef.current = toast;

  const tutorialActive = !g.tutorial.done;
  const firstDays = !!openingStep(g);
  // the first-day tour points at the button to press next
  // (not while the opening runs: its own steps say what to do, and two guides glowing at once confused testers)
  const tourStep = g.tutorial.done && !firstDays ? (['buyers', 'news', 'radio', 'rashid', 'map'] as const).find((k) => !g.onboard?.[k]) : undefined;
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
  // Once per customer: a buyer who arrives and leaves at once (nothing at their level) is still shown, with
  // the reason, but a finished sale never pulls the player back once they have gone elsewhere.
  const shownEnc = useRef<string | null>(null);
  if (tab === 'stall' && g.encounter) shownEnc.current = g.encounter.id;
  useEffect(() => {
    if (phase === 'game' && g.encounter && !g.encounter.venue && tab === 'map' && g.world.at === 'giza' && shownEnc.current !== g.encounter.id) {
      shownEnc.current = g.encounter.id;
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

  const soundTimers = useRef<number[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const enterGame = () => {
    audio.ensure();
    // warm the cache for the paintings shown first, so nothing pops in; a city's painting loads when you go there
    preload([...STALL_ART, ...g.queue.slice(g.visitIdx).flatMap(buyerArt)], true);
    voice.load().then(() => voice.preload(['seller', 'samira'])); // a 4 KB read each: lines are fetched one by one
    // the travel map is big: fetch it once the stall and the first buyer are in, unless you open the world first
    afterFirstSale(() => paintedMap());
    // the sounds wait a little: on a slow phone line they would otherwise download alongside (and hold up)
    // the stall and the first buyer's pictures
    // (cancelled if the player goes back to the menu before they fire: music must not start on the title)
    soundTimers.current.forEach((t) => clearTimeout(t));
    soundTimers.current = [];
    if (g.settings.ambience) soundTimers.current.push(window.setTimeout(() => { if (phaseRef.current === 'game') audio.startAmbience(); }, 5000));
    if (g.settings.music) soundTimers.current.push(window.setTimeout(() => { if (phaseRef.current === 'game') audio.startMusic('stall'); }, 12000));
    setPhase('game');
    setTab('map');
  };

  // The phone's back gesture (and Escape) closes what is open, one thing at a time, and never leaves the
  // game: it used to take the player out of the page altogether. Order: this screen's own panels first
  // (they listen for Escape), then the game's overlays, then back to the map.
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (settings) { setSettings(false); return true; }
    if (paper !== null) { setPaper(null); return true; }
    if (radioOpen) { setRadioOpen(false); return true; }
    if (gramophoneOpen) { setGramophoneOpen(false); return true; }
    if (cal) { setCal(false); return true; }
    if (finance) { setFinance(false); return true; }
    if (guide) { setGuide(false); return true; }
    if (upgradesOpen) { setUpgradesOpen(false); return true; }
    if (how !== null) { setHow(null); return true; }
    // panels kept inside other screens (the rug inspector, the Objectives and Jobs panel): press their own close button
    const inner = [...document.querySelectorAll<HTMLButtonElement>('[data-testid=inspector-close]:not([disabled]), [data-testid=obj-close]')].filter((b) => b.offsetParent !== null).pop();
    if (inner) { inner.click(); return true; }
    // the world map's trip card (a planned route) and its change-of-course card: Cancel / Keep going.
    // They are not dialogs and the map does not listen for Escape, so their own button is pressed.
    if (tab === 'map') {
      const vis = (b: Element | null | undefined): b is HTMLButtonElement => !!b && (b as HTMLElement).offsetParent !== null && !(b as HTMLButtonElement).disabled;
      const keep = document.querySelector('[data-testid=reroute-keep]');
      if (vis(keep)) { keep.click(); return true; }
      const card = document.querySelector('[data-testid=travel]')?.closest('.wc-col, .wc-row');
      const cancel = card && [...card.querySelectorAll('button')].find((b) => /^(Cancel|OK)$/.test((b.textContent ?? '').trim()));
      if (vis(cancel)) { cancel.click(); return true; }
    }
    if (tab !== 'map' && !(tab === 'stall' && g.encounter && !g.encounter.outcome)) { setTab('map'); return true; }
    return false;
  };
  useEffect(() => {
    if (phase !== 'game') return;
    const push = () => { try { history.pushState({ tof: Date.now() }, ''); } catch { /* not allowed */ } };
    push();
    const onPop = () => {
      // a panel deeper in the page (a buyer's card, the wardrobe, a film) gets the first chance, as Escape
      // (the Objectives panel is a region, not a dialog, so it is looked for by name)
      const PANELS = '[role=dialog], .overlay, [data-testid=objectives], [data-testid=inspector]';
      const open = () => document.querySelectorAll(PANELS).length;
      const before = open();
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      const target = ([...document.querySelectorAll('[role=dialog], [data-testid=objectives]')].pop() as HTMLElement | undefined) ?? document.body;
      target.dispatchEvent(ev);
      push();
      // nothing closed itself: the game steps back
      window.setTimeout(() => { if (!ev.defaultPrevented && open() >= before) backRef.current(); }, 60);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && e.isTrusted) { if (backRef.current()) e.preventDefault(); } };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey); };
  }, [phase]);

  const date = dateFor(g.day);
  // the night's summary card is up (the same test DaySummary makes before it shows itself)
  const summaryUp = !!g.lastSummary && !g.lastSummary.seen && (g.lastSummary.notes.some((n) => n.trim()) || g.lastSummary.sales > 0 || g.lastSummary.revenue > 0);
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
            {/* one row per kind of sound: switch it on or off, and set how loud */}
            <div className="vol-sliders" data-testid="volume-sliders">
              {([
                ['master', null, 'All sound', ''],
                ['music', 'music', 'Music', 'Oud and drone'],
                ['dialogue', 'dialogue', 'Voices', 'Recorded characters'],
                ['sfx', 'sfx', 'Effects', 'Rugs, coins, tea'],
                [null, 'ambience', 'Background', 'Market crowd, birds (as loud as Effects)'],
              ] as [keyof Volumes | null, Channel | null, string, string][]).map(([k, c, l, d]) => {
                const v = k ? (g.volumes ?? DEFAULT_VOLUMES)[k] : 0;
                return (
                  <div className="vol-row sound-row" key={l}>
                    <span>{l}{d && <small>{d}</small>}</span>
                    {k ? <input type="range" min={0} max={100} step={5} value={Math.round(v * 100)} disabled={!!c && !g.settings[c]} onChange={(e) => g.setVolume(k, Number(e.target.value) / 100)} aria-label={`${l} volume`} data-testid={`vol-${k}`} /> : <i />}
                    {c ? <button className="switch" role="switch" aria-checked={g.settings[c]} aria-label={l} onClick={() => g.setSetting(c, !g.settings[c])} data-testid={`toggle-${c}`}><i>Off</i><i>On</i></button> : <b>{Math.round(v * 100)}</b>}
                  </div>
                );
              })}
            </div>
    </>
  );

  // on every screen: the game open in another tab, and a save that could not be written
  const guardUi = (
    <>
      {otherTab && (
        <div className="tab-guard" role="alertdialog" aria-modal="true" aria-label="Open in another tab" data-testid="other-tab">
          <div className="crash-card">
            <h2>This game is open in another tab</h2>
            <p>Your game was saved from another tab or window of this browser. So as not to write over it, this tab has stopped saving.</p>
            <p className="crash-dim">Reload to carry on here from where the other tab left off.</p>
            <div className="crash-btns">
              <button className="btn primary" onClick={() => window.location.reload()} data-testid="other-tab-reload">Continue here (reload)</button>
              {g.started && <button className="btn" onClick={downloadSave} data-testid="other-tab-backup">Keep this tab's game as a backup file</button>}
            </div>
          </div>
        </div>
      )}
      {saveWarn && saveFail && !otherTab && (
        <div className="save-warn" role="alert" data-testid="save-warning">
          <span><b>{FULL_MSG}</b> What you do now is not being kept. Make a backup file so you do not lose this game.</span>
          <span className="save-warn-btns">
            <button className="btn primary" onClick={downloadSave} data-testid="save-warning-backup">Make a backup file</button>
            <button className="btn" onClick={() => setSaveWarn(false)} data-testid="save-warning-close">Close</button>
          </span>
        </div>
      )}
    </>
  );

  if (phase === 'documentary') return <><Documentary canSkip onEnd={() => { markIntroSeen(); setPhase('dayone'); }} />{guardUi}</>;
  if (phase === 'dayone')
    return (
      <>
      <DayOneCard
        onBegin={() => {
          g.beginDayOne();
          enterGame();
          setMapIntent({ view: 'district', stall: true, n: Date.now() });
          setTab('map');
        }}
      />
      {guardUi}
      </>
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
              <span>Sell to King Fuad at Abdeen (Cairo), Queen Nazli at Ras el-Tin (Alexandria), Emir Abdullah in Amman, King Faisal in Baghdad and Mustafa Kemal at Çankaya (Angora). Look for the crown on the World map, then open the town's Royal Court card.</span>
              <button className="ghost-btn" onClick={() => { enterGame(); setGuide(true); }} data-testid="take-tour">Take the quick tour</button>
            </div>
          )}
          <button className="ghost-btn opt-toggle" onClick={() => setTitleOpts((o) => !o)} aria-expanded={titleOpts} data-testid="title-options">{titleOpts ? 'Hide options' : '⚙ Options · sound and volume'}</button>
          {titleOpts && <div className="title-opts modal-card-like" data-testid="title-options-panel">{soundOptions}</div>}
          {g.started && g.ironman && <div className="iron-badge" data-testid="ironman-badge">⚔ Ironman · one life</div>}
          {g.started && g.playMode === 'sandbox' && <div className="iron-badge sbx-badge" data-testid="sandbox-badge">Sandbox · free play</div>}
          <div className="row">
            {g.started ? (
              <>
                <button className="big-btn" onClick={enterGame} data-testid="continue">
                  Continue · Day {g.day}
                </button>
                <button className="ghost-btn" onClick={() => setChooser('any')} data-testid="new-game">New game…</button>
              </>
            ) : (
              <>
                <button className="big-btn" onClick={() => { audio.ensure(); setPhase('documentary'); }} data-testid="play-opening">
                  Play Campaign
                </button>
                <button className="ghost-btn iron-open" onClick={() => setChooser('ironman')} data-testid="open-ironman">☠ Ironman · one life</button>
                <button className="ghost-btn sbx-open" onClick={() => setSbx('choose')} data-testid="open-sandbox">Sandbox · free play</button>
              </>
            )}
            <div className="title-links">
            {!g.started && introSeen() && (
              <button className="ghost-btn" onClick={() => { audio.ensure(); setPhase('dayone'); }} data-testid="skip-to-day">Skip to Day One</button>
            )}
            <button className="ghost-btn" onClick={() => openHowItPlays()} data-testid="title-how">▶ How it plays</button>
            <InstallButton className="ghost-btn" />
            <FullScreenButton className="ghost-btn" />
            {/* an Ironman run has one save: nothing can be loaded in its place */}
            {slots.some((s) => s) && !(g.started && g.ironman) && (
              <button className="ghost-btn" onClick={() => { refreshSlots(); setLoadOpen((o) => !o); }} data-testid="title-load-toggle">
                {loadOpen ? 'Hide saves' : 'Load a save'}
              </button>
            )}
            </div>
          </div>
          {chooser && <ModeChooser current={g.started ? { day: g.day, ironman: !!g.ironman } : null} slots={slots} onBackup={downloadSave} first={chooser === 'any' ? undefined : chooser} onStart={startMode} onClose={() => setChooser(null)} />}
          {sbx === 'choose' && <SandboxChoose onClose={() => setSbx('')} onHassan={() => { audio.ensure(); if (!freshForSandbox()) return; useGame.getState().startSandbox({ kind: 'hassan' }); setSbx(''); setPhase('dayone'); }} onYourself={() => setSbx('yourself')} />}
          {sbx === 'yourself' && <PlayAsYourself onClose={() => setSbx('')} onHassan={() => { audio.ensure(); if (!freshForSandbox()) return; useGame.getState().startSandbox({ kind: 'hassan' }); setSbx(''); setPhase('dayone'); }} onStart={(look) => { audio.ensure(); if (!freshForSandbox()) return; useGame.getState().startSandbox(look); setSbx(''); setPhase('dayone'); }} />}
          {loadOpen && !(g.started && g.ironman) && (
            <div className="slot-list" data-testid="title-slot-list">
              {slots.map((info, i) => info && (
                <div className="slot-row" key={i} data-testid={`title-slot-${i + 1}`}>
                  <span className="slot-info">{slotCrashed(info) ? crashedLabel(info) : slotLabel(info)}</span>
                  <span className="slot-btns">
                    {slotCrashed(info)
                      ? <button className="btn small" onClick={() => slotDownload(i + 1, info)} data-testid={`title-slot-download-${i + 1}`}>Download</button>
                      : info.mode === 'Ironman'
                      ? <small className="dim" data-testid={`title-slot-iron-${i + 1}`}>Ironman runs cannot be loaded</small>
                      : <button className="btn small" onClick={() => slotLoad(i + 1, info)} data-testid={`title-slot-load-${i + 1}`}>Load</button>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {!titleOpts && !chooser && <button className="title-place" onClick={() => setTitleBg((c) => { let n = c; while (n === c) n = TITLE_BGS[Math.floor(Math.random() * TITLE_BGS.length)]; return n; })} title="Show another picture" data-testid="title-shuffle">⟳ {titleBg.place}</button>}
        <div className="title-foot">TRADE · PEOPLE · STORIES</div>
        {howView}
        {guardUi}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hud">
        <button className="hud-place hud-cal" onClick={() => setCal(true)} aria-label="Open the calendar" data-testid="hud-calendar">
          <b>{g.world.at ? settlementById(g.world.at).name : 'Road'}</b>
          <span data-testid="map-clock">{clock(g.world.hour)} {dateFor(g.day).weekday.slice(0, 3)}{g.playMode === 'sandbox' ? <i className="hud-mode" data-testid="hud-sandbox"> · Sandbox</i> : g.ironman ? <i className="hud-mode iron" data-testid="hud-ironman"> · ☠ Ironman</i> : null}</span>
        </button>
        <div className="hud-stats">
          <button className={`hud-chip ${cashFlash ? 'flash' : ''}`} title="Your money. Tap to see what you can buy" onClick={() => { const at = useGame.getState().world.at; audio.sfx('tap'); if (at && at !== 'giza') mapGo({ view: 'world', panel: at, tab: 'market' }); else setTab('supplier'); }} disabled={tutorialActive} data-testid="hud-cash" data-pt={g.cash}>
            <Icon name="coin" />{fmt(g.cash)}
          </button>
          {inDebt && <button className="hud-chip hud-debt" onClick={() => setFinance(true)} title="You owe money that is overdue" data-testid="hud-debt">Debts</button>}
          <button className="hud-chip hud-rep" title="Your character: reputation, manner and skills" onClick={() => setTab('hero')} data-testid="hud-rep">
            <Icon name="star" />{g.reputation}
          </button>
          {/* always there; while the opening runs they don't pulse, so the step's own button is the one that calls */}
          <button className={`icon-btn buyers-btn ${tourStep === 'buyers' ? 'tour-target' : ''}`} onClick={() => { setMsub('customers'); setTab('ledger'); }} aria-label="Your buyers" disabled={tutorialActive} data-testid="buyers-btn"><Icon name="people" /></button>
          <button className={`icon-btn radio-btn ${(g.radioHeard ?? 0) < g.day && !firstDays ? 'nav-new' : ''} ${tourStep === 'radio' ? 'tour-target' : ''}`} onClick={() => setRadioOpen(true)} aria-label="The radio" data-testid="radio-btn"><Icon name="radio" /></button>
          <button className={`icon-btn paper-btn ${(g.paperSeen ?? 0) < g.day && !firstDays ? 'nav-new' : ''} ${tourStep === 'news' ? 'tour-target' : ''}`} onClick={openPaper} aria-label="Today's newspaper (a quarter of an hour)" data-testid="paper-btn"><Icon name="news" /></button>
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Save, sound and settings" data-testid="settings-btn">
            <Icon name="gear" />
          </button>
        </div>
      </header>

      {g.started && ruin.stage > 0 && !(tab === 'stall' && g.encounter) && (
        <button className={`ruin-banner ${finalStrike ? 'final' : ''}`} onClick={() => setFinance(true)} data-testid="ruin-banner">
          <div className="ruin-banner-text">
            <b>{finalStrike ? 'FINAL WARNING: ' : ''}{ruin.stage === 1 ? 'A lawyer has written' : 'The bailiff has been'}</b>
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

      {g.started && phase === 'game' && !tutorialActive && tab !== 'hero' && !(tab === 'stall' && g.encounter) && <HealthStrip />}

      {phase === 'game' && <GuideFlash />}
      {phase === 'game' && !(tab === 'stall' && g.encounter) && (() => {
        const fh = firstHourStep(g);
        return (
          <ObjectiveBar onMenu={() => { forceSave(); audio.stopAll(); setPhase('title'); }}
            onGo={(t) => t && chapterGo(t as Target)}
            firstHour={fh ? { text: fh.text, btn: fh.btn, n: fh.n, of: fh.of, skip: () => { if (window.confirm('Skip the opening? Every city opens now, and the step-by-step guide goes away.')) { g.seeTip(FIRST_HOUR_TIP); g.skipTutorial(); } }, go: () => (fh.go === 'stall' ? mapGo({ view: 'district', stall: true }) : chapterGo(fh.go as Target)) } : null}
          />
        );
      })()}
      {phase === 'game' && !(tab === 'stall' && g.encounter) && !tutorialActive && (() => {
        return <SideTasks onGo={(t) => planTrip(t)} />;
      })()}
      {phase === 'game' && !tutorialActive && !(tab === 'stall' && g.encounter) && !firstHourStep(g) && tab !== 'map' && <UpgradeNudge />}
      {phase === 'game' && tutorialActive && tab !== 'map' && !(tab === 'stall' && g.encounter) && (
        <button className="skip-lesson" onClick={() => g.skipTutorial()} data-testid="skip-lesson-nav">Skip the lesson</button>
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
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { if (id === 'ledger' && tourStep === 'buyers') setMsub('customers'); if (id === 'stall') { if (g.encounter) setTab('stall'); else if (g.world.at === 'giza') mapGo({ view: 'district', stall: true }); else setTab('stall'); } else setTab(id); audio.sfx('tap'); }} disabled={tutorialActive && id === 'caravan'} data-testid={`nav-${id}`} className={`${id === 'map' ? `nav-world ${!g.guideSeen && !tutorialActive ? 'beckon' : ''}` : id === 'ledger' && tab !== 'ledger' && progressScore(g) > (g.merchantSeen ?? 0) ? 'nav-new' : ''} ${tourStep && tourNav[tourStep] === id ? 'tour-target' : ''} ${id === 'map' && tab !== 'map' && guideNext?.city ? 'tour-target' : ''}`}>
            {icon === 'face' ? <img className="nav-face" src={lookFor(g.heroLook) ?? 'art/hero/hero-face-small.webp'} alt="" /> : <Icon name={icon} />}
            {label}
          </button>
        ))}
      </nav>

      {g.rescue && <Rescue />}
      {/* one card at a time: the night's summary first, then a job offer waiting from before */}
      {phase === 'game' && !g.rescue && <><DaySummary />{!summaryUp && <JobOffer />}</>}
      {settings && (
        <div className="overlay" onClick={() => setSettings(false)}>
          <div className="modal-card settings-card" onClick={(e) => e.stopPropagation()} data-testid="settings" role="dialog" aria-modal="true" aria-label="Your game" ref={settingsRef} onKeyDown={trapSettings}>
            <div className="settings-head">
              <h2>Your game <small>{g.ironman ? '☠ Ironman' : g.playMode === 'sandbox' ? 'Sandbox' : 'Campaign'}</small></h2>
              <button className="btn" onClick={() => setSettings(false)} data-testid="settings-close" aria-label="Close">Close ×</button>
            </div>
            {/* saving, in plain words: what happens on its own, one Save button, separate games in slots,
                and a backup file for moving to another phone (folded away: most people never need it) */}
            <h3 className="set-h">Saving</h3>
            {saveFail || otherTab ? (
              <p className="save-status save-failed" data-testid="save-status">
                {otherTab ? 'This game is open in another tab, so this tab has stopped saving.' : <><b>{FULL_MSG}</b> Nothing you do now is kept. Make a backup file so you do not lose this game, then empty a save slot or clear space on the phone.</>}
                <br /><button className="btn" onClick={downloadSave} data-testid="save-failed-backup">Make a backup file</button>
              </p>
            ) : (
              <p className="save-status" data-testid="save-status">
                {g.ironman ? 'Ironman: the game saves itself after every move. There is one save, and no going back.'
                  : g.autosaveOn === false ? 'Saving on its own is off. Tap Save before you stop, or you lose what you did.'
                  : 'Your game saves itself as you play.'}
                {savedAt ? <> <b>Saved at {savedAt}.</b></> : null}
              </p>
            )}
            <div className="save-row">
              <button className="btn primary" onClick={() => { forceSave(); window.setTimeout(() => { if (failedNow()) { setSaveFail(true); setSaveWarn(true); toast(FULL_MSG); } else { setSaveFail(false); setSavedAt(stamp()); audio.sfx('tap'); } }, 0); }} data-testid="save-now">Save</button>
            </div>
            <div className="toggle-row">
              <span>
                Save on its own
                <small>{g.ironman ? 'Always on in Ironman.' : 'After everything you do.'}</small>
              </span>
              <button className="switch" role="switch" aria-checked={g.ironman ? true : g.autosaveOn !== false} aria-label="Save on its own" disabled={!!g.ironman} onClick={() => { if (!g.ironman) g.setAutosave(!(g.autosaveOn !== false)); }} data-testid="toggle-autosave"><i>Off</i><i>On</i></button>
            </div>
            {!g.ironman && (
              <>
                <h3 className="set-h">Other games ({SLOT_COUNT} slots)</h3>
                <p className="dim">To keep this game and try something else: <b>Save here</b> copies it into a slot. <b>Load</b> goes back to it later.</p>
                <div className="slot-list" data-testid="slot-list">
                  {slots.map((info, i) => {
                    const n = i + 1;
                    return (
                      <div className="slot-row" key={n} data-testid={`slot-${n}`}>
                        <span className="slot-info">{info ? (slotCrashed(info) ? crashedLabel(info) : slotLabel(info)) : `Slot ${n}: empty`}</span>
                        <span className="slot-btns">
                          <button className="btn small" onClick={() => { if (info && !window.confirm(`Slot ${n} has ${slotLabel(info)}. Put your game in its place? The old one is lost.`)) return; slotSave(n); }} data-testid={`slot-save-${n}`}>{info ? 'Save over' : 'Save here'}</button>
                          {info && slotCrashed(info) && <button className="btn small" onClick={() => slotDownload(n, info)} data-testid={`slot-download-${n}`}>Download</button>}
                          {info && info.mode !== 'Ironman' && !slotCrashed(info) && <button className="btn small" onClick={() => slotLoad(n, info)} data-testid={`slot-load-${n}`}>Load</button>}
                          {info && <button className="btn small ghost-btn" onClick={() => slotClear(n)} data-testid={`slot-clear-${n}`} aria-label={`Empty slot ${n}`}>Empty</button>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <details className="save-where" data-testid="save-where">
                  <summary>Move your game to another phone or computer</summary>
                  <p className="dim">Saves stay in this browser only. To carry a game elsewhere, make a backup file, send it to the other device, and open it there.</p>
                  <div className="save-row">
                    <button className="btn" onClick={downloadSave} data-testid="save-download">Make a backup file</button>
                    <label className="btn" data-testid="save-load">Open a backup file<input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadSave(f); e.target.value = ''; }} /></label>
                  </div>
                  <p className="dim">Clearing this site's data in the browser deletes every save here, so keep a backup file of a game you care about.</p>
                </details>
              </>
            )}
            {soundOptions}
            <SimOptions value={g.sim ?? FULL_SIM} onChange={g.setSim} locked={!!g.ironman} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => { setSettings(false); setGuide(true); }} data-testid="guide-btn">Guided tour of the screens</button>
              <button className="btn" onClick={() => { setSettings(false); openHowItPlays(); }} data-testid="how-btn">▶ How it plays</button>
              <InstallButton />
              <FullScreenButton />
              <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setSettings(false)}>Close</button>
            </div>
            <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => { if (g.autosaveOn === false && !g.ironman && window.confirm('Save your game before going to the menu? (OK saves it; Cancel leaves without saving what you did since your last save.)')) forceSave(); audio.stopAll(); setSettings(false); setPhase('title'); }} data-testid="menu-btn">⌂ Return to main menu <small style={{ opacity: 0.7 }}>{g.autosaveOn === false && !g.ironman ? '(asks to save first)' : '(your game is saved)'}</small></button>
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
      {guardUi}
    </div>
  );
}

