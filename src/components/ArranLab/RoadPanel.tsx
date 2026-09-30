import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { dailyFood } from '../../game/systems/caravan';
import { settlementById } from '../../game/systems/world';
import { LAB_SERVICES } from '../../game/systems/arranLab';
import { BOOKS } from '../../game/systems/arranBooks';
import { CARGO_JOBS, DIET, LEGAL_NOTES, midSentence, LEGAL_SOURCES, TONIC, fatigueEffect, provisionReport, type CargoJob } from '../../game/systems/fieldwork';
import { dateFor } from '../../game/economy/economy';

/**
 * The road side of Arran's laboratory: how tired you are, whether the caravan's food will last
 * (the McCarrison book), and crates people want carried (the Sinai field-safety folio). Cargo is
 * described by class and paperwork only; Arran discusses risk and permits, never preparation.
 */
type Confirm = { kind: 'provisions' } | { kind: 'cargo'; job: CargoJob };

// rough days on the road from Giza, for the provisions report
const ROUTES = [{ to: 'Alexandria', days: 3 }, { to: 'St Catherine\'s, Sinai', days: 7 }, { to: 'Jaffa', days: 10 }];
const CLASS_WORD: Record<CargoJob['cls'], string> = { ordinary: 'Ordinary goods', duty_goods: 'Duty goods', medical_controlled: 'Controlled medicine', restricted_material: 'Restricted material' };

export function RoadPanel({ onBook, onSpot }: { onBook: () => void; onSpot: (s: 'notebook' | 'balance' | null) => void }) {
  const g = useGame();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [msg, setMsg] = useState('');
  const unlocked = g.labUnlocked ?? [];
  const cond = g.condition;
  const tired = fatigueEffect(cond, g.day);
  const party = g.world.party;
  const hour = g.world.hour;
  const endsAt = (min: number) => { const t = hour + min / 60; return `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`; };
  const report = g.provisionsDay === g.day ? provisionReport({ food: party.food, perDay: dailyFood(party), fatigue: cond?.fatigue ?? 0, hungryDays: party.hungryDays ?? 0, dietActive: (cond?.dietUntil ?? 0) >= g.day, routes: ROUTES }) : null;
  const say = (m: string) => { setMsg(m); setConfirm(null); onSpot(null); };

  if (confirm) {
    const sv = confirm.kind === 'provisions' ? LAB_SERVICES.provisions : LAB_SERVICES.cargo;
    const short = g.cash < sv.price;
    return (
      <div className="arran-confirm" data-testid="arran-confirm">
        <h2>{sv.label}{confirm.kind === 'cargo' ? `: ${midSentence(confirm.job.label)}` : ''}</h2>
        <p className="arran-confirm__q">{sv.question}</p>
        <dl>
          <dt>Cost</dt><dd data-testid="arran-confirm-cost">{fmt(sv.price)} <small>(you have {fmt(g.cash)})</small></dd>
          <dt>Time</dt><dd>{sv.minutes >= 60 ? `${sv.minutes / 60} h` : `${sv.minutes} min`}, done about {endsAt(sv.minutes)}</dd>
          <dt>Uses up</dt><dd>{sv.consumes}</dd>
          <dt>Can tell you</dt><dd>{sv.can}</dd>
          <dt>Cannot tell you</dt><dd>{sv.cannot}</dd>
        </dl>
        <div className="arran-btns">
          <button type="button" className="btn primary" disabled={short} onClick={() => {
            const m = confirm.kind === 'provisions' ? g.assessProvisions() : g.checkCargo(confirm.job.id);
            say(m);
          }} data-testid="arran-confirm-pay">{short ? 'Not enough money' : `Pay ${fmt(sv.price)}`}</button>
          <button type="button" className="btn" onClick={() => { setConfirm(null); onSpot(null); }} data-testid="arran-confirm-cancel">Not now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="arran-road" data-testid="arran-road">
      {msg && <p className="arran-msg" data-testid="arran-road-msg">{msg}</p>}

      <div className="section-label">HOW YOU ARE</div>
      <div className="arran-errand">
        <div>
          <b data-testid="arran-condition">{tired.label}</b>
          <small>
            Fatigue {cond?.fatigue ?? 0} of 100. {tired.patience < 0 ? `Buyers lose patience with you sooner (${tired.patience}).` : tired.patience > 0 ? 'You are sharp today.' : 'It does not show at the stall.'}
            {(cond?.dependence ?? 0) >= 3 ? ' You have come to rely on the tonic.' : ''}
            {(cond?.dietUntil ?? 0) >= g.day ? ` Road diet until ${dateFor(cond!.dietUntil!).short}.` : ''}
          </small>
        </div>
        {(g.tonics ?? 0) > 0 && (
          <button type="button" className="btn" onClick={() => say(g.takeTonic())} data-testid="arran-take-tonic">Coca wine ({g.tonics})</button>
        )}
      </div>
      {(g.tonics ?? 0) > 0 && <p className="dim small">{TONIC.effect} Arran: "I would rather you slept."</p>}

      <div className="section-label">PROVISIONS</div>
      {!unlocked.includes('provisions') ? (
        <div className="arran-errand is-locked">
          <div><b>Provisions assessment</b><small>Needs his {BOOKS.provisions.author}, <i>{BOOKS.provisions.title}</i>. Ask for it in the notebook.</small></div>
          <button type="button" className="btn" onClick={onBook} data-testid="arran-road-book-provisions">The book</button>
        </div>
      ) : report ? (
        <div className="arran-report" data-testid="arran-provisions-report">
          <ul>{report.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <ul className="arran-routes">{report.routes.map((r) => <li key={r.to} className={r.ok ? 'ok' : 'short'}>{r.to}: about {r.days} days · {r.ok ? 'enough' : 'not enough'}</li>)}</ul>
        </div>
      ) : (
        <div className="arran-errand">
          <div><b>Provisions assessment</b><small>{LAB_SERVICES.provisions.question} {party.food} rations carried, {dailyFood(party)} a day.</small></div>
          <button type="button" className="btn primary" onClick={() => { setConfirm({ kind: 'provisions' }); onSpot('notebook'); }} data-testid="arran-provisions">{fmt(LAB_SERVICES.provisions.price)} · 1 h</button>
        </div>
      )}
      {unlocked.includes('provisions') && (cond?.dietUntil ?? 0) < g.day && (
        <div className="arran-errand">
          <div><b>{DIET.label}</b><small>Tiredness builds more slowly on the road and mends faster. It works over days, not at once.</small></div>
          <button type="button" className="btn" onClick={() => say(g.buyDiet())} data-testid="arran-diet">{fmt(DIET.price)}</button>
        </div>
      )}

      <div className="section-label">CRATES AT HIS DOOR</div>
      {!unlocked.includes('cargo') ? (
        <div className="arran-errand is-locked">
          <div><b>Cargo hazard check</b><small>Needs the {BOOKS.field_safety.title.replace(' (fictional)', '')}, left with the monks in Sinai. Ask for it in the notebook.</small></div>
          <button type="button" className="btn" onClick={onBook} data-testid="arran-road-book-cargo">The book</button>
        </div>
      ) : (
        <>
          <p className="dim small">People bring him sealed crates to identify before they are carried. He checks the labels and the packing and names the paper and the handler each needs. He never opens a sealed case.</p>
          {CARGO_JOBS.map((job) => {
            const checked = (g.cargoChecks ?? []).includes(job.id);
            const taken = (g.cargo ?? []).find((c) => c.jobId === job.id);
            const needsPapers = job.cls !== 'ordinary';
            const canPaper = unlocked.includes('records');
            return (
              <div className={`arran-cargo cls-${job.cls}`} key={job.id} data-testid={`arran-cargo-${job.id}`}>
                <div>
                  <b>{job.label}</b>
                  <small>{CLASS_WORD[job.cls]} · {settlementById(job.from).name} to {settlementById(job.to).name} · pays {fmt(job.fee)}</small>
                  <small>{job.blurb}</small>
                  {checked && <small className="arran-cargo__check" data-testid={`arran-cargo-check-${job.id}`}><b>Arran:</b> {job.hazard} {job.specialist}</small>}
                  {taken && <small className="arran-cargo__taken">Taken · {taken.paperwork === 'licence' ? 'with papers' : taken.paperwork === 'receipt' ? 'with a receipt' : 'without papers'} · {taken.collected ? `deliver to ${settlementById(job.to).name}` : `collect in ${settlementById(job.from).name}`}</small>}
                </div>
                {!taken && (
                  <div className="arran-cargo__btns">
                    {!checked && <button type="button" className="btn" onClick={() => { setConfirm({ kind: 'cargo', job }); onSpot('balance'); }} data-testid={`arran-cargo-checkbtn-${job.id}`}>Check · {fmt(LAB_SERVICES.cargo.price)}</button>}
                    {needsPapers && canPaper && <button type="button" className="btn primary" onClick={() => say(g.acceptCargo(job.id, true))} data-testid={`arran-cargo-licensed-${job.id}`}>Take, with papers · {fmt(job.licenceFee)}</button>}
                    <button type="button" className={`btn ${needsPapers ? '' : 'primary'}`} onClick={() => say(g.acceptCargo(job.id, false))} data-testid={`arran-cargo-take-${job.id}`}>{needsPapers ? 'Take, no papers' : 'Take the job'}</button>
                  </div>
                )}
              </div>
            );
          })}
          {!unlocked.includes('records') && <p className="dim small">Which papers a restricted crate needs, and what a real licence looks like, is in the customs ledger at Port Said. Until Arran has it you can only carry them without papers.</p>}
        </>
      )}

      <div className="section-label">THE LAW IN 1925 (PROVISIONAL)</div>
      <ul className="arran-law" data-testid="arran-law">
        {LEGAL_NOTES.map((n) => <li key={n.title}><b>{n.title}</b> <em className={`law-${n.status.replace(' ', '-')}`}>{n.status}</em><br />{n.text}</li>)}
      </ul>
      <details className="dim small"><summary>Sources</summary><ul>{LEGAL_SOURCES.map((s) => <li key={s}>{s}</li>)}</ul></details>
    </div>
  );
}
