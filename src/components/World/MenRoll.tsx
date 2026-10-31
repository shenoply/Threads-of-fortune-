// The men behind each line of the Caravan tab, by name, and the Fallen: every man buried by the road,
// where and when, the fights he stood in, and whether his family has had its money.
import { useState } from 'react';
import { useGame, combatOf } from '../../game/state/store';
import { manFace, manFallback, manLabel, kindName, familySum, type NamedMan } from '../../game/systems/men';
import { settlementById } from '../../game/systems/world';
import { dateOfDay } from '../../game/economy/life';
import { fmt } from '../../game/economy/money';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (day: number) => { const d = dateOfDay(day); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const townName = (id?: string) => (id ? settlementById(id)?.name : undefined);
const fallback = (e: React.SyntheticEvent<HTMLImageElement>, kind: string) => { const i = e.currentTarget; if (!i.dataset.f) { i.dataset.f = '1'; i.src = manFallback({ kind }); } };

/** the named men of one kind, under its line on the Caravan tab; tap a man to send him home */
export function MenOf({ kind }: { kind: string }) {
  const c = useGame((s) => combatOf(s));
  const day = useGame((s) => s.day);
  const dismissMan = useGame((s) => s.dismissMan);
  const [open, setOpen] = useState<string | null>(null);
  const men = (c.men ?? []).filter((m) => m.kind === kind).sort((a, b) => b.fights - a.fights || a.joined - b.joined);
  if (!men.length) return null;
  const sgt = (m: NamedMan) => c.sergeant?.manId === m.id;
  return (
    <ul className="menof" data-testid={`menof-${kind}`}>
      {men.map((m) => (
        <li key={m.id} className={(m.hurtUntil ?? 0) > day ? 'hurt' : ''} data-testid="menof-man">
          <button className="menof__who" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
            <img src={manFace(m)} alt="" onError={(e) => fallback(e, m.kind)} />
            <span>
              <b>{sgt(m) ? `Sergeant ${manLabel(m)}` : manLabel(m)}</b>
              <small>{m.fights ? `${m.fights} ${m.fights === 1 ? 'fight' : 'fights'}` : 'not yet blooded'}{m.kills ? ` · ${m.kills} down` : ''}{m.scars ? ` · ${m.scars === 1 ? 'a scar' : `${m.scars} scars`}` : ''}{(m.hurtUntil ?? 0) > day ? ' · wounded' : ''}{townName(m.home) ? ` · from ${townName(m.home)}` : ''}</small>
            </span>
          </button>
          {open === m.id && <button className="btn small menof__go" onClick={() => { dismissMan(m.id); setOpen(null); }} data-testid={`send-home-${m.id}`}>Send {m.name.split(' ')[0]} home</button>}
        </li>
      ))}
    </ul>
  );
}

/** everyone buried by the road, the latest first */
export function FallenList() {
  const c = useGame((s) => combatOf(s));
  const atTown = useGame((s) => !!s.world.at);
  const cash = useGame((s) => s.cash);
  const pay = useGame((s) => s.payFallen);
  const [note, setNote] = useState('');
  const [all, setAll] = useState(false);
  const every = (c.fallen ?? []).map((f, i) => ({ f, i })).reverse();
  if (!every.length) return null;
  // the latest three, and any whose family is still owed; the rest behind one tap
  const fallen = all ? every : every.filter(({ f }, k) => k < 3 || !f.paid);
  return (
    <div className="fallen" data-testid="fallen">
      <div className="section-label" id="cv-fallen">THE FALLEN</div>
      <ul>
        {fallen.map(({ f, i }) => {
          const sum = familySum(f);
          const from = townName(f.home);
          return (
            <li key={`${f.name}-${f.day}-${i}`} data-testid="fallen-man">
              {f.face ? <img src={`art/people/small/${f.face}.webp`} alt="" onError={(e) => fallback(e, f.kind)} /> : <img src={manFallback(f)} alt="" />}
              <span>
                <b>{f.name}</b>
                <small>{kindName(f.kind)}{from ? ` from ${from}` : ''}</small>
                <small>Fell {when(f.day)}{f.where ? `, ${f.where}` : ''} · {f.fights ? `stood in ${f.fights} ${f.fights === 1 ? 'fight' : 'fights'}` : 'his first fight'}{f.kills ? ` · ${f.kills} down` : ''}{f.joined !== undefined ? ` · with you ${f.day - f.joined <= 1 ? 'a day' : `${f.day - f.joined} days`}` : ''}</small>
                {f.paid
                  ? <small className="fallen__paid">His family was paid on {when(f.paid)}.</small>
                  : atTown
                    ? <button className="btn small" disabled={cash < sum} onClick={() => setNote(pay(i))} data-testid={`pay-fallen-${i}`}>Send {fmt(sum)} to his family</button>
                    : <small className="fallen__owed">His family has had nothing yet. Money can go by the post from any town.</small>}
              </span>
            </li>
          );
        })}
      </ul>
      {fallen.length < every.length && <button className="btn small" onClick={() => setAll(true)} data-testid="fallen-all">All {every.length} who fell</button>}
      {note && <p className="dim small" data-testid="fallen-note">{note}</p>}
    </div>
  );
}
