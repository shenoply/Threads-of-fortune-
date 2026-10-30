// The chase, on screen: a painted strip of desert road with each rider on it as a silhouette, the
// broken ground (or open country) they are making for, the gap read out under it, a button you hold
// to spur on with the animals' wind above it, and what happens told line by line below. See systems/chase.ts.
import { useEffect, useRef, useState } from 'react';
import { startChase, stepChase, paceRatio, type ChaseSetup, type ChaseState, type Runner } from '../../game/systems/chase';
import { milesPerDay } from './CaravanScreen';
import { audio } from '../../game/audio/engine';
import { buzz } from '../../game/feel';
import './chase.css';

/** the gap or lead (0-100) as yards on the road: the edge of the broken ground is about 400 yards off */
const yards = (g: number) => Math.max(0, Math.round((g * 4) / 5) * 5);
/** where the line of cover stands across the strip, and where your own man rides (% of the width) */
const COVER = 84, YOU = 13;
/** three depths on the road: nearer is lower and larger */
const LANES = [{ b: 8, s: 1 }, { b: 30, s: 0.84 }, { b: 46, s: 0.72 }];

export function Chase({ setup, onEnd }: { setup: ChaseSetup; onEnd: (c: ChaseState) => void }) {
  const [c, setC] = useState(() => startChase(setup));
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
  const lane = (i: number) => LANES[i % 3];
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
        <Land />
        <i className="ch-ground" />
        <Broken clear={!pursue} />
        <span className="ch-line" style={{ left: `${COVER}%` }}><b>{pursue ? 'Broken ground' : 'Open country'}</b></span>
        {pursue ? (
          <>
            <Mount kind="you" lane={LANES[0]} left={YOU} z={30} />
            {nearest && !c.over && <i className="ch-gap" style={{ left: `${YOU}%`, width: `${(Math.max(0, Math.min(100, nearest.gap)) / 100) * (COVER - YOU)}%` }} />}
            {c.runners.map((r, i) => {
              const L = r.leader ? LANES[1] : lane(i + 1);
              return (
                <Mount key={r.name} kind={r.leader ? 'leader' : 'them'} lane={L} z={20 - LANES.indexOf(L) * 5}
                  left={YOU + (Math.max(0, Math.min(100, r.gap)) / 100) * (COVER - YOU)} state={r.state}
                  name={labelled.has(r.name) ? r.name : undefined} />
              );
            })}
          </>
        ) : (
          <>
            {c.runners.map((r, i) => (
              <Mount key={r.name} kind="them" lane={lane(i)} z={20 - (i % 3) * 5} left={4 + (i % 3) * 3 + (i > 2 ? 2 : 0)} state={r.state} />
            ))}
            <Mount kind="camel" lane={LANES[0]} z={30} left={16 + (Math.max(0, Math.min(100, c.lead)) / 100) * (COVER - 16)} />
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

/** the near country, painted flat over the bottom of the picture: the plain, the road and a few tufts of
 *  scrub. The sky and the far hills above it are a painting from the repo (chase.css, .ch-stage). */
function Land() {
  return (
    <svg className="ch-land" viewBox="0 0 400 110" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a52" stopOpacity="0" />
          <stop offset=".16" stopColor="#b47d47" stopOpacity=".92" />
          <stop offset=".5" stopColor="#8f5f33" />
          <stop offset="1" stopColor="#4a2f19" />
        </linearGradient>
        <linearGradient id="chRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a86c" stopOpacity="0" />
          <stop offset=".35" stopColor="#d9a86c" stopOpacity=".38" />
          <stop offset=".7" stopColor="#c8955c" stopOpacity=".3" />
          <stop offset="1" stopColor="#b8864f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="chRock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5030" />
          <stop offset="1" stopColor="#3a2412" />
        </linearGradient>
      </defs>
      <path d="M0 4 C70 0 140 6 210 3 C280 0 340 5 400 2 L400 110 L0 110 Z" fill="url(#chGround)" />
      <path d="M0 54 C120 50 260 51 400 48 L400 104 C260 107 120 106 0 105 Z" fill="url(#chRoad)" />
      <g fill="#3a2414" opacity=".5">
        <path d="M18 44 c2 -6 6 -7 7 -1 c2 -5 5 -4 5 1 z" />
        <path d="M150 40 c1 -4 4 -5 5 0 c2 -3 4 -2 4 1 z" />
        <path d="M232 46 c2 -5 5 -6 6 -1 c1 -3 4 -3 4 1 z" />
        <path d="M96 30 c1 -3 3 -4 4 0 c1 -2 3 -2 3 1 z" />
      </g>
    </svg>
  );
}

/** the line they make for: a spill of rocks and scrub (pursuit) or the open plain beyond (flight) */
function Broken({ clear }: { clear: boolean }) {
  return (
    <svg className={`ch-rocks ${clear ? 'clear' : ''}`} viewBox="0 0 90 120" preserveAspectRatio="xMaxYMax meet">
      {clear ? (
        <g opacity=".5"><path d="M10 104 C30 100 60 101 90 98 L90 120 L0 120 Z" fill="#c99a62" /></g>
      ) : (
        <>
          <path d="M6 120 L10 96 L20 88 L26 92 L34 74 L46 68 L52 76 L60 60 L72 56 L80 64 L90 58 L90 120 Z" fill="url(#chRock)" />
          <path d="M20 88 L26 92 L34 74 L46 68 L52 76 L60 60 L72 56" fill="none" stroke="#d9a868" strokeOpacity=".45" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M0 120 L4 108 L14 104 L22 110 L30 100 L42 102 L48 112 L58 106 L70 108 L80 100 L90 104 L90 120 Z" fill="#3a2412" />
          <g fill="#5a3a20" opacity=".8"><ellipse cx="2" cy="112" rx="3" ry="1.6" /><ellipse cx="-6" cy="116" rx="2" ry="1.2" /></g>
          <path d="M4 108 L14 104 L22 110 L30 100 L42 102" fill="none" stroke="#c9945a" strokeOpacity=".35" strokeWidth="1.2" />
          <g fill="#3a2412"><path d="M40 68 c-2 -8 0 -12 2 -14 c0 4 2 6 1 14 z" /><path d="M66 56 c-3 -6 -1 -10 1 -12 c1 4 3 6 2 12 z" /></g>
        </>
      )}
    </svg>
  );
}

/** a mounted man in silhouette, or your laden camel; legs and dust move only while the chase runs */
function Mount({ kind, lane, left, z, state = 'running', name }: { kind: 'you' | 'them' | 'leader' | 'camel'; lane: { b: number; s: number }; left: number; z: number; state?: Runner['state']; name?: string }) {
  const camel = kind === 'camel';
  return (
    <span className={`ch-mount ${kind} ${state}`} style={{ left: `${left}%`, bottom: `${lane.b}px`, zIndex: z, ['--s' as string]: lane.s }}>
      <i className="ch-dust"><b /><b /><b /></i>
      {name && <em className="ch-name">{name}</em>}
      <svg viewBox="0 0 120 92" className="ch-fig">
        <g className="ch-body">
          {camel ? (
            <>
              <path d="M26 46 C24 36 32 30 40 32 C44 20 60 16 66 30 C72 34 78 34 84 28 C88 20 92 14 98 12 C103 11 107 14 110 18 C111 21 108 22 104 21 L99 21 C96 30 92 40 84 48 C70 55 40 56 26 46 Z" />
              <path d="M27 44 C20 46 18 52 19 58" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <rect x="38" y="30" width="14" height="22" rx="7" className="ch-bale" />
              <rect x="56" y="30" width="14" height="22" rx="7" className="ch-bale b2" />
              <path d="M49 20 L51 8 L57 8 L59 20 Z" />
              <circle cx="54" cy="5" r="4" />
            </>
          ) : (
            <>
              <path d="M34 40 C30 38 22 40 16 52 C24 47 29 46 36 47 Z" />
              <ellipse cx="57" cy="44" rx="25" ry="10.5" />
              <path d="M72 38 C77 30 84 22 89 18 L92 15 L95 10 L97 16 C101 18 105 22 108 27 C109 30 106 31 103 30 L97 29 C93 35 88 42 82 50 Z" />
              <path d="M52 38 L60 47 L57 56" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M50 40 C52 30 57 22 63 18 L68 20 C64 27 60 34 60 41 Z" />
              <circle cx="67" cy="13" r="4.6" />
              <path d="M64 22 L80 29" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              {kind === 'you' ? (
                <>
                  <path d="M63.5 10 L64.5 4.5 L70.5 4.5 L71 10 Z" className="ch-fez" />
                  <path d="M66 5 C63 6 62 9 62 11" fill="none" stroke="currentColor" strokeWidth="1" />
                  <path d="M46 34 L72 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M63 9 C56 8 48 11 41 17 C49 15 56 15 63 16 Z" className="ch-cloth" />
                  <path d="M48 31 L70 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </>
          )}
        </g>
        {(camel ? [[38, 52, 'b'], [43, 52, 'b2'], [72, 50, 'f'], [77, 50, 'f2']] : [[38, 50, 'b'], [43, 50, 'b2'], [74, 48, 'f'], [79, 48, 'f2']]).map(([x, y, k]) => (
          <g key={k} transform={`translate(${x} ${y})`}>
            <path className={`ch-leg ${k}`} d={camel ? 'M0 0 L1.5 16 L0 31 L3 32' : 'M0 0 L1.5 13 L-0.5 24 L2.5 25.5'} fill="none" stroke="currentColor" strokeWidth={camel ? 3.4 : 3.6} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </svg>
    </span>
  );
}
