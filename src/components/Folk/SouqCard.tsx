import { useGame } from '../../game/state/store';
import { souqMaster } from '../../game/systems/population';
import { relWord } from '../../game/systems/folkTalk';
import { FolkFace } from './FolkFace';
import { openEncy } from './FolkCard';
import './folk.css';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** The man who runs a town's rug souq, at the head of its market: a word as you come in, which knows
 *  whether you bought or sold here today and how he feels about you, and a seat if you want to talk. */
export function SouqCard({ city, onTalk }: { city: string; onTalk: (id: string) => void }) {
  const g = useGame();
  const p = souqMaster(city);
  if (!p) return null;
  const rel = g.folk?.rel[p.id] ?? 0;
  const met = g.folk?.met[p.id] !== undefined;
  const today = g.ledger.filter((l) => l.day === g.day);
  const bought = today.some((l) => l.kind === 'purchase' && l.label.toLowerCase().endsWith(`in ${cityLabel(city)}`));
  const sold = today.some((l) => l.kind === 'sale' && l.label.toLowerCase().includes(`dealer in ${cityLabel(city)}`));
  const seed = `${p.id}:${g.day}`;
  const pick = (a: string[]) => a[hash(seed) % a.length];
  const line = sold && bought ? 'You buy from us and sell to us on the same day. You will make a dealer yet.'
    : sold ? pick(['That rug you sold us this morning: we have a buyer already. Do not ask what he paid.', 'Bring us more like the last one.'])
    : bought ? pick(['A good choice, the one you took. I would have asked more for it, but my cousin was watching.', 'You have an eye. Not a great eye. An eye.'])
    : !met ? pick(['A new face in the souq. Look all you like, touch what you mean to buy.', 'Welcome. Mind the porters: they stop for nobody.'])
    : rel >= 30 ? pick(['My friend! I kept something back for you. Look at the end of the row.', 'Hassan\'s son. Sit, the coffee is coming.'])
    : rel <= -6 ? pick(['You again. The prices are on the rugs.', 'Look if you must.'])
    : p.traits.includes('greedy') ? pick(['Everything is cheap today. Cheap for a man like you.', 'Prices are what they are. Higher tomorrow.'])
    : p.traits.includes('honest') ? pick(['The red one is older than it looks. The blue one is younger. Now you know.', 'Ask me anything about the stock. I will tell you.'])
    : pick(['The caravans are late, so the prices are up. It is always the caravans.', 'Busy morning. Everybody wants to buy and nobody wants to pay.']);
  return (
    <div className="souq-card" data-testid="souq-card">
      <button className="ency-link" onClick={() => openEncy('person', p.id)} aria-label={p.name}><FolkFace p={p} size={60} /></button>
      <div>
        <b>{p.name}</b>
        <small>{p.title} · {relWord(rel, met)}</small>
        <p>"{line}"</p>
        <button className="btn" onClick={() => onTalk(p.id)} data-testid="souq-talk">Sit with {p.short}</button>
      </div>
    </div>
  );
}
const cityLabel = (id: string) => ({ portsaid: 'port said', istanbul: 'constantinople', ankara: 'angora', fayoum: 'medinet el-fayoum', bedouin: 'tarabin camp' } as Record<string, string>)[id] ?? id;
