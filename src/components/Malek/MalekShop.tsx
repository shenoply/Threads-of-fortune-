// Malek's grill shop: the visit picture at the door, then the painted room (2.5D, like Arran's lab),
// the menu with a confirm step that shows exactly what you pay and get, food parcels to carry, and his
// remarks. The whole module is loaded with React.lazy from the Giza district.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, clock } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { MALEK_MENU, malekItem, type MalekItem, type MalekItemId } from '../../data/malekMenu';
import { CONDITION_START } from '../../game/systems/fieldwork';
import {
  MALEK_HOURS, MEAL_MINUTES, MORALE_PATIENCE, SCENE_ART, SCENE_TEXT, STORY, UNAVAILABLE_WORD,
  availability, eatServing, fedOf, parcelDays, parcelWeight, shopOpen, stockLeft, waterOf, wellFedNow,
  TOPIC_LABEL, storyStageFor, tabCovers, topicsFor, type MalekScene, type StoryStage, type MealReport, type TalkTopic,
} from '../../game/systems/malek';
import { RUGS } from '../../data/rugs';
import { rugSrc } from '../RugViewer/rugArt';
import { audio } from '../../game/audio/engine';
import { newUid } from '../../game/economy/economy';
import { MalekRoom2D, type Hotspot } from './MalekRoom2D';
import { MalekMutter } from './MalekMutter';
import { MalekMenuBook, piastres } from './MalekMenuBook';
import { Cutscene } from './Cutscene';
import { STORY_FILM } from './storyFilm';

const STORY_STILL_SOUND: Record<number, { bed: string; who: string; line: string }> = {
  4: { bed: 'audio/malek/cutscene-reward.mp3', who: 'MALEK', line: "Good lad. You've earned a shawarma." },
};
import { IntroFilm, filmReady, filmDue } from '../IntroFilm/IntroFilm';
import './MalekShop.css';

/** One part of Malek's story. As it happens it cannot be skipped by a stray tap: the film has no Skip
 *  and Continue appears only when it has ended; a painted part shows Continue after a moment to read.
 *  "Not now" keeps the part for the next time you sit down. Watched again from "The story so far",
 *  it can be skipped and changes nothing. */
function StoryView({ stage, replay, onContinue, onLater, onClose }: { stage: StoryStage; replay?: boolean; onContinue?: () => void; onLater?: () => void; onClose?: () => void }) {
  const film = STORY_FILM[stage.n];
  const still = STORY_STILL_SOUND[stage.n];
  const [ready, setReady] = useState(!!replay);
  useEffect(() => {
    if (replay || film) return;
    const t = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(t);
  }, [replay, film]);
  const buttons = replay
    ? <button className="btn primary" onClick={onClose} data-testid="malek-replay-close">Back</button>
    : (
      <>
        <button className="btn primary" disabled={!ready} onClick={onContinue} data-testid="malek-story-done">{ready ? 'Continue' : film ? 'Watching…' : 'Reading…'}</button>
        {!film || ready ? <button className="btn" onClick={onLater} data-testid="malek-story-later">Not now</button> : null}
      </>
    );
  if (film) {
    return (
      <div className="malek" role="dialog" aria-label={stage.title} data-testid="malek-shop">
        <div className="malek-film" data-testid={replay ? 'malek-replay' : 'malek-story'} data-stage={stage.n}>
          <Cutscene shots={film} title={stage.title} skippable={!!replay} onEnd={() => setReady(true)} />
          <div className="malek-film__card">
            <h2>{stage.title}</h2>
            {stage.text.map((t, i) => <p key={i}>{t}</p>)}
            <div className="malek-row">{buttons}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="malek" role="dialog" aria-label={stage.title} data-testid="malek-shop">
      <div className="malek-door" data-testid={replay ? 'malek-replay' : 'malek-story'} data-stage={stage.n}>
        <img src={stage.art!} alt={stage.title} className="malek-door__bg" />
        {still && <StillSound src={still.bed} />}
        {still && <p className="malek-still-line" data-testid="malek-still-line"><b>{still.who}</b> {still.line}</p>}
        <div className="malek-door__card">
          <h2>{stage.title}</h2>
          {stage.text.map((t, i) => <p key={i}>{t}</p>)}
          <div className="malek-row">{buttons}</div>
        </div>
      </div>
    </div>
  );
}

/** a story picture's sound: the room, once, at the effects volume; stops when the card goes */
function StillSound({ src }: { src: string }) {
  useEffect(() => {
    const vol = audio.toggles.sfx ? audio.volumes.master * audio.volumes.sfx : 0;
    if (vol <= 0) return;
    const a = new Audio(src); a.volume = Math.min(1, vol);
    a.play().catch(() => {});
    return () => a.pause();
  }, [src]);
  return null;
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
/** the effects line for an item, in the game's own terms */
function effectChips(it: MalekItem) {
  const e = it.effects;
  const out: string[] = [];
  if (e.satiety) out.push(`Fed ${sign(e.satiety)}`);
  if (e.energy) out.push(`Fatigue −${e.energy}`);
  if (e.morale) out.push(`Well fed: buyers +${e.morale * MORALE_PATIENCE} patience, 4 h`);
  if (e.hydration) out.push(`Water ${sign(e.hydration)}`);
  return out;
}

type Panel = 'menu' | 'food' | 'talk' | null;

export default function MalekShop({ onLeave }: { onLeave: () => void }) {
  const g = useGame();
  const [phase, setPhase] = useState<'door' | 'story' | 'room'>('door');
  const [visit, setVisit] = useState<{ scene: MalekScene; line: string; stage: number | null } | null>(null);
  const [speech, setSpeech] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<{ id: MalekItemId; order: string } | null>(null);
  const [replay, setReplay] = useState<number | null>(null);
  const [storyList, setStoryList] = useState(false);
  const [result, setResult] = useState<{ msg: string; report?: MealReport; title: string } | null>(null);
  // the film plays by itself the first time the shop is open to you; "Watch the film again" replays it
  const [film, setFilm] = useState(() => filmDue('malek', useGame.getState().introSeen));
  const open = shopOpen(g.world.hour);

  // one visit per opening of the shop: the picture, his greeting, and a story stage if one is due
  const entered = useRef(false);
  useEffect(() => {
    if (entered.current || !open) return;
    entered.current = true;
    const v = useGame.getState().malekEnter();
    setVisit(v);
    if (v.stage != null) setPhase('story');
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (confirm) setConfirm(null); else onLeave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLeave, confirm]);

  const now = g.day * 24 + g.world.hour;
  const cond = g.condition ?? CONDITION_START;
  const fedNow = wellFedNow(cond, now);
  const rugType = g.malek?.rug ? RUGS[g.malek.rug] : undefined;
  const rugImg = useMemo(() => (rugType ? rugSrc(rugType) : undefined), [rugType]);

  // the book closes once an order goes through, so the plate arrives in the room
  useEffect(() => { if (result) setPanel((p) => (p === 'menu' ? null : p)); }, [result]);

  const talkTurn = useRef(Math.floor(Math.random() * 6));
  const say = (ctx: Parameters<typeof g.malekSay>[0]) => setSpeech(useGame.getState().malekSay(ctx));
  const pickHotspot = (h: Hotspot) => {
    audio.sfx('tap');
    if (h === 'exit') { onLeave(); return; }
    if (h === 'menu') { setPanel('menu'); say('menu'); return; }
    if (h === 'tables') {
      // sitting down is when the story happens: one part of it each visit
      const stage = useGame.getState().malekSit();
      if (stage != null && visit) { setVisit({ ...visit, stage }); setPhase('story'); return; }
      setPanel('menu'); setSpeech('You sit down. The stool is as bad as he said.'); return;
    }
    if (h === 'grill') { setPanel('menu'); say(g.world.hour >= 20 ? 'grillCold' : 'grill'); return; }
    // tapping him: a different topic each time, round the six
    const topics = topicsFor(useGame.getState().malek);
    talkTurn.current = (talkTurn.current + 1) % topics.length;
    say(topics[talkTurn.current]);
  };

  const paying = useRef(false);
  const ask = (id: MalekItemId) => { paying.current = false; setConfirm({ id, order: newUid('o') }); audio.sfx('tap'); };
  const pay = (useTab = false) => {
    // the order token stops a second charge in the store; this stops a second result sheet
    if (!confirm || paying.current) return;
    paying.current = true;
    const it = malekItem(confirm.id);
    const r = useGame.getState().malekBuy(confirm.id, confirm.order, useTab);
    setConfirm(null);
    setResult({ msg: r.msg, report: r.report, title: r.ok ? (it.consumption === 'inventory' ? `${it.name}: in your pack` : it.name) : 'Not this time' });
    setSpeech(r.msg);
  };
  const eat = (uid: string) => {
    const r = useGame.getState().eatParcel(uid);
    setResult({ msg: r.msg, report: r.report, title: r.ok ? 'A serving from your pack' : 'Not this time' });
    audio.sfx('tap');
  };

  if (film && open) return <IntroFilm id="malek" title="Malek's grill · Giza, 1925" onDone={() => { useGame.getState().markIntroSeen('malek'); setFilm(false); }} />;

  // ---------------- the door: closed, or the visit picture ----------------
  if (!open) {
    return (
      <div className="malek" role="dialog" aria-label="Malek's grill" data-testid="malek-shop">
        <div className="malek-door" data-testid="malek-closed">
          <img src={SCENE_ART.closing} alt="" aria-hidden="true" className="malek-door__bg" />
          <div className="malek-door__card">
            <h2>Malek's grill</h2>
            <p>The shutters are down. Malek opens at {clock(MALEK_HOURS[0])} and the grill goes cold at 20:00; he locks up at {clock(MALEK_HOURS[1])}.</p>
            <button className="btn primary" onClick={onLeave} data-testid="malek-leave">Back to the street</button>
          </div>
        </div>
      </div>
    );
  }
  if (!visit) return <div className="malek" data-testid="malek-shop" />;

  const storyStage = visit.stage != null ? STORY.find((s) => s.n === visit.stage) : undefined;
  // a part of the story, as it happens (it counts once you continue) or watched again (it changes nothing)
  if (phase === 'story' && storyStage?.art) {
    return <StoryView stage={storyStage} onContinue={() => { useGame.getState().malekStoryDone(storyStage.n); setPhase('room'); }} onLater={() => setPhase('room')} />;
  }
  if (replay != null) {
    const st = STORY.find((x) => x.n === replay);
    if (st) return <StoryView stage={st} replay onClose={() => setReplay(null)} />;
  }
  if (phase === 'door' && storyList) {
    const done = STORY.filter((x) => g.malek?.story.completed.includes(x.n));
    return (
      <div className="malek" role="dialog" aria-label="The story so far" data-testid="malek-shop">
        <div className="malek-door" data-testid="malek-story-list">
          <img src={SCENE_ART[visit.scene]} alt="" aria-hidden="true" className="malek-door__bg" />
          <div className="malek-door__card">
            <h2>The story so far</h2>
            <div className="malek-row malek-row--col">
              {done.map((x) => <button key={x.n} className="btn" onClick={() => setReplay(x.n)} data-testid={`malek-replay-${x.n}`}>{x.n}. {x.title}{STORY_FILM[x.n] ? ' ▶' : ''}</button>)}
            </div>
            <div className="malek-row"><button className="btn primary" onClick={() => setStoryList(false)} data-testid="malek-story-list-close">Back</button></div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'door') {
    return (
      <div className="malek" role="dialog" aria-label="Malek's grill" data-testid="malek-shop">
        <div className="malek-door" data-testid="malek-door" data-scene={visit.scene}>
          <img src={SCENE_ART[visit.scene]} alt={SCENE_TEXT[visit.scene]} className="malek-door__bg" />
          <MalekMutter />
          <div className="malek-door__card">
            <p className="malek-door__scene">{SCENE_TEXT[visit.scene]}</p>
            <p className="malek-say"><b>MALEK</b> {visit.line}</p>
            <div className="malek-row">
              <button className="btn primary" onClick={() => { setPhase('room'); audio.sfx('tap'); }} data-testid="malek-enter">Step inside</button>
              <button className="btn" onClick={() => { setPhase('room'); setPanel('menu'); }} data-testid="malek-door-menu">Straight to the menu</button>
              <button className="btn" onClick={onLeave} data-testid="malek-leave">Leave</button>
              {filmReady('malek') && <button className="btn" onClick={() => setFilm(true)} data-testid="malek-film-again">Watch the film again</button>}
              {!!g.malek?.story.completed.length && <button className="btn" onClick={() => setStoryList(true)} data-testid="malek-story-so-far">The story so far</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- inside ----------------
  const parcels = g.parcels ?? [];
  const tab = g.malek?.tab ?? 0;
  return (
    <div className="malek" role="dialog" aria-label="Malek's grill" data-testid="malek-shop">
      <header className="malek-bar">
        <div><b>Malek's grill</b><span>Giza · {clock(g.world.hour)}</span></div>
        <span className="malek-cash" data-testid="malek-cash">{fmt(g.cash)}</span>
        <button className="btn" onClick={onLeave} data-testid="malek-leave">Leave</button>
      </header>
      <div className="malek-stage" data-testid="malek-stage">
        <MalekRoom2D scene={visit.scene} onPick={pickHotspot} rug={rugImg} coldGrill={g.world.hour >= 20} storyDue={!!g.malek && storyStageFor(g.malek.story, g.malek.visits) != null} />
        <p className="malek-hint" aria-hidden="true">Drag to look around · tap a mark</p>
        {speech && <div className="malek-speech" role="status" data-testid="malek-speech"><b>MALEK</b> {speech}</div>}
        <MalekMutter quiet={!!confirm || !!result} />
      </div>

      <div className="malek-panel">
        <div className="malek-meters" data-testid="malek-meters">
          <span title="How well fed you are">Fed {fedOf(cond)}/100</span>
          <span title="Fatigue: lower is better">Fatigue {cond.fatigue}</span>
          <span title="Water">Water {waterOf(cond)}/100</span>
          {fedNow > 0 && <span className="is-good">Well fed until {clock((cond.wellFed!.until) % 24)}</span>}
        </div>
        <div className="malek-tabs" role="tablist">
          <button role="tab" aria-selected={panel === 'menu'} className={panel === 'menu' ? 'is-on' : ''} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} data-testid="malek-tab-menu">Menu</button>
          <button role="tab" aria-selected={panel === 'food'} className={panel === 'food' ? 'is-on' : ''} onClick={() => setPanel(panel === 'food' ? null : 'food')} data-testid="malek-tab-food">Your parcels{parcels.length ? ` · ${parcels.reduce((n, p) => n + p.servings, 0)}` : ''}</button>
          <button role="tab" aria-selected={panel === 'talk'} className={panel === 'talk' ? 'is-on' : ''} onClick={() => setPanel(panel === 'talk' ? null : 'talk')} data-testid="malek-talk">Talk to Malek</button>
        </div>
        {panel === 'menu' && <MalekMenuBook hour={g.world.hour} day={g.day} malek={g.malek} onOrder={ask} onClose={() => setPanel(null)} />}
        {panel === 'talk' && (
          <div className="malek-topics" data-testid="malek-topics">
            {topicsFor(g.malek).map((t) => <button key={t} className="btn small" onClick={() => { audio.sfx('tap'); say(t); }} data-testid={`malek-topic-${t}`}>{TOPIC_LABEL[t]}</button>)}
          </div>
        )}
        {panel === 'food' && (
          <ul className="malek-menu" data-testid="malek-parcels">
            {!parcels.length && <li className="malek-note">You are not carrying any parcels.</li>}
            {parcels.map((p) => {
              const it = malekItem(p.item);
              return (
                <li key={p.uid} data-testid={`malek-parcel-${p.uid}`}>
                  <div className="malek-item__head"><b>{it.name}</b><span className="malek-price">{p.servings} left</span></div>
                  <p className="malek-meta">{parcelWeight(p)} kg · good until day {p.spoilsDay} (game freshness)</p>
                  <p className="malek-chips">{effectChips(it).map((c) => <span key={c}>{c} each</span>)}</p>
                  <button className="btn small" onClick={() => eat(p.uid)} data-testid={`malek-eat-${p.uid}`}>Eat a serving</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirm && <ConfirmSheet id={confirm.id} onPay={pay} onCancel={() => setConfirm(null)} />}
      {result && (
        <div className="malek-sheet" role="dialog" aria-label={result.title} data-testid="malek-result">
          <div className="malek-sheet__card">
            <h3>{result.title}</h3>
            <p className="malek-say"><b>MALEK</b> {result.msg}</p>
            {result.report && <ReportLines r={result.report} />}
            <button className="btn primary" onClick={() => setResult(null)} data-testid="malek-result-ok">Good</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What you pay and what you get, worked out on your current state before any money moves. */
function ConfirmSheet({ id, onPay, onCancel }: { id: MalekItemId; onPay: (useTab?: boolean) => void; onCancel: () => void }) {
  const g = useGame();
  const it = malekItem(id);
  const preview = it.consumption === 'eat_in' ? eatServing(g.condition, it, g.day * 24 + g.world.hour).report : null;
  const [busy, setBusy] = useState(false);
  return (
    <div className="malek-sheet" role="dialog" aria-label={`Buy ${it.name}`} data-testid="malek-confirm">
      <div className="malek-sheet__card">
        <h3>{it.name} <span className="malek-ar" lang="ar" dir="rtl">{it.nameAr}</span></h3>
        <dl className="malek-dl">
          <dt>Price</dt><dd data-testid="malek-confirm-price">{piastres(it.price)} ({fmt(it.price)}) · you have {fmt(g.cash)}</dd>
          <dt>Servings</dt><dd>{it.servings}{it.consumption === 'inventory' ? ' (each eaten later, one at a time)' : ' (eaten now)'}</dd>
          <dt>Carry weight</dt><dd>{it.weightKg ? `${it.weightKg} kg` : 'none: eaten at the table'}</dd>
          {it.consumption === 'inventory' && <><dt>Keeps</dt><dd>{parcelDays(it, g.day)} game days (a game value, not food-safety advice)</dd></>}
          <dt>Per serving</dt><dd>{effectChips(it).join(' · ')}</dd>
        </dl>
        {preview && <><p className="malek-meta">If you eat it now:</p><ReportLines r={preview} /></>}
        {it.consumption === 'inventory' && <p className="malek-meta">Nothing happens to you until you eat a serving. Salted food costs water.</p>}
        <div className="malek-row">
          {(g.malek?.tab ?? 0) > 0 && tabCovers(it) && <button className="btn primary" disabled={busy} onClick={() => { if (busy) return; setBusy(true); onPay(true); }} data-testid="malek-pay-tab">On Malek's tab ({g.malek?.tab} left)</button>}
          <button className={`btn ${(g.malek?.tab ?? 0) > 0 && tabCovers(it) ? '' : 'primary'}`} disabled={busy || g.cash < it.price} onClick={() => { if (busy) return; setBusy(true); onPay(); }} data-testid="malek-pay">{g.cash < it.price ? 'Not enough money' : `Pay ${piastres(it.price)}`}</button>
          <button className="btn" onClick={onCancel} data-testid="malek-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ReportLines({ r }: { r: MealReport }) {
  const line = (label: string, gain: number, wasted: number, unit = '') => (
    <li>{label} {gain >= 0 ? `+${gain}` : gain}{unit}{wasted > 0 ? <em> ({wasted} more would be wasted: you are full)</em> : null}</li>
  );
  return (
    <ul className="malek-report" data-testid="malek-report">
      {line('Fed', r.fed.gain, r.fed.wasted)}
      {r.rest.gain || r.rest.wasted ? <li>Fatigue −{r.rest.gain}{r.rest.wasted > 0 ? <em> (already rested)</em> : null}</li> : <li>Fatigue no change <em>(a meal's energy counts once in four hours)</em></li>}
      {r.water.gain !== 0 || r.water.wasted ? line('Water', r.water.gain, r.water.wasted) : null}
      <li>{r.wellFed.note === 'new' ? `Well fed: buyers +${r.wellFed.value * MORALE_PATIENCE} patience until ${clock(r.wellFed.until % 24)}`
        : r.wellFed.note === 'raised' ? `Well fed raised to +${r.wellFed.value * MORALE_PATIENCE} patience (still until ${clock(r.wellFed.until % 24)})`
        : r.wellFed.note === 'kept' ? 'Well fed: no extra (a better meal already counts)' : 'No well-fed bonus'}</li>
    </ul>
  );
}
