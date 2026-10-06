// Hassan goes down in a town street. A man walking by (a carter with a donkey cart, in Cairo or Giza; a stranger
// on the platform, anywhere else) gets him to Dr Feras. Three short beats, then the clinic.
import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { fmt } from '../../game/economy/money';
import { settlementById } from '../../game/systems/world';
import { PersonCameo, type PersonSpec } from '../People/Person';
import { Clinic } from './Clinic';
import './Rescue.css';

const CARTER: PersonSpec = { skin: '#b98a62', hair: '#2b2118', age: 44, head: 'tarha', headColor: '#e9e2d0', clothes: 'galabiya', cloth: '#7a6a52', moustache: 'thick', beard: 'stubble', face: 'square', smile: 0.1 };

export function Rescue() {
  const g = useGame();
  const r = g.rescue;
  const [beat, setBeat] = useState(0);
  const [clinic, setClinic] = useState(false);
  useEffect(() => { setBeat(0); setClinic(false); }, [r?.day, r?.from]);
  if (!r) return null;
  if (clinic) return <Clinic onClose={() => { g.clearRescue(); }} />;
  const from = settlementById(r.from).name;
  const why = r.reason === 'exhaustion' ? 'The world tilts. The street comes up to meet your face.' : `The pain of the ${r.reason} takes your legs. The street comes up to meet you.`;
  const beats = r.by === 'carry'
    ? [why, 'A carter, walking his donkey past, drops the reins. "Yallah, effendi, not here in the dust." He and a boy lift you onto the cart among the sacks.', 'The cart jolts through the lanes to Dr Feras’s door. You wake on his couch with a wet cloth on your forehead, an hour gone.']
    : [why, `A stranger on the way to the station sees you fall in ${from}. He gets you onto the next train to Cairo, pays your fare${r.fare ? ` (${fmt(r.fare)} comes out of your purse later)` : ''} and does not give his name.`, 'Six hours later you are carried through a clinic door. Dr Feras is already rolling up his sleeves.'];
  return (
    <div className="rescue" role="dialog" aria-label="You passed out" data-testid="rescue">
      <div className="rs-card">
        <small className="rs-tag">YOU PASSED OUT</small>
        <div className="rs-who"><PersonCameo spec={CARTER} size={92} /></div>
        <p className="rs-text" data-testid="rescue-text">{beats[beat]}</p>
        <div className="rs-btns">
          {beat < beats.length - 1
            ? <button className="btn primary" onClick={() => setBeat(beat + 1)} data-testid="rescue-next">Go on</button>
            : <button className="btn primary" onClick={() => setClinic(true)} data-testid="rescue-clinic">Open your eyes</button>}
        </div>
      </div>
    </div>
  );
}
