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
  const toClinic = r.by === 'alone' ? false : r.by === 'men' ? !!r.clinic : r.by !== 'passerby' || !!r.clinic;
  const from = settlementById(r.from).name;
  const why = r.reason === 'exhaustion' ? 'The world tilts. The street comes up to meet your face.' : `The pain of the ${r.reason} takes your legs. The street comes up to meet you.`;
  const beats = r.by === 'men'
    ? [r.reason === 'a beating' || r.reason.startsWith('beaten') ? 'The last blow lands and the road goes dark.' : why, r.clinic ? 'Your men lift you onto a cart, shouting for room in the lane. "Dr Feras, quickly. Our master is down."' : 'Your men drag you into the shade, loosen your collar and put a waterskin to your lips. One keeps the fire, one keeps the watch.', r.clinic ? 'You wake on Dr Feras\'s couch, your men standing at the door with their caps in their hands.' : 'You wake hours later with a cloth on your head. Your men have fed and watered you and kept the road behind you quiet.']
    : r.by === 'alone'
    ? [why, `You come to on the ground in ${from}, hours later, with a pounding head. People stepped around you and nobody stopped.`, 'You are wrung out. Eat, drink and sleep before you push yourself again.']
    : r.by === 'passerby'
    ? [r.reason === 'a beating' ? 'The last kick lands and the lane goes dark.' : 'The blow lands and the road goes dark.', `A traveller leading a mule finds you in the dust. He turns you over, gives you water from his skin and heaves you across the saddle. "Not here, effendi. The crows are patient."`, toClinic ? 'He takes you all the way to Dr Feras\u2019s door in Cairo, leaves you on the step, and is gone before you can thank him.' : `You come round in ${from}, on a bench in a coffee-house yard, with a cloth on your face. Your rescuer has gone on his way. Hours have passed.`]
    : r.by === 'carry'
    ? [why, 'A carter, walking his donkey past, drops the reins. "Yallah, effendi, not here in the dust." He and a boy lift you onto the cart among the sacks.', 'The cart jolts through the lanes to Dr Feras’s door. You wake on his couch with a wet cloth on your forehead, an hour gone.']
    : [why, `A stranger on the way to the station sees you fall in ${from}. He gets you onto the next train to Cairo, pays your fare${r.fare ? ` (${fmt(r.fare)} comes out of your purse later)` : ''} and does not give his name.`, 'Six hours later you are carried through a clinic door. Dr Feras is already rolling up his sleeves.'];
  return (
    <div className="rescue" role="dialog" aria-label="You passed out" data-testid="rescue">
      <div className="rs-card">
        <small className="rs-tag">YOU PASSED OUT</small>
        {r.by !== 'alone' && r.by !== 'men' && <div className="rs-who"><PersonCameo spec={CARTER} size={92} /></div>}
        <p className="rs-text" data-testid="rescue-text">{beats[beat]}</p>
        <div className="rs-btns">
          {beat < beats.length - 1
            ? <button className="btn primary" onClick={() => setBeat(beat + 1)} data-testid="rescue-next">Go on</button>
            : <button className="btn primary" onClick={() => (toClinic ? setClinic(true) : g.clearRescue())} data-testid="rescue-clinic">{r.by === 'alone' ? 'Get up' : 'Open your eyes'}</button>}
        </div>
      </div>
    </div>
  );
}
