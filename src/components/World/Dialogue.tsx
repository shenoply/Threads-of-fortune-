import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { NPCS, type DialogueOption } from '../../data/world';
import { RUGS } from '../../data/rugs';
import { Portrait } from './Portrait';
import { voice } from '../../game/audio/voice';

export function Dialogue({ npcId, onClose }: { npcId: string; onClose: (msg?: string) => void }) {
  const g = useGame();
  const npc = NPCS[npcId];
  const [node, setNode] = useState('start');
  const [typed, setTyped] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const n = npc.nodes[node];

  useEffect(() => {
    setTyped(0);
    let live = true;
    voice.whenReady(npc.id).then(() => { if (live) voice.say(npc.id, n.text); });
    const t = setInterval(() => setTyped((x) => (x >= n.text.length ? x : x + 3)), 28);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [node, n.text, npc.id]);
  useEffect(() => () => voice.stop(), []);

  const ok = (o: DialogueOption) => {
    if (!o.requires) return true;
    const [k, a] = o.requires.split(':');
    const q = g.world.quests[a];
    if (k === 'notquest') return !q;
    if (k === 'questactive') return q === 'active';
    if (k === 'questready') return q === 'ready';
    if (k === 'has') return g.inventory.some((i) => i.typeId === a && !i.restoringUntil && (!i.stored || g.world.at === 'giza'));
    if (k === 'questdone') return q === 'done';
    if (k === 'upgrade') return g.upgrades.includes(a);
    if (k === 'notupgrade') return !g.upgrades.includes(a);
    if (k === 'rep') return g.reputation >= Number(a);
    if (k === 'cash') return g.cash >= Number(a);
    // a rug of at least this tier, carried with you (at Giza the stock is to hand)
    if (k === 'hastier') return g.inventory.some((i) => (RUGS[i.typeId]?.tier ?? 1) >= Number(a) && !i.restoringUntil && (!i.stored || g.world.at === 'giza'));
    return true;
  };

  const choose = (o: DialogueOption) => {
    const msg = o.effects?.length ? g.talk(npc.id, o.effects) : '';
    const fb = msg ? [...feedback, msg] : feedback;
    setFeedback(fb);
    voice.stop();
    if (o.next) setNode(o.next);
    else onClose(fb.join(' '));
  };

  return (
    <div className="overlay dialogue" role="dialog" aria-label={`Talking to ${npc.name}`} data-testid="dialogue" onClick={() => setTyped(n.text.length)}>
      <div className="dlg">
        <div className="dlg-who">
          <Portrait id={npc.id} look={npc.look} accent={npc.accent} size={72} />
          <div>
            <b>{npc.name}</b>
            <small>{npc.role}</small>
          </div>
        </div>
        <p className="dlg-text" data-testid="dlg-text">
          {n.text.slice(0, typed)}
          {typed < n.text.length && <span className="cursor" />}
        </p>
        {feedback.length > 0 && <p className="dlg-fb" data-testid="dlg-feedback">{feedback[feedback.length - 1]}</p>}
        <div className="dlg-opts">
          {n.options.filter(ok).map((o, i) => (
            <button key={i} className="act" onClick={(e) => { e.stopPropagation(); choose(o); }} data-testid={`opt-${i}`}>
              <span className="t">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
