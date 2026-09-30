import { useState } from 'react';
import { passRisk, useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { PASS_CHOICES, CONDITION_START, passWeather, riskWord, type PassChoice } from '../../game/systems/fieldwork';
import '../ArranLab/ArranLab.css';

/**
 * The Sinai passes: before the caravan sets off for St Catherine's or the Tarabin camp you choose how
 * to cross, with time, cost and risk in view. The crossing is resolved once, from a stored roll, and
 * recorded under the trip key, so reopening the card shows the same outcome.
 */
export const PASS_TOWNS = ['sinai', 'bedouin'];
export const needsPass = (from: string | undefined, to: string | undefined) => !!to && PASS_TOWNS.includes(to) && !PASS_TOWNS.includes(from ?? '');

export function PassCard({ tripKey, onGo, onCancel }: { tripKey: string; onGo: () => void; onCancel: () => void }) {
  const g = useGame();
  const [done, setDone] = useState(() => g.crossings?.[tripKey] ? { ...g.crossings[tripKey], repeated: true } : null);
  const month = new Date(Date.UTC(1925, 2, 9 + g.day)).getUTCMonth();
  const weather = passWeather(month);
  const guards = Object.values(g.world.party.troops).reduce((a, n) => a + n, 0);
  const cargo = (g.cargo ?? []).filter((c) => c.collected).map((c) => c.cls);
  const fatigue = (g.condition ?? CONDITION_START).fatigue;
  const risk = (c: PassChoice) => passRisk(g, c);
  const gear = g.cabinet ?? {};
  const kit = [(g.khamsinUntil ?? 0) >= g.day && 'the khamsin kit', (gear.rockets ?? 0) > 0 && 'signal rockets', (gear.cartridges ?? 0) > 0 && 'cartridges for the guards', (g.world.party.arms ?? 0) > 0 && 'your revolver'].filter(Boolean) as string[];
  const choices = (Object.keys(PASS_CHOICES) as PassChoice[]).filter((c) => c !== 'blast' || (gear.charge ?? 0) > 0);

  return (
    <div className="pass-card" role="dialog" aria-label="The Sinai passes" data-testid="pass-card">
      <img className="pass-card__art" src="art/arran/16-risky-pass.webp" alt="A caravan on a narrow mountain track between red granite cliffs" draggable={false} />
      <div className="pass-card__body">
        <h2>The Sinai passes</h2>
        {!done ? (
          <>
            <p>The track climbs into the granite. Raiders have been seen at the narrows. {(g.khamsinUntil ?? 0) >= g.day ? 'The khamsin kit is packed.' : weather.text} You have {guards} guard{guards === 1 ? '' : 's'}; you are {fatigue >= 45 ? 'tired' : 'rested enough'}.{cargo.some((c) => c !== 'ordinary') ? ' What you carry is worth stealing.' : ''}</p>
            {kit.length > 0 && <p className="dim small" data-testid="pass-kit">From Arran's cabinet: {kit.join(', ')}.</p>}
            <div className="pass-choices">
              {choices.map((c) => {
                const o = PASS_CHOICES[c];
                const r = risk(c);
                const cant = o.cost > g.cash;
                return (
                  <button key={c} type="button" className="pass-choice" disabled={cant} onClick={() => { const r = g.crossPass(tripKey, c); setDone({ ...useGame.getState().crossings![tripKey], repeated: r.repeated }); }} data-testid={`pass-${c}`}>
                    <b>{o.label}</b>
                    <small>{o.sub}</small>
                    <span className="pass-choice__facts">
                      <i>Time: {o.extraDays ? `+${o.extraDays} day${o.extraDays > 1 ? 's' : ''}` : 'no delay'}</i>
                      <i>Cost: {o.cost ? fmt(o.cost) : 'nothing'}</i>
                      <i className={`risk-${riskWord(r).toLowerCase()}`}>Risk: {riskWord(r)}</i>
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn" onClick={onCancel} data-testid="pass-cancel">Not yet</button>
          </>
        ) : (
          <>
            <p className="pass-outcome" data-testid="pass-outcome" data-kind={done.outcome.kind}>{done.outcome.text}</p>
            <ul className="dim small">
              <li>You chose: {PASS_CHOICES[done.choice].label.toLowerCase()}.</li>
              {done.outcome.cashLost > 0 && <li>Lost {fmt(done.outcome.cashLost)}.</li>}
              {done.outcome.foodLost > 0 && <li>Lost {done.outcome.foodLost} ration{done.outcome.foodLost > 1 ? 's' : ''}.</li>}
              {done.outcome.cargoLost && <li>The cargo you carried is gone.</li>}
              <li>The crossing tires you (+{done.outcome.fatigue} fatigue).</li>
            </ul>
            <button type="button" className="btn primary" onClick={onGo} data-testid="pass-continue">Go on</button>
          </>
        )}
      </div>
    </div>
  );
}
