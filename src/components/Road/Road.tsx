// The road ahead, as a track: where you stand, the next thing worth working for (large, with its
// picture), and everything after it in order, each with its picture and how far you have got.
import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { RANKS, rankOf } from '../../game/economy/progress';
import { nearness, nextStep, roadOf, type Need, type Step } from '../../game/road';
import { OPEN_UPGRADES } from '../Inventory/StallUpgrades';
import { PLAN_EVENT } from '../../game/nav';
import { Icon } from '../Icon';
import { audio } from '../../game/audio/engine';
import './road.css';

const amount = (n: Need, v: number) => (n.money ? fmt(Math.max(0, v)) : String(Math.max(0, Math.round(v))));

function Bars({ needs }: { needs: Need[] }) {
  return (
    <div className="road-needs">
      {needs.map((n) => {
        const k = Math.min(1, Math.max(0, n.have) / Math.max(1, n.want));
        return (
          <div key={n.label} className={`road-need ${k >= 1 ? 'met' : ''}`}>
            <span>{n.label}</span>
            <i><b style={{ width: `${(k * 100).toFixed(1)}%` }} /></i>
            <em>{k >= 1 ? <Icon name="check" /> : `${amount(n, n.have)} / ${amount(n, n.want)}`}</em>
          </div>
        );
      })}
    </div>
  );
}

function Pic({ src, locked }: { src: string; locked: boolean }) {
  const [ok, setOk] = useState(true);
  return (
    <span className={`road-pic ${locked ? 'locked' : ''}`} aria-hidden="true">
      {src && ok ? <img src={src} alt="" loading="lazy" onError={() => setOk(false)} /> : <Icon name="star" />}
      {locked && <span className="road-lock"><Icon name="lock" /></span>}
    </span>
  );
}

const goTo = (st: Step) => {
  if (!st.go) return;
  audio.sfx('tap');
  if (st.go.kind === 'upgrades') window.dispatchEvent(new Event(OPEN_UPGRADES));
  else if (st.go.kind === 'town') window.dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: { town: st.go.town } }));
  else window.dispatchEvent(new Event('tof:open-buyers'));
};
const goWord = (st: Step) => (st.go?.kind === 'upgrades' ? 'Improve the stall' : st.go?.kind === 'town' ? 'Plan the journey' : st.go?.kind === 'buyers' ? 'Your buyers' : '');

/** the next thing worth working for, large: for the top of the road, and the stall between customers */
export function NextOnRoad({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const g = useGame();
  const st = nextStep(roadOf(g));
  if (!st) return null;
  const k = nearness(st);
  return (
    <div className={`road-next ${compact ? 'compact' : ''}`} data-testid="road-next">
      <Pic src={st.pic} locked={false} />
      <div className="road-next-body">
        <small>{compact ? 'Next on your road' : 'Next'}</small>
        <b>{st.title}</b>
        {!compact && <span className="road-line">{st.line}</span>}
        <Bars needs={st.needs} />
        <div className="road-next-acts">
          {k >= 1 && st.go ? <button className="btn primary small" onClick={() => goTo(st)} data-testid="road-next-go">{goWord(st)}</button>
            : st.go && !compact ? <button className="btn small" onClick={() => goTo(st)} data-testid="road-next-go">{goWord(st)}</button> : null}
          {compact && onOpen && <button className="btn small" onClick={() => { audio.sfx('tap'); onOpen(); }} data-testid="road-open">The whole road</button>}
        </div>
      </div>
    </div>
  );
}

export function Road() {
  const g = useGame();
  const steps = roadOf(g);
  const rk = rankOf(g).idx;
  const next = nextStep(steps);
  const chapters = [...new Set(steps.map((x) => x.chapter))];
  const doneN = steps.filter((x) => x.done).length;
  return (
    <div className="road" data-testid="road">
      <div className="road-head">
        <span>You are a <b>{RANKS[rk].name}</b></span>
        <span className="dim">{doneN} of {steps.length} along the road</span>
      </div>
      <NextOnRoad />
      <ol className="road-track">
        {chapters.map((ch) => ch !== rk ? (
          <li key={ch} className={`road-chapter ${ch < rk ? 'past' : 'later'} folded`}>
            <details data-testid={`road-chapter-${ch}`}>
              <summary><h4>{ch + 1 < RANKS.length ? `Towards ${RANKS[ch + 1].name}` : 'The end of the road'}</h4>
                {/* a glimpse of what the stretch holds, before it is opened */}
                <span className="road-peek" aria-hidden="true">{steps.filter((x) => x.chapter === ch && !x.rank && x.pic).slice(0, 4).map((x) => <img key={x.id} src={x.pic} alt="" loading="lazy" className={x.done ? '' : 'dim'} />)}</span><span className="dim road-count">{ch < rk ? 'done' : (() => { const n = steps.filter((x) => x.chapter === ch).length; return `${n} ${n === 1 ? 'step' : 'steps'}`; })()}</span></summary>
              <ol>
                {steps.filter((x) => x.chapter === ch).map((st) => (
                  <li key={st.id} className={`road-step ${st.done ? 'done' : ''} ${st.rank ? 'rank' : ''}`} data-testid={`road-${st.id}`}>
                    <span className="road-dot" aria-hidden="true">{st.done ? <Icon name="check" /> : st.rank ? <Icon name="crown" /> : null}</span>
                    {!st.rank && st.pic && <Pic src={st.pic} locked={!st.done} />}
                    <div className="road-step-body"><b>{st.title}</b>{st.done ? <span className="road-done">{st.rank ? 'Reached' : 'Done'}</span> : <span className="road-line">{st.line}</span>}</div>
                  </li>
                ))}
              </ol>
            </details>
          </li>
        ) : (
          <li key={ch} className="road-chapter now">
            <h4>{ch + 1 < RANKS.length ? `Towards ${RANKS[ch + 1].name}` : 'The end of the road'}</h4>
            <ol>
              {steps.filter((x) => x.chapter === ch).map((st) => (
                <li key={st.id} className={`road-step ${st.done ? 'done' : ''} ${st.rank ? 'rank' : ''} ${next?.id === st.id ? 'next' : ''}`} data-testid={`road-${st.id}`}>
                  <span className="road-dot" aria-hidden="true">{st.done ? <Icon name="check" /> : st.rank ? <Icon name="crown" /> : null}</span>
                  {!st.rank && <Pic src={st.pic} locked={!st.done && nearness(st) < 1} />}
                  <div className="road-step-body">
                    <b>{st.title}</b>
                    {st.done ? <span className="road-done">{st.rank ? 'Reached' : 'Done'}</span> : next?.id === st.id ? <span className="road-done">Next, shown above</span> : <><span className="road-line">{st.line}</span><Bars needs={st.needs} /></>}
                    {!st.done && next?.id !== st.id && nearness(st) >= 1 && st.go && <button className="btn primary small" onClick={() => goTo(st)}>{goWord(st)}</button>}
                  </div>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
