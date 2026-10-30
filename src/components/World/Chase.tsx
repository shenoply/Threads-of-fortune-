// The chase, on screen: a strip of the painted battle ground seen from above, the road running left to
// right, each rider on it as his painted battle figure, the broken ground (or open country) they are
// making for, the gap read out under it, a button you hold to spur on with the animals' wind above it,
// and what happens told line by line below. See systems/chase.ts.
import { useEffect, useRef, useState } from 'react';
import { startChase, stepChase, paceRatio, type ChaseSetup, type ChaseState, type Runner } from '../../game/systems/chase';
import { milesPerDay } from './CaravanScreen';
import { audio } from '../../game/audio/engine';
import { useGame } from '../../game/state/store';
import { BAND_ART } from './BattleField';
import { buzz } from '../../game/feel';
import './chase.css';

/** the gap or lead (0-100) as yards on the road: the edge of the broken ground is about 400 yards off */
const yards = (g: number) => Math.max(0, Math.round((g * 4) / 5) * 5);
/** where the line of cover stands across the strip, and where your own man rides (% of the width) */
const COVER = 84, YOU = 13;
/** where a rider runs across the strip (% from the top): the two ruts of the road, then the verges either side */
const LANES = [57, 43, 29, 71, 16, 85];
const art = (id: string) => `art/battle/${id}.webp`;
/** the band's men on horse or camel: the bands that ride have their own figures; the rest have taken horses */
function bandRiders(bandId: string) {
  const b = BAND_ART[bandId] ?? BAND_ART['egypt-rural-highway-robbers'];
  return b.man === 'raider' || b.man === 'smuggler' ? { man: b.man, leader: b.leader } : { man: 'smuggler', leader: 'smuggler-leader' };
}
/** your own man in the saddle: the best mounted man you have with you */
const myRider = (troops: Record<string, number | undefined>) => ['desertcaptain', 'arnaut', 'bedouin', 'reformed'].find((id) => (troops[id] ?? 0) > 0) ?? 'desertcaptain';

export function Chase({ setup, onEnd }: { setup: ChaseSetup; onEnd: (c: ChaseState) => void }) {
  const [c, setC] = useState(() => startChase(setup));
  const troops = useGame((g) => g.world.party.troops);
  const riders = bandRiders(setup.bandId);
  const mine = myRider(troops ?? {});
  const st = useRef(c);
  const held = useRef(false);
  const [holding, setHolding] = useState(false);
  const logged = useRef(1);
  useEffect(() => {
    let raf = 0, last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const n = stepChase(st.current, dt, held.current);
      if (n !== st.current) {
        // each new line gets its sound: hooves for a catch, a shout for one getting away
        for (const l of n.log.slice(logged.current)) { audio.sfx(l.kind === 'good' ? 'coin' : l.kind === 'bad' ? 'tap' : 'tap'); if (l.kind === 'good') buzz(15); }
        logged.current = n.log.length;
        st.current = n;
        setC(n);
      }
      if (!n.over) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  const down = (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); held.current = true; setHolding(true); };
  const up = () => { held.current = false; setHolding(false); };
  const ratio = paceRatio(c);
  const pursue = c.mode === 'pursue';
  const shown = [...c.log].reverse().slice(0, 6);
  // the same sums the chase itself makes (systems/chase.ts stepChase), only to say which way the gap is going
  const spurring = holding && c.wind > 2 && !c.over;
  const myGo = ratio * (spurring ? 1.4 : 0.85);
  const running = c.runners.filter((r) => r.state === 'running');
  const nearest = running.reduce<Runner | null>((a, r) => (!a || r.gap < a.gap ? r : a), null);
  const best = running.reduce((a, r) => Math.max(a, r.pace), 0);
  const trend = pursue
    ? nearest ? (nearest.pace - myGo < -0.02 ? 'closing' : nearest.pace - myGo > 0.02 ? 'drawing away' : 'holding') : ''
    : running.length ? (myGo - best > 0.02 ? 'opening' : myGo - best < -0.02 ? 'closing' : 'holding') : '';
  const lowWind = c.wind < 25;
  const verdict = ratio >= 1.15 ? 'you are faster' : ratio >= 0.95 ? 'about even' : 'they are faster';
  const lead = running.find((r) => r.leader) ?? nearest;
  const labelled = new Set(lead ? [lead.name] : []);
  return (
    <div className={`chase ${pursue ? 'pursue' : 'flee'}${spurring ? ' spur' : ''}${c.over ? ' over' : ''}`} data-testid="chase">
      <div className="ch-head">
        <small>{pursue ? 'Ride them down' : 'Run for it'}</small>
        <span className="ch-pace" data-testid="chase-pace">
          {pursue ? 'Your riders' : 'Your caravan'} {milesPerDay(c.mine)} mi/day · theirs {milesPerDay(c.theirs)}
          <em className={ratio >= 1 ? 'ok' : 'warn'}>{verdict}</em>
        </span>
      </div>

      <div className="ch-stage" aria-hidden="true">
        <i className="ch-road" />
        {pursue && <i className="ch-rocks" style={{ left: `${COVER - 5}%` }} />}
        <span className="ch-line" style={{ left: `${COVER}%` }}><b>{pursue ? 'Broken ground' : 'Open country'}</b></span>
        {pursue ? (
          <>
            {nearest && !c.over && <i className="ch-gap" style={{ left: `${YOU}%`, width: `${(Math.max(0, Math.min(100, nearest.gap)) / 100) * (COVER - YOU)}%` }} />}
            <Rider img={mine} mine lane={LANES[0]} left={YOU} />
            {c.runners.map((r, i) => (
              <Rider key={r.name} img={r.leader ? riders.leader : riders.man} lead={r.leader} lane={r.leader ? LANES[1] : LANES[[2, 3, 4, 5][i % 4]]} i={i}
                left={YOU + (Math.max(0, Math.min(100, r.gap)) / 100) * (COVER - YOU)} state={r.state}
                name={labelled.has(r.name) ? r.name : undefined} />
            ))}
          </>
        ) : (
          <>
            {c.runners.map((r, i) => (
              <Rider key={r.name} img={riders.man} lane={LANES[(i + 1) % LANES.length]} i={i} left={5 + (i % 3) * 4 + (i > 2 ? 3 : 0)} state={r.state} />
            ))}
            <Rider img="camel" mine lane={LANES[0]} left={18 + (Math.max(0, Math.min(100, c.lead)) / 100) * (COVER - 18)} />
          </>
        )}
      </div>

      <div className="ch-read">
        <div>
          <small>{pursue ? (nearest ? (nearest.leader ? 'The leader' : 'Nearest man') : 'The road') : 'Your lead'}</small>
          {pursue
            ? nearest ? <b>{nearest.name} · {yards(nearest.gap)} yd</b> : <b>No one left running</b>
            : <b>{yards(c.lead)} yd{running.length ? ` on ${running.length} ${running.length === 1 ? 'rider' : 'riders'}` : ''}</b>}
          {trend && !c.over && <em className={(pursue ? trend === 'closing' : trend === 'opening') ? 'ok' : trend === 'holding' ? '' : 'warn'}>{trend}</em>}
        </div>
        <div className="ch-left">
          <small>Road left</small>
          <span className="ch-roadbar"><i style={{ width: `${Math.max(0, 100 - Math.min(100, (c.t / c.limit) * 100))}%` }} /></span>
        </div>
      </div>

      <ul className="ch-log" data-testid="chase-log">
        {shown.map((l, i) => <li key={`${l.t}-${i}`} className={l.kind} style={{ opacity: 1 - i * 0.13 }}>{l.text}</li>)}
      </ul>
      {!c.over ? (
        <>
          <div className={`ch-wind ${lowWind ? 'low' : ''}`} aria-label={`Wind ${Math.round(c.wind)}%`}>
            <small>{pursue ? "Horses' wind" : "Animals' wind"}</small>
            <span><i style={{ width: `${c.wind}%` }} /></span>
            <small className="ch-windv">{c.wind <= 2 ? 'blown' : lowWind ? 'failing' : `${Math.round(c.wind)}%`}</small>
          </div>
          <button className={`btn primary big ch-hold ${holding ? 'on' : ''}`} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onContextMenu={(e) => e.preventDefault()} data-testid="chase-hold">
            {holding ? (pursue ? 'Spurring on…' : 'Driving them on…') : pursue ? 'Hold to spur on' : 'Hold to drive them on'}
          </button>
          <small className="ch-tip">{pursue ? `Ease off when the wind runs low. Your riders can hold ${c.hands} more.` : c.overloaded ? 'Laden animals shed loads when pushed hard.' : 'Ease off when the wind runs low.'}</small>
        </>
      ) : (
        <button className="btn primary big" onClick={() => onEnd(c)} data-testid="chase-done">Continue</button>
      )}
    </div>
  );
}

/** one rider seen from above, his painted battle figure turned to ride left to right, with a little dust behind him */
function Rider({ img, lane, left, state = 'running', name, mine, lead, i = 0 }: { img: string; lane: number; left: number; state?: Runner['state']; name?: string; mine?: boolean; lead?: boolean; i?: number }) {
  return (
    <span className={`ch-rider ${state}${mine ? ' mine' : ''}${lead ? ' lead' : ''}${img === 'camel' ? ' camel' : ''}`} style={{ left: `${left}%`, top: `${lane}%`, ['--d' as string]: `${(i % 4) * -0.37}s` }}>
      <i className="ch-dust" />
      <img src={art(img)} alt="" draggable={false} />
      {name && <em className="ch-name">{name}</em>}
    </span>
  );
}
